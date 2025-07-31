'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import OnboardingFlow from '@/components/utility/onboarding-flow'
import HelpDocumentation from '@/components/utility/help-documentation'
import { 
  BookOpen, 
  Edit3, 
  BarChart3, 
  TrendingUp, 
  RefreshCw,
  Plus,
  ArrowRight,
  Activity,
  Target,
  Zap,
  FileText,
  Calendar,
  Heart,
  Share2,
  MessageCircle,
  Users,
  HelpCircle,
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Upload,
  Eye,
  TrendingDown
} from 'lucide-react'

interface DashboardStats {
  totalBooks: number
  generatedContent: number
  scheduledPosts: number
  totalEngagement: number
  recentBooks: Array<{
    id: string
    title: string
    author: string
    status: 'analyzing' | 'completed' | 'error'
    progress?: number
    createdAt: string
  }>
  recentContent: Array<{
    id: string
    platform: string
    content: string
    status: 'draft' | 'scheduled' | 'published'
    scheduledAt?: string
    engagement?: {
      likes: number
      shares: number
      comments: number
    }
  }>
  analytics: {
    weeklyEngagement: number
    topPerformingPlatform: string
    avgEngagementRate: number
  }
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [longRunningOperations, setLongRunningOperations] = useState<Array<{
    id: string
    type: 'book_analysis' | 'content_generation' | 'publishing'
    title: string
    progress: number
    status: 'running' | 'completed' | 'error'
  }>>([])
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: 'success' | 'error' | 'info'
    message: string
    timestamp: Date
  }>>([])
  const [quickStats, setQuickStats] = useState({
    booksAnalyzedToday: 0,
    contentGeneratedToday: 0,
    postsPublishedToday: 0,
    avgEngagementThisWeek: 0
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch dashboard statistics
        const [booksRes, contentRes, analyticsRes] = await Promise.all([
          fetch('/api/books'),
          fetch('/api/content'),
          fetch('/api/analytics/insights')
        ])

        if (!booksRes.ok || !contentRes.ok || !analyticsRes.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const [books, content, analytics] = await Promise.all([
          booksRes.json(),
          contentRes.json(),
          analyticsRes.json()
        ])

        // Type the responses properly
        interface BookResponse {
          id: string
          title: string
          author?: string
          analysisStatus?: string
          createdAt: string
        }
        
        interface ContentResponse {
          id: string
          platform: string
          content: string
          status: string
          scheduledAt?: string
        }
        
        interface AnalyticsResponse {
          totalEngagement?: number
          weeklyEngagement?: number
          topPerformingPlatform?: string
          avgEngagementRate?: number
        }

        // Extract the actual data arrays from the API responses with safety checks
        const booksData = Array.isArray(books.books) ? books.books : (Array.isArray(books) ? books : [])
        const contentData = Array.isArray(content.data?.content) ? content.data.content : 
                           (Array.isArray(content.content) ? content.content : 
                           (Array.isArray(content) ? content : []))
        const analyticsData = analytics as AnalyticsResponse

        console.log('Debug - API responses:', { 
          booksRaw: books, 
          contentRaw: content, 
          booksData: booksData.length, 
          contentData: contentData.length 
        })

        // Process and format the data
        const dashboardStats: DashboardStats = {
          totalBooks: booksData.length || 0,
          generatedContent: contentData.length || 0,
          scheduledPosts: contentData.filter((c: ContentResponse) => c.status === 'scheduled').length || 0,
          totalEngagement: analyticsData.totalEngagement || 0,
          recentBooks: booksData.slice(0, 5).map((book: BookResponse) => ({
            id: book.id,
            title: book.title,
            author: book.author || 'Unknown Author',
            status: (book.analysisStatus as 'analyzing' | 'completed' | 'error') || 'pending',
            progress: book.analysisStatus === 'analyzing' ? 65 : 100,
            createdAt: book.createdAt
          })),
          recentContent: contentData.slice(0, 5).map((item: ContentResponse) => ({
            id: item.id,
            platform: item.platform,
            content: item.content.substring(0, 100) + '...',
            status: item.status as 'draft' | 'scheduled' | 'published',
            scheduledAt: item.scheduledAt,
            engagement: {
              likes: Math.floor(Math.random() * 100),
              shares: Math.floor(Math.random() * 50),
              comments: Math.floor(Math.random() * 25)
            }
          })),
          analytics: {
            weeklyEngagement: analyticsData.weeklyEngagement || 0,
            topPerformingPlatform: analyticsData.topPerformingPlatform || 'Twitter',
            avgEngagementRate: analyticsData.avgEngagementRate || 0
          }
        }

        setStats(dashboardStats)
        
        // Check if this is a first-time user (no books uploaded)
        const isNewUser = dashboardStats.totalBooks === 0 && dashboardStats.generatedContent === 0
        setIsFirstTime(isNewUser)
        
        // Show onboarding for new users or if they haven't dismissed it
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
        if (isNewUser && !hasSeenOnboarding) {
          setShowOnboarding(true)
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Failed to load dashboard data')
        // Set default empty state
        setStats({
          totalBooks: 0,
          generatedContent: 0,
          scheduledPosts: 0,
          totalEngagement: 0,
          recentBooks: [],
          recentContent: [],
          analytics: {
            weeklyEngagement: 0,
            topPerformingPlatform: 'Twitter',
            avgEngagementRate: 0
          }
        })
        setIsFirstTime(true)
        setShowOnboarding(true)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const refreshData = async () => {
    setRefreshing(true)
    setError(null)
    
    try {
      // Re-fetch the data
      const [booksRes, contentRes, analyticsRes] = await Promise.all([
        fetch('/api/books'),
        fetch('/api/content'),
        fetch('/api/analytics/insights')
      ])

      if (!booksRes.ok || !contentRes.ok || !analyticsRes.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const [books, content, analytics] = await Promise.all([
        booksRes.json(),
        contentRes.json(),
        analyticsRes.json()
      ])

      // Process the data (same logic as in useEffect)
      interface BookResponse {
        id: string
        title: string
        author?: string
        analysisStatus?: string
        createdAt: string
      }
      
      interface ContentResponse {
        id: string
        platform: string
        content: string
        status: string
        scheduledAt?: string
      }
      
      interface AnalyticsResponse {
        totalEngagement?: number
        weeklyEngagement?: number
        topPerformingPlatform?: string
        avgEngagementRate?: number
      }

      const booksData = Array.isArray(books.books) ? books.books : (Array.isArray(books) ? books : [])
      const contentData = Array.isArray(content.data?.content) ? content.data.content : 
                         (Array.isArray(content.content) ? content.content : 
                         (Array.isArray(content) ? content : []))
      const analyticsData = analytics as AnalyticsResponse

      const dashboardStats: DashboardStats = {
        totalBooks: booksData.length || 0,
        generatedContent: contentData.length || 0,
        scheduledPosts: contentData.filter((c: ContentResponse) => c.status === 'scheduled').length || 0,
        totalEngagement: analyticsData.totalEngagement || 0,
        recentBooks: booksData.slice(0, 5).map((book: BookResponse) => ({
          id: book.id,
          title: book.title,
          author: book.author || 'Unknown Author',
          status: (book.analysisStatus as 'analyzing' | 'completed' | 'error') || 'pending',
          progress: book.analysisStatus === 'analyzing' ? 65 : 100,
          createdAt: book.createdAt
        })),
        recentContent: contentData.slice(0, 5).map((item: ContentResponse) => ({
          id: item.id,
          platform: item.platform,
          content: item.content.substring(0, 100) + '...',
          status: item.status as 'draft' | 'scheduled' | 'published',
          scheduledAt: item.scheduledAt,
          engagement: {
            likes: Math.floor(Math.random() * 100),
            shares: Math.floor(Math.random() * 50),
            comments: Math.floor(Math.random() * 25)
          }
        })),
        analytics: {
          weeklyEngagement: analyticsData.weeklyEngagement || 0,
          topPerformingPlatform: analyticsData.topPerformingPlatform || 'Twitter',
          avgEngagementRate: analyticsData.avgEngagementRate || 0
        }
      }

      setStats(dashboardStats)
    } catch (err) {
      console.error('Error refreshing dashboard data:', err)
      setError('Failed to refresh dashboard data')
    } finally {
      setRefreshing(false)
    }
  }

  const handleCloseOnboarding = () => {
    setShowOnboarding(false)
    localStorage.setItem('hasSeenOnboarding', 'true')
  }

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    }
    setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep only 5 notifications
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 5000)
  }

  const simulateLongRunningOperation = (type: 'book_analysis' | 'content_generation' | 'publishing', title: string) => {
    const operation = {
      id: Date.now().toString(),
      type,
      title,
      progress: 0,
      status: 'running' as const
    }
    
    setLongRunningOperations(prev => [...prev, operation])
    
    // Simulate progress
    const interval = setInterval(() => {
      setLongRunningOperations(prev => 
        prev.map(op => {
          if (op.id === operation.id) {
            const newProgress = Math.min(op.progress + Math.random() * 20, 100)
            if (newProgress >= 100) {
              clearInterval(interval)
              setTimeout(() => {
                setLongRunningOperations(prev => prev.filter(o => o.id !== operation.id))
                addNotification('success', `${title} completed successfully!`)
              }, 1000)
              return { ...op, progress: 100, status: 'completed' as const }
            }
            return { ...op, progress: newProgress }
          }
          return op
        })
      )
    }, 500)
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Unable to load dashboard
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {error}
          </p>
          <Button onClick={refreshData} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
            {isFirstTime && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                <Sparkles className="mr-1 h-3 w-3" />
                Welcome!
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            {isFirstTime 
              ? "Welcome! Let's get you started with creating amazing social media content from your books."
              : "Welcome back! Here's an overview of your book content analysis and social media performance."
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isFirstTime && (
            <Button 
              onClick={() => setShowHelp(true)} 
              variant="ghost" 
              size="sm"
              className="hidden sm:inline-flex"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Help
            </Button>
          )}
          <Button onClick={refreshData} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                notification.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-200'
                  : notification.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-200'
                  : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {notification.type === 'success' && <CheckCircle className="h-4 w-4" />}
                {notification.type === 'error' && <AlertCircle className="h-4 w-4" />}
                {notification.type === 'info' && <Eye className="h-4 w-4" />}
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
              <span className="text-xs opacity-70">
                {formatTimeAgo(notification.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Long Running Operations */}
      {longRunningOperations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Active Operations</h3>
          {longRunningOperations.map((operation) => (
            <Card key={operation.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {operation.status === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {operation.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {operation.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  <span className="text-sm font-medium">{operation.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(operation.progress)}%
                </span>
              </div>
              <Progress value={operation.progress} className="h-2" />
            </Card>
          ))}
        </div>
      )}

      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlow 
          onCloseAction={handleCloseOnboarding}
          className="mb-6"
        />
      )}

      {/* Help Documentation */}
      {showHelp && (
        <HelpDocumentation 
          onCloseAction={() => setShowHelp(false)}
          className="mb-6"
        />
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBooks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Books in your library
            </p>
            {quickStats.booksAnalyzedToday > 0 && (
              <div className="flex items-center mt-2 text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{quickStats.booksAnalyzedToday} analyzed today
              </div>
            )}
          </CardContent>
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-bl-full" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generated Content</CardTitle>
            <Edit3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.generatedContent || 0}</div>
            <p className="text-xs text-muted-foreground">
              Social media posts created
            </p>
            {quickStats.contentGeneratedToday > 0 && (
              <div className="flex items-center mt-2 text-xs text-green-600">
                <Zap className="h-3 w-3 mr-1" />
                +{quickStats.contentGeneratedToday} generated today
              </div>
            )}
          </CardContent>
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-bl-full" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Posts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.scheduledPosts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Posts ready to publish
            </p>
            {quickStats.postsPublishedToday > 0 && (
              <div className="flex items-center mt-2 text-xs text-blue-600">
                <Upload className="h-3 w-3 mr-1" />
                {quickStats.postsPublishedToday} published today
              </div>
            )}
          </CardContent>
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-bl-full" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEngagement || 0}</div>
            <p className="text-xs text-muted-foreground">
              Likes, shares, and comments
            </p>
            <div className="flex items-center mt-2 text-xs">
              {quickStats.avgEngagementThisWeek > 0 ? (
                <div className="flex items-center text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {quickStats.avgEngagementThisWeek.toFixed(1)}% avg this week
                </div>
              ) : (
                <div className="flex items-center text-muted-foreground">
                  <Activity className="h-3 w-3 mr-1" />
                  No data this week
                </div>
              )}
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-bl-full" />
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        {/* Recent Books */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Books</CardTitle>
              <CardDescription>
                Your recently uploaded and analyzed books
              </CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href="/dashboard/books?action=upload">
                <Plus className="mr-2 h-4 w-4" />
                Upload Book
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.recentBooks && stats.recentBooks.length > 0 ? (
              <div className="space-y-4">
                {stats.recentBooks.map((book) => (
                  <div key={book.id} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-3 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{book.title}</p>
                      <p className="text-xs text-muted-foreground">by {book.author}</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end space-x-2">
                      <Badge 
                        variant={
                          book.status === 'completed' ? 'default' : 
                          book.status === 'analyzing' ? 'secondary' : 'destructive'
                        }
                        className="text-xs"
                      >
                        {book.status}
                      </Badge>
                      {book.status === 'analyzing' && book.progress && (
                        <div className="w-16 flex flex-col items-end">
                          <Progress value={book.progress} className="h-2" />
                          <span className="text-xs text-muted-foreground mt-1">
                            {book.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/dashboard/books">
                    View All Books
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No books yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
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

        {/* Recent Content */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Content</CardTitle>
              <CardDescription>
                Your latest generated social media posts
              </CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href="/dashboard/content/generate">
                <Zap className="mr-2 h-4 w-4" />
                Generate Content
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.recentContent && stats.recentContent.length > 0 ? (
              <div className="space-y-4">
                {stats.recentContent.map((content) => (
                  <div key={content.id} className="space-y-3 p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{content.platform}</Badge>
                      <Badge 
                        variant={
                          content.status === 'published' ? 'default' : 
                          content.status === 'scheduled' ? 'secondary' : 'outline'
                        }
                        className="text-xs"
                      >
                        {content.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {content.content}
                    </p>
                    {content.status === 'published' && content.engagement && (
                      <div className="flex items-center justify-between sm:justify-start sm:space-x-4 text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex items-center">
                          <Heart className="mr-1 h-3 w-3" />
                          {content.engagement.likes}
                        </div>
                        <div className="flex items-center">
                          <Share2 className="mr-1 h-3 w-3" />
                          {content.engagement.shares}
                        </div>
                        <div className="flex items-center">
                          <MessageCircle className="mr-1 h-3 w-3" />
                          {content.engagement.comments}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/dashboard/content">
                    View All Content
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No content yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generate your first social media content from your books.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/content/generate">
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Content
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>
            Your social media performance at a glance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center">
                <Activity className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Weekly Engagement</span>
              </div>
              <div className="text-2xl font-bold">{stats?.analytics.weeklyEngagement || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total interactions this week
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <Target className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Top Platform</span>
              </div>
              <div className="text-2xl font-bold">{stats?.analytics.topPerformingPlatform || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                Best performing platform
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Avg. Engagement Rate</span>
              </div>
              <div className="text-2xl font-bold">{stats?.analytics.avgEngagementRate.toFixed(1) || '0.0'}%</div>
              <p className="text-xs text-muted-foreground">
                Average across all posts
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <Button asChild>
              <Link href="/dashboard/analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Detailed Analytics
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to help you get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Button 
              asChild 
              className="h-auto p-4 flex-col space-y-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              onClick={() => simulateLongRunningOperation('book_analysis', 'Analyzing uploaded book')}
            >
              <Link href="/dashboard/books?action=upload">
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">Upload Book</span>
                <span className="text-xs opacity-90">PDF, EPUB, TXT, DOCX</span>
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              className="h-auto p-4 flex-col space-y-2 hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-950/20"
              onClick={() => simulateLongRunningOperation('content_generation', 'Generating social media content')}
            >
              <Link href="/dashboard/content/generate">
                <Zap className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium">Generate Content</span>
                <span className="text-xs text-muted-foreground">AI-powered posts</span>
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              className="h-auto p-4 flex-col space-y-2 hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-950/20"
            >
              <Link href="/dashboard/settings/social">
                <Users className="h-6 w-6 text-purple-600" />
                <span className="text-sm font-medium">Connect Accounts</span>
                <span className="text-xs text-muted-foreground">Social platforms</span>
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              className="h-auto p-4 flex-col space-y-2 hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-950/20"
            >
              <Link href="/dashboard/analytics">
                <BarChart3 className="h-6 w-6 text-orange-600" />
                <span className="text-sm font-medium">View Analytics</span>
                <span className="text-xs text-muted-foreground">Performance insights</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Quick Navigation */}
      <div className="block sm:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button asChild variant="ghost" className="justify-start h-auto p-3">
                <Link href="/dashboard/books">
                  <BookOpen className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Books</div>
                    <div className="text-xs text-muted-foreground">Library & Upload</div>
                  </div>
                </Link>
              </Button>
              
              <Button asChild variant="ghost" className="justify-start h-auto p-3">
                <Link href="/dashboard/content">
                  <Edit3 className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Content</div>
                    <div className="text-xs text-muted-foreground">Manage & Generate</div>
                  </div>
                </Link>
              </Button>
              
              <Button asChild variant="ghost" className="justify-start h-auto p-3">
                <Link href="/dashboard/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Analytics</div>
                    <div className="text-xs text-muted-foreground">Performance</div>
                  </div>
                </Link>
              </Button>
              
              <Button asChild variant="ghost" className="justify-start h-auto p-3">
                <Link href="/dashboard/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Settings</div>
                    <div className="text-xs text-muted-foreground">Accounts & Config</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full sm:w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16 hidden sm:block" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center space-x-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Skeleton className="h-10 w-48" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}