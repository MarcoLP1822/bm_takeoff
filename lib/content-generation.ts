import OpenAI from 'openai'
import { BookAnalysisResult } from './ai-analysis'
import { HashtagGenerator } from './hashtag-generator'
import { ImageSuggestionEngine } from './image-suggestions'
import { getCachedGeneratedContent, cacheGeneratedContent } from './cache-service'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'test-key',
  dangerouslyAllowBrowser: process.env.NODE_ENV === 'test'
})

// Platform-specific configuration
export const PLATFORM_CONFIGS = {
  twitter: {
    maxLength: 280,
    hashtagLimit: 5,
    imageSupported: true,
    name: 'Twitter/X'
  },
  instagram: {
    maxLength: 2200,
    hashtagLimit: 30,
    imageSupported: true,
    name: 'Instagram'
  },
  linkedin: {
    maxLength: 3000,
    hashtagLimit: 10,
    imageSupported: true,
    name: 'LinkedIn'
  },
  facebook: {
    maxLength: 63206,
    hashtagLimit: 10,
    imageSupported: true,
    name: 'Facebook'
  }
} as const

export type Platform = keyof typeof PLATFORM_CONFIGS

export interface GeneratedPost {
  platform: Platform
  content: string
  hashtags: string[]
  imageUrl?: string
  characterCount: number
  isValid: boolean
  validationErrors: string[]
}

export interface ContentVariation {
  id: string
  posts: GeneratedPost[]
  theme: string
  sourceType: 'quote' | 'insight' | 'theme' | 'summary' | 'discussion'
  sourceContent: string
}

export interface ContentGenerationOptions {
  platforms?: Platform[]
  variationsPerTheme?: number
  includeImages?: boolean
  tone?: 'professional' | 'casual' | 'inspirational' | 'educational'
  maxRetries?: number
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
  contentType: 'quote' | 'insight' | 'theme' | 'summary' | 'discussion' = 'quote'
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
  const cleanTitle = bookTitle.replace(/[^a-zA-Z0-9]/g, '')
  if (cleanTitle.length > 0) {
    hashtags.push(`#${cleanTitle}`)
  }
  
  if (author) {
    const cleanAuthor = author.replace(/[^a-zA-Z0-9]/g, '')
    if (cleanAuthor.length > 0) {
      hashtags.push(`#${cleanAuthor}`)
    }
  }
  
  // Platform-specific hashtags
  const platformHashtags = {
    twitter: ['#BookQuote', '#Reading', '#BookLovers', '#Inspiration', '#Wisdom'],
    instagram: ['#bookstagram', '#bookquote', '#reading', '#booklovers', '#inspiration', '#wisdom', '#literature', '#bookclub', '#readingcommunity', '#bookish'],
    linkedin: ['#Leadership', '#PersonalDevelopment', '#BookRecommendation', '#ProfessionalGrowth', '#Learning'],
    facebook: ['#BookClub', '#Reading', '#BookRecommendation', '#Literature', '#Inspiration']
  }
  
  // Theme-based hashtags
  const themeHashtags: Record<string, string[]> = {
    leadership: ['#Leadership', '#Management', '#Success'],
    love: ['#Love', '#Relationships', '#Romance'],
    adventure: ['#Adventure', '#Journey', '#Exploration'],
    mystery: ['#Mystery', '#Thriller', '#Suspense'],
    science: ['#Science', '#Knowledge', '#Discovery'],
    history: ['#History', '#Historical', '#Past'],
    philosophy: ['#Philosophy', '#Wisdom', '#Thinking'],
    business: ['#Business', '#Entrepreneurship', '#Success'],
    selfhelp: ['#SelfHelp', '#PersonalGrowth', '#Motivation'],
    fiction: ['#Fiction', '#Story', '#Novel']
  }
  
  // Add platform-specific hashtags
  hashtags.push(...platformHashtags[platform].slice(0, Math.floor(config.hashtagLimit / 2)))
  
  // Add theme-based hashtags if theme is provided
  if (theme) {
    const themeKey = theme.toLowerCase().replace(/[^a-z]/g, '')
    const relevantThemeHashtags = themeHashtags[themeKey] || []
    hashtags.push(...relevantThemeHashtags.slice(0, 2))
  }
  
  // Ensure we don't exceed platform limits
  return hashtags.slice(0, config.hashtagLimit)
}

/**
 * Validate post content against platform constraints
 */
