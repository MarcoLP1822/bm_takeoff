import { Platform } from './content-generation'

export interface ImageSuggestion {
  type: 'quote-graphic' | 'book-cover' | 'concept-art' | 'infographic' | 'collage'
  description: string
  prompt: string
  style: 'minimalist' | 'modern' | 'vintage' | 'artistic' | 'professional'
  colors: string[]
  dimensions: {
    width: number
    height: number
    aspectRatio: string
  }
  elements: string[]
}

export interface Dimensions {
  width: number
  height: number
  aspectRatio: string
}

export type ImageStyle = 'minimalist' | 'modern' | 'vintage' | 'artistic' | 'professional'

export type GenreKey = 'fiction' | 'nonfiction' | 'business' | 'selfhelp' | 'biography' | 'history' | 'science' | 'philosophy' | 'psychology' | 'romance' | 'mystery' | 'fantasy' | 'scifi'

export type ThemeKey = 'leadership' | 'love' | 'friendship' | 'courage' | 'growth' | 'success' | 'wisdom' | 'creativity' | 'justice' | 'freedom' | 'hope' | 'change'

/**
 * Advanced image suggestion system for social media content
 */
export class ImageSuggestionEngine {
  private static readonly PLATFORM_DIMENSIONS = {
    twitter: {
      post: { width: 1200, height: 675, aspectRatio: '16:9' },
      card: { width: 1200, height: 628, aspectRatio: '1.91:1' }
    },
    instagram: {
      square: { width: 1080, height: 1080, aspectRatio: '1:1' },
      portrait: { width: 1080, height: 1350, aspectRatio: '4:5' },
      story: { width: 1080, height: 1920, aspectRatio: '9:16' }
    },
    linkedin: {
      post: { width: 1200, height: 627, aspectRatio: '1.91:1' },
      article: { width: 1200, height: 675, aspectRatio: '16:9' }
    },
    facebook: {
      post: { width: 1200, height: 630, aspectRatio: '1.91:1' },
      cover: { width: 1200, height: 675, aspectRatio: '16:9' }
    }
  }

  private static readonly GENRE_STYLES: Record<GenreKey, ImageStyle[]> = {
    fiction: ['artistic', 'vintage', 'modern'],
    nonfiction: ['professional', 'modern', 'minimalist'],
    business: ['professional', 'modern', 'minimalist'],
    selfhelp: ['modern', 'minimalist', 'artistic'],
    biography: ['vintage', 'artistic', 'professional'],
    history: ['vintage', 'artistic', 'professional'],
    science: ['modern', 'professional', 'minimalist'],
    philosophy: ['minimalist', 'artistic', 'vintage'],
    psychology: ['modern', 'professional', 'artistic'],
    romance: ['artistic', 'vintage', 'modern'],
    mystery: ['artistic', 'vintage', 'modern'],
    fantasy: ['artistic', 'modern', 'vintage'],
    scifi: ['modern', 'artistic', 'professional']
  }

  private static readonly THEME_COLORS: Record<ThemeKey, string[]> = {
    leadership: ['#1f4e79', '#2c5aa0', '#4a90e2', '#7bb3f0'],
    love: ['#e74c3c', '#f39c12', '#ff6b9d', '#ffc0cb'],
    friendship: ['#f39c12', '#e67e22', '#ffb347', '#ffd700'],
    courage: ['#e74c3c', '#c0392b', '#ff4757', '#ff6b6b'],
    growth: ['#27ae60', '#2ecc71', '#55a3ff', '#4ecdc4'],
    success: ['#f39c12', '#e67e22', '#ffd700', '#ffb347'],
    wisdom: ['#8e44ad', '#9b59b6', '#6c5ce7', '#a29bfe'],
    creativity: ['#e74c3c', '#f39c12', '#9b59b6', '#ff7675'],
    justice: ['#2c3e50', '#34495e', '#4a69bd', '#5f6a6a'],
    freedom: ['#3498db', '#2980b9', '#74b9ff', '#0984e3'],
    hope: ['#f39c12', '#e67e22', '#fdcb6e', '#f6b93b'],
    change: ['#e74c3c', '#c0392b', '#fd79a8', '#e84393']
  }

  /**
   * Generate image suggestions for social media content
   */
  static generateImageSuggestions(
    content: string,
    platform: Platform,
    sourceType: 'quote' | 'insight' | 'theme' | 'summary' | 'discussion',
    bookTitle: string,
    genre?: string,
    themes?: string[]
  ): ImageSuggestion[] {
    const suggestions: ImageSuggestion[] = []

    // Get platform-specific dimensions
    const dimensions = this.getPlatformDimensions(platform)

    // Generate suggestions based on content type
    switch (sourceType) {
      case 'quote':
        suggestions.push(...this.generateQuoteImageSuggestions(content, bookTitle, genre, themes, dimensions))
        break
      case 'insight':
        suggestions.push(...this.generateInsightImageSuggestions(content, bookTitle, genre, themes, dimensions))
        break
      case 'theme':
        suggestions.push(...this.generateThemeImageSuggestions(content, bookTitle, genre, themes, dimensions))
        break
      case 'summary':
        suggestions.push(...this.generateSummaryImageSuggestions(content, bookTitle, genre, themes, dimensions))
        break
      case 'discussion':
        suggestions.push(...this.generateDiscussionImageSuggestions(content, bookTitle, genre, themes, dimensions))
        break
    }

    return suggestions.slice(0, 3) // Return top 3 suggestions
  }

