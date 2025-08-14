import OpenAI from "openai"
import { BookAnalysisResult } from "./ai-analysis"
import { HashtagGenerator } from "./hashtag-generator"
import { ImageSuggestionEngine } from "./image-suggestions"
import {
  getCachedGeneratedContent,
  cacheGeneratedContent
} from "./cache-service"
import { calculateEngagementPotential } from "./content-optimization"
import {
  Platform,
  PLATFORM_CONFIGS,
  GeneratedPost,
  ContentVariation,
  ContentGenerationOptions,
  GenerationProgress,
  ContentGenerationResult,
  ImageSuggestion
} from "./content-types"

// Re-export types for server-side use
export type {
  Platform,
  GeneratedPost,
  ContentVariation,
  ContentGenerationOptions,
  GenerationProgress,
  ContentGenerationResult,
  ImageSuggestion
}
export { PLATFORM_CONFIGS }

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined"

// Initialize OpenAI client only on server-side
const openai = isBrowser 
  ? null 
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "test-key",
      timeout: 120000 // 120 seconds timeout
    })

// Helper function to ensure server-side execution
function ensureServerSide(functionName: string) {
  if (isBrowser) {
    throw new Error(
      `${functionName} should not be called on the client-side. ` +
      `Use the API routes in /api/content/ instead. ` +
      `This protects your OpenAI API keys from being exposed to clients.`
    )
  }
  if (!openai) {
    throw new Error(`OpenAI client not initialized for ${functionName}`)
  }
  return openai
}

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

/**
 * Generate hashtags based on content and platform using advanced hashtag generator
 */
export function generateHashtags(
  content: string,
  platform: Platform,
  bookTitle: string,
  author?: string,
  theme?: string,
  bookAnalysis?: BookAnalysisResult,
  contentType:
    | "quote"
    | "insight"
    | "theme"
    | "summary"
    | "discussion" = "quote"
): string[] {
  // Use advanced hashtag generator if book analysis is available
  if (bookAnalysis) {
    const suggestions = HashtagGenerator.generateHashtags(
      bookAnalysis,
      bookTitle,
      author,
      platform,
      contentType
    )
    return HashtagGenerator.getOptimalHashtags(suggestions, platform)
  }

  // Fallback to simple hashtag generation
  const hashtags: string[] = []
  const config = PLATFORM_CONFIGS[platform]

  // Book-specific hashtags
  const cleanTitle = bookTitle.replace(/[^a-zA-Z0-9]/g, "")
  if (cleanTitle.length > 0) {
    hashtags.push(`#${cleanTitle}`)
  }

  if (author) {
    const cleanAuthor = author.replace(/[^a-zA-Z0-9]/g, "")
    if (cleanAuthor.length > 0) {
      hashtags.push(`#${cleanAuthor}`)
    }
  }

  // Platform-specific hashtags
  const platformHashtags = {
    twitter: [
      "#BookQuote",
      "#Reading",
      "#BookLovers",
      "#Inspiration",
      "#Wisdom"
    ],
    instagram: [
      "#bookstagram",
      "#bookquote",
      "#reading",
      "#booklovers",
      "#inspiration",
      "#wisdom",
      "#literature",
      "#bookclub",
      "#readingcommunity",
      "#bookish"
    ],
    linkedin: [
      "#Leadership",
      "#PersonalDevelopment",
      "#BookRecommendation",
      "#ProfessionalGrowth",
      "#Learning"
    ],
    facebook: [
      "#BookClub",
      "#Reading",
      "#BookRecommendation",
      "#Literature",
      "#Inspiration"
    ]
  }

  // Theme-based hashtags
  const themeHashtags: Record<string, string[]> = {
    leadership: ["#Leadership", "#Management", "#Success"],
    love: ["#Love", "#Relationships", "#Romance"],
    adventure: ["#Adventure", "#Journey", "#Exploration"],
    mystery: ["#Mystery", "#Thriller", "#Suspense"],
    science: ["#Science", "#Knowledge", "#Discovery"],
    history: ["#History", "#Historical", "#Past"],
    philosophy: ["#Philosophy", "#Wisdom", "#Thinking"],
    business: ["#Business", "#Entrepreneurship", "#Success"],
    selfhelp: ["#SelfHelp", "#PersonalGrowth", "#Motivation"],
    fiction: ["#Fiction", "#Story", "#Novel"]
  }

  // Add platform-specific hashtags
  hashtags.push(
    ...platformHashtags[platform].slice(0, Math.floor(config.hashtagLimit / 2))
  )

  // Add theme-based hashtags if theme is provided
  if (theme) {
    const themeKey = theme.toLowerCase().replace(/[^a-z]/g, "")
    const relevantThemeHashtags = themeHashtags[themeKey] || []
    hashtags.push(...relevantThemeHashtags.slice(0, 2))
  }

  // Ensure we don't exceed platform limits
  return hashtags.slice(0, config.hashtagLimit)
}

