import OpenAI from "openai"
import { getCachedAIAnalysis, cacheAIAnalysis } from "./cache-service"
import {
  compressAnalysisData,
  decompressAnalysisData
} from "./compression-service"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "test-key"
})

/**
 * Helper function to generate locale instruction for AI prompts
 */
function getLocaleInstruction(locale: string): string {
  if (locale === 'en') return ''
  
  const languageMap: Record<string, string> = {
    'it': 'Italian',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German'
  }
  
  const language = languageMap[locale] || locale
  return `**Provide the response in ${language} language.**`
}

export interface BookAnalysisResult {
  themes: string[]
  quotes: string[]
  keyInsights: string[]
  chapterSummaries: ChapterSummary[]
  overallSummary: string
  genre: string
  targetAudience: string
  discussionPoints: string[]
}

export interface ChapterSummary {
  chapterNumber: number
  title?: string
  summary: string
  keyPoints: string[]
}

export interface AnalysisOptions {
  maxRetries?: number
  chunkSize?: number
  includeChapterSummaries?: boolean
  locale?: string
}

/**
 * Main function to analyze a book's content using AI with caching
 */
export async function analyzeBookContent(
  textContent: string,
  bookTitle: string,
  bookId: string,
  userId: string,
  author?: string,
  options: AnalysisOptions = {}
): Promise<BookAnalysisResult> {
  const {
    maxRetries = 3,
    chunkSize = 8000,
    includeChapterSummaries = true,
    locale = 'en'
  } = options

  try {
    // Check cache first
    console.log("Checking cache for book:", bookId, "user:", userId)
    console.log("Text content received - length:", textContent?.length || 0)
    console.log("Text content preview (first 300 chars):", textContent?.substring(0, 300) || "NO TEXT CONTENT")
    
    const cached = await getCachedAIAnalysis(bookId, userId)
    if (cached) {
      console.log("Returning cached AI analysis for book:", bookId)
      return cached
    }
    console.log("No cached analysis found, proceeding with new analysis")

    // Also check database for existing analysis as fallback
    try {
      const { db } = await import("@/db")
      const { books } = await import("@/db/schema")
      const { eq, and } = await import("drizzle-orm")
      
      const existingBook = await db
        .select()
        .from(books)
        .where(and(eq(books.id, bookId), eq(books.userId, userId)))
        .limit(1)
      
      if (existingBook[0]?.analysisData) {
        console.log("Found existing analysis in database for book:", bookId)
        const dbAnalysis = existingBook[0].analysisData as BookAnalysisResult
        
        // Log what we found in the database
        console.log("Database analysis content:", {
          hasThemes: dbAnalysis.themes && dbAnalysis.themes.length > 0,
          hasQuotes: dbAnalysis.quotes && dbAnalysis.quotes.length > 0,
          hasOverallSummary: !!dbAnalysis.overallSummary && dbAnalysis.overallSummary !== "Analysis summary not available.",
          hasKeyInsights: dbAnalysis.keyInsights && dbAnalysis.keyInsights.length > 0,
          hasGenre: !!dbAnalysis.genre,
          hasTargetAudience: !!dbAnalysis.targetAudience
        })
        
        // Check if the analysis is complete enough to be useful
        const isCompleteAnalysis = 
          dbAnalysis.themes && dbAnalysis.themes.length > 0 &&
          dbAnalysis.quotes && dbAnalysis.quotes.length > 0 &&
          dbAnalysis.keyInsights && dbAnalysis.keyInsights.length > 0 &&
          dbAnalysis.overallSummary && 
          dbAnalysis.overallSummary !== "Analysis summary not available." &&
          dbAnalysis.overallSummary.length > 50 &&
          dbAnalysis.genre &&
          dbAnalysis.targetAudience &&
          dbAnalysis.discussionPoints && dbAnalysis.discussionPoints.length > 0
        
        if (isCompleteAnalysis) {
          console.log("Returning complete database analysis")
          return validateAndNormalizeAnalysisResult(dbAnalysis)
        } else {
          console.log("Database analysis is incomplete, will proceed with new analysis")
          
          // If we have partial analysis but no text content, try to enhance what we have
          if ((!textContent || textContent.trim().length < 100) && 
              (dbAnalysis.themes && dbAnalysis.themes.length > 0)) {
            console.log("Insufficient text but have partial analysis, enhancing existing data")
            
            // Fill in missing fields with defaults based on existing data
            const enhancedAnalysis: BookAnalysisResult = {
              themes: dbAnalysis.themes || [],
              quotes: dbAnalysis.quotes || [],
              keyInsights: dbAnalysis.keyInsights || [
                "Understanding complex themes and their interconnections",
                "Exploring different perspectives on human nature",
                "Recognizing the importance of critical thinking",
                "Appreciating the depth of literary analysis",
                "Learning from character development and story arcs"
              ],
              chapterSummaries: dbAnalysis.chapterSummaries || [],
              overallSummary: dbAnalysis.overallSummary || 
                `This book explores themes of ${dbAnalysis.themes?.slice(0, 2).join(' and ') || 'complex human experiences'}, offering readers insights into ${dbAnalysis.genre?.toLowerCase() || 'important topics'}. The work presents multiple perspectives and encourages deep reflection on its central concepts.`,
              genre: dbAnalysis.genre || "Literary Fiction",
              targetAudience: dbAnalysis.targetAudience || "Readers interested in thoughtful literature",
              discussionPoints: dbAnalysis.discussionPoints || [
                "How do the main themes relate to contemporary issues?",
                "What can we learn from the characters' experiences?",
                "How does the author's approach influence our understanding?"
              ]
            }
            
            console.log("Returning enhanced analysis with filled defaults")
            return validateAndNormalizeAnalysisResult(enhancedAnalysis)
          }
        }
      }
    } catch (dbError) {
      console.error("Error checking database for existing analysis:", dbError)
    }

    // Validate text content only if we need to do new analysis
    if (!textContent || textContent.trim().length < 100) {
      throw new Error("Insufficient text content for analysis. The book content appears to be empty or too short.")
    }

    // Check if the text content is just an error message from extraction
    if (textContent.includes("extraction failed") || textContent.includes("Failed")) {
      throw new Error("Cannot analyze book content because text extraction failed. Please re-upload the file.")
    }

    console.log("Performing new AI analysis for book:", bookId)
    console.log("Text content length:", textContent.length)
    console.log("Text content preview:", textContent.substring(0, 200))

    // Split content into manageable chunks if it's too long
    const chunks = splitTextIntoChunks(textContent, chunkSize)
    console.log("Number of chunks created:", chunks.length)

    // Analyze different aspects of the book
    const [
      themes,
      quotes,
      keyInsights,
      overallSummary,
      genreAndAudience,
      discussionPoints,
      chapterSummaries
    ] = await Promise.all([
      identifyThemes(chunks, bookTitle, locale, author, maxRetries),
      extractQuotes(chunks, locale, maxRetries),
      extractKeyInsights(chunks, bookTitle, locale, author, maxRetries),
      generateOverallSummary(chunks, bookTitle, locale, author, maxRetries),
      identifyGenreAndAudience(chunks, bookTitle, locale, author, maxRetries),
      identifyDiscussionPoints(chunks, bookTitle, locale, author, maxRetries),
      includeChapterSummaries
        ? generateChapterSummaries(textContent, locale, maxRetries)
        : []
    ])

    const result = {
      themes,
      quotes,
      keyInsights,
      chapterSummaries,
      overallSummary,
      genre: genreAndAudience.genre,
      targetAudience: genreAndAudience.targetAudience,
      discussionPoints
    }

    // Cache the result
    await cacheAIAnalysis(bookId, userId, result)

    return result
  } catch (error) {
    console.error("Book analysis failed:", error)
    throw new Error(
      `Failed to analyze book content: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Identify main themes and topics in the book
 */
async function identifyThemes(
  chunks: string[],
  bookTitle: string,
  locale: string = 'en',
  author?: string,
  maxRetries: number = 3
): Promise<string[]> {
  const localeInstruction = getLocaleInstruction(locale)
  
  const prompt = `Analyze the following book content and identify the main themes and topics. ${localeInstruction}

Book: "${bookTitle}"${author ? ` by ${author}` : ""}

Content:
${chunks.slice(0, 3).join("\n\n")}

Please identify 5 main themes or topics covered in this book. Return them as a JSON array of strings.
Focus on the core concepts, ideas, and subjects that are central to the book's message.

Example format: ["Theme 1", "Theme 2", "Theme 3"]`

  return await retryWithBackoff(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error("No response from AI")

    const parsed = parseAIResponse(content)
    return parsed as string[]
  }, maxRetries)
}

/**
 * Extract memorable quotes and passages from the book
 */
async function extractQuotes(
  chunks: string[],
  locale: string = 'en',
  maxRetries: number = 3
): Promise<string[]> {
  const localeInstruction = getLocaleInstruction(locale)
  
  const prompt = `Extract 5 of the most memorable, impactful, or quotable passages from the following book content. ${localeInstruction}

Content:
${chunks.slice(0, 4).join("\n\n")}

Please return the quotes as a JSON array of strings. Focus on:
- Inspirational or thought-provoking statements
- Key insights or wisdom
- Memorable phrases that capture the book's essence
- Quotes that would work well for social media sharing

Example format: ["Quote 1", "Quote 2", "Quote 3"]`

  return await retryWithBackoff(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 800
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error("No response from AI")

    const parsed = parseAIResponse(content)
    return parsed as string[]
  }, maxRetries)
}

/**
 * Extract key insights and takeaways from the book
 */
async function extractKeyInsights(
  chunks: string[],
  bookTitle: string,
  locale: string = 'en',
  author?: string,
  maxRetries: number = 3
): Promise<string[]> {
  const localeInstruction = getLocaleInstruction(locale)
  
  const prompt = `Analyze the following book content and extract the key insights and takeaways. ${localeInstruction}

Book: "${bookTitle}"${author ? ` by ${author}` : ""}

Content:
${chunks.slice(0, 3).join("\n\n")}

Please identify 5 key insights, lessons, or takeaways that readers should remember from this book.

**IMPORTANT: Return ONLY a valid JSON array of strings. No other text.**

Format exactly like this: ["Insight 1", "Insight 2", "Insight 3"]

Focus on:
- Actionable advice or principles
- Important life lessons  
- Core concepts that readers can apply
- Main arguments or conclusions`

  return await retryWithBackoff(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 600
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error("No response from AI")

    // Use safer JSON parsing
    const parsed = parseAIResponse(content)
    return parsed as string[]
  }, maxRetries)
}

/**
 * Safely parse AI response that should be JSON
 */
function parseAIResponse(content: string): unknown {
  try {
    // First try direct JSON parsing
    return JSON.parse(content)
  } catch (e) {
    console.log(
      "Direct JSON parse failed, trying to extract JSON from response:",
      content.substring(0, 200)
    )

    // Remove markdown code blocks if present
    let cleanContent = content
    if (content.includes("```json")) {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        cleanContent = jsonMatch[1].trim()
        try {
          return JSON.parse(cleanContent)
        } catch (e2) {
          console.error(
            "Failed to parse JSON from code block:",
            cleanContent.substring(0, 100)
          )
        }
      }
    }

    // Try to extract JSON array
    const arrayMatch = cleanContent.match(/\[[\s\S]*?\]/)
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0])
      } catch (e2) {
        console.error("Failed to parse extracted array:", arrayMatch[0])
      }
    }

    // Try to extract JSON object
    const objectMatch = cleanContent.match(/\{[\s\S]*?\}/)
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0])
      } catch (e2) {
        console.error("Failed to parse extracted object:", objectMatch[0])
      }
    }

    // If it's supposed to be an array but AI returned text, try to convert
    if (content.includes("\n") && !content.startsWith("[")) {
      const lines = content
        .split("\n")
        .filter(line => line.trim())
        .map(line => line.replace(/^[-*•]\s*/, "").trim())
        .filter(line => line.length > 0)

      if (lines.length > 0) {
        console.log("Converting text lines to array:", lines)
        return lines
      }
    }

    // Last resort: return the content as a single item array
    console.warn(
      "Could not parse AI response as JSON, returning as text array:",
      content.substring(0, 100)
    )
    return [content.trim()]
  }
}

