/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'
import { POST } from '../route'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'

// Mock dependencies
jest.mock('@clerk/nextjs/server')
jest.mock('@/db')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockDb = {
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockResolvedValue(undefined)
}

// Mock db as the mocked object
;(db as any) = mockDb

describe('/api/content/auto-save POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as any)

    const request = new NextRequest('http://localhost/api/content/auto-save', {
      method: 'POST',
      body: JSON.stringify({
        variationId: 'var-123',
        post: { id: 'post-1', platform: 'twitter', content: 'test' }
      })
    })
    
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 when variationId is missing', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const request = new NextRequest('http://localhost/api/content/auto-save', {
      method: 'POST',
      body: JSON.stringify({
        post: { id: 'post-1', platform: 'twitter', content: 'test' }
      })
    })
    
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Variation ID and post data are required')
  })

  it('returns 400 when post data is missing', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const request = new NextRequest('http://localhost/api/content/auto-save', {
      method: 'POST',
      body: JSON.stringify({
        variationId: 'var-123'
      })
    })
    
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Variation ID and post data are required')
  })

  it('returns 400 when post data is invalid', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const request = new NextRequest('http://localhost/api/content/auto-save', {
      method: 'POST',
      body: JSON.stringify({
        variationId: 'var-123',
        post: { id: 'post-1' } // Missing platform and content
      })
    })
    
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Platform and content are required')
  })

  it('auto-saves content successfully', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const request = new NextRequest('http://localhost/api/content/auto-save', {
      method: 'POST',
      body: JSON.stringify({
        variationId: 'var-123',
        post: {
          id: 'post-1',
          platform: 'twitter',
          content: 'Auto-saved content',
          hashtags: ['#autosave'],
          imageUrl: 'https://example.com/image.jpg'
        }
      })
    })
    
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Content auto-saved')
    expect(data.timestamp).toBeDefined()
    expect(mockDb.update).toHaveBeenCalled()
    expect(mockDb.set).toHaveBeenCalledWith({
      content: 'Auto-saved content',
      hashtags: ['#autosave'],
      imageUrl: 'https://example.com/image.jpg',
      updatedAt: expect.any(Date)
    })
  })

  it('handles database errors gracefully without throwing', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)
    mockDb.where.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/content/auto-save', {
      method: 'POST',
      body: JSON.stringify({
        variationId: 'var-123',
        post: {
          id: 'post-1',
          platform: 'twitter',
          content: 'Auto-saved content'
        }
      })
    })
    
    const response = await POST(request)
    const data = await response.json()

    // Auto-save should not return error status to avoid disrupting user experience
    expect(response.status).toBe(200)
    expect(data.success).toBe(false)
    expect(data.message).toBe('Auto-save failed')
    expect(data.timestamp).toBeDefined()
  })

  it('handles empty hashtags array', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const request = new NextRequest('http://localhost/api/content/auto-save', {
      method: 'POST',
      body: JSON.stringify({
        variationId: 'var-123',
        post: {
          id: 'post-1',
          platform: 'twitter',
          content: 'Content without hashtags',
          hashtags: []
        }
      })
    })
    
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockDb.set).toHaveBeenCalledWith({
      content: 'Content without hashtags',
      hashtags: [],
      imageUrl: undefined,
      updatedAt: expect.any(Date)
    })
  })

  it('handles missing hashtags property', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const request = new NextRequest('http://localhost/api/content/auto-save', {
      method: 'POST',
      body: JSON.stringify({
        variationId: 'var-123',
        post: {
          id: 'post-1',
          platform: 'twitter',
          content: 'Content without hashtags property'
        }
      })
    })
    
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockDb.set).toHaveBeenCalledWith({
      content: 'Content without hashtags property',
      hashtags: [],
      imageUrl: undefined,
      updatedAt: expect.any(Date)
    })
  })

  it('includes timestamp in response', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const beforeTime = new Date()

    const request = new NextRequest('http://localhost/api/content/auto-save', {
      method: 'POST',
      body: JSON.stringify({
        variationId: 'var-123',
        post: {
          id: 'post-1',
          platform: 'twitter',
          content: 'Test content'
        }
      })
    })
    
    const response = await POST(request)
    const data = await response.json()

    const afterTime = new Date()
    const responseTime = new Date(data.timestamp)

    expect(response.status).toBe(200)
    expect(responseTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
    expect(responseTime.getTime()).toBeLessThanOrEqual(afterTime.getTime())
  })
})