export function validatePost(content: string, hashtags: string[], platform: Platform): {
  isValid: boolean
  errors: string[]
  characterCount: number
} {
  const config = PLATFORM_CONFIGS[platform]
  const errors: string[] = []
  
  // Calculate total character count including hashtags
  const hashtagText = hashtags.length > 0 ? ' ' + hashtags.join(' ') : ''
  const totalContent = content + hashtagText
  const characterCount = totalContent.length
  
  // Check character limit
  if (characterCount > config.maxLength) {
    errors.push(`Content exceeds ${config.maxLength} character limit (${characterCount} characters)`)
  }
  
  // Check hashtag limit
  if (hashtags.length > config.hashtagLimit) {
    errors.push(`Too many hashtags (${hashtags.length}/${config.hashtagLimit})`)
  }
  
  // Platform-specific validation
  if (platform === 'twitter' && content.length === 0) {
    errors.push('Twitter posts cannot be empty')
  }
  
  if (platform === 'linkedin' && content.length < 10) {
    errors.push('LinkedIn posts should be at least 10 characters')
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
  sourceType: ContentVariation['sourceType'],
  platform: Platform,
  bookTitle: string,
  bookAnalysis?: BookAnalysisResult
): string {
  if (bookAnalysis) {
    const suggestions = ImageSuggestionEngine.generateImageSuggestions(
      content,
      platform,
      sourceType,
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
    quote: 'quote-graphic',
    insight: 'lightbulb-concept',
    theme: 'abstract-concept',
    summary: 'book-cover',
    discussion: 'conversation-bubble'
  }
  
  return `/api/images/generate?type=${imageTypes[sourceType]}&content=${encodeURIComponent(content.slice(0, 100))}`
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
  bookAnalysis: BookAnalysisResult
): Promise<ContentVariation[]> {
  const variations: ContentVariation[] = []
  
  for (let i = 0; i < variationsCount; i++) {
    const posts: GeneratedPost[] = []
    
    for (const platform of platforms) {
      const config = PLATFORM_CONFIGS[platform]
      
      try {
        const prompt = `Create a ${tone} social media post for ${config.name} featuring this quote from "${bookTitle}"${author ? ` by ${author}` : ''}:

"${quote}"

Requirements:
- Maximum ${config.maxLength} characters including hashtags
- ${tone} tone
- Engaging and shareable
- Include attribution to the book
- Variation ${i + 1} of ${variationsCount}

Format: Just return the post content, no quotes or extra formatting.`

        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.7 + (i * 0.1) // Increase variation
        })
        
        const content = response.choices[0]?.message?.content?.trim() || ''
        const hashtags = generateHashtags(content, platform, bookTitle, author, 'quote', bookAnalysis, 'quote')
        const validation = validatePost(content, hashtags, platform)
        
        posts.push({
          platform,
          content,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        })
        
      } catch (error) {
        console.error(`Failed to generate ${platform} quote content:`, error)
        // Create fallback content
        const fallbackContent = `"${quote.slice(0, 100)}${quote.length > 100 ? '...' : ''}" - ${bookTitle}${author ? ` by ${author}` : ''}`
        const hashtags = generateHashtags(fallbackContent, platform, bookTitle, author, 'quote', undefined, 'quote')
        const validation = validatePost(fallbackContent, hashtags, platform)
        
        posts.push({
          platform,
          content: fallbackContent,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        })
      }
    }
    
    variations.push({
      id: `quote-${Date.now()}-${i}`,
      posts,
      theme: 'Quote',
      sourceType: 'quote',
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
  bookAnalysis: BookAnalysisResult
): Promise<ContentVariation[]> {
  const variations: ContentVariation[] = []
  
  for (let i = 0; i < variationsCount; i++) {
    const posts: GeneratedPost[] = []
    
    for (const platform of platforms) {
      const config = PLATFORM_CONFIGS[platform]
      
      try {
        const prompt = `Create a ${tone} social media post for ${config.name} about this key insight from "${bookTitle}"${author ? ` by ${author}` : ''}:

${insight}

Requirements:
- Maximum ${config.maxLength} characters including hashtags
- ${tone} tone
- Make it actionable and thought-provoking
- Reference the book as the source
- Variation ${i + 1} of ${variationsCount}

Format: Just return the post content, no quotes or extra formatting.`

        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 250,
          temperature: 0.7 + (i * 0.1)
        })
        
        const content = response.choices[0]?.message?.content?.trim() || ''
        const hashtags = generateHashtags(content, platform, bookTitle, author, 'insight', bookAnalysis, 'insight')
        const validation = validatePost(content, hashtags, platform)
        
        posts.push({
          platform,
          content,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        })
        
      } catch (error) {
        console.error(`Failed to generate ${platform} insight content:`, error)
        // Create fallback content
        const fallbackContent = `Key insight from ${bookTitle}: ${insight.slice(0, 150)}${insight.length > 150 ? '...' : ''}`
        const hashtags = generateHashtags(fallbackContent, platform, bookTitle, author, 'insight', bookAnalysis, 'insight')
        const validation = validatePost(fallbackContent, hashtags, platform)
        
        posts.push({
          platform,
          content: fallbackContent,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        })
      }
    }
    
    variations.push({
      id: `insight-${Date.now()}-${i}`,
      posts,
      theme: 'Key Insight',
      sourceType: 'insight',
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
  bookAnalysis: BookAnalysisResult
): Promise<ContentVariation[]> {
  const variations: ContentVariation[] = []
  
  for (let i = 0; i < variationsCount; i++) {
    const posts: GeneratedPost[] = []
    
    for (const platform of platforms) {
      const config = PLATFORM_CONFIGS[platform]
      
      try {
        const prompt = `Create a ${tone} social media post for ${config.name} about the theme "${theme}" from the book "${bookTitle}"${author ? ` by ${author}` : ''}:

Requirements:
- Maximum ${config.maxLength} characters including hashtags
- ${tone} tone
- Discuss how this theme relates to readers' lives
- Reference the book as exploring this theme
- Variation ${i + 1} of ${variationsCount}

Format: Just return the post content, no quotes or extra formatting.`

        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 250,
          temperature: 0.7 + (i * 0.1)
        })
        
        const content = response.choices[0]?.message?.content?.trim() || ''
        const hashtags = generateHashtags(content, platform, bookTitle, author, theme, bookAnalysis, 'theme')
        const validation = validatePost(content, hashtags, platform)
        
        posts.push({
          platform,
          content,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        })
        
      } catch (error) {
        console.error(`Failed to generate ${platform} theme content:`, error)
        // Create fallback content
        const fallbackContent = `Exploring the theme of ${theme} in ${bookTitle}${author ? ` by ${author}` : ''}. What are your thoughts on this topic?`
        const hashtags = generateHashtags(fallbackContent, platform, bookTitle, author, theme, bookAnalysis, 'theme')
        const validation = validatePost(fallbackContent, hashtags, platform)
        
        posts.push({
          platform,
          content: fallbackContent,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        })
      }
    }
    
    variations.push({
      id: `theme-${Date.now()}-${i}`,
      posts,
      theme: theme,
      sourceType: 'theme',
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
  bookAnalysis: BookAnalysisResult
): Promise<ContentVariation[]> {
  const variations: ContentVariation[] = []
  
  for (let i = 0; i < variationsCount; i++) {
    const posts: GeneratedPost[] = []
    
    for (const platform of platforms) {
      const config = PLATFORM_CONFIGS[platform]
      
      try {
        const prompt = `Create a ${tone} social media post for ${config.name} summarizing "${bookTitle}"${author ? ` by ${author}` : ''}:

Book summary: ${summary}

Requirements:
- Maximum ${config.maxLength} characters including hashtags
- ${tone} tone
- Make it compelling and encourage others to read the book
- Include a brief recommendation
- Variation ${i + 1} of ${variationsCount}

Format: Just return the post content, no quotes or extra formatting.`

        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.7 + (i * 0.1)
        })
        
        const content = response.choices[0]?.message?.content?.trim() || ''
        const hashtags = generateHashtags(content, platform, bookTitle, author, 'summary', bookAnalysis, 'summary')
        const validation = validatePost(content, hashtags, platform)
        
        posts.push({
          platform,
          content,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        })
        
      } catch (error) {
        console.error(`Failed to generate ${platform} summary content:`, error)
        // Create fallback content
        const fallbackContent = `Just finished reading ${bookTitle}${author ? ` by ${author}` : ''}. ${summary.slice(0, 100)}${summary.length > 100 ? '...' : ''} Highly recommend!`
        const hashtags = generateHashtags(fallbackContent, platform, bookTitle, author, 'summary', bookAnalysis, 'summary')
        const validation = validatePost(fallbackContent, hashtags, platform)
        
        posts.push({
          platform,
          content: fallbackContent,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        })
      }
    }
    
    variations.push({
      id: `summary-${Date.now()}-${i}`,
      posts,
      theme: 'Book Summary',
      sourceType: 'summary',
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
  bookAnalysis: BookAnalysisResult
): Promise<ContentVariation[]> {
  const variations: ContentVariation[] = []
  
  for (let i = 0; i < variationsCount; i++) {
    const posts: GeneratedPost[] = []
    
    for (const platform of platforms) {
      const config = PLATFORM_CONFIGS[platform]
      
      try {
        const prompt = `Create a ${tone} social media post for ${config.name} that starts a discussion about this point from "${bookTitle}"${author ? ` by ${author}` : ''}:

${discussionPoint}

Requirements:
- Maximum ${config.maxLength} characters including hashtags
- ${tone} tone
- End with a question to encourage engagement
- Reference the book as the source of this discussion point
- Variation ${i + 1} of ${variationsCount}

Format: Just return the post content, no quotes or extra formatting.`

        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 250,
          temperature: 0.7 + (i * 0.1)
        })
        
        const content = response.choices[0]?.message?.content?.trim() || ''
        const hashtags = generateHashtags(content, platform, bookTitle, author, 'discussion', bookAnalysis, 'discussion')
        const validation = validatePost(content, hashtags, platform)
        
        posts.push({
          platform,
          content,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        })
        
      } catch (error) {
        console.error(`Failed to generate ${platform} discussion content:`, error)
        // Create fallback content
        const fallbackContent = `${discussionPoint} - from ${bookTitle}${author ? ` by ${author}` : ''}. What do you think about this?`
        const hashtags = generateHashtags(fallbackContent, platform, bookTitle, author, 'discussion', bookAnalysis, 'discussion')
        const validation = validatePost(fallbackContent, hashtags, platform)
        
        posts.push({
          platform,
          content: fallbackContent,
          hashtags,
          characterCount: validation.characterCount,
          isValid: validation.isValid,
          validationErrors: validation.errors
        })
      }
    }
    
    variations.push({
      id: `discussion-${Date.now()}-${i}`,
      posts,
      theme: 'Discussion',
      sourceType: 'discussion',
      sourceContent: discussionPoint
    })
  }
  
  return variations
}

/**
 * Main function to generate social media content from book analysis
 */
export async function generateSocialContent(
  bookAnalysis: BookAnalysisResult,
  bookTitle: string,
  bookId: string,
  userId: string,
  author?: string,
  options: ContentGenerationOptions = {}
): Promise<ContentVariation[]> {
  const {
    platforms = ['twitter', 'instagram', 'linkedin', 'facebook'],
    variationsPerTheme = 2,
    includeImages = true,
    tone = 'inspirational',
    maxRetries = 3
  } = options

  try {
    // Check cache first
    const cached = await getCachedGeneratedContent(bookId, userId)
    if (cached) {
      console.log('Returning cached generated content for book:', bookId)
      return cached
    }

    console.log('Generating new content for book:', bookId)
    const variations: ContentVariation[] = []

    // Generate content from quotes
    for (const quote of bookAnalysis.quotes.slice(0, 5)) {
      const quoteVariations = await generateQuoteContent(
        quote,
        bookTitle,
        author,
        platforms,
        variationsPerTheme,
        tone,
        maxRetries,
        bookAnalysis
      )
      variations.push(...quoteVariations)
    }

    // Generate content from key insights
    for (const insight of bookAnalysis.keyInsights.slice(0, 3)) {
      const insightVariations = await generateInsightContent(
        insight,
        bookTitle,
        author,
        platforms,
        variationsPerTheme,
        tone,
        maxRetries,
        bookAnalysis
      )
      variations.push(...insightVariations)
    }

    // Generate content from themes
    for (const theme of bookAnalysis.themes.slice(0, 3)) {
      const themeVariations = await generateThemeContent(
        theme,
        bookTitle,
        author,
        platforms,
        variationsPerTheme,
        tone,
        maxRetries,
        bookAnalysis
      )
      variations.push(...themeVariations)
    }

    // Generate content from overall summary
    if (bookAnalysis.overallSummary) {
      const summaryVariations = await generateSummaryContent(
        bookAnalysis.overallSummary,
        bookTitle,
        author,
        platforms,
        variationsPerTheme,
        tone,
        maxRetries,
        bookAnalysis
      )
      variations.push(...summaryVariations)
    }

    // Generate content from discussion points
    for (const discussionPoint of bookAnalysis.discussionPoints.slice(0, 2)) {
      const discussionVariations = await generateDiscussionContent(
        discussionPoint,
        bookTitle,
        author,
        platforms,
        variationsPerTheme,
        tone,
        maxRetries,
        bookAnalysis
      )
      variations.push(...discussionVariations)
    }

    // Add image suggestions if requested
    if (includeImages) {
      variations.forEach(variation => {
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
      })
    }

    // Cache the result
    await cacheGeneratedContent(bookId, userId, variations)
    
    return variations

  } catch (error) {
    console.error('Content generation failed:', error)
    throw new Error(`Failed to generate social media content: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}