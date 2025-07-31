import { NextResponse, NextRequest } from 'next/server'

// Error types for different categories
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  FILE_PROCESSING = 'FILE_PROCESSING',
  NETWORK = 'NETWORK',
  INTERNAL = 'INTERNAL'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Type definitions for error details
export type ErrorDetails = Record<string, unknown>

export interface LogData {
  timestamp: string
  message: string
  stack?: string
  context?: Record<string, unknown>
  type?: ErrorType
  severity?: ErrorSeverity
  statusCode?: number
  userMessage?: string
  details?: ErrorDetails
  retryable?: boolean
}

// Custom error class with additional context
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly severity: ErrorSeverity
  public readonly statusCode: number
  public readonly userMessage: string
  public readonly details?: ErrorDetails
  public readonly retryable: boolean
  public readonly timestamp: Date

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number,
    userMessage: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: ErrorDetails,
    retryable: boolean = false
  ) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.severity = severity
    this.statusCode = statusCode
    this.userMessage = userMessage
    this.details = details
    this.retryable = retryable
    this.timestamp = new Date()

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, AppError)
  }
}

// Predefined error creators for common scenarios
export const ErrorCreators = {
  // Authentication errors
  unauthorized: (details?: ErrorDetails) => new AppError(
    'User not authenticated',
    ErrorType.AUTHENTICATION,
    401,
    'Please log in to access this resource',
    ErrorSeverity.MEDIUM,
    details
  ),

  // Authorization errors
  forbidden: (resource: string, details?: ErrorDetails) => new AppError(
    `Access denied to ${resource}`,
    ErrorType.AUTHORIZATION,
    403,
    'You do not have permission to access this resource',
    ErrorSeverity.MEDIUM,
    details
  ),

  // Validation errors
  validation: (field: string, message: string, details?: ErrorDetails) => new AppError(
    `Validation failed for ${field}: ${message}`,
    ErrorType.VALIDATION,
    400,
    message,
    ErrorSeverity.LOW,
    details
  ),

  // File processing errors
  fileTooBig: (maxSize: string) => new AppError(
    'File size exceeds limit',
    ErrorType.FILE_PROCESSING,
    400,
    `File size must be less than ${maxSize}`,
    ErrorSeverity.LOW,
    { maxSize },
    false
  ),

  unsupportedFileFormat: (supportedFormats: string[]) => new AppError(
    'Unsupported file format',
    ErrorType.FILE_PROCESSING,
    400,
    `Supported formats: ${supportedFormats.join(', ')}`,
    ErrorSeverity.LOW,
    { supportedFormats },
    false
  ),

  textExtractionFailed: (fileName: string) => new AppError(
    `Text extraction failed for ${fileName}`,
    ErrorType.FILE_PROCESSING,
    422,
    'Unable to extract text from this file. Please try a different format or check if the file is corrupted.',
    ErrorSeverity.MEDIUM,
    { fileName },
    true
  ),

  // External service errors
  aiServiceUnavailable: () => new AppError(
    'AI analysis service is temporarily unavailable',
    ErrorType.EXTERNAL_SERVICE,
    503,
    'AI analysis is temporarily unavailable. Please try again in a few minutes.',
    ErrorSeverity.HIGH,
    undefined,
    true
  ),

  socialMediaApiError: (platform: string, details?: ErrorDetails) => new AppError(
    `${platform} API error`,
    ErrorType.EXTERNAL_SERVICE,
    502,
    `Unable to connect to ${platform}. Please check your account connection and try again.`,
    ErrorSeverity.MEDIUM,
    { platform, ...details },
    true
  ),

  // Database errors
  databaseError: (operation: string, details?: ErrorDetails) => new AppError(
    `Database ${operation} failed`,
    ErrorType.DATABASE,
    500,
    'A database error occurred. Please try again.',
    ErrorSeverity.HIGH,
    { operation, ...details },
    true
  ),

  // Rate limiting
  rateLimitExceeded: (limit: number, resetTime?: Date) => new AppError(
    'Rate limit exceeded',
    ErrorType.RATE_LIMIT,
    429,
    `Too many requests. Please wait before trying again.`,
    ErrorSeverity.MEDIUM,
    { limit, resetTime },
    true
  ),

  // Not found errors
  notFound: (resource: string, id?: string) => new AppError(
    `${resource} not found`,
    ErrorType.NOT_FOUND,
    404,
    `The requested ${resource.toLowerCase()} could not be found`,
    ErrorSeverity.LOW,
    { resource, id }
  ),

  // Network errors
  networkError: (details?: ErrorDetails) => new AppError(
    'Network connection failed',
    ErrorType.NETWORK,
    503,
    'Network connection failed. Please check your internet connection and try again.',
    ErrorSeverity.MEDIUM,
    details,
    true
  ),

  // Internal server errors
  internal: (message: string, details?: ErrorDetails) => new AppError(
    message,
    ErrorType.INTERNAL,
    500,
    'An unexpected error occurred. Please try again.',
    ErrorSeverity.HIGH,
    details,
    true
  ),

  // Content generation errors
  contentGenerationFailed: (reason?: string, details?: ErrorDetails) => new AppError(
    `Content generation failed: ${reason || 'Unknown error'}`,
    ErrorType.EXTERNAL_SERVICE,
    422,
    'Unable to generate content. This might be due to AI service limits or book analysis issues.',
    ErrorSeverity.MEDIUM,
    { reason, ...details },
    true
  ),

  aiQuotaExceeded: () => new AppError(
    'AI service quota exceeded',
    ErrorType.RATE_LIMIT,
    429,
    'You have reached your AI analysis limit. Please wait or upgrade your plan.',
    ErrorSeverity.MEDIUM,
    { service: 'AI' },
    false
  ),

  // Publishing errors
  publishingFailed: (platform: string, reason?: string, details?: ErrorDetails) => new AppError(
    `Publishing to ${platform} failed: ${reason || 'Unknown error'}`,
    ErrorType.EXTERNAL_SERVICE,
    502,
    `Failed to publish to ${platform}. This could be due to account permissions or platform issues.`,
    ErrorSeverity.MEDIUM,
    { platform, reason, ...details },
    true
  ),

  socialAccountExpired: (platform: string) => new AppError(
    `${platform} account connection expired`,
    ErrorType.AUTHENTICATION,
    401,
    `Your ${platform} account connection has expired. Please reconnect your account.`,
    ErrorSeverity.MEDIUM,
    { platform },
    false
  ),

  // Scheduling errors
  schedulingFailed: (reason?: string, details?: ErrorDetails) => new AppError(
    `Scheduling failed: ${reason || 'Unknown error'}`,
    ErrorType.INTERNAL,
    422,
    'Unable to schedule post. Please check your scheduled time and try again.',
    ErrorSeverity.MEDIUM,
    { reason, ...details },
    true
  ),

  invalidScheduleTime: (scheduledTime: Date) => new AppError(
    'Invalid schedule time',
    ErrorType.VALIDATION,
    400,
    'Scheduled time must be in the future and within platform limits.',
    ErrorSeverity.LOW,
    { scheduledTime, minTime: new Date(Date.now() + 5 * 60 * 1000) }, // 5 minutes from now
    false
  ),

  // Analytics errors
  analyticsUnavailable: (platform?: string) => new AppError(
    `Analytics data unavailable${platform ? ` for ${platform}` : ''}`,
    ErrorType.EXTERNAL_SERVICE,
    503,
    `Analytics data is temporarily unavailable${platform ? ` for ${platform}` : ''}. Please try again later.`,
    ErrorSeverity.LOW,
    { platform },
    true
  ),

  // Book management errors
  bookAnalysisInProgress: (bookTitle: string) => new AppError(
    'Book analysis already in progress',
    ErrorType.VALIDATION,
    409,
    `"${bookTitle}" is currently being analyzed. Please wait for the current analysis to complete.`,
    ErrorSeverity.LOW,
    { bookTitle },
    false
  ),

  bookAnalysisRequired: (bookTitle: string) => new AppError(
    'Book analysis required',
    ErrorType.VALIDATION,
    400,
    `"${bookTitle}" must be analyzed before generating content. Please run the analysis first.`,
    ErrorSeverity.LOW,
    { bookTitle },
    false
  ),

  // Content management errors
  contentNotFound: (contentId: string) => new AppError(
    'Content not found',
    ErrorType.NOT_FOUND,
    404,
    'The requested content could not be found. It may have been deleted.',
    ErrorSeverity.LOW,
    { contentId },
    false
  ),

  contentAlreadyPublished: (contentId: string) => new AppError(
    'Content already published',
    ErrorType.VALIDATION,
    409,
    'This content has already been published and cannot be modified.',
    ErrorSeverity.LOW,
    { contentId },
    false
  )
}