  /**
   * Generate quote-specific image suggestions
   */
  private static generateQuoteImageSuggestions(
    content: string,
    bookTitle: string,
    genre?: string,
    themes?: string[],
    dimensions?: Dimensions
  ): ImageSuggestion[] {
    const suggestions: ImageSuggestion[] = []
    const style = this.getStyleForGenre(genre)
    const colors = this.getColorsForThemes(themes)

    // Minimalist quote graphic
    suggestions.push({
      type: 'quote-graphic',
      description: 'Clean, minimalist quote design with elegant typography',
      prompt: `Create a minimalist quote graphic with elegant typography featuring: "${content.slice(0, 100)}" - ${bookTitle}`,
      style: 'minimalist',
      colors: colors.slice(0, 2),
      dimensions: dimensions || { width: 1080, height: 1080, aspectRatio: '1:1' },
      elements: ['typography', 'quote marks', 'book title', 'subtle background']
    })

    // Artistic quote design
    suggestions.push({
      type: 'quote-graphic',
      description: 'Artistic quote design with decorative elements and rich colors',
      prompt: `Design an artistic quote graphic with decorative elements: "${content.slice(0, 100)}" from ${bookTitle}`,
      style: 'artistic',
      colors: colors,
      dimensions: dimensions || { width: 1080, height: 1080, aspectRatio: '1:1' },
      elements: ['decorative typography', 'ornamental borders', 'artistic flourishes', 'gradient background']
    })

    // Modern quote card
    suggestions.push({
      type: 'quote-graphic',
      description: 'Modern quote card with bold typography and geometric elements',
      prompt: `Create a modern quote card with bold typography and geometric design: "${content.slice(0, 100)}"`,
      style: 'modern',
      colors: colors.slice(0, 3),
      dimensions: dimensions || { width: 1080, height: 1080, aspectRatio: '1:1' },
      elements: ['bold typography', 'geometric shapes', 'modern layout', 'color blocks']
    })

    return suggestions
  }

  /**
   * Generate insight-specific image suggestions
   */
  private static generateInsightImageSuggestions(
    content: string,
    bookTitle: string,
    genre?: string,
    themes?: string[],
    dimensions?: Dimensions
  ): ImageSuggestion[] {
    const suggestions: ImageSuggestion[] = []
    const style = this.getStyleForGenre(genre)
    const colors = this.getColorsForThemes(themes)

    // Lightbulb concept
    suggestions.push({
      type: 'concept-art',
      description: 'Lightbulb or brain icon representing insight and learning',
      prompt: `Create a concept image with lightbulb or brain symbolizing insight: "${content.slice(0, 80)}"`,
      style: 'modern',
      colors: ['#f39c12', '#e67e22', '#3498db'],
      dimensions: dimensions || { width: 1080, height: 1080, aspectRatio: '1:1' },
      elements: ['lightbulb icon', 'insight text', 'modern typography', 'gradient background']
    })

    // Infographic style
    suggestions.push({
      type: 'infographic',
      description: 'Infographic-style design highlighting key insights',
      prompt: `Design an infographic highlighting the key insight: "${content.slice(0, 100)}" from ${bookTitle}`,
      style: 'professional',
      colors: colors.slice(0, 3),
      dimensions: dimensions || { width: 1080, height: 1080, aspectRatio: '1:1' },
      elements: ['key points', 'icons', 'structured layout', 'professional typography']
    })

    return suggestions
  }

  /**
   * Generate theme-specific image suggestions
   */
  private static generateThemeImageSuggestions(
    content: string,
    bookTitle: string,
    genre?: string,
    themes?: string[],
    dimensions?: Dimensions
  ): ImageSuggestion[] {
    const suggestions: ImageSuggestion[] = []
    const style = this.getStyleForGenre(genre)
    const colors = this.getColorsForThemes(themes)

    // Abstract concept art
    suggestions.push({
      type: 'concept-art',
      description: 'Abstract visual representation of the theme',
      prompt: `Create abstract concept art representing the theme: ${content}`,
      style: 'artistic',
      colors: colors,
      dimensions: dimensions || { width: 1080, height: 1080, aspectRatio: '1:1' },
      elements: ['abstract shapes', 'symbolic imagery', 'theme representation', 'artistic composition']
    })

    // Typography-focused design
    suggestions.push({
      type: 'quote-graphic',
      description: 'Typography-focused design emphasizing the theme',
      prompt: `Design a typography-focused image emphasizing the theme: ${content} from ${bookTitle}`,
      style: (style[0] as ImageStyle) || 'modern',
      colors: colors.slice(0, 2),
      dimensions: dimensions || { width: 1080, height: 1080, aspectRatio: '1:1' },
      elements: ['large typography', 'theme emphasis', 'minimal design', 'color accent']
    })

    return suggestions
  }

