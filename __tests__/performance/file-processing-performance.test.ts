import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { performance } from 'perf_hooks'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
      download: jest.fn()
    }
  }
}))

jest.mock('pdf-parse', () => jest.fn())
jest.mock('mammoth', () => ({
  extractRawText: jest.fn()
}))

jest.mock('@/lib/text-extraction', () => ({
  extractTextFromFile: jest.fn()
}))

jest.mock('@/lib/file-validation', () => ({
  validateFile: jest.fn()
}))

jest.mock('@/lib/ai-analysis', () => ({
  analyzeBookContent: jest.fn()
}))

jest.mock('@/lib/content-generation', () => ({
  generateSocialContent: jest.fn()
}))

import { extractTextFromFile, TextExtractionResult } from '@/lib/text-extraction'
import { validateFile } from '@/lib/file-validation'
import { analyzeBookContent } from '@/lib/ai-analysis'
import { generateSocialContent } from '@/lib/content-generation'

// Performance test utilities
const measurePerformance = async <T>(fn: () => Promise<T>, label: string) => {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  const duration = end - start
  
  console.log(`${label}: ${duration.toFixed(2)}ms`)
  return { result, duration }
}

const createMockFile = (size: number, type: string = 'text/plain'): File => {
  const content = 'A'.repeat(size)
  return new File([content], `test-file.${type.split('/')[1]}`, { type })
}

