/* eslint-disable @typescript-eslint/no-explicit-any */
import { GET } from "../route"
import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { SocialMediaService } from "@/lib/social-media"

// Mock dependencies
jest.mock("@clerk/nextjs/server")
jest.mock("@/lib/social-media")

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockSocialMediaService = SocialMediaService as jest.Mocked<typeof SocialMediaService>

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-1234')
  }
})

describe("/api/social/connect/[platform]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET", () => {
    it("should generate OAuth URL for Twitter", async () => {
      mockAuth.mockResolvedValue({ userId: "user123" } as any)
      mockSocialMediaService.generateAuthUrl.mockReturnValue("https://twitter.com/oauth/authorize?...")

      const request = new NextRequest("http://localhost:3000/api/social/connect/twitter")
      const response = await GET(request, { params: { platform: "twitter" } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authUrl).toBe("https://twitter.com/oauth/authorize?...")
      expect(data.state).toBe("user123:mock-uuid-1234")
      expect(mockSocialMediaService.generateAuthUrl).toHaveBeenCalledWith("twitter", "user123:mock-uuid-1234")
    })

    it("should return 401 for unauthenticated user", async () => {
      mockAuth.mockResolvedValue({ userId: null } as any)

      const request = new NextRequest("http://localhost:3000/api/social/connect/twitter")
      const response = await GET(request, { params: { platform: "twitter" } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })

    it("should return 400 for invalid platform", async () => {
      mockAuth.mockResolvedValue({ userId: "user123" } as any)

      const request = new NextRequest("http://localhost:3000/api/social/connect/invalid")
      const response = await GET(request, { params: { platform: "invalid" } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid platform")
    })

    it("should handle service errors", async () => {
      mockAuth.mockResolvedValue({ userId: "user123" } as any)
      mockSocialMediaService.generateAuthUrl.mockImplementation(() => {
        throw new Error("OAuth config error")
      })

      const request = new NextRequest("http://localhost:3000/api/social/connect/twitter")
      const response = await GET(request, { params: { platform: "twitter" } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("Failed to generate authorization URL")
    })
  })
})