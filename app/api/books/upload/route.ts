import { NextRequest, NextResponse } from "next/server"
import { createAuthenticatedSupabaseClient } from "@/lib/supabase"
import { TextExtractionService } from "@/lib/text-extraction"
import { db } from "@/db"
import { books } from "@/db/schema"
import { v4 as uuidv4 } from "uuid"
import { ErrorCreators, ValidationHelpers } from "@/lib/error-handling"
import { RetryService } from "@/lib/retry-service"
import { createBookHandler } from "@/lib/api-error-middleware"
import { FileSecurityService } from "@/lib/file-security"
import { InputValidator } from "@/lib/input-validation"
import {
  createSecurityMiddleware,
  addSecurityHeaders
} from "@/lib/security-middleware"
import { GDPRComplianceService } from "@/lib/gdpr-compliance"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/epub+zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
]
const SUPPORTED_FORMATS = ["PDF", "EPUB", "DOCX", "TXT"]

// Security middleware for file uploads
const securityMiddleware = createSecurityMiddleware({
  enableRateLimit: true,
  enableInputValidation: false,
  enableFileScanning: false, // We'll handle this manually
  enableGDPRLogging: true,
  rateLimiter: "upload"
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { auth } = await import("@clerk/nextjs/server")
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("✅ User authenticated:", userId)

    // Apply security middleware
    const securityResult = await securityMiddleware(request)
    if (securityResult) return securityResult

    console.log("✅ Security middleware passed")

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File

    console.log("📁 File received:", {
      name: file?.name,
      size: file?.size,
      type: file?.type
    })

    // Validate file presence
    ValidationHelpers.required(file, "file")

    // Comprehensive security scan
    const isDevelopment = process.env.NODE_ENV === "development"
    const skipSecurityScan =
      isDevelopment && process.env.SKIP_SECURITY_SCAN === "true"

    let securityScan
    if (skipSecurityScan) {
      // Skip security scan entirely in development if configured
      securityScan = {
        passed: true,
        threats: [],
        quarantined: false,
        scanId: "dev-skip"
      }
      console.log("Security scan skipped in development mode")
    } else {
      securityScan = await FileSecurityService.performSecurityScan(file, {
        enableVirusScanning: !isDevelopment, // Disable in development
        enableContentScanning: !isDevelopment, // Disable in development
        enableHashValidation: false, // Always disabled for now
        quarantineThreats: !isDevelopment, // Don't quarantine in development
        maxScanSize: MAX_FILE_SIZE
      })
    }

    if (!securityScan.passed) {
      // Quarantine file if threats detected
      if (securityScan.quarantined) {
        await FileSecurityService.quarantineFile(file, securityScan)
      }

      throw ErrorCreators.validation("file", "File failed security scan", {
        threats: securityScan.threats,
        scanId: securityScan.scanId
      })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw ErrorCreators.fileTooBig(`${MAX_FILE_SIZE / (1024 * 1024)}MB`)
    }

    // Validate file format
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      throw ErrorCreators.unsupportedFileFormat(SUPPORTED_FORMATS)
    }

    // Additional validation for file extension vs MIME type
    if (!TextExtractionService.isValidFileFormat(file.type)) {
      throw ErrorCreators.validation(
        "file",
        "File format validation failed. Please ensure the file is not corrupted.",
        { mimeType: file.type, fileName: file.name }
      )
    }

    // Sanitize file metadata
    const sanitizedTitle = InputValidator.sanitizeText(
      file.name.replace(/\.[^/.]+$/, "")
    )
    const sanitizedFileName = InputValidator.sanitizeText(file.name)

    // Convert file to buffer for processing
    const buffer = Buffer.from(await file.arrayBuffer())

    // Generate unique filename
    const fileExtension = TextExtractionService.getFileExtension(file.type)
    const uniqueFileName = `${userId}/${uuidv4()}${fileExtension}`

    console.log("📝 Generated filename:", uniqueFileName)

    // Create authenticated Supabase client for this user
    // This respects RLS policies properly
    console.log("🔐 Creating authenticated Supabase client...")
    const { client: supabaseAuth } = await createAuthenticatedSupabaseClient()
    console.log("✅ Authenticated client created successfully")

    // Upload file to Supabase Storage with retry
    console.log("📤 Starting file upload...")
    const uploadResult = await RetryService.retryNetworkOperation(
      async () => {
        const { data: uploadData, error: uploadError } =
          await supabaseAuth.storage
            .from("books")
            .upload(uniqueFileName, buffer, {
              contentType: file.type,
              upsert: false
            })

        if (uploadError) {
          console.error("❌ Upload error details:", {
            message: uploadError.message,
            details: uploadError,
            fileName: file.name,
            fileSize: file.size,
            uniqueFileName,
            userId
          })

          throw ErrorCreators.internal("File upload to storage failed", {
            error: uploadError.message,
            fileName: file.name,
            fileSize: file.size,
            details: uploadError
          })
        }

        console.log("✅ File uploaded successfully:", uploadData)
        return uploadData
      },
      {
        operationName: "File Upload",
        showToast: false // We'll handle toasts in the client
      }
    )

    // Get public URL for the uploaded file
    const {
      data: { publicUrl }
    } = supabaseAuth.storage.from("books").getPublicUrl(uniqueFileName)

    console.log("🔗 Public URL generated:", publicUrl)

    // Extract text content from the file with retry
    let textContent = ""
    let extractionMetadata: { title?: string; author?: string } = {}
    let extractionError: Error | null = null

    try {
      const extractionResult = await RetryService.retryFileProcessing(
        async () => {
          return await TextExtractionService.extractText(
            buffer,
            file.type,
            file.name
          )
        },
        {
          operationName: "Text Extraction",
          showToast: false
        }
      )

      textContent = extractionResult.text
      extractionMetadata = extractionResult.metadata || {}
    } catch (error) {
      extractionError = error as Error
      // Continue without text extraction - can be retried later
    }

    // Save book record to database with retry
    const newBook = await RetryService.retryDatabaseOperation(
      async () => {
        const [book] = await db
          .insert(books)
          .values({
            userId,
            title: InputValidator.sanitizeText(
              extractionMetadata.title || sanitizedTitle
            ),
            author: extractionMetadata.author
              ? InputValidator.sanitizeText(extractionMetadata.author)
              : null,
            fileName: sanitizedFileName,
            fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            fileUrl: publicUrl,
            textContent: textContent || null,
            analysisStatus: textContent ? "pending" : "failed"
          })
          .returning()

        if (!book) {
          throw ErrorCreators.databaseError("insert", { table: "books" })
        }

        return book
      },
      {
        operationName: "Save Book Record",
        showToast: false
      }
    )

    // Log GDPR activity
    await GDPRComplianceService.logDataProcessing({
      userId,
      action: "access",
      dataTypes: ["book_upload"],
      timestamp: new Date().toISOString(),
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown"
    })

    const response = NextResponse.json({
      success: true,
      book: {
        id: newBook.id,
        title: newBook.title,
        author: newBook.author,
        fileName: newBook.fileName,
        fileSize: newBook.fileSize,
        analysisStatus: newBook.analysisStatus,
        createdAt: newBook.createdAt
      },
      securityScan: {
        scanId: securityScan.scanId,
        passed: securityScan.passed
      },
      message: textContent
        ? "File uploaded successfully and text extracted"
        : "File uploaded successfully, but text extraction failed. You can retry analysis later.",
      ...(extractionError && {
        warnings: [
          {
            type: "TEXT_EXTRACTION_FAILED",
            message:
              "Text extraction failed but file was uploaded successfully",
            retryable: true
          }
        ]
      })
    })

    return addSecurityHeaders(response)
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
