import { db } from "../db"
import {
  books,
  generatedContent,
  socialAccounts,
  postAnalytics,
  SelectBook,
  SelectGeneratedContent,
  analysisStatus,
  platform,
  contentStatus
} from "../db/schema"
import {
  and,
  eq,
  desc,
  asc,
  sql,
  inArray,
  gte,
  lte,
  like,
  or
} from "drizzle-orm"
import {
  getCachedBookLibrary,
  cacheBookLibrary,
  getCachedContentList,
  cacheContentList
} from "./cache-service"

/**
 * Optimized book library queries with caching and pagination
 */
export interface BookLibraryFilters {
  search?: string
  genre?: string
  analysisStatus?: (typeof analysisStatus.enumValues)[number]
  sortBy?: "created_at" | "title" | "author" | "genre" | "updated_at"
  sortOrder?: "asc" | "desc"
  limit?: number
  offset?: number
}

export interface OptimizedBook {
  id: string
  title: string
  author: string | null
  genre: string | null
  fileName: string
  fileSize: string | null
  analysisStatus: (typeof analysisStatus.enumValues)[number]
  createdAt: Date
  updatedAt: Date
  analysisData: unknown
}

export async function getOptimizedBookLibrary(
  userId: string,
  filters: BookLibraryFilters = {}
): Promise<{
  books: OptimizedBook[]
  total: number
  hasMore: boolean
}> {
  const {
    search,
    genre,
    analysisStatus,
    sortBy = "created_at",
    sortOrder = "desc",
    limit = 20,
    offset = 0
  } = filters

  // Skip cache for search queries to avoid stale results
  // const cacheKey = { userId, ...filters }
  // const cached = await getCachedBookLibrary(userId, cacheKey)
  // if (cached && !search) {
  //   return cached as unknown as {
  //     books: OptimizedBook[]
  //     total: number
  //     hasMore: boolean
  //   }
  // }

  // Build optimized query
  const conditions = [eq(books.userId, userId)]

  // Add search condition with precise word boundary matching (minimum 3 characters)
  if (search && search.trim().length >= 3) {
    const searchTerm = search.trim().toLowerCase()
    // Escape special regex characters
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    conditions.push(
      or(
        // Exact word matching - must be complete words
        sql`LOWER(${books.title}) ~ ${`(^|[^a-zA-Z])${escapedTerm}([^a-zA-Z]|$)`}`,
        sql`LOWER(COALESCE(${books.author}, '')) ~ ${`(^|[^a-zA-Z])${escapedTerm}([^a-zA-Z]|$)`}`,
        sql`LOWER(COALESCE(${books.genre}, '')) ~ ${`(^|[^a-zA-Z])${escapedTerm}([^a-zA-Z]|$)`}`,
        // Prefix matching - only allow search term as prefix of complete words
        sql`LOWER(${books.title}) ~ ${`(^|[^a-zA-Z])${escapedTerm}[a-zA-Z]*([^a-zA-Z]|$)`}`,
        sql`LOWER(COALESCE(${books.author}, '')) ~ ${`(^|[^a-zA-Z])${escapedTerm}[a-zA-Z]*([^a-zA-Z]|$)`}`,
        sql`LOWER(COALESCE(${books.genre}, '')) ~ ${`(^|[^a-zA-Z])${escapedTerm}[a-zA-Z]*([^a-zA-Z]|$)`}`
      )!
    )
  }

  if (genre) {
    conditions.push(eq(books.genre, genre))
  }

  if (analysisStatus) {
    conditions.push(eq(books.analysisStatus, analysisStatus))
  }

  // Build sort condition with proper type checking
  const validSortColumns = {
    created_at: books.createdAt,
    title: books.title,
    author: books.author,
    genre: books.genre,
    updated_at: books.updatedAt
  } as const

  const sortColumn = validSortColumns[sortBy]
  if (!sortColumn) {
    throw new Error(`Invalid sort column: ${sortBy}`)
  }

  const sortCondition =
    sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn)

  // Execute optimized query with limit and offset
  const [booksResult, countResult] = await Promise.all([
    db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        genre: books.genre,
        fileName: books.fileName,
        fileSize: books.fileSize,
        analysisStatus: books.analysisStatus,
        createdAt: books.createdAt,
        updatedAt: books.updatedAt,
        // Include analysis summary for quick overview
        analysisData: sql`CASE 
          WHEN ${books.analysisData} IS NOT NULL 
          THEN json_build_object(
            'themes', (${books.analysisData}->>'themes')::json,
            'totalQuotes', json_array_length((${books.analysisData}->>'quotes')::json),
            'totalInsights', json_array_length((${books.analysisData}->>'keyInsights')::json)
          )
          ELSE NULL 
        END`.as("analysisData")
      })
      .from(books)
      .where(and(...conditions))
      .orderBy(sortCondition)
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(and(...conditions))
  ])

  const total = countResult[0]?.count || 0
  const hasMore = offset + limit < total

  const result = {
    books: booksResult,
    total,
    hasMore
  }

  // Cache the result
  // TODO: Update cache service to accept proper types instead of any[]
  // await cacheBookLibrary(userId, result, cacheKey)

  return result
}

