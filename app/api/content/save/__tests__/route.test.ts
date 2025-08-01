/* eslint-disable @typescript-eslint/no-explicit-any */
import { POST } from "../route"
import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"

// Mock dependencies
jest.mock("@clerk/nextjs/server")
jest.mock("@/db")

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockDb = db as jest.Mocked<typeof db>

describe("/api/content/save", () => {
  const mockUserId = "user_123"
  const mockBookId = "book_123"

  const mockContentVariations = [
    {
      id: "variation-1",
      posts: [
        {
          platform: "twitter",
          content: "Test tweet content",
          hashtags: ["#test", "#book"],
          characterCount: 25,
          isValid: true,
          validationErrors: []
        },
        {
          platform: "instagram",
          content: "Test Instagram content",
          hashtags: ["#bookstagram", "#reading"],
          imageUrl: "/test-image.jpg",
          characterCount: 35,
          isValid: true,
          validationErrors: []
        }
      ],
      theme: "Test Theme",
      sourceType: "quote",
      sourceContent: "Test quote"
    }
  ]

  const mockSavedContent = [
    {
      id: "content_1",
      bookId: mockBookId,
      userId: mockUserId,
      platform: "twitter",
      contentType: "post",
      content: "Test tweet content",
      hashtags: ["#test", "#book"],
      imageUrl: null,
      status: "draft"
    },
    {
      id: "content_2",
      bookId: mockBookId,
      userId: mockUserId,
      platform: "instagram",
      contentType: "post",
      content: "Test Instagram content",
      hashtags: ["#bookstagram", "#reading"],
      imageUrl: "/test-image.jpg",
      status: "draft"
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    mockAuth.mockResolvedValue({ userId: mockUserId } as any)
    mockDb.insert = jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(mockSavedContent)
      })
    })
  })

  test("should save content variations successfully", async () => {
    const request = new NextRequest("http://localhost/api/content/save", {
      method: "POST",
      body: JSON.stringify({
        bookId: mockBookId,
        contentVariations: mockContentVariations
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.savedCount).toBe(2)
    expect(data.data.contentIds).toEqual(["content_1", "content_2"])

    expect(mockDb.insert).toHaveBeenCalled()
  })

  test("should return 401 for unauthenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: null } as any)

    const request = new NextRequest("http://localhost/api/content/save", {
      method: "POST",
      body: JSON.stringify({
        bookId: mockBookId,
        contentVariations: mockContentVariations
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  test("should return 400 for missing book ID", async () => {
    const request = new NextRequest("http://localhost/api/content/save", {
      method: "POST",
      body: JSON.stringify({
        contentVariations: mockContentVariations
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Book ID and content variations are required")
  })

  test("should return 400 for missing content variations", async () => {
    const request = new NextRequest("http://localhost/api/content/save", {
      method: "POST",
      body: JSON.stringify({
        bookId: mockBookId
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Book ID and content variations are required")
  })

  test("should return 400 for invalid content variations format", async () => {
    const request = new NextRequest("http://localhost/api/content/save", {
      method: "POST",
      body: JSON.stringify({
        bookId: mockBookId,
        contentVariations: "invalid"
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Book ID and content variations are required")
  })

  test("should handle database errors", async () => {
    mockDb.insert = jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockRejectedValue(new Error("Database error"))
      })
    })

    const request = new NextRequest("http://localhost/api/content/save", {
      method: "POST",
      body: JSON.stringify({
        bookId: mockBookId,
        contentVariations: mockContentVariations
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to save content. Please try again.")
  })

  test("should save multiple variations with multiple posts each", async () => {
    const multipleVariations = [
      {
        id: "variation-1",
        posts: [
          {
            platform: "twitter",
            content: "Tweet 1",
            hashtags: ["#test1"],
            characterCount: 10,
            isValid: true,
            validationErrors: []
          }
        ],
        theme: "Theme 1",
        sourceType: "quote",
        sourceContent: "Quote 1"
      },
      {
        id: "variation-2",
        posts: [
          {
            platform: "instagram",
            content: "Instagram 1",
            hashtags: ["#test2"],
            characterCount: 15,
            isValid: true,
            validationErrors: []
          },
          {
            platform: "linkedin",
            content: "LinkedIn 1",
            hashtags: ["#test3"],
            characterCount: 20,
            isValid: true,
            validationErrors: []
          }
        ],
        theme: "Theme 2",
        sourceType: "insight",
        sourceContent: "Insight 1"
      }
    ]

    const request = new NextRequest("http://localhost/api/content/save", {
      method: "POST",
      body: JSON.stringify({
        bookId: mockBookId,
        contentVariations: multipleVariations
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Should have called insert with 3 content records (1 + 2 posts)
    expect(mockDb.insert).toHaveBeenCalled()
  })

  test("should handle empty content variations array", async () => {
    const request = new NextRequest("http://localhost/api/content/save", {
      method: "POST",
      body: JSON.stringify({
        bookId: mockBookId,
        contentVariations: []
      })
    })

    mockDb.insert = jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([])
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.savedCount).toBe(0)
    expect(data.data.contentIds).toEqual([])
  })
})
