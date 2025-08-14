import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { generateSocialContent } from "@/lib/content-generation"
import { BookAnalysisResult } from "@/lib/ai-analysis"
import { getPresetById } from "@/lib/content-presets"
import { db } from "@/db"
import { books, generatedContent } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

const presetRequestSchema = z.object({
  bookId: z.string().uuid(),
  presetId: z.string(),
  customizations: z.object({
    focusTheme: z.string().optional(),
    additionalInstructions: z.string().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { bookId, presetId, customizations } = presetRequestSchema.parse(body)

    // Ottenere preset
    const preset = getPresetById(presetId)
    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 })
    }

    // Verificare libro esiste e appartiene all'utente
    const book = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1)

    if (!book[0]) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    if (book[0].analysisStatus !== "completed") {
      return NextResponse.json(
        { error: "Book analysis must be completed first" },
        { status: 400 }
      )
    }

    if (!book[0].analysisData) {
      return NextResponse.json(
        { error: "Book analysis data not available" },
        { status: 400 }
      )
    }

    const analysisData = book[0].analysisData as BookAnalysisResult

    // Preparare opzioni con customizations
    const generationOptions = {
      ...preset.options,
      focusTheme: customizations?.focusTheme,
      additionalInstructions: customizations?.additionalInstructions
    }

    console.log(`🎯 Generating content with preset "${preset.name}" for book "${book[0].title}"`)

    // Generare contenuto con preset
    const result = await generateSocialContent(
      analysisData,
      book[0].title,
      bookId,
      userId,
      book[0].author || undefined,
      generationOptions
    )

    // Save content to database
    console.log('Saving generated content to database...');
    let savedCount = 0;
    
    // For each variation, save the posts to the database
    try {
      for (const variation of result) {
        if (variation.posts && Array.isArray(variation.posts)) {
          for (const post of variation.posts) {
            // Use direct DB insert to save each post
            const [newContent] = await db
              .insert(generatedContent)
              .values({
                bookId,
                userId,
                platform: post.platform,
                contentType: 'post',
                content: post.content,
                hashtags: post.hashtags || [],
                imageUrl: post.imageUrl,
                status: 'draft',
                sourceType: variation.sourceType,
                sourceContent: variation.sourceContent,
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
            
            if (newContent) savedCount++;
          }
        }
      }
      console.log(`Successfully saved ${savedCount} content items to database`);
    } catch (dbError) {
      console.error('Failed to save content to database:', dbError);
      // Continue even if some saves fail - we still return what we could generate
    }

    return NextResponse.json({
      success: true,
      preset: {
        id: preset.id,
        name: preset.name,
        icon: preset.icon
      },
      book: {
        id: book[0].id,
        title: book[0].title,
        author: book[0].author
      },
      generatedContent: result,
      savedCount,
      totalPosts: Array.isArray(result) ? result.reduce((sum, variation) => 
        sum + (variation.posts && Array.isArray(variation.posts) ? variation.posts.length : 0), 0) : 0
    })

  } catch (error) {
    console.error("Preset generation error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to generate content with preset" },
      { status: 500 }
    )
  }
}