/**
 * Optimized content list queries with caching and pagination
 */
export interface ContentListFilters {
  bookId?: string
  platform?: (typeof platform.enumValues)[number]
  status?: (typeof contentStatus.enumValues)[number]
  search?: string
  dateFrom?: Date
  dateTo?: Date
  sortBy?: "created_at" | "updated_at" | "published_at" | "scheduled_at"
  sortOrder?: "asc" | "desc"
  limit?: number
  offset?: number
}

export interface OptimizedContent {
  id: string
  bookId: string
  platform: (typeof platform.enumValues)[number]
  contentType: "post" | "story" | "article"
  content: string
  hashtags: string[] | null
  imageUrl: string | null
  status: (typeof contentStatus.enumValues)[number]
  scheduledAt: Date | null
  publishedAt: Date | null
  socialPostId: string | null
  createdAt: Date
  updatedAt: Date
  bookTitle: string | null
  bookAuthor: string | null
  analyticsData: unknown
}

export async function getOptimizedContentList(
  userId: string,
  filters: ContentListFilters = {}
): Promise<{
  content: OptimizedContent[]
  total: number
  hasMore: boolean
}> {
  const {
    bookId,
    platform,
    status,
    search,
    dateFrom,
    dateTo,
    sortBy = "created_at",
    sortOrder = "desc",
    limit = 20,
    offset = 0
  } = filters

  // Try to get from cache first
  const cacheKey = { userId, ...filters }
  const cached = await getCachedContentList(userId, cacheKey)
  if (cached) {
    return cached as unknown as {
      content: OptimizedContent[]
      total: number
      hasMore: boolean
    }
  }

  // Build optimized query with joins
  const conditions = [eq(generatedContent.userId, userId)]

  if (bookId) {
    conditions.push(eq(generatedContent.bookId, bookId))
  }

  if (platform) {
    conditions.push(eq(generatedContent.platform, platform))
  }

  if (status) {
    conditions.push(eq(generatedContent.status, status))
  }

  if (search && search.trim().length >= 3) {
    const searchTerm = search.trim().toLowerCase()
    conditions.push(
      or(
        // Prioritize partial matches in content
        sql`LOWER(${generatedContent.content}) LIKE ${'%' + searchTerm + '%'}`,
        // Add full-text search for complete words as fallback
        sql`to_tsvector('english', ${generatedContent.content}) @@ plainto_tsquery('english', ${search})`
      )!
    )
  }

  if (dateFrom) {
    conditions.push(gte(generatedContent.createdAt, dateFrom))
  }

  if (dateTo) {
    conditions.push(lte(generatedContent.createdAt, dateTo))
  }

  // Build sort condition with proper type checking
  const validSortColumns = {
    created_at: generatedContent.createdAt,
    updated_at: generatedContent.updatedAt,
    published_at: generatedContent.publishedAt,
    scheduled_at: generatedContent.scheduledAt
  } as const

  const sortColumn = validSortColumns[sortBy]
  if (!sortColumn) {
    throw new Error(`Invalid sort column: ${sortBy}`)
  }

  const sortCondition =
    sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn)

  // Execute optimized query with joins
  const [contentResult, countResult] = await Promise.all([
    db
      .select({
        id: generatedContent.id,
        bookId: generatedContent.bookId,
        platform: generatedContent.platform,
        contentType: generatedContent.contentType,
        content: generatedContent.content,
        hashtags: generatedContent.hashtags,
        imageUrl: generatedContent.imageUrl,
        status: generatedContent.status,
        scheduledAt: generatedContent.scheduledAt,
        publishedAt: generatedContent.publishedAt,
        socialPostId: generatedContent.socialPostId,
        createdAt: generatedContent.createdAt,
        updatedAt: generatedContent.updatedAt,
        // Include book info
        bookTitle: books.title,
        bookAuthor: books.author,
        // Include analytics summary
        analyticsData: sql`(
          SELECT json_build_object(
            'impressions', COALESCE(impressions, 0),
            'likes', COALESCE(likes, 0),
            'shares', COALESCE(shares, 0),
            'comments', COALESCE(comments, 0),
            'clicks', COALESCE(clicks, 0),
            'engagement', COALESCE(likes + shares + comments, 0)
          )
          FROM ${postAnalytics}
          WHERE ${postAnalytics.contentId} = ${generatedContent.id}
          LIMIT 1
        )`.as("analyticsData")
      })
      .from(generatedContent)
      .leftJoin(books, eq(generatedContent.bookId, books.id))
      .where(and(...conditions))
      .orderBy(sortCondition)
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql<number>`count(*)` })
      .from(generatedContent)
      .where(and(...conditions))
  ])

  const total = countResult[0]?.count || 0
  const hasMore = offset + limit < total

  const result = {
    content: contentResult,
    total,
    hasMore
  }

  // Cache the result
  // TODO: Update cache service to accept proper types instead of any[]
  // await cacheContentList(userId, result, cacheKey)

  return result
}

