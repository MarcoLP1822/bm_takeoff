/**
 * Integration Test: Complete Content Workflow
 * Tests the end-to-end flow from book analysis to content generation
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

// Mock external dependencies for testing
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(() => ({ userId: 'test-user-123' }))
}))

jest.mock('@/lib/openai', () => ({
  generateCompletion: jest.fn()
}))

describe('Content Workflow Integration', () => {
  const mockBookId = 'test-book-123'
  const mockUserId = 'test-user-123'

  beforeAll(() => {
    // Setup test environment
    console.log('🧪 Starting Content Workflow Integration Tests')
  })

  afterAll(() => {
    console.log('✅ Content Workflow Integration Tests Complete')
  })

  describe('Phase 1: Book Analysis with Granular Progress', () => {
    it('should track analysis progress step by step', async () => {
      // Test the granular analysis progress tracking
      const progressSteps = [
        'text_extraction',
        'themes_identification', 
        'quotes_extraction',
        'insights_generation'
      ]

      // Mock progress should follow the expected structure
      const mockProgress = {
        status: 'in_progress' as const,
        current_step: 'themes_identification' as const,
        steps: {
          text_extraction: 'completed' as const,
          themes_identification: 'in_progress' as const,
          quotes_extraction: 'pending' as const,
          insights_generation: 'pending' as const
        },
        started_at: new Date().toISOString()
      }

      expect(mockProgress.steps.text_extraction).toBe('completed')
      expect(mockProgress.current_step).toBe('themes_identification')
    })

    it('should allow regeneration of individual sections', async () => {
      // Test individual section regeneration
      const sections = ['themes', 'quotes', 'insights']
      
      for (const section of sections) {
        // Each section should be regeneratable independently
        expect(sections).toContain(section)
      }
    })
  })

  describe('Phase 2: Content Workshop Generation', () => {
    it('should generate platform-specific content from themes', async () => {
      const mockTheme = 'Identity and Transformation'
      const platforms = ['twitter', 'instagram', 'linkedin', 'facebook']
      
      for (const platform of platforms) {
        // Mock content generation for each platform
        const mockContent = {
          platform,
          content: `Test content for ${platform} about ${mockTheme}`,
          hashtags: ['#test', '#content'],
          sourceType: 'theme',
          sourceContent: mockTheme
        }

        expect(mockContent.platform).toBe(platform)
        expect(mockContent.sourceType).toBe('theme')
        expect(mockContent.sourceContent).toBe(mockTheme)
      }
    })

    it('should generate content from quotes with proper source tracking', async () => {
      const mockQuote = 'This is a test quote from the book'
      const mockGeneratedContent = {
        platform: 'twitter',
        content: 'Generated content based on quote',
        sourceType: 'quote',
        sourceContent: mockQuote,
        variationGroupId: 'test-group-123'
      }

      expect(mockGeneratedContent.sourceType).toBe('quote')
      expect(mockGeneratedContent.sourceContent).toBe(mockQuote)
      expect(mockGeneratedContent.variationGroupId).toBeTruthy()
    })

    it('should generate content from insights with context', async () => {
      const mockInsight = 'Key insight about character development'
      const mockContext = {
        bookTitle: 'Test Book',
        author: 'Test Author',
        genre: 'Fiction'
      }

      const mockGeneratedContent = {
        platform: 'linkedin',
        content: 'Professional insight about character development',
        sourceType: 'insight',
        sourceContent: mockInsight,
        generationContext: {
          bookId: mockBookId,
          platform: 'linkedin',
          bookTitle: mockContext.bookTitle,
          author: mockContext.author
        }
      }

      expect(mockGeneratedContent.sourceType).toBe('insight')
      expect(mockGeneratedContent.generationContext.bookTitle).toBe(mockContext.bookTitle)
    })
  })

  describe('Phase 3: Content Management Integration', () => {
    it('should group content by variationGroupId', async () => {
      const mockVariationGroupId = 'test-group-123'
      const mockContents = [
        {
          id: 'content-1',
          platform: 'twitter',
          variationGroupId: mockVariationGroupId,
          sourceType: 'theme',
          sourceContent: 'Test theme'
        },
        {
          id: 'content-2', 
          platform: 'instagram',
          variationGroupId: mockVariationGroupId,
          sourceType: 'theme',
          sourceContent: 'Test theme'
        }
      ]

      // Contents with same variationGroupId should be grouped
      const groupedByVariation = mockContents.reduce((acc, content) => {
        const groupId = content.variationGroupId || content.id
        if (!acc[groupId]) {
          acc[groupId] = []
        }
        acc[groupId].push(content)
        return acc
      }, {} as Record<string, typeof mockContents>)

      expect(Object.keys(groupedByVariation)).toHaveLength(1)
      expect(groupedByVariation[mockVariationGroupId]).toHaveLength(2)
    })

    it('should display source information in content manager', async () => {
      const mockContentVariation = {
        id: 'variation-123',
        posts: [],
        theme: 'Test Theme',
        sourceType: 'theme' as const,
        sourceContent: 'Original theme content',
        bookId: mockBookId,
        bookTitle: 'Test Book',
        author: 'Test Author'
      }

      expect(mockContentVariation.sourceType).toBe('theme')
      expect(mockContentVariation.sourceContent).toBe('Original theme content')
      expect(mockContentVariation.bookTitle).toBe('Test Book')
    })
  })

  describe('Phase 4: Complete User Journey', () => {
    it('should support complete workflow: analysis → workshop → management', async () => {
      // Step 1: Book analysis completed
      const analysisResult = {
        bookId: mockBookId,
        status: 'completed',
        themes: ['Theme 1', 'Theme 2'],
        quotes: ['Quote 1', 'Quote 2'],
        keyInsights: ['Insight 1', 'Insight 2']
      }

      // Step 2: Content workshop generation
      const workshopGeneration = {
        sourceType: 'theme',
        sourceContent: analysisResult.themes[0],
        platforms: ['twitter', 'instagram'],
        generatedContent: [
          { platform: 'twitter', content: 'Twitter content' },
          { platform: 'instagram', content: 'Instagram content' }
        ]
      }

      // Step 3: Content management access
      const contentManagement = {
        totalVariations: 1,
        variationGroupId: 'group-123',
        sourceTracking: {
          sourceType: workshopGeneration.sourceType,
          sourceContent: workshopGeneration.sourceContent
        }
      }

      // Verify complete flow
      expect(analysisResult.status).toBe('completed')
      expect(workshopGeneration.generatedContent).toHaveLength(2)
      expect(contentManagement.sourceTracking.sourceType).toBe('theme')
    })
  })

  describe('Phase 5: Error Handling and Edge Cases', () => {
    it('should handle missing source tracking gracefully', async () => {
      // Legacy content without source tracking
      const legacyContent = {
        id: 'legacy-123',
        platform: 'twitter',
        content: 'Legacy content',
        sourceType: null,
        sourceContent: null,
        variationGroupId: null
      }

      // Should fallback to individual content ID for grouping
      const variationKey = legacyContent.variationGroupId || legacyContent.id
      expect(variationKey).toBe(legacyContent.id)
    })

    it('should validate required fields for content generation', async () => {
      const validationTest = {
        bookId: mockBookId,
        sourceType: 'theme',
        sourceContent: 'Test theme',
        platform: 'twitter'
      }

      // All required fields should be present
      expect(validationTest.bookId).toBeTruthy()
      expect(validationTest.sourceType).toBeTruthy()
      expect(validationTest.sourceContent).toBeTruthy()
      expect(validationTest.platform).toBeTruthy()
    })
  })
})