  /**
   * Generate summary-specific image suggestions
   */
  private static generateSummaryImageSuggestions(
    content: string,
    bookTitle: string,
    genre?: string,
    themes?: string[],
    dimensions?: Dimensions
  ): ImageSuggestion[] {
    const suggestions: ImageSuggestion[] = []
    const style = this.getStyleForGenre(genre)
    const colors = this.getColorsForThemes(themes)

    // Book cover mockup
    suggestions.push({
      type: 'book-cover',
      description: 'Book cover or book-related imagery with summary text',
      prompt: `Create a book cover design or book imagery with summary: ${bookTitle}`,
      style: (style[0] as ImageStyle) || 'modern',
      colors: colors.slice(0, 3),
      dimensions: dimensions || { width: 1080, height: 1080, aspectRatio: '1:1' },
      elements: ['book imagery', 'title display', 'summary text', 'professional layout']
    })

    // Collage style
    suggestions.push({
      type: 'collage',
      description: 'Collage of key elements from the book summary',
      prompt: `Design a collage representing key elements from: ${content.slice(0, 100)}`,
      style: 'modern',
      colors: colors,
      dimensions: dimensions || { width: 1080, height: 1080, aspectRatio: '1:1' },
      elements: ['multiple elements', 'collage layout', 'book themes', 'visual variety']
    })

    return suggestions
  }

  /**
   * Generate discussion-specific image suggestions
   */
  private static generateDiscussionImageSuggestions(
    content: string,
    bookTitle: string,
    genre?: string,
    themes?: string[],
    dimensions?: Dimensions
  ): ImageSuggestion[] {
    const suggestions: ImageSuggestion[] = []
    const style = this.getStyleForGenre(genre)
    const colors = this.getColorsForThemes(themes)

    // Question mark or discussion bubble
    suggestions.push({
      type: 'concept-art',
      description: 'Discussion bubble or question mark encouraging engagement',
      prompt: `Create a discussion-focused image with question: "${content.slice(0, 80)}"`,
      style: 'modern',
      colors: ['#3498db', '#2980b9', '#74b9ff'],
      dimensions: dimensions || { width: 1080, height: 1080, aspectRatio: '1:1' },
      elements: ['question mark', 'discussion bubble', 'engaging text', 'call to action']
    })

    return suggestions
  }

  /**
   * Get appropriate style for genre
   */
  private static getStyleForGenre(genre?: string): ImageStyle[] {
    if (!genre) return ['modern', 'minimalist', 'professional']
    
    const genreKey = genre.toLowerCase().replace(/[^a-z]/g, '') as GenreKey
    return this.GENRE_STYLES[genreKey] || ['modern', 'minimalist', 'professional']
  }

  /**
   * Get appropriate colors for themes
   */
  private static getColorsForThemes(themes?: string[]): string[] {
    if (!themes || themes.length === 0) {
      return ['#3498db', '#2c3e50', '#95a5a6'] // Default colors
    }

    const colors: string[] = []
    themes.slice(0, 3).forEach(theme => {
      const themeKey = theme.toLowerCase().replace(/[^a-z]/g, '') as ThemeKey
      const themeColors = this.THEME_COLORS[themeKey]
      if (themeColors) {
        colors.push(...themeColors.slice(0, 2))
      }
    })

    return colors.length > 0 ? colors : ['#3498db', '#2c3e50', '#95a5a6']
  }

  /**
   * Get platform-specific dimensions
   */
  private static getPlatformDimensions(platform: Platform): Dimensions {
    switch (platform) {
      case 'twitter':
        return this.PLATFORM_DIMENSIONS.twitter.post
      case 'instagram':
        return this.PLATFORM_DIMENSIONS.instagram.square
      case 'linkedin':
        return this.PLATFORM_DIMENSIONS.linkedin.post
      case 'facebook':
        return this.PLATFORM_DIMENSIONS.facebook.post
      default:
        return { width: 1080, height: 1080, aspectRatio: '1:1' }
    }
  }

  /**
   * Generate image URL for suggestion
   */
  static generateImageUrl(suggestion: ImageSuggestion, content: string): string {
    const params = new URLSearchParams({
      type: suggestion.type,
      style: suggestion.style,
      width: suggestion.dimensions.width.toString(),
      height: suggestion.dimensions.height.toString(),
      colors: suggestion.colors.join(','),
      content: content.slice(0, 100),
      prompt: suggestion.prompt
    })

    return `/api/images/generate?${params.toString()}`
  }
}