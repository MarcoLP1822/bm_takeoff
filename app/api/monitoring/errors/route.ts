import { NextRequest, NextResponse } from "next/server"
import {
  withAuth,
  ErrorLogger,
  AppError,
  ErrorType,
  ErrorSeverity
} from "@/lib/error-handling"
import { z } from "zod"

// Type for client error objects from stats
interface ClientError {
  timestamp: string
  message: string
  stack?: string
  type?: ErrorType
  severity?: ErrorSeverity
  statusCode?: number
  userMessage?: string
  details?: Record<string, unknown>
  retryable?: boolean
  context?: Record<string, unknown>
}

// Schema for error reporting
const errorReportSchema = z.object({
  timestamp: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  type: z.nativeEnum(ErrorType).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  statusCode: z.number().optional(),
  userMessage: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  retryable: z.boolean().optional(),
  context: z
    .object({
      url: z.string().optional(),
      userAgent: z.string().optional(),
      userId: z.string().optional(),
      sessionId: z.string().optional(),
      component: z.string().optional(),
      action: z.string().optional()
    })
    .optional()
})

// POST endpoint for receiving error reports from client
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { auth } = await import("@clerk/nextjs/server")
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Validate the error report
    const errorData = errorReportSchema.parse(body)

    // Add server-side context
    const enhancedContext = {
      ...errorData.context,
      userId,
      serverTimestamp: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || undefined,
      ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
      referer: request.headers.get("referer") || undefined
    }

    // Create AppError instance if it's a structured error
    let error: Error
    if (errorData.type && errorData.statusCode && errorData.userMessage) {
      error = new AppError(
        errorData.message,
        errorData.type,
        errorData.statusCode,
        errorData.userMessage,
        errorData.severity as ErrorSeverity,
        errorData.details,
        errorData.retryable || false
      )
    } else {
      error = new Error(errorData.message)
      if (errorData.stack) {
        error.stack = errorData.stack
      }
    }

    // Log the error with enhanced context
    ErrorLogger.log(error, enhancedContext)

    return NextResponse.json({
      success: true,
      message: "Error logged successfully",
      timestamp: new Date().toISOString()
    })
  } catch (validationError) {
    // Log validation errors but don't fail the request
    console.warn("Invalid error report received:", validationError)

    return NextResponse.json(
      {
        success: false,
        error: "Invalid error report format"
      },
      { status: 400 }
    )
  }
}

// GET endpoint for retrieving error statistics and health metrics
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { auth } = await import("@clerk/nextjs/server")
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stats = ErrorLogger.getErrorStats()
    const url = new URL(request.url)
    const timeframe = url.searchParams.get("timeframe") || "1h" // 1h, 24h, 7d

    // Calculate time window
    const now = Date.now()
    const timeWindows = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000
    }
    const windowMs =
      timeWindows[timeframe as keyof typeof timeWindows] || timeWindows["1h"]
    const cutoffTime = now - windowMs

    // Filter errors by timeframe
    const recentErrors = (stats.clientErrors as ClientError[]).filter(
      (error: ClientError) => {
        const errorTime = new Date(error.timestamp).getTime()
        return errorTime >= cutoffTime
      }
    )

    // Group errors by type and severity
    const errorsByType = recentErrors.reduce(
      (acc: Record<string, number>, error: ClientError) => {
        const type = error.type || "UNKNOWN"
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const errorsBySeverity = recentErrors.reduce(
      (acc: Record<string, number>, error: ClientError) => {
        const severity = error.severity || "UNKNOWN"
        acc[severity] = (acc[severity] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Calculate error rate (errors per hour)
    const errorRate = recentErrors.length / (windowMs / (60 * 60 * 1000))

    // Identify top error patterns
    const errorPatterns = recentErrors.reduce(
      (acc: Record<string, number>, error: ClientError) => {
        const pattern = `${error.type}:${error.message.substring(0, 50)}`
        acc[pattern] = (acc[pattern] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const topPatterns = Object.entries(errorPatterns)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }))

    // System health indicators
    const criticalErrors = recentErrors.filter(
      (e: ClientError) => e.severity === "CRITICAL"
    ).length
    const highSeverityErrors = recentErrors.filter(
      (e: ClientError) => e.severity === "HIGH"
    ).length
    const retryableErrors = recentErrors.filter(
      (e: ClientError) => e.retryable
    ).length

    const healthScore = Math.max(
      0,
      100 -
        criticalErrors * 20 -
        highSeverityErrors * 10 -
        recentErrors.length * 2
    )

    return NextResponse.json({
      success: true,
      data: {
        timeframe,
        summary: {
          totalErrors: recentErrors.length,
          errorRate: Math.round(errorRate * 100) / 100,
          criticalErrors,
          highSeverityErrors,
          retryableErrors,
          healthScore: Math.round(healthScore)
        },
        breakdown: {
          byType: errorsByType,
          bySeverity: errorsBySeverity,
          topPatterns
        },
        recentErrors: recentErrors.slice(-20).map((error: ClientError) => ({
          timestamp: error.timestamp,
          type: error.type,
          severity: error.severity,
          message: error.message,
          retryable: error.retryable,
          context: error.context
        })),
        trends: {
          lastHour: (stats.clientErrors as ClientError[]).filter(
            (e: ClientError) =>
              new Date(e.timestamp).getTime() >= now - 60 * 60 * 1000
          ).length,
          last24Hours: (stats.clientErrors as ClientError[]).filter(
            (e: ClientError) =>
              new Date(e.timestamp).getTime() >= now - 24 * 60 * 60 * 1000
          ).length
        }
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve error statistics"
      },
      { status: 500 }
    )
  }
}

// DELETE endpoint for clearing error statistics
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const { auth } = await import("@clerk/nextjs/server")
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    ErrorLogger.clearErrorStats()

    return NextResponse.json({
      success: true,
      message: "Error statistics cleared successfully"
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to clear error statistics"
      },
      { status: 500 }
    )
  }
}
