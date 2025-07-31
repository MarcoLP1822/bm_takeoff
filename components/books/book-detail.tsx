'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
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
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

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
}

interface BookDetail {
  id: string
  title: string
  author?: string
  genre?: string
  fileName: string
  fileSize?: string
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed'
  analysisData?: AnalysisData
  createdAt: string
  updatedAt: string
  hasTextContent: boolean
  textContentLength: number
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-600" />
    case 'processing':
      return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-600" />
    default:
      return <Clock className="h-5 w-5 text-gray-600" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Analysis Complete'
    case 'processing':
      return 'Analyzing Content...'
    case 'failed':
      return 'Analysis Failed'
    default:
      return 'Pending Analysis'
  }
}

export function BookDetail({ bookId, onBack }: BookDetailProps) {
  const [book, setBook] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const fetchBookDetail = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/books/${bookId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Book not found')
        }
        throw new Error('Failed to fetch book details')
      }
      
      const data = await response.json()
      setBook(data.book)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load book details')
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
    
    if (book?.analysisStatus === 'processing') {
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
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to start analysis')
      }
      
      // Refresh book details to show updated status
      fetchBookDetail()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start analysis')
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
        throw new Error('Failed to download file')
      }
      
      // Get the blob data
      const blob = await response.blob()
      
      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = book?.fileName || 'book'
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to download file')
    } finally {
      setIsDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <ArrowLeft className="h-4 w-4 mr-2" />
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
            <ArrowLeft className="h-4 w-4 mr-2" />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Book Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Book Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="text-gray-900">{book.title}</p>
              </div>
              
              {book.author && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Author</label>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1 text-gray-400" />
                    <p className="text-gray-900">{book.author}</p>
                  </div>
                </div>
              )}
              
              {book.genre && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Genre</label>
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 mr-1 text-gray-400" />
                    <p className="text-gray-900">{book.genre}</p>
                  </div>
                </div>
              )}
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">File Details</label>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-gray-400" />
                    <p className="text-gray-900">{book.fileName}</p>
                  </div>
                  {book.fileSize && (
                    <p className="text-sm text-gray-500">Size: {book.fileSize}</p>
                  )}
                  {book.hasTextContent && (
                    <p className="text-sm text-gray-500">
                      Text content: {book.textContentLength.toLocaleString()} characters
                    </p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Uploaded</label>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    <p className="text-sm text-gray-900">
                      {format(new Date(book.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(book.createdAt), { addSuffix: true })}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    <p className="text-sm text-gray-900">
                      {format(new Date(book.updatedAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(book.updatedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Analysis Results
            </h2>
            
            {book.analysisStatus === 'pending' && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Not Started</h3>
                <p className="text-gray-500 mb-4">
                  Start analyzing this book to extract themes, quotes, and insights for content generation.
                </p>
                <Button onClick={handleStartAnalysis}>
                  Start Analysis
                </Button>
              </div>
            )}
            
            {book.analysisStatus === 'processing' && (
              <div className="text-center py-8">
                <RefreshCw className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Content...</h3>
                <p className="text-gray-500">
                  This may take a few minutes depending on the book length.
                </p>
              </div>
            )}
            
            {book.analysisStatus === 'failed' && (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Failed</h3>
                <p className="text-gray-500 mb-4">
                  There was an error analyzing this book. Please try again.
                </p>
                <Button onClick={handleStartAnalysis} variant="outline">
                  Retry Analysis
                </Button>
              </div>
            )}
            
            {book.analysisStatus === 'completed' && book.analysisData && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Themes Identified</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {book.analysisData.themes?.length || 0}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Quotes Extracted</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {book.analysisData.quotes?.length || 0}
                    </p>
                  </div>
                </div>
                
                {book.analysisData.summary && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {book.analysisData.summary}
                    </p>
                  </div>
                )}
                
                {book.analysisData.themes && book.analysisData.themes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Key Themes</h4>
                    <div className="flex flex-wrap gap-2">
                      {book.analysisData.themes.map((theme: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {book.analysisStatus === 'completed' && !book.analysisData && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Data</h3>
                <p className="text-gray-500">
                  Analysis completed but no data was found. This might be due to a processing error.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {book.analysisStatus === 'completed' && (
                <Button className="w-full" variant="default">
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isDownloading ? 'Downloading...' : 'Download File'}
              </Button>
              
              {book.analysisStatus !== 'processing' && (
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={handleStartAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {isAnalyzing 
                    ? 'Starting Analysis...' 
                    : (book.analysisStatus === 'completed' ? 'Re-analyze' : 'Start Analysis')
                  }
                </Button>
              )}
            </div>
          </div>
          
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Content Generation</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Extract key quotes and insights</p>
              <p>• Generate platform-specific posts</p>
              <p>• Create engaging social content</p>
              <p>• Schedule and publish posts</p>
            </div>
            
            {book.analysisStatus !== 'completed' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
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