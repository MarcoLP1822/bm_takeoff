"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  User,
  Tag,
  FileText,
  Download,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Loader2
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"

interface BookDetailProps {
  bookId: string
  onBack?: () => void
}

interface AnalysisData {
  themes?: string[]
  quotes?: string[]
  summary?: string
  keyInsights?: string[]
  genre?: string
  targetAudience?: string
  chapterSummaries?: Array<{
    chapterNumber: number
    title?: string
    summary: string
    keyPoints: string[]
  }>
  overallSummary?: string
  discussionPoints?: string[]
}

interface BookDetail {
  id: string
  title: string
  author?: string
  genre?: string
  fileName: string
  fileSize?: string
  analysisStatus: "pending" | "processing" | "completed" | "failed"
  analysisData?: AnalysisData
  createdAt: string
  updatedAt: string
  hasTextContent: boolean
  textContentLength: number
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-5 w-5 text-green-600" />
    case "processing":
      return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
    case "failed":
      return <XCircle className="h-5 w-5 text-red-600" />
    default:
      return <Clock className="h-5 w-5 text-gray-600" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-200"
    case "processing":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "failed":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case "completed":
      return "Analysis Complete"
    case "processing":
      return "Analyzing Content..."
    case "failed":
      return "Analysis Failed"
    default:
      return "Pending Analysis"
  }
}

