"use client"

import { useState, useEffect } from "react"
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
import { ArrowLeft, Zap, BookOpen } from "lucide-react"

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

  const handleGenerateContent = (bookId: string) => {
    // For now, just redirect to content page
    // TODO: Implement actual content generation
    router.push(`/${locale}/dashboard/content?book=${bookId}&action=generate`)
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
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Content
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