// Enhanced error logging service with monitoring capabilities
export class ErrorLogger {
  private static errorCounts = new Map<string, number>()
  private static lastErrorTimes = new Map<string, number>()
  private static readonly ERROR_RATE_WINDOW = 60000 // 1 minute
  private static readonly MAX_ERRORS_PER_WINDOW = 10

  static log(error: AppError | Error, context?: Record<string, unknown>) {
    const logData = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      ...(error instanceof AppError && {
        type: error.type,
        severity: error.severity,
        statusCode: error.statusCode,
        userMessage: error.userMessage,
        details: error.details,
        retryable: error.retryable
      })
    }

    // Track error frequency for monitoring
    this.trackErrorFrequency(error, logData)

    // Log to console with enhanced formatting
    if (error instanceof AppError) {
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
          console.error('🚨 CRITICAL ERROR:', this.formatLogData(logData))
          this.alertCriticalError(logData)
          break
        case ErrorSeverity.HIGH:
          console.error('❌ HIGH SEVERITY ERROR:', this.formatLogData(logData))
          break
        case ErrorSeverity.MEDIUM:
          console.warn('⚠️ MEDIUM SEVERITY ERROR:', this.formatLogData(logData))
          break
        case ErrorSeverity.LOW:
          console.info('ℹ️ LOW SEVERITY ERROR:', this.formatLogData(logData))
          break
      }
    } else {
      console.error('💥 UNHANDLED ERROR:', this.formatLogData(logData))
    }

    // Send to monitoring service
    this.sendToMonitoringService(logData)
    
    // Store error for analytics
    this.storeErrorForAnalytics(logData)
  }

  private static trackErrorFrequency(error: AppError | Error, logData: LogData) {
    const errorKey = error instanceof AppError 
      ? `${error.type}:${error.statusCode}` 
      : `UNHANDLED:${error.name}`
    
    const now = Date.now()
    const lastTime = this.lastErrorTimes.get(errorKey) || 0
    
    // Reset counter if outside time window
    if (now - lastTime > this.ERROR_RATE_WINDOW) {
      this.errorCounts.set(errorKey, 1)
    } else {
      const count = (this.errorCounts.get(errorKey) || 0) + 1
      this.errorCounts.set(errorKey, count)
      
      // Alert if error rate is too high
      if (count >= this.MAX_ERRORS_PER_WINDOW) {
        console.error('🚨 HIGH ERROR RATE DETECTED:', {
          errorType: errorKey,
          count,
          timeWindow: this.ERROR_RATE_WINDOW / 1000,
          lastError: logData
        })
      }
    }
    
    this.lastErrorTimes.set(errorKey, now)
  }

  private static formatLogData(logData: LogData) {
    return {
      ...logData,
      userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location?.href : logData.context?.url,
      userId: logData.context?.userId || 'anonymous'
    }
  }

  private static alertCriticalError(logData: LogData) {
    // In production, this would send immediate alerts (email, Slack, etc.)
    console.error('🚨 CRITICAL ERROR ALERT - IMMEDIATE ATTENTION REQUIRED:', {
      error: logData.message,
      timestamp: logData.timestamp,
      context: logData.context,
      stack: logData.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
    })
  }

  private static sendToMonitoringService(logData: LogData) {
    // Enhanced monitoring service integration
    try {
      // Example: Sentry integration
      // Sentry.captureException(new Error(logData.message), {
      //   tags: {
      //     errorType: logData.type,
      //     severity: logData.severity
      //   },
      //   extra: logData,
      //   level: this.getSentryLevel(logData.severity)
      // })

      // Example: Custom monitoring endpoint
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
        fetch('/api/monitoring/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logData)
        }).catch(() => {
          // Silently fail to avoid recursive errors
        })
      }
    } catch (monitoringError) {
      // Don't let monitoring errors break the application
      console.warn('Failed to send error to monitoring service:', monitoringError)
    }
  }

  private static storeErrorForAnalytics(logData: LogData) {
    // Store error data for analytics and trending
    try {
      const errorAnalytics = {
        timestamp: logData.timestamp,
        type: logData.type || 'UNHANDLED',
        severity: logData.severity || 'UNKNOWN',
        message: logData.message,
        context: logData.context,
        retryable: logData.retryable || false
      }

      // Store in localStorage for client-side errors (with size limits)
      if (typeof window !== 'undefined') {
        const stored = JSON.parse(localStorage.getItem('error_analytics') || '[]')
        stored.push(errorAnalytics)
        
        // Keep only last 50 errors to prevent storage bloat
        if (stored.length > 50) {
          stored.splice(0, stored.length - 50)
        }
        
        localStorage.setItem('error_analytics', JSON.stringify(stored))
      }
    } catch (storageError) {
      // Don't let storage errors break the application
      console.warn('Failed to store error analytics:', storageError)
    }
  }

  // Get error statistics for monitoring dashboard
  static getErrorStats() {
    const stats = {
      errorCounts: Object.fromEntries(this.errorCounts),
      lastErrorTimes: Object.fromEntries(this.lastErrorTimes),
      clientErrors: typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('error_analytics') || '[]')
        : []
    }
    
    return stats
  }

  // Clear error tracking data
  static clearErrorStats() {
    this.errorCounts.clear()
    this.lastErrorTimes.clear()
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('error_analytics')
    }
  }
}

