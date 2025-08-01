import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { SocialMediaService } from "@/lib/social-media"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { accountId } = await params

    await SocialMediaService.disconnectAccount(userId, accountId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error disconnecting social account:", error)
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { accountId } = await params
    const { action } = await request.json()

    if (action === "reactivate") {
      // This would typically involve re-authentication
      // For now, we'll just return an error indicating re-auth is needed
      return NextResponse.json(
        { error: "Please reconnect your account", requiresReauth: true },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error updating social account:", error)
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    )
  }
}
