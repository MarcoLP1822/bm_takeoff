"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { ArrowLeft, Zap, BookOpen, Loader2 } from "lucide-react"

interface Book {
  id: string
  title: string
  author?: string
  genre?: string
  fileName: string
  fileSize?: string
  analysisStatus: "pending" | "processing" | "completed" | "failed"
  createdAt: string
  updatedAt: string
}

export default function ContentGeneratePage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  useEffect(() => {
    fetchBooks()
  }, [])

  const handleGenerateContent = useCallback(async (bookId: string) => {
    try {
      setIsGenerating(true)
      setError(null)

      // Create abort controller for timeout
      const controller = new AbortController()
      setAbortController(controller)
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes timeout

      // Call the content generation API
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          bookId,
          options: {
            platforms: ['twitter', 'instagram'], // Reduced platforms for faster generation
            variationsPerTheme: 1, // Single variation for faster generation
            includeImages: false, // Disabled images for faster generation
            tone: 'inspirational'
          }
        }),
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate content')
      }

      const result = await response.json()
      
      // Redirect to content management page with success message
      router.push(`/${locale}/dashboard/content?generated=true`)
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Content generation timed out after 5 minutes. Try again with fewer platforms or content types.')
      } else {
        console.error('Error generating content:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate content'
        setError(`Generation failed: ${errorMessage}. Try again with fewer options.`)
      }
    } finally {
      setIsGenerating(false)
      setAbortController(null)
    }
  }, [router, locale])

  const handleCancelGeneration = () => {
    if (abortController) {
      abortController.abort()
      setIsGenerating(false)
      setAbortController(null)
      setError('Content generation was cancelled.')
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/books")

      if (!response.ok) {
        throw new Error("Failed to fetch books")
      }

      const data = await response.json()
      const booksData = data.books || data || []
      setBooks(
        booksData.filter((book: Book) => book.analysisStatus === "completed")
      )
    } catch (err) {
      console.error("Error fetching books:", err)
      setError("Failed to load books")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push(`/${locale}/dashboard/content`)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
            <p className="text-muted-foreground mt-2">Loading books...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Content
        </Button>

        <div className="flex items-center">
          <Zap className="mr-3 h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Generate Content
            </h1>
            <p className="mt-2 text-gray-600">
              Create social media content from your analyzed books
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {isGenerating && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Loader2 className="mr-3 h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">Generating content...</p>
                <p className="text-sm text-blue-600">This may take 3-5 minutes. Please wait.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelGeneration}
              className="text-red-600 hover:text-red-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {books.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">
              No books ready for content generation
            </h3>
            <p className="text-muted-foreground mb-4 text-center">
              Upload and analyze books first to generate social media content
              from them.
            </p>
            <Button
              onClick={() => router.push(`/${locale}/dashboard/books?action=upload`)}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Upload Your First Book
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {books.map(book => (
            <Card key={book.id} className="relative">
              <CardHeader>
                <CardTitle className="line-clamp-2 text-lg">
                  {book.title}
                </CardTitle>
                <CardDescription>
                  {book.author && `by ${book.author}`}
                  {book.genre && ` • ${book.genre}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-muted-foreground text-sm">
                    <p>File: {book.fileName}</p>
                    {book.fileSize && <p>Size: {book.fileSize}</p>}
                    <p>
                      Uploaded: {new Date(book.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleGenerateContent(book.id)}
                    className="w-full"
                    disabled={isGenerating}
                    variant="outline"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Generate Content
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
