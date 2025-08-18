import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { generatePlatformContent, Platform } from "@/lib/content-generation"
import type { BookAnalysisResult } from "@/lib/ai-analysis"
import { findBookForUser } from "@/lib/data-access/book-queries"
import { createContentForBook } from "@/lib/data-access/content-queries"
import { v4 as uuidv4 } from "uuid"

// Validation schema for targeted content generation
const generateTargetedContentSchema = z.object({
  bookId: z.string().uuid("Invalid book ID format"),
  sourceType: z.enum(['theme', 'quote', 'insight'], {
    errorMap: () => ({ message: "Source type must be 'theme', 'quote', or 'insight'" })
  }),
  sourceContent: z.string().min(1, "Source content is required"),
  platform: z.enum(['twitter', 'instagram', 'linkedin', 'facebook'], {
    errorMap: () => ({ message: "Platform must be 'twitter', 'instagram', 'linkedin', or 'facebook'" })
  }),
  variationsCount: z.number().min(1).max(5).optional().default(3),
  tone: z.enum(['professional', 'casual', 'inspirational', 'educational']).optional().default('professional'),
  includeImages: z.boolean().optional().default(true),
  locale: z.string().optional().default('en')
})

type GenerateTargetedContentRequest = z.infer<typeof generateTargetedContentSchema>

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = generateTargetedContentSchema.parse(body)

    const {
      bookId,
      sourceType,
      sourceContent,
      platform,
      variationsCount,
      tone,
      includeImages,
      locale
    } = validatedData

    console.log(`Generating targeted content for ${sourceType} on ${platform}:`, {
      bookId,
      sourceContent: sourceContent.substring(0, 100) + '...',
      variationsCount,
      tone
    })

    // Get book data and verify ownership
    const book = await findBookForUser(userId, bookId)
    if (!book) {
      return NextResponse.json(
        { error: "Book not found or access denied" },
        { status: 404 }
      )
    }

    // Check if book has been analyzed
    if (!book.analysisData || !book.analysisStatus || book.analysisStatus === 'failed') {
      return NextResponse.json(
        { error: "Book must be analyzed before generating content" },
        { status: 400 }
      )
    }

    // Generate targeted content variations
    const contentVariations = await generatePlatformContent(
      sourceType,
      sourceContent,
      platform as Platform,
      book.analysisData as BookAnalysisResult,
      book.title,
      book.author || undefined,
      {
        variationsCount,
        tone,
        includeImages,
        locale
      }
    )

    // Create a variation group ID to link related content
    const variationGroupId = uuidv4()

    // Save generated content to database with source tracking
    const savedContent = []
    for (const variation of contentVariations) {
      if (variation.posts && Array.isArray(variation.posts)) {
        for (const post of variation.posts) {
          const contentData = {
            id: uuidv4(),
            platform: post.platform,
            contentType: 'post' as const,
            content: post.content,
            hashtags: post.hashtags,
            imageUrl: post.imageUrl,
            status: 'draft' as const,
            scheduledAt: null,
            publishedAt: null,
          // New source tracking fields (from Phase 1)
          sourceType: sourceType,
          sourceContent: sourceContent,
          variationGroupId: variationGroupId,
          generationContext: {
            bookId,
            platform: post.platform,
            prompt_version: "v2.0",
            user_preferences: {
              tone,
              includeImages,
              locale
            },
            regeneration_count: variationsCount,
            generated_at: new Date().toISOString(),
            analysis_version: "1.0"
          }
        }

        const saved = await createContentForBook(bookId, contentData)
        savedContent.push(saved)
        }
      }
    }

    console.log(`Successfully generated and saved ${savedContent.length} targeted content pieces`)

    // Return the generated content with metadata
    return NextResponse.json({
      success: true,
      data: {
        contentVariations,
        savedContent,
        metadata: {
          sourceType,
          sourceContent: sourceContent.substring(0, 200) + (sourceContent.length > 200 ? '...' : ''),
          platform,
          variationsCount: contentVariations.length,
          variationGroupId,
          generatedAt: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    console.error("Targeted content generation error:", error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: "Content generation failed",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    )
  }
}
