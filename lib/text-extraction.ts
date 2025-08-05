// Real text extraction implementation with proper libraries
import mammoth from "mammoth"
import AdmZip from "adm-zip"

export interface TextExtractionResult {
  text: string
  metadata?: {
    title?: string
    author?: string
    pages?: number
    wordCount?: number
  }
}

// PDF.js text content item interface
interface TextItem {
  str: string
}

interface TextMarkedContent {
  type: string
}

type PDFTextItem = TextItem | TextMarkedContent

export class TextExtractionService {
  /**
   * Extract text from various file formats
   */
  static async extractText(
    buffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<TextExtractionResult> {
    try {
      switch (mimeType) {
        case "application/pdf":
          return await this.extractFromPDF(buffer, fileName)

        case "application/epub+zip":
          return await this.extractFromEPUB(buffer, fileName)

        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          return await this.extractFromDOCX(buffer, fileName)

        case "text/plain":
          return await this.extractFromTXT(buffer, fileName)

        default:
          throw new Error(`Unsupported file format: ${mimeType}`)
      }
    } catch (error) {
      throw new Error(
        `Failed to extract text from ${fileName}: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  /**
   * Extract text from PDF files - Robust implementation with multiple fallbacks
   */
  private static async extractFromPDF(
    buffer: Buffer,
    fileName?: string
  ): Promise<TextExtractionResult> {
    // Validate buffer first
    if (!buffer || buffer.length === 0) {
      throw new Error("Invalid or empty PDF buffer")
    }

    console.log(`📄 Starting PDF text extraction for: ${fileName || 'unnamed'}, size: ${buffer.length} bytes`)

    // Method 1: Try pdf-parse first (most reliable when it works)
    try {
      console.log("📖 Attempting PDF extraction with pdf-parse...")
      
      const pdfParseModule = await import("pdf-parse")
      const pdfParse = pdfParseModule.default || pdfParseModule
      
      // Ensure we have a clean buffer
      const cleanBuffer = Buffer.from(buffer)
      
      // Call with minimal options to avoid any file system issues
      const pdfData = await pdfParse(cleanBuffer)
      
      const text = pdfData?.text ? String(pdfData.text).trim() : ""
      const title = fileName ? fileName.replace(/\.[^/.]+$/, "") : "PDF Document"

      console.log(`✅ pdf-parse extraction completed: ${text.length} characters extracted`)

      return {
        text: text || "No text content found in PDF",
        metadata: {
          pages: pdfData?.numpages || 0,
          wordCount: text
            ? text.split(/\s+/).filter((word: string) => word.length > 0).length
            : 0,
          title,
          author: "Unknown"
        }
      }
      
    } catch (pdfParseError) {
      console.warn("⚠️ pdf-parse failed, trying pdf2json fallback:", pdfParseError)
      
      // Method 2: Try pdf2json as fallback
      try {
        console.log("📖 Attempting PDF extraction with pdf2json...")
        
        const PDFParser = (await import("pdf2json")).default
        
        return new Promise<TextExtractionResult>((resolve, reject) => {
          const pdfParser = new PDFParser()
          
          pdfParser.on("pdfParser_dataError", (errData: unknown) => {
            console.warn("⚠️ pdf2json error:", errData)
            reject(new Error(`pdf2json failed: ${(errData as {parserError?: string})?.parserError || 'Unknown error'}`))
          })
          
          pdfParser.on("pdfParser_dataReady", (pdfData: unknown) => {
            try {
              let text = ""
              const data = pdfData as {Pages?: Array<{Texts?: Array<{R?: Array<{T?: string}>}>}>}
              
              // Extract text from all pages
              if (data?.Pages) {
                for (const page of data.Pages) {
                  if (page?.Texts) {
                    for (const textObj of page.Texts) {
                      if (textObj?.R) {
                        for (const run of textObj.R) {
                          if (run?.T) {
                            text += decodeURIComponent(run.T) + " "
                          }
                        }
                      }
                    }
                  }
                }
              }
              
              text = text.trim()
              const title = fileName ? fileName.replace(/\.[^/.]+$/, "") : "PDF Document"
              
              console.log(`✅ pdf2json extraction completed: ${text.length} characters extracted`)
              
              resolve({
                text: text || "No text content found in PDF",
                metadata: {
                  pages: data?.Pages?.length || 0,
                  wordCount: text
                    ? text.split(/\s+/).filter((word: string) => word.length > 0).length
                    : 0,
                  title,
                  author: "Unknown"
                }
              })
            } catch (parseError) {
              reject(parseError)
            }
          })
          
          // Parse the buffer
          pdfParser.parseBuffer(buffer)
        })
        
      } catch (pdf2jsonError) {
        console.error("❌ Both PDF extraction methods failed:", {
          pdfParseError: pdfParseError instanceof Error ? pdfParseError.message : String(pdfParseError),
          pdf2jsonError: pdf2jsonError instanceof Error ? pdf2jsonError.message : String(pdf2jsonError)
        })
        
        const fallbackTitle = fileName
          ? fileName.replace(/\.[^/.]+$/, "") + " (Extraction Failed)"
          : "PDF Document (Extraction Failed)"
        
        // Return a meaningful fallback response instead of throwing
        return {
          text: `PDF text extraction failed using multiple methods. This may be due to:
• The PDF being password-protected
• The PDF containing only scanned images (requiring OCR)
• Corrupted or malformed PDF structure
• Complex PDF features not supported by the extractors

Please try:
1. Converting the PDF to DOCX or TXT format
2. Using OCR software if it's a scanned document
3. Ensuring the PDF is not password-protected
4. Trying a different PDF file

Technical details: Both pdf-parse and pdf2json failed to extract text from this document.`,
          metadata: {
            pages: 0,
            wordCount: 0,
            title: fallbackTitle,
            author: "Unknown"
          }
        }
      }
    }
  }

  /**
   * Extract text from EPUB files - Real implementation
   */
  private static async extractFromEPUB(
    buffer: Buffer,
    fileName?: string
  ): Promise<TextExtractionResult> {
    try {
      const zip = new AdmZip(buffer)
      const entries = zip.getEntries()

      let text = ""
      let title = fileName ? fileName.replace(/\.[^/.]+$/, "") : "EPUB Document"

      // Extract text from HTML/XHTML files
      for (const entry of entries) {
        if (
          entry.entryName.endsWith(".html") ||
          entry.entryName.endsWith(".xhtml")
        ) {
          const content = entry.getData().toString("utf8")
          // Simple HTML tag removal
          const textContent = content
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
          text += textContent + " "
        }

        // Try to extract title from content.opf (only if fileName is not provided)
        if (
          !fileName &&
          (entry.entryName.includes("content.opf") ||
            entry.entryName.includes("metadata"))
        ) {
          const metaContent = entry.getData().toString("utf8")
          const titleMatch = metaContent.match(
            /<dc:title[^>]*>(.*?)<\/dc:title>/i
          )
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim()
          }
        }
      }

      const wordCount = text
        .split(/\s+/)
        .filter((word: string) => word.length > 0).length

      return {
        text: text.trim() || "No text content found in EPUB",
        metadata: {
          wordCount,
          title,
          author: "Unknown"
        }
      }
    } catch (error) {
      console.error("EPUB extraction error:", error)
      const fallbackTitle = fileName
        ? fileName.replace(/\.[^/.]+$/, "") + " (Failed)"
        : "EPUB Document (Failed)"
      return {
        text: "EPUB content extraction failed. Please try converting to DOCX or TXT format.",
        metadata: {
          title: fallbackTitle,
          author: "Unknown",
          wordCount: 0
        }
      }
    }
  }

  /**
   * Extract text from DOCX files - Real implementation
   */
  private static async extractFromDOCX(
    buffer: Buffer,
    fileName?: string
  ): Promise<TextExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer })
      const text = result.value || "No text content found in DOCX"

      // Calculate word count
      const wordCount = text
        .split(/\s+/)
        .filter((word: string) => word.length > 0).length

      // Use fileName if provided, otherwise fallback to generic title
      const title = fileName
        ? fileName.replace(/\.[^/.]+$/, "")
        : "DOCX Document"

      return {
        text,
        metadata: {
          wordCount,
          title,
          author: "Unknown"
        }
      }
    } catch (error) {
      console.error("DOCX extraction error:", error)
      const fallbackTitle = fileName
        ? fileName.replace(/\.[^/.]+$/, "") + " (Failed)"
        : "DOCX Document (Failed)"
      return {
        text: "DOCX content extraction failed. Please try converting to TXT format.",
        metadata: {
          wordCount: 0,
          title: fallbackTitle,
          author: "Unknown"
        }
      }
    }
  }

  /**
   * Extract text from plain text files
   */
  private static async extractFromTXT(
    buffer: Buffer,
    fileName?: string
  ): Promise<TextExtractionResult> {
    const text = buffer.toString("utf-8")
    const title = fileName ? fileName.replace(/\.[^/.]+$/, "") : "Text Document"

    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
        title,
        author: "Unknown"
      }
    }
  }

  /**
   * Validate file format based on MIME type
   */
  static isValidFileFormat(mimeType: string): boolean {
    const supportedFormats = [
      "application/pdf",
      "application/epub+zip",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ]

    return supportedFormats.includes(mimeType)
  }

  /**
   * Get file extension from MIME type
   */
  static getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      "application/pdf": ".pdf",
      "application/epub+zip": ".epub",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx",
      "text/plain": ".txt"
    }

    return mimeToExt[mimeType] || ""
  }
}

// Export function for backward compatibility with tests
export const extractTextFromFile = TextExtractionService.extractText
