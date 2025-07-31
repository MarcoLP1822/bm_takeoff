#!/usr/bin/env tsx
/**
 * Check current analysis_status for all books
 */

import { db } from '@/db'
import { books } from '@/db/schema'

async function checkAnalysisStatus() {
  try {
    console.log('📊 Checking analysis_status for all books...\n')
    
    const allBooks = await db
      .select({
        id: books.id,
        title: books.title,
        analysisStatus: books.analysisStatus,
        textContentLength: books.textContent,
        hasTextContent: books.textContent
      })
      .from(books)
      .orderBy(books.createdAt)
    
    console.log(`📚 Found ${allBooks.length} books total\n`)
    
    allBooks.forEach((book, index) => {
      console.log(`${index + 1}. "${book.title}"`)
      console.log(`   ID: ${book.id}`)
      console.log(`   Analysis Status: ${book.analysisStatus}`)
      console.log(`   Text Content: ${book.hasTextContent ? `${String(book.textContentLength).length} chars` : 'None'}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Error checking analysis status:', error)
    process.exit(1)
  }
}

// Run the check
checkAnalysisStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