// Enhanced API error handler middleware with recovery suggestions
export function handleApiError(error: unknown, context?: Record<string, unknown>): NextResponse {
  let appError: AppError

  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof Error) {
    // Convert generic errors to AppError with better categorization
    if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      appError = ErrorCreators.networkError({ originalError: error.message })
    } else if (error.message.includes('timeout')) {
      appError = ErrorCreators.internal('Request timeout', { 
        originalError: error.name,
        suggestion: 'The operation took too long. Please try again.'
      })
    } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      appError = ErrorCreators.unauthorized({ originalError: error.message })
    } else {
      appError = ErrorCreators.internal(error.message, { originalError: error.name })
    }
  } else {
    // Handle non-Error objects
    appError = ErrorCreators.internal('Unknown error occurred', { error })
  }

  // Log the error with enhanced context
  ErrorLogger.log(appError, context)

  // Generate recovery suggestions based on error type
  const recoverySuggestions = generateRecoverySuggestions(appError)

  // Return comprehensive error response
  return NextResponse.json(
    {
      error: appError.userMessage,
      type: appError.type,
      retryable: appError.retryable,
      suggestions: recoverySuggestions,
      ...(appError.details && { details: appError.details }),
      ...(context?.requestId ? { requestId: context.requestId } : {}),
      timestamp: appError.timestamp.toISOString()
    },
    { 
      status: appError.statusCode,
      headers: {
        'X-Error-Type': appError.type,
        'X-Retryable': appError.retryable.toString(),
        ...(context?.requestId ? { 'X-Request-ID': String(context.requestId) } : {})
      }
    }
  )
}

