import { db } from "@/db"
import { postAnalytics, generatedContent, socialAccounts, books } from "@/db/schema"
import { eq, and, desc, asc, sql, gte, lte, avg, sum, count, or } from "drizzle-orm"
import { SocialMediaService, type SocialPlatform } from "./social-media"

export interface AnalyticsData {
  impressions: number
  likes: number
  shares: number
  comments: number
  clicks: number
  reach?: number
  engagementRate?: number
}

export interface PostPerformance {
  contentId: string
  platform: SocialPlatform
  postId: string
  content: string
  publishedAt: Date
  analytics: AnalyticsData
  bookTitle?: string
  bookAuthor?: string
  themes?: string[]
}

export interface PlatformComparison {
  platform: SocialPlatform
  totalPosts: number
  avgEngagementRate: number
  totalImpressions: number
  totalLikes: number
  totalShares: number
  totalComments: number
  bestPerformingPost?: PostPerformance
}

export interface ThemePerformance {
  theme: string
  postCount: number
  avgEngagementRate: number
  totalEngagement: number
  platforms: {
    platform: SocialPlatform
    avgEngagementRate: number
    postCount: number
  }[]
}

export interface OptimalPostingTime {
  platform: SocialPlatform
  dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
  hour: number // 0-23
  avgEngagementRate: number
  postCount: number
}

export interface AnalyticsInsights {
  totalPosts: number
  totalEngagement: number
  avgEngagementRate: number
  bestPerformingPlatform: SocialPlatform
  topThemes: ThemePerformance[]
  optimalPostingTimes: OptimalPostingTime[]
  recentTrends: {
    period: string
    engagementChange: number
    impressionsChange: number
  }
}

export class AnalyticsService {
  /**
   * Collect analytics data for a published post
   */
  static async collectPostAnalytics(
    contentId: string,
    platform: SocialPlatform,
    socialPostId: string,
    accessToken: string
  ): Promise<AnalyticsData> {
    try {
      const analyticsData = await this.fetchPlatformAnalytics(
        platform,
        socialPostId,
        accessToken
      )

      // Calculate engagement rate
      const totalEngagement = analyticsData.likes + analyticsData.shares + analyticsData.comments
      const engagementRateNumber = analyticsData.impressions > 0 
        ? (totalEngagement / analyticsData.impressions) * 100
        : 0
      const engagementRateString = engagementRateNumber.toFixed(2)

      // Store or update analytics data
      await this.storeAnalyticsData(contentId, platform, socialPostId, {
        impressions: analyticsData.impressions,
        likes: analyticsData.likes,
        shares: analyticsData.shares,
        comments: analyticsData.comments,
        clicks: analyticsData.clicks,
        reach: analyticsData.reach,
        engagementRate: engagementRateString
      } as AnalyticsData & { engagementRate: string })

      return {
        ...analyticsData,
        engagementRate: engagementRateNumber
      }
    } catch (error) {
      console.error(`Failed to collect analytics for ${platform} post ${socialPostId}:`, error)
      throw error
    }
  }

