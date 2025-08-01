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

const querySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val) : 20)),
  offset: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val) : 0)),
  search: z.string().optional(),
  platform: z.enum(["twitter", "instagram", "linkedin", "facebook"]).optional(),
  status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
  contentType: z.enum(["post", "story", "article"]).optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "platform", "status"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  startDate: z
    .string()
    .optional()
    .transform(val => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform(val => (val ? new Date(val) : undefined))
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bookId } = await params

    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      )
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
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate")
    })

    // Verify book belongs to user
    const book = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1)

    if (book.length === 0) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    // Build where conditions
    const conditions = [
      eq(generatedContent.bookId, bookId),
      eq(generatedContent.userId, userId)
    ]

    // Add search filter
    if (query.search) {
      const searchTerm = `%${query.search}%`
      conditions.push(
        or(
          ilike(generatedContent.content, searchTerm),
          // Search in hashtags array (PostgreSQL specific)
          sql`EXISTS (SELECT 1 FROM unnest(${generatedContent.hashtags}) AS hashtag WHERE hashtag ILIKE ${searchTerm})`
        )!
      )
    }

    // Add specific filters
    if (query.platform) {
      conditions.push(eq(generatedContent.platform, query.platform))
    }

    if (query.status) {
      conditions.push(eq(generatedContent.status, query.status))
    }

    if (query.contentType) {
      conditions.push(eq(generatedContent.contentType, query.contentType))
    }

    // Add date range filters
    if (query.startDate) {
      conditions.push(gte(generatedContent.createdAt, query.startDate))
    }

    if (query.endDate) {
      conditions.push(lte(generatedContent.createdAt, query.endDate))
    }

    // Build order by clause with proper type checking
    let orderBy
    switch (query.sortBy) {
      case "createdAt":
        orderBy =
          query.sortOrder === "asc"
            ? asc(generatedContent.createdAt)
            : desc(generatedContent.createdAt)
        break
      case "updatedAt":
        orderBy =
          query.sortOrder === "asc"
            ? asc(generatedContent.updatedAt)
            : desc(generatedContent.updatedAt)
        break
      case "platform":
        orderBy =
          query.sortOrder === "asc"
            ? asc(generatedContent.platform)
            : desc(generatedContent.platform)
        break
      case "status":
        orderBy =
          query.sortOrder === "asc"
            ? asc(generatedContent.status)
            : desc(generatedContent.status)
        break
      default:
        orderBy = desc(generatedContent.createdAt)
    }

    // Get filtered content
    const content = await db
      .select()
      .from(generatedContent)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(query.limit)
      .offset(query.offset)

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(generatedContent)
      .where(and(...conditions))

    return NextResponse.json({
      success: true,
      data: {
        bookId,
        bookTitle: book[0].title,
        content,
        pagination: {
          total: totalResult.count,
          limit: query.limit,
          offset: query.offset,
          hasMore: totalResult.count > query.offset + query.limit
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
