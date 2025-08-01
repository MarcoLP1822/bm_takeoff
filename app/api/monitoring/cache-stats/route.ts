import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getCacheStats } from "@/lib/cache-service"

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stats = await getCacheStats()

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Cache stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch cache statistics" },
      { status: 500 }
    )
  }
}