/**
 * Validate post content against platform constraints
 */
export function validatePost(
  content: string,
  hashtags: string[],
  platform: Platform
): {
  isValid: boolean
  errors: string[]
  characterCount: number
} {
  const config = PLATFORM_CONFIGS[platform]
  const errors: string[] = []

  // Calculate total character count including hashtags
  const hashtagText = hashtags.length > 0 ? " " + hashtags.join(" ") : ""
  const totalContent = content + hashtagText
  const characterCount = totalContent.length

  // Check character limit
  if (characterCount > config.maxLength) {
    errors.push(
      `Content exceeds ${config.maxLength} character limit (${characterCount} characters)`
    )
  }

  // Check hashtag limit
  if (hashtags.length > config.hashtagLimit) {
    errors.push(`Too many hashtags (${hashtags.length}/${config.hashtagLimit})`)
  }

  // Platform-specific validation
  if (platform === "twitter" && content.length === 0) {
    errors.push("Twitter posts cannot be empty")
  }

  if (platform === "linkedin" && content.length < 10) {
    errors.push("LinkedIn posts should be at least 10 characters")
  }

  return {
    isValid: errors.length === 0,
    errors,
    characterCount
  }
}

/**
 * Generate image suggestions for posts using advanced image suggestion engine
 */
export function generateImageSuggestion(
  content: string,
  sourceType: ContentVariation["sourceType"],
  platform: Platform,
  bookTitle: string,
  bookAnalysis?: BookAnalysisResult
): string {
  // Provide default if sourceType is undefined
  const safeSourceType = sourceType || "summary"
  
  if (bookAnalysis) {
    const suggestions = ImageSuggestionEngine.generateImageSuggestions(
      content,
      platform,
      safeSourceType,
      bookTitle,
      bookAnalysis.genre,
      bookAnalysis.themes
    )

    if (suggestions.length > 0) {
      return ImageSuggestionEngine.generateImageUrl(suggestions[0], content)
    }
  }

  // Fallback to simple image generation
  const imageTypes = {
    quote: "quote-graphic",
    insight: "lightbulb-concept",
    theme: "abstract-concept",
    summary: "book-cover",
    discussion: "conversation-bubble"
  }

  return `/api/images/generate?type=${imageTypes[safeSourceType]}&content=${encodeURIComponent(content.slice(0, 100))}`
}

/**
 * Generate platform-specific content for quotes
 */
async function generateQuoteContent(
  quote: string,
  bookTitle: string,
  author: string | undefined,
  platforms: Platform[],
  variationsCount: number,
  tone: string,
  maxRetries: number,
  bookAnalysis: BookAnalysisResult,
  locale: string = 'en'
): Promise<ContentVariation[]> {
  const variations: ContentVariation[] = []

  for (let i = 0; i < variationsCount; i++) {
    const posts: GeneratedPost[] = []

    for (const platform of platforms) {
      const config = PLATFORM_CONFIGS[platform]

      try {
        const localeInstruction = getLocaleInstruction(locale)
        
        const prompt = `Create a ${tone} social media post for ${config.name} featuring this quote from "${bookTitle}"${author ? ` by ${author}` : ""}. ${localeInstruction}

"${quote}"

Requirements:
- Maximum ${config.maxLength} characters including hashtags
- ${tone} tone
- Engaging and shareable
- Include attribution to the book
- Variation ${i + 1} of ${variationsCount}

Format: Just return the post content, no quotes or extra formatting.`

        const client = ensureServerSide('generateQuotePosts')
        const response = await client.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.7 + i * 0.1 // Increase variation
        })

        const content = response.choices[0]?.message?.content?.trim() || ""
        const hashtags = generateHashtags(
          content,
          platform,
          bookTitle,
          author,
          "quote",
          bookAnalysis,
          "quote"
        )
        const validation = validatePost(content, hashtags, platform)

        const post: GeneratedPost = {
          platform,
          content,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        }
        
        // Calculate engagement potential
        post.engagementPotential = calculateEngagementPotential(post)
        
        posts.push(post)
      } catch (error) {
        console.error(`Failed to generate ${platform} quote content:`, error)
        // Create fallback content
        const fallbackContent = `"${quote.slice(0, 100)}${quote.length > 100 ? "..." : ""}" - ${bookTitle}${author ? ` by ${author}` : ""}`
        const hashtags = generateHashtags(
          fallbackContent,
          platform,
          bookTitle,
          author,
          "quote",
          undefined,
          "quote"
        )
        const validation = validatePost(fallbackContent, hashtags, platform)

        const post: GeneratedPost = {
          platform,
          content: fallbackContent,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        }
        
        // Calculate engagement potential
        post.engagementPotential = calculateEngagementPotential(post)
        
        posts.push(post)
      }
    }

    variations.push({
      id: `quote-${Date.now()}-${i}`,
      posts,
      theme: "Quote",
      sourceType: "quote",
      sourceContent: quote
    })
  }

  return variations
}

