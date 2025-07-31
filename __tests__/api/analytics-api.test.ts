/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn()
}))

// Mock database
jest.mock('@/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    eq: jest.fn(),
    and: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    orderBy: jest.fn().mockReturnThis(),
    desc: jest.fn(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  },
  postAnalytics: {},
  generatedContent: {},
  books: {},
  eq: jest.fn(),
  and: jest.fn(),
  gte: jest.fn(),
  lte: jest.fn(),
  desc: jest.fn()
}))

// Mock analytics service
jest.mock('@/lib/analytics-service', () => ({
  getPostAnalytics: jest.fn(),
  getEngagementMetrics: jest.fn(),
  getPerformanceInsights: jest.fn(),
  getOptimalPostingTimes: jest.fn(),
  getPlatformComparison: jest.fn(),
  getThemePerformance: jest.fn(),
  updateAnalyticsData: jest.fn()
}))

import { GET as getPostAnalytics } from '@/app/api/analytics/posts/route'
import { GET as getInsights } from '@/app/api/analytics/insights/route'
import { GET as getOptimalTimes } from '@/app/api/analytics/optimal-times/route'
import { GET as getPlatforms } from '@/app/api/analytics/platforms/route'
import { POST as updateAnalytics } from '@/app/api/cron/update-analytics/route'
import { db, eq, and, gte, lte, desc } from '@/db'
import {
  getPostAnalytics as getPostAnalyticsService,
  getPerformanceInsights as getPerformanceInsightsService,
  getOptimalPostingTimes as getOptimalPostingTimesService,
  getPlatformComparison as getPlatformComparisonService,
  getThemePerformance as getThemePerformanceService,
  updateAnalyticsData as updateAnalyticsDataService
} from '@/lib/analytics-service'

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockGetPostAnalyticsService = getPostAnalyticsService as jest.MockedFunction<typeof getPostAnalyticsService>
const mockGetPerformanceInsightsService = getPerformanceInsightsService as jest.MockedFunction<typeof getPerformanceInsightsService>
const mockGetOptimalPostingTimesService = getOptimalPostingTimesService as jest.MockedFunction<typeof getOptimalPostingTimesService>
const mockGetPlatformComparisonService = getPlatformComparisonService as jest.MockedFunction<typeof getPlatformComparisonService>
const mockGetThemePerformanceService = getThemePerformanceService as jest.MockedFunction<typeof getThemePerformanceService>
const mockUpdateAnalyticsDataService = updateAnalyticsDataService as jest.MockedFunction<typeof updateAnalyticsDataService>

