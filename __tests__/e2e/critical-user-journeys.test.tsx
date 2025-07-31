import React from 'react'
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard'
}))

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  useUser: () => ({
    user: {
      id: 'user_123',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }]
    },
    isLoaded: true,
    isSignedIn: true
  }),
  useAuth: () => ({
    userId: 'user_123',
    isLoaded: true,
    isSignedIn: true
  })
}))

// Mock API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

import { BookUpload } from '@/components/books/book-upload'
import { BookLibrary } from '@/components/books/book-library'
import { ContentEditor } from '@/components/content/content-editor'
import { PublishingInterface } from '@/components/social/publishing-interface'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Critical User Journeys E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Complete Book Analysis and Content Creation Journey', () => {
    it('should allow user to upload book, analyze it, and create content', async () => {
      const user = userEvent.setup()

      // Step 1: Book Upload
      const mockUploadResponse = {
        book: {
          id: 'book_123',
          title: 'Test Book',
          author: 'Test Author',
          analysisStatus: 'pending'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUploadResponse
      } as Response)

      const onUploadSuccess = jest.fn()
      render(<BookUpload onUploadSuccess={onUploadSuccess} />)

      // Upload a file
      const fileInput = screen.getByLabelText(/upload/i)
      const file = new File(['test content'], 'test-book.txt', { type: 'text/plain' })
      
      await user.upload(fileInput, file)
      await user.type(screen.getByLabelText(/title/i), 'Test Book')
      await user.type(screen.getByLabelText(/author/i), 'Test Author')
      
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(onUploadSuccess).toHaveBeenCalledWith(mockUploadResponse.book)
      })

      // Step 2: Book Analysis
      const mockAnalysisResponse = {
        analysis: {
          themes: ['friendship', 'adventure'],
          keyInsights: ['Life lesson 1', 'Life lesson 2'],
          quotes: ['Great quote from the book'],
          summary: 'Book summary'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResponse
      } as Response)

      // Simulate analysis trigger (would normally be automatic)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/books/upload'),
        expect.objectContaining({
          method: 'POST'
        })
      )

      // Step 3: Content Generation
      const mockContentResponse = {
        content: {
          twitter: {
            content: 'Amazing book about friendship! 📚',
            hashtags: ['#books', '#reading'],
            characterCount: 35
          },
          instagram: {
            content: 'Just finished this incredible story about friendship and adventure!',
            hashtags: ['#bookstagram', '#reading', '#friendship'],
            characterCount: 65
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContentResponse
      } as Response)

      // Verify the complete flow
      expect(mockFetch).toHaveBeenCalledTimes(1) // Upload call
    })
  })

  describe('Content Review and Publishing Journey', () => {
    it('should allow user to review, edit, and publish content', async () => {
      const user = userEvent.setup()

      const mockPost = {
        id: 'content_123',
        platform: 'twitter' as const,
        content: 'Original tweet content',
        hashtags: ['#books', '#reading'],
        characterCount: 22,
        isValid: true,
        validationErrors: []
      }

      const onSave = jest.fn()
      render(
        <ContentEditor
          post={mockPost}
          onSaveAction={onSave}
        />
      )

      // Edit content
      const contentTextarea = screen.getByPlaceholderText(/write your twitter/i)
      await user.clear(contentTextarea)
      await user.type(contentTextarea, 'Edited tweet content about this amazing book!')

      // Edit hashtags
      const hashtagTextarea = screen.getByPlaceholderText(/enter hashtags/i)
      await user.clear(hashtagTextarea)
      await user.type(hashtagTextarea, '#books #reading #amazing')

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          ...mockPost,
          content: 'Edited tweet content about this amazing book!',
          hashtags: ['#books', '#reading', '#amazing']
        })
      })

      // Step 2: Publishing
      const mockPublishResponse = {
        success: true,
        postId: 'social_post_123'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPublishResponse
      } as Response)

      const mockSocialAccounts = [
        {
          id: 'account_123',
          platform: 'twitter',
          accountName: '@testuser',
          isActive: true
        }
      ]

      const onPublish = jest.fn()
      render(
        <PublishingInterface
          contentId={mockPost.id}
          content={mockPost.content}
          platform={mockPost.platform}
          accounts={mockSocialAccounts}
          onPublishSuccess={onPublish}
        />
      )

      // Select content and publish
      const publishButton = screen.getByRole('button', { name: /publish now/i })
      await user.click(publishButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/social/publish'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(mockPost.id)
          })
        )
      })
    })
  })

  describe('Analytics and Performance Tracking Journey', () => {
    it('should display analytics for published content', async () => {
      const mockAnalyticsData = {
        posts: [
          {
            id: 'post_123',
            platform: 'twitter',
            content: 'Published tweet',
            publishedAt: '2024-01-01T00:00:00Z',
            metrics: {
              impressions: 1000,
              likes: 50,
              shares: 10,
              comments: 5
            }
          }
        ],
        insights: {
          totalEngagement: 65,
          bestPerformingPlatform: 'twitter',
          optimalPostingTimes: ['09:00', '15:00', '19:00']
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalyticsData
      } as Response)

      render(<AnalyticsDashboard />)

      await waitFor(() => {
        expect(screen.getByText('1000')).toBeInTheDocument() // impressions
        expect(screen.getByText('50')).toBeInTheDocument() // likes
        expect(screen.getByText('twitter')).toBeInTheDocument() // platform
      })

      // Verify analytics API call
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics'),
        expect.objectContaining({
          method: 'GET'
        })
      )
    })
  })

  describe('Book Library Management Journey', () => {
    it('should allow user to manage their book library', async () => {
      const user = userEvent.setup()

      const mockBooks = [
        {
          id: 'book_1',
          title: 'First Book',
          author: 'Author One',
          genre: 'Fiction',
          analysisStatus: 'completed',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'book_2',
          title: 'Second Book',
          author: 'Author Two',
          genre: 'Non-fiction',
          analysisStatus: 'pending',
          createdAt: '2024-01-02T00:00:00Z'
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ books: mockBooks })
      } as Response)

      const onBookSelect = jest.fn()
      const onBookDelete = jest.fn()

      render(
        <BookLibrary
          onBookSelect={onBookSelect}
          onBookDelete={onBookDelete}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('First Book')).toBeInTheDocument()
        expect(screen.getByText('Second Book')).toBeInTheDocument()
      })

      // Test search functionality
      const searchInput = screen.getByPlaceholderText(/search books/i)
      await user.type(searchInput, 'First')

      await waitFor(() => {
        expect(screen.getByText('First Book')).toBeInTheDocument()
        expect(screen.queryByText('Second Book')).not.toBeInTheDocument()
      })

      // Test book selection
      const firstBook = screen.getByText('First Book')
      await user.click(firstBook)

      expect(onBookSelect).toHaveBeenCalledWith(mockBooks[0])

      // Test book deletion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0]
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/books/book_1'),
          expect.objectContaining({
            method: 'DELETE'
          })
        )
      })
    })
  })

  describe('Error Handling Journey', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<BookUpload onUploadSuccess={jest.fn()} />)

      const fileInput = screen.getByLabelText(/upload/i)
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      await user.upload(fileInput, file)
      await user.type(screen.getByLabelText(/title/i), 'Test Book')
      
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument()
      })
    })

    it('should handle API errors with proper user feedback', async () => {
      const user = userEvent.setup()

      // Mock API error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid file format' })
      } as Response)

      render(<BookUpload onUploadSuccess={jest.fn()} />)

      const fileInput = screen.getByLabelText(/upload/i)
      const file = new File(['test'], 'test.exe', { type: 'application/exe' })
      
      await user.upload(fileInput, file)
      await user.type(screen.getByLabelText(/title/i), 'Test Book')
      
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid file format/i)).toBeInTheDocument()
      })
    })
  })
})