/**
 * Parse AI response with type assertion
 */
function parseAIResponseAs<T>(content: string): T {
  return parseAIResponse(content) as T
}

/**
 * Generate an overall summary of the book
 */
async function generateOverallSummary(
  chunks: string[],
  bookTitle: string,
  locale: string = 'en',
  author?: string,
  maxRetries: number = 3
): Promise<string> {
  // Check if we have valid chunks with content
  if (!chunks || chunks.length === 0 || chunks.every(chunk => chunk.trim().length < 50)) {
    return `I'm sorry, but I cannot provide a summary of "${bookTitle}" as the content extraction from the PDF has failed, and I do not have access to its details. However, if you have any specific information about the book or its themes, I would be happy to help you craft a summary based on that information!`
  }

  const localeInstruction = getLocaleInstruction(locale)
  
  const prompt = `Write a comprehensive summary of the following book. ${localeInstruction}

Book: "${bookTitle}"${author ? ` by ${author}` : ""}

Content:
${chunks.slice(0, 4).join("\n\n")}

Please write a 2-3 paragraph summary that captures:
- The main purpose and message of the book
- Key topics and themes covered
- The author's approach or methodology
- Who would benefit from reading this book

Write in a clear, engaging style suitable for book descriptions or social media posts.`

  return await retryWithBackoff(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 800
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error("No response from AI")

    return content.trim()
  }, maxRetries)
}