/**
 * Generate platform-specific content for insights
 */
async function generateInsightContent(
  insight: string,
  bookTitle: string,
  author: string | undefined,
  platforms: Platform[],
  variationsCount: number,
  tone: string,
  maxRetries: number,
  bookAnalysis: BookAnalysisResult,
  locale: string = 'en'
): Promise<ContentVariation[]> {
  const variations: ContentVariation[] = []

  for (let i = 0; i < variationsCount; i++) {
    const posts: GeneratedPost[] = []

    for (const platform of platforms) {
      const config = PLATFORM_CONFIGS[platform]

      try {
        const localeInstruction = getLocaleInstruction(locale)
        
        const prompt = `Create a ${tone} social media post for ${config.name} about this key insight from "${bookTitle}"${author ? ` by ${author}` : ""}. ${localeInstruction}

${insight}

Requirements:
- Maximum ${config.maxLength} characters including hashtags
- ${tone} tone
- Make it actionable and thought-provoking
- Reference the book as the source
- Variation ${i + 1} of ${variationsCount}

Format: Just return the post content, no quotes or extra formatting.`

        const client = ensureServerSide('generateInsightPosts')
        const response = await client.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 250,
          temperature: 0.7 + i * 0.1
        })

        const content = response.choices[0]?.message?.content?.trim() || ""
        const hashtags = generateHashtags(
          content,
          platform,
          bookTitle,
          author,
          "insight",
          bookAnalysis,
          "insight"
        )
        const validation = validatePost(content, hashtags, platform)

        const post: GeneratedPost = {
          platform,
          content,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        }
        
        // Calculate engagement potential
        post.engagementPotential = calculateEngagementPotential(post)
        
        posts.push(post)
      } catch (error) {
        console.error(`Failed to generate ${platform} insight content:`, error)
        // Create fallback content
        const fallbackContent = `Key insight from ${bookTitle}: ${insight.slice(0, 150)}${insight.length > 150 ? "..." : ""}`
        const hashtags = generateHashtags(
          fallbackContent,
          platform,
          bookTitle,
          author,
          "insight",
          bookAnalysis,
          "insight"
        )
        const validation = validatePost(fallbackContent, hashtags, platform)

        const post: GeneratedPost = {
          platform,
          content: fallbackContent,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        }
        
        // Calculate engagement potential
        post.engagementPotential = calculateEngagementPotential(post)
        
        posts.push(post)
      }
    }

    variations.push({
      id: `insight-${Date.now()}-${i}`,
      posts,
      theme: "Key Insight",
      sourceType: "insight",
      sourceContent: insight
    })
  }

  return variations
}

/**
 * Generate platform-specific content for themes
 */