// Generate contextual recovery suggestions for different error types
function generateRecoverySuggestions(error: AppError): string[] {
  const suggestions: string[] = []

  switch (error.type) {
    case ErrorType.AUTHENTICATION:
      suggestions.push('Please log in again')
      suggestions.push('Clear your browser cache and cookies')
      suggestions.push('Try using an incognito/private browser window')
      break

    case ErrorType.AUTHORIZATION:
      suggestions.push('Contact your administrator for access')
      suggestions.push('Verify you have the necessary permissions')
      break

    case ErrorType.VALIDATION:
      suggestions.push('Check your input and try again')
      suggestions.push('Ensure all required fields are filled')
      if (error.details?.field) {
        suggestions.push(`Fix the issue with: ${error.details.field}`)
      }
      break

    case ErrorType.FILE_PROCESSING:
      suggestions.push('Try uploading a different file format')
      suggestions.push('Ensure your file is not corrupted')
      suggestions.push('Check that your file size is within limits')
      if (error.details?.supportedFormats && Array.isArray(error.details.supportedFormats)) {
        suggestions.push(`Supported formats: ${(error.details.supportedFormats as string[]).join(', ')}`)
      }
      break

    case ErrorType.RATE_LIMIT:
      if (error.details?.resetTime && typeof error.details.resetTime === 'string') {
        const resetTime = new Date(error.details.resetTime)
        suggestions.push(`Try again after ${resetTime.toLocaleTimeString()}`)
      } else {
        suggestions.push('Wait a few minutes before trying again')
      }
      suggestions.push('Consider upgrading your plan for higher limits')
      break

    case ErrorType.EXTERNAL_SERVICE:
      suggestions.push('The service may be temporarily unavailable')
      suggestions.push('Try again in a few minutes')
      suggestions.push('Check the service status page')
      if (error.details?.platform) {
        suggestions.push(`Check your ${error.details.platform} account connection`)
      }
      break

    case ErrorType.NETWORK:
      suggestions.push('Check your internet connection')
      suggestions.push('Try refreshing the page')
      suggestions.push('Disable VPN if you are using one')
      break

    case ErrorType.DATABASE:
      suggestions.push('This is a temporary issue, please try again')
      suggestions.push('If the problem persists, contact support')
      break

    case ErrorType.NOT_FOUND:
      suggestions.push('The requested item may have been deleted')
      suggestions.push('Check if you have the correct permissions')
      suggestions.push('Try refreshing the page')
      break

    default:
      if (error.retryable) {
        suggestions.push('Try the operation again')
        suggestions.push('If the problem persists, contact support')
      } else {
        suggestions.push('Please contact support for assistance')
      }
      break
  }

  return suggestions
}

