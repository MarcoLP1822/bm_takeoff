import { NextRequest } from "next/server"
import { Redis } from "@upstash/redis"

// Initialize Redis client for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

export interface RateLimitError extends Error {
  status: number
  headers: Record<string, string>
  retryAfter?: number
}

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(
    req: NextRequest,
    userId?: string
  ): Promise<RateLimitResult> {
    const key = this.generateKey(req, userId)
    const window = Math.floor(Date.now() / this.config.windowMs)
    const redisKey = `rate_limit:${key}:${window}`

    try {
      // Get current count
      const current = ((await redis.get(redisKey)) as number) || 0

      if (current >= this.config.maxRequests) {
        const resetTime = (window + 1) * this.config.windowMs
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)

        return {
          success: false,
          limit: this.config.maxRequests,
          remaining: 0,
          resetTime,
          retryAfter
        }
      }

      // Increment counter
      const newCount = await redis.incr(redisKey)

      // Set expiration if this is the first request in the window
      if (newCount === 1) {
        await redis.expire(redisKey, Math.ceil(this.config.windowMs / 1000))
      }

      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - newCount),
        resetTime: (window + 1) * this.config.windowMs
      }
    } catch (error) {
      console.error("Rate limiting error:", error)
      // Fail open - allow request if Redis is down
      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs
      }
    }
  }

  /**
   * Generate rate limit key
   */
  private generateKey(req: NextRequest, userId?: string): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req)
    }

    // Use user ID if available, otherwise fall back to IP
    if (userId) {
      return `user:${userId}`
    }

    const forwarded = req.headers.get("x-forwarded-for")
    const ip = forwarded
      ? forwarded.split(",")[0]
      : req.headers.get("x-real-ip") || "unknown"
    return `ip:${ip}`
  }
}

// Predefined rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limiting
  api: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }),

  // File upload rate limiting
  upload: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10
  }),

  // AI analysis rate limiting
  aiAnalysis: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20
  }),

  // Content generation rate limiting
  contentGeneration: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50
  }),

  // Social media publishing rate limiting
  publishing: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 30
  }),

  // Authentication rate limiting
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: req => {
      const forwarded = req.headers.get("x-forwarded-for")
      const ip = forwarded
        ? forwarded.split(",")[0]
        : req.headers.get("x-real-ip") || "unknown"
      return `auth:${ip}`
    }
  })
}

/**
 * Rate limiting middleware
 */
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return async (req: NextRequest, userId?: string) => {
    const result = await limiter.checkLimit(req, userId)

    if (!result.success) {
      const error = new Error("Rate limit exceeded") as RateLimitError
      error.status = 429
      error.headers = {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
        "Retry-After": result.retryAfter?.toString() || "60"
      }
      throw error
    }

    return {
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.resetTime).toISOString()
      }
    }
  }
}

/**
 * AI service rate limiting for external API calls
 */
export class AIServiceRateLimiter {
  private static instance: AIServiceRateLimiter
  private limiter: RateLimiter

  private constructor() {
    this.limiter = new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // Adjust based on your AI service limits
      keyGenerator: () => "ai_service"
    })
  }

  static getInstance(): AIServiceRateLimiter {
    if (!AIServiceRateLimiter.instance) {
      AIServiceRateLimiter.instance = new AIServiceRateLimiter()
    }
    return AIServiceRateLimiter.instance
  }

  async checkLimit(): Promise<void> {
    const result = await this.limiter.checkLimit({} as NextRequest)

    if (!result.success) {
      const error = new Error(
        "AI service rate limit exceeded"
      ) as RateLimitError
      error.retryAfter = result.retryAfter
      throw error
    }
  }
}
