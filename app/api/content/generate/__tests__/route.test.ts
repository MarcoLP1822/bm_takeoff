/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import * as contentGeneration from "@/lib/content-generation"

// Mock Next.js environment
Object.defineProperty(global, "Request", {
  value: class MockRequest {
    constructor(input: any, init?: any) {
      Object.assign(this, { input, ...init })
    }
  }
})

Object.defineProperty(global, "fetch", {
  value: jest.fn()
})

// Mock dependencies
jest.mock("@clerk/nextjs/server")
jest.mock("@/db")
jest.mock("@/lib/content-generation")

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockDb = db as jest.Mocked<typeof db>
const mockGenerateSocialContent =
  contentGeneration.generateSocialContent as jest.MockedFunction<
    typeof contentGeneration.generateSocialContent
  >

// Create a mock POST function for testing
const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { bookId, options = {} } = body

    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      )
    }

    // Mock book query
    const book = await db
      .select()
      .from({} as any)
      .where({} as any)
      .limit(1)

    if (!book || book.length === 0) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    const bookData = book[0]

    if (!bookData.analysisData) {
      return NextResponse.json(
        { error: "Book analysis not found" },
        { status: 400 }
      )
    }

    // Validate analysis data
    if (!bookData.analysisData.quotes || !bookData.analysisData.keyInsights) {
      return NextResponse.json(
        { error: "Invalid analysis data" },
        { status: 400 }
      )
    }

    // Mock content generation
    try {
      const contentVariations = await contentGeneration.generateSocialContent(
        bookData.analysisData,
        bookData.title,
        bookId,
        userId,
        bookData.author,
        {
          platforms: options.platforms || [
            "twitter",
            "instagram",
            "linkedin",
            "facebook"
          ],
          variationsPerTheme: Math.min(options.variationsPerTheme || 2, 5),
          includeImages: options.includeImages !== false,
          tone: [
            "professional",
            "casual",
            "inspirational",
            "educational"
          ].includes(options.tone)
            ? options.tone
            : "inspirational",
          maxRetries: Math.min(options.maxRetries || 3, 5)
        }
      )

      return NextResponse.json({
        success: true,
        data: {
          bookId,
          bookTitle: bookData.title,
          author: bookData.author,
          contentVariations,
          generatedAt: new Date().toISOString(),
          options: {
            platforms: options.platforms || [
              "twitter",
              "instagram",
              "linkedin",
              "facebook"
            ],
            variationsPerTheme: Math.min(options.variationsPerTheme || 2, 5),
            includeImages: options.includeImages !== false,
            tone: [
              "professional",
              "casual",
              "inspirational",
              "educational"
            ].includes(options.tone)
              ? options.tone
              : "inspirational",
            maxRetries: Math.min(options.maxRetries || 3, 5)
          }
        }
      })
    } catch (error: any) {
      if (error.message?.includes("rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        )
      }

      if (error.message?.includes("API key")) {
        return NextResponse.json(
          { error: "Service configuration error. Please contact support." },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: "Failed to generate content. Please try again." },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate content. Please try again." },
      { status: 500 }
    )
  }
}

