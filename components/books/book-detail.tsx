"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTranslations } from "next-intl"
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
  Loader2,
  Sparkles
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { ContentWorkshop } from "@/components/content/content-workshop"

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

interface AnalysisProgress {
  status: "in_progress" | "completed" | "failed"
  current_step: "text_extraction" | "themes_identification" | "quotes_extraction" | "insights_generation"
  steps: {
    text_extraction: "completed" | "in_progress" | "pending" | "failed"
    themes_identification: "completed" | "in_progress" | "pending" | "failed"
    quotes_extraction: "completed" | "in_progress" | "pending" | "failed"
    insights_generation: "completed" | "in_progress" | "pending" | "failed"
  }
  started_at: string
  completed_at?: string
  error_message?: string
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
  analysisProgress?: AnalysisProgress
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

const getStepName = (step: string): string => {
  switch (step) {
    case "text_extraction":
      return "Text Extraction"
    case "themes_identification":
      return "Themes Identification"
    case "quotes_extraction":
      return "Quotes Extraction"
    case "insights_generation":
      return "Insights Generation"
    default:
      return step
  }
}

const getProgressPercentage = (progress: AnalysisProgress): number => {
  const steps = Object.values(progress.steps)
  const completedSteps = steps.filter(step => step === 'completed').length
  return (completedSteps / steps.length) * 100
}

const getStepIcon = (stepStatus: string) => {
  switch (stepStatus) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "in_progress":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <Clock className="h-4 w-4 text-gray-400" />
  }
}

