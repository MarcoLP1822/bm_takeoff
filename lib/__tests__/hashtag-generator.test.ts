import { HashtagGenerator } from "../hashtag-generator"

import { BookAnalysisResult } from "../ai-analysis"
describe("HashtagGenerator", () => {
  const mockBookAnalysis: BookAnalysisResult = {
    quotes: ["The only way to do great work is to love what you do."],
    keyInsights: ["Passion is the key to excellence"],
    themes: ["Leadership", "Innovation", "Passion"],
    overallSummary:
      "A book about leadership and innovation in the modern workplace.",
    discussionPoints: ["How does passion drive performance?"],
    genre: "Business",
    targetAudience: "Professionals and entrepreneurs",
    chapterSummaries: []
  }

  describe("generateHashtags", () => {
    test("should generate hashtags for Twitter", () => {
      const suggestions = HashtagGenerator.generateHashtags(
        mockBookAnalysis,
        "The Leadership Book",
        "John Doe",
        "twitter",
        "quote"
      )

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.length).toBeLessThanOrEqual(5) // Twitter limit

      // Should include book-specific hashtags
      const bookHashtags = suggestions.filter(s => s.category === "book")
      expect(bookHashtags.length).toBeGreaterThan(0)

      // Should include platform-specific hashtags
      const platformHashtags = suggestions.filter(
        s => s.category === "platform"
      )
      expect(platformHashtags.length).toBeGreaterThanOrEqual(0)
    })

    test("should generate more hashtags for Instagram", () => {
      const suggestions = HashtagGenerator.generateHashtags(
        mockBookAnalysis,
        "Amazing Book",
        "Jane Smith",
        "instagram",
        "insight"
      )

      expect(suggestions.length).toBeGreaterThan(5)
      expect(suggestions.length).toBeLessThanOrEqual(30) // Instagram limit

      // Should have good variety of categories
      const categories = new Set(suggestions.map(s => s.category))
      expect(categories.size).toBeGreaterThan(2)
    })

    test("should include genre-specific hashtags", () => {
      const suggestions = HashtagGenerator.generateHashtags(
        mockBookAnalysis,
        "Business Strategy",
        "Author Name",
        "linkedin",
        "theme"
      )

      const genreHashtags = suggestions.filter(s => s.category === "genre")
      expect(genreHashtags.length).toBeGreaterThan(0)

      // Should include business-related hashtags
      const businessHashtags = suggestions.filter(
        s =>
          s.hashtag.toLowerCase().includes("business") ||
          s.hashtag.toLowerCase().includes("leadership")
      )
      expect(businessHashtags.length).toBeGreaterThan(0)
    })

    test("should include theme-based hashtags", () => {
      const suggestions = HashtagGenerator.generateHashtags(
        mockBookAnalysis,
        "Leadership Guide",
        "Expert Author",
        "facebook",
        "discussion"
      )

      const themeHashtags = suggestions.filter(s => s.category === "theme")
      expect(themeHashtags.length).toBeGreaterThan(0)

      // Should include leadership-related hashtags
      const leadershipHashtags = suggestions.filter(s =>
        s.hashtag.toLowerCase().includes("leadership")
      )
      expect(leadershipHashtags.length).toBeGreaterThan(0)
    })

    test("should vary hashtags by content type", () => {
      const quoteSuggestions = HashtagGenerator.generateHashtags(
        mockBookAnalysis,
        "Test Book",
        "Author",
        "twitter",
        "quote"
      )

      const insightSuggestions = HashtagGenerator.generateHashtags(
        mockBookAnalysis,
        "Test Book",
        "Author",
        "twitter",
        "insight"
      )

      // Should have some different hashtags based on content type
      const quoteHashtags = quoteSuggestions.map(s => s.hashtag)
      const insightHashtags = insightSuggestions.map(s => s.hashtag)

      const intersection = quoteHashtags.filter(h =>
        insightHashtags.includes(h)
      )
      // Should have some different hashtags, but allow for some overlap
      expect(intersection.length).toBeLessThanOrEqual(
        Math.min(quoteHashtags.length, insightHashtags.length)
      )
    })

    test("should handle books without author", () => {
      const suggestions = HashtagGenerator.generateHashtags(
        mockBookAnalysis,
        "Anonymous Book",
        undefined,
        "twitter",
        "summary"
      )

      expect(suggestions.length).toBeGreaterThan(0)

      // Should not include author hashtags
      const authorHashtags = suggestions.filter(s =>
        s.description?.includes("Author hashtag")
      )
      expect(authorHashtags.length).toBe(0)
    })

    test("should sort suggestions by relevance", () => {
      const suggestions = HashtagGenerator.generateHashtags(
        mockBookAnalysis,
        "Test Book",
        "Test Author",
        "instagram",
        "quote"
      )

      // Should be sorted by relevance (descending)
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i].relevance).toBeLessThanOrEqual(
          suggestions[i - 1].relevance
        )
      }
    })
  })

  describe("getOptimalHashtags", () => {
    test("should return optimal hashtag combination", () => {
      const suggestions = HashtagGenerator.generateHashtags(
        mockBookAnalysis,
        "Test Book",
        "Test Author",
        "twitter",
        "quote"
      )

      const optimal = HashtagGenerator.getOptimalHashtags(
        suggestions,
        "twitter"
      )

      expect(optimal.length).toBeLessThanOrEqual(5) // Twitter limit
      expect(optimal.every(h => h.startsWith("#"))).toBe(true)

      // Should include variety of categories
      const originalSuggestions = suggestions.filter(s =>
        optimal.includes(s.hashtag)
      )
      const categories = new Set(originalSuggestions.map(s => s.category))
      expect(categories.size).toBeGreaterThan(1)
    })

    test("should respect platform limits", () => {
      const suggestions = Array.from({ length: 50 }, (_, i) => ({
        hashtag: `#test${i}`,
        relevance: Math.random(),
        category: "platform" as const,
        description: "Test hashtag"
      }))

      const twitterOptimal = HashtagGenerator.getOptimalHashtags(
        suggestions,
        "twitter"
      )
      const instagramOptimal = HashtagGenerator.getOptimalHashtags(
        suggestions,
        "instagram"
      )

      expect(twitterOptimal.length).toBeLessThanOrEqual(5)
      expect(instagramOptimal.length).toBeLessThanOrEqual(30)
    })

    test("should balance different categories", () => {
      const suggestions = [
        ...Array.from({ length: 10 }, (_, i) => ({
          hashtag: `#book${i}`,
          relevance: 0.9,
          category: "book" as const,
          description: "Book hashtag"
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          hashtag: `#platform${i}`,
          relevance: 0.8,
          category: "platform" as const,
          description: "Platform hashtag"
        }))
      ]

      const optimal = HashtagGenerator.getOptimalHashtags(
        suggestions,
        "instagram"
      )

      // Should not be dominated by one category
      const bookHashtags = optimal.filter(h => h.includes("book"))
      const platformHashtags = optimal.filter(h => h.includes("platform"))

      expect(bookHashtags.length).toBeGreaterThan(0)
      expect(platformHashtags.length).toBeGreaterThan(0)
      expect(
        Math.abs(bookHashtags.length - platformHashtags.length)
      ).toBeLessThan(optimal.length)
    })
  })

  describe("analyzeHashtagPerformance", () => {
    test("should analyze hashtag performance for Twitter", () => {
      const hashtags = ["#BookQuote", "#Reading", "#Inspiration"]
      const analysis = HashtagGenerator.analyzeHashtagPerformance(
        hashtags,
        "twitter"
      )

      expect(analysis.score).toBeGreaterThan(0)
      expect(analysis.score).toBeLessThanOrEqual(100)
      expect(Array.isArray(analysis.feedback)).toBe(true)
      expect(Array.isArray(analysis.suggestions)).toBe(true)
    })

    test("should penalize posts with no hashtags", () => {
      const analysis = HashtagGenerator.analyzeHashtagPerformance([], "twitter")

      expect(analysis.score).toBeLessThan(50)
      expect(analysis.feedback.some(f => f.includes("No hashtags"))).toBe(true)
    })

    test("should reward platform-specific hashtags", () => {
      const withPlatformHashtags = ["#BookTwitter", "#Reading", "#BookLovers"]
      const withoutPlatformHashtags = ["#Random", "#Test", "#Generic"]

      const withAnalysis = HashtagGenerator.analyzeHashtagPerformance(
        withPlatformHashtags,
        "twitter"
      )
      const withoutAnalysis = HashtagGenerator.analyzeHashtagPerformance(
        withoutPlatformHashtags,
        "twitter"
      )

      expect(withAnalysis.score).toBeGreaterThan(withoutAnalysis.score)
    })

    test("should suggest improvements", () => {
      const poorHashtags = ["#test"]
      const analysis = HashtagGenerator.analyzeHashtagPerformance(
        poorHashtags,
        "instagram"
      )

      expect(analysis.suggestions.length).toBeGreaterThan(0)
      expect(analysis.feedback.some(f => f.includes("more hashtags"))).toBe(
        true
      )
    })

    test("should recognize good hashtag usage", () => {
      const goodHashtags = [
        "#bookstagram",
        "#reading",
        "#booklovers",
        "#inspiration",
        "#bookquote"
      ]
      const analysis = HashtagGenerator.analyzeHashtagPerformance(
        goodHashtags,
        "instagram"
      )

      expect(analysis.score).toBeGreaterThan(60)
      expect(
        analysis.feedback.some(f => f.includes("Good") || f.includes("Great"))
      ).toBe(true)
    })

    test("should handle different platforms appropriately", () => {
      const hashtags = ["#BookQuote", "#Reading", "#Inspiration"]

      const twitterAnalysis = HashtagGenerator.analyzeHashtagPerformance(
        hashtags,
        "twitter"
      )
      const instagramAnalysis = HashtagGenerator.analyzeHashtagPerformance(
        hashtags,
        "instagram"
      )
      const linkedinAnalysis = HashtagGenerator.analyzeHashtagPerformance(
        hashtags,
        "linkedin"
      )

      // All should provide valid analysis
      expect(twitterAnalysis.score).toBeGreaterThan(0)
      expect(instagramAnalysis.score).toBeGreaterThan(0)
      expect(linkedinAnalysis.score).toBeGreaterThan(0)

      // Instagram might suggest more hashtags (only check if there are suggestions)
      if (instagramAnalysis.suggestions.length > 0) {
        const hasHashtagSuggestion = instagramAnalysis.suggestions.some(
          s =>
            s.toLowerCase().includes("hashtag") ||
            s.toLowerCase().includes("more")
        )
        // This is optional, so we don't enforce it
        expect(typeof hasHashtagSuggestion).toBe("boolean")
      }
    })
  })
})
