import { db } from "@/db"
import {
  generatedContent,
  socialAccounts,
  type SelectGeneratedContent
} from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { SocialMediaService, type SocialPlatform } from "./social-media"
import { AnalyticsService } from "./analytics-service"

export interface PublishRequest {
  contentId: string
  accountIds: string[]
  scheduledAt?: Date
}

export interface PublishResult {
  success: boolean
  contentId: string
  accountId: string
  platform: SocialPlatform
  socialPostId?: string
  error?: string
}

export interface ScheduledPost {
  id: string
  contentId: string
  accountId: string
  platform: SocialPlatform
  content: string
  scheduledAt: Date
  status: "scheduled" | "publishing" | "published" | "failed"
  retryCount: number
  lastError?: string
}

export interface TwitterPostData {
  text: string
  media?: {
    media_ids: string[]
  }
}

export interface LinkedInPostData {
  author: string
  lifecycleState: string
  specificContent: {
    "com.linkedin.ugc.ShareContent": {
      shareCommentary: {
        text: string
      }
      shareMediaCategory: string
    }
  }
  visibility: {
    "com.linkedin.ugc.MemberNetworkVisibility": string
  }
}

export class PublishingService {
  /**
   * Publish content immediately to specified social accounts
   */
  static async publishNow(
    userId: string,
    request: PublishRequest
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = []

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

    // Process each account
    for (const accountId of request.accountIds) {
      try {
        const result = await this.publishToAccount(
          userId,
          contentData,
          accountId
        )
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          contentId: request.contentId,
          accountId,
          platform: contentData.platform as SocialPlatform,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    return results
  }

  /**
   * Publish content to a specific social account
   */
  private static async publishToAccount(
    userId: string,
    contentData: SelectGeneratedContent,
    accountId: string
  ): Promise<PublishResult> {
    // Get account details
    const account = await db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.id, accountId),
          eq(socialAccounts.userId, userId),
          eq(socialAccounts.isActive, true)
        )
      )
      .limit(1)

    if (account.length === 0) {
      throw new Error("Social account not found or inactive")
    }

    const accountData = account[0]
    const platform = accountData.platform as SocialPlatform

    // Get valid access token
    const accessToken = await SocialMediaService.getValidAccessToken(
      userId,
      accountId
    )

    // Publish to platform
    const socialPostId = await this.publishToPlatform(
      platform,
      accessToken,
      contentData.content,
      contentData.hashtags || undefined,
      contentData.imageUrl || undefined
    )

    // Update content status
    await db
      .update(generatedContent)
      .set({
        status: "published",
        publishedAt: new Date(),
        socialPostId,
        updatedAt: new Date()
      })
      .where(eq(generatedContent.id, contentData.id))

    // Schedule analytics collection for later (after the post has time to gather engagement)
    // We'll collect initial analytics after 1 hour to allow for some engagement
    setTimeout(
      async () => {
        try {
          const validAccessToken = await SocialMediaService.getValidAccessToken(
            userId,
            accountId
          )
          await AnalyticsService.collectPostAnalytics(
            contentData.id,
            platform,
            socialPostId,
            validAccessToken
          )
        } catch (error) {
          console.error(
            `Failed to collect initial analytics for post ${socialPostId}:`,
            error
          )
        }
      },
      60 * 60 * 1000
    ) // 1 hour delay

    return {
      success: true,
      contentId: contentData.id,
      accountId,
      platform,
      socialPostId
    }
  }

  /**
   * Publish content to specific platform
   */
  private static async publishToPlatform(
    platform: SocialPlatform,
    accessToken: string,
    content: string,
    hashtags?: string[],
    imageUrl?: string
  ): Promise<string> {
    const fullContent =
      hashtags && hashtags.length > 0
        ? `${content}\n\n${hashtags.join(" ")}`
        : content

    switch (platform) {
      case "twitter":
        return await this.publishToTwitter(accessToken, fullContent, imageUrl)
      case "instagram":
        return await this.publishToInstagram(accessToken, fullContent, imageUrl)
      case "linkedin":
        return await this.publishToLinkedIn(accessToken, fullContent, imageUrl)
      case "facebook":
        return await this.publishToFacebook(accessToken, fullContent, imageUrl)
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /**
   * Publish to Twitter/X
   */
  private static async publishToTwitter(
    accessToken: string,
    content: string,
    imageUrl?: string
  ): Promise<string> {
    const tweetData: TwitterPostData = {
      text: content
    }

    // Handle image upload if provided
    if (imageUrl) {
      // For now, we'll skip image upload to keep it simple
      // In a full implementation, you'd upload the image first and get media_id
    }

    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(tweetData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Twitter publish failed: ${error}`)
    }

    const result = await response.json()
    return result.data.id
  }

  /**
   * Publish to Instagram
   */
  private static async publishToInstagram(
    accessToken: string,
    content: string,
    imageUrl?: string
  ): Promise<string> {
    // Instagram requires an image for posts
    if (!imageUrl) {
      throw new Error("Instagram posts require an image")
    }

    // Create media container
    const containerResponse = await fetch(
      `https://graph.instagram.com/me/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(content)}&access_token=${accessToken}`,
      { method: "POST" }
    )

    if (!containerResponse.ok) {
      const error = await containerResponse.text()
      throw new Error(`Instagram container creation failed: ${error}`)
    }

    const containerResult = await containerResponse.json()
    const containerId = containerResult.id

    // Publish the media
    const publishResponse = await fetch(
      `https://graph.instagram.com/me/media_publish?creation_id=${containerId}&access_token=${accessToken}`,
      { method: "POST" }
    )

    if (!publishResponse.ok) {
      const error = await publishResponse.text()
      throw new Error(`Instagram publish failed: ${error}`)
    }

    const publishResult = await publishResponse.json()
    return publishResult.id
  }

  /**
   * Publish to LinkedIn
   */
  private static async publishToLinkedIn(
    accessToken: string,
    content: string,
    imageUrl?: string
  ): Promise<string> {
    const postData: LinkedInPostData = {
      author: "urn:li:person:me", // This would need to be the actual person URN
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    }

    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify(postData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LinkedIn publish failed: ${error}`)
    }

    const result = await response.json()
    return result.id
  }

  /**
   * Publish to Facebook
   */
  private static async publishToFacebook(
    accessToken: string,
    content: string,
    imageUrl?: string
  ): Promise<string> {
    const postData = new URLSearchParams({
      message: content,
      access_token: accessToken
    })

    if (imageUrl) {
      postData.append("link", imageUrl)
    }

    const response = await fetch("https://graph.facebook.com/me/feed", {
      method: "POST",
      body: postData
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Facebook publish failed: ${error}`)
    }

    const result = await response.json()
    return result.id
  }

  /**
   * Retry failed publication
   */
  static async retryPublication(
    userId: string,
    contentId: string,
    accountId: string
  ): Promise<PublishResult> {
    // Get content details
    const content = await db
      .select()
      .from(generatedContent)
      .where(
        and(
          eq(generatedContent.id, contentId),
          eq(generatedContent.userId, userId)
        )
      )
      .limit(1)

    if (content.length === 0) {
      throw new Error("Content not found")
    }

    const contentData = content[0]

    try {
      const result = await this.publishToAccount(userId, contentData, accountId)
      return result
    } catch (error) {
      // Update content status to failed
      await db
        .update(generatedContent)
        .set({
          status: "failed",
          updatedAt: new Date()
        })
        .where(eq(generatedContent.id, contentId))

      throw error
    }
  }
}
