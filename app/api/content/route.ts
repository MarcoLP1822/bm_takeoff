import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { generatedContent, books } from "@/db/schema"
import {
  eq,
  and,
  desc,
  asc,
  ilike,
  or,
  count,
  gte,
  lte,
  sql
} from "drizzle-orm"
import { z } from "zod"
import {
  getOptimizedContentList,
  ContentListFilters
} from "@/lib/database-optimization"

const querySchema = z.object({
  limit: z
    .string()
    .nullable()
    .optional()
    .transform(val => (val ? parseInt(val) : 20)),
  offset: z
    .string()
    .nullable()
    .optional()
    .transform(val => (val ? parseInt(val) : 0)),
  search: z.string().nullable().optional(),
  platform: z
    .enum(["twitter", "instagram", "linkedin", "facebook"])
    .nullable()
    .optional(),
  status: z
    .enum(["draft", "scheduled", "published", "failed"])
    .nullable()
    .optional(),
  contentType: z.enum(["post", "story", "article"]).nullable().optional(),
  bookId: z.string().nullable().optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "platform", "status", "bookTitle"])
    .nullable()
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).nullable().optional().default("desc"),
  startDate: z
    .string()
    .nullable()
    .optional()
    .transform(val => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .nullable()
    .optional()
    .transform(val => (val ? new Date(val) : undefined))
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      search: searchParams.get("search"),
      platform: searchParams.get("platform"),
      status: searchParams.get("status"),
      contentType: searchParams.get("contentType"),
      bookId: searchParams.get("bookId"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate")
    })

    // Use optimized content list query with caching
    const filters: ContentListFilters = {
      bookId: query.bookId || undefined,
      platform: query.platform || undefined,
      status: query.status || undefined,
      search: query.search || undefined,
      dateFrom: query.startDate,
      dateTo: query.endDate,
      sortBy:
        query.sortBy === "createdAt"
          ? "created_at"
          : query.sortBy === "updatedAt"
            ? "updated_at"
            : "created_at", // Default to created_at for unsupported sortBy values
      sortOrder: query.sortOrder || undefined,
      limit: query.limit,
      offset: query.offset
    }

    const result = await getOptimizedContentList(userId, filters)

    // Get filter options
    const [platformOptions, statusOptions, bookOptions] = await Promise.all([
      db
        .selectDistinct({ platform: generatedContent.platform })
        .from(generatedContent)
        .where(eq(generatedContent.userId, userId))
        .orderBy(asc(generatedContent.platform)),
      db
        .selectDistinct({ status: generatedContent.status })
        .from(generatedContent)
        .where(eq(generatedContent.userId, userId))
        .orderBy(asc(generatedContent.status)),
      db
        .selectDistinct({
          id: books.id,
          title: books.title,
          author: books.author
        })
        .from(generatedContent)
        .innerJoin(books, eq(generatedContent.bookId, books.id))
        .where(eq(generatedContent.userId, userId))
        .orderBy(asc(books.title))
    ])

    return NextResponse.json({
      success: true,
      data: {
        content: result.content,
        pagination: {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
          hasMore: result.hasMore
        },
        filters: {
          platforms: platformOptions.map(p => p.platform),
          statuses: statusOptions.map(s => s.status),
          books: bookOptions.map(b => ({
            id: b.id,
            title: b.title,
            author: b.author
          })),
          contentTypes: ["post", "story", "article"]
        }
      }
    })
  } catch (error) {
    console.error("Content retrieval error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to retrieve content. Please try again." },
      { status: 500 }
    )
  }
}
