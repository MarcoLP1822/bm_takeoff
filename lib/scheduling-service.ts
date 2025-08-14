import { Redis } from "@upstash/redis"
import { db } from "@/db"
import { generatedContent } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import {
  PublishingService,
  type PublishResult,
  type ScheduledPost
} from "./publishing-service"
import { type SocialPlatform } from "./social-media"

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

export interface ScheduleRequest {
  contentId: string
  accountIds: string[]
  scheduledAt: Date
}

export class SchedulingService {
  private static readonly QUEUE_KEY = "scheduled_posts"
  private static readonly PROCESSING_KEY = "processing_posts"
  private static readonly MAX_RETRIES = 3

  /**
   * Safely parse post data from Redis (handles both string and object cases)
   */
  private static parsePostData(postData: unknown): ScheduledPost {
    let post: ScheduledPost
    
    if (typeof postData === 'string') {
      post = JSON.parse(postData) as ScheduledPost
    } else {
      post = postData as ScheduledPost
    }
    
    // Ensure scheduledAt is a Date object
    if (typeof post.scheduledAt === 'string') {
      post.scheduledAt = new Date(post.scheduledAt)
    }
    
    return post
  }

  /**
   * Schedule content for future publishing
   */
  static async schedulePost(
    userId: string,
    request: ScheduleRequest
  ): Promise<void> {
    // Validate scheduled time is in the future
    if (request.scheduledAt <= new Date()) {
      throw new Error("Scheduled time must be in the future")
    }

    // Get content details
    const content = await db
      .select()
      .from(generatedContent)
      .where(
        and(
          eq(generatedContent.id, request.contentId),
          eq(generatedContent.userId, userId)
        )
      )
      .limit(1)

    if (content.length === 0) {
      throw new Error("Content not found")
    }

    const contentData = content[0]

    // Create scheduled posts for each account
    for (const accountId of request.accountIds) {
      // Handle mock accounts in development
      if (process.env.NODE_ENV === 'development' && accountId.startsWith('mock-')) {
        const scheduledPost: ScheduledPost = {
          id: crypto.randomUUID(),
          contentId: request.contentId,
          accountId,
          platform: contentData.platform as SocialPlatform,
          content: contentData.content,
          scheduledAt: request.scheduledAt,
          status: "scheduled",
          retryCount: 0
        }

        // Store in Redis with expiration for mock accounts
        const key = `${this.QUEUE_KEY}:${scheduledPost.id}`
        await redis.setex(
          key,
          Math.ceil((request.scheduledAt.getTime() - Date.now()) / 1000) + 3600, // 1 hour buffer
          JSON.stringify({
            ...scheduledPost,
            isMock: true // Flag to identify mock posts
          })
        )

        // Add to sorted set for time-based processing
        await redis.zadd(this.QUEUE_KEY, {
          score: request.scheduledAt.getTime(),
          member: scheduledPost.id
        })

        continue // Skip database operations for mock accounts
      }

      // Normal processing for real accounts
      const scheduledPost: ScheduledPost = {
        id: crypto.randomUUID(),
        contentId: request.contentId,
        accountId,
        platform: contentData.platform as SocialPlatform,
        content: contentData.content,
        scheduledAt: request.scheduledAt,
        status: "scheduled",
        retryCount: 0
      }

      // Store in Redis with expiration
      const key = `${this.QUEUE_KEY}:${scheduledPost.id}`
      await redis.setex(
        key,
        Math.ceil((request.scheduledAt.getTime() - Date.now()) / 1000) + 3600, // 1 hour buffer
        JSON.stringify(scheduledPost)
      )

      // Add to sorted set for time-based processing
      await redis.zadd(this.QUEUE_KEY, {
        score: request.scheduledAt.getTime(),
        member: scheduledPost.id
      })
    }

    // Update content status to scheduled
    await db
      .update(generatedContent)
      .set({
        status: "scheduled",
        scheduledAt: request.scheduledAt,
        updatedAt: new Date()
      })
      .where(eq(generatedContent.id, request.contentId))
  }