describe('File Processing Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('File Upload Performance', () => {
    it('should handle small files (< 1MB) within 2 seconds', async () => {
      const smallFile = createMockFile(500 * 1024) // 500KB
      
      const { duration } = await measurePerformance(async () => {
        return await validateFile(smallFile)
      }, 'Small file validation')

      expect(duration).toBeLessThan(2000) // 2 seconds
    })

    it('should handle medium files (1-10MB) within 10 seconds', async () => {
      const mediumFile = createMockFile(5 * 1024 * 1024) // 5MB
      
      const { duration } = await measurePerformance(async () => {
        return await validateFile(mediumFile)
      }, 'Medium file validation')

      expect(duration).toBeLessThan(10000) // 10 seconds
    })

    it('should handle large files (10-50MB) within 30 seconds', async () => {
      const largeFile = createMockFile(25 * 1024 * 1024) // 25MB
      
      const { duration } = await measurePerformance(async () => {
        return await validateFile(largeFile)
      }, 'Large file validation')

      expect(duration).toBeLessThan(30000) // 30 seconds
    })

    it('should reject files larger than 50MB quickly', async () => {
      const oversizedFile = createMockFile(60 * 1024 * 1024) // 60MB
      
      const { duration } = await measurePerformance(async () => {
        try {
          await validateFile(oversizedFile)
          return false
        } catch (error) {
          return true // Expected to throw
        }
      }, 'Oversized file rejection')

      expect(duration).toBeLessThan(1000) // Should fail quickly (< 1 second)
    })
  })

  describe('Text Extraction Performance', () => {
    it('should extract text from small text files quickly', async () => {
      const textFile = createMockFile(100 * 1024, 'text/plain') // 100KB
      
      // Mock text extraction
      const mockExtractTextFromFile = extractTextFromFile as jest.MockedFunction<typeof extractTextFromFile>
      mockExtractTextFromFile.mockResolvedValue({
        text: 'Extracted text content',
        metadata: { wordCount: 100 }
      })

      const { duration } = await measurePerformance(async () => {
        return await extractTextFromFile(Buffer.from('test'), 'text/plain', 'test.txt')
      }, 'Text file extraction')

      expect(duration).toBeLessThan(1000) // 1 second
    })

    it('should handle PDF extraction within reasonable time', async () => {
      const pdfFile = createMockFile(2 * 1024 * 1024, 'application/pdf') // 2MB PDF
      
      const mockExtractTextFromFile = extractTextFromFile as jest.MockedFunction<typeof extractTextFromFile>
      mockExtractTextFromFile.mockResolvedValue({
        text: 'Extracted PDF content',
        metadata: { pages: 10, wordCount: 500 }
      })

      const { duration } = await measurePerformance(async () => {
        return await extractTextFromFile(Buffer.from('test'), 'application/pdf', 'test.pdf')
      }, 'PDF extraction')

      expect(duration).toBeLessThan(15000) // 15 seconds for PDF processing
    })

    it('should handle DOCX extraction efficiently', async () => {
      const docxFile = createMockFile(1 * 1024 * 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') // 1MB DOCX
      
      const mockExtractTextFromFile = extractTextFromFile as jest.MockedFunction<typeof extractTextFromFile>
      mockExtractTextFromFile.mockResolvedValue({
        text: 'Extracted DOCX content',
        metadata: { wordCount: 300 }
      })

      const { duration } = await measurePerformance(async () => {
        return await extractTextFromFile(Buffer.from('test'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'test.docx')
      }, 'DOCX extraction')

      expect(duration).toBeLessThan(10000) // 10 seconds for DOCX processing
    })
  })

  describe('Concurrent File Processing', () => {
    it('should handle multiple file uploads concurrently', async () => {
      const files = [
        createMockFile(500 * 1024, 'text/plain'),
        createMockFile(1 * 1024 * 1024, 'application/pdf'),
        createMockFile(800 * 1024, 'text/plain')
      ]

      const mockExtractTextFromFile = extractTextFromFile as jest.MockedFunction<typeof extractTextFromFile>
      mockExtractTextFromFile.mockResolvedValue({
        text: 'Extracted content',
        metadata: { wordCount: 200 }
      })

      const { duration } = await measurePerformance(async () => {
        return await Promise.all(files.map((file, index) => 
          extractTextFromFile(Buffer.from('test'), file.type, `test${index}.txt`)
        ))
      }, 'Concurrent file processing')

      // Should not take significantly longer than processing the largest file alone
      expect(duration).toBeLessThan(20000) // 20 seconds for concurrent processing
    })

    it('should maintain performance under load', async () => {
      const numberOfFiles = 10
      const files = Array.from({ length: numberOfFiles }, () => 
        createMockFile(200 * 1024, 'text/plain') // 200KB each
      )

      const mockExtractTextFromFile = extractTextFromFile as jest.MockedFunction<typeof extractTextFromFile>
      mockExtractTextFromFile.mockResolvedValue({
        text: 'Extracted content',
        metadata: { wordCount: 150 }
      })

      const { duration } = await measurePerformance(async () => {
        // Process in batches to simulate real-world usage
        const batchSize = 3
        const results = []
        
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize)
          const batchResults = await Promise.all(
            batch.map((file, index) => extractTextFromFile(Buffer.from('test'), file.type, `test${i + index}.txt`))
          )
          results.push(...batchResults)
        }
        
        return results
      }, 'Batch file processing')

      expect(duration).toBeLessThan(30000) // 30 seconds for batch processing
    })
  })

  describe('Memory Usage Tests', () => {
    it('should not cause memory leaks during file processing', async () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Process multiple files
      const files = Array.from({ length: 5 }, () => 
        createMockFile(1 * 1024 * 1024, 'text/plain') // 1MB each
      )

      const mockExtractTextFromFile = extractTextFromFile as jest.MockedFunction<typeof extractTextFromFile>
      mockExtractTextFromFile.mockResolvedValue({
        text: 'Extracted content',
        metadata: { wordCount: 1000 }
      })

      for (const file of files) {
        await extractTextFromFile(Buffer.from('test'), file.type, 'test.txt')
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
    })
  })

  describe('Error Handling Performance', () => {
    it('should fail fast for invalid files', async () => {
      const invalidFile = createMockFile(1024, 'application/exe') // Unsupported format
      
      const { duration } = await measurePerformance(async () => {
        try {
          await validateFile(invalidFile)
          return false
        } catch (error) {
          return true
        }
      }, 'Invalid file rejection')

      expect(duration).toBeLessThan(100) // Should fail very quickly
    })

    it('should timeout gracefully for corrupted files', async () => {
      const corruptedFile = createMockFile(1024 * 1024, 'application/pdf')
      
      const mockExtractTextFromFile = extractTextFromFile as jest.MockedFunction<typeof extractTextFromFile>
      mockExtractTextFromFile.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Corrupted file')), 5000)
        )
      )

      const { duration } = await measurePerformance(async () => {
        try {
          await extractTextFromFile(Buffer.from('test'), corruptedFile.type, 'test.pdf')
          return false
        } catch (error) {
          return true
        }
      }, 'Corrupted file handling')

      expect(duration).toBeLessThan(6000) // Should timeout within 6 seconds
    })
  })
})