async function generateThemeContent(
  theme: string,
  bookTitle: string,
  author: string | undefined,
  platforms: Platform[],
  variationsCount: number,
  tone: string,
  maxRetries: number,
  bookAnalysis: BookAnalysisResult,
  locale: string = 'en'
): Promise<ContentVariation[]> {
  const variations: ContentVariation[] = []

  for (let i = 0; i < variationsCount; i++) {
    const posts: GeneratedPost[] = []

    for (const platform of platforms) {
      const config = PLATFORM_CONFIGS[platform]

      try {
        const localeInstruction = getLocaleInstruction(locale)
        
        const prompt = `Create a ${tone} social media post for ${config.name} about the theme "${theme}" from the book "${bookTitle}"${author ? ` by ${author}` : ""}. ${localeInstruction}

Requirements:
- Maximum ${config.maxLength} characters including hashtags
- ${tone} tone
- Discuss how this theme relates to readers' lives
- Reference the book as exploring this theme
- Variation ${i + 1} of ${variationsCount}

Format: Just return the post content, no quotes or extra formatting.`

        const client = ensureServerSide('generateThemePosts')
        const response = await client.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 250,
          temperature: 0.7 + i * 0.1
        })

        const content = response.choices[0]?.message?.content?.trim() || ""
        const hashtags = generateHashtags(
          content,
          platform,
          bookTitle,
          author,
          theme,
          bookAnalysis,
          "theme"
        )
        const validation = validatePost(content, hashtags, platform)

        const post: GeneratedPost = {
          platform,
          content,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        }
        
        // Calculate engagement potential
        post.engagementPotential = calculateEngagementPotential(post)
        
        posts.push(post)
      } catch (error) {
        console.error(`Failed to generate ${platform} theme content:`, error)
        // Create fallback content
        const fallbackContent = `Exploring the theme of ${theme} in ${bookTitle}${author ? ` by ${author}` : ""}. What are your thoughts on this topic?`
        const hashtags = generateHashtags(
          fallbackContent,
          platform,
          bookTitle,
          author,
          theme,
          bookAnalysis,
          "theme"
        )
        const validation = validatePost(fallbackContent, hashtags, platform)

        const post: GeneratedPost = {
          platform,
          content: fallbackContent,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        }
        
        // Calculate engagement potential
        post.engagementPotential = calculateEngagementPotential(post)
        
        posts.push(post)
      }
    }

    variations.push({
      id: `theme-${Date.now()}-${i}`,
      posts,
      theme: theme,
      sourceType: "theme",
      sourceContent: theme
    })
  }

  return variations
}

/**
 * Generate platform-specific content for summaries
 */
async function generateSummaryContent(
  summary: string,
  bookTitle: string,
  author: string | undefined,
  platforms: Platform[],
  variationsCount: number,
  tone: string,
  maxRetries: number,
  bookAnalysis: BookAnalysisResult,
  locale: string = 'en'
): Promise<ContentVariation[]> {
  const variations: ContentVariation[] = []

  for (let i = 0; i < variationsCount; i++) {
    const posts: GeneratedPost[] = []

    for (const platform of platforms) {
      const config = PLATFORM_CONFIGS[platform]

      try {
        const localeInstruction = getLocaleInstruction(locale)
        
        const prompt = `Create a ${tone} social media post for ${config.name} summarizing "${bookTitle}"${author ? ` by ${author}` : ""}. ${localeInstruction}

Book summary: ${summary}

Requirements:
- Maximum ${config.maxLength} characters including hashtags
- ${tone} tone
- Make it compelling and encourage others to read the book
- Include a brief recommendation
- Variation ${i + 1} of ${variationsCount}

Format: Just return the post content, no quotes or extra formatting.`

        const client = ensureServerSide('generateSummaryPosts')
        const response = await client.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
          temperature: 0.7 + i * 0.1
        })

        const content = response.choices[0]?.message?.content?.trim() || ""
        const hashtags = generateHashtags(
          content,
          platform,
          bookTitle,
          author,
          "summary",
          bookAnalysis,
          "summary"
        )
        const validation = validatePost(content, hashtags, platform)

        const post: GeneratedPost = {
          platform,
          content,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        }
        
        // Calculate engagement potential
        post.engagementPotential = calculateEngagementPotential(post)
        
        posts.push(post)
      } catch (error) {
        console.error(`Failed to generate ${platform} summary content:`, error)
        // Create fallback content
        const fallbackContent = `Just finished reading ${bookTitle}${author ? ` by ${author}` : ""}. ${summary.slice(0, 100)}${summary.length > 100 ? "..." : ""} Highly recommend!`
        const hashtags = generateHashtags(
          fallbackContent,
          platform,
          bookTitle,
          author,
          "summary",
          bookAnalysis,
          "summary"
        )
        const validation = validatePost(fallbackContent, hashtags, platform)

        const post: GeneratedPost = {
          platform,
          content: fallbackContent,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        }
        
        // Calculate engagement potential
        post.engagementPotential = calculateEngagementPotential(post)
        
        posts.push(post)
      }
    }

    variations.push({
      id: `summary-${Date.now()}-${i}`,
      posts,
      theme: "Book Summary",
      sourceType: "summary",
      sourceContent: summary
    })
  }

  return variations
}

