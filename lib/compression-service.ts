import { gzip, gunzip } from 'zlib'
import { promisify } from 'util'
import { getCachedCompressedText, cacheCompressedText } from './cache-service'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

export interface CompressionStats {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  compressionTime: number
}

/**
 * Compress text content using gzip
 */
export async function compressText(text: string): Promise<{
  compressed: Buffer
  stats: CompressionStats
}> {
  const startTime = Date.now()
  const originalBuffer = Buffer.from(text, 'utf8')
  const originalSize = originalBuffer.length

  try {
    const compressed = await gzipAsync(originalBuffer)
    const compressedSize = compressed.length
    const compressionTime = Date.now() - startTime

    return {
      compressed,
      stats: {
        originalSize,
        compressedSize,
        compressionRatio: originalSize > 0 ? compressedSize / originalSize : 0,
        compressionTime
      }
    }
  } catch (error) {
    console.error('Text compression failed:', error)
    throw new Error('Failed to compress text')
  }
}

/**
 * Decompress text content
 */
export async function decompressText(compressed: Buffer): Promise<string> {
  try {
    const decompressed = await gunzipAsync(compressed)
    return decompressed.toString('utf8')
  } catch (error) {
    console.error('Text decompression failed:', error)
    throw new Error('Failed to decompress text')
  }
}

/**
 * Compress JSON data
 */
export async function compressJSON(data: unknown): Promise<{
  compressed: Buffer
  stats: CompressionStats
}> {
  const jsonString = JSON.stringify(data)
  return compressText(jsonString)
}

/**
 * Decompress JSON data
 */
export async function decompressJSON(compressed: Buffer): Promise<unknown> {
  const jsonString = await decompressText(compressed)
  return JSON.parse(jsonString)
}

/**
 * Compress book content with caching
 */
export async function compressBookContent(
  bookId: string,
  content: string
): Promise<{
  compressed: Buffer
  stats: CompressionStats
  cached: boolean
}> {
  // Check if already cached
  const cached = await getCachedCompressedText(bookId)
  if (cached) {
    return {
      compressed: Buffer.from(cached, 'base64'),
      stats: {
        originalSize: content.length,
        compressedSize: Buffer.from(cached, 'base64').length,
        compressionRatio: Buffer.from(cached, 'base64').length / content.length,
        compressionTime: 0
      },
      cached: true
    }
  }

  // Compress and cache
  const result = await compressText(content)
  const base64Compressed = result.compressed.toString('base64')
  
  // Cache the compressed content
  await cacheCompressedText(bookId, base64Compressed)

  return {
    ...result,
    cached: false
  }
}

/**
 * Decompress book content with caching
 */
export async function decompressBookContent(bookId: string): Promise<string | null> {
  try {
    const cached = await getCachedCompressedText(bookId)
    if (!cached) {
      return null
    }

    const compressed = Buffer.from(cached, 'base64')
    return await decompressText(compressed)
  } catch (error) {
    console.error('Failed to decompress book content:', error)
    return null
  }
}

/**
 * Compress analysis data
 */
export async function compressAnalysisData(analysisData: unknown): Promise<{
  compressed: string
  stats: CompressionStats
}> {
  const result = await compressJSON(analysisData)
  
  return {
    compressed: result.compressed.toString('base64'),
    stats: result.stats
  }
}

/**
 * Decompress analysis data
 */
export async function decompressAnalysisData(compressedData: string): Promise<unknown> {
  const compressed = Buffer.from(compressedData, 'base64')
  return await decompressJSON(compressed)
}

/**
 * Batch compress multiple texts
 */
export async function batchCompressTexts(
  texts: Array<{ id: string; content: string }>
): Promise<Array<{
  id: string
  compressed: Buffer
  stats: CompressionStats
}>> {
  const results = []

  for (const { id, content } of texts) {
    try {
      const result = await compressText(content)
      results.push({
        id,
        ...result
      })
    } catch (error) {
      console.error(`Failed to compress text for ${id}:`, error)
    }
  }

  return results
}

/**
 * Calculate compression statistics for a dataset
 */
