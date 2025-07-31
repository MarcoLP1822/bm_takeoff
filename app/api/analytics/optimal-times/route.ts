import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { AnalyticsService } from "@/lib/analytics-service"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const optimalTimes = await AnalyticsService.getOptimalPostingTimes(userId)

    return NextResponse.json({
      success: true,
      data: optimalTimes
    })
  } catch (error) {
    console.error("Optimal times API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch optimal posting times" },
      { status: 500 }
    )
  }
}