  /**
   * Get scheduled posts for a user
   */
  static async getScheduledPosts(userId: string): Promise<ScheduledPost[]> {
    // Get all scheduled post IDs
    const now = Date.now()
    const futureTime = now + 30 * 24 * 60 * 60 * 1000 // 30 days from now

    const scheduledIds = await redis.zrange(this.QUEUE_KEY, now, futureTime, {
      byScore: true
    })

    const scheduledPosts: ScheduledPost[] = []

    // Get details for each scheduled post
    for (const id of scheduledIds) {
      const key = `${this.QUEUE_KEY}:${id}`
      const postData = await redis.get(key)

      if (postData) {
        const post = this.parsePostData(postData)

        // Check if this post belongs to the user
        const content = await db
          .select()
          .from(generatedContent)
          .where(
            and(
              eq(generatedContent.id, post.contentId),
              eq(generatedContent.userId, userId)
            )
          )
          .limit(1)

        if (content.length > 0) {
          scheduledPosts.push(post)
        }
      }
    }

    return scheduledPosts.sort(
      (a, b) => {
        const dateA = a.scheduledAt instanceof Date ? a.scheduledAt : new Date(a.scheduledAt)
        const dateB = b.scheduledAt instanceof Date ? b.scheduledAt : new Date(b.scheduledAt)
        return dateA.getTime() - dateB.getTime()
      }
    )
  }

  /**
   * Cancel a scheduled post
   */
  static async cancelScheduledPost(
    userId: string,
    scheduledPostId: string
  ): Promise<void> {
    const key = `${this.QUEUE_KEY}:${scheduledPostId}`
    const postData = await redis.get(key)

    if (!postData) {
      throw new Error("Scheduled post not found")
    }

    const post = this.parsePostData(postData)

    // Verify user owns this content
    const content = await db
      .select()
      .from(generatedContent)
      .where(
        and(
          eq(generatedContent.id, post.contentId),
          eq(generatedContent.userId, userId)
        )
      )
      .limit(1)

    if (content.length === 0) {
      throw new Error("Unauthorized to cancel this post")
    }

    // Remove from Redis
    await redis.del(key)
    await redis.zrem(this.QUEUE_KEY, scheduledPostId)

    // Check if this was the last scheduled post for this content
    const remainingPosts = await this.getScheduledPostsForContent(
      post.contentId
    )

    if (remainingPosts.length === 0) {
      // Update content status back to draft
      await db
        .update(generatedContent)
        .set({
          status: "draft",
          scheduledAt: null,
          updatedAt: new Date()
        })
        .where(eq(generatedContent.id, post.contentId))
    }
  }