export function BookDetail({ bookId, onBack }: BookDetailProps) {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('books')
  
  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t('status.analysisComplete')
      case "processing":
        return t('status.analyzingContent')
      case "failed":
        return t('status.analysisFailed')
      default:
        return t('status.pendingAnalysis')
    }
  }
  
  const [book, setBook] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [chaptersExpanded, setChaptersExpanded] = useState(false)
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)
  const [detailedProgress, setDetailedProgress] = useState<AnalysisProgress | null>(null)
  
  // Content Workshop states
  const [showWorkshop, setShowWorkshop] = useState(false)
  const [workshopSource, setWorkshopSource] = useState<{
    type: 'theme' | 'quote' | 'insight'
    content: string
  } | null>(null)

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

  // Enhanced polling with granular progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (book?.analysisStatus === "processing") {
      // Use granular status endpoint for detailed progress
      const pollGranularStatus = async () => {
        try {
          const response = await fetch(`/api/books/${bookId}/analysis/status`)
          if (response.ok) {
            const data = await response.json()
            setDetailedProgress(data.progress)
            
            // Also update book status if analysis is completed
            if (data.status === "completed" && data.analysisData) {
              setBook(prev => prev ? {
                ...prev,
                analysisStatus: "completed",
                analysisData: data.analysisData,
                analysisProgress: data.progress
              } : null)
            }
          }
        } catch (error) {
          console.error("Failed to fetch granular status:", error)
          // Fallback to regular polling
          fetchBookDetail()
        }
      }

      interval = setInterval(pollGranularStatus, 2000) // Poll every 2 seconds for more responsive UX
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [book?.analysisStatus, bookId, fetchBookDetail])

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

  const handleRegenerateSection = async (section: "themes" | "quotes" | "insights") => {
    try {
      setRegeneratingSection(section)
      setError(null)

      const response = await fetch(`/api/books/${bookId}/regenerate/${section}`, {
        method: "POST"
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to regenerate ${section}`)
      }

      const data = await response.json()
      
      // Update the book data with the new section data
      setBook(prev => {
        if (!prev || !prev.analysisData) return prev
        
        const updatedAnalysisData = {
          ...prev.analysisData,
          [section === "insights" ? "keyInsights" : section]: data.data
        }
        
        return {
          ...prev,
          analysisData: updatedAnalysisData
        }
      })

      console.log(`Successfully regenerated ${section}:`, data.data)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : `Failed to regenerate ${section}`
      )
    } finally {
      setRegeneratingSection(null)
    }
  }

  // Content Workshop functions
  const openWorkshop = (type: 'theme' | 'quote' | 'insight', content: string) => {
    setWorkshopSource({ type, content })
    setShowWorkshop(true)
  }

  const closeWorkshop = () => {
    setShowWorkshop(false)
    setWorkshopSource(null)
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
          {t('backToLibrary')}
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
            {t('backToLibrary')}
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
              {t('detail.bookInformation')}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t('detail.title')}
                </label>
                <p className="text-gray-900">{book.title}</p>
              </div>

              {book.author && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {t('detail.author')}
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
                    {t('detail.genre')}
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
                  {t('fileDetails')}
                </label>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <FileText className="mr-1 h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{book.fileName}</p>
                  </div>
                  {book.fileSize && (
                    <p className="text-sm text-gray-500">
                      {t('size')}: {book.fileSize}
                    </p>
                  )}
                  {book.hasTextContent && (
                    <p className="text-sm text-gray-500">
                      {t('textContent')}: {book.textContentLength.toLocaleString()}{" "}
                      {t('characters')}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {t('detail.uploaded')}
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
                    {t('detail.lastUpdated')}
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
              {t('detail.analysisResults')}
            </h2>

            {book.analysisStatus === "pending" && (
              <div className="py-8 text-center">
                <Clock className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  {t('detail.analysisNotStarted')}
                </h3>
                <p className="mb-4 text-gray-500">
                  {t('status.startAnalyzing')}
                </p>
                <Button onClick={handleStartAnalysis}>{t('detail.startAnalysis')}</Button>
              </div>
            )}

            {book.analysisStatus === "processing" && (
              <div className="space-y-6">
                <div className="text-center">
                  <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">
                    {t('status.analyzingContent')}
                  </h3>
                  <p className="text-gray-500">
                    {t('detail.processingTime')}
                  </p>
                </div>

                {/* Granular Progress Display */}
                {(detailedProgress || book.analysisProgress) && (
                  <div className="rounded-lg border bg-gray-50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Analysis Progress</h4>
                      <span className="text-sm text-gray-500">
                        {Math.round(getProgressPercentage(detailedProgress || book.analysisProgress!))}% Complete
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-4 h-2 rounded-full bg-gray-200">
                      <div 
                        className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                        style={{ 
                          width: `${getProgressPercentage(detailedProgress || book.analysisProgress!)}%` 
                        }}
                      />
                    </div>

                    {/* Step-by-step progress */}
                    <div className="space-y-3">
                      {Object.entries((detailedProgress || book.analysisProgress!).steps).map(([step, status]) => (
                        <div key={step} className="flex items-center space-x-3">
                          {getStepIcon(status)}
                          <span className={`text-sm ${
                            status === 'completed' ? 'text-green-700' :
                            status === 'in_progress' ? 'text-blue-700' :
                            status === 'failed' ? 'text-red-700' :
                            'text-gray-500'
                          }`}>
                            {getStepName(step)}
                          </span>
                          {status === 'in_progress' && (
                            <span className="text-xs text-blue-600">In progress...</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Error message if any */}
                    {(detailedProgress || book.analysisProgress!)?.error_message && (
                      <Alert className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {(detailedProgress || book.analysisProgress!)?.error_message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            )}

            {book.analysisStatus === "failed" && (
              <div className="py-8 text-center">
                <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  {t('status.analysisFailed')}
                </h3>
                <p className="mb-4 text-gray-500">
                  {t('status.analysisError')}
                </p>
                <Button onClick={handleStartAnalysis} variant="outline">
                  {t('detail.retryAnalysis')}
                </Button>
              </div>
            )}

            {book.analysisStatus === "completed" && book.analysisData && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <h4 className="mb-2 font-medium text-green-800">
                      {t('detail.themesIdentified')}
                    </h4>
                    <p className="text-2xl font-bold text-green-600">
                      {book.analysisData.themes?.length || 0}
                    </p>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <h4 className="mb-2 font-medium text-blue-800">
                      {t('detail.quotesExtracted')}
                    </h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {book.analysisData.quotes?.length || 0}
                    </p>
                  </div>

                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                    <h4 className="mb-2 font-medium text-purple-800">
                      {t('detail.keyInsights')}
                    </h4>
                    <p className="text-2xl font-bold text-purple-600">
                      {book.analysisData.keyInsights?.length || 0}
                    </p>
                  </div>

                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <h4 className="mb-2 font-medium text-orange-800">
                      {t('detail.analysisComplete')}
                    </h4>
                    <p className="text-2xl font-bold text-orange-600">
                      ✓
                    </p>
                  </div>
                </div>

                {book.analysisData.summary && (
                  <div>
                    <h4 className="mb-2 font-medium text-gray-900">{t('detail.summary')}</h4>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {book.analysisData.summary}
                    </p>
                  </div>
                )}

                {book.analysisData.themes &&
                  book.analysisData.themes.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          {t('detail.keyThemes')}
                        </h4>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateSection('themes')}
                            disabled={regeneratingSection === 'themes'}
                            className="text-xs"
                          >
                            {regeneratingSection === 'themes' ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-1 h-3 w-3" />
                                Regenerate
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openWorkshop('theme', book.analysisData?.themes?.[0] || '')}
                            disabled={!book.analysisData?.themes?.[0]}
                            className="text-xs"
                          >
                            <Sparkles className="mr-1 h-3 w-3" />
                            Create Content
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {book.analysisData.themes.map(
                          (theme: string, index: number) => (
                            <Badge 
                              key={index} 
                              variant="outline"
                              className="cursor-pointer hover:bg-purple-50"
                              onClick={() => openWorkshop('theme', theme)}
                            >
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
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          {t('detail.keyQuotes')}
                        </h4>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateSection('quotes')}
                            disabled={regeneratingSection === 'quotes'}
                            className="text-xs"
                          >
                            {regeneratingSection === 'quotes' ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-1 h-3 w-3" />
                                Regenerate
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openWorkshop('quote', book.analysisData?.quotes?.[0] || '')}
                            disabled={!book.analysisData?.quotes?.[0]}
                            className="text-xs"
                          >
                            <Sparkles className="mr-1 h-3 w-3" />
                            Create Content
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {book.analysisData.quotes.slice(0, 5).map(
                          (quote: string, index: number) => (
                            <blockquote 
                              key={index} 
                              className="border-l-4 border-blue-200 bg-blue-50 p-3 text-sm italic text-gray-700 cursor-pointer hover:bg-blue-100 transition-colors"
                              onClick={() => openWorkshop('quote', quote)}
                            >
                              "{quote}"
                            </blockquote>
                          )
                        )}
                        {book.analysisData.quotes.length > 5 && (
                          <p className="text-xs text-gray-500">
                            {t('detail.andMoreQuotes', { count: book.analysisData.quotes.length - 5 })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                {book.analysisData.keyInsights &&
                  book.analysisData.keyInsights.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          {t('detail.keyInsights')}
                        </h4>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateSection('insights')}
                            disabled={regeneratingSection === 'insights'}
                            className="text-xs"
                          >
                            {regeneratingSection === 'insights' ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-1 h-3 w-3" />
                                Regenerate
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openWorkshop('insight', book.analysisData?.keyInsights?.[0] || '')}
                            disabled={!book.analysisData?.keyInsights?.[0]}
                            className="text-xs"
                          >
                            <Sparkles className="mr-1 h-3 w-3" />
                            Create Content
                          </Button>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {book.analysisData.keyInsights.map(
                          (insight: string, index: number) => (
                            <li 
                              key={index} 
                              className="flex items-start cursor-pointer hover:bg-green-50 p-2 rounded transition-colors"
                              onClick={() => openWorkshop('insight', insight)}
                            >
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
                          {t('detail.genre')}
                        </h4>
                        <p className="text-sm text-purple-700">
                          {book.analysisData.genre}
                        </p>
                      </div>
                    )}
                    {book.analysisData.targetAudience && (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                        <h4 className="mb-2 font-medium text-orange-800">
                          {t('detail.targetAudience')}
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
                        {t('detail.chapterSummaries')}
                      </h4>
                      <div className="space-y-4">
                        {(chaptersExpanded 
                          ? book.analysisData.chapterSummaries 
                          : book.analysisData.chapterSummaries.slice(0, 3)
                        ).map((chapter, index: number) => (
                          <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <h5 className="mb-2 font-medium text-gray-800">
                              {t('detail.chapter')} {chapter.chapterNumber}
                              {chapter.title && `: ${chapter.title}`}
                            </h5>
                            <p className="mb-2 text-sm text-gray-700">
                              {chapter.summary}
                            </p>
                            {chapter.keyPoints && chapter.keyPoints.length > 0 && (
                              <div>
                                <h6 className="text-xs font-medium text-gray-600 mb-1">{t('detail.keyPoints')}:</h6>
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
                                {t('detail.andMoreChapters', { count: book.analysisData.chapterSummaries.length - 3 })}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500">
                                {t('detail.showingAllChapters', { count: book.analysisData.chapterSummaries.length })}
                              </p>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setChaptersExpanded(!chaptersExpanded)}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              {chaptersExpanded ? t('detail.showLess') : t('detail.showAllChapters')}
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
                        {t('detail.discussionPoints')}
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
                    <h4 className="mb-2 font-medium text-gray-900">{t('detail.overallSummary')}</h4>
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
                  {t('detail.analysisNoData')}
                </h3>
                <p className="text-gray-500">
                  {t('status.noDataFound')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 font-semibold">{t('detail.quickActions')}</h3>
            <div className="space-y-2">
              {book.analysisStatus === "completed" && (
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={handleGenerateContent}
                >
                  {t('detail.generateContent')}
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
                {isDownloading ? t('detail.downloading') : t('detail.downloadFile')}
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
                    ? t('detail.startingAnalysis')
                    : book.analysisStatus === "completed"
                      ? t('detail.reanalyze')
                      : t('detail.startAnalysis')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Workshop Modal/Overlay */}
      {showWorkshop && workshopSource && book && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <ContentWorkshop
              bookId={book.id}
              bookTitle={book.title}
              author={book.author}
              sourceType={workshopSource.type}
              sourceContent={workshopSource.content}
              onClose={closeWorkshop}
              className="p-6"
            />
          </div>
        </div>
      )}
    </div>
  )
}
