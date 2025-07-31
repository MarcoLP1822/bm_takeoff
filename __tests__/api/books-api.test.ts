/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Mock implementations with explicit typing
const mockDb = {
  select: jest.fn() as jest.MockedFunction<any>,
  insert: jest.fn() as jest.MockedFunction<any>,
  update: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>
}

jest.mock('@/db', () => ({ db: mockDb }))

const mockAuth = jest.fn() as jest.MockedFunction<any>
jest.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth
}))

const mockValidateFile = jest.fn() as jest.MockedFunction<any>
jest.mock('@/lib/file-validation', () => ({
  validateFileUpload: mockValidateFile
}))

const mockExtractTextFromFile = jest.fn() as jest.MockedFunction<any>
jest.mock('@/lib/text-extraction', () => ({
  extractTextFromFile: mockExtractTextFromFile
}))

const mockAnalyzeBookContent = jest.fn() as jest.MockedFunction<any>
jest.mock('@/lib/ai-analysis', () => ({
  analyzeBookContent: mockAnalyzeBookContent
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        remove: jest.fn()
      }))
    }
  }
}))

import { GET as getBooks } from '@/app/api/books/route'
import { POST as uploadBook } from '@/app/api/books/upload/route'
import { GET as getBook, DELETE as deleteBook } from '@/app/api/books/[bookId]/route'
import { POST as analyzeBook } from '@/app/api/books/[bookId]/analyze/route'
import { POST as extractText } from '@/app/api/books/[bookId]/extract-text/route'
import { supabase } from '@/lib/supabase'