  /**
   * Reschedule a post
   */
  static async reschedulePost(
    userId: string,
    scheduledPostId: string,
    newScheduledAt: Date
  ): Promise<void> {
    if (newScheduledAt <= new Date()) {
      throw new Error("New scheduled time must be in the future")
    }

    const key = `${this.QUEUE_KEY}:${scheduledPostId}`
    const postData = await redis.get(key)

    if (!postData) {
      throw new Error("Scheduled post not found")
    }

    const post = this.parsePostData(postData)

    // Verify user owns this content
    const content = await db
      .select()
      .from(generatedContent)
      .where(
        and(
          eq(generatedContent.id, post.contentId),
          eq(generatedContent.userId, userId)
        )
      )
      .limit(1)

    if (content.length === 0) {
      throw new Error("Unauthorized to reschedule this post")
    }

    // Update the scheduled time
    post.scheduledAt = newScheduledAt

    // Update in Redis
    await redis.setex(
      key,
      Math.ceil((newScheduledAt.getTime() - Date.now()) / 1000) + 3600,
      JSON.stringify(post)
    )

    // Update in sorted set
    await redis.zadd(this.QUEUE_KEY, {
      score: newScheduledAt.getTime(),
      member: scheduledPostId
    })

    // Update content scheduled time if this is the earliest post
    const allPostsForContent = await this.getScheduledPostsForContent(
      post.contentId
    )
    const earliestPost = allPostsForContent.sort(
      (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
    )[0]

    if (earliestPost) {
      await db
        .update(generatedContent)
        .set({
          scheduledAt: earliestPost.scheduledAt,
          updatedAt: new Date()
        })
        .where(eq(generatedContent.id, post.contentId))
    }
  }

  /**
   * Process due posts (called by cron job or background worker)
   */
  static async processDuePosts(): Promise<void> {
    const now = Date.now()

    // Get posts that are due for publishing
    const duePostIds = await redis.zrange(this.QUEUE_KEY, 0, now, {
      byScore: true
    })

    for (const postId of duePostIds) {
      try {
        await this.processScheduledPost(postId as string)
      } catch (error) {
        console.error(`Failed to process scheduled post ${postId}:`, error)
      }
    }
  }

  /**
   * Process a single scheduled post
   */
  private static async processScheduledPost(postId: string): Promise<void> {
    const key = `${this.QUEUE_KEY}:${postId}`
    const processingKey = `${this.PROCESSING_KEY}:${postId}`

    // Check if already being processed
    const isProcessing = await redis.get(processingKey)
    if (isProcessing) {
      return
    }

    // Mark as processing
    await redis.setex(processingKey, 300, "processing") // 5 minute lock

    try {
      const postData = await redis.get(key)
      if (!postData) {
        // Post was cancelled or already processed
        await redis.del(processingKey)
        return
      }

      const post = this.parsePostData(postData)

      // Get user ID from content
      const content = await db
        .select()
        .from(generatedContent)
        .where(eq(generatedContent.id, post.contentId))
        .limit(1)

      if (content.length === 0) {
        // Content was deleted
        await this.cleanupScheduledPost(postId)
        await redis.del(processingKey)
        return
      }

      const userId = content[0].userId

      // Update post status
      post.status = "publishing"
      await redis.setex(key, 3600, JSON.stringify(post))

      // Attempt to publish
      const result = await PublishingService.publishNow(userId, {
        contentId: post.contentId,
        accountIds: [post.accountId]
      })

      const publishResult = result[0]

      if (publishResult.success) {
        // Success - remove from queue
        post.status = "published"
        await this.cleanupScheduledPost(postId)
      } else {
        // Failed - handle retry
        await this.handlePublishFailure(
          post,
          publishResult.error || "Unknown error"
        )
      }
    } catch (error) {
      // Handle unexpected errors
      const postData = await redis.get(key)
      if (postData) {
        const post = this.parsePostData(postData)
        await this.handlePublishFailure(
          post,
          error instanceof Error ? error.message : "Unknown error"
        )
      }
    } finally {
      await redis.del(processingKey)
    }
  }

  /**
   * Handle publication failure with retry logic
   */
  private static async handlePublishFailure(
    post: ScheduledPost,
    error: string
  ): Promise<void> {
    post.retryCount++
    post.lastError = error

    if (post.retryCount >= this.MAX_RETRIES) {
      // Max retries reached - mark as failed
      post.status = "failed"

      // Update content status
      await db
        .update(generatedContent)
        .set({
          status: "failed",
          updatedAt: new Date()
        })
        .where(eq(generatedContent.id, post.contentId))

      // Remove from queue but keep for history
      await redis.zrem(this.QUEUE_KEY, post.id)

      // Store failed post for user notification
      const failedKey = `failed_posts:${post.id}`
      await redis.setex(failedKey, 7 * 24 * 60 * 60, JSON.stringify(post)) // Keep for 7 days
    } else {
      // Schedule retry (exponential backoff)
      const retryDelay = Math.pow(2, post.retryCount) * 60 * 1000 // 2^n minutes
      const retryTime = Date.now() + retryDelay

      post.scheduledAt = new Date(retryTime)
      post.status = "scheduled"

      // Update in Redis
      const key = `${this.QUEUE_KEY}:${post.id}`
      await redis.setex(key, 3600, JSON.stringify(post))
      await redis.zadd(this.QUEUE_KEY, { score: retryTime, member: post.id })
    }
  }

  /**
   * Clean up a scheduled post after successful publishing
   */
  private static async cleanupScheduledPost(postId: string): Promise<void> {
    const key = `${this.QUEUE_KEY}:${postId}`
    await redis.del(key)
    await redis.zrem(this.QUEUE_KEY, postId)
  }

  /**
   * Get scheduled posts for a specific content
   */
  private static async getScheduledPostsForContent(
    contentId: string
  ): Promise<ScheduledPost[]> {
    const allScheduledIds = await redis.zrange(this.QUEUE_KEY, 0, -1)
    const posts: ScheduledPost[] = []

    for (const id of allScheduledIds) {
      const key = `${this.QUEUE_KEY}:${id}`
      const postData = await redis.get(key)

      if (postData) {
        const post = this.parsePostData(postData)
        if (post.contentId === contentId) {
          posts.push(post)
        }
      }
    }

    return posts
  }

  /**
   * Get failed posts for user notification
   */
  static async getFailedPosts(userId: string): Promise<ScheduledPost[]> {
    // This would require scanning failed posts - simplified implementation
    const failedPosts: ScheduledPost[] = []

    // In a real implementation, you'd maintain a separate index for failed posts by user
    // For now, we'll return empty array and rely on content status for failure detection

    return failedPosts
  }

  /**
   * Clear old scheduled posts (cleanup job)
   */
  static async cleanupOldPosts(): Promise<void> {
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago

    // Remove old posts from sorted set
    await redis.zremrangebyscore(this.QUEUE_KEY, 0, cutoffTime)

    // Clean up failed posts older than 7 days
    const pattern = "failed_posts:*"
    // Note: In production, you'd want a more efficient cleanup mechanism
  }
}
