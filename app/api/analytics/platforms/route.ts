import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { AnalyticsService } from "@/lib/analytics-service"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const platformComparison = await AnalyticsService.getPlatformComparison(userId)

    return NextResponse.json({
      success: true,
      data: platformComparison
    })
  } catch (error) {
    console.error("Analytics platforms API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch platform analytics" },
      { status: 500 }
    )
  }
}