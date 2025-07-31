import { Platform, PLATFORM_CONFIGS } from './content-generation'
import { BookAnalysisResult } from './ai-analysis'

interface HashtagSuggestion {
  hashtag: string
  relevance: number
  category: 'book' | 'genre' | 'theme' | 'platform' | 'trending' | 'engagement'
  description?: string
}

/**
 * Advanced hashtag generation based on book analysis and platform best practices
 */
export class HashtagGenerator {
  private static readonly GENRE_HASHTAGS: Record<string, string[]> = {
    fiction: ['#Fiction', '#Novel', '#Story', '#Literature', '#BookClub'],
    nonfiction: ['#NonFiction', '#Learning', '#Knowledge', '#Education', '#Facts'],
    business: ['#Business', '#Entrepreneurship', '#Leadership', '#Success', '#Strategy'],
    selfhelp: ['#SelfHelp', '#PersonalGrowth', '#Motivation', '#SelfImprovement', '#Mindset'],
    biography: ['#Biography', '#TrueStory', '#Inspiration', '#LifeStory', '#Memoir'],
    history: ['#History', '#Historical', '#Past', '#Culture', '#Heritage'],
    science: ['#Science', '#Research', '#Discovery', '#Innovation', '#Technology'],
    philosophy: ['#Philosophy', '#Wisdom', '#Thinking', '#Ethics', '#Consciousness'],
    psychology: ['#Psychology', '#Mind', '#Behavior', '#Mental', '#Cognitive'],
    romance: ['#Romance', '#Love', '#Relationships', '#Heart', '#Passion'],
    mystery: ['#Mystery', '#Thriller', '#Suspense', '#Crime', '#Detective'],
    fantasy: ['#Fantasy', '#Magic', '#Adventure', '#Imagination', '#Epic'],
    scifi: ['#SciFi', '#ScienceFiction', '#Future', '#Space', '#Technology']
  }

  private static readonly THEME_HASHTAGS: Record<string, string[]> = {
    leadership: ['#Leadership', '#Management', '#Influence', '#Vision', '#TeamBuilding'],
    love: ['#Love', '#Relationships', '#Romance', '#Heart', '#Connection'],
    friendship: ['#Friendship', '#Loyalty', '#Trust', '#Bond', '#Support'],
    courage: ['#Courage', '#Bravery', '#Strength', '#Resilience', '#Determination'],
    growth: ['#Growth', '#Development', '#Progress', '#Evolution', '#Transformation'],
    success: ['#Success', '#Achievement', '#Goals', '#Victory', '#Excellence'],
    failure: ['#Failure', '#Learning', '#Resilience', '#Comeback', '#Lessons'],
    family: ['#Family', '#Parents', '#Children', '#Home', '#Bonds'],
    adventure: ['#Adventure', '#Journey', '#Exploration', '#Discovery', '#Quest'],
    wisdom: ['#Wisdom', '#Knowledge', '#Insight', '#Understanding', '#Truth'],
    creativity: ['#Creativity', '#Innovation', '#Art', '#Imagination', '#Inspiration'],
    justice: ['#Justice', '#Fairness', '#Rights', '#Equality', '#Truth'],
    freedom: ['#Freedom', '#Liberty', '#Independence', '#Choice', '#Rights'],
    hope: ['#Hope', '#Optimism', '#Faith', '#Belief', '#Future'],
    change: ['#Change', '#Transformation', '#Evolution', '#Progress', '#Innovation']
  }

  private static readonly PLATFORM_HASHTAGS: Record<Platform, string[]> = {
    twitter: ['#BookTwitter', '#Reading', '#BookLovers', '#BookRecommendation', '#BookQuote'],
    instagram: ['#Bookstagram', '#BookPhoto', '#BookCommunity', '#ReadingLife', '#BookAddict', '#BookBlogger', '#BookReview', '#BookLove', '#BookNerd', '#BookWorm'],
    linkedin: ['#ProfessionalReading', '#BookRecommendation', '#Leadership', '#PersonalDevelopment', '#BusinessBooks', '#Learning', '#Growth', '#Knowledge'],
    facebook: ['#BookClub', '#Reading', '#BookDiscussion', '#BookRecommendation', '#Literature', '#BookLovers']
  }

  private static readonly ENGAGEMENT_HASHTAGS: Record<Platform, string[]> = {
    twitter: ['#BookChat', '#ReadingGoals', '#BookTalk', '#BookThread', '#BookDiscussion'],
    instagram: ['#BookChallenge', '#ReadingGoals', '#BookClub', '#BookRecommendations', '#BookCommunity'],
    linkedin: ['#BookInsights', '#ProfessionalGrowth', '#LeadershipLessons', '#BusinessWisdom', '#CareerDevelopment'],
    facebook: ['#BookDiscussion', '#ReadingGroup', '#BookClub', '#BookTalk', '#BookRecommendations']
  }

