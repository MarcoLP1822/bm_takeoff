import { ImageSuggestionEngine } from '../image-suggestions'
import { BookAnalysisResult } from '../ai-analysis'

describe('ImageSuggestionEngine', () => {
  const mockBookAnalysis: BookAnalysisResult = {
    quotes: ['The only way to do great work is to love what you do.'],
    keyInsights: ['Passion is the key to excellence'],
    themes: ['Leadership', 'Innovation', 'Passion'],
    overallSummary: 'A book about leadership and innovation in the modern workplace.',
    discussionPoints: ['How does passion drive performance?'],
    genre: 'Business',
    targetAudience: 'Professionals and entrepreneurs',
    chapterSummaries: []
  }

  describe('generateImageSuggestions', () => {
    test('should generate quote image suggestions', () => {
      const suggestions = ImageSuggestionEngine.generateImageSuggestions(
        'The only way to do great work is to love what you do.',
        'twitter',
        'quote',
        'Steve Jobs Biography',
        'Biography',
        ['Leadership', 'Innovation']
      )

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.length).toBeLessThanOrEqual(3)
      
      suggestions.forEach(suggestion => {
        expect(suggestion.type).toBeDefined()
        expect(suggestion.description).toBeDefined()
        expect(suggestion.prompt).toBeDefined()
        expect(suggestion.style).toBeDefined()
        expect(suggestion.colors).toBeDefined()
        expect(suggestion.dimensions).toBeDefined()
        expect(suggestion.elements).toBeDefined()
        expect(Array.isArray(suggestion.colors)).toBe(true)
        expect(Array.isArray(suggestion.elements)).toBe(true)
      })
    })

    test('should generate insight image suggestions', () => {
      const suggestions = ImageSuggestionEngine.generateImageSuggestions(
        'Passion is the key to excellence in any field',
        'instagram',
        'insight',
        'Excellence Guide',
        'SelfHelp',
        ['Growth', 'Success']
      )

      expect(suggestions.length).toBeGreaterThan(0)
      
      // Should include concept art or infographic types
      const hasConceptArt = suggestions.some(s => s.type === 'concept-art')
      const hasInfoGraphic = suggestions.some(s => s.type === 'infographic')
      expect(hasConceptArt || hasInfoGraphic).toBe(true)
    })

    test('should generate theme image suggestions', () => {
      const suggestions = ImageSuggestionEngine.generateImageSuggestions(
        'Leadership in the modern workplace',
        'linkedin',
        'theme',
        'Leadership Handbook',
        'Business',
        ['Leadership', 'Management']
      )

      expect(suggestions.length).toBeGreaterThan(0)
      
      // Should include concept art or quote graphics
      const types = suggestions.map(s => s.type)
      expect(types.includes('concept-art') || types.includes('quote-graphic')).toBe(true)
    })

    test('should generate summary image suggestions', () => {
      const suggestions = ImageSuggestionEngine.generateImageSuggestions(
        'This book explores the fundamentals of effective leadership',
        'facebook',
        'summary',
        'Leadership Fundamentals',
        'Business',
        ['Leadership']
      )

      expect(suggestions.length).toBeGreaterThan(0)
      
      // Should include book cover or collage types
      const types = suggestions.map(s => s.type)
      expect(types.includes('book-cover') || types.includes('collage')).toBe(true)
    })

    test('should generate discussion image suggestions', () => {
      const suggestions = ImageSuggestionEngine.generateImageSuggestions(
        'What makes a great leader in your opinion?',
        'twitter',
        'discussion',
        'Leadership Questions',
        'Business',
        ['Leadership']
      )

      expect(suggestions.length).toBeGreaterThan(0)
      
      // Should include concept art for discussion
      const hasConceptArt = suggestions.some(s => s.type === 'concept-art')
      expect(hasConceptArt).toBe(true)
    })

    test('should adapt dimensions for different platforms', () => {
      const twitterSuggestions = ImageSuggestionEngine.generateImageSuggestions(
        'Test content',
        'twitter',
        'quote',
        'Test Book'
      )

      const instagramSuggestions = ImageSuggestionEngine.generateImageSuggestions(
        'Test content',
        'instagram',
        'quote',
        'Test Book'
      )

      expect(twitterSuggestions[0].dimensions.aspectRatio).toBe('16:9')
      expect(instagramSuggestions[0].dimensions.aspectRatio).toBe('1:1')
    })

    test('should handle missing genre and themes gracefully', () => {
      const suggestions = ImageSuggestionEngine.generateImageSuggestions(
        'Test content without genre',
        'instagram',
        'quote',
        'Test Book'
      )

      expect(suggestions.length).toBeGreaterThan(0)
      
      suggestions.forEach(suggestion => {
        expect(suggestion.colors.length).toBeGreaterThan(0)
        expect(suggestion.style).toBeDefined()
      })
    })

    test('should include appropriate elements for each suggestion type', () => {
      const quoteSuggestions = ImageSuggestionEngine.generateImageSuggestions(
        'Great quote here',
        'instagram',
        'quote',
        'Quote Book'
      )

      const quoteElements = quoteSuggestions[0].elements
      expect(quoteElements.some(e => e.includes('typography') || e.includes('quote'))).toBe(true)
    })

    test('should vary styles based on genre', () => {
      const businessSuggestions = ImageSuggestionEngine.generateImageSuggestions(
        'Business insight',
        'linkedin',
        'insight',
        'Business Book',
        'Business'
      )

      const fictionSuggestions = ImageSuggestionEngine.generateImageSuggestions(
        'Story quote',
        'instagram',
        'quote',
        'Fiction Novel',
        'Fiction'
      )

      // Business should tend toward professional styles
      const businessStyles = businessSuggestions.map(s => s.style)
      expect(businessStyles.includes('professional') || businessStyles.includes('modern')).toBe(true)

      // Fiction should allow more artistic styles
      const fictionStyles = fictionSuggestions.map(s => s.style)
      expect(fictionStyles.includes('artistic') || fictionStyles.includes('vintage')).toBe(true)
    })
  })

  describe('generateImageUrl', () => {
    test('should generate valid image URL', () => {
      const suggestion = {
        type: 'quote-graphic' as const,
        description: 'Test description',
        prompt: 'Test prompt',
        style: 'modern' as const,
        colors: ['#3498db', '#2c3e50'],
        dimensions: { width: 1080, height: 1080, aspectRatio: '1:1' },
        elements: ['typography', 'background']
      }

      const url = ImageSuggestionEngine.generateImageUrl(suggestion, 'Test content')

      expect(url).toContain('/api/images/generate')
      expect(url).toContain('type=quote-graphic')
      expect(url).toContain('style=modern')
      expect(url).toContain('width=1080')
      expect(url).toContain('height=1080')
      expect(url).toContain('colors=')
      expect(url).toContain('content=')
      expect(url).toContain('prompt=')
    })

    test('should handle long content by truncating', () => {
      const suggestion = {
        type: 'quote-graphic' as const,
        description: 'Test description',
        prompt: 'Test prompt',
        style: 'modern' as const,
        colors: ['#3498db'],
        dimensions: { width: 1080, height: 1080, aspectRatio: '1:1' },
        elements: ['typography']
      }

      const longContent = 'a'.repeat(200)
      const url = ImageSuggestionEngine.generateImageUrl(suggestion, longContent)

      expect(url).toContain('/api/images/generate')
      // Should truncate content to 100 characters
      const contentParam = new URLSearchParams(url.split('?')[1]).get('content')
      expect(contentParam?.length).toBeLessThanOrEqual(100)
    })

    test('should encode special characters in URL', () => {
      const suggestion = {
        type: 'quote-graphic' as const,
        description: 'Test description',
        prompt: 'Test prompt with "quotes" and & symbols',
        style: 'modern' as const,
        colors: ['#3498db'],
        dimensions: { width: 1080, height: 1080, aspectRatio: '1:1' },
        elements: ['typography']
      }

      const contentWithSpecialChars = 'Content with "quotes" & symbols!'
      const url = ImageSuggestionEngine.generateImageUrl(suggestion, contentWithSpecialChars)

      expect(url).toContain('/api/images/generate')
      expect(url).not.toContain('"') // Should be encoded
      expect(url).not.toContain('&symbols') // Should be encoded properly
    })
  })

  describe('color and style selection', () => {
    test('should select appropriate colors for themes', () => {
      const leadershipSuggestions = ImageSuggestionEngine.generateImageSuggestions(
        'Leadership content',
        'linkedin',
        'theme',
        'Leadership Book',
        'Business',
        ['Leadership']
      )

      const loveSuggestions = ImageSuggestionEngine.generateImageSuggestions(
        'Love content',
        'instagram',
        'quote',
        'Romance Novel',
        'Romance',
        ['Love']
      )

      // Leadership should have professional colors (blues)
      const leadershipColors = leadershipSuggestions[0].colors
      expect(leadershipColors.some(c => c.includes('#1f4e79') || c.includes('#2c5aa0'))).toBe(true)

      // Love should have warmer colors (reds, pinks)
      const loveColors = loveSuggestions[0].colors
      expect(loveColors.some(c => c.includes('#e74c3c') || c.includes('#ff6b9d'))).toBe(true)
    })

    test('should provide default colors when themes are not recognized', () => {
      const suggestions = ImageSuggestionEngine.generateImageSuggestions(
        'Unknown theme content',
        'twitter',
        'quote',
        'Unknown Book',
        'Unknown',
        ['UnknownTheme']
      )

      expect(suggestions[0].colors.length).toBeGreaterThan(0)
      // Should fall back to default colors
      expect(suggestions[0].colors.includes('#3498db')).toBe(true)
    })
  })
})