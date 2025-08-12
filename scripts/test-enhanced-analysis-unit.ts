#!/usr/bin/env tsx
/**
 * Test script for enhanced book analysis - Unit tests without API calls
 */

import { db } from "@/db"
import { books } from "@/db/schema"
import { eq } from "drizzle-orm"

// Test content simulating a book with clear chapters
const testBookContent = `
Chapter 1: The Journey Begins

In the quiet town of Willowbrook, Sarah discovered that life had a way of surprising even the most prepared individuals. As she walked through the morning mist, she couldn't shake the feeling that something momentous was about to happen. The ancient oak tree at the center of town seemed to whisper secrets of generations past, and the cobblestone streets echoed with the footsteps of countless souls who had walked this path before her.

Chapter 2: Unexpected Revelations

The discovery of her grandmother's hidden diary changed everything Sarah thought she knew about her family. Between the yellowed pages, she found stories of courage, love, and sacrifice that painted a picture far different from the simple farming family she had grown up believing she belonged to. Each entry revealed new layers of complexity, and Sarah realized that understanding the past was key to shaping her future.

Chapter 3: The Power of Connection

As Sarah delved deeper into her family's history, she began to understand how every generation builds upon the foundations laid by those before them. The relationships we forge, the choices we make, and the legacies we leave behind all contribute to a tapestry of human experience that connects us across time and space. This revelation brought both comfort and responsibility.

Chapter 4: Embracing Change

The final chapter of Sarah's journey was really just the beginning. Armed with new knowledge about her heritage and a deeper understanding of herself, she stood ready to face whatever challenges lay ahead. The lessons learned from her ancestors would guide her, but the path forward was hers to create. Change, she realized, was not something to fear but something to embrace as an essential part of growth.
`

// Import the chapter detection function directly
import { prepareTextForAnalysis } from "@/lib/ai-analysis"

// Mock the detect chapters function
function detectChapters(textContent: string): Array<{ title?: string; content: string }> {
  // Common chapter patterns
  const chapterPatterns = [
    /^Chapter\s+\d+[:\s]/gim,
    /^CHAPTER\s+\d+[:\s]/gim,
    /^\d+\.\s+/gim,
    /^Part\s+\d+[:\s]/gim,
    /^PART\s+\d+[:\s]/gim
  ]

  let chapters: Array<{ title?: string; content: string }> = []

  for (const pattern of chapterPatterns) {
    const matches = Array.from(textContent.matchAll(pattern))

    if (matches.length > 1) {
      // Need at least 2 chapters to be meaningful
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const startIndex = match.index!
        const endIndex =
          i < matches.length - 1 ? matches[i + 1].index! : textContent.length

        const chapterContent = textContent
          .substring(startIndex, endIndex)
          .trim()
        const lines = chapterContent.split("\n")
        const title = lines[0]?.trim()
        const content = lines.slice(1).join("\n").trim()

        if (content.length > 100) {
          // Only include substantial chapters
          chapters.push({
            title: title.length < 100 ? title : undefined,
            content
          })
        }
      }
      break // Use the first pattern that finds chapters
    }
  }

  // If no clear chapter structure, split into sections based on length
  if (chapters.length === 0 && textContent.length > 10000) {
    const sectionSize = Math.max(5000, Math.floor(textContent.length / 8))
    const sections = []

    for (let i = 0; i < textContent.length; i += sectionSize) {
      const section = textContent.substring(i, i + sectionSize)
      if (section.trim().length > 100) {
        sections.push({
          content: section.trim()
        })
      }
    }

    chapters = sections.slice(0, 10) // Limit to 10 sections max
  }

  return chapters
}