// Enhanced API route wrapper with comprehensive error handling
export function withErrorHandling(
  handler: (request: NextRequest, context?: Record<string, unknown>) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: Record<string, unknown>): Promise<NextResponse> => {
    const startTime = Date.now()
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    
    try {
      // Add request tracking
      const enhancedContext = {
        requestId,
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        startTime,
        ...context
      }

      const response = await handler(request, enhancedContext)
      
      // Log successful requests (optional, for monitoring)
      const duration = Date.now() - startTime
      if (duration > 5000) { // Log slow requests
        console.warn(`Slow request detected: ${request.method} ${request.url} took ${duration}ms`, {
          requestId,
          duration
        })
      }
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      return handleApiError(error, { 
        requestId,
        url: request.url,
        method: request.method,
        duration,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        ...context 
      })
    }
  }
}

// Authentication wrapper
export function withAuth(
  handler: (request: NextRequest, userId: string, context?: Record<string, unknown>) => Promise<NextResponse>
) {
  return withErrorHandling(async (request: NextRequest, context?: Record<string, unknown>) => {
    const { auth } = await import('@clerk/nextjs/server')
    const { userId } = await auth()
    
    if (!userId) {
      throw ErrorCreators.unauthorized()
    }

    return handler(request, userId, context)
  })
}

// Retry utility for retryable operations
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000,
    backoffMultiplier: number = 2
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry if it's not a retryable error
        if (error instanceof AppError && !error.retryable) {
          throw error
        }

        // Don't retry on the last attempt
        if (attempt === maxAttempts) {
          break
        }

        // Wait before retrying with exponential backoff
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }
}

// Validation helpers
export const ValidationHelpers = {
  required: (value: unknown, fieldName: string) => {
    if (value === undefined || value === null || value === '') {
      throw ErrorCreators.validation(fieldName, `${fieldName} is required`)
    }
  },

  email: (value: string, fieldName: string = 'email') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      throw ErrorCreators.validation(fieldName, 'Invalid email format')
    }
  },

  minLength: (value: string, minLength: number, fieldName: string) => {
    if (value.length < minLength) {
      throw ErrorCreators.validation(
        fieldName, 
        `${fieldName} must be at least ${minLength} characters long`
      )
    }
  },

  maxLength: (value: string, maxLength: number, fieldName: string) => {
    if (value.length > maxLength) {
      throw ErrorCreators.validation(
        fieldName, 
        `${fieldName} must be no more than ${maxLength} characters long`
      )
    }
  },

  isArray: (value: unknown, fieldName: string) => {
    if (!Array.isArray(value)) {
      throw ErrorCreators.validation(fieldName, `${fieldName} must be an array`)
    }
  },

  isValidDate: (value: unknown, fieldName: string) => {
    const date = new Date(value as string | number | Date)
    if (isNaN(date.getTime())) {
      throw ErrorCreators.validation(fieldName, `${fieldName} must be a valid date`)
    }
  },

  futureDate: (value: unknown, fieldName: string) => {
    const date = new Date(value as string | number | Date)
    if (date <= new Date()) {
      throw ErrorCreators.validation(fieldName, `${fieldName} must be in the future`)
    }
  }
}