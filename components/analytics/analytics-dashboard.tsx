"use client"

import { useState, useEffect, useCallback } from "react"
import { useFormatter } from "next-intl"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
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
  SortDesc,
  Lightbulb,
  Target,
  TrendingDown,
  CheckCircle
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import type {
  PostPerformance,
  PlatformComparison,
  ThemePerformance,
  AnalyticsInsights,
  OptimalPostingTime
} from "@/lib/analytics-service"
import ContentRecommendations from "./content-recommendations"

// Helper functions for actionable insights
const getEngagementRateExplanation = (rate: number) => {
  if (rate > 3) return "🎉 Eccellente! Il tuo engagement è molto sopra la media. Continua con questa strategia!"
  if (rate > 2) return "👍 Buono! Un engagement rate superiore al 2% è considerato positivo."
  if (rate > 1) return "📈 Nella media. Prova a utilizzare più domande e call-to-action nei tuoi post."
  return "⚠️ Sotto la media. Considera di migliorare il timing e il tipo di contenuti."
}

const getReachExplanation = (reach: number, previousReach: number) => {
  const change = previousReach > 0 ? ((reach - previousReach) / previousReach) * 100 : 0
  if (change > 20) return `🚀 Ottima crescita del ${change.toFixed(0)}% rispetto al periodo precedente!`
  if (change > 0) return `📈 In crescita del ${change.toFixed(0)}%. Continua così!`
  if (change < -10) return `📉 Calo del ${Math.abs(change).toFixed(0)}%. Prova a variare i contenuti o gli orari di pubblicazione.`
  return "📊 Performance stabile. Considera di sperimentare con nuovi formati."
}

const getThemeRecommendation = (theme: ThemePerformance, avgEngagement: number) => {
  if (theme.avgEngagementRate > avgEngagement * 1.5) {
    return `🌟 Tema ad alta performance! Crea più contenuti su "${theme.theme}" per massimizzare l'engagement.`
  }
  if (theme.avgEngagementRate < avgEngagement * 0.7) {
    return `💡 Tema sottoperformante. Prova a cambiare approccio o a combinare "${theme.theme}" con temi più popolari.`
  }
  return `📋 Tema stabile. Mantieni la frequenza attuale per "${theme.theme}".`
}

const getOptimalTimeRecommendation = (times: OptimalPostingTime[]) => {
  if (times.length === 0) return "📊 Raccogliendo dati per suggerimenti personalizzati..."
  
  const bestTime = times[0]
  const bestHour = bestTime.hour
  const timeLabel = bestHour < 12 ? "mattina" : bestHour < 18 ? "pomeriggio" : "sera"
  
  return `⏰ Il tuo pubblico è più attivo in ${timeLabel} (${bestHour}:00). Programma i contenuti più importanti in questa fascia oraria.`
}

