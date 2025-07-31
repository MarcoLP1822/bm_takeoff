// Mock OpenAI before importing
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  }
})

import {
  optimizeContent,
  suggestImprovements,
  autoFixContent,
  generateContentPreview
} from '../content-optimization'
import { GeneratedPost, Platform } from '../content-generation'

describe('Content Optimization', () => {
  describe('optimizeContent', () => {
    test('should optimize Twitter content with line breaks', () => {
      const content = 'This is a sentence. This is another sentence. Final thought.'
      const optimized = optimizeContent(content, 'twitter')

      expect(optimized).toContain('\n\n')
      expect(optimized).toMatch(/📚$/)
    })

    test('should add emojis to Instagram content', () => {
      const content = 'This book is amazing and full of wisdom'
      const optimized = optimizeContent(content, 'instagram')

      expect(optimized).toContain('📚')
      expect(optimized).toContain('🧠')
      expect(optimized).toContain('🤩')
    })

    test('should format LinkedIn content with bullet points', () => {
      const content = 'Key insights: leadership matters, innovation drives success, teamwork is essential, communication is key'
      const optimized = optimizeContent(content, 'linkedin')

      expect(optimized).toContain('•')
      expect(optimized).toContain('\n')
    })

    test('should add paragraph breaks to Facebook content', () => {
      const content = 'First paragraph. Second paragraph. Third paragraph.'
      const optimized = optimizeContent(content, 'facebook')

      expect(optimized).toContain('\n\n')
    })
  })

  describe('suggestImprovements', () => {
    const createMockPost = (overrides: Partial<GeneratedPost> = {}): GeneratedPost => ({
      platform: 'twitter',
      content: 'Test content',
      hashtags: ['#test'],
      characterCount: 50,
      isValid: true,
      validationErrors: [],
      ...overrides
    })

    test('should suggest shortening for near-limit content', () => {
      const post = createMockPost({
        platform: 'twitter',
        characterCount: 270 // 90% of 280 limit
      })

      const suggestions = suggestImprovements(post)
      expect(suggestions.some(s => s.includes('shortening'))).toBe(true)
    })

    test('should suggest expanding short content', () => {
      const post = createMockPost({
        platform: 'instagram',
        characterCount: 50 // Much less than 30% of 2200 limit
      })

      const suggestions = suggestImprovements(post)
      expect(suggestions.some(s => s.includes('expanded'))).toBe(true)
    })

    test('should suggest adding hashtags for low hashtag count', () => {
      const post = createMockPost({
        platform: 'instagram',
        hashtags: ['#one', '#two']
      })

      const suggestions = suggestImprovements(post)
      expect(suggestions.some(s => s.includes('more relevant hashtags'))).toBe(true)
    })

    test('should suggest reducing hashtags for high count', () => {
      const post = createMockPost({
        platform: 'twitter',
        hashtags: ['#one', '#two', '#three', '#four', '#five'] // Near limit of 5
      })

      const suggestions = suggestImprovements(post)
      expect(suggestions.some(s => s.includes('reducing hashtags'))).toBe(true)
    })

    test('should suggest call-to-action for content without engagement', () => {
      const post = createMockPost({
        content: 'This is just a statement'
      })

      const suggestions = suggestImprovements(post)
      expect(suggestions.some(s => s.includes('question or call-to-action'))).toBe(true)
    })

    test('should suggest emojis for Instagram without book emojis', () => {
      const post = createMockPost({
        platform: 'instagram',
        content: 'Great book about leadership'
      })

      const suggestions = suggestImprovements(post)
      expect(suggestions.some(s => s.includes('book-related emojis'))).toBe(true)
    })

    test('should suggest line breaks for long LinkedIn content', () => {
      const post = createMockPost({
        platform: 'linkedin',
        content: 'a'.repeat(600) // Long content without line breaks
      })

      const suggestions = suggestImprovements(post)
      expect(suggestions.some(s => s.includes('line breaks'))).toBe(true)
    })
  })

  describe('autoFixContent', () => {
    test('should remove duplicate hashtags', () => {
      const post: GeneratedPost = {
        platform: 'twitter',
        content: 'Test content',
        hashtags: ['#test', '#book', '#test', '#reading'],
        characterCount: 50,
        isValid: true,
        validationErrors: []
      }

      const fixed = autoFixContent(post)
      expect(fixed.hashtags).toEqual(['#test', '#book', '#reading'])
    })

    test('should add # to hashtags missing it', () => {
      const post: GeneratedPost = {
        platform: 'twitter',
        content: 'Test content',
        hashtags: ['test', '#book', 'reading'],
        characterCount: 50,
        isValid: true,
        validationErrors: []
      }

      const fixed = autoFixContent(post)
      expect(fixed.hashtags).toEqual(['#test', '#book', '#reading'])
    })

    test('should remove invalid characters from hashtags', () => {
      const post: GeneratedPost = {
        platform: 'twitter',
        content: 'Test content',
        hashtags: ['#test!', '#book-reading', '#amazing@book'],
        characterCount: 50,
        isValid: true,
        validationErrors: []
      }

      const fixed = autoFixContent(post)
      expect(fixed.hashtags).toEqual(['#test', '#bookreading', '#amazingbook'])
    })

    test('should optimize content', () => {
      const post: GeneratedPost = {
        platform: 'instagram',
        content: 'This book is amazing',
        hashtags: ['#book'],
        characterCount: 50,
        isValid: true,
        validationErrors: []
      }

      const fixed = autoFixContent(post)
      expect(fixed.content).toContain('🤩') // Should add emoji
    })

    test('should recalculate character count', () => {
      const post: GeneratedPost = {
        platform: 'twitter',
        content: 'Test content',
        hashtags: ['#test', '#book'],
        characterCount: 100, // Incorrect count
        isValid: true,
        validationErrors: []
      }

      const fixed = autoFixContent(post)
      const expectedCount = 'Test content #test #book'.length
      expect(fixed.characterCount).toBe(expectedCount)
    })

    test('should update validation status', () => {
      const post: GeneratedPost = {
        platform: 'twitter',
        content: 'a'.repeat(300), // Too long
        hashtags: ['#test'],
        characterCount: 310,
        isValid: true, // Incorrect validation
        validationErrors: []
      }

      const fixed = autoFixContent(post)
      expect(fixed.isValid).toBe(false)
      expect(fixed.validationErrors.length).toBeGreaterThan(0)
    })
  })

  describe('generateContentPreview', () => {
    test('should generate full preview for short content', () => {
      const post: GeneratedPost = {
        platform: 'twitter',
        content: 'Short tweet',
        hashtags: ['#test'],
        characterCount: 20,
        isValid: true,
        validationErrors: []
      }

      const preview = generateContentPreview(post)
      expect(preview.preview).toBe('Short tweet #test')
      expect(preview.truncated).toBe(false)
      expect(preview.displayLength).toBe(17)
    })

    test('should truncate long Twitter content', () => {
      const post: GeneratedPost = {
        platform: 'twitter',
        content: 'a'.repeat(300),
        hashtags: ['#test'],
        characterCount: 310,
        isValid: false,
        validationErrors: []
      }

      const preview = generateContentPreview(post)
      expect(preview.preview).toContain('...')
      expect(preview.truncated).toBe(true)
      expect(preview.displayLength).toBe(310)
    })

    test('should truncate Instagram content at 125 characters', () => {
      const post: GeneratedPost = {
        platform: 'instagram',
        content: 'a'.repeat(200),
        hashtags: ['#test'],
        characterCount: 210,
        isValid: true,
        validationErrors: []
      }

      const preview = generateContentPreview(post)
      expect(preview.preview.length).toBeLessThan(130) // 125 + "..."
      expect(preview.truncated).toBe(true)
    })

    test('should not truncate LinkedIn content within limits', () => {
      const post: GeneratedPost = {
        platform: 'linkedin',
        content: 'Professional content about leadership and business strategy',
        hashtags: ['#leadership', '#business'],
        characterCount: 80,
        isValid: true,
        validationErrors: []
      }

      const preview = generateContentPreview(post)
      expect(preview.truncated).toBe(false)
      expect(preview.preview).toContain('Professional content')
    })

    test('should handle content without hashtags', () => {
      const post: GeneratedPost = {
        platform: 'facebook',
        content: 'Facebook post without hashtags',
        hashtags: [],
        characterCount: 32,
        isValid: true,
        validationErrors: []
      }

      const preview = generateContentPreview(post)
      expect(preview.preview).toBe('Facebook post without hashtags')
      expect(preview.truncated).toBe(false)
    })
  })
})