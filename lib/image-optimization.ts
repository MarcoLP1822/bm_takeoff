import sharp from "sharp"
import { createHash } from "crypto"
import { supabase } from "./supabase"

export interface ImageOptimizationOptions {
  width?: number
  height?: number
  quality?: number
  format?: "webp" | "jpeg" | "png"
  fit?: "cover" | "contain" | "fill" | "inside" | "outside"
}

export interface OptimizedImage {
  url: string
  width: number
  height: number
  format: string
  size: number
  hash: string
}

/**
 * Optimize image for quote graphics and social media
 */
export async function optimizeImage(
  imageBuffer: Buffer,
  options: ImageOptimizationOptions = {}
): Promise<{
  optimized: Buffer
  metadata: {
    width: number
    height: number
    format: string
    size: number
    hash: string
  }
}> {
  const {
    width = 1200,
    height = 630,
    quality = 85,
    format = "webp",
    fit = "cover"
  } = options

  try {
    // Create Sharp instance
    let sharpInstance = sharp(imageBuffer)

    // Resize image
    sharpInstance = sharpInstance.resize(width, height, { fit })

    // Apply format and quality
    switch (format) {
      case "webp":
        sharpInstance = sharpInstance.webp({ quality })
        break
      case "jpeg":
        sharpInstance = sharpInstance.jpeg({ quality })
        break
      case "png":
        sharpInstance = sharpInstance.png({ quality })
        break
    }

    // Get optimized buffer and metadata
    const optimized = await sharpInstance.toBuffer()
    const metadata = await sharp(optimized).metadata()

    // Generate hash for caching
    const hash = createHash("md5").update(optimized).digest("hex")

    return {
      optimized,
      metadata: {
        width: metadata.width || width,
        height: metadata.height || height,
        format: metadata.format || format,
        size: optimized.length,
        hash
      }
    }
  } catch (error) {
    console.error("Image optimization failed:", error)
    throw new Error("Failed to optimize image")
  }
}

/**
 * Generate responsive image variants
 */
export async function generateResponsiveImages(
  imageBuffer: Buffer,
  baseName: string
): Promise<OptimizedImage[]> {
  const variants = [
    { width: 1200, height: 630, suffix: "large" }, // Social media large
    { width: 800, height: 420, suffix: "medium" }, // Social media medium
    { width: 400, height: 210, suffix: "small" }, // Social media small
    { width: 1080, height: 1080, suffix: "square" }, // Instagram square
    { width: 1080, height: 1920, suffix: "story" } // Instagram story
  ]

  const results: OptimizedImage[] = []

  for (const variant of variants) {
    try {
      const { optimized, metadata } = await optimizeImage(imageBuffer, {
        width: variant.width,
        height: variant.height,
        format: "webp",
        quality: 85
      })

      // Upload to Supabase storage
      const fileName = `${baseName}_${variant.suffix}.webp`
      const { data, error } = await supabase.storage
        .from("quote-images")
        .upload(fileName, optimized, {
          contentType: "image/webp",
          cacheControl: "31536000" // 1 year cache
        })

      if (error) {
        console.error(`Failed to upload ${fileName}:`, error)
        continue
      }

      // Get public URL
      const {
        data: { publicUrl }
      } = supabase.storage.from("quote-images").getPublicUrl(fileName)

      results.push({
        url: publicUrl,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        hash: metadata.hash
      })
    } catch (error) {
      console.error(`Failed to generate ${variant.suffix} variant:`, error)
    }
  }

  return results
}

/**
 * Create quote graphic with text overlay
 */
