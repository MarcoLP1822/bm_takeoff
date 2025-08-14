import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { SocialMediaService, SocialPlatform } from "@/lib/social-media"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    console.log("=== OAUTH CALLBACK START ===")
    console.log("Request URL:", request.url)
    
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    
    console.log("OAuth params:", { code: !!code, state: !!state, error })

    // Handle OAuth errors
    if (error) {
      console.log("OAuth error received:", error)
      const errorDescription = searchParams.get("error_description") || error
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings/social?error=${encodeURIComponent(errorDescription)}`,
          request.url
        )
      )
    }

    if (!code || !state) {
      console.log("Missing code or state in OAuth callback")
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings/social?error=Missing authorization code",
          request.url
        )
      )
    }

    // Validate state parameter
    const [stateUserId] = state.split(":")
    const { userId } = await auth()

    if (!userId || userId !== stateUserId) {
      console.log("Invalid state parameter:", { userId, stateUserId })
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings/social?error=Invalid state parameter",
          request.url
        )
      )
    }

    const { platform } = await params
    const platformType = platform as SocialPlatform

    // Validate platform
    if (
      !["twitter", "instagram", "linkedin", "facebook"].includes(platformType)
    ) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=Invalid platform", request.url)
      )
    }

    try {
      // Exchange code for access token
      const tokenData = await SocialMediaService.exchangeCodeForToken(
        platformType,
        code,
        state
      )

      // Save account to database
      await SocialMediaService.saveAccount(userId, platformType, {
        accountId: tokenData.accountInfo.id,
        accountName: tokenData.accountInfo.name,
        accountHandle: tokenData.accountInfo.handle,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt
      })

      // Redirect to settings page with success message
      return NextResponse.redirect(
        new URL(`/dashboard/settings?connected=${platformType}`, request.url)
      )
    } catch (tokenError) {
      console.error("Token exchange error:", tokenError)
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?error=Failed to connect ${platformType} account`,
          request.url
        )
      )
    }
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=Authentication failed", request.url)
    )
  }
}