/**
 * Identify the book's genre and target audience
 */
async function identifyGenreAndAudience(
  chunks: string[],
  bookTitle: string,
  locale: string = 'en',
  author?: string,
  maxRetries: number = 3
): Promise<{ genre: string; targetAudience: string }> {
  const localeInstruction = getLocaleInstruction(locale)
  
  const prompt = `Analyze the following book content and identify its genre and target audience. ${localeInstruction}

Book: "${bookTitle}"${author ? ` by ${author}` : ""}

Content:
${chunks.slice(0, 2).join("\n\n")}

**IMPORTANT: Return ONLY a valid JSON object. No other text.**

Format exactly like this:
{"genre": "Self-Help", "targetAudience": "Professionals seeking career advancement"}

Fields needed:
- "genre": The primary genre/category of this book
- "targetAudience": A description of who this book is primarily written for`

  return await retryWithBackoff(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error("No response from AI")

    return JSON.parse(content)
  }, maxRetries)
}

/**
 * Identify controversial or discussion-worthy points
 */
async function identifyDiscussionPoints(
  chunks: string[],
  bookTitle: string,
  locale: string = 'en',
  author?: string,
  maxRetries: number = 3
): Promise<string[]> {
  const localeInstruction = getLocaleInstruction(locale)
  
  const prompt = `Analyze the following book content and identify points that would spark discussion or debate. ${localeInstruction}

Book: "${bookTitle}"${author ? ` by ${author}` : ""}

Content:
${chunks.slice(0, 3).join("\n\n")}

Please identify 3-6 controversial, thought-provoking, or discussion-worthy points from this book.
Return them as a JSON array of strings. Focus on:
- Controversial opinions or arguments
- Challenging conventional wisdom
- Thought-provoking questions raised
- Points that might generate debate

Example format: ["Discussion point 1", "Discussion point 2", "Discussion point 3"]`

  return await retryWithBackoff(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 600
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error("No response from AI")

    return parseAIResponse(content) as string[]
  }, maxRetries)
}

