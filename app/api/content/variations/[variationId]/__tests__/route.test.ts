/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'

// Mock dependencies
jest.mock('@clerk/nextjs/server')
jest.mock('@/db')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockDb = {
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  returning: jest.fn()
}

// Mock db as the mocked object
;(db as any) = mockDb

describe('/api/content/variations/[variationId] PUT', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as any)

    const request = new NextRequest('http://localhost/api/content/variations/var-123', {
      method: 'PUT',
      body: JSON.stringify({ post: { id: 'post-1', platform: 'twitter', content: 'test' } })
    })
    
    const response = await PUT(request, { params: { variationId: 'var-123' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 when post data is missing', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const request = new NextRequest('http://localhost/api/content/variations/var-123', {
      method: 'PUT',
      body: JSON.stringify({})
    })
    
    const response = await PUT(request, { params: { variationId: 'var-123' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Post data is required')
  })

  it('returns 400 when post data is invalid', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const request = new NextRequest('http://localhost/api/content/variations/var-123', {
      method: 'PUT',
      body: JSON.stringify({ post: { id: 'post-1' } }) // Missing platform and content
    })
    
    const response = await PUT(request, { params: { variationId: 'var-123' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Platform and content are required')
  })

  it('updates content successfully', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const updatedContent = {
      id: 'post-1',
      content: 'Updated content',
      hashtags: ['#updated'],
      imageUrl: 'https://example.com/image.jpg',
      updatedAt: new Date()
    }

    mockDb.returning.mockResolvedValue([updatedContent])

    const request = new NextRequest('http://localhost/api/content/variations/var-123', {
      method: 'PUT',
      body: JSON.stringify({
        post: {
          id: 'post-1',
          platform: 'twitter',
          content: 'Updated content',
          hashtags: ['#updated'],
          imageUrl: 'https://example.com/image.jpg'
        }
      })
    })
    
    const response = await PUT(request, { params: { variationId: 'var-123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(updatedContent)
    expect(mockDb.update).toHaveBeenCalled()
    expect(mockDb.set).toHaveBeenCalledWith({
      content: 'Updated content',
      hashtags: ['#updated'],
      imageUrl: 'https://example.com/image.jpg',
      updatedAt: expect.any(Date)
    })
  })

  it('returns 404 when content is not found', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)
    mockDb.returning.mockResolvedValue([]) // No content found

    const request = new NextRequest('http://localhost/api/content/variations/var-123', {
      method: 'PUT',
      body: JSON.stringify({
        post: {
          id: 'post-1',
          platform: 'twitter',
          content: 'Updated content'
        }
      })
    })
    
    const response = await PUT(request, { params: { variationId: 'var-123' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Content not found or unauthorized')
  })

  it('handles database errors gracefully', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)
    mockDb.returning.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/content/variations/var-123', {
      method: 'PUT',
      body: JSON.stringify({
        post: {
          id: 'post-1',
          platform: 'twitter',
          content: 'Updated content'
        }
      })
    })
    
    const response = await PUT(request, { params: { variationId: 'var-123' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to update content')
  })
})

describe('/api/content/variations/[variationId] DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as any)

    const request = new NextRequest('http://localhost/api/content/variations/var-123', {
      method: 'DELETE'
    })
    
    const response = await DELETE(request, { params: { variationId: 'var-123' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('deletes content variation successfully', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)

    const deletedContent = [{ id: 'var-123' }]
    mockDb.returning.mockResolvedValue(deletedContent)

    const request = new NextRequest('http://localhost/api/content/variations/var-123', {
      method: 'DELETE'
    })
    
    const response = await DELETE(request, { params: { variationId: 'var-123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Content variation deleted successfully')
    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('returns 404 when content variation is not found', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)
    mockDb.returning.mockResolvedValue([]) // No content found

    const request = new NextRequest('http://localhost/api/content/variations/var-123', {
      method: 'DELETE'
    })
    
    const response = await DELETE(request, { params: { variationId: 'var-123' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Content variation not found or unauthorized')
  })

  it('handles database errors gracefully', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' } as any)
    mockDb.returning.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/content/variations/var-123', {
      method: 'DELETE'
    })
    
    const response = await DELETE(request, { params: { variationId: 'var-123' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to delete content variation')
  })
})