export async function createQuoteGraphic(
  quote: string,
  author: string,
  bookTitle: string,
  options: {
    width?: number
    height?: number
    backgroundColor?: string
    textColor?: string
    fontFamily?: string
    fontSize?: number
  } = {}
): Promise<Buffer> {
  const {
    width = 1200,
    height = 630,
    backgroundColor = "#1a1a1a",
    textColor = "#ffffff",
    fontSize = 48
  } = options

  try {
    // Create SVG with quote text
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${backgroundColor}"/>
        <foreignObject x="60" y="60" width="${width - 120}" height="${height - 120}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="
            font-family: 'Inter', sans-serif;
            color: ${textColor};
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 100%;
            text-align: center;
            padding: 40px;
          ">
            <blockquote style="
              font-size: ${fontSize}px;
              line-height: 1.4;
              margin: 0 0 40px 0;
              font-weight: 400;
              quotes: '"' '"';
            ">
              "${quote}"
            </blockquote>
            <div style="
              font-size: ${fontSize * 0.6}px;
              opacity: 0.8;
              font-weight: 500;
            ">
              — ${author}
            </div>
            <div style="
              font-size: ${fontSize * 0.5}px;
              opacity: 0.6;
              margin-top: 10px;
              font-style: italic;
            ">
              ${bookTitle}
            </div>
          </div>
        </foreignObject>
      </svg>
    `

    // Convert SVG to image buffer
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer()

    return buffer
  } catch (error) {
    console.error("Failed to create quote graphic:", error)
    throw new Error("Failed to create quote graphic")
  }
}

/**
 * Compress and cache image
 */
export async function compressAndCacheImage(
  imageBuffer: Buffer,
  cacheKey: string,
  options: ImageOptimizationOptions = {}
): Promise<string> {
  try {
    // Check if already cached
    const { data: existingFile } = await supabase.storage
      .from("optimized-images")
      .list("", { search: cacheKey })

    if (existingFile && existingFile.length > 0) {
      const {
        data: { publicUrl }
      } = supabase.storage.from("optimized-images").getPublicUrl(cacheKey)
      return publicUrl
    }

    // Optimize image
    const { optimized } = await optimizeImage(imageBuffer, options)

    // Upload to cache
    const { data, error } = await supabase.storage
      .from("optimized-images")
      .upload(cacheKey, optimized, {
        contentType: `image/${options.format || "webp"}`,
        cacheControl: "31536000" // 1 year cache
      })

    if (error) {
      throw new Error(`Failed to cache image: ${error.message}`)
    }

    // Return public URL
    const {
      data: { publicUrl }
    } = supabase.storage.from("optimized-images").getPublicUrl(cacheKey)

    return publicUrl
  } catch (error) {
    console.error("Failed to compress and cache image:", error)
    throw error
  }
}

/**
 * Generate image variants for different platforms
 */
export async function generatePlatformImages(
  baseImage: Buffer,
  baseName: string
): Promise<Record<string, OptimizedImage[]>> {
  const platformSpecs = {
    twitter: [
      { width: 1200, height: 675, suffix: "card" },
      { width: 1200, height: 600, suffix: "summary" }
    ],
    instagram: [
      { width: 1080, height: 1080, suffix: "post" },
      { width: 1080, height: 1920, suffix: "story" }
    ],
    linkedin: [
      { width: 1200, height: 627, suffix: "share" },
      { width: 1128, height: 191, suffix: "banner" }
    ],
    facebook: [
      { width: 1200, height: 630, suffix: "share" },
      { width: 820, height: 312, suffix: "cover" }
    ]
  }

  const results: Record<string, OptimizedImage[]> = {}

  for (const [platform, specs] of Object.entries(platformSpecs)) {
    results[platform] = []

    for (const spec of specs) {
      try {
        const { optimized, metadata } = await optimizeImage(baseImage, {
          width: spec.width,
          height: spec.height,
          format: "webp",
          quality: 85
        })

        const fileName = `${baseName}_${platform}_${spec.suffix}.webp`
        const { data, error } = await supabase.storage
          .from("platform-images")
          .upload(fileName, optimized, {
            contentType: "image/webp",
            cacheControl: "31536000"
          })

        if (error) {
          console.error(`Failed to upload ${fileName}:`, error)
          continue
        }

        const {
          data: { publicUrl }
        } = supabase.storage.from("platform-images").getPublicUrl(fileName)

        results[platform].push({
          url: publicUrl,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: metadata.size,
          hash: metadata.hash
        })
      } catch (error) {
        console.error(`Failed to generate ${platform} ${spec.suffix}:`, error)
      }
    }
  }

  return results
}

/**
 * Clean up old cached images
 */
export async function cleanupOldImages(
  olderThanDays: number = 30
): Promise<void> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const buckets = ["optimized-images", "quote-images", "platform-images"]

    for (const bucket of buckets) {
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list("", { limit: 1000 })

      if (error) {
        console.error(`Failed to list files in ${bucket}:`, error)
        continue
      }

      const oldFiles =
        files?.filter(file => new Date(file.created_at) < cutoffDate) || []

      if (oldFiles.length > 0) {
        const filePaths = oldFiles.map(file => file.name)
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove(filePaths)

        if (deleteError) {
          console.error(
            `Failed to delete old files from ${bucket}:`,
            deleteError
          )
        } else {
          console.log(`Cleaned up ${oldFiles.length} old files from ${bucket}`)
        }
      }
    }
  } catch (error) {
    console.error("Failed to cleanup old images:", error)
  }
}