/**
 * Generate chapter summaries for the book
 */
async function generateChapterSummaries(
  textContent: string,
  locale: string = 'en',
  maxRetries: number = 3
): Promise<ChapterSummary[]> {
  // Try to detect chapter breaks in the text
  const chapters = detectChapters(textContent)

  if (chapters.length === 0) {
    return []
  }

  const summaries: ChapterSummary[] = []

  // Process chapters in batches to avoid overwhelming the API
  const batchSize = 3
  for (let i = 0; i < chapters.length; i += batchSize) {
    const batch = chapters.slice(i, i + batchSize)

    const batchPromises = batch.map(async (chapter, index) => {
      const chapterNumber = i + index + 1

      const localeInstruction = getLocaleInstruction(locale)
      
      const prompt = `Summarize the following chapter from a book. ${localeInstruction}

Chapter ${chapterNumber}${chapter.title ? `: ${chapter.title}` : ""}

Content:
${chapter.content.substring(0, 4000)}

Please return a JSON object with:
- "summary": A 2-3 sentence summary of the chapter
- "keyPoints": An array of 2-4 key points or takeaways from this chapter

Example format: {"summary": "Chapter summary here", "keyPoints": ["Point 1", "Point 2"]}`

      return await retryWithBackoff(async () => {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 400
        })

        const content = response.choices[0]?.message?.content
        if (!content) throw new Error("No response from AI")

        const parsed = JSON.parse(content)
        return {
          chapterNumber,
          title: chapter.title,
          summary: parsed.summary,
          keyPoints: parsed.keyPoints
        }
      }, maxRetries)
    })

    const batchResults = await Promise.all(batchPromises)
    summaries.push(...batchResults)

    // Add a small delay between batches to respect rate limits
    if (i + batchSize < chapters.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return summaries
}

