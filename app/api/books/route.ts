import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { books } from "@/db/schema"
import { eq, desc, asc, and, or, ilike, count, isNotNull } from "drizzle-orm"
import { z } from "zod"
import {
  getOptimizedBookLibrary,
  BookLibraryFilters
} from "@/lib/database-optimization"

const querySchema = z.object({
  limit: z
    .string()
    .nullable()
    .optional()
    .transform(val => (val ? parseInt(val) : 10)),
  offset: z
    .string()
    .nullable()
    .optional()
    .transform(val => (val ? parseInt(val) : 0)),
  search: z.string().nullable().optional(),
  genre: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  analysisStatus: z
    .enum(["pending", "processing", "completed", "failed"])
    .nullable()
    .optional(),
  sortBy: z
    .enum(["title", "author", "genre", "createdAt", "updatedAt"])
    .nullable()
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).nullable().optional().default("desc")
})

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      search: searchParams.get("search"),
      genre: searchParams.get("genre"),
      author: searchParams.get("author"),
      analysisStatus: searchParams.get("analysisStatus"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder")
    })

    // Use optimized book library query with caching
    const filters: BookLibraryFilters = {
      search: query.search || undefined,
      genre: query.genre || undefined,
      analysisStatus: query.analysisStatus || undefined,
      sortBy:
        query.sortBy === "createdAt"
          ? "created_at"
          : query.sortBy === "updatedAt"
            ? "updated_at"
            : query.sortBy || undefined,
      sortOrder: query.sortOrder || undefined,
      limit: query.limit,
      offset: query.offset
    }

    const result = await getOptimizedBookLibrary(userId, filters)

    // Get unique values for filter options
    const [genreOptions, authorOptions] = await Promise.all([
      db
        .selectDistinct({ genre: books.genre })
        .from(books)
        .where(and(eq(books.userId, userId), isNotNull(books.genre)))
        .orderBy(asc(books.genre)),
      db
        .selectDistinct({ author: books.author })
        .from(books)
        .where(and(eq(books.userId, userId), isNotNull(books.author)))
        .orderBy(asc(books.author))
    ])

    return NextResponse.json({
      success: true,
      books: result.books,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: result.hasMore
      },
      filters: {
        genres: genreOptions.map(g => g.genre).filter(Boolean),
        authors: authorOptions.map(a => a.author).filter(Boolean),
        analysisStatuses: ["pending", "processing", "completed", "failed"]
      }
    })
  } catch (error) {
    console.error("Get books endpoint error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: "Failed to retrieve books"
      },
      { status: 500 }
    )
  }
}
