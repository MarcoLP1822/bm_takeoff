#!/usr/bin/env tsx
/**
 * Test script for enhanced book analysis with chapter summaries and overall summary
 */

import { db } from "@/db"
import { books } from "@/db/schema"
import { eq } from "drizzle-orm"
import {
  analyzeBookContent,
  generateChapterSummaries,
  generateOverallSummary,
  identifyGenreAndAudience,
  identifyDiscussionPoints
} from "@/lib/ai-analysis"

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

async function testEnhancedAnalysis() {
  console.log("🚀 Testing Enhanced Book Analysis...")

  try {
    // Test individual functions
    console.log("\n📖 Testing Chapter Summaries Generation...")
    const chapterSummaries = await generateChapterSummaries(testBookContent, 'en', 2)
    console.log(`✅ Generated ${chapterSummaries.length} chapter summaries:`)
    chapterSummaries.forEach((chapter, index) => {
      console.log(`  Chapter ${chapter.chapterNumber}: ${chapter.title || 'Untitled'}`)
      console.log(`    Summary: ${chapter.summary}`)
      console.log(`    Key Points: ${chapter.keyPoints?.join(', ') || 'None'}`)
    })

    console.log("\n📋 Testing Overall Summary Generation...")
    const chunks = [testBookContent]
    const overallSummary = await generateOverallSummary(chunks, "The Journey of Discovery", 'en', "Test Author", 2)
    console.log(`✅ Generated overall summary: ${overallSummary}`)

    console.log("\n🎭 Testing Genre and Audience Identification...")
    const genreAndAudience = await identifyGenreAndAudience(chunks, "The Journey of Discovery", 'en', "Test Author", 2)
    console.log(`✅ Genre: ${genreAndAudience.genre}`)
    console.log(`✅ Target Audience: ${genreAndAudience.targetAudience}`)

    console.log("\n💬 Testing Discussion Points Identification...")
    const discussionPoints = await identifyDiscussionPoints(chunks, "The Journey of Discovery", 'en', "Test Author", 2)
    console.log(`✅ Generated ${discussionPoints.length} discussion points:`)
    discussionPoints.forEach((point, index) => {
      console.log(`  ${index + 1}. ${point}`)
    })

    console.log("\n🔍 Testing Complete Analysis...")
    const completeAnalysis = await analyzeBookContent(
      testBookContent,
      "The Journey of Discovery",
      "test-book-id",
      "test-user-id",
      "Test Author",
      { 
        includeChapterSummaries: true,
        locale: 'en',
        maxRetries: 2 
      }
    )

    console.log("✅ Complete analysis results:")
    console.log(`  - Themes: ${completeAnalysis.themes.length}`)
    console.log(`  - Quotes: ${completeAnalysis.quotes.length}`)
    console.log(`  - Key Insights: ${completeAnalysis.keyInsights.length}`)
    console.log(`  - Chapter Summaries: ${completeAnalysis.chapterSummaries.length}`)
    console.log(`  - Overall Summary: ${completeAnalysis.overallSummary ? 'Generated' : 'Missing'}`)
    console.log(`  - Genre: ${completeAnalysis.genre}`)
    console.log(`  - Target Audience: ${completeAnalysis.targetAudience}`)
    console.log(`  - Discussion Points: ${completeAnalysis.discussionPoints.length}`)

    console.log("\n🎉 Enhanced analysis test completed successfully!")

  } catch (error) {
    console.error("❌ Test failed:", error)
    process.exit(1)
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEnhancedAnalysis()
    .then(() => {
      console.log("\n✅ All tests completed!")
      process.exit(0)
    })
    .catch((error) => {
      console.error("❌ Test execution failed:", error)
      process.exit(1)
    })
}

export { testEnhancedAnalysis }
