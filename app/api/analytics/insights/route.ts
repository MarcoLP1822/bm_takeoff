import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { AnalyticsService } from "@/lib/analytics-service"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const insights = await AnalyticsService.getAnalyticsInsights(userId)

    return NextResponse.json({
      success: true,
      data: insights
    })
  } catch (error) {
    console.error("Analytics insights API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics insights" },
      { status: 500 }
    )
  }
}