/**
 * Optimized analytics queries with aggregation
 */
export async function getOptimizedAnalytics(
  userId: string,
  timeRange: "week" | "month" | "quarter" | "year" = "month"
): Promise<{
  overview: {
    totalPosts: number
    totalImpressions: number
    totalEngagement: number
    avgEngagementRate: number
  }
  platformBreakdown: Array<{
    platform: string
    posts: number
    impressions: number
    engagement: number
  }>
  topPerforming: Array<{
    contentId: string
    content: string
    platform: string
    engagement: number
    impressions: number
  }>
}> {
  const timeRanges = {
    week: sql`NOW() - INTERVAL '7 days'`,
    month: sql`NOW() - INTERVAL '30 days'`,
    quarter: sql`NOW() - INTERVAL '90 days'`,
    year: sql`NOW() - INTERVAL '365 days'`
  }

  const timeCondition = gte(generatedContent.createdAt, timeRanges[timeRange])

  // Overview query
  const overviewResult = await db
    .select({
      totalPosts: sql<number>`COUNT(DISTINCT ${generatedContent.id})`,
      totalImpressions: sql<number>`COALESCE(SUM(${postAnalytics.impressions}), 0)`,
      totalEngagement: sql<number>`COALESCE(SUM(${postAnalytics.likes} + ${postAnalytics.shares} + ${postAnalytics.comments}), 0)`,
      avgEngagementRate: sql<number>`
        CASE 
          WHEN SUM(${postAnalytics.impressions}) > 0 
          THEN (SUM(${postAnalytics.likes} + ${postAnalytics.shares} + ${postAnalytics.comments})::float / SUM(${postAnalytics.impressions})::float) * 100
          ELSE 0 
        END
      `
    })
    .from(generatedContent)
    .leftJoin(postAnalytics, eq(generatedContent.id, postAnalytics.contentId))
    .where(and(eq(generatedContent.userId, userId), timeCondition))

  // Platform breakdown query
  const platformResult = await db
    .select({
      platform: generatedContent.platform,
      posts: sql<number>`COUNT(DISTINCT ${generatedContent.id})`,
      impressions: sql<number>`COALESCE(SUM(${postAnalytics.impressions}), 0)`,
      engagement: sql<number>`COALESCE(SUM(${postAnalytics.likes} + ${postAnalytics.shares} + ${postAnalytics.comments}), 0)`
    })
    .from(generatedContent)
    .leftJoin(postAnalytics, eq(generatedContent.id, postAnalytics.contentId))
    .where(and(eq(generatedContent.userId, userId), timeCondition))
    .groupBy(generatedContent.platform)
    .orderBy(
      desc(
        sql`COALESCE(SUM(${postAnalytics.likes} + ${postAnalytics.shares} + ${postAnalytics.comments}), 0)`
      )
    )

  // Top performing content query
  const topPerformingResult = await db
    .select({
      contentId: generatedContent.id,
      content: sql<string>`LEFT(${generatedContent.content}, 100)`,
      platform: generatedContent.platform,
      engagement: sql<number>`COALESCE(${postAnalytics.likes} + ${postAnalytics.shares} + ${postAnalytics.comments}, 0)`,
      impressions: sql<number>`COALESCE(${postAnalytics.impressions}, 0)`
    })
    .from(generatedContent)
    .leftJoin(postAnalytics, eq(generatedContent.id, postAnalytics.contentId))
    .where(and(eq(generatedContent.userId, userId), timeCondition))
    .orderBy(
      desc(
        sql`COALESCE(${postAnalytics.likes} + ${postAnalytics.shares} + ${postAnalytics.comments}, 0)`
      )
    )
    .limit(10)

  return {
    overview: overviewResult[0] || {
      totalPosts: 0,
      totalImpressions: 0,
      totalEngagement: 0,
      avgEngagementRate: 0
    },
    platformBreakdown: platformResult,
    topPerforming: topPerformingResult
  }
}

