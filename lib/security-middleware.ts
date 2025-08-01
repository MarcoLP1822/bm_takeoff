import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { InputValidator, ValidationRule } from "./input-validation"
import { rateLimiters, createRateLimitMiddleware } from "./rate-limiting"
import { FileSecurityService } from "./file-security"
import { GDPRComplianceService } from "./gdpr-compliance"

export interface SecurityConfig {
  enableRateLimit: boolean
  enableInputValidation: boolean
  enableFileScanning: boolean
  enableGDPRLogging: boolean
  rateLimiter?: keyof typeof rateLimiters
}

export interface SecurityContext {
  userId: string
  ipAddress: string
  userAgent: string
  endpoint: string
}

export interface RateLimitError extends Error {
  status: number
  headers: Record<string, string>
}

export interface ExtendedNextRequest extends NextRequest {
  validatedBody?: unknown
  securityScan?: unknown
  userId?: string
}

export type ValidationSchema = Record<string, ValidationRule>

/**
 * Comprehensive security middleware for API endpoints
 */
export function createSecurityMiddleware(config: SecurityConfig) {
  return async (req: NextRequest) => {
    try {
      // Get security context
      const context = await getSecurityContext(req)

      // Rate limiting
      if (config.enableRateLimit && config.rateLimiter) {
        const rateLimiter = rateLimiters[config.rateLimiter]
        const rateLimitMiddleware = createRateLimitMiddleware(rateLimiter)

        try {
          const rateLimitResult = await rateLimitMiddleware(req, context.userId)

          // Add rate limit headers to response
          const headers = new Headers()
          Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
            headers.set(key, value)
          })
        } catch (error: unknown) {
          const rateLimitError = error as RateLimitError
          if (rateLimitError.status === 429) {
            return NextResponse.json(
              {
                error: "Rate limit exceeded",
                retryAfter: rateLimitError.headers["Retry-After"]
              },
              {
                status: 429,
                headers: rateLimitError.headers
              }
            )
          }
          throw error
        }
      }

      // GDPR activity logging
      if (config.enableGDPRLogging) {
        await GDPRComplianceService.logDataProcessing({
          userId: context.userId,
          action: "access",
          dataTypes: ["api_request"],
          timestamp: new Date().toISOString(),
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        })
      }

      return null // Continue to next middleware/handler
    } catch (error) {
      console.error("Security middleware error:", error)
      return NextResponse.json(
        { error: "Security check failed" },
        { status: 500 }
      )
    }
  }
}

/**
 * Input validation middleware
 */
export function createInputValidationMiddleware(schema: ValidationSchema) {
  return async (req: NextRequest) => {
    if (!req.body) return null

    try {
      const body = await req.json()
      const validationResult = InputValidator.validateApiRequest(body, schema)

      if (!validationResult.isValid) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: validationResult.errors
          },
          { status: 400 }
        )
      }

      // Attach sanitized data to request
      const extendedReq = req as ExtendedNextRequest
      extendedReq.validatedBody = validationResult.sanitizedValue
      return null
    } catch (error) {
      console.error("Input validation error:", error)
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      )
    }
  }
}

/**
 * File upload security middleware
 */
export function createFileUploadSecurityMiddleware() {
  return async (req: NextRequest) => {
    if (req.method !== "POST") return null

    try {
      const formData = await req.formData()
      const file = formData.get("file") as File

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      // Perform comprehensive security scan
      const scanResult = await FileSecurityService.performSecurityScan(file)

      if (!scanResult.passed) {
        // Quarantine file if threats detected
        if (scanResult.quarantined) {
          await FileSecurityService.quarantineFile(file, scanResult)
        }

        return NextResponse.json(
          {
            error: "File security scan failed",
            threats: scanResult.threats,
            scanId: scanResult.scanId
          },
          { status: 400 }
        )
      }

      // Attach scan result to request
      const extendedReq = req as ExtendedNextRequest
      extendedReq.securityScan = scanResult
      return null
    } catch (error) {
      console.error("File security middleware error:", error)
      return NextResponse.json(
        { error: "File security check failed" },
        { status: 500 }
      )
    }
  }
}