export function BookDetail({ bookId, onBack }: BookDetailProps) {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  
  const [book, setBook] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [chaptersExpanded, setChaptersExpanded] = useState(false)

  const fetchBookDetail = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/books/${bookId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Book not found")
        }
        throw new Error("Failed to fetch book details")
      }

      const data = await response.json()
      setBook(data.book)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load book details"
      )
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    fetchBookDetail()
  }, [fetchBookDetail])

  // Polling effect for analysis status
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (book?.analysisStatus === "processing") {
      interval = setInterval(() => {
        fetchBookDetail()
      }, 3000) // Poll every 3 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [book?.analysisStatus, fetchBookDetail])

  const handleStartAnalysis = async () => {
    try {
      setIsAnalyzing(true)
      setError(null)

      const response = await fetch(`/api/books/${bookId}/analyze`, {
        method: "POST"
      })

      if (!response.ok) {
        throw new Error("Failed to start analysis")
      }

      // Refresh book details to show updated status
      fetchBookDetail()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to start analysis"
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      setError(null)

      const response = await fetch(`/api/books/${bookId}/download`)

      if (!response.ok) {
        throw new Error("Failed to download file")
      }

      // Get the blob data
      const blob = await response.blob()

      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = book?.fileName || "book"
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to download file"
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const handleGenerateContent = () => {
    if (!book) return
    
    // Navigate to content generation page
    router.push(`/${locale}/dashboard/content/generate?book=${bookId}`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>

          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!book) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{book.title}</h1>
        </div>

        <div className="flex items-center space-x-2">
          {getStatusIcon(book.analysisStatus)}
          <Badge className={getStatusColor(book.analysisStatus)}>
            {getStatusText(book.analysisStatus)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Book Information */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 flex items-center text-lg font-semibold">
              <BookOpen className="mr-2 h-5 w-5" />
              Book Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Title
                </label>
                <p className="text-gray-900">{book.title}</p>
              </div>

              {book.author && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Author
                  </label>
                  <div className="flex items-center">
                    <User className="mr-1 h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{book.author}</p>
                  </div>
                </div>
              )}

              {book.genre && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Genre
                  </label>
                  <div className="flex items-center">
                    <Tag className="mr-1 h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{book.genre}</p>
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <label className="text-sm font-medium text-gray-500">
                  File Details
                </label>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <FileText className="mr-1 h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{book.fileName}</p>
                  </div>
                  {book.fileSize && (
                    <p className="text-sm text-gray-500">
                      Size: {book.fileSize}
                    </p>
                  )}
                  {book.hasTextContent && (
                    <p className="text-sm text-gray-500">
                      Text content: {book.textContentLength.toLocaleString()}{" "}
                      characters
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Uploaded
                  </label>
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-900">
                      {format(new Date(book.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(book.createdAt), {
                      addSuffix: true
                    })}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Last Updated
                  </label>
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-900">
                      {format(new Date(book.updatedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(book.updatedAt), {
                      addSuffix: true
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 flex items-center text-lg font-semibold">
              <BarChart3 className="mr-2 h-5 w-5" />
              Analysis Results
            </h2>

            {book.analysisStatus === "pending" && (
              <div className="py-8 text-center">
                <Clock className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  Analysis Not Started
                </h3>
                <p className="mb-4 text-gray-500">
                  Start analyzing this book to extract themes, quotes, and
                  insights for content generation.
                </p>
                <Button onClick={handleStartAnalysis}>Start Analysis</Button>
              </div>
            )}

            {book.analysisStatus === "processing" && (
              <div className="py-8 text-center">
                <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  Analyzing Content...
                </h3>
                <p className="text-gray-500">
                  This may take a few minutes depending on the book length.
                </p>
              </div>
            )}

            {book.analysisStatus === "failed" && (
              <div className="py-8 text-center">
                <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  Analysis Failed
                </h3>
                <p className="mb-4 text-gray-500">
                  There was an error analyzing this book. Please try again.
                </p>
                <Button onClick={handleStartAnalysis} variant="outline">
                  Retry Analysis
                </Button>
              </div>
            )}

            {book.analysisStatus === "completed" && book.analysisData && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <h4 className="mb-2 font-medium text-green-800">
                      Themes Identified
                    </h4>
                    <p className="text-2xl font-bold text-green-600">
                      {book.analysisData.themes?.length || 0}
                    </p>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <h4 className="mb-2 font-medium text-blue-800">
                      Quotes Extracted
                    </h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {book.analysisData.quotes?.length || 0}
                    </p>
                  </div>

                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                    <h4 className="mb-2 font-medium text-purple-800">
                      Key Insights
                    </h4>
                    <p className="text-2xl font-bold text-purple-600">
                      {book.analysisData.keyInsights?.length || 0}
                    </p>
                  </div>

                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <h4 className="mb-2 font-medium text-orange-800">
                      Analysis Complete
                    </h4>
                    <p className="text-2xl font-bold text-orange-600">
                      ✓
                    </p>
                  </div>
                </div>

                {book.analysisData.summary && (
                  <div>
                    <h4 className="mb-2 font-medium text-gray-900">Summary</h4>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {book.analysisData.summary}
                    </p>
                  </div>
                )}

                {book.analysisData.themes &&
                  book.analysisData.themes.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium text-gray-900">
                        Key Themes
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {book.analysisData.themes.map(
                          (theme: string, index: number) => (
                            <Badge key={index} variant="outline">
                              {theme}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {book.analysisData.quotes &&
                  book.analysisData.quotes.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium text-gray-900">
                        Key Quotes
                      </h4>
                      <div className="space-y-3">
                        {book.analysisData.quotes.slice(0, 5).map(
                          (quote: string, index: number) => (
                            <blockquote key={index} className="border-l-4 border-blue-200 bg-blue-50 p-3 text-sm italic text-gray-700">
                              "{quote}"
                            </blockquote>
                          )
                        )}
                        {book.analysisData.quotes.length > 5 && (
                          <p className="text-xs text-gray-500">
                            And {book.analysisData.quotes.length - 5} more quotes...
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                {book.analysisData.keyInsights &&
                  book.analysisData.keyInsights.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium text-gray-900">
                        Key Insights
                      </h4>
                      <ul className="space-y-2">
                        {book.analysisData.keyInsights.map(
                          (insight: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <div className="mr-2 mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-500"></div>
                              <span className="text-sm text-gray-700">{insight}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {(book.analysisData.genre || book.analysisData.targetAudience) && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {book.analysisData.genre && (
                      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                        <h4 className="mb-2 font-medium text-purple-800">
                          Genre
                        </h4>
                        <p className="text-sm text-purple-700">
                          {book.analysisData.genre}
                        </p>
                      </div>
                    )}
                    {book.analysisData.targetAudience && (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                        <h4 className="mb-2 font-medium text-orange-800">
                          Target Audience
                        </h4>
                        <p className="text-sm text-orange-700">
                          {book.analysisData.targetAudience}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {book.analysisData.chapterSummaries &&
                  book.analysisData.chapterSummaries.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium text-gray-900">
                        Chapter Summaries
                      </h4>
                      <div className="space-y-4">
                        {(chaptersExpanded 
                          ? book.analysisData.chapterSummaries 
                          : book.analysisData.chapterSummaries.slice(0, 3)
                        ).map((chapter, index: number) => (
                          <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <h5 className="mb-2 font-medium text-gray-800">
                              Chapter {chapter.chapterNumber}
                              {chapter.title && `: ${chapter.title}`}
                            </h5>
                            <p className="mb-2 text-sm text-gray-700">
                              {chapter.summary}
                            </p>
                            {chapter.keyPoints && chapter.keyPoints.length > 0 && (
                              <div>
                                <h6 className="text-xs font-medium text-gray-600 mb-1">Key Points:</h6>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {chapter.keyPoints.map((point, pointIndex) => (
                                    <li key={pointIndex} className="flex items-start">
                                      <span className="mr-1">•</span>
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                        {book.analysisData.chapterSummaries.length > 3 && (
                          <div className="flex items-center justify-between">
                            {!chaptersExpanded ? (
                              <p className="text-xs text-gray-500">
                                And {book.analysisData.chapterSummaries.length - 3} more chapters...
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500">
                                Showing all {book.analysisData.chapterSummaries.length} chapters
                              </p>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setChaptersExpanded(!chaptersExpanded)}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              {chaptersExpanded ? "Show Less" : "Show All Chapters"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {book.analysisData.discussionPoints &&
                  book.analysisData.discussionPoints.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium text-gray-900">
                        Discussion Points
                      </h4>
                      <ul className="space-y-2">
                        {book.analysisData.discussionPoints.map(
                          (point: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <div className="mr-2 mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-yellow-500"></div>
                              <span className="text-sm text-gray-700">{point}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {book.analysisData.overallSummary && (
                  <div>
                    <h4 className="mb-2 font-medium text-gray-900">Overall Summary</h4>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm leading-relaxed text-gray-700">
                        {book.analysisData.overallSummary}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {book.analysisStatus === "completed" && !book.analysisData && (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  No Analysis Data
                </h3>
                <p className="text-gray-500">
                  Analysis completed but no data was found. This might be due to
                  a processing error.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 font-semibold">Quick Actions</h3>
            <div className="space-y-2">
              {book.analysisStatus === "completed" && (
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={handleGenerateContent}
                >
                  Generate Content
                </Button>
              )}

              <Button
                className="w-full"
                variant="outline"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isDownloading ? "Downloading..." : "Download File"}
              </Button>

              {book.analysisStatus !== "processing" && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleStartAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {isAnalyzing
                    ? "Starting Analysis..."
                    : book.analysisStatus === "completed"
                      ? "Re-analyze"
                      : "Start Analysis"}
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 font-semibold">Content Generation</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Extract key quotes and insights</p>
              <p>• Generate platform-specific posts</p>
              <p>• Create engaging social content</p>
              <p>• Schedule and publish posts</p>
            </div>

            {book.analysisStatus !== "completed" && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-sm text-yellow-800">
                  Complete book analysis to unlock content generation features.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
