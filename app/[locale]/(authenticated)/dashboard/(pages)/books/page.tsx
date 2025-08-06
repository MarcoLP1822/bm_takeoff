"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { BookUpload } from "@/components/books/book-upload"
import { BookLibrary } from "@/components/books/book-library"
import { BookDetail } from "@/components/books/book-detail"
import { Button } from "@/components/ui/button"
import { Plus, BookOpen } from "lucide-react"

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

export default function BooksPage() {
  const searchParams = useSearchParams()
  const t = useTranslations('books')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Check if we should auto-open upload form
  useEffect(() => {
    const shouldShowUpload =
      searchParams?.get("action") === "upload" ||
      searchParams?.get("upload") === "true"
    if (shouldShowUpload) {
      setShowUpload(true)
    }
  }, [searchParams])

  const handleUploadSuccess = (book: Book) => {
    setShowUpload(false)
    setRefreshTrigger(prev => prev + 1)
  }

  const handleUploadError = (error: string) => {
    console.error("Upload error:", error)
  }

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book)
  }

  const handleBookDelete = async (bookId: string) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete book")
      }

      // If the deleted book is currently selected, clear selection
      if (selectedBook?.id === bookId) {
        setSelectedBook(null)
      }

      // Trigger refresh to update the book list
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error("Error deleting book:", error)
      // You might want to show a toast notification here
      alert(
        `${t('deleteError')}: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  const handleBookRename = async (bookId: string, title: string, author?: string) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, author }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to rename book")
      }

      // Update the selected book if it's the one being renamed
      if (selectedBook?.id === bookId) {
        setSelectedBook({ ...selectedBook, title, author })
      }

      // Trigger refresh to update the book list
      setRefreshTrigger(prev => prev + 1)
      
      // Show success message
      alert(t('renameSuccess'))
    } catch (error) {
      console.error("Error renaming book:", error)
      alert(
        `${t('renameError')}: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  const handleBackToLibrary = () => {
    setSelectedBook(null)
  }

  if (selectedBook) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BookDetail bookId={selectedBook.id} onBack={handleBackToLibrary} />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-bold text-gray-900">
            <BookOpen className="mr-3 h-8 w-8" />
            {t('library')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('libraryDescription')}
          </p>
        </div>

        <Button onClick={() => setShowUpload(!showUpload)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('upload')}
        </Button>
      </div>

      {showUpload && (
        <div className="mb-8">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold">{t('addNew')}</h2>
            <BookUpload
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white p-6">
        <BookLibrary
          onBookSelect={handleBookSelect}
          onBookDelete={handleBookDelete}
          onBookRename={handleBookRename}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  )
}