describe('Books API Endpoints', () => {
  const mockUserId = 'user_123'
  const mockBookId = 'book_123'

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue({ userId: mockUserId })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('GET /api/books', () => {
    it('should return user books when authenticated', async () => {
      const mockBooks = [
        {
          id: 'book_1',
          title: 'Book 1',
          author: 'Author 1',
          userId: mockUserId,
          analysisStatus: 'completed',
          createdAt: new Date()
        }
      ]

      const mockWhere = (jest.fn() as any).mockResolvedValue(mockBooks)
      const mockFrom = (jest.fn() as any).mockReturnValue({ where: mockWhere })
      ;(mockDb.select as jest.MockedFunction<any>).mockReturnValue({ from: mockFrom })

      const request = new NextRequest('http://localhost:3000/api/books')
      const response = await getBooks(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.books).toBeDefined()
    })

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/books')
      const response = await getBooks(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/books/upload', () => {
    it('should upload book successfully', async () => {
      const mockFile = new File(['test content'], 'test-book.txt', { type: 'text/plain' })
      const formData = new FormData()
      formData.append('file', mockFile)
      formData.append('title', 'Test Book')
      formData.append('author', 'Test Author')

      mockValidateFile.mockResolvedValue({ isValid: true })

      const mockUpload = (jest.fn() as any).mockResolvedValue({
        data: { path: 'books/test-file-path' },
        error: null
      })
      ;(supabase.storage.from as jest.Mock).mockReturnValue({ 
        upload: mockUpload,
        remove: jest.fn()
      })

      const mockInsertData = [{
        id: mockBookId,
        title: 'Test Book',
        author: 'Test Author',
        userId: mockUserId,
        fileUrl: 'books/test-file-path',
        analysisStatus: 'pending'
      }]

      const mockReturning = (jest.fn() as any).mockResolvedValue(mockInsertData)
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning })
      mockDb.insert.mockReturnValue({ values: mockValues })

      const request = new NextRequest('http://localhost:3000/api/books/upload', {
        method: 'POST',
        body: formData
      })

      const response = await uploadBook(request)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.book.title).toBe('Test Book')
    })

    it('should reject invalid files', async () => {
      const mockFile = new File(['test'], 'test.exe', { type: 'application/exe' })
      const formData = new FormData()
      formData.append('file', mockFile)

      mockValidateFile.mockRejectedValue(new Error('Invalid file format'))

      const request = new NextRequest('http://localhost:3000/api/books/upload', {
        method: 'POST',
        body: formData
      })

      const response = await uploadBook(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/books/[bookId]', () => {
    it('should return book details for owner', async () => {
      const mockBook = {
        id: mockBookId,
        title: 'Test Book',
        author: 'Test Author',
        userId: mockUserId,
        analysisStatus: 'completed'
      }

      const mockWhere = (jest.fn() as any).mockResolvedValue([mockBook])
      const mockFrom = (jest.fn() as any).mockReturnValue({ where: mockWhere })
      mockDb.select.mockReturnValue({ from: mockFrom })

      const request = new NextRequest(`http://localhost:3000/api/books/${mockBookId}`)
      const response = await getBook(request, { params: Promise.resolve({ bookId: mockBookId }) })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.book.id).toBe(mockBookId)
    })
  })

  describe('DELETE /api/books/[bookId]', () => {
    it('should delete book and associated files', async () => {
      const mockBook = {
        id: mockBookId,
        title: 'Test Book',
        userId: mockUserId,
        fileUrl: 'books/test-file-path'
      }

      // Mock select operation
      const mockSelectWhere = (jest.fn() as any).mockResolvedValue([mockBook])
      const mockSelectFrom = (jest.fn() as any).mockReturnValue({ where: mockSelectWhere })
      mockDb.select.mockReturnValue({ from: mockSelectFrom })

      // Mock delete operation
      const mockDeleteWhere = (jest.fn() as any).mockResolvedValue([mockBook])
      mockDb.delete.mockReturnValue({ where: mockDeleteWhere })

      // Mock storage removal
      const mockRemove = (jest.fn() as any).mockResolvedValue({
        data: null,
        error: null
      })
      ;(supabase.storage.from as jest.Mock).mockReturnValue({ 
        upload: jest.fn(),
        remove: mockRemove
      })

      const request = new NextRequest(`http://localhost:3000/api/books/${mockBookId}`, {
        method: 'DELETE'
      })

      const response = await deleteBook(request, { params: Promise.resolve({ bookId: mockBookId }) })

      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/books/[bookId]/analyze', () => {
    it('should analyze book content successfully', async () => {
      const mockBook = {
        id: mockBookId,
        title: 'Test Book',
        userId: mockUserId,
        fileUrl: 'books/test-file-path',
        analysisStatus: 'pending'
      }

      // Mock select operation
      const mockSelectWhere = (jest.fn() as any).mockResolvedValue([mockBook])
      const mockSelectFrom = (jest.fn() as any).mockReturnValue({ where: mockSelectWhere })
      mockDb.select.mockReturnValue({ from: mockSelectFrom })

      mockExtractTextFromFile.mockResolvedValue({
        text: 'Extracted book content',
        metadata: { wordCount: 1000 }
      })

      const mockAnalysisResult = {
        themes: ['friendship', 'adventure'],
        keyInsights: ['Life lesson 1'],
        quotes: ['Great quote'],
        chapterSummaries: [],
        overallSummary: 'Book summary',
        genre: 'fiction',
        targetAudience: 'young adults',
        discussionPoints: ['Discussion point 1']
      }

      mockAnalyzeBookContent.mockResolvedValue(mockAnalysisResult)

      const mockUpdateResult = [{
        ...mockBook,
        analysisStatus: 'completed',
        analysisData: mockAnalysisResult
      }]

      // Mock update operation
      const mockUpdateWhere = (jest.fn() as any).mockResolvedValue(mockUpdateResult)
      const mockSet = (jest.fn() as any).mockReturnValue({ where: mockUpdateWhere })
      mockDb.update.mockReturnValue({ set: mockSet })

      const request = new NextRequest(`http://localhost:3000/api/books/${mockBookId}/analyze`, {
        method: 'POST'
      })

      const response = await analyzeBook(request, { params: Promise.resolve({ bookId: mockBookId }) })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.analysis.themes).toEqual(['friendship', 'adventure'])
    })
  })

  describe('POST /api/books/[bookId]/extract-text', () => {
    it('should extract text from book file', async () => {
      const mockBook = {
        id: mockBookId,
        userId: mockUserId,
        fileUrl: 'books/test-file-path'
      }

      const mockWhere = (jest.fn() as any).mockResolvedValue([mockBook])
      const mockFrom = (jest.fn() as any).mockReturnValue({ where: mockWhere })
      mockDb.select.mockReturnValue({ from: mockFrom })

      mockExtractTextFromFile.mockResolvedValue({
        text: 'Extracted text content',
        metadata: { wordCount: 500 }
      })

      const request = new NextRequest(`http://localhost:3000/api/books/${mockBookId}/extract-text`, {
        method: 'POST'
      })

      const response = await extractText(request, { params: Promise.resolve({ bookId: mockBookId }) })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.text).toBe('Extracted text content')
    })
  })
})