/**
 * Detect chapter breaks in the text content
 */
function detectChapters(
  textContent: string
): Array<{ title?: string; content: string }> {
  // Common chapter patterns
  const chapterPatterns = [
    /^Chapter\s+\d+[:\s]/gim,
    /^CHAPTER\s+\d+[:\s]/gim,
    /^\d+\.\s+/gim,
    /^Part\s+\d+[:\s]/gim,
    /^PART\s+\d+[:\s]/gim
  ]

  let chapters: Array<{ title?: string; content: string }> = []

  for (const pattern of chapterPatterns) {
    const matches = Array.from(textContent.matchAll(pattern))

    if (matches.length > 1) {
      // Need at least 2 chapters to be meaningful
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const startIndex = match.index!
        const endIndex =
          i < matches.length - 1 ? matches[i + 1].index! : textContent.length

        const chapterContent = textContent
          .substring(startIndex, endIndex)
          .trim()
        const lines = chapterContent.split("\n")
        const title = lines[0]?.trim()
        const content = lines.slice(1).join("\n").trim()

        if (content.length > 100) {
          // Only include substantial chapters
          chapters.push({
            title: title.length < 100 ? title : undefined,
            content
          })
        }
      }
      break // Use the first pattern that finds chapters
    }
  }

  // If no clear chapter structure, split into sections based on length
  if (chapters.length === 0 && textContent.length > 10000) {
    const sectionSize = Math.max(5000, Math.floor(textContent.length / 8))
    const sections = []

    for (let i = 0; i < textContent.length; i += sectionSize) {
      const section = textContent.substring(i, i + sectionSize)
      if (section.trim().length > 100) {
        sections.push({
          content: section.trim()
        })
      }
    }

    chapters = sections.slice(0, 10) // Limit to 10 sections max
  }

  return chapters
}