  /**
   * Fetch analytics data from platform APIs
   */
  private static async fetchPlatformAnalytics(
    platform: SocialPlatform,
    postId: string,
    accessToken: string
  ): Promise<AnalyticsData> {
    switch (platform) {
      case "twitter":
        return await this.fetchTwitterAnalytics(postId, accessToken)
      case "instagram":
        return await this.fetchInstagramAnalytics(postId, accessToken)
      case "linkedin":
        return await this.fetchLinkedInAnalytics(postId, accessToken)
      case "facebook":
        return await this.fetchFacebookAnalytics(postId, accessToken)
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /**
   * Fetch Twitter analytics
   */
  private static async fetchTwitterAnalytics(
    tweetId: string,
    accessToken: string
  ): Promise<AnalyticsData> {
    const response = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Twitter analytics fetch failed: ${response.statusText}`)
    }

    const data = await response.json()
    const metrics = data.data.public_metrics

    return {
      impressions: metrics.impression_count || 0,
      likes: metrics.like_count || 0,
      shares: metrics.retweet_count || 0,
      comments: metrics.reply_count || 0,
      clicks: metrics.url_link_clicks || 0
    }
  }

  /**
   * Fetch Instagram analytics
   */
  private static async fetchInstagramAnalytics(
    postId: string,
    accessToken: string
  ): Promise<AnalyticsData> {
    const response = await fetch(
      `https://graph.instagram.com/${postId}/insights?metric=impressions,likes,comments,shares,reach&access_token=${accessToken}`,
      { method: "GET" }
    )

    if (!response.ok) {
      throw new Error(`Instagram analytics fetch failed: ${response.statusText}`)
    }

    const data = await response.json()
    const metrics: Record<string, number> = {}
    
    data.data.forEach((metric: { name: string; values: Array<{ value: number }> }) => {
      metrics[metric.name] = metric.values[0]?.value || 0
    })

    return {
      impressions: metrics.impressions || 0,
      likes: metrics.likes || 0,
      shares: metrics.shares || 0,
      comments: metrics.comments || 0,
      clicks: 0, // Instagram doesn't provide click data in basic API
      reach: metrics.reach || 0
    }
  }

  /**
   * Fetch LinkedIn analytics
   */
  private static async fetchLinkedInAnalytics(
    postId: string,
    accessToken: string
  ): Promise<AnalyticsData> {
    const response = await fetch(
      `https://api.linkedin.com/v2/socialActions/${postId}/statistics`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    )

    if (!response.ok) {
      throw new Error(`LinkedIn analytics fetch failed: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      impressions: data.impressions || 0,
      likes: data.likes || 0,
      shares: data.shares || 0,
      comments: data.comments || 0,
      clicks: data.clicks || 0
    }
  }

  /**
   * Fetch Facebook analytics
   */
  private static async fetchFacebookAnalytics(
    postId: string,
    accessToken: string
  ): Promise<AnalyticsData> {
    const response = await fetch(
      `https://graph.facebook.com/${postId}/insights?metric=post_impressions,post_engaged_users,post_clicks&access_token=${accessToken}`
    )

    if (!response.ok) {
      throw new Error(`Facebook analytics fetch failed: ${response.statusText}`)
    }

    const data = await response.json()
    const metrics: Record<string, number> = {}
    
    data.data.forEach((metric: { name: string; values: Array<{ value: number }> }) => {
      metrics[metric.name] = metric.values[0]?.value || 0
    })

    // Get basic engagement metrics
    const engagementResponse = await fetch(
      `https://graph.facebook.com/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${accessToken}`
    )

    let likes = 0, comments = 0, shares = 0
    if (engagementResponse.ok) {
      const engagementData = await engagementResponse.json()
      likes = engagementData.likes?.summary?.total_count || 0
      comments = engagementData.comments?.summary?.total_count || 0
      shares = engagementData.shares?.count || 0
    }

    return {
      impressions: metrics.post_impressions || 0,
      likes,
      shares,
      comments,
      clicks: metrics.post_clicks || 0,
      reach: metrics.post_engaged_users || 0
    }
  }

  /**
   * Store analytics data in database
   */
  private static async storeAnalyticsData(
    contentId: string,
    platform: SocialPlatform,
    postId: string,
    analytics: AnalyticsData & { engagementRate: string }
  ): Promise<void> {
    // Check if analytics record already exists
    const existing = await db
      .select()
      .from(postAnalytics)
      .where(
        and(
          eq(postAnalytics.contentId, contentId),
          eq(postAnalytics.platform, platform),
          eq(postAnalytics.postId, postId)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(postAnalytics)
        .set({
          impressions: analytics.impressions,
          likes: analytics.likes,
          shares: analytics.shares,
          comments: analytics.comments,
          clicks: analytics.clicks,
          reach: analytics.reach || 0,
          engagementRate: analytics.engagementRate,
          lastUpdated: new Date()
        })
        .where(eq(postAnalytics.id, existing[0].id))
    } else {
      // Insert new record
      await db.insert(postAnalytics).values({
        contentId,
        platform,
        postId,
        impressions: analytics.impressions,
        likes: analytics.likes,
        shares: analytics.shares,
        comments: analytics.comments,
        clicks: analytics.clicks,
        reach: analytics.reach || 0,
        engagementRate: analytics.engagementRate
      })
    }
  }

  /**
   * Get post performance data for a user
   */
  static async getPostPerformance(
    userId: string,
    options: {
      limit?: number
      offset?: number
      platform?: SocialPlatform
      bookId?: string
      search?: string
      sortBy?: 'createdAt' | 'publishedAt' | 'engagementRate' | 'impressions' | 'likes' | 'shares' | 'comments'
      sortOrder?: 'asc' | 'desc'
      minEngagementRate?: number
      maxEngagementRate?: number
      startDate?: Date
      endDate?: Date
    } = {}
  ): Promise<{
    posts: PostPerformance[]
    pagination: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
    filters: {
      platforms: SocialPlatform[]
      books: { id: string; title: string; author?: string }[]
    }
  }> {
    const { 
      limit = 50, 
      offset = 0,
      platform, 
      bookId, 
      search,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      minEngagementRate,
      maxEngagementRate,
      startDate, 
      endDate 
    } = options

    // Build base query
    const baseQuery = db
      .select({
        contentId: generatedContent.id,
        platform: generatedContent.platform,
        postId: postAnalytics.postId,
        content: generatedContent.content,
        publishedAt: generatedContent.publishedAt,
        impressions: postAnalytics.impressions,
        likes: postAnalytics.likes,
        shares: postAnalytics.shares,
        comments: postAnalytics.comments,
        clicks: postAnalytics.clicks,
        reach: postAnalytics.reach,
        engagementRate: postAnalytics.engagementRate,
        bookTitle: books.title,
        bookAuthor: books.author,
        analysisData: books.analysisData
      })
      .from(postAnalytics)
      .innerJoin(generatedContent, eq(postAnalytics.contentId, generatedContent.id))
      .innerJoin(books, eq(generatedContent.bookId, books.id))

    // Apply filters
    const conditions = [eq(generatedContent.userId, userId)]
    
    // Search filter
    if (search) {
      const searchTerm = `%${search}%`
      conditions.push(
        or(
          sql`${generatedContent.content} ILIKE ${searchTerm}`,
          sql`${books.title} ILIKE ${searchTerm}`,
          sql`${books.author} ILIKE ${searchTerm}`
        )!
      )
    }
    
    // Platform filter
    if (platform) {
      conditions.push(eq(generatedContent.platform, platform))
    }
    
    // Book filter
    if (bookId) {
      conditions.push(eq(generatedContent.bookId, bookId))
    }
    
    // Engagement rate filters
    if (minEngagementRate !== undefined) {
      conditions.push(gte(sql`CAST(${postAnalytics.engagementRate} AS DECIMAL)`, minEngagementRate))
    }
    
    if (maxEngagementRate !== undefined) {
      conditions.push(lte(sql`CAST(${postAnalytics.engagementRate} AS DECIMAL)`, maxEngagementRate))
    }
    
    // Date range filters
    if (startDate) {
      conditions.push(gte(generatedContent.publishedAt, startDate))
    }
    
    if (endDate) {
      conditions.push(lte(generatedContent.publishedAt, endDate))
    }

    // Apply where conditions
    const queryWithConditions = baseQuery.where(and(...conditions))

    // Apply sorting
    let orderByClause
    switch (sortBy) {
      case 'engagementRate':
        orderByClause = sortOrder === 'asc' 
          ? asc(sql`CAST(${postAnalytics.engagementRate} AS DECIMAL)`)
          : desc(sql`CAST(${postAnalytics.engagementRate} AS DECIMAL)`)
        break
      case 'impressions':
        orderByClause = sortOrder === 'asc' ? asc(postAnalytics.impressions) : desc(postAnalytics.impressions)
        break
      case 'likes':
        orderByClause = sortOrder === 'asc' ? asc(postAnalytics.likes) : desc(postAnalytics.likes)
        break
      case 'shares':
        orderByClause = sortOrder === 'asc' ? asc(postAnalytics.shares) : desc(postAnalytics.shares)
        break
      case 'comments':
        orderByClause = sortOrder === 'asc' ? asc(postAnalytics.comments) : desc(postAnalytics.comments)
        break
      case 'createdAt':
        orderByClause = sortOrder === 'asc' ? asc(generatedContent.createdAt) : desc(generatedContent.createdAt)
        break
      case 'publishedAt':
      default:
        orderByClause = sortOrder === 'asc' ? asc(generatedContent.publishedAt) : desc(generatedContent.publishedAt)
        break
    }

    // Get total count for pagination
    const countQuery = db
      .select({ count: count() })
      .from(postAnalytics)
      .innerJoin(generatedContent, eq(postAnalytics.contentId, generatedContent.id))
      .innerJoin(books, eq(generatedContent.bookId, books.id))
      .where(and(...conditions))

    const [results, [totalResult]] = await Promise.all([
      queryWithConditions
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),
      countQuery
    ])

    // Get filter options
    const [platformOptions, bookOptions] = await Promise.all([
      db
        .selectDistinct({ platform: generatedContent.platform })
        .from(postAnalytics)
        .innerJoin(generatedContent, eq(postAnalytics.contentId, generatedContent.id))
        .where(eq(generatedContent.userId, userId))
        .orderBy(asc(generatedContent.platform)),
      db
        .selectDistinct({ 
          id: books.id, 
          title: books.title, 
          author: books.author 
        })
        .from(postAnalytics)
        .innerJoin(generatedContent, eq(postAnalytics.contentId, generatedContent.id))
        .innerJoin(books, eq(generatedContent.bookId, books.id))
        .where(eq(generatedContent.userId, userId))
        .orderBy(asc(books.title))
    ])

    const posts = results.map((row: {
      contentId: string
      platform: string
      postId: string
      content: string
      publishedAt: Date | null
      impressions: number
      likes: number
      shares: number
      comments: number
      clicks: number
      reach: number | null
      engagementRate: string | null
      bookTitle: string
      bookAuthor: string | null
      analysisData: unknown
    }) => ({
      contentId: row.contentId,
      platform: row.platform as SocialPlatform,
      postId: row.postId,
      content: row.content,
      publishedAt: row.publishedAt!,
      analytics: {
        impressions: row.impressions,
        likes: row.likes,
        shares: row.shares,
        comments: row.comments,
        clicks: row.clicks,
        reach: row.reach || 0,
        engagementRate: parseFloat(row.engagementRate || "0")
      },
      bookTitle: row.bookTitle,
      bookAuthor: row.bookAuthor || undefined,
      themes: this.extractThemesFromAnalysisData(row.analysisData)
    }))

    return {
      posts,
      pagination: {
        total: totalResult.count,
        limit,
        offset,
        hasMore: totalResult.count > offset + limit
      },
      filters: {
        platforms: platformOptions.map(p => p.platform as SocialPlatform),
        books: bookOptions.map(b => ({
          id: b.id,
          title: b.title,
          author: b.author || undefined
        }))
      }
    }
  }

  /**
   * Get platform comparison data
   */
  static async getPlatformComparison(userId: string): Promise<PlatformComparison[]> {
    const results = await db
      .select({
        platform: generatedContent.platform,
        totalPosts: count(postAnalytics.id),
        avgEngagementRate: avg(sql`CAST(${postAnalytics.engagementRate} AS DECIMAL)`),
        totalImpressions: sum(postAnalytics.impressions),
        totalLikes: sum(postAnalytics.likes),
        totalShares: sum(postAnalytics.shares),
        totalComments: sum(postAnalytics.comments)
      })
      .from(postAnalytics)
      .innerJoin(generatedContent, eq(postAnalytics.contentId, generatedContent.id))
      .where(eq(generatedContent.userId, userId))
      .groupBy(generatedContent.platform)

    const comparisons: PlatformComparison[] = []

    for (const row of results) {
      // Get best performing post for this platform
      const bestPost = await this.getPostPerformance(userId, {
        platform: row.platform as SocialPlatform,
        limit: 1
      })

      comparisons.push({
        platform: row.platform as SocialPlatform,
        totalPosts: Number(row.totalPosts),
        avgEngagementRate: Number(row.avgEngagementRate) || 0,
        totalImpressions: Number(row.totalImpressions) || 0,
        totalLikes: Number(row.totalLikes) || 0,
        totalShares: Number(row.totalShares) || 0,
        totalComments: Number(row.totalComments) || 0,
        bestPerformingPost: bestPost.posts[0]
      })
    }

    return comparisons.sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
  }

  /**
   * Get theme-based performance analysis
   */
  static async getThemePerformance(userId: string): Promise<ThemePerformance[]> {
    // Get all posts with their analytics and book analysis data
    const postsData = await this.getPostPerformance(userId, { limit: 1000 })
    const posts = postsData.posts
    
    // Group by themes
    const themeMap = new Map<string, {
      posts: PostPerformance[]
      platforms: Map<SocialPlatform, PostPerformance[]>
    }>()

    posts.forEach((post: PostPerformance) => {
      if (post.themes) {
        post.themes.forEach((theme: string) => {
          if (!themeMap.has(theme)) {
            themeMap.set(theme, {
              posts: [],
              platforms: new Map()
            })
          }

          const themeData = themeMap.get(theme)!
          themeData.posts.push(post)

          if (!themeData.platforms.has(post.platform)) {
            themeData.platforms.set(post.platform, [])
          }
          themeData.platforms.get(post.platform)!.push(post)
        })
      }
    })

    // Calculate performance metrics for each theme
    const themePerformances: ThemePerformance[] = []

    themeMap.forEach((data, theme) => {
      const totalEngagement = data.posts.reduce((sum, post) => 
        sum + post.analytics.likes + post.analytics.shares + post.analytics.comments, 0
      )
      
      const avgEngagementRate = data.posts.reduce((sum, post) => 
        sum + post.analytics.engagementRate!, 0
      ) / data.posts.length

      const platforms = Array.from(data.platforms.entries()).map(([platform, platformPosts]) => ({
        platform,
        avgEngagementRate: platformPosts.reduce((sum, post) => 
          sum + post.analytics.engagementRate!, 0
        ) / platformPosts.length,
        postCount: platformPosts.length
      }))

      themePerformances.push({
        theme,
        postCount: data.posts.length,
        avgEngagementRate,
        totalEngagement,
        platforms
      })
    })

    return themePerformances.sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
  }

  /**
   * Get optimal posting times based on historical data
   */
  static async getOptimalPostingTimes(userId: string): Promise<OptimalPostingTime[]> {
    const postsData = await this.getPostPerformance(userId, { limit: 1000 })
    const posts = postsData.posts
    
    // Group by platform, day of week, and hour
    const timeMap = new Map<string, {
      posts: PostPerformance[]
      totalEngagementRate: number
    }>()

    posts.forEach((post: PostPerformance) => {
      const date = new Date(post.publishedAt)
      const dayOfWeek = date.getDay()
      const hour = date.getHours()
      const key = `${post.platform}-${dayOfWeek}-${hour}`

      if (!timeMap.has(key)) {
        timeMap.set(key, {
          posts: [],
          totalEngagementRate: 0
        })
      }

      const timeData = timeMap.get(key)!
      timeData.posts.push(post)
      timeData.totalEngagementRate += post.analytics.engagementRate!
    })

    // Calculate optimal times
    const optimalTimes: OptimalPostingTime[] = []

    timeMap.forEach((data, key) => {
      const [platform, dayOfWeek, hour] = key.split('-')
      
      if (data.posts.length >= 3) { // Only include times with sufficient data
        optimalTimes.push({
          platform: platform as SocialPlatform,
          dayOfWeek: parseInt(dayOfWeek),
          hour: parseInt(hour),
          avgEngagementRate: data.totalEngagementRate / data.posts.length,
          postCount: data.posts.length
        })
      }
    })

    return optimalTimes.sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
  }

  /**
   * Get comprehensive analytics insights
   */
  static async getAnalyticsInsights(userId: string): Promise<AnalyticsInsights> {
    const [postsData, platformComparison, themePerformance, optimalTimes] = await Promise.all([
      this.getPostPerformance(userId),
      this.getPlatformComparison(userId),
      this.getThemePerformance(userId),
      this.getOptimalPostingTimes(userId)
    ])

    const posts = postsData.posts

    const totalEngagement = posts.reduce((sum: number, post: PostPerformance) => 
      sum + post.analytics.likes + post.analytics.shares + post.analytics.comments, 0
    )

    const avgEngagementRate = posts.length > 0 
      ? posts.reduce((sum: number, post: PostPerformance) => sum + post.analytics.engagementRate!, 0) / posts.length
      : 0

    const bestPlatform = platformComparison.length > 0 
      ? platformComparison[0].platform
      : "twitter" as SocialPlatform

    // Calculate recent trends (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

    const [recentPostsData, previousPostsData] = await Promise.all([
      this.getPostPerformance(userId, { startDate: thirtyDaysAgo }),
      this.getPostPerformance(userId, { startDate: sixtyDaysAgo, endDate: thirtyDaysAgo })
    ])

    const recentPosts = recentPostsData.posts
    const previousPosts = previousPostsData.posts

    const recentEngagement = recentPosts.reduce((sum: number, post: PostPerformance) => sum + post.analytics.engagementRate!, 0) / (recentPosts.length || 1)
    const previousEngagement = previousPosts.reduce((sum: number, post: PostPerformance) => sum + post.analytics.engagementRate!, 0) / (previousPosts.length || 1)
    const engagementChange = previousEngagement > 0 ? ((recentEngagement - previousEngagement) / previousEngagement) * 100 : 0

    const recentImpressions = recentPosts.reduce((sum: number, post: PostPerformance) => sum + post.analytics.impressions, 0)
    const previousImpressions = previousPosts.reduce((sum: number, post: PostPerformance) => sum + post.analytics.impressions, 0)
    const impressionsChange = previousImpressions > 0 ? ((recentImpressions - previousImpressions) / previousImpressions) * 100 : 0

    return {
      totalPosts: posts.length,
      totalEngagement,
      avgEngagementRate,
      bestPerformingPlatform: bestPlatform,
      topThemes: themePerformance.slice(0, 10),
      optimalPostingTimes: optimalTimes.slice(0, 20),
      recentTrends: {
        period: "Last 30 days",
        engagementChange,
        impressionsChange
      }
    }
  }

  /**
   * Bulk update analytics for all published posts
   */
  static async updateAllAnalytics(userId: string): Promise<void> {
    // Get all published posts that need analytics updates
    const publishedPosts = await db
      .select({
        contentId: generatedContent.id,
        platform: generatedContent.platform,
        socialPostId: generatedContent.socialPostId,
        accountId: socialAccounts.id
      })
      .from(generatedContent)
      .innerJoin(socialAccounts, and(
        eq(socialAccounts.userId, userId),
        eq(socialAccounts.platform, generatedContent.platform)
      ))
      .where(
        and(
          eq(generatedContent.userId, userId),
          eq(generatedContent.status, "published"),
          sql`${generatedContent.socialPostId} IS NOT NULL`
        )
      )

    // Update analytics for each post
    for (const post of publishedPosts) {
      try {
        const accessToken = await SocialMediaService.getValidAccessToken(
          userId,
          post.accountId
        )

        await this.collectPostAnalytics(
          post.contentId,
          post.platform as SocialPlatform,
          post.socialPostId!,
          accessToken
        )
      } catch (error) {
        console.error(`Failed to update analytics for post ${post.contentId}:`, error)
        // Continue with other posts even if one fails
      }
    }
  }

  /**
   * Extract themes from book analysis data
   */
  private static extractThemesFromAnalysisData(analysisData: unknown): string[] {
    if (!analysisData || typeof analysisData !== 'object') {
      return []
    }

    const themes: string[] = []
    const data = analysisData as Record<string, unknown>
    
    if (data.themes && Array.isArray(data.themes)) {
      themes.push(...data.themes.filter(theme => typeof theme === 'string'))
    }
    
    if (data.topics && Array.isArray(data.topics)) {
      themes.push(...data.topics.filter(topic => typeof topic === 'string'))
    }
    
    if (typeof data.genre === 'string') {
      themes.push(data.genre)
    }

    return themes.filter((theme, index, arr) => arr.indexOf(theme) === index) // Remove duplicates
  }
}

// Export individual functions for backward compatibility with tests
export const getPostAnalytics = AnalyticsService.getPostPerformance
export const getEngagementMetrics = AnalyticsService.getAnalyticsInsights
export const getPerformanceInsights = AnalyticsService.getAnalyticsInsights  
export const getOptimalPostingTimes = AnalyticsService.getOptimalPostingTimes
export const getPlatformComparison = AnalyticsService.getPlatformComparison
export const getThemePerformance = AnalyticsService.getThemePerformance
export const updateAnalyticsData = AnalyticsService.updateAllAnalytics