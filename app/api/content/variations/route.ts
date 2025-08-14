import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { generatedContent, books } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get("bookId")
    const platform = searchParams.get("platform")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build query conditions
    const whereConditions = [eq(generatedContent.userId, userId)]

    if (bookId) {
      whereConditions.push(eq(generatedContent.bookId, bookId))
    }

    if (platform) {
      whereConditions.push(
        eq(
          generatedContent.platform,
          platform as "twitter" | "instagram" | "linkedin" | "facebook"
        )
      )
    }

    if (status) {
      whereConditions.push(
        eq(
          generatedContent.status,
          status as "draft" | "scheduled" | "published" | "failed"
        )
      )
    }

    // Fetch content with book information
    const contentWithBooks = await db
      .select({
        content: generatedContent,
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          genre: books.genre
        }
      })
      .from(generatedContent)
      .innerJoin(books, eq(generatedContent.bookId, books.id))
      .where(and(...whereConditions))
      .orderBy(desc(generatedContent.updatedAt))
      .limit(limit)
      .offset(offset)

    // Group content by variation using variationGroupId or fall back to individual content
    const variationsMap = new Map()

    contentWithBooks.forEach(({ content, book }) => {
      // Use variationGroupId if available, otherwise use individual content ID
      const variationKey = content.variationGroupId || content.id

      if (!variationsMap.has(variationKey)) {
        // Create more unique and descriptive theme names
        const theme = content.sourceType === 'theme' 
          ? content.sourceContent || extractThemeFromContent(content.content)
          : createUniqueThemeName(content.content, content.sourceType || "quote", content.id)
        
        variationsMap.set(variationKey, {
          id: variationKey,
          posts: [],
          theme: theme,
          sourceType: content.sourceType || "quote" as const,
          sourceContent: content.sourceContent || (content.content.substring(0, 200) + "..."),
          bookId: book.id,
          bookTitle: book.title,
          author: book.author,
          createdAt: content.createdAt.toISOString(),
          updatedAt: content.updatedAt.toISOString()
        })
      }

      const variation = variationsMap.get(variationKey)
      variation.posts.push({
        id: content.id,
        platform: content.platform,
        content: content.content,
        hashtags: content.hashtags || [],
        imageUrl: content.imageUrl,
        characterCount: content.content.length,
        isValid: validateContent(content.content, content.platform),
        validationErrors: getValidationErrors(
          content.content,
          content.platform,
          content.hashtags || []
        )
      })

      // Update variation timestamps to latest
      if (new Date(content.updatedAt) > new Date(variation.updatedAt)) {
        variation.updatedAt = content.updatedAt.toISOString()
      }
    })

    const variations = Array.from(variationsMap.values())

    return NextResponse.json({
      success: true,
      data: {
        variations,
        total: variations.length,
        limit,
        offset
      }
    })
  } catch (error) {
    console.error("Content variations fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch content variations" },
      { status: 500 }
    )
  }
}

// Helper function to create unique theme names to avoid duplicates
function createUniqueThemeName(content: string, sourceType: string, contentId: string): string {
  // Extract the first meaningful sentence or phrase (up to 50 characters)
  const cleanContent = content.trim().replace(/\s+/g, ' ')
  const firstSentence = cleanContent.split(/[.!?]/)[0].trim()
  const shortTitle = firstSentence.length > 50 
    ? firstSentence.substring(0, 47) + "..." 
    : firstSentence

  // Add source type prefix for clarity
  const prefixes = {
    quote: "Quote:",
    insight: "Insight:",
    theme: "Theme:",
    summary: "Summary:",
    discussion: "Discussion:"
  }

  const prefix = prefixes[sourceType as keyof typeof prefixes] || "Content:"
  
  // If the content is too short or generic, use a more descriptive approach
  if (shortTitle.length < 10) {
    const words = cleanContent.toLowerCase().split(" ").slice(0, 5)
    const keyWords = words.filter(word => 
      word.length > 3 && 
      !["this", "that", "with", "from", "they", "have", "been", "will", "there", "would"].includes(word)
    )
    
    if (keyWords.length > 0) {
      const capitalizedWords = keyWords.slice(0, 3).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      )
      return `${prefix} ${capitalizedWords.join(" ")}`
    }
  }

  return `${prefix} ${shortTitle}`
}

// Helper function to extract theme from content (simplified)
function extractThemeFromContent(content: string): string {
  // Simple theme extraction - in a real app, this might use AI or predefined rules
  const words = content.toLowerCase().split(" ")

  if (words.some(word => ["love", "heart", "emotion", "feel"].includes(word))) {
    return "Love & Emotion"
  }
  if (
    words.some(word => ["success", "achieve", "goal", "dream"].includes(word))
  ) {
    return "Success & Achievement"
  }
  if (
    words.some(word =>
      ["wisdom", "learn", "knowledge", "understand"].includes(word)
    )
  ) {
    return "Wisdom & Learning"
  }
  if (
    words.some(word =>
      ["life", "living", "experience", "journey"].includes(word)
    )
  ) {
    return "Life & Experience"
  }

  return "General Insight"
}

// Helper function to validate content based on platform
function validateContent(content: string, platform: string): boolean {
  const platformLimits = {
    twitter: 280,
    instagram: 2200,
    linkedin: 3000,
    facebook: 63206
  }

  const limit = platformLimits[platform as keyof typeof platformLimits]
  return limit ? content.length <= limit : true
}

// Helper function to get validation errors
function getValidationErrors(
  content: string,
  platform: string,
  hashtags: string[]
): string[] {
  const errors: string[] = []

  const platformConfigs = {
    twitter: { maxLength: 280, hashtagLimit: 5 },
    instagram: { maxLength: 2200, hashtagLimit: 30 },
    linkedin: { maxLength: 3000, hashtagLimit: 10 },
    facebook: { maxLength: 63206, hashtagLimit: 10 }
  }

  const config = platformConfigs[platform as keyof typeof platformConfigs]

  if (config) {
    if (content.length > config.maxLength) {
      errors.push(
        `Content exceeds ${config.maxLength} character limit by ${content.length - config.maxLength} characters`
      )
    }

    if (hashtags.length > config.hashtagLimit) {
      errors.push(
        `Too many hashtags (${hashtags.length}/${config.hashtagLimit})`
      )
    }
  }

  return errors
}