interface AnalyticsDashboardProps {
  className?: string
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const format = useFormatter()
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null)
  const [posts, setPosts] = useState<PostPerformance[]>([])
  const [platforms, setPlatforms] = useState<PlatformComparison[]>([])
  const [themes, setThemes] = useState<ThemePerformance[]>([])
  const [optimalTimes, setOptimalTimes] = useState<OptimalPostingTime[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")
  const [selectedBook, setSelectedBook] = useState<string>("")
  const [sortBy, setSortBy] = useState<string>("publishedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [minEngagementRate, setMinEngagementRate] = useState<string>("")
  const [maxEngagementRate, setMaxEngagementRate] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  // Available filter options
  const [availableBooks, setAvailableBooks] = useState<
    { id: string; title: string; author?: string }[]
  >([])
  const availablePlatforms = ["twitter", "instagram", "linkedin", "facebook"]

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true)

      // Build query parameters for posts
      const postsParams = new URLSearchParams({
        limit: "50",
        sortBy,
        sortOrder
      })

      if (searchQuery.trim()) postsParams.append("search", searchQuery.trim())
      if (selectedPlatform) postsParams.append("platform", selectedPlatform)
      if (selectedBook) postsParams.append("bookId", selectedBook)
      if (minEngagementRate)
        postsParams.append("minEngagementRate", minEngagementRate)
      if (maxEngagementRate)
        postsParams.append("maxEngagementRate", maxEngagementRate)
      if (startDate) postsParams.append("startDate", startDate)
      if (endDate) postsParams.append("endDate", endDate)

      const [insightsRes, postsRes, platformsRes, themesRes, timesRes] =
        await Promise.all([
          fetch("/api/analytics/insights"),
          fetch(`/api/analytics/posts?${postsParams.toString()}`),
          fetch("/api/analytics/platforms"),
          fetch("/api/analytics/themes"),
          fetch("/api/analytics/optimal-times")
        ])

      const [insightsData, postsData, platformsData, themesData, timesData] =
        await Promise.all([
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
  }, [
    searchQuery,
    selectedPlatform,
    selectedBook,
    sortBy,
    sortOrder,
    minEngagementRate,
    maxEngagementRate,
    startDate,
    endDate
  ])

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
      case "twitter":
        return "𝕏"
      case "instagram":
        return "📷"
      case "linkedin":
        return "💼"
      case "facebook":
        return "📘"
      default:
        return "📱"
    }
  }

  const getDayName = (dayOfWeek: number) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ]
    return days[dayOfWeek]
  }

  const formatTime = (hour: number) => {
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:00 ${ampm}`
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedPlatform("")
    setSelectedBook("")
    setMinEngagementRate("")
    setMaxEngagementRate("")
    setStartDate("")
    setEndDate("")
  }

  const hasActiveFilters =
    searchQuery.trim() ||
    selectedPlatform ||
    selectedBook ||
    minEngagementRate ||
    maxEngagementRate ||
    startDate ||
    endDate

  const toggleSortOrder = () => {
    setSortOrder(current => (current === "asc" ? "desc" : "asc"))
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-3/4 rounded bg-gray-200"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-1/2 rounded bg-gray-200"></div>
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
          <RefreshCw
            className={`mr-2 h-4 w-4 ${updating ? "animate-spin" : ""}`}
          />
          {updating ? "Updating..." : "Update Analytics"}
        </Button>
      </div>

      {/* Overview Cards */}
      {insights && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <BarChart3 className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.totalPosts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Engagement
              </CardTitle>
              <Heart className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(insights.totalEngagement)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Engagement Rate
              </CardTitle>
              <TrendingUp className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPercentage(insights.avgEngagementRate)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Best Platform
              </CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-2xl font-bold">
                <span className="mr-2">
                  {getPlatformIcon(insights.bestPerformingPlatform)}
                </span>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Engagement Rate:</span>
                <Badge
                  variant={
                    insights.recentTrends.engagementChange >= 0
                      ? "default"
                      : "destructive"
                  }
                >
                  {insights.recentTrends.engagementChange >= 0 ? "+" : ""}
                  {formatPercentage(insights.recentTrends.engagementChange)}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Impressions:</span>
                <Badge
                  variant={
                    insights.recentTrends.impressionsChange >= 0
                      ? "default"
                      : "destructive"
                  }
                >
                  {insights.recentTrends.impressionsChange >= 0 ? "+" : ""}
                  {formatPercentage(insights.recentTrends.impressionsChange)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">🎯 Raccomandazioni</TabsTrigger>
          <TabsTrigger value="platforms">Platform Performance</TabsTrigger>
          <TabsTrigger value="themes">Theme Analysis</TabsTrigger>
          <TabsTrigger value="timing">Optimal Times</TabsTrigger>
          <TabsTrigger value="posts">Recent Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <ContentRecommendations 
            topThemes={themes}
            optimalTimes={optimalTimes}
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {platforms.map(platform => {
              const overallAvgEngagement = platforms.reduce((sum, p) => sum + p.avgEngagementRate, 0) / platforms.length
              return (
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
                      <span className="font-medium">
                        {formatPercentage(platform.avgEngagementRate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Impressions:</span>
                      <span className="font-medium">
                        {formatNumber(platform.totalImpressions)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Likes:</span>
                      <span className="font-medium">
                        {formatNumber(platform.totalLikes)}
                      </span>
                    </div>
                    
                    {/* Insight Actionable */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <div className="flex items-start space-x-2">
                        <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-800 mb-1">💡 Insight</p>
                          <p className="text-blue-700">
                            {getEngagementRateExplanation(platform.avgEngagementRate)}
                          </p>
                          {platform.avgEngagementRate > overallAvgEngagement * 1.2 && (
                            <p className="text-green-700 mt-2">
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              Questa piattaforma performa meglio della media. Considera di aumentare la frequenza dei post.
                            </p>
                          )}
                          {platform.avgEngagementRate < overallAvgEngagement * 0.8 && (
                            <p className="text-orange-700 mt-2">
                              <Target className="h-3 w-3 inline mr-1" />
                              Performance sotto la media. Prova formati diversi o orari di pubblicazione alternativi.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="themes" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {themes.slice(0, 10).map((theme, index) => {
              const avgEngagement = themes.reduce((sum, t) => sum + t.avgEngagementRate, 0) / themes.length
              return (
                <Card key={theme.theme}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>
                        #{index + 1} {theme.theme}
                      </span>
                      <Badge>{theme.postCount} posts</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Avg Engagement Rate:</span>
                        <span className="font-medium">
                          {formatPercentage(theme.avgEngagementRate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Engagement:</span>
                        <span className="font-medium">
                          {formatNumber(theme.totalEngagement)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {theme.platforms.map(platform => (
                          <Badge key={platform.platform} variant="outline">
                            {getPlatformIcon(platform.platform)}{" "}
                            {formatPercentage(platform.avgEngagementRate)}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Insight Actionable per Temi */}
                      <div className="mt-4 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                        <div className="flex items-start space-x-2">
                          <Target className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-green-800 mb-1">📊 Raccomandazione</p>
                            <p className="text-green-700">
                              {getThemeRecommendation(theme, avgEngagement)}
                            </p>
                            {index < 3 && (
                              <p className="text-blue-700 mt-2">
                                <CheckCircle className="h-3 w-3 inline mr-1" />
                                Top performer! Considera di creare contenuti simili o variazioni di questo tema.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
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
              {/* Insight globale sui tempi */}
              {optimalTimes.length > 0 && (
                <div className="mb-6 p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                  <div className="flex items-start space-x-2">
                    <Clock className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-purple-800 mb-1">🕐 Ottimizzazione Timing</p>
                      <p className="text-purple-700">
                        {getOptimalTimeRecommendation(optimalTimes)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {optimalTimes.slice(0, 12).map((time, index) => (
                  <div
                    key={`${time.platform}-${time.dayOfWeek}-${time.hour}`}
                    className="rounded-lg border p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium">
                        {getPlatformIcon(time.platform)} {time.platform}
                      </span>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {getDayName(time.dayOfWeek)} at {formatTime(time.hour)}
                    </div>
                    <div className="text-sm font-medium">
                      {formatPercentage(time.avgEngagementRate)} engagement
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Based on {time.postCount} posts
                    </div>
                    
                    {index === 0 && (
                      <div className="mt-2">
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          ⭐ Orario TOP
                        </Badge>
                      </div>
                    )}
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select
                  value={selectedPlatform}
                  onValueChange={setSelectedPlatform}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All platforms</SelectItem>
                    {availablePlatforms.map(platform => (
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
                    {availableBooks.map(book => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title} {book.author && `by ${book.author}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Filters */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Min Engagement Rate (%)
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minEngagementRate}
                    onChange={e => setMinEngagementRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Max Engagement Rate (%)
                  </label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={maxEngagementRate}
                    onChange={e => setMaxEngagementRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
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
                      <SelectItem value="publishedAt">
                        Published Date
                      </SelectItem>
                      <SelectItem value="engagementRate">
                        Engagement Rate
                      </SelectItem>
                      <SelectItem value="impressions">Impressions</SelectItem>
                      <SelectItem value="likes">Likes</SelectItem>
                      <SelectItem value="shares">Shares</SelectItem>
                      <SelectItem value="comments">Comments</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" onClick={toggleSortOrder}>
                    {sortOrder === "asc" ? (
                      <SortAsc className="h-4 w-4" />
                    ) : (
                      <SortDesc className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    Active filters:
                  </span>

                  {searchQuery.trim() && (
                    <Badge variant="secondary" className="gap-1">
                      Search: "{searchQuery}"
                      <button
                        onClick={() => setSearchQuery("")}
                        className="hover:bg-muted-foreground/20 ml-1 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}

                  {selectedPlatform && (
                    <Badge variant="secondary" className="gap-1">
                      Platform: {selectedPlatform}
                      <button
                        onClick={() => setSelectedPlatform("")}
                        className="hover:bg-muted-foreground/20 ml-1 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}

                  {selectedBook && (
                    <Badge variant="secondary" className="gap-1">
                      Book:{" "}
                      {availableBooks.find(b => b.id === selectedBook)?.title}
                      <button
                        onClick={() => setSelectedBook("")}
                        className="hover:bg-muted-foreground/20 ml-1 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}

                  {(minEngagementRate || maxEngagementRate) && (
                    <Badge variant="secondary" className="gap-1">
                      Engagement: {minEngagementRate || "0"}% -{" "}
                      {maxEngagementRate || "100"}%
                      <button
                        onClick={() => {
                          setMinEngagementRate("")
                          setMaxEngagementRate("")
                        }}
                        className="hover:bg-muted-foreground/20 ml-1 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}

                  {(startDate || endDate) && (
                    <Badge variant="secondary" className="gap-1">
                      Date: {startDate || "Start"} - {endDate || "End"}
                      <button
                        onClick={() => {
                          setStartDate("")
                          setEndDate("")
                        }}
                        className="hover:bg-muted-foreground/20 ml-1 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {posts.map(post => (
              <Card key={post.contentId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <span>{getPlatformIcon(post.platform)}</span>
                      <span>{post.bookTitle}</span>
                    </CardTitle>
                    <Badge variant="outline">
                      {formatPercentage(post.analytics.engagementRate || 0)}
                    </Badge>
                  </div>
                  <CardDescription>
                    Published {format.dateTime(new Date(post.publishedAt), { dateStyle: 'medium' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 line-clamp-3 text-sm">{post.content}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
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
                    <div className="mt-3 flex flex-wrap gap-1">
                      {post.themes.slice(0, 3).map(theme => (
                        <Badge
                          key={theme}
                          variant="secondary"
                          className="text-xs"
                        >
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
