import { NextResponse } from "next/server"
import { db } from "@/db"
import { generatedContent, socialAccounts } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { AnalyticsService } from "@/lib/analytics-service"
import { SocialMediaService } from "@/lib/social-media"

export async function GET() {
  try {
    // This endpoint should be called by a cron service (like Vercel Cron or external cron)
    // Verify the request is from a trusted source in production
    const authHeader = process.env.CRON_SECRET
    
    if (process.env.NODE_ENV === "production" && !authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Starting analytics update cron job...")

    // Get all users with published posts that need analytics updates
    const usersWithPosts = await db
      .selectDistinct({
        userId: generatedContent.userId
      })
      .from(generatedContent)
      .where(
        and(
          eq(generatedContent.status, "published"),
          sql`${generatedContent.socialPostId} IS NOT NULL`
        )
      )

    let totalUpdated = 0
    let totalErrors = 0

    // Update analytics for each user
    for (const user of usersWithPosts) {
      try {
        console.log(`Updating analytics for user: ${user.userId}`)
        await AnalyticsService.updateAllAnalytics(user.userId)
        totalUpdated++
      } catch (error) {
        console.error(`Failed to update analytics for user ${user.userId}:`, error)
        totalErrors++
      }
    }

    console.log(`Analytics update completed. Updated: ${totalUpdated}, Errors: ${totalErrors}`)

    return NextResponse.json({
      success: true,
      message: "Analytics update completed",
      stats: {
        usersUpdated: totalUpdated,
        errors: totalErrors,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("Analytics cron job error:", error)
    return NextResponse.json(
      { 
        error: "Analytics update failed",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST() {
  return GET()
}