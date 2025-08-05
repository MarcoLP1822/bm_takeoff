import { Redis } from "@upstash/redis"
import { BookAnalysisResult } from "./ai-analysis"
import { ContentVariation } from "./content-generation"

// Initialize Redis client
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      })
    : null

// Helper function to safely use Redis
function isRedisAvailable(): boolean {
  return redis !== null
}

async function safeRedisGet(key: string): Promise<unknown> {
  if (!isRedisAvailable()) return null
  return redis!.get(key)
}

async function safeRedisSetex(
  key: string,
  ttl: number,
  value: string
): Promise<void> {
  if (!isRedisAvailable()) return
  await redis!.setex(key, ttl, value)
}

async function safeRedisDel(key: string): Promise<void> {
  if (!isRedisAvailable()) return
  await redis!.del(key)
}

async function safeRedisKeys(pattern: string): Promise<string[]> {
  if (!isRedisAvailable()) return []
  try {
    return await redis!.keys(pattern)
  } catch (error) {
    console.error("Failed to get keys:", error)
    return []
  }
}

// Cache configuration
const CACHE_CONFIG = {
  AI_ANALYSIS: {
    prefix: "ai_analysis:",
    ttl: 60 * 60 * 24 * 7 // 7 days
  },
  GENERATED_CONTENT: {
    prefix: "generated_content:",
    ttl: 60 * 60 * 24 * 3 // 3 days
  },
  BOOK_LIBRARY: {
    prefix: "book_library:",
    ttl: 60 * 60 * 2 // 2 hours
  },
  CONTENT_LIST: {
    prefix: "content_list:",
    ttl: 60 * 60 // 1 hour
  },
  ANALYTICS_DATA: {
    prefix: "analytics:",
    ttl: 60 * 30 // 30 minutes
  },
  COMPRESSED_TEXT: {
    prefix: "compressed_text:",
    ttl: 60 * 60 * 24 * 30 // 30 days
  }
} as const

export type CacheKey = keyof typeof CACHE_CONFIG

/**
 * Generate cache key with prefix
 */
function getCacheKey(type: CacheKey, identifier: string): string {
  return `${CACHE_CONFIG[type].prefix}${identifier}`
}

/**
 * Cache AI analysis results
 */
export async function cacheAIAnalysis(
  bookId: string,
  userId: string,
  analysis: BookAnalysisResult
): Promise<void> {
  try {
    if (!redis) return // Skip caching if Redis is not configured

    const key = getCacheKey("AI_ANALYSIS", `${userId}:${bookId}`)
    await redis.setex(
      key,
      CACHE_CONFIG.AI_ANALYSIS.ttl,
      JSON.stringify(analysis)
    )
  } catch (error) {
    console.error("Failed to cache AI analysis:", error)
    // Don't throw - caching failures shouldn't break the app
  }
}

/**
 * Get cached AI analysis results
 */
export async function getCachedAIAnalysis(
  bookId: string,
  userId: string
): Promise<BookAnalysisResult | null> {
  try {
    console.log("Cache check - Redis available:", !!redis)
    console.log("Cache check - BookId:", bookId, "UserId:", userId)
    
    if (!redis) {
      console.log("Redis not configured, skipping cache")
      return null // Skip caching if Redis is not configured
    }

    const key = getCacheKey("AI_ANALYSIS", `${userId}:${bookId}`)
    console.log("Cache key:", key)
    
    const cached = await redis.get(key)
    console.log("Cached result:", cached ? "Found" : "Not found")

    if (cached && typeof cached === "string") {
      const parsed = JSON.parse(cached) as BookAnalysisResult
      console.log("Returning cached analysis with themes:", parsed.themes?.length || 0)
      return parsed
    }

    return null
  } catch (error) {
    console.error("Failed to get cached AI analysis:", error)
    return null
  }
}

/**
 * Cache generated content variations
 */
export async function cacheGeneratedContent(
  bookId: string,
  userId: string,
  variations: ContentVariation[]
): Promise<void> {
  try {
    const key = getCacheKey("GENERATED_CONTENT", `${userId}:${bookId}`)
    await safeRedisSetex(
      key,
      CACHE_CONFIG.GENERATED_CONTENT.ttl,
      JSON.stringify(variations)
    )
  } catch (error) {
    console.error("Failed to cache generated content:", error)
  }
}

/**
 * Get cached generated content variations
 */
export async function getCachedGeneratedContent(
  bookId: string,
  userId: string
): Promise<ContentVariation[] | null> {
  try {
    const key = getCacheKey("GENERATED_CONTENT", `${userId}:${bookId}`)
    const cached = await safeRedisGet(key)

    if (cached && typeof cached === "string") {
      return JSON.parse(cached) as ContentVariation[]
    }

    return null
  } catch (error) {
    console.error("Failed to get cached generated content:", error)
    return null
  }
}

/**
 * Cache book library data
 */
export async function cacheBookLibrary(
  userId: string,
  books: unknown[],
  filters?: Record<string, unknown>
): Promise<void> {
  try {
    const filterKey = filters ? `:${JSON.stringify(filters)}` : ""
    const key = getCacheKey("BOOK_LIBRARY", `${userId}${filterKey}`)
    await safeRedisSetex(
      key,
      CACHE_CONFIG.BOOK_LIBRARY.ttl,
      JSON.stringify(books)
    )
  } catch (error) {
    console.error("Failed to cache book library:", error)
  }
}

/**
 * Get cached book library data
 */
