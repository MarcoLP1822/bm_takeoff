#!/usr/bin/env tsx
/**
 * Fix analysis_status for existing books in the database
 * Sets NULL values to 'pending' as per schema default
 */

import { db } from '@/db'
import { books } from '@/db/schema'
import { isNull } from 'drizzle-orm'

async function fixAnalysisStatus() {
  try {
    console.log('🔍 Checking for books with NULL analysis_status...')
    
    // Find books with NULL analysis_status
    const booksWithNullStatus = await db
      .select({
        id: books.id,
        title: books.title,
        analysisStatus: books.analysisStatus
      })
      .from(books)
      .where(isNull(books.analysisStatus))
    
    console.log(`📊 Found ${booksWithNullStatus.length} books with NULL analysis_status`)
    
    if (booksWithNullStatus.length === 0) {
      console.log('✅ No books need fixing!')
      return
    }
    
    // Show which books will be updated
    booksWithNullStatus.forEach(book => {
      console.log(`📖 "${book.title}" (${book.id}) - status: ${book.analysisStatus}`)
    })
    
    // Update NULL analysis_status to 'pending'
    await db
      .update(books)
      .set({
        analysisStatus: 'pending',
        updatedAt: new Date()
      })
      .where(isNull(books.analysisStatus))
    
    console.log(`✅ Updated ${booksWithNullStatus.length} books`)
    console.log('🎉 Analysis status fix completed successfully!')
    
  } catch (error) {
    console.error('❌ Error fixing analysis status:', error)
    process.exit(1)
  }
}

// Run if script is executed directly
if (require.main === module) {
  fixAnalysisStatus()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

export { fixAnalysisStatus }