/**
 * Batch operations for better performance
 */
export async function batchUpdateAnalytics(
  updates: Array<{
    contentId: string
    platform: (typeof platform.enumValues)[number]
    postId: string
    metrics: {
      impressions?: number
      likes?: number
      shares?: number
      comments?: number
      clicks?: number
    }
  }>
): Promise<void> {
  if (updates.length === 0) return

  // Use a transaction for batch updates
  await db.transaction(async tx => {
    for (const update of updates) {
      await tx
        .insert(postAnalytics)
        .values({
          contentId: update.contentId,
          platform: update.platform,
          postId: update.postId,
          impressions: update.metrics.impressions || 0,
          likes: update.metrics.likes || 0,
          shares: update.metrics.shares || 0,
          comments: update.metrics.comments || 0,
          clicks: update.metrics.clicks || 0,
          lastUpdated: new Date()
        })
        .onConflictDoUpdate({
          target: [postAnalytics.contentId, postAnalytics.platform],
          set: {
            impressions: update.metrics.impressions || 0,
            likes: update.metrics.likes || 0,
            shares: update.metrics.shares || 0,
            comments: update.metrics.comments || 0,
            clicks: update.metrics.clicks || 0,
            lastUpdated: new Date()
          }
        })
    }
  })
}

/**
 * Optimized search across all content
 */
export interface SearchBookResult {
  id: string
  title: string
  author: string | null
  genre: string | null
  type: string
}

export interface SearchContentResult {
  id: string
  content: string
  platform: (typeof platform.enumValues)[number]
  bookTitle: string | null
  type: string
}