export async function getCachedBookLibrary(
  userId: string,
  filters?: Record<string, unknown>
): Promise<unknown[] | null> {
  try {
    if (!isRedisAvailable()) return null // Skip caching if Redis is not configured

    const filterKey = filters ? `:${JSON.stringify(filters)}` : ""
    const key = getCacheKey("BOOK_LIBRARY", `${userId}${filterKey}`)
    const cached = await safeRedisGet(key)

    if (cached && typeof cached === "string") {
      return JSON.parse(cached)
    }

    return null
  } catch (error) {
    console.error("Failed to get cached book library:", error)
    return null
  }
}

/**
 * Cache content list data
 */
export async function cacheContentList(
  userId: string,
  content: unknown[],
  filters?: Record<string, unknown>
): Promise<void> {
  try {
    const filterKey = filters ? `:${JSON.stringify(filters)}` : ""
    const key = getCacheKey("CONTENT_LIST", `${userId}${filterKey}`)
    await safeRedisSetex(
      key,
      CACHE_CONFIG.CONTENT_LIST.ttl,
      JSON.stringify(content)
    )
  } catch (error) {
    console.error("Failed to cache content list:", error)
  }
}

/**
 * Get cached content list data
 */
export async function getCachedContentList(
  userId: string,
  filters?: Record<string, unknown>
): Promise<unknown[] | null> {
  try {
    if (!isRedisAvailable()) return null // Skip caching if Redis is not configured

    const filterKey = filters ? `:${JSON.stringify(filters)}` : ""
    const key = getCacheKey("CONTENT_LIST", `${userId}${filterKey}`)
    const cached = await safeRedisGet(key)

    if (cached && typeof cached === "string") {
      return JSON.parse(cached)
    }

    return null
  } catch (error) {
    console.error("Failed to get cached content list:", error)
    return null
  }
}

/**
 * Cache analytics data
 */
export async function cacheAnalyticsData(
  userId: string,
  dataType: string,
  data: unknown,
  timeRange?: string
): Promise<void> {
  try {
    const rangeKey = timeRange ? `:${timeRange}` : ""
    const key = getCacheKey(
      "ANALYTICS_DATA",
      `${userId}:${dataType}${rangeKey}`
    )
    await safeRedisSetex(
      key,
      CACHE_CONFIG.ANALYTICS_DATA.ttl,
      JSON.stringify(data)
    )
  } catch (error) {
    console.error("Failed to cache analytics data:", error)
  }
}

/**
 * Get cached analytics data
 */
export async function getCachedAnalyticsData(
  userId: string,
  dataType: string,
  timeRange?: string
): Promise<unknown | null> {
  try {
    const rangeKey = timeRange ? `:${timeRange}` : ""
    const key = getCacheKey(
      "ANALYTICS_DATA",
      `${userId}:${dataType}${rangeKey}`
    )
    const cached = await safeRedisGet(key)

    if (cached && typeof cached === "string") {
      return JSON.parse(cached)
    }

    return null
  } catch (error) {
    console.error("Failed to get cached analytics data:", error)
    return null
  }
}

/**
 * Cache compressed text content
 */
export async function cacheCompressedText(
  bookId: string,
  compressedText: string
): Promise<void> {
  try {
    const key = getCacheKey("COMPRESSED_TEXT", bookId)
    await safeRedisSetex(key, CACHE_CONFIG.COMPRESSED_TEXT.ttl, compressedText)
  } catch (error) {
    console.error("Failed to cache compressed text:", error)
  }
}

/**
 * Get cached compressed text content
 */
export async function getCachedCompressedText(
  bookId: string
): Promise<string | null> {
  try {
    const key = getCacheKey("COMPRESSED_TEXT", bookId)
    const cached = await safeRedisGet(key)

    if (cached && typeof cached === "string") {
      return cached
    }

    return null
  } catch (error) {
    console.error("Failed to get cached compressed text:", error)
    return null
  }
}

/**
 * Invalidate cache for a specific user and type
 */
export async function invalidateCache(
  type: CacheKey,
  userId: string,
  identifier?: string
): Promise<void> {
  try {
    if (identifier) {
      // Delete specific cache entry
      const key = getCacheKey(type, `${userId}:${identifier}`)
      await safeRedisDel(key)
    } else {
      // Delete all cache entries for this user and type
      const pattern = `${CACHE_CONFIG[type].prefix}${userId}:*`
      const keys = await safeRedisKeys(pattern)

      if (keys.length > 0) {
        // Delete all matching keys
        for (const key of keys) {
          await safeRedisDel(key)
        }
        console.log(
          `Invalidated ${keys.length} cache entries for pattern: ${pattern}`
        )
      }
    }
  } catch (error) {
    console.error("Failed to invalidate cache:", error)
  }
}

/**
 * Clear all cache for a user
 */
export async function clearUserCache(userId: string): Promise<void> {
  try {
    const patterns = Object.values(CACHE_CONFIG).map(
      config => `${config.prefix}${userId}:*`
    )

    // In a real implementation, you'd use SCAN to find and delete all matching keys
    // For now, we'll just log the patterns that would be cleared
    console.log("Would clear cache patterns:", patterns)
  } catch (error) {
    console.error("Failed to clear user cache:", error)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalKeys: number
  memoryUsage: string
  hitRate?: number
}> {
  try {
    // This would require Redis INFO command which might not be available in Upstash
    // Return basic stats for now
    return {
      totalKeys: 0,
      memoryUsage: "Unknown",
      hitRate: undefined
    }
  } catch (error) {
    console.error("Failed to get cache stats:", error)
    return {
      totalKeys: 0,
      memoryUsage: "Error",
      hitRate: undefined
    }
  }
}

/**
 * Warm up cache with frequently accessed data
 */
export async function warmUpCache(userId: string): Promise<void> {
  try {
    // This would pre-load frequently accessed data
    // Implementation depends on usage patterns
    console.log(`Warming up cache for user: ${userId}`)
  } catch (error) {
    console.error("Failed to warm up cache:", error)
  }
}
