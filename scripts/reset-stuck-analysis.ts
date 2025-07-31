#!/usr/bin/env tsx
/**
 * Reset stuck analysis processes back to pending
 */

import { db } from '@/db'
import { books } from '@/db/schema'
import { eq } from 'drizzle-orm'

async function resetStuckAnalysis() {
  try {
    console.log('🔄 Checking for stuck analysis processes...\n')
    
    // Find books stuck in processing state
    const stuckBooks = await db
      .select({
        id: books.id,
        title: books.title,
        analysisStatus: books.analysisStatus,
        updatedAt: books.updatedAt
      })
      .from(books)
      .where(eq(books.analysisStatus, 'processing'))
    
    console.log(`📊 Found ${stuckBooks.length} books in processing state`)
    
    if (stuckBooks.length === 0) {
      console.log('✅ No stuck analyses found!')
      return
    }
    
    // Show which books will be reset
    stuckBooks.forEach(book => {
      const timeSince = new Date().getTime() - new Date(book.updatedAt).getTime()
      const minutesAgo = Math.floor(timeSince / (1000 * 60))
      console.log(`📖 "${book.title}" - processing for ${minutesAgo} minutes`)
    })
    
    console.log('\n🔄 Resetting stuck analyses to pending...')
    
    // Reset processing status to pending
    await db
      .update(books)
      .set({
        analysisStatus: 'pending',
        updatedAt: new Date()
      })
      .where(eq(books.analysisStatus, 'processing'))
    
    console.log(`✅ Reset ${stuckBooks.length} books to pending`)
    console.log('🎉 Analysis reset completed successfully!')
    
  } catch (error) {
    console.error('❌ Error resetting analysis status:', error)
    process.exit(1)
  }
}

// Run if script is executed directly
if (require.main === module) {
  resetStuckAnalysis()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

export { resetStuckAnalysis }
