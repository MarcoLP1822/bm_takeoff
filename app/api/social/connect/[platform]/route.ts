import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { SocialMediaService, SocialPlatform } from "@/lib/social-media"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { platform } = await params
    const platformType = platform as SocialPlatform
    
    // Validate platform
    if (!["twitter", "instagram", "linkedin", "facebook"].includes(platformType)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
    }

    // Generate state parameter for CSRF protection
    const state = `${userId}:${crypto.randomUUID()}`
    
    // Generate OAuth authorization URL
    const authUrl = SocialMediaService.generateAuthUrl(platformType, state)
    
    return NextResponse.json({ authUrl, state })
  } catch (error) {
    console.error("Error generating OAuth URL:", error)
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    )
  }
}