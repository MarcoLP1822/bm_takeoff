/* eslint-disable @typescript-eslint/no-explicit-any */
// Global mocks for API tests

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
  clerkClient: {
    users: {
      getUser: jest.fn()
    }
  }
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
    asc: jest.fn(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis()
  },
  postAnalytics: {
    contentId: jest.fn(),
    platform: jest.fn(),
    postId: jest.fn(),
    content: jest.fn(),
    publishedAt: jest.fn(),
    impressions: jest.fn(),
    likes: jest.fn(),
    shares: jest.fn(),
    comments: jest.fn(),
    clicks: jest.fn(),
    engagementRate: jest.fn(),
    createdAt: jest.fn(),
    updatedAt: jest.fn()
  },
  generatedContent: {},
  books: {},
  eq: jest.fn(),
  and: jest.fn(),
  or: jest.fn(),
  gte: jest.fn(),
  lte: jest.fn(),
  desc: jest.fn(),
  asc: jest.fn()
}))

// Mock Analytics Service
jest.mock('@/lib/analytics-service', () => ({
  AnalyticsService: {
    getPostPerformance: jest.fn(),
    getOptimalPostingTimes: jest.fn(),
    getPlatformInsights: jest.fn(),
    getTopPerformingThemes: jest.fn(),
    updateAnalytics: jest.fn()
  }
}))

// Mock Cache Service
jest.mock('@/lib/cache-service', () => ({
  getCachedAnalyticsData: jest.fn(),
  cacheAnalyticsData: jest.fn(),
  invalidateAnalyticsCache: jest.fn()
}))

// Mock Social Media Service
jest.mock('@/lib/social-media', () => ({
  SocialMediaService: {
    getUserAccounts: jest.fn(),
    publishPost: jest.fn(),
    schedulePost: jest.fn(),
    deleteScheduledPost: jest.fn(),
    getPostStatus: jest.fn()
  }
}))

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  }
})

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn()
    }
  }
}))

export {}