  /**
   * Generate hashtags based on book analysis and platform
   */
  static generateHashtags(
    bookAnalysis: BookAnalysisResult,
    bookTitle: string,
    author: string | undefined,
    platform: Platform,
    contentType: 'quote' | 'insight' | 'theme' | 'summary' | 'discussion' = 'quote'
  ): HashtagSuggestion[] {
    const suggestions: HashtagSuggestion[] = []
    const config = PLATFORM_CONFIGS[platform]

    // Book-specific hashtags
    suggestions.push(...this.generateBookHashtags(bookTitle, author))

    // Genre-based hashtags
    suggestions.push(...this.generateGenreHashtags(bookAnalysis.genre))

    // Theme-based hashtags
    suggestions.push(...this.generateThemeHashtags(bookAnalysis.themes))

    // Platform-specific hashtags
    suggestions.push(...this.generatePlatformHashtags(platform))

    // Content type specific hashtags
    suggestions.push(...this.generateContentTypeHashtags(contentType, platform))

    // Engagement hashtags
    suggestions.push(...this.generateEngagementHashtags(platform))

    // Sort by relevance and limit to platform constraints
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, config.hashtagLimit)
  }

  /**
   * Generate book-specific hashtags
   */
  private static generateBookHashtags(bookTitle: string, author?: string): HashtagSuggestion[] {
    const suggestions: HashtagSuggestion[] = []

    // Clean title for hashtag
    const cleanTitle = bookTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '')
    if (cleanTitle.length > 0 && cleanTitle.length <= 30) {
      suggestions.push({
        hashtag: `#${cleanTitle}`,
        relevance: 0.9,
        category: 'book',
        description: 'Book title hashtag'
      })
    }

    // Author hashtag
    if (author) {
      const cleanAuthor = author.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '')
      if (cleanAuthor.length > 0 && cleanAuthor.length <= 30) {
        suggestions.push({
          hashtag: `#${cleanAuthor}`,
          relevance: 0.8,
          category: 'book',
          description: 'Author hashtag'
        })
      }
    }

    return suggestions
  }

  /**
   * Generate genre-based hashtags
   */
  private static generateGenreHashtags(genre: string): HashtagSuggestion[] {
    const suggestions: HashtagSuggestion[] = []
    
    if (!genre) {
      return suggestions
    }
    
    const genreKey = genre.toLowerCase().replace(/[^a-z]/g, '')
    const genreHashtags = this.GENRE_HASHTAGS[genreKey] || []

    genreHashtags.forEach((hashtag, index) => {
      suggestions.push({
        hashtag,
        relevance: 0.7 - (index * 0.1),
        category: 'genre',
        description: `Genre-specific hashtag for ${genre}`
      })
    })

    return suggestions
  }

  /**
   * Generate theme-based hashtags
   */
  private static generateThemeHashtags(themes: string[]): HashtagSuggestion[] {
    const suggestions: HashtagSuggestion[] = []

    themes.slice(0, 3).forEach((theme, themeIndex) => {
      const themeKey = theme.toLowerCase().replace(/[^a-z]/g, '')
      const themeHashtags = this.THEME_HASHTAGS[themeKey] || []

      themeHashtags.slice(0, 2).forEach((hashtag, index) => {
        suggestions.push({
          hashtag,
          relevance: 0.6 - (themeIndex * 0.1) - (index * 0.05),
          category: 'theme',
          description: `Theme-based hashtag for ${theme}`
        })
      })
    })

    return suggestions
  }

  /**
   * Generate platform-specific hashtags
   */
  private static generatePlatformHashtags(platform: Platform): HashtagSuggestion[] {
    const suggestions: HashtagSuggestion[] = []
    const platformHashtags = this.PLATFORM_HASHTAGS[platform] || []

    platformHashtags.forEach((hashtag, index) => {
      suggestions.push({
        hashtag,
        relevance: 0.5 - (index * 0.05),
        category: 'platform',
        description: `Platform-optimized hashtag for ${platform}`
      })
    })

    return suggestions
  }

  /**
   * Generate content type specific hashtags
   */
  private static generateContentTypeHashtags(
    contentType: 'quote' | 'insight' | 'theme' | 'summary' | 'discussion',
    platform: Platform
  ): HashtagSuggestion[] {
    const suggestions: HashtagSuggestion[] = []

    const contentTypeHashtags: Record<string, string[]> = {
      quote: ['#BookQuote', '#Quote', '#Wisdom', '#Inspiration'],
      insight: ['#BookInsight', '#Insight', '#Learning', '#Knowledge'],
      theme: ['#BookTheme', '#Analysis', '#Literature', '#Meaning'],
      summary: ['#BookSummary', '#BookReview', '#Recommendation', '#MustRead'],
      discussion: ['#BookDiscussion', '#BookTalk', '#BookChat', '#Thoughts']
    }

    const hashtags = contentTypeHashtags[contentType] || []
    hashtags.forEach((hashtag, index) => {
      suggestions.push({
        hashtag,
        relevance: 0.4 - (index * 0.05),
        category: 'engagement',
        description: `Content type hashtag for ${contentType}`
      })
    })

    return suggestions
  }

  /**
   * Generate engagement-focused hashtags
   */
  private static generateEngagementHashtags(platform: Platform): HashtagSuggestion[] {
    const suggestions: HashtagSuggestion[] = []
    const engagementHashtags = this.ENGAGEMENT_HASHTAGS[platform] || []

    engagementHashtags.forEach((hashtag, index) => {
      suggestions.push({
        hashtag,
        relevance: 0.3 - (index * 0.02),
        category: 'engagement',
        description: 'Engagement-focused hashtag'
      })
    })

    return suggestions
  }

  /**
   * Get optimal hashtag combination for a post
   */
  static getOptimalHashtags(
    suggestions: HashtagSuggestion[],
    platform: Platform,
    prioritizeEngagement: boolean = true
  ): string[] {
    const config = PLATFORM_CONFIGS[platform]
    const maxHashtags = config.hashtagLimit

    // Balance different categories
    const categoryLimits: Record<string, number> = {
      book: Math.ceil(maxHashtags * 0.2), // 20% for book-specific
      genre: Math.ceil(maxHashtags * 0.2), // 20% for genre
      theme: Math.ceil(maxHashtags * 0.3), // 30% for themes
      platform: Math.ceil(maxHashtags * 0.2), // 20% for platform
      engagement: Math.ceil(maxHashtags * 0.1), // 10% for engagement
      trending: Math.ceil(maxHashtags * 0.1) // 10% for trending
    }

    const selected: string[] = []
    const usedCategories: Record<string, number> = {}

    // Sort by relevance and select balanced hashtags
    suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .forEach(suggestion => {
        const categoryCount = usedCategories[suggestion.category] || 0
        const categoryLimit = categoryLimits[suggestion.category] || 1

        if (selected.length < maxHashtags && categoryCount < categoryLimit) {
          selected.push(suggestion.hashtag)
          usedCategories[suggestion.category] = categoryCount + 1
        }
      })

    // Fill remaining slots with highest relevance hashtags
    if (selected.length < maxHashtags) {
      suggestions
        .filter(s => !selected.includes(s.hashtag))
        .slice(0, maxHashtags - selected.length)
        .forEach(s => selected.push(s.hashtag))
    }

    return selected
  }

  /**
   * Analyze hashtag performance potential
   */
  static analyzeHashtagPerformance(hashtags: string[], platform: Platform): {
    score: number
    feedback: string[]
    suggestions: string[]
  } {
    const feedback: string[] = []
    const suggestions: string[] = []
    let score = 0

    const config = PLATFORM_CONFIGS[platform]
    const hashtagCount = hashtags.length

    // Check hashtag count
    if (hashtagCount === 0) {
      feedback.push('No hashtags found - adding hashtags can significantly improve reach')
      score -= 30
    } else if (hashtagCount < config.hashtagLimit * 0.3) {
      feedback.push('Consider adding more hashtags to improve discoverability')
      score -= 10
    } else if (hashtagCount > config.hashtagLimit * 0.8) {
      feedback.push('Good hashtag usage - near optimal count')
      score += 10
    }

    // Check for platform-specific hashtags
    const platformHashtags = this.PLATFORM_HASHTAGS[platform]
    const hasPlatformHashtag = hashtags.some(h => 
      platformHashtags.some(ph => ph.toLowerCase() === h.toLowerCase())
    )

    if (hasPlatformHashtag) {
      score += 15
      feedback.push('Great use of platform-specific hashtags')
    } else {
      suggestions.push(`Consider adding platform hashtags like ${platformHashtags[0]}`)
      score -= 5
    }

    // Check hashtag diversity
    const categories = new Set()
    hashtags.forEach(hashtag => {
      // Simple categorization based on common patterns
      if (hashtag.toLowerCase().includes('book')) categories.add('book')
      if (hashtag.toLowerCase().includes('read')) categories.add('reading')
      if (hashtag.toLowerCase().includes('quote')) categories.add('quote')
    })

    if (categories.size >= 3) {
      score += 10
      feedback.push('Good hashtag diversity across categories')
    } else {
      suggestions.push('Try mixing different types of hashtags (book, genre, theme)')
    }

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score + 50))

    return { score, feedback, suggestions }
  }
}