export async function calculateCompressionStats(
  texts: string[]
): Promise<{
  totalOriginalSize: number
  totalCompressedSize: number
  averageCompressionRatio: number
  totalCompressionTime: number
  bestCompressionRatio: number
  worstCompressionRatio: number
}> {
  let totalOriginalSize = 0
  let totalCompressedSize = 0
  let totalCompressionTime = 0
  let bestRatio = Infinity
  let worstRatio = 0

  for (const text of texts) {
    try {
      const result = await compressText(text)
      
      totalOriginalSize += result.stats.originalSize
      totalCompressedSize += result.stats.compressedSize
      totalCompressionTime += result.stats.compressionTime
      
      bestRatio = Math.min(bestRatio, result.stats.compressionRatio)
      worstRatio = Math.max(worstRatio, result.stats.compressionRatio)
    } catch (error) {
      console.error('Failed to compress text in stats calculation:', error)
    }
  }

  return {
    totalOriginalSize,
    totalCompressedSize,
    averageCompressionRatio: totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 0,
    totalCompressionTime,
    bestCompressionRatio: bestRatio === Infinity ? 0 : bestRatio,
    worstCompressionRatio: worstRatio
  }
}

/**
 * Smart compression based on content size
 */
export async function smartCompress(
  content: string,
  minSizeForCompression: number = 1024 // 1KB
): Promise<{
  data: string | Buffer
  isCompressed: boolean
  stats?: CompressionStats
}> {
  const contentSize = Buffer.byteLength(content, 'utf8')

  // Don't compress small content
  if (contentSize < minSizeForCompression) {
    return {
      data: content,
      isCompressed: false
    }
  }

  try {
    const result = await compressText(content)
    
    // Only use compression if it provides significant savings
    if (result.stats.compressionRatio < 0.8) {
      return {
        data: result.compressed,
        isCompressed: true,
        stats: result.stats
      }
    } else {
      // Compression didn't provide enough benefit
      return {
        data: content,
        isCompressed: false,
        stats: result.stats
      }
    }
  } catch (error) {
    console.error('Smart compression failed:', error)
    return {
      data: content,
      isCompressed: false
    }
  }
}

/**
 * Smart decompression
 */
export async function smartDecompress(
  data: string | Buffer,
  isCompressed: boolean
): Promise<string> {
  if (!isCompressed) {
    return typeof data === 'string' ? data : data.toString('utf8')
  }

  try {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data
    return await decompressText(buffer)
  } catch (error) {
    console.error('Smart decompression failed:', error)
    // Fallback to treating as uncompressed
    return typeof data === 'string' ? data : data.toString('utf8')
  }
}

/**
 * Compression middleware for database operations
 */
export class CompressionMiddleware {
  private minSizeForCompression: number

  constructor(minSizeForCompression: number = 1024) {
    this.minSizeForCompression = minSizeForCompression
  }

  async compressForStorage(data: unknown): Promise<{
    data: unknown
    compressionMeta: {
      isCompressed: boolean
      originalSize?: number
      compressedSize?: number
      compressionRatio?: number
    }
  }> {
    if (typeof data === 'string') {
      const result = await smartCompress(data, this.minSizeForCompression)
      
      return {
        data: result.isCompressed ? result.data.toString('base64') : result.data,
        compressionMeta: {
          isCompressed: result.isCompressed,
          originalSize: result.stats?.originalSize,
          compressedSize: result.stats?.compressedSize,
          compressionRatio: result.stats?.compressionRatio
        }
      }
    } else if (typeof data === 'object') {
      const jsonString = JSON.stringify(data)
      const result = await smartCompress(jsonString, this.minSizeForCompression)
      
      return {
        data: result.isCompressed ? result.data.toString('base64') : JSON.parse(jsonString),
        compressionMeta: {
          isCompressed: result.isCompressed,
          originalSize: result.stats?.originalSize,
          compressedSize: result.stats?.compressedSize,
          compressionRatio: result.stats?.compressionRatio
        }
      }
    }

    return {
      data,
      compressionMeta: { isCompressed: false }
    }
  }

  async decompressFromStorage(
    data: unknown,
    compressionMeta: { isCompressed: boolean }
  ): Promise<unknown> {
    if (!compressionMeta.isCompressed) {
      return data
    }

    try {
      if (typeof data === 'string') {
        return await smartDecompress(data, true)
      }
      
      return data
    } catch (error) {
      console.error('Decompression from storage failed:', error)
      return data
    }
  }
}

// Export singleton instance
export const compressionMiddleware = new CompressionMiddleware()

/**
 * Utility to estimate compression benefits
 */
export async function estimateCompressionBenefit(
  content: string
): Promise<{
  worthCompressing: boolean
  estimatedSavings: number
  estimatedRatio: number
}> {
  try {
    const result = await compressText(content)
    const savings = result.stats.originalSize - result.stats.compressedSize
    const worthCompressing = result.stats.compressionRatio < 0.8 && savings > 512 // At least 512 bytes saved

    return {
      worthCompressing,
      estimatedSavings: savings,
      estimatedRatio: result.stats.compressionRatio
    }
  } catch (error) {
    return {
      worthCompressing: false,
      estimatedSavings: 0,
      estimatedRatio: 1
    }
  }
}