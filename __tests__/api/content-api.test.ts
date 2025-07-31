/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn()
}))

// Mock database
jest.mock('@/db', () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    eq: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis()
  },
  generatedContent: {},
  books: {},
  eq: jest.fn()
}))

// Mock content generation
jest.mock('@/lib/content-generation', () => ({
  generateSocialContent: jest.fn()
}))

// Mock content optimization
jest.mock('@/lib/content-optimization', () => ({
  optimizeContent: jest.fn()
}))

import { GET as getContent } from '@/app/api/content/route'
import { POST as generateContent } from '@/app/api/content/generate/route'
import { GET as getBookContent } from '@/app/api/content/book/[bookId]/route'
import { GET as getContentById, PUT as updateContent, DELETE as deleteContent } from '@/app/api/content/[contentId]/route'
import { POST as saveContent } from '@/app/api/content/save/route'
import { POST as autoSaveContent } from '@/app/api/content/auto-save/route'
import { GET as getVariations } from '@/app/api/content/variations/route'
import { PUT as updateVariation, DELETE as deleteVariation } from '@/app/api/content/variations/[variationId]/route'
import { db, eq } from '@/db'
import { generateSocialContent } from '@/lib/content-generation'
import { optimizeContent } from '@/lib/content-optimization'

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockGenerateSocialContent = generateSocialContent as jest.MockedFunction<typeof generateSocialContent>
const mockOptimizeContent = optimizeContent as jest.MockedFunction<typeof optimizeContent>

