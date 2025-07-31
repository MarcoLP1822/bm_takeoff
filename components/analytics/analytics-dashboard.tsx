"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  Heart, 
  Share2, 
  MessageCircle,
  Clock,
  RefreshCw,
  Calendar,
  Filter,
  Search,
  X,
  SortAsc,
  SortDesc
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { 
  PostPerformance, 
  PlatformComparison, 
  ThemePerformance, 
  AnalyticsInsights,
  OptimalPostingTime 
} from "@/lib/analytics-service"

interface AnalyticsDashboardProps {
  className?: string
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null)
  const [posts, setPosts] = useState<PostPerformance[]>([])
  const [platforms, setPlatforms] = useState<PlatformComparison[]>([])
  const [themes, setThemes] = useState<ThemePerformance[]>([])
  const [optimalTimes, setOptimalTimes] = useState<OptimalPostingTime[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [selectedBook, setSelectedBook] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('publishedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [minEngagementRate, setMinEngagementRate] = useState<string>('')
  const [maxEngagementRate, setMaxEngagementRate] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  // Available filter options
  const [availableBooks, setAvailableBooks] = useState<{ id: string; title: string; author?: string }[]>([])
  const availablePlatforms = ['twitter', 'instagram', 'linkedin', 'facebook']

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Build query parameters for posts
      const postsParams = new URLSearchParams({
        limit: '50',
        sortBy,
        sortOrder
      })
      
      if (searchQuery.trim()) postsParams.append('search', searchQuery.trim())
      if (selectedPlatform) postsParams.append('platform', selectedPlatform)
      if (selectedBook) postsParams.append('bookId', selectedBook)
      if (minEngagementRate) postsParams.append('minEngagementRate', minEngagementRate)
      if (maxEngagementRate) postsParams.append('maxEngagementRate', maxEngagementRate)
      if (startDate) postsParams.append('startDate', startDate)
      if (endDate) postsParams.append('endDate', endDate)
      
      const [insightsRes, postsRes, platformsRes, themesRes, timesRes] = await Promise.all([
        fetch("/api/analytics/insights"),
        fetch(`/api/analytics/posts?${postsParams.toString()}`),
        fetch("/api/analytics/platforms"),
        fetch("/api/analytics/themes"),
        fetch("/api/analytics/optimal-times")
      ])

      const [insightsData, postsData, platformsData, themesData, timesData] = await Promise.all([
        insightsRes.json(),
        postsRes.json(),
        platformsRes.json(),
        themesRes.json(),
        timesRes.json()
      ])

      if (insightsData.success) setInsights(insightsData.data)
      if (postsData.success) {
        setPosts(postsData.data)
        if (postsData.filters?.books) {
          setAvailableBooks(postsData.filters.books)
        }
      }
      if (platformsData.success) setPlatforms(platformsData.data)
      if (themesData.success) setThemes(themesData.data)
      if (timesData.success) setOptimalTimes(timesData.data)
    } catch (error) {
      console.error("Failed to load analytics data:", error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedPlatform, selectedBook, sortBy, sortOrder, minEngagementRate, maxEngagementRate, startDate, endDate])

  useEffect(() => {
    loadAnalyticsData()
  }, [loadAnalyticsData])

  const updateAnalytics = async () => {
    try {
      setUpdating(true)
      const response = await fetch("/api/analytics/update", { method: "POST" })
      
      if (response.ok) {
        await loadAnalyticsData()
      }
    } catch (error) {
      console.error("Failed to update analytics:", error)
    } finally {
      setUpdating(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatPercentage = (num: number) => `${num.toFixed(1)}%`

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "twitter": return "𝕏"
      case "instagram": return "📷"
      case "linkedin": return "💼"
      case "facebook": return "📘"
      default: return "📱"
    }
  }

  const getDayName = (dayOfWeek: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    return days[dayOfWeek]
  }

  const formatTime = (hour: number) => {
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:00 ${ampm}`
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedPlatform('')
    setSelectedBook('')
    setMinEngagementRate('')
    setMaxEngagementRate('')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters = searchQuery.trim() || selectedPlatform || selectedBook || 
    minEngagementRate || maxEngagementRate || startDate || endDate

  const toggleSortOrder = () => {
    setSortOrder(current => current === 'asc' ? 'desc' : 'asc')
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <Button 
          onClick={updateAnalytics} 
          disabled={updating}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${updating ? "animate-spin" : ""}`} />
          {updating ? "Updating..." : "Update Analytics"}
        </Button>
      </div>

      {/* Overview Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.totalPosts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(insights.totalEngagement)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Engagement Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(insights.avgEngagementRate)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Platform</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <span className="mr-2">{getPlatformIcon(insights.bestPerformingPlatform)}</span>
                {insights.bestPerformingPlatform}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Trends */}
      {insights?.recentTrends && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Trends</CardTitle>
            <CardDescription>{insights.recentTrends.period}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Engagement Rate:</span>
                <Badge variant={insights.recentTrends.engagementChange >= 0 ? "default" : "destructive"}>
                  {insights.recentTrends.engagementChange >= 0 ? "+" : ""}
                  {formatPercentage(insights.recentTrends.engagementChange)}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Impressions:</span>
                <Badge variant={insights.recentTrends.impressionsChange >= 0 ? "default" : "destructive"}>
                  {insights.recentTrends.impressionsChange >= 0 ? "+" : ""}
                  {formatPercentage(insights.recentTrends.impressionsChange)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="platforms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="platforms">Platform Performance</TabsTrigger>
          <TabsTrigger value="themes">Theme Analysis</TabsTrigger>
          <TabsTrigger value="timing">Optimal Times</TabsTrigger>
          <TabsTrigger value="posts">Recent Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platforms.map((platform) => (
              <Card key={platform.platform}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{getPlatformIcon(platform.platform)}</span>
                    <span className="capitalize">{platform.platform}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Posts:</span>
                    <span className="font-medium">{platform.totalPosts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Engagement Rate:</span>
                    <span className="font-medium">{formatPercentage(platform.avgEngagementRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Impressions:</span>
                    <span className="font-medium">{formatNumber(platform.totalImpressions)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Likes:</span>
                    <span className="font-medium">{formatNumber(platform.totalLikes)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="themes" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {themes.slice(0, 10).map((theme, index) => (
              <Card key={theme.theme}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>#{index + 1} {theme.theme}</span>
                    <Badge>{theme.postCount} posts</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Avg Engagement Rate:</span>
                      <span className="font-medium">{formatPercentage(theme.avgEngagementRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Engagement:</span>
                      <span className="font-medium">{formatNumber(theme.totalEngagement)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {theme.platforms.map((platform) => (
                        <Badge key={platform.platform} variant="outline">
                          {getPlatformIcon(platform.platform)} {formatPercentage(platform.avgEngagementRate)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Best Posting Times</span>
              </CardTitle>
              <CardDescription>
                Based on historical engagement data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {optimalTimes.slice(0, 12).map((time, index) => (
                  <div key={`${time.platform}-${time.dayOfWeek}-${time.hour}`} 
                       className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {getPlatformIcon(time.platform)} {time.platform}
                      </span>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getDayName(time.dayOfWeek)} at {formatTime(time.hour)}
                    </div>
                    <div className="text-sm font-medium">
                      {formatPercentage(time.avgEngagementRate)} engagement
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Based on {time.postCount} posts
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          {/* Advanced Filtering for Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filter Posts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Basic Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="All platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All platforms</SelectItem>
                    {availablePlatforms.map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        {getPlatformIcon(platform)} {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedBook} onValueChange={setSelectedBook}>
                  <SelectTrigger>
                    <SelectValue placeholder="All books" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All books</SelectItem>
                    {availableBooks.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title} {book.author && `by ${book.author}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Min Engagement Rate (%)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minEngagementRate}
                    onChange={(e) => setMinEngagementRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Max Engagement Rate (%)</label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={maxEngagementRate}
                    onChange={(e) => setMaxEngagementRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Sort Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Sort by:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publishedAt">Published Date</SelectItem>
                      <SelectItem value="engagementRate">Engagement Rate</SelectItem>
                      <SelectItem value="impressions">Impressions</SelectItem>
                      <SelectItem value="likes">Likes</SelectItem>
                      <SelectItem value="shares">Shares</SelectItem>
                      <SelectItem value="comments">Comments</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSortOrder}
                  >
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
                
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  
                  {searchQuery.trim() && (
                    <Badge variant="secondary" className="gap-1">
                      Search: "{searchQuery}"
                      <button onClick={() => setSearchQuery('')} className="ml-1 hover:bg-muted-foreground/20 rounded">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {selectedPlatform && (
                    <Badge variant="secondary" className="gap-1">
                      Platform: {selectedPlatform}
                      <button onClick={() => setSelectedPlatform('')} className="ml-1 hover:bg-muted-foreground/20 rounded">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {selectedBook && (
                    <Badge variant="secondary" className="gap-1">
                      Book: {availableBooks.find(b => b.id === selectedBook)?.title}
                      <button onClick={() => setSelectedBook('')} className="ml-1 hover:bg-muted-foreground/20 rounded">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {(minEngagementRate || maxEngagementRate) && (
                    <Badge variant="secondary" className="gap-1">
                      Engagement: {minEngagementRate || '0'}% - {maxEngagementRate || '100'}%
                      <button onClick={() => { setMinEngagementRate(''); setMaxEngagementRate('') }} className="ml-1 hover:bg-muted-foreground/20 rounded">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {(startDate || endDate) && (
                    <Badge variant="secondary" className="gap-1">
                      Date: {startDate || 'Start'} - {endDate || 'End'}
                      <button onClick={() => { setStartDate(''); setEndDate('') }} className="ml-1 hover:bg-muted-foreground/20 rounded">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.contentId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <span>{getPlatformIcon(post.platform)}</span>
                      <span>{post.bookTitle}</span>
                    </CardTitle>
                    <Badge variant="outline">
                      {formatPercentage(post.analytics.engagementRate || 0)}
                    </Badge>
                  </div>
                  <CardDescription>
                    Published {new Date(post.publishedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4 line-clamp-3">{post.content}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{formatNumber(post.analytics.impressions)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4" />
                      <span>{formatNumber(post.analytics.likes)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Share2 className="h-4 w-4" />
                      <span>{formatNumber(post.analytics.shares)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{formatNumber(post.analytics.comments)}</span>
                    </div>
                  </div>
                  {post.themes && post.themes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {post.themes.slice(0, 3).map((theme) => (
                        <Badge key={theme} variant="secondary" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}