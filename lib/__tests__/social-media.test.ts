import { SocialMediaService, oauthConfigs } from "../social-media"

// Mock the database
jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis()
  }
}))

// Mock Clerk auth
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

describe("SocialMediaService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.TWITTER_CLIENT_ID = "test_twitter_client_id"
    process.env.TWITTER_CLIENT_SECRET = "test_twitter_client_secret"
    process.env.NEXTAUTH_URL = "http://localhost:3000"
  })

  describe("generateAuthUrl", () => {
    it("should generate correct Twitter OAuth URL", () => {
      const url = SocialMediaService.generateAuthUrl("twitter", "test-state")
      
      expect(url).toContain("https://twitter.com/i/oauth2/authorize")
      expect(url).toContain("client_id=test_twitter_client_id")
      expect(url).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fsocial%2Fcallback%2Ftwitter")
      expect(url).toContain("scope=tweet.read%20tweet.write%20users.read%20offline.access")
      expect(url).toContain("state=test-state")
      expect(url).toContain("code_challenge=challenge")
    })

    it("should generate correct Instagram OAuth URL", () => {
      process.env.INSTAGRAM_CLIENT_ID = "test_instagram_client_id"
      
      const url = SocialMediaService.generateAuthUrl("instagram", "test-state")
      
      expect(url).toContain("https://api.instagram.com/oauth/authorize")
      expect(url).toContain("client_id=test_instagram_client_id")
      expect(url).toContain("scope=user_profile%2Cuser_media")
    })

    it("should generate random state if not provided", () => {
      const url = SocialMediaService.generateAuthUrl("twitter")
      
      expect(url).toContain("state=")
      // Should contain a UUID-like string
      expect(url).toMatch(/state=[a-f0-9-]{36}/)
    })
  })

  describe("exchangeCodeForToken", () => {
    it("should exchange Twitter authorization code for tokens", async () => {
      const mockTokenResponse = {
        access_token: "test_access_token",
        refresh_token: "test_refresh_token",
        expires_in: 3600
      }

      const mockUserResponse = {
        data: {
          id: "123456789",
          name: "Test User",
          username: "testuser"
        }
      }

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserResponse)
        })

      const result = await SocialMediaService.exchangeCodeForToken("twitter", "test_code")

      expect(result.accessToken).toBe("test_access_token")
      expect(result.refreshToken).toBe("test_refresh_token")
      expect(result.accountInfo.id).toBe("123456789")
      expect(result.accountInfo.name).toBe("Test User")
      expect(result.accountInfo.handle).toBe("testuser")
    })

    it("should handle token exchange failure", async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request"
      })

      await expect(
        SocialMediaService.exchangeCodeForToken("twitter", "invalid_code")
      ).rejects.toThrow("Token exchange failed: Bad Request")
    })
  })

  describe("getUserInfo", () => {
    it("should get Twitter user info", async () => {
      const mockResponse = {
        data: {
          id: "123456789",
          name: "Test User",
          username: "testuser"
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await SocialMediaService.getUserInfo("twitter", "test_token")

      expect(result.id).toBe("123456789")
      expect(result.name).toBe("Test User")
      expect(result.handle).toBe("testuser")
    })

    it("should get Instagram user info", async () => {
      const mockResponse = {
        id: "123456789",
        username: "testuser"
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await SocialMediaService.getUserInfo("instagram", "test_token")

      expect(result.id).toBe("123456789")
      expect(result.name).toBe("testuser")
      expect(result.handle).toBe("testuser")
    })

    it("should handle unsupported platform", async () => {
      await expect(
        SocialMediaService.getUserInfo("unsupported" as "twitter", "test_token")
      ).rejects.toThrow("Unsupported platform: unsupported")
    })
  })

  describe("refreshAccessToken", () => {
    it("should refresh access token", async () => {
      const mockResponse = {
        access_token: "new_access_token",
        refresh_token: "new_refresh_token",
        expires_in: 3600
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await SocialMediaService.refreshAccessToken("twitter", "refresh_token")

      expect(result.accessToken).toBe("new_access_token")
      expect(result.refreshToken).toBe("new_refresh_token")
      expect(result.expiresAt).toBeInstanceOf(Date)
    })

    it("should handle refresh failure", async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized"
      })

      await expect(
        SocialMediaService.refreshAccessToken("twitter", "invalid_refresh_token")
      ).rejects.toThrow("Token refresh failed: Unauthorized")
    })
  })

  describe("isTokenExpired", () => {
    it("should return false for undefined expiration", () => {
      expect(SocialMediaService.isTokenExpired(undefined)).toBe(false)
    })

    it("should return true for expired token", () => {
      const pastDate = new Date(Date.now() - 1000)
      expect(SocialMediaService.isTokenExpired(pastDate)).toBe(true)
    })

    it("should return false for valid token", () => {
      const futureDate = new Date(Date.now() + 1000)
      expect(SocialMediaService.isTokenExpired(futureDate)).toBe(false)
    })
  })
})

describe("oauthConfigs", () => {
  beforeEach(() => {
    process.env.TWITTER_CLIENT_ID = "twitter_id"
    process.env.TWITTER_CLIENT_SECRET = "twitter_secret"
    process.env.INSTAGRAM_CLIENT_ID = "instagram_id"
    process.env.INSTAGRAM_CLIENT_SECRET = "instagram_secret"
    process.env.LINKEDIN_CLIENT_ID = "linkedin_id"
    process.env.LINKEDIN_CLIENT_SECRET = "linkedin_secret"
    process.env.FACEBOOK_APP_ID = "facebook_id"
    process.env.FACEBOOK_APP_SECRET = "facebook_secret"
    process.env.NEXTAUTH_URL = "http://localhost:3000"
  })

  it("should have correct Twitter configuration", () => {
    const config = oauthConfigs.twitter
    
    expect(config.clientId).toBe("twitter_id")
    expect(config.clientSecret).toBe("twitter_secret")
    expect(config.redirectUri).toBe("http://localhost:3000/api/social/callback/twitter")
    expect(config.scope).toBe("tweet.read tweet.write users.read offline.access")
    expect(config.authUrl).toBe("https://twitter.com/i/oauth2/authorize")
    expect(config.tokenUrl).toBe("https://api.twitter.com/2/oauth2/token")
  })

  it("should have correct Instagram configuration", () => {
    const config = oauthConfigs.instagram
    
    expect(config.clientId).toBe("instagram_id")
    expect(config.scope).toBe("user_profile,user_media")
    expect(config.authUrl).toBe("https://api.instagram.com/oauth/authorize")
  })

  it("should have correct LinkedIn configuration", () => {
    const config = oauthConfigs.linkedin
    
    expect(config.clientId).toBe("linkedin_id")
    expect(config.scope).toBe("r_liteprofile r_emailaddress w_member_social")
    expect(config.authUrl).toBe("https://www.linkedin.com/oauth/v2/authorization")
  })

  it("should have correct Facebook configuration", () => {
    const config = oauthConfigs.facebook
    
    expect(config.clientId).toBe("facebook_id")
    expect(config.scope).toBe("pages_manage_posts,pages_read_engagement,publish_to_groups")
    expect(config.authUrl).toBe("https://www.facebook.com/v18.0/dialog/oauth")
  })
})