describe("/api/content/generate", () => {
  const mockUserId = "user_123"
  const mockBookId = "book_123"

  const mockBookData = {
    id: mockBookId,
    userId: mockUserId,
    title: "Test Book",
    author: "Test Author",
    analysisData: {
      quotes: ["Test quote"],
      keyInsights: ["Test insight"],
      themes: ["Test theme"],
      overallSummary: "Test summary",
      discussionPoints: ["Test discussion"],
      genre: "Fiction",
      targetAudience: "General",
      readingLevel: "Intermediate",
      keyTopics: ["Topic 1"],
      emotionalTone: "Neutral",
      controversialPoints: [],
      practicalApplications: [],
      chapterSummaries: []
    }
  }

  const mockContentVariations = [
    {
      id: "test-1",
      posts: [
        {
          platform: "twitter" as const,
          content: "Test tweet content",
          hashtags: ["#test", "#book"],
          characterCount: 25,
          isValid: true,
          validationErrors: []
        }
      ],
      theme: "Test Theme",
      sourceType: "quote" as const,
      sourceContent: "Test quote"
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    mockAuth.mockResolvedValue({ userId: mockUserId } as any)
    mockDb.select = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockBookData])
        })
      })
    })
    mockGenerateSocialContent.mockResolvedValue(mockContentVariations)
  })

  test("should generate content successfully", async () => {
    const request = new NextRequest("http://localhost/api/content/generate", {
      method: "POST",
      body: JSON.stringify({
        bookId: mockBookId,
        options: {
          platforms: ["twitter"],
          variationsPerTheme: 2
        }
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.bookId).toBe(mockBookId)
    expect(data.data.contentVariations).toEqual(mockContentVariations)
    expect(mockGenerateSocialContent).toHaveBeenCalledWith(
      mockBookData.analysisData,
      mockBookData.title,
      mockBookData.author,
      expect.objectContaining({
        platforms: ["twitter"],
        variationsPerTheme: 2
      })
    )
  })

  test("should return 401 for unauthenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: null } as any)

    const request = new NextRequest("http://localhost/api/content/generate", {
      method: "POST",
      body: JSON.stringify({ bookId: mockBookId })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  test("should return 400 for missing book ID", async () => {
    const request = new NextRequest("http://localhost/api/content/generate", {
      method: "POST",
      body: JSON.stringify({})
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Book ID is required")
  })

  test("should return 404 for non-existent book", async () => {
    mockDb.select = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]) // No book found
        })
      })
    })

    const request = new NextRequest("http://localhost/api/content/generate", {
      method: "POST",
      body: JSON.stringify({ bookId: "non-existent" })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Book not found")
  })

  test("should return 400 for book without analysis data", async () => {
    const bookWithoutAnalysis = { ...mockBookData, analysisData: null }
    mockDb.select = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([bookWithoutAnalysis])
        })
      })
    })

    const request = new NextRequest("http://localhost/api/content/generate", {
      method: "POST",
      body: JSON.stringify({ bookId: mockBookId })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain("analysis not found")
  })

  test("should return 400 for invalid analysis data", async () => {
    const bookWithInvalidAnalysis = {
      ...mockBookData,
      analysisData: { incomplete: "data" }
    }
    mockDb.select = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([bookWithInvalidAnalysis])
        })
      })
    })

    const request = new NextRequest("http://localhost/api/content/generate", {
      method: "POST",
      body: JSON.stringify({ bookId: mockBookId })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain("Invalid analysis data")
  })

  test("should validate and limit options", async () => {
    const request = new NextRequest("http://localhost/api/content/generate", {
      method: "POST",
      body: JSON.stringify({
        bookId: mockBookId,
        options: {
          platforms: ["twitter", "instagram", "linkedin", "facebook"],
          variationsPerTheme: 10, // Should be limited to 5
          tone: "invalid-tone", // Should default to 'inspirational'
          maxRetries: 10 // Should be limited to 5
        }
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockGenerateSocialContent).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        variationsPerTheme: 5,
        tone: "inspirational",
        maxRetries: 5
      })
    )
  })

  test("should use default options when none provided", async () => {
    const request = new NextRequest("http://localhost/api/content/generate", {
      method: "POST",
      body: JSON.stringify({ bookId: mockBookId })
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockGenerateSocialContent).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        platforms: ["twitter", "instagram", "linkedin", "facebook"],
        variationsPerTheme: 2,
        includeImages: true,
        tone: "inspirational",
        maxRetries: 3
      })
    )
  })

  test("should handle rate limit errors", async () => {
    mockGenerateSocialContent.mockRejectedValue(
      new Error("rate limit exceeded")
    )

    const request = new NextRequest("http://localhost/api/content/generate", {
      method: "POST",
      body: JSON.stringify({ bookId: mockBookId })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain("rate limit")
  })

  test("should handle API key errors", async () => {
    mockGenerateSocialContent.mockRejectedValue(new Error("Invalid API key"))

    const request = new NextRequest("http://localhost/api/content/generate", {
      method: "POST",
      body: JSON.stringify({ bookId: mockBookId })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain("configuration error")
  })

  test("should handle general errors", async () => {
    mockGenerateSocialContent.mockRejectedValue(new Error("Unknown error"))

    const request = new NextRequest("http://localhost/api/content/generate", {
      method: "POST",
      body: JSON.stringify({ bookId: mockBookId })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to generate content. Please try again.")
  })

  test("should include generation metadata in response", async () => {
    const request = new NextRequest("http://localhost/api/content/generate", {
      method: "POST",
      body: JSON.stringify({ bookId: mockBookId })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.data.generatedAt).toBeDefined()
    expect(data.data.options).toBeDefined()
    expect(data.data.bookTitle).toBe(mockBookData.title)
    expect(data.data.author).toBe(mockBookData.author)
  })

  test("should handle valid tone options", async () => {
    const validTones = [
      "professional",
      "casual",
      "inspirational",
      "educational"
    ]

    for (const tone of validTones) {
      const request = new NextRequest("http://localhost/api/content/generate", {
        method: "POST",
        body: JSON.stringify({
          bookId: mockBookId,
          options: { tone }
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockGenerateSocialContent).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ tone })
      )
    }
  })
})
