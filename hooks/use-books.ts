import { useState, useEffect } from "react"
import { SelectBook } from "@/db/schema"

export interface UseBookReturn {
  books: SelectBook[] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  completedBooks: SelectBook[]
  totalBooks: number
}

export function useBooks(): UseBookReturn {
  const [books, setBooks] = useState<SelectBook[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBooks = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch("/api/books")
      
      if (!response.ok) {
        throw new Error(`Failed to fetch books: ${response.status}`)
      }
      
      const data = await response.json()
      setBooks(data.books || [])
    } catch (error) {
      console.error("Error fetching books:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  const refetch = async () => {
    await fetchBooks()
  }

  const completedBooks = books?.filter(book => book.analysisStatus === "completed") || []
  const totalBooks = books?.length || 0

  return { 
    books, 
    loading, 
    error, 
    refetch, 
    completedBooks,
    totalBooks
  }
}
