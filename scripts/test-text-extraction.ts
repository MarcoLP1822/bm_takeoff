import { TextExtractionService } from '../lib/text-extraction'
import fs from 'fs'
import path from 'path'

async function testPDFExtraction() {
  try {
    // Crea un PDF di test semplice (solo per test - in produzione useresti un PDF reale)
    console.log('🧪 Testing PDF text extraction...')
    
    // Per ora testiamo se il servizio funziona con un buffer vuoto
    const emptyBuffer = Buffer.alloc(0)
    
    try {
      const result = await TextExtractionService.extractText(
        emptyBuffer,
        'application/pdf',
        'test.pdf'
      )
      console.log('Empty buffer test result:', result)
    } catch (error) {
      console.log('✅ Empty buffer correctly rejected:', (error as Error).message)
    }
    
    // Test con un PDF di esempio se ne hai uno
    const testPDFPath = 'test-book.txt' // Useremo il file di testo esistente per ora
    if (fs.existsSync(testPDFPath)) {
      console.log(`📄 Testing with file: ${testPDFPath}`)
      const buffer = fs.readFileSync(testPDFPath)
      
      try {
        const result = await TextExtractionService.extractText(
          buffer,
          'text/plain',
          'test-book.txt'
        )
        console.log('✅ Text extraction test result:')
        console.log('Text length:', result.text.length)
        console.log('Metadata:', result.metadata)
        console.log('First 200 chars:', result.text.substring(0, 200) + '...')
      } catch (error) {
        console.error('❌ Text extraction failed:', error)
      }
    }
    
    console.log('🏁 Test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Esegui il test
testPDFExtraction()
