import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { SocialMediaService } from "@/lib/social-media"

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accounts = await SocialMediaService.getUserAccounts(userId)
    
    return NextResponse.json({ accounts })
  } catch (error) {
    console.error("Error fetching social accounts:", error)
    return NextResponse.json(
      { error: "Failed to fetch social accounts" },
      { status: 500 }
    )
  }
}