/**
 * Split text into manageable chunks for AI processing
 */
function splitTextIntoChunks(text: string, chunkSize: number = 8000): string[] {
  if (text.length <= chunkSize) {
    return [text]
  }

  const chunks: string[] = []
  const sentences = text.split(/[.!?]+/)
  let currentChunk = ""

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) continue

    if (currentChunk.length + trimmedSentence.length + 1 <= chunkSize) {
      currentChunk += (currentChunk ? ". " : "") + trimmedSentence
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + ".")
      }
      currentChunk = trimmedSentence
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk + ".")
  }

  return chunks
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxRetries) {
        break
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      console.warn(
        `Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
        lastError.message
      )
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Validate analysis result and provide fallbacks for missing data
 */
export function validateAndNormalizeAnalysisResult(
  result: Partial<BookAnalysisResult>
): BookAnalysisResult {
  return {
    themes:
      Array.isArray(result.themes) && result.themes.length > 0
        ? result.themes
        : ["General Interest"],
    quotes: Array.isArray(result.quotes) ? result.quotes : [],
    keyInsights: Array.isArray(result.keyInsights) ? result.keyInsights : [],
    chapterSummaries: Array.isArray(result.chapterSummaries)
      ? result.chapterSummaries
      : [],
    overallSummary:
      typeof result.overallSummary === "string"
        ? result.overallSummary
        : "Analysis summary not available.",
    genre: typeof result.genre === "string" ? result.genre : "Unknown",
    targetAudience:
      typeof result.targetAudience === "string"
        ? result.targetAudience
        : "General readers",
    discussionPoints: Array.isArray(result.discussionPoints)
      ? result.discussionPoints
      : []
  }
}

/**
 * Check if the OpenAI API key is configured
 */
export function isAIServiceConfigured(): boolean {
  return !!(
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "test-key"
  )
}

/**
 * Get analysis progress information
 */
export function getAnalysisProgress(
  step: string,
  totalSteps: number = 7
): { step: string; progress: number } {
  const steps = [
    "Identifying themes",
    "Extracting quotes",
    "Finding key insights",
    "Generating summary",
    "Determining genre and audience",
    "Finding discussion points",
    "Creating chapter summaries"
  ]

  const currentIndex = steps.indexOf(step)
  const progress =
    currentIndex >= 0 ? Math.round(((currentIndex + 1) / totalSteps) * 100) : 0

  return { step, progress }
}

/**
 * Estimate analysis time based on content length
 */
export function estimateAnalysisTime(textLength: number): number {
  // Base time of 30 seconds + 1 second per 1000 characters
  const baseTime = 30
  const additionalTime = Math.floor(textLength / 1000)
  return Math.min(baseTime + additionalTime, 300) // Cap at 5 minutes
}

/**
 * Sanitize and prepare text for AI analysis
 */
export function prepareTextForAnalysis(text: string): string {
  return text
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\n{3,}/g, "\n\n") // Reduce excessive line breaks
    .replace(/[ \t]{2,}/g, " ") // Reduce excessive spaces (but not newlines)
    .trim()
}

/**
 * Create a summary of analysis results for quick overview
 */
export function createAnalysisSummary(result: BookAnalysisResult): {
  totalThemes: number
  totalQuotes: number
  totalInsights: number
  totalChapters: number
  totalDiscussionPoints: number
  hasOverallSummary: boolean
} {
  return {
    totalThemes: result.themes.length,
    totalQuotes: result.quotes.length,
    totalInsights: result.keyInsights.length,
    totalChapters: result.chapterSummaries.length,
    totalDiscussionPoints: result.discussionPoints.length,
    hasOverallSummary:
      !!result.overallSummary &&
      result.overallSummary !== "Analysis summary not available."
  }
}
