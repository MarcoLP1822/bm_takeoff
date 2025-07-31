import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { performance } from 'perf_hooks'

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  }
})

import { analyzeBookContent } from '@/lib/ai-analysis'
import { generateSocialContent } from '@/lib/content-generation'
import { HashtagGenerator } from '@/lib/hashtag-generator'

// Performance test utilities
const measurePerformance = async <T>(fn: () => Promise<T>, label: string) => {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  const duration = end - start
  
  console.log(`${label}: ${duration.toFixed(2)}ms`)
  return { result, duration }
}

const createMockBookContent = (wordCount: number): string => {
  const words = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'book', 'story', 'character', 'plot', 'adventure', 'friendship', 'journey']
  return Array.from({ length: wordCount }, () => 
    words[Math.floor(Math.random() * words.length)]
  ).join(' ')
}

describe('AI Analysis Performance Tests', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCreate: any

  beforeEach(() => {
    jest.clearAllMocks()
    // Access the mock directly from the jest mock
    const openaiModule = jest.requireMock('openai') as { OpenAI: jest.Mock }
    mockCreate = jest.fn().mockResolvedValue({
      choices: [{
        message: {
          role: 'assistant',
          content: 'Default test response',
          refusal: null
        }
      }]
    } as never)
    openaiModule.OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Book Analysis Performance', () => {
    it('should analyze short books (< 10k words) within 30 seconds', async () => {
      const shortBookContent = createMockBookContent(8000) // 8k words
      
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              themes: ['friendship', 'adventure'],
              keyInsights: ['Life lesson 1', 'Life lesson 2'],
              quotes: ['Great quote'],
              summary: 'Short book summary',
              genre: 'fiction',
              targetAudience: 'young adults'
            })
          }
        }]
      })

      const { duration } = await measurePerformance(async () => {
        return await analyzeBookContent(shortBookContent, 'Short Test Book', 'test-book-id', 'test-user-id')
      }, 'Short book analysis')

      expect(duration).toBeLessThan(30000) // 30 seconds
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('should analyze medium books (10k-50k words) within 60 seconds', async () => {
      const mediumBookContent = createMockBookContent(30000) // 30k words
      
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              themes: ['love', 'loss', 'redemption'],
              keyInsights: ['Deep insight 1', 'Deep insight 2'],
              quotes: ['Memorable quote 1', 'Memorable quote 2'],
              summary: 'Medium book summary',
              genre: 'literary fiction',
              targetAudience: 'adults'
            })
          }
        }]
      })

      const { duration } = await measurePerformance(async () => {
        return await analyzeBookContent(mediumBookContent, 'Medium Test Book', 'test-book-id', 'test-user-id')
      }, 'Medium book analysis')

      expect(duration).toBeLessThan(60000) // 60 seconds
    })

    it('should handle large books (50k+ words) with chunking within 120 seconds', async () => {
      const largeBookContent = createMockBookContent(80000) // 80k words
      
      // Mock multiple API calls for chunked processing
      mockCreate
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                themes: ['war', 'peace'],
                keyInsights: ['Historical insight'],
                quotes: ['War quote'],
                summary: 'First part summary'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                themes: ['love', 'sacrifice'],
                keyInsights: ['Emotional insight'],
                quotes: ['Love quote'],
                summary: 'Second part summary'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                themes: ['war', 'peace', 'love', 'sacrifice'],
                keyInsights: ['Historical insight', 'Emotional insight', 'Combined insight'],
                quotes: ['War quote', 'Love quote', 'Final quote'],
                summary: 'Complete book summary combining all parts',
                genre: 'historical fiction',
                targetAudience: 'adults'
              })
            }
          }]
        })

      const { duration } = await measurePerformance(async () => {
        return await analyzeBookContent(largeBookContent, 'Large Test Book', 'test-book-id', 'test-user-id')
      }, 'Large book analysis')

      expect(duration).toBeLessThan(120000) // 120 seconds
      expect(mockCreate).toHaveBeenCalledTimes(3) // Chunked processing
    })
  })

  describe('Content Generation Performance', () => {
    it('should generate content for single platform quickly', async () => {
      const mockAnalysis = {
        themes: ['friendship', 'adventure'],
        keyInsights: ['Life is about connections'],
        quotes: ['A great quote'],
        chapterSummaries: [
          {
            chapterNumber: 1,
            title: 'Chapter 1',
            summary: 'Introduction to the story',
            keyPoints: ['Setting established', 'Characters introduced']
          }
        ],
        overallSummary: 'Book summary',
        genre: 'fiction',
        targetAudience: 'young adults',
        discussionPoints: ['What makes a true friend?', 'How do adventures shape us?']
      }

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              twitter: {
                content: 'Amazing book about friendship! 📚',
                hashtags: ['#books', '#reading', '#friendship'],
                characterCount: 35
              }
            })
          }
        }]
      })

      const { duration } = await measurePerformance(async () => {
        return await generateSocialContent(mockAnalysis, 'Test Book', 'test-book-id', 'test-user-id', 'Test Author', {
          platforms: ['twitter']
        })
      }, 'Single platform content generation')

      expect(duration).toBeLessThan(10000) // 10 seconds
    })

    it('should generate content for multiple platforms efficiently', async () => {
      const mockAnalysis = {
        themes: ['friendship', 'adventure'],
        keyInsights: ['Life is about connections'],
        quotes: ['A great quote'],
        chapterSummaries: [
          {
            chapterNumber: 1,
            title: 'Chapter 1',
            summary: 'Introduction to the story',
            keyPoints: ['Setting established', 'Characters introduced']
          }
        ],
        overallSummary: 'Book summary',
        genre: 'fiction',
        targetAudience: 'young adults',
        discussionPoints: ['What makes a true friend?', 'How do adventures shape us?']
      }

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              twitter: {
                content: 'Amazing book about friendship! 📚',
                hashtags: ['#books', '#reading'],
                characterCount: 35
              },
              instagram: {
                content: 'Just finished this incredible story about friendship and adventure!',
                hashtags: ['#bookstagram', '#reading', '#friendship'],
                characterCount: 65
              },
              linkedin: {
                content: 'I recently read a fascinating book that explores the themes of friendship and adventure.',
                hashtags: ['#books', '#reading', '#leadership'],
                characterCount: 95
              },
              facebook: {
                content: 'I wanted to share my thoughts on this amazing book I just finished reading...',
                hashtags: ['#books', '#reading'],
                characterCount: 85
              }
            })
          }
        }]
      })

      const { duration } = await measurePerformance(async () => {
        return await generateSocialContent(mockAnalysis, 'Test Book', 'test-book-id', 'test-user-id', 'Test Author', {
          platforms: ['twitter', 'instagram', 'linkedin', 'facebook']
        })
      }, 'Multi-platform content generation')

      expect(duration).toBeLessThan(20000) // 20 seconds
    })

    it('should generate hashtags quickly', async () => {
      const mockAnalysis = {
        themes: ['friendship', 'adventure', 'coming-of-age'],
        keyInsights: ['Life lessons about growing up'],
        quotes: ['Growing up is the hardest thing'],
        chapterSummaries: [
          {
            chapterNumber: 1,
            title: 'Chapter 1',
            summary: 'Beginning of the journey',
            keyPoints: ['Introduction', 'Character development']
          }
        ],
        overallSummary: 'A coming-of-age story',
        genre: 'young adult fiction',
        targetAudience: 'teenagers',
        discussionPoints: ['What defines growing up?', 'How do friendships change?']
      }

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              hashtags: ['#books', '#reading', '#friendship', '#adventure', '#YAFiction', '#comingofage']
            })
          }
        }]
      })

      const { duration } = await measurePerformance(async () => {
        return HashtagGenerator.generateHashtags(mockAnalysis, 'Test Book', 'Test Author', 'twitter', 'quote')
      }, 'Hashtag generation')

      expect(duration).toBeLessThan(5000) // 5 seconds
    })
  })

  describe('Concurrent AI Operations', () => {
    it('should handle multiple analysis requests concurrently', async () => {
      const bookContents = [
        createMockBookContent(5000),
        createMockBookContent(5000),
        createMockBookContent(5000)
      ]

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              themes: ['theme1', 'theme2'],
              keyInsights: ['insight1'],
              quotes: ['quote1'],
              summary: 'summary',
              genre: 'fiction',
              targetAudience: 'adults'
            })
          }
        }]
      })

      const { duration } = await measurePerformance(async () => {
        return await Promise.all(
          bookContents.map((content, index) => analyzeBookContent(content, `Test Book ${index + 1}`, `test-book-id-${index + 1}`, 'test-user-id'))
        )
      }, 'Concurrent book analysis')

      // Should not take 3x as long as single analysis
      expect(duration).toBeLessThan(45000) // 45 seconds for 3 concurrent analyses
      expect(mockCreate).toHaveBeenCalledTimes(3)
    })

    it('should handle rate limiting gracefully', async () => {
      const bookContent = createMockBookContent(5000)

      // Mock rate limit error followed by success
      mockCreate
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                themes: ['theme1'],
                keyInsights: ['insight1'],
                quotes: ['quote1'],
                summary: 'summary',
                genre: 'fiction',
                targetAudience: 'adults'
              })
            }
          }]
        })

      const { duration } = await measurePerformance(async () => {
        return await analyzeBookContent(bookContent, 'Rate Limit Test Book', 'test-book-id', 'test-user-id')
      }, 'Rate limit handling')

      // Should include retry delay but still complete reasonably quickly
      expect(duration).toBeLessThan(35000) // 35 seconds including retry
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should not cause memory leaks during analysis', async () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      const bookContents = Array.from({ length: 5 }, () => 
        createMockBookContent(10000)
      )

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              themes: ['theme1'],
              keyInsights: ['insight1'],
              quotes: ['quote1'],
              summary: 'summary',
              genre: 'fiction',
              targetAudience: 'adults'
            })
          }
        }]
      })

      // Process books sequentially to avoid overwhelming the system
      for (let i = 0; i < bookContents.length; i++) {
        await analyzeBookContent(bookContents[i], `Memory Test Book ${i + 1}`, `test-book-id-${i + 1}`, 'test-user-id')
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // Less than 50MB
    })
  })

  describe('Error Recovery Performance', () => {
    it('should recover quickly from API errors', async () => {
      const bookContent = createMockBookContent(5000)

      mockCreate
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                themes: ['theme1'],
                keyInsights: ['insight1'],
                quotes: ['quote1'],
                summary: 'summary',
                genre: 'fiction',
                targetAudience: 'adults'
              })
            }
          }]
        })

      const { duration } = await measurePerformance(async () => {
        return await analyzeBookContent(bookContent, 'Error Recovery Test Book', 'test-book-id', 'test-user-id')
      }, 'Error recovery')

      expect(duration).toBeLessThan(40000) // 40 seconds including retry
    })

    it('should timeout appropriately for hanging requests', async () => {
      const bookContent = createMockBookContent(5000)

      mockCreate.mockImplementation(() => 
        new Promise((resolve) => {
          // Never resolve to simulate hanging request
          setTimeout(() => resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  themes: ['theme1'],
                  keyInsights: ['insight1'],
                  quotes: ['quote1'],
                  summary: 'summary',
                  genre: 'fiction',
                  targetAudience: 'adults'
                })
              }
            }]
          }), 100000) // 100 seconds - should timeout before this
        })
      )

      const { duration } = await measurePerformance(async () => {
        try {
          await analyzeBookContent(bookContent, 'Timeout Test Book', 'test-book-id', 'test-user-id')
          return false
        } catch (error) {
          return true // Expected timeout
        }
      }, 'Request timeout')

      expect(duration).toBeLessThan(65000) // Should timeout within 65 seconds
    })
  })
})