/**
 * Generate platform-specific content for discussion points
 */
async function generateDiscussionContent(
  discussionPoint: string,
  bookTitle: string,
  author: string | undefined,
  platforms: Platform[],
  variationsCount: number,
  tone: string,
  maxRetries: number,
  bookAnalysis: BookAnalysisResult,
  locale: string = 'en'
): Promise<ContentVariation[]> {
  const variations: ContentVariation[] = []

  for (let i = 0; i < variationsCount; i++) {
    const posts: GeneratedPost[] = []

    for (const platform of platforms) {
      const config = PLATFORM_CONFIGS[platform]

      try {
        const localeInstruction = getLocaleInstruction(locale)
        
        const prompt = `Create a ${tone} social media post for ${config.name} that starts a discussion about this point from "${bookTitle}"${author ? ` by ${author}` : ""}. ${localeInstruction}

${discussionPoint}

Requirements:
- Maximum ${config.maxLength} characters including hashtags
- ${tone} tone
- End with a question to encourage engagement
- Reference the book as the source of this discussion point
- Variation ${i + 1} of ${variationsCount}

Format: Just return the post content, no quotes or extra formatting.`

        const client = ensureServerSide('generateDiscussionPosts')
        const response = await client.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 250,
          temperature: 0.7 + i * 0.1
        })

        const content = response.choices[0]?.message?.content?.trim() || ""
        const hashtags = generateHashtags(
          content,
          platform,
          bookTitle,
          author,
          "discussion",
          bookAnalysis,
          "discussion"
        )
        const validation = validatePost(content, hashtags, platform)

        const post: GeneratedPost = {
          platform,
          content,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        }
        
        // Calculate engagement potential
        post.engagementPotential = calculateEngagementPotential(post)
        
        posts.push(post)
      } catch (error) {
        console.error(
          `Failed to generate ${platform} discussion content:`,
          error
        )
        // Create fallback content
        const fallbackContent = `${discussionPoint} - from ${bookTitle}${author ? ` by ${author}` : ""}. What do you think about this?`
        const hashtags = generateHashtags(
          fallbackContent,
          platform,
          bookTitle,
          author,
          "discussion",
          bookAnalysis,
          "discussion"
        )
        const validation = validatePost(fallbackContent, hashtags, platform)

        const post: GeneratedPost = {
          platform,
          content: fallbackContent,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        }
        
        // Calculate engagement potential
        post.engagementPotential = calculateEngagementPotential(post)
        
        posts.push(post)
      }
    }

    variations.push({
      id: `discussion-${Date.now()}-${i}`,
      posts,
      theme: "Discussion",
      sourceType: "discussion",
      sourceContent: discussionPoint
    })
  }

  return variations
}

/**
 * Main function to generate social media content from book analysis
 */
/**
 * Generate targeted content from a specific source (theme, quote, or insight)
 * This function enables the Content Workshop "interactive laboratory" experience
 */