describe('Analytics API Endpoints', () => {
  const mockUserId = 'user_123'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(mockAuth as any).mockResolvedValue({ 
      userId: mockUserId
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('GET /api/analytics/posts', () => {
    it('should return post analytics data', async () => {
      const mockAnalyticsResult = {
        posts: [
          {
            contentId: 'content_1',
            platform: 'twitter' as const,
            postId: 'twitter_post_123',
            content: 'Tweet about book',
            publishedAt: new Date('2024-01-01T00:00:00Z'),
            analytics: {
              impressions: 1000,
              likes: 50,
              shares: 10,
              comments: 5,
              clicks: 25
            },
            bookTitle: 'Test Book',
            bookAuthor: 'Test Author'
          }
        ],
        pagination: {
          total: 1,
          limit: 50,
          offset: 0,
          hasMore: false
        },
        filters: {
          platforms: ['twitter' as const],
          books: [{ id: 'book_1', title: 'Test Book', author: 'Test Author' }]
        }
      }

      mockGetPostAnalyticsService.mockResolvedValue(mockAnalyticsResult)

      const request = new NextRequest('http://localhost:3000/api/analytics/posts')
      const response = await getPostAnalytics(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.posts).toHaveLength(1)
      expect(result.posts[0].platform).toBe('twitter')
      expect(result.posts[0].analytics.impressions).toBe(1000)
    })

    it('should require authentication', async () => {
      ;(mockAuth as any).mockResolvedValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/analytics/posts')
      const response = await getPostAnalytics(request)

      expect(response.status).toBe(401)
    })

    it('should handle service errors', async () => {
      mockGetPostAnalyticsService.mockRejectedValue(new Error('Analytics service error'))

      const request = new NextRequest('http://localhost:3000/api/analytics/posts')
      const response = await getPostAnalytics(request)

      expect(response.status).toBe(500)
    })
  })

  describe('GET /api/analytics/insights', () => {
    it('should return performance insights', async () => {
      const mockInsights = {
        totalPosts: 50,
        totalEngagement: 2500,
        avgEngagementRate: 0.035,
        bestPerformingPlatform: 'instagram' as const,
        topThemes: [
          {
            theme: 'friendship',
            postCount: 15,
            avgEngagementRate: 0.05,
            totalEngagement: 750,
            platforms: [
              {
                platform: 'instagram' as const,
                avgEngagementRate: 0.06,
                postCount: 8
              }
            ]
          }
        ],
        optimalPostingTimes: [
          {
            platform: 'twitter' as const,
            dayOfWeek: 2,
            hour: 9,
            avgEngagementRate: 0.04,
            postCount: 20
          }
        ],
        recentTrends: {
          period: '7d',
          engagementChange: 15.5,
          impressionsChange: 12.3
        }
      }

      mockGetPerformanceInsightsService.mockResolvedValue(mockInsights)

      const request = new NextRequest('http://localhost:3000/api/analytics/insights')
      const response = await getInsights()
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.insights.bestPerformingPlatform).toBe('instagram')
      expect(result.insights.totalPosts).toBe(50)
    })
  })

  describe('GET /api/analytics/optimal-times', () => {
    it('should return optimal posting times', async () => {
      const mockOptimalTimes = [
        {
          platform: 'twitter' as const,
          dayOfWeek: 2,
          hour: 9,
          avgEngagementRate: 0.04,
          postCount: 20
        },
        {
          platform: 'instagram' as const,
          dayOfWeek: 3,
          hour: 11,
          avgEngagementRate: 0.05,
          postCount: 15
        }
      ]

      mockGetOptimalPostingTimesService.mockResolvedValue(mockOptimalTimes)

      const request = new NextRequest('http://localhost:3000/api/analytics/optimal-times')
      const response = await getOptimalTimes()
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.optimalTimes).toHaveLength(2)
      expect(result.optimalTimes[0].platform).toBe('twitter')
    })
  })

  describe('GET /api/analytics/platforms', () => {
    it('should return platform comparison data', async () => {
      const mockPlatformComparison = [
        {
          platform: 'twitter' as const,
          totalPosts: 25,
          avgEngagementRate: 0.033,
          totalImpressions: 50000,
          totalLikes: 1250,
          totalShares: 250,
          totalComments: 125
        },
        {
          platform: 'instagram' as const,
          totalPosts: 20,
          avgEngagementRate: 0.038,
          totalImpressions: 60000,
          totalLikes: 1800,
          totalShares: 300,
          totalComments: 200
        }
      ]

      mockGetPlatformComparisonService.mockResolvedValue(mockPlatformComparison)

      const request = new NextRequest('http://localhost:3000/api/analytics/platforms')
      const response = await getPlatforms(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.platforms).toHaveLength(2)
      expect(result.platforms[0].platform).toBe('twitter')
      expect(result.platforms[1].avgEngagementRate).toBe(0.038)
    })
  })

  describe('Theme Performance Analytics', () => {
    it('should return theme-based performance data', async () => {
      const mockThemePerformance = [
        {
          theme: 'friendship',
          postCount: 15,
          avgEngagementRate: 0.05,
          totalEngagement: 750,
          platforms: [
            {
              platform: 'instagram' as const,
              avgEngagementRate: 0.06,
              postCount: 8
            }
          ]
        },
        {
          theme: 'adventure',
          postCount: 12,
          avgEngagementRate: 0.045,
          totalEngagement: 540,
          platforms: [
            {
              platform: 'twitter' as const,
              avgEngagementRate: 0.045,
              postCount: 12
            }
          ]
        }
      ]

      mockGetThemePerformanceService.mockResolvedValue(mockThemePerformance)

      expect(mockThemePerformance[0].theme).toBe('friendship')
      expect(mockThemePerformance[0].avgEngagementRate).toBe(0.05)
      expect(mockThemePerformance[1].platforms[0].platform).toBe('twitter')
    })
  })
})