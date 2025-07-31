/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'

// Mock dependencies
jest.mock('@clerk/nextjs/server')
jest.mock('@/db')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis()
}

// Mock db as the mocked object
;(db as any) = mockDb

describe('/api/content/variations GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as any)

    const request = new NextRequest('http://localhost/api/content/variations')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('fetches content variations successfully', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const mockContentWithBooks = [
      {
        content: {
          id: 'content-1',
          bookId: 'book-1',
          userId: 'user-123',
          platform: 'twitter',
          contentType: 'post',
          content: 'Great quote from a book!',
          hashtags: ['#books', '#reading'],
          imageUrl: null,
          status: 'draft',
          scheduledAt: null,
          publishedAt: null,
          socialPostId: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        book: {
          id: 'book-1',
          title: 'Test Book',
          author: 'Test Author',
          genre: 'Fiction'
        }
      }
    ]

    mockDb.offset.mockResolvedValue(mockContentWithBooks)

    const request = new NextRequest('http://localhost/api/content/variations')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.variations).toHaveLength(1)
    expect(data.data.variations[0].bookTitle).toBe('Test Book')
    expect(data.data.variations[0].posts).toHaveLength(1)
    expect(data.data.variations[0].posts[0].content).toBe('Great quote from a book!')
  })

  it('applies book filter when bookId is provided', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)
    mockDb.offset.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/content/variations?bookId=book-123')
    await GET(request)

    expect(mockDb.where).toHaveBeenCalled()
  })

  it('applies platform filter when platform is provided', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)
    mockDb.offset.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/content/variations?platform=twitter')
    await GET(request)

    expect(mockDb.where).toHaveBeenCalled()
  })

  it('applies status filter when status is provided', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)
    mockDb.offset.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/content/variations?status=published')
    await GET(request)

    expect(mockDb.where).toHaveBeenCalled()
  })

  it('applies limit and offset for pagination', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)
    mockDb.offset.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/content/variations?limit=10&offset=20')
    await GET(request)

    expect(mockDb.limit).toHaveBeenCalledWith(10)
    expect(mockDb.offset).toHaveBeenCalledWith(20)
  })

  it('uses default limit and offset when not provided', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)
    mockDb.offset.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/content/variations')
    await GET(request)

    expect(mockDb.limit).toHaveBeenCalledWith(50)
    expect(mockDb.offset).toHaveBeenCalledWith(0)
  })

  it('handles database errors gracefully', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)
    mockDb.offset.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/content/variations')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch content variations')
  })

  it('validates content correctly for different platforms', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const longContent = 'a'.repeat(300) // Exceeds Twitter limit
    const mockContentWithBooks = [
      {
        content: {
          id: 'content-1',
          bookId: 'book-1',
          userId: 'user-123',
          platform: 'twitter',
          contentType: 'post',
          content: longContent,
          hashtags: [],
          imageUrl: null,
          status: 'draft',
          scheduledAt: null,
          publishedAt: null,
          socialPostId: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        book: {
          id: 'book-1',
          title: 'Test Book',
          author: 'Test Author',
          genre: 'Fiction'
        }
      }
    ]

    mockDb.offset.mockResolvedValue(mockContentWithBooks)

    const request = new NextRequest('http://localhost/api/content/variations')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.variations[0].posts[0].isValid).toBe(false)
    expect(data.data.variations[0].posts[0].validationErrors).toContain(
      expect.stringContaining('Content exceeds 280 character limit')
    )
  })

  it('extracts themes from content correctly', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const mockContentWithBooks = [
      {
        content: {
          id: 'content-1',
          bookId: 'book-1',
          userId: 'user-123',
          platform: 'twitter',
          contentType: 'post',
          content: 'This book taught me about love and relationships',
          hashtags: [],
          imageUrl: null,
          status: 'draft',
          scheduledAt: null,
          publishedAt: null,
          socialPostId: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        book: {
          id: 'book-1',
          title: 'Test Book',
          author: 'Test Author',
          genre: 'Fiction'
        }
      }
    ]

    mockDb.offset.mockResolvedValue(mockContentWithBooks)

    const request = new NextRequest('http://localhost/api/content/variations')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.variations[0].theme).toBe('Love & Emotion')
  })

  it('groups content variations correctly', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const mockContentWithBooks = [
      {
        content: {
          id: 'content-1',
          bookId: 'book-1',
          userId: 'user-123',
          platform: 'twitter',
          contentType: 'post',
          content: 'First post',
          hashtags: [],
          imageUrl: null,
          status: 'draft',
          scheduledAt: null,
          publishedAt: null,
          socialPostId: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        book: {
          id: 'book-1',
          title: 'Test Book',
          author: 'Test Author',
          genre: 'Fiction'
        }
      },
      {
        content: {
          id: 'content-2',
          bookId: 'book-1',
          userId: 'user-123',
          platform: 'instagram',
          contentType: 'post',
          content: 'Second post',
          hashtags: [],
          imageUrl: null,
          status: 'draft',
          scheduledAt: null,
          publishedAt: null,
          socialPostId: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02')
        },
        book: {
          id: 'book-1',
          title: 'Test Book',
          author: 'Test Author',
          genre: 'Fiction'
        }
      }
    ]

    mockDb.offset.mockResolvedValue(mockContentWithBooks)

    const request = new NextRequest('http://localhost/api/content/variations')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.variations).toHaveLength(2) // Each content item becomes its own variation
    expect(data.data.total).toBe(2)
  })
})