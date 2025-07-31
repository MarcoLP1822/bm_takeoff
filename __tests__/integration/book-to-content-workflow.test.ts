import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type { BookAnalysisResult } from '@/lib/ai-analysis'
import type { TextExtractionResult } from '@/lib/text-extraction'

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
    set: jest.fn().mockReturnThis()
  }
}))

// Mock AI analysis
jest.mock('@/lib/ai-analysis', () => ({
  analyzeBookContent: jest.fn()
}))

// Mock content generation
jest.mock('@/lib/content-generation', () => ({
  generateSocialContent: jest.fn()
}))

// Mock file processing
jest.mock('@/lib/text-extraction', () => ({
  extractTextFromFile: jest.fn()
}))

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn()
    }
  }
}))

import { POST as uploadBook } from '@/app/api/books/upload/route'
import { POST as analyzeBook } from '@/app/api/books/[bookId]/analyze/route'
import { POST as generateContent } from '@/app/api/content/generate/route'
import { db } from '@/db'
import { analyzeBookContent } from '@/lib/ai-analysis'
import { generateSocialContent } from '@/lib/content-generation'
import { extractTextFromFile } from '@/lib/text-extraction'
import { supabase } from '@/lib/supabase'

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockAnalyzeBookContent = analyzeBookContent as jest.MockedFunction<typeof analyzeBookContent>
const mockGenerateSocialContent = generateSocialContent as jest.MockedFunction<typeof generateSocialContent>
const mockExtractTextFromFile = extractTextFromFile as jest.MockedFunction<typeof extractTextFromFile>

describe('Book to Content Generation Workflow Integration', () => {
  const mockUserId = 'user_123'
  const mockBookId = 'book_123'

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue({ 
      userId: mockUserId,
      sessionClaims: {},
      sessionId: 'session_123',
      sessionStatus: 'active',
      actor: undefined,
      orgId: undefined,
      orgRole: undefined,
      orgSlug: undefined,
      has: jest.fn(),
      debug: jest.fn(),
      isAuthenticated: true,
      getToken: jest.fn(),
      tokenType: 'session_token',
      redirectToSignIn: jest.fn(),
      redirectToSignUp: jest.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should complete full workflow from book upload to content generation', async () => {
    // Step 1: Upload book
    const mockFile = new File(['Test book content'], 'test-book.txt', { type: 'text/plain' })
    const formData = new FormData()
    formData.append('file', mockFile)
    formData.append('title', 'Test Book')
    formData.append('author', 'Test Author')

    const uploadRequest = new NextRequest('http://localhost:3000/api/books/upload', {
      method: 'POST',
      body: formData
    })

    // Mock database insert for book upload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockDbInsert = db.insert as jest.MockedFunction<any>
    mockDbInsert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{
          id: mockBookId,
          title: 'Test Book',
          author: 'Test Author',
          userId: mockUserId,
          fileUrl: 'test-file-url',
          analysisStatus: 'pending'
        }] as never)
      })
    })

    // Mock Supabase upload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSupabaseUpload = supabase.storage.from('books').upload as jest.MockedFunction<any>
    mockSupabaseUpload.mockResolvedValue({
      data: { path: 'test-file-path' },
      error: null
    })

    const uploadResponse = await uploadBook(uploadRequest)
    const uploadResult = await uploadResponse.json()

    expect(uploadResponse.status).toBe(201)
    expect(uploadResult.book.id).toBe(mockBookId)
    expect(uploadResult.book.title).toBe('Test Book')

    // Step 2: Analyze book
    mockExtractTextFromFile.mockResolvedValue({
      text: 'Extracted book content for analysis',
      metadata: {
        wordCount: 1000
      }
    })
    
    const mockAnalysisResult = {
      themes: ['friendship', 'adventure'],
      keyInsights: ['Life is about connections', 'Adventure awaits those who seek it'],
      quotes: ['A great quote from the book'],
      chapterSummaries: [
        {
          chapterNumber: 1,
          title: 'Chapter 1',
          summary: 'The beginning of the story',
          keyPoints: ['Introduction', 'Character development']
        }
      ],
      overallSummary: 'A wonderful story about friendship and adventure',
      genre: 'fiction',
      targetAudience: 'young adults',
      discussionPoints: ['What makes a good friend?', 'How do adventures change us?']
    }
    
    mockAnalyzeBookContent.mockResolvedValue(mockAnalysisResult)

    // Mock database update for analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockDbUpdate = db.update as jest.MockedFunction<any>
    mockDbUpdate.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{
          id: mockBookId,
          analysisStatus: 'completed',
          analysisData: mockAnalysisResult
        }] as never)
      })
    })

    const analyzeRequest = new NextRequest(`http://localhost:3000/api/books/${mockBookId}/analyze`, {
      method: 'POST'
    })

    const analyzeResponse = await analyzeBook(analyzeRequest, { params: { bookId: mockBookId } })
    const analysisResult = await analyzeResponse.json()

    expect(analyzeResponse.status).toBe(200)
    expect(analysisResult.analysis.themes).toEqual(['friendship', 'adventure'])
    expect(mockAnalyzeBookContent).toHaveBeenCalledWith('Extracted book content for analysis')

    // Step 3: Generate content
    const mockGeneratedContent = [
      {
        id: 'variation_1',
        posts: [
          {
            id: 'post_1',
            platform: 'twitter' as const,
            content: 'Just finished reading an amazing book about friendship! 📚',
            hashtags: ['#books', '#reading', '#friendship'],
            characterCount: 65,
            isValid: true,
            validationErrors: []
          }
        ],
        theme: 'friendship',
        sourceType: 'theme' as const,
        sourceContent: 'The story explores deep themes of friendship'
      },
      {
        id: 'variation_2',
        posts: [
          {
            id: 'post_2',
            platform: 'instagram' as const,
            content: 'Diving into this incredible story about friendship and adventure! The characters are so relatable and the plot keeps you hooked from start to finish.',
            hashtags: ['#bookstagram', '#reading', '#friendship', '#adventure'],
            characterCount: 145,
            isValid: true,
            validationErrors: []
          }
        ],
        theme: 'adventure',
        sourceType: 'theme' as const,
        sourceContent: 'Adventure awaits those who seek it'
      }
    ]

    mockGenerateSocialContent.mockResolvedValue(mockGeneratedContent)

    // Mock database select for book data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockDbSelect = db.select as jest.MockedFunction<any>
    mockDbSelect.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{
          id: mockBookId,
          title: 'Test Book',
          author: 'Test Author',
          analysisData: mockAnalysisResult
        }] as never)
      })
    })

    const generateRequest = new NextRequest('http://localhost:3000/api/content/generate', {
      method: 'POST',
      body: JSON.stringify({
        bookId: mockBookId,
        platforms: ['twitter', 'instagram']
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const generateResponse = await generateContent(generateRequest)
    const contentResult = await generateResponse.json()

    expect(generateResponse.status).toBe(200)
    expect(contentResult.content.twitter.content).toContain('friendship')
    expect(contentResult.content.instagram.hashtags).toContain('#bookstagram')
    expect(mockGenerateSocialContent).toHaveBeenCalledWith(mockAnalysisResult, ['twitter', 'instagram'])

    // Verify the complete workflow
    expect(mockExtractTextFromFile).toHaveBeenCalled()
    expect(mockAnalyzeBookContent).toHaveBeenCalled()
    expect(mockGenerateSocialContent).toHaveBeenCalled()
  })

  it('should handle errors gracefully throughout the workflow', async () => {
    // Test upload failure
    const mockFile = new File(['Test content'], 'test.txt', { type: 'text/plain' })
    const formData = new FormData()
    formData.append('file', mockFile)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSupabaseUpload = supabase.storage.from('books').upload as jest.MockedFunction<any>
    mockSupabaseUpload.mockResolvedValue({
      data: null,
      error: { message: 'Upload failed' }
    })

    const uploadRequest = new NextRequest('http://localhost:3000/api/books/upload', {
      method: 'POST',
      body: formData
    })

    const uploadResponse = await uploadBook(uploadRequest)
    expect(uploadResponse.status).toBe(500)

    // Test analysis failure
    mockExtractTextFromFile.mockRejectedValue(new Error('Text extraction failed'))

    const analyzeRequest = new NextRequest(`http://localhost:3000/api/books/${mockBookId}/analyze`, {
      method: 'POST'
    })

    const analyzeResponse = await analyzeBook(analyzeRequest, { params: { bookId: mockBookId } })
    expect(analyzeResponse.status).toBe(500)

    // Test content generation failure
    mockGenerateSocialContent.mockRejectedValue(new Error('Content generation failed'))

    const generateRequest = new NextRequest('http://localhost:3000/api/content/generate', {
      method: 'POST',
      body: JSON.stringify({
        bookId: mockBookId,
        platforms: ['twitter']
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const generateResponse = await generateContent(generateRequest)
    expect(generateResponse.status).toBe(500)
  })

  it('should maintain data consistency across workflow steps', async () => {
    const bookData = {
      id: mockBookId,
      title: 'Consistency Test Book',
      author: 'Test Author',
      userId: mockUserId
    }

    // Mock database operations to track data flow
    const mockDbOperations = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      insertedBook: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updatedAnalysis: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      insertedContent: [] as any[]
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockDbInsert = db.insert as jest.MockedFunction<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDbInsert.mockImplementation((table: any) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      values: jest.fn().mockImplementation((data: any) => {
        if (data.title) {
          mockDbOperations.insertedBook = data
        } else if (data.content) {
          mockDbOperations.insertedContent.push(data)
        }
        return {
          returning: jest.fn().mockResolvedValue([{ ...bookData, ...data }] as never)
        }
      })
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockDbUpdate = db.update as jest.MockedFunction<any>
    mockDbUpdate.mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set: jest.fn().mockImplementation((data: any) => {
        mockDbOperations.updatedAnalysis = data
        return {
          where: jest.fn().mockResolvedValue([{ ...bookData, ...data }] as never)
        }
      })
    })

    // Simulate workflow steps
    const analysisData: BookAnalysisResult = {
      themes: ['consistency'],
      quotes: ['Quote 1', 'Quote 2'],
      keyInsights: ['Insight 1', 'Insight 2'],
      chapterSummaries: [
        {
          chapterNumber: 1,
          title: 'Introduction',
          summary: 'Chapter 1 summary',
          keyPoints: ['Point 1', 'Point 2']
        },
        {
          chapterNumber: 2,
          title: 'Main Content',
          summary: 'Chapter 2 summary',
          keyPoints: ['Point 3', 'Point 4']
        }
      ],
      overallSummary: 'Overall summary of the book',
      discussionPoints: ['Point 1', 'Point 2'],
      targetAudience: 'General readers',
      genre: 'Non-fiction'
    }

    mockAnalyzeBookContent.mockResolvedValue(analysisData)
    mockExtractTextFromFile.mockResolvedValue({
      text: 'Book content',
      metadata: {
        pages: 100,
        wordCount: 10000
      }
    })

    // Verify data consistency
    expect(mockDbOperations.insertedBook?.userId).toBe(mockUserId)
    expect(mockDbOperations.updatedAnalysis?.analysisData).toEqual(analysisData)
  })
})