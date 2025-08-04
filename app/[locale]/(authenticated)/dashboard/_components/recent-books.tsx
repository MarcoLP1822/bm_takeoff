/**
 * RecentBooks Component
 * Extracted from DashboardOverview for better modularity
 */
"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Plus, ArrowRight } from "lucide-react"

interface RecentBook {
  id: string
  title: string
  author: string
  status: "analyzing" | "completed" | "error"
  progress?: number
  createdAt: string
}

interface RecentBooksProps {
  books: RecentBook[]
  loading?: boolean
  translations: {
    sections: {
      recentBooks: string
    }
    descriptions: {
      recentBooksDesc: string
    }
    buttons: {
      uploadBook: string
      viewAllBooks: string
    }
  }
}

export default function RecentBooks({ books, loading = false, translations }: RecentBooksProps) {
  if (loading) {
    return <RecentBooksSkeleton />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{translations.sections.recentBooks}</CardTitle>
          <CardDescription>
            {translations.descriptions.recentBooksDesc}
          </CardDescription>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/books?action=upload">
            <Plus className="mr-2 h-4 w-4" />
            {translations.buttons.uploadBook}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {books && books.length > 0 ? (
          <div className="space-y-4">
            {books.map(book => (
              <div
                key={book.id}
                className="bg-card flex flex-col space-y-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {book.title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    by {book.author}
                  </p>
                </div>
                <div className="flex items-center justify-between space-x-2 sm:justify-end">
                  <Badge
                    variant={
                      book.status === "completed"
                        ? "default"
                        : book.status === "analyzing"
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {book.status}
                  </Badge>
                  {book.status === "analyzing" && book.progress && (
                    <div className="flex w-16 flex-col items-end">
                      <Progress value={book.progress} className="h-2" />
                      <span className="text-muted-foreground mt-1 text-xs">
                        {book.progress}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <Button asChild variant="ghost" className="w-full">
              <Link href="/dashboard/books">
                {translations.buttons.viewAllBooks}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="py-6 text-center">
            <BookOpen className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-2 text-sm font-semibold">No books yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Upload your first book to get started with content generation.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/books?action=upload">
                <Plus className="mr-2 h-4 w-4" />
                Upload Your First Book
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentBooksSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
          </div>
          <div className="h-9 w-24 bg-gray-200 animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="flex items-center space-x-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                <div className="h-3 w-24 bg-gray-200 animate-pulse rounded" />
              </div>
              <div className="h-6 w-16 bg-gray-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