describe('Content API Endpoints', () => {
  const mockUserId = 'user_123'
  const mockBookId = 'book_123'
  const mockContentId = 'content_123'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(mockAuth as jest.MockedFunction<any>).mockResolvedValue({ userId: mockUserId })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('GET /api/content', () => {
    it('should return user content with filtering', async () => {
      const mockContent = [
        {
          id: 'content_1',
          bookId: mockBookId,
          userId: mockUserId,
          platform: 'twitter',
          content: 'Tweet content',
          status: 'draft',
          createdAt: new Date()
        },
        {
          id: 'content_2',
          bookId: mockBookId,
          userId: mockUserId,
          platform: 'instagram',
          content: 'Instagram content',
          status: 'published',
          createdAt: new Date()
        }
      ]

      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue(mockContent)
        })
      })

      const request = new NextRequest('http://localhost:3000/api/content?platform=twitter&status=draft')
      const response = await getContent(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.content).toHaveLength(2)
    })

    it('should require authentication', async () => {
      ;(mockAuth as jest.MockedFunction<any>).mockResolvedValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/content')
      const response = await getContent(request)

      expect(response.status).toBe(401)
    })

    it('should handle database errors', async () => {
      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockRejectedValue(new Error('Database error'))
        })
      })

      const request = new NextRequest('http://localhost:3000/api/content')
      const response = await getContent(request)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/content/generate', () => {
    it('should generate content for specified platforms', async () => {
      const mockBook = {
        id: mockBookId,
        title: 'Test Book',
        userId: mockUserId,
        analysisData: {
          themes: ['friendship', 'adventure'],
          keyInsights: ['Life lesson'],
          quotes: ['Great quote'],
          summary: 'Book summary'
        }
      }

      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue([mockBook])
        })
      })

      const mockGeneratedContent = {
        twitter: {
          content: 'Amazing book about friendship! 📚',
          hashtags: ['#books', '#reading'],
          characterCount: 35
        },
        instagram: {
          content: 'Just finished this incredible story!',
          hashtags: ['#bookstagram', '#reading'],
          characterCount: 35
        }
      }

      ;(mockGenerateSocialContent as jest.MockedFunction<any>).mockResolvedValue(mockGeneratedContent)

      const mockDbInsert = db.insert as jest.MockedFunction<any>
      mockDbInsert.mockReturnValue({
        values: (jest.fn() as any).mockReturnValue({
          returning: (jest.fn() as any).mockResolvedValue([
            {
              id: 'content_1',
              bookId: mockBookId,
              platform: 'twitter',
              content: mockGeneratedContent.twitter.content,
              hashtags: mockGeneratedContent.twitter.hashtags
            },
            {
              id: 'content_2',
              bookId: mockBookId,
              platform: 'instagram',
              content: mockGeneratedContent.instagram.content,
              hashtags: mockGeneratedContent.instagram.hashtags
            }
          ])
        })
      })

      const request = new NextRequest('http://localhost:3000/api/content/generate', {
        method: 'POST',
        body: JSON.stringify({
          bookId: mockBookId,
          platforms: ['twitter', 'instagram']
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await generateContent(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.content.twitter.content).toContain('friendship')
      expect(result.content.instagram.hashtags).toContain('#bookstagram')
      expect(mockGenerateSocialContent).toHaveBeenCalledWith(mockBook.analysisData, ['twitter', 'instagram'])
    })

    it('should handle missing book analysis', async () => {
      const mockBook = {
        id: mockBookId,
        userId: mockUserId,
        analysisData: null
      }

      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue([mockBook])
        })
      })

      const request = new NextRequest('http://localhost:3000/api/content/generate', {
        method: 'POST',
        body: JSON.stringify({
          bookId: mockBookId,
          platforms: ['twitter']
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await generateContent(request)

      expect(response.status).toBe(400)
    })

    it('should handle content generation failures', async () => {
      const mockBook = {
        id: mockBookId,
        userId: mockUserId,
        analysisData: { themes: ['test'] }
      }

      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue([mockBook])
        })
      })

      ;(mockGenerateSocialContent as jest.MockedFunction<any>).mockRejectedValue(new Error('Generation failed'))

      const request = new NextRequest('http://localhost:3000/api/content/generate', {
        method: 'POST',
        body: JSON.stringify({
          bookId: mockBookId,
          platforms: ['twitter']
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await generateContent(request)

      expect(response.status).toBe(500)
    })
  })

  describe('GET /api/content/[bookId]', () => {
    it('should return content for specific book', async () => {
      const mockContent = [
        {
          id: 'content_1',
          bookId: mockBookId,
          userId: mockUserId,
          platform: 'twitter',
          content: 'Tweet about book'
        }
      ]

      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue(mockContent)
        })
      })

      const request = new NextRequest(`http://localhost:3000/api/content/${mockBookId}`)
      const response = await getBookContent(request, { params: { bookId: mockBookId } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.content).toHaveLength(1)
      expect(result.content[0].bookId).toBe(mockBookId)
    })

    it('should return empty array for book with no content', async () => {
      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue([])
        })
      })

      const request = new NextRequest(`http://localhost:3000/api/content/${mockBookId}`)
      const response = await getBookContent(request, { params: { bookId: mockBookId } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.content).toHaveLength(0)
    })
  })

  describe('PUT /api/content/[contentId]', () => {
    it('should update content successfully', async () => {
      const mockContent = {
        id: mockContentId,
        userId: mockUserId,
        platform: 'twitter',
        content: 'Original content',
        hashtags: ['#books']
      }

      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue([mockContent])
        })
      })

      const mockDbUpdate = db.update as jest.MockedFunction<any>
      mockDbUpdate.mockReturnValue({
        set: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue([{
            ...mockContent,
            content: 'Updated content',
            hashtags: ['#books', '#reading']
          }])
        })
      })

      const request = new NextRequest(`http://localhost:3000/api/content/${mockContentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          content: 'Updated content',
          hashtags: ['#books', '#reading']
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await updateContent(request, { params: { contentId: mockContentId } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.content.content).toBe('Updated content')
    })

    it('should return 403 for unauthorized update', async () => {
      const mockContent = {
        id: mockContentId,
        userId: 'other_user_123'
      }

      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue([mockContent])
        })
      })

      const request = new NextRequest(`http://localhost:3000/api/content/${mockContentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          content: 'Updated content'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await updateContent(request, { params: { contentId: mockContentId } })

      expect(response.status).toBe(403)
    })
  })

  describe('DELETE /api/content/[contentId]', () => {
    it('should delete content successfully', async () => {
      const mockContent = {
        id: mockContentId,
        userId: mockUserId
      }

      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue([mockContent])
        })
      })

      const mockDbDelete = db.delete as jest.MockedFunction<any>
      mockDbDelete.mockReturnValue({
        where: (jest.fn() as any).mockResolvedValue([mockContent])
      })

      const request = new NextRequest(`http://localhost:3000/api/content/${mockContentId}`, {
        method: 'DELETE'
      })

      const response = await deleteContent(request, { params: { contentId: mockContentId } })

      expect(response.status).toBe(200)
    })

    it('should return 404 for non-existent content', async () => {
      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue([])
        })
      })

      const request = new NextRequest(`http://localhost:3000/api/content/${mockContentId}`, {
        method: 'DELETE'
      })

      const response = await deleteContent(request, { params: { contentId: mockContentId } })

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/content/save', () => {
    it('should save content with validation', async () => {
      const contentData = {
        bookId: mockBookId,
        platform: 'twitter' as const,
        content: 'New tweet content',
        hashtags: ['#books', '#reading']
      }

      const mockDbInsert = db.insert as jest.MockedFunction<any>
      mockDbInsert.mockReturnValue({
        values: (jest.fn() as any).mockReturnValue({
          returning: (jest.fn() as any).mockResolvedValue([{
            id: mockContentId,
            userId: mockUserId,
            ...contentData
          }])
        })
      })

      const request = new NextRequest('http://localhost:3000/api/content/save', {
        method: 'POST',
        body: JSON.stringify(contentData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await saveContent(request)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.content.content).toBe('New tweet content')
    })

    it('should validate character limits', async () => {
      const contentData = {
        bookId: mockBookId,
        platform: 'twitter' as const,
        content: 'A'.repeat(300), // Exceeds Twitter limit
        hashtags: ['#books']
      }

      const request = new NextRequest('http://localhost:3000/api/content/save', {
        method: 'POST',
        body: JSON.stringify(contentData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await saveContent(request)

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/content/auto-save', () => {
    it('should auto-save content changes', async () => {
      const mockContent = {
        id: mockContentId,
        userId: mockUserId,
        content: 'Original content'
      }

      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue([mockContent])
        })
      })

      const mockDbUpdate = db.update as jest.MockedFunction<any>
      mockDbUpdate.mockReturnValue({
        set: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockResolvedValue([{
            ...mockContent,
            content: 'Auto-saved content'
          }])
        })
      })

      const request = new NextRequest('http://localhost:3000/api/content/auto-save', {
        method: 'POST',
        body: JSON.stringify({
          contentId: mockContentId,
          content: 'Auto-saved content'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await autoSaveContent(request)

      expect(response.status).toBe(200)
    })

    it('should handle auto-save failures gracefully', async () => {
      const mockDbSelect = db.select as jest.MockedFunction<any>
      mockDbSelect.mockReturnValue({
        from: (jest.fn() as any).mockReturnValue({
          where: (jest.fn() as any).mockRejectedValue(new Error('Database error'))
        })
      })

      const request = new NextRequest('http://localhost:3000/api/content/auto-save', {
        method: 'POST',
        body: JSON.stringify({
          contentId: mockContentId,
          content: 'Auto-saved content'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await autoSaveContent(request)

      expect(response.status).toBe(500)
    })
  })

  describe('Content Variations API', () => {
    describe('GET /api/content/variations', () => {
      it('should return content variations', async () => {
        const mockVariations = [
          {
            id: 'var_1',
            contentId: mockContentId,
            content: 'Variation 1',
            platform: 'twitter'
          },
          {
            id: 'var_2',
            contentId: mockContentId,
            content: 'Variation 2',
            platform: 'twitter'
          }
        ]

        const mockDbSelect = db.select as jest.MockedFunction<any>
        mockDbSelect.mockReturnValue({
          from: (jest.fn() as any).mockReturnValue({
            where: (jest.fn() as any).mockResolvedValue(mockVariations)
          })
        })

        const request = new NextRequest(`http://localhost:3000/api/content/variations?contentId=${mockContentId}`)
        const response = await getVariations(request)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.variations).toHaveLength(2)
      })
    })
  })
})