import { NextResponse } from "next/server"

// Standard API response format
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: unknown
    suggestions?: string[]
  }
  meta?: {
    timestamp: string
    requestId?: string
    version?: string
  }
}

// Success response helper
export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<ApiResponse<T>["meta"]>
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0",
      ...meta
    }
  })
}

// Error response helper
export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  options?: {
    code?: string
    details?: unknown
    suggestions?: string[]
    requestId?: string
  }
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: options?.code,
        details: options?.details,
        suggestions: options?.suggestions
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: options?.requestId,
        version: "1.0"
      }
    },
    { status: statusCode }
  )
}

// Paginated response helper
export function createPaginatedResponse<T>(
  items: T[],
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore?: boolean
  },
  meta?: Partial<ApiResponse<unknown>["meta"]>
): NextResponse<ApiResponse<{
  items: T[]
  pagination: typeof pagination
}>> {
  return createSuccessResponse(
    {
      items,
      pagination: {
        ...pagination,
        hasMore: pagination.hasMore ?? pagination.offset + pagination.limit < pagination.total
      }
    },
    meta
  )
}

// Validation error response helper
export function createValidationErrorResponse(
  errors: Array<{
    field: string
    message: string
    code?: string
  }>,
  requestId?: string
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(
    "Validation failed",
    400,
    {
      code: "VALIDATION_ERROR",
      details: { errors },
      suggestions: [
        "Check the request payload format",
        "Ensure all required fields are provided",
        "Verify field types and constraints"
      ],
      requestId
    }
  )
}

// Business logic error response helper
export function createBusinessErrorResponse(
  message: string,
  code: string,
  statusCode: number = 400,
  suggestions?: string[],
  requestId?: string
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(
    message,
    statusCode,
    {
      code,
      suggestions,
      requestId
    }
  )
}

// Server error response helper
export function createServerErrorResponse(
  requestId?: string,
  details?: unknown
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(
    "Internal server error",
    500,
    {
      code: "INTERNAL_ERROR",
      details: process.env.NODE_ENV === "development" ? details : undefined,
      suggestions: [
        "Try again in a few moments",
        "Contact support if the problem persists"
      ],
      requestId
    }
  )
}

// Rate limit error response helper
export function createRateLimitErrorResponse(
  resetTime: Date,
  requestId?: string
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(
    "Rate limit exceeded",
    429,
    {
      code: "RATE_LIMIT_EXCEEDED",
      details: {
        resetTime: resetTime.toISOString(),
        retryAfter: Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      },
      suggestions: [
        "Wait before making more requests",
        "Consider upgrading your plan for higher limits",
        "Implement request batching in your application"
      ],
      requestId
    }
  )
}

// Authorization error response helper
export function createAuthErrorResponse(
  message: string = "Authentication required",
  requestId?: string
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(
    message,
    401,
    {
      code: "AUTHENTICATION_REQUIRED",
      suggestions: [
        "Ensure you are logged in",
        "Check your authentication token",
        "Refresh your session if expired"
      ],
      requestId
    }
  )
}

// Forbidden error response helper
export function createForbiddenErrorResponse(
  message: string = "Access denied",
  requestId?: string
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(
    message,
    403,
    {
      code: "ACCESS_DENIED",
      suggestions: [
        "Verify you have the required permissions",
        "Contact an administrator for access",
        "Check if your account is properly configured"
      ],
      requestId
    }
  )
}

// Not found error response helper
export function createNotFoundErrorResponse(
  resource: string,
  requestId?: string
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(
    `${resource} not found`,
    404,
    {
      code: "RESOURCE_NOT_FOUND",
      details: { resource },
      suggestions: [
        "Check the resource ID or identifier",
        "Ensure the resource exists and is accessible",
        "Verify the URL path is correct"
      ],
      requestId
    }
  )
}

// Conflict error response helper
export function createConflictErrorResponse(
  message: string,
  requestId?: string
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(
    message,
    409,
    {
      code: "CONFLICT",
      suggestions: [
        "Check for existing resources with the same identifier",
        "Ensure the operation is valid for the current state",
        "Try a different identifier or update the existing resource"
      ],
      requestId
    }
  )
}
