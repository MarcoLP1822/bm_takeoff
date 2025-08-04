/* eslint-disable @typescript-eslint/no-explicit-any */
import { GET } from "../route"
import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { SocialMediaService } from "@/lib/social-media"

// Mock dependencies
jest.mock("@clerk/nextjs/server")
jest.mock("@/lib/social-media")

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockSocialMediaService = SocialMediaService as jest.Mocked<
  typeof SocialMediaService
>

describe("/api/social/callback/[platform]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET", () => {
    it("should handle successful Twitter OAuth callback", async () => {
      const mockTokenData = {
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
        expiresAt: new Date(Date.now() + 3600000),
        accountInfo: {
          id: "123456789",
          name: "Test User",
          handle: "testuser"
        }
      }

      mockAuth.mockResolvedValue({ userId: "user123" } as any)
      mockSocialMediaService.exchangeCodeForToken.mockResolvedValue(
        mockTokenData
      )
      mockSocialMediaService.saveAccount.mockResolvedValue()

      const request = new NextRequest(
        "http://localhost:3000/api/social/callback/twitter?code=auth_code_123&state=user123:uuid-1234"
      )
      const response = await GET(request, { params: Promise.resolve({ platform: "twitter" }) })

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get("location")).toContain(
        "/dashboard/settings?connected=twitter"
      )
      expect(mockSocialMediaService.exchangeCodeForToken).toHaveBeenCalledWith(
        "twitter",
        "auth_code_123",
        "user123:uuid-1234"
      )
      expect(mockSocialMediaService.saveAccount).toHaveBeenCalledWith(
        "user123",
        "twitter",
        {
          accountId: "123456789",
          accountName: "Test User",
          accountHandle: "testuser",
          accessToken: "access_token_123",
          refreshToken: "refresh_token_123",
          expiresAt: mockTokenData.expiresAt
        }
      )
    })

    it("should handle OAuth error response", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/social/callback/twitter?error=access_denied&error_description=User%20denied%20access"
      )
      const response = await GET(request, { params: Promise.resolve({ platform: "twitter" }) })

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get("location")).toContain(
        "/dashboard/settings?error=User%20denied%20access"
      )
    })

    it("should handle missing authorization code", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/social/callback/twitter?state=user123:uuid-1234"
      )
      const response = await GET(request, { params: Promise.resolve({ platform: "twitter" }) })

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get("location")).toContain(
        "/dashboard/settings?error=Missing%20authorization%20code"
      )
    })

    it("should handle invalid state parameter", async () => {
      mockAuth.mockResolvedValue({ userId: "user123" } as any)

      const request = new NextRequest(
        "http://localhost:3000/api/social/callback/twitter?code=auth_code_123&state=different_user:uuid-1234"
      )
      const response = await GET(request, { params: Promise.resolve({ platform: "twitter" }) })

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get("location")).toContain(
        "/dashboard/settings?error=Invalid%20state%20parameter"
      )
    })

    it("should handle unauthenticated user", async () => {
      mockAuth.mockResolvedValue({ userId: null } as any)

      const request = new NextRequest(
        "http://localhost:3000/api/social/callback/twitter?code=auth_code_123&state=user123:uuid-1234"
      )
      const response = await GET(request, { params: Promise.resolve({ platform: "twitter" }) })

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get("location")).toContain(
        "/dashboard/settings?error=Invalid%20state%20parameter"
      )
    })

    it("should handle invalid platform", async () => {
      mockAuth.mockResolvedValue({ userId: "user123" } as any)

      const request = new NextRequest(
        "http://localhost:3000/api/social/callback/invalid?code=auth_code_123&state=user123:uuid-1234"
      )
      const response = await GET(request, { params: Promise.resolve({ platform: "invalid" }) })

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get("location")).toContain(
        "/dashboard/settings?error=Invalid%20platform"
      )
    })

    it("should handle token exchange failure", async () => {
      mockAuth.mockResolvedValue({ userId: "user123" } as any)
      mockSocialMediaService.exchangeCodeForToken.mockRejectedValue(
        new Error("Token exchange failed")
      )

      const request = new NextRequest(
        "http://localhost:3000/api/social/callback/twitter?code=auth_code_123&state=user123:uuid-1234"
      )
      const response = await GET(request, { params: Promise.resolve({ platform: "twitter" }) })

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get("location")).toContain(
        "/dashboard/settings?error=Failed%20to%20connect%20twitter%20account"
      )
    })
  })
})
