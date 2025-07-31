import { NextRequest, NextResponse } from "next/server"
import { PublishingService } from "@/lib/publishing-service"
import { z } from "zod"

const publishSchema = z.object({
  contentId: z.string(),
  accountIds: z.array(z.string())
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { auth } = await import('@clerk/nextjs/server')
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = publishSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // Publish content immediately
    const results = await PublishingService.publishNow(userId, validatedData)

    // Check if any publications failed
    const failures = results.filter(r => !r.success)
    const successes = results.filter(r => r.success)

    // If all failed, return error
    if (failures.length === results.length) {
      return NextResponse.json(
        { 
          error: 'All publications failed',
          results,
          contentId: validatedData.contentId
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: successes.length > 0,
      results,
      summary: {
        total: results.length,
        successful: successes.length,
        failed: failures.length
      },
      ...(failures.length > 0 && {
        warnings: [{
          type: 'PARTIAL_FAILURE',
          message: `${failures.length} of ${results.length} publications failed`,
          retryable: true,
          details: failures.map(f => ({ platform: f.platform, error: f.error }))
        }]
      })
    })

  } catch (error) {
    console.error('Publishing error:', error)
    return NextResponse.json(
      { error: 'Failed to publish content' },
      { status: 500 }
    )
  }
}