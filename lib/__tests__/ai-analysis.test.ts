import { 
  validateAndNormalizeAnalysisResult,
  BookAnalysisResult,
  isAIServiceConfigured,
  getAnalysisProgress,
  estimateAnalysisTime,
  prepareTextForAnalysis,
  createAnalysisSummary
} from '../ai-analysis'

// Mock OpenAI completely
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}))

describe('AI Analysis Service', () => {
  describe('validateAndNormalizeAnalysisResult', () => {
    it('should normalize valid analysis result', () => {
      const input: Partial<BookAnalysisResult> = {
        themes: ['Theme 1', 'Theme 2'],
        quotes: ['Quote 1'],
        keyInsights: ['Insight 1'],
        overallSummary: 'Test summary',
        genre: 'Fiction',
        targetAudience: 'Young adults'
      }

      const result = validateAndNormalizeAnalysisResult(input)

      expect(result).toEqual({
        themes: ['Theme 1', 'Theme 2'],
        quotes: ['Quote 1'],
        keyInsights: ['Insight 1'],
        chapterSummaries: [],
        overallSummary: 'Test summary',
        genre: 'Fiction',
        targetAudience: 'Young adults',
        discussionPoints: []
      })
    })

    it('should provide fallbacks for missing data', () => {
      const input: Partial<BookAnalysisResult> = {}

      const result = validateAndNormalizeAnalysisResult(input)

      expect(result).toEqual({
        themes: ['General Interest'],
        quotes: [],
        keyInsights: [],
        chapterSummaries: [],
        overallSummary: 'Analysis summary not available.',
        genre: 'Unknown',
        targetAudience: 'General readers',
        discussionPoints: []
      })
    })

    it('should handle invalid data types', () => {
      const input: Record<string, unknown> = {
        themes: 'not an array',
        quotes: null,
        keyInsights: undefined,
        overallSummary: 123,
        genre: [],
        targetAudience: {}
      }

      const result = validateAndNormalizeAnalysisResult(input)

      expect(result).toEqual({
        themes: ['General Interest'],
        quotes: [],
        keyInsights: [],
        chapterSummaries: [],
        overallSummary: 'Analysis summary not available.',
        genre: 'Unknown',
        targetAudience: 'General readers',
        discussionPoints: []
      })
    })

    it('should handle partial data with some valid fields', () => {
      const input: Record<string, unknown> = {
        themes: ['Valid Theme'],
        quotes: null,
        keyInsights: ['Valid Insight'],
        overallSummary: undefined,
        genre: 'Mystery',
        targetAudience: undefined,
        discussionPoints: ['Valid Discussion Point']
      }

      const result = validateAndNormalizeAnalysisResult(input)

      expect(result).toEqual({
        themes: ['Valid Theme'],
        quotes: [],
        keyInsights: ['Valid Insight'],
        chapterSummaries: [],
        overallSummary: 'Analysis summary not available.',
        genre: 'Mystery',
        targetAudience: 'General readers',
        discussionPoints: ['Valid Discussion Point']
      })
    })

    it('should handle empty arrays correctly', () => {
      const input: Partial<BookAnalysisResult> = {
        themes: [],
        quotes: [],
        keyInsights: [],
        chapterSummaries: [],
        discussionPoints: []
      }

      const result = validateAndNormalizeAnalysisResult(input)

      expect(result.themes).toEqual(['General Interest']) // Should provide fallback for empty themes
      expect(result.quotes).toEqual([])
      expect(result.keyInsights).toEqual([])
      expect(result.chapterSummaries).toEqual([])
      expect(result.discussionPoints).toEqual([])
    })
  })

  describe('AI Analysis Integration', () => {
    it('should have proper error handling structure', () => {
      // Test that the module exports the expected functions
      expect(typeof validateAndNormalizeAnalysisResult).toBe('function')
    })

    it('should handle chapter summaries validation', () => {
      const input: Partial<BookAnalysisResult> = {
        chapterSummaries: [
          {
            chapterNumber: 1,
            title: 'Chapter 1',
            summary: 'Test summary',
            keyPoints: ['Point 1', 'Point 2']
          }
        ]
      }

      const result = validateAndNormalizeAnalysisResult(input)

      expect(result.chapterSummaries).toEqual([
        {
          chapterNumber: 1,
          title: 'Chapter 1',
          summary: 'Test summary',
          keyPoints: ['Point 1', 'Point 2']
        }
      ])
    })
  })

  describe('AI Service Configuration', () => {
    it('should check if AI service is configured', () => {
      const result = isAIServiceConfigured()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('Analysis Progress Tracking', () => {
    it('should calculate progress correctly', () => {
      const result = getAnalysisProgress('Identifying themes')
      expect(result.step).toBe('Identifying themes')
      expect(result.progress).toBe(14) // 1/7 * 100 rounded
    })

    it('should handle unknown steps', () => {
      const result = getAnalysisProgress('Unknown step')
      expect(result.step).toBe('Unknown step')
      expect(result.progress).toBe(0)
    })

    it('should calculate final step progress', () => {
      const result = getAnalysisProgress('Creating chapter summaries')
      expect(result.step).toBe('Creating chapter summaries')
      expect(result.progress).toBe(100)
    })
  })

  describe('Analysis Time Estimation', () => {
    it('should estimate time for short text', () => {
      const result = estimateAnalysisTime(1000)
      expect(result).toBe(31) // 30 base + 1 for 1000 chars
    })

    it('should estimate time for long text', () => {
      const result = estimateAnalysisTime(50000)
      expect(result).toBe(80) // 30 base + 50 for 50000 chars
    })

    it('should cap estimation at maximum time', () => {
      const result = estimateAnalysisTime(1000000)
      expect(result).toBe(300) // Capped at 5 minutes
    })
  })

  describe('Text Preparation', () => {
    it('should normalize line endings', () => {
      const input = 'Line 1\r\nLine 2\r\nLine 3'
      const result = prepareTextForAnalysis(input)
      expect(result).toBe('Line 1\nLine 2\nLine 3')
    })

    it('should reduce excessive line breaks', () => {
      const input = 'Line 1\n\n\n\nLine 2'
      const result = prepareTextForAnalysis(input)
      expect(result).toBe('Line 1\n\nLine 2')
    })

    it('should reduce excessive spaces', () => {
      const input = 'Word1    Word2     Word3'
      const result = prepareTextForAnalysis(input)
      expect(result).toBe('Word1 Word2 Word3')
    })

    it('should trim whitespace', () => {
      const input = '   Text content   '
      const result = prepareTextForAnalysis(input)
      expect(result).toBe('Text content')
    })

    it('should handle complex text formatting', () => {
      const input = '  \r\n\r\n  Chapter 1\r\n\r\n\r\n\r\nThis is    the content.  \r\n\r\n  '
      const result = prepareTextForAnalysis(input)
      expect(result).toBe('Chapter 1\n\nThis is the content.')
    })
  })

  describe('Analysis Summary', () => {
    it('should create summary of analysis results', () => {
      const analysisResult: BookAnalysisResult = {
        themes: ['Theme 1', 'Theme 2'],
        quotes: ['Quote 1', 'Quote 2', 'Quote 3'],
        keyInsights: ['Insight 1'],
        chapterSummaries: [
          { chapterNumber: 1, summary: 'Summary 1', keyPoints: ['Point 1'] }
        ],
        overallSummary: 'This is a test summary',
        genre: 'Fiction',
        targetAudience: 'General readers',
        discussionPoints: ['Point 1', 'Point 2']
      }

      const summary = createAnalysisSummary(analysisResult)

      expect(summary).toEqual({
        totalThemes: 2,
        totalQuotes: 3,
        totalInsights: 1,
        totalChapters: 1,
        totalDiscussionPoints: 2,
        hasOverallSummary: true
      })
    })

    it('should handle empty analysis results', () => {
      const analysisResult: BookAnalysisResult = {
        themes: [],
        quotes: [],
        keyInsights: [],
        chapterSummaries: [],
        overallSummary: 'Analysis summary not available.',
        genre: 'Unknown',
        targetAudience: 'General readers',
        discussionPoints: []
      }

      const summary = createAnalysisSummary(analysisResult)

      expect(summary).toEqual({
        totalThemes: 0,
        totalQuotes: 0,
        totalInsights: 0,
        totalChapters: 0,
        totalDiscussionPoints: 0,
        hasOverallSummary: false
      })
    })
  })
})