/**
 * CORS security middleware
 */
export function createCORSMiddleware(allowedOrigins: string[] = []) {
  return async (req: NextRequest) => {
    const origin = req.headers.get("origin")
    const isAllowed =
      !origin ||
      allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV === "development" && origin.includes("localhost"))

    if (!isAllowed) {
      return NextResponse.json(
        { error: "CORS policy violation" },
        { status: 403 }
      )
    }

    return null
  }
}

/**
 * Content Security Policy middleware
 */
export function createCSPMiddleware() {
  return async (req: NextRequest) => {
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.openai.com https://api.anthropic.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join("; ")

    const headers = new Headers()
    headers.set("Content-Security-Policy", cspHeader)
    headers.set("X-Frame-Options", "DENY")
    headers.set("X-Content-Type-Options", "nosniff")
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    )

    return null
  }
}

/**
 * Authentication middleware
 */
export function createAuthMiddleware(requireAuth: boolean = true) {
  return async (req: NextRequest) => {
    try {
      const { userId } = await auth()

      if (requireAuth && !userId) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      }

      // Attach user ID to request
      const extendedReq = req as ExtendedNextRequest
      extendedReq.userId = userId || undefined
      return null
    } catch (error) {
      console.error("Authentication middleware error:", error)
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      )
    }
  }
}

/**
 * Request sanitization middleware
 */
export function createSanitizationMiddleware() {
  return async (req: NextRequest) => {
    try {
      // Sanitize headers
      const sanitizedHeaders = new Headers()
      req.headers.forEach((value, key) => {
        const sanitizedKey = InputValidator.sanitizeText(key)
        const sanitizedValue = InputValidator.sanitizeText(value)
        sanitizedHeaders.set(sanitizedKey, sanitizedValue)
      })

      // Sanitize URL parameters
      const url = new URL(req.url)
      const sanitizedSearchParams = new URLSearchParams()
      url.searchParams.forEach((value, key) => {
        const sanitizedKey = InputValidator.sanitizeText(key)
        const sanitizedValue = InputValidator.sanitizeText(value)
        sanitizedSearchParams.set(sanitizedKey, sanitizedValue)
      })

      return null
    } catch (error) {
      console.error("Sanitization middleware error:", error)
      return NextResponse.json(
        { error: "Request sanitization failed" },
        { status: 400 }
      )
    }
  }
}

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(
  ...middlewares: Array<(req: NextRequest) => Promise<NextResponse | null>>
) {
  return async (req: NextRequest) => {
    for (const middleware of middlewares) {
      const result = await middleware(req)
      if (result) return result // Stop if middleware returns a response
    }
    return null
  }
}

/**
 * Get security context from request
 */
async function getSecurityContext(req: NextRequest): Promise<SecurityContext> {
  const { userId } = await auth()
  const forwarded = req.headers.get("x-forwarded-for")
  const ipAddress = forwarded
    ? forwarded.split(",")[0]
    : req.headers.get("x-real-ip") || "unknown"
  const userAgent = req.headers.get("user-agent") || "unknown"
  const endpoint = new URL(req.url).pathname

  return {
    userId: userId || "anonymous",
    ipAddress,
    userAgent,
    endpoint
  }
}

/**
 * Security headers for all responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  )
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  )

  return response
}

/**
 * Error handling middleware
 */
export function createErrorHandlingMiddleware() {
  return async (req: NextRequest) => {
    try {
      return null
    } catch (error: unknown) {
      console.error("Security error:", error)

      // Don't expose internal errors in production
      const message =
        process.env.NODE_ENV === "development"
          ? (error as Error).message
          : "Internal security error"

      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}