export async function searchAllContent(
  userId: string,
  query: string,
  filters: {
    contentType?: "books" | "content" | "all"
    limit?: number
  } = {}
): Promise<{
  books: SearchBookResult[]
  content: SearchContentResult[]
}> {
  const { contentType = "all", limit = 10 } = filters

  const results = {
    books: [] as SearchBookResult[],
    content: [] as SearchContentResult[]
  }

  if (contentType === "books" || contentType === "all") {
    // Only search if query has at least 3 characters
    if (query.trim().length >= 3) {
      const searchTerm = query.trim().toLowerCase()
      results.books = await db
        .select({
          id: books.id,
          title: books.title,
          author: books.author,
          genre: books.genre,
          type: sql<string>`'book'`
        })
        .from(books)
        .where(
          and(
            eq(books.userId, userId),
            or(
              // Exact word matching - must be complete words
              sql`LOWER(${books.title}) ~ ${`(^|[^a-zA-Z])${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zA-Z]|$)`}`,
              sql`LOWER(COALESCE(${books.author}, '')) ~ ${`(^|[^a-zA-Z])${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zA-Z]|$)`}`,
              sql`LOWER(COALESCE(${books.genre}, '')) ~ ${`(^|[^a-zA-Z])${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zA-Z]|$)`}`,
              // Prefix matching - only allow search term as prefix of complete words
              sql`LOWER(${books.title}) ~ ${`(^|[^a-zA-Z])${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-zA-Z]*([^a-zA-Z]|$)`}`,
              sql`LOWER(COALESCE(${books.author}, '')) ~ ${`(^|[^a-zA-Z])${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-zA-Z]*([^a-zA-Z]|$)`}`,
              sql`LOWER(COALESCE(${books.genre}, '')) ~ ${`(^|[^a-zA-Z])${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-zA-Z]*([^a-zA-Z]|$)`}`
            )!
          )
        )
        .limit(limit)
    }
  }

  if (contentType === "content" || contentType === "all") {
    // Only search if query has at least 3 characters
    if (query.trim().length >= 3) {
      const searchTerm = query.trim().toLowerCase()
      results.content = await db
        .select({
          id: generatedContent.id,
          content: sql<string>`LEFT(${generatedContent.content}, 200)`,
          platform: generatedContent.platform,
          bookTitle: books.title,
          type: sql<string>`'content'`
        })
        .from(generatedContent)
        .leftJoin(books, eq(generatedContent.bookId, books.id))
        .where(
          and(
            eq(generatedContent.userId, userId),
            or(
              // Prioritize partial matches in content
              sql`LOWER(${generatedContent.content}) LIKE ${'%' + searchTerm + '%'}`,
              // Fallback to full-text search
              sql`to_tsvector('english', ${generatedContent.content}) @@ plainto_tsquery('english', ${query})`
            )!
          )
        )
        .limit(limit)
    }
  }

  return results
}

/**
 * Database health check and optimization suggestions
 */
export async function getDatabaseHealth(): Promise<{
  tableStats: Array<{
    table: string
    rowCount: number
    size: string
  }>
  indexUsage: Array<{
    index: string
    usage: number
  }>
  slowQueries: Array<{
    query: string
    avgTime: number
  }>
  suggestions: string[]
}> {
  try {
    // Get table statistics
    const tableStats = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins + n_tup_upd + n_tup_del as total_operations,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY total_operations DESC
    `)

    // Basic suggestions based on common patterns
    const suggestions = [
      "Consider partitioning large tables by date",
      "Monitor query performance regularly",
      "Update table statistics with ANALYZE",
      "Consider archiving old analytics data",
      "Review and optimize slow queries"
    ]

    return {
      tableStats: (
        tableStats as unknown as Array<{
          tablename: string
          total_operations: number
          size: string
        }>
      ).map(row => ({
        table: row.tablename,
        rowCount: row.total_operations,
        size: row.size
      })),
      indexUsage: [], // Would require pg_stat_user_indexes
      slowQueries: [], // Would require pg_stat_statements
      suggestions
    }
  } catch (error) {
    console.error("Failed to get database health:", error)
    return {
      tableStats: [],
      indexUsage: [],
      slowQueries: [],
      suggestions: ["Database health check failed - check connection"]
    }
  }
}
