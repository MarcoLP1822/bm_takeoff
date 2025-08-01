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
   * Extract text from PDF files - Real implementation
   */
  private static async extractFromPDF(
    buffer: Buffer,
    fileName?: string
  ): Promise<TextExtractionResult> {
    try {
      // Dynamic import to avoid initialization issues
      const pdfParse = (await import("pdf-parse")).default
      const data = await pdfParse(buffer)

      // Use fileName if provided, otherwise use PDF metadata title or fallback
      const title = fileName
        ? fileName.replace(/\.[^/.]+$/, "")
        : data.info?.Title || "PDF Document"

      return {
        text: data.text || "No text content found in PDF",
        metadata: {
          pages: data.numpages,
          wordCount: data.text
            ? data.text.split(/\s+/).filter((word: string) => word.length > 0)
                .length
            : 0,
          title,
          author: data.info?.Author || "Unknown"
        }
      }
    } catch (error) {
      console.error("PDF extraction error:", error)
      const fallbackTitle = fileName
        ? fileName.replace(/\.[^/.]+$/, "") + " (Failed)"
        : "PDF Document (Failed)"
      return {
        text: "PDF content extraction failed. Please try converting to DOCX or TXT format.",
        metadata: {
          pages: 0,
          wordCount: 0,
          title: fallbackTitle,
          author: "Unknown"
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