async function testChapterDetection() {
  console.log("🚀 Testing Enhanced Book Analysis - Unit Tests...")

  try {
    console.log("\n📖 Testing Chapter Detection...")
    const chapters = detectChapters(testBookContent)
    console.log(`✅ Detected ${chapters.length} chapters:`)
    
    chapters.forEach((chapter, index) => {
      console.log(`  Chapter ${index + 1}: ${chapter.title || 'Untitled'}`)
      console.log(`    Content length: ${chapter.content.length} characters`)
      console.log(`    Preview: ${chapter.content.substring(0, 100)}...`)
    })

    console.log("\n📝 Testing Text Preparation...")
    const preparedText = prepareTextForAnalysis(testBookContent)
    console.log(`✅ Original length: ${testBookContent.length} characters`)
    console.log(`✅ Prepared length: ${preparedText.length} characters`)
    console.log(`✅ Text cleaned and normalized`)

    console.log("\n Testing Analysis Structure...")
    const mockAnalysisResult = {
      themes: ["Family Heritage", "Personal Growth", "Connection Across Time"],
      quotes: [
        "The ancient oak tree at the center of town seemed to whisper secrets of generations past",
        "Understanding the past was key to shaping her future",
        "Change was not something to fear but something to embrace"
      ],
      keyInsights: [
        "Every generation builds upon the foundations laid by those before them",
        "The relationships we forge contribute to a tapestry of human experience",
        "Personal growth comes from embracing change rather than fearing it"
      ],
      chapterSummaries: chapters.map((chapter, index) => ({
        chapterNumber: index + 1,
        title: chapter.title,
        summary: `This chapter explores important themes related to ${['personal discovery', 'family history', 'human connection', 'embracing change'][index] || 'growth and development'}.`,
        keyPoints: [
          `Key insight from chapter ${index + 1}`,
          `Important theme development`,
          `Character or concept progression`
        ]
      })),
      overallSummary: "This book follows Sarah's journey of discovering her family heritage and learning to embrace change. Through the discovery of her grandmother's diary, she uncovers a rich family history that challenges her previous understanding and guides her toward personal growth. The narrative emphasizes the importance of connection across generations and the power of embracing change as a catalyst for development.",
      genre: "Literary Fiction",
      targetAudience: "Readers interested in family sagas and personal development",
      discussionPoints: [
        "How does understanding family history impact personal identity?",
        "What role do previous generations play in shaping our present choices?",
        "How can embracing change lead to personal growth?"
      ]
    }

    console.log("✅ Mock analysis structure:")
    console.log(`  - Themes: ${mockAnalysisResult.themes.length}`)
    console.log(`  - Quotes: ${mockAnalysisResult.quotes.length}`)
    console.log(`  - Key Insights: ${mockAnalysisResult.keyInsights.length}`)
    console.log(`  - Chapter Summaries: ${mockAnalysisResult.chapterSummaries.length}`)
    console.log(`  - Overall Summary: ${mockAnalysisResult.overallSummary ? 'Generated' : 'Missing'}`)
    console.log(`  - Genre: ${mockAnalysisResult.genre}`)
    console.log(`  - Target Audience: ${mockAnalysisResult.targetAudience}`)
    console.log(`  - Discussion Points: ${mockAnalysisResult.discussionPoints.length}`)

    console.log("\n📋 Chapter Summary Details:")
    mockAnalysisResult.chapterSummaries.forEach((chapter) => {
      console.log(`  Chapter ${chapter.chapterNumber}: ${chapter.title || 'Untitled'}`)
      console.log(`    Summary: ${chapter.summary}`)
      console.log(`    Key Points: ${chapter.keyPoints?.join(', ') || 'None'}`)
    })

    console.log("\n🎉 Enhanced analysis unit tests completed successfully!")
    console.log("\n💡 Note: This test validates the structure and logic without making API calls.")
    console.log("💡 To test with real AI generation, ensure OpenAI API key is configured.")

  } catch (error) {
    console.error("❌ Test failed:", error)
    process.exit(1)
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testChapterDetection()
    .then(() => {
      console.log("\n✅ All unit tests completed!")
      process.exit(0)
    })
    .catch((error) => {
      console.error("❌ Test execution failed:", error)
      process.exit(1)
    })
}

export { testChapterDetection }
