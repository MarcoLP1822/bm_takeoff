#!/usr/bin/env tsx

/**
 * Script to populate the genre field for existing books from their analysis data
 * This is needed after adding genre sorting functionality
 */

import { db } from "../db"
import { books } from "../db/schema"
import { eq, and, isNull, isNotNull } from "drizzle-orm"

interface BookAnalysisResult {
  themes: string[]
  quotes: string[]
  keyInsights: string[]
  chapterSummaries: unknown[]
  overallSummary: string
  genre: string
  targetAudience: string
  discussionPoints: string[]
}

async function populateGenreField() {
  try {
    console.log("Starting genre field population...")

    // Find books that have analysis data but no genre field populated
    const booksToUpdate = await db
      .select({
        id: books.id,
        title: books.title,
        analysisData: books.analysisData
      })
      .from(books)
      .where(
        and(
          isNotNull(books.analysisData),
          isNull(books.genre)
        )
      )

    console.log(`Found ${booksToUpdate.length} books to update`)

    if (booksToUpdate.length === 0) {
      console.log("No books need genre field updates")
      return
    }

    let updatedCount = 0
    let skippedCount = 0

    for (const book of booksToUpdate) {
      try {
        const analysisData = book.analysisData as BookAnalysisResult
        
        if (analysisData && analysisData.genre && typeof analysisData.genre === 'string') {
          await db
            .update(books)
            .set({
              genre: analysisData.genre,
              updatedAt: new Date()
            })
            .where(eq(books.id, book.id))
          
          console.log(`✓ Updated "${book.title}" with genre: "${analysisData.genre}"`)
          updatedCount++
        } else {
          console.log(`⚠ Skipped "${book.title}" - no valid genre in analysis data`)
          skippedCount++
        }
      } catch (error) {
        console.error(`✗ Error updating "${book.title}":`, error)
        skippedCount++
      }
    }

    console.log(`\nGenre field population completed:`)
    console.log(`- Updated: ${updatedCount} books`)
    console.log(`- Skipped: ${skippedCount} books`)
    
  } catch (error) {
    console.error("Error populating genre field:", error)
    process.exit(1)
  }
}

// Run the script
populateGenreField()
  .then(() => {
    console.log("Script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Script failed:", error)
    process.exit(1)
  })
