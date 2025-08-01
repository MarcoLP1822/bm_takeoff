import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { AnalyticsService } from "@/lib/analytics-service"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const themePerformance = await AnalyticsService.getThemePerformance(userId)

    return NextResponse.json({
      success: true,
      data: themePerformance
    })
  } catch (error) {
    console.error("Theme analytics API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch theme analytics" },
      { status: 500 }
    )
  }
}