export async function generatePlatformContent(
  sourceType: 'theme' | 'quote' | 'insight',
  sourceContent: string,
  platform: Platform,
  bookContext: BookAnalysisResult,
  bookTitle: string,
  author?: string,
  options: {
    variationsCount?: number,
    tone?: "professional" | "casual" | "inspirational" | "educational",
    includeImages?: boolean,
    locale?: string,
    maxRetries?: number
  } = {}
): Promise<ContentVariation[]> {
  const {
    variationsCount = 3, // Generate multiple variations for "Generate More" functionality
    tone = "professional",
    includeImages = true,
    locale = 'en',
    maxRetries = 2
  } = options

  try {
    console.log(`Generating ${variationsCount} variations for ${sourceType}: ${sourceContent.substring(0, 50)}...`)

    const variations: ContentVariation[] = []

    // Generate multiple variations based on source type
    for (let i = 0; i < variationsCount; i++) {
      let contentVariations: ContentVariation[]

      switch (sourceType) {
        case 'quote':
          contentVariations = await generateQuoteContent(
            sourceContent,
            bookTitle,
            author,
            [platform], // Single platform for targeted generation
            1, // Single variation per call
            tone,
            maxRetries,
            bookContext,
            locale
          )
          break

        case 'insight':
          contentVariations = await generateInsightContent(
            sourceContent,
            bookTitle,
            author,
            [platform],
            1,
            tone,
            maxRetries,
            bookContext,
            locale
          )
          break

        case 'theme':
          contentVariations = await generateThemeContent(
            sourceContent,
            bookTitle,
            author,
            [platform],
            1,
            tone,
            maxRetries,
            bookContext,
            locale
          )
          break

        default:
          throw new Error(`Unsupported source type: ${sourceType}`)
      }

      variations.push(...contentVariations)
    }

    // Add image suggestions if requested
    if (includeImages) {
      variations.forEach(variation => {
        if (variation.posts && Array.isArray(variation.posts)) {
          variation.posts.forEach(post => {
            if (PLATFORM_CONFIGS[post.platform].imageSupported) {
              post.imageUrl = generateImageSuggestion(
                post.content,
                variation.sourceType,
                post.platform,
                bookTitle,
                bookContext
              )
            }
          })
        }
      })
    }

    console.log(`Successfully generated ${variations.length} targeted content variations`)
    return variations

  } catch (error) {
    console.error("Targeted content generation failed:", error)
    throw new Error(
      `Failed to generate platform content: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

export async function generateSocialContent(
  bookAnalysis: BookAnalysisResult,
  bookTitle: string,
  bookId: string,
  userId: string,
  author?: string,
  options: ContentGenerationOptions = {}
): Promise<ContentVariation[]> {
  const {
    platforms = ["twitter", "instagram", "linkedin", "facebook"],
    variationsPerTheme = 1, // Reduced from 2 to 1 for faster generation
    includeImages = true,
    tone = "professional",
    maxRetries = 2,
    locale = 'en'
  } = options

  try {
    // Check cache first
    const cached = await getCachedGeneratedContent(bookId, userId)
    if (cached) {
      console.log("Returning cached generated content for book:", bookId)
      return cached
    }

    console.log("Generating new content for book:", bookId)
    const variations: ContentVariation[] = []

    // Generate content from quotes (reduced from 5 to 1)
    for (const quote of bookAnalysis.quotes.slice(0, 1)) {
      const quoteVariations = await generateQuoteContent(
        quote,
        bookTitle,
        author,
        platforms,
        variationsPerTheme,
        tone,
        maxRetries,
        bookAnalysis,
        locale
      )
      variations.push(...quoteVariations)
    }

    // Generate content from key insights (reduced from 3 to 1)
    for (const insight of bookAnalysis.keyInsights.slice(0, 1)) {
      const insightVariations = await generateInsightContent(
        insight,
        bookTitle,
        author,
        platforms,
        variationsPerTheme,
        tone,
        maxRetries,
        bookAnalysis,
        locale
      )
      variations.push(...insightVariations)
    }

    // Generate content from themes (reduced from 3 to 1)
    for (const theme of bookAnalysis.themes.slice(0, 1)) {
      const themeVariations = await generateThemeContent(
        theme,
        bookTitle,
        author,
        platforms,
        variationsPerTheme,
        tone,
        maxRetries,
        bookAnalysis,
        locale
      )
      variations.push(...themeVariations)
    }

    // Generate content from overall summary only if we have few platforms (for optimization)
    if (bookAnalysis.overallSummary && platforms.length <= 2) {
      const summaryVariations = await generateSummaryContent(
        bookAnalysis.overallSummary,
        bookTitle,
        author,
        platforms,
        variationsPerTheme,
        tone,
        maxRetries,
        bookAnalysis,
        locale
      )
      variations.push(...summaryVariations)
    }

    // Skip discussion points generation to speed up the process
    // Discussion points are often the most time-consuming to generate

    // Add image suggestions if requested
    if (includeImages) {
      variations.forEach(variation => {
        if (variation.posts && Array.isArray(variation.posts)) {
          variation.posts.forEach(post => {
            if (PLATFORM_CONFIGS[post.platform].imageSupported) {
              post.imageUrl = generateImageSuggestion(
                post.content,
                variation.sourceType,
                post.platform,
                bookTitle,
                bookAnalysis
              )
            }
          })
        }
      })
    }

    // Cache the result
    await cacheGeneratedContent(bookId, userId, variations)
    
    // We won't save to database here - this should be done in the API handler
    // The content generation function should focus only on generating content
    // Database operations are done in the API route to avoid authentication issues

    return variations
  } catch (error) {
    console.error("Content generation failed:", error)
    throw new Error(
      `Failed to generate social media content: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
