import { NextRequest, NextResponse } from 'next/server'
import { 
  withErrorHandling, 
  withAuth, 
  AppError, 
  ErrorType, 
  ErrorCreators,
  ValidationHelpers 
} from './error-handling'
import { RetryService } from './retry-service'
import { z } from 'zod'

// Enhanced API middleware with comprehensive error handling
export function createApiHandler<T = unknown>(config: {
  requireAuth?: boolean
  validateSchema?: z.ZodSchema<T>
  rateLimit?: {
    maxRequests: number
    windowMs: number
  }
  timeout?: number
}) {
  return function(
    handler: (
      request: NextRequest, 
      context: { 
        userId?: string
        validatedData?: T
        requestId: string
      }
    ) => Promise<NextResponse>
  ) {
    const wrappedHandler = async (request: NextRequest, context?: Record<string, unknown>) => {
      const requestId = context?.requestId as string || `req_${Date.now()}`
      const startTime = Date.now()

      try {
        // Apply timeout if specified
        if (config.timeout) {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new AppError(
                'Request timeout',
                ErrorType.INTERNAL,
                408,
                'The request took too long to process. Please try again.',
                undefined,
                { timeout: config.timeout },
                true
              ))
            }, config.timeout)
          })

          return await Promise.race([
            processRequest(),
            timeoutPromise
          ])
        } else {
          return await processRequest()
        }

        async function processRequest(): Promise<NextResponse> {
          let userId: string | undefined
          let validatedData: T | undefined

          // Handle authentication if required
          if (config.requireAuth) {
            const { auth } = await import('@clerk/nextjs/server')
            const authResult = await auth()
            
            if (!authResult.userId) {
              throw ErrorCreators.unauthorized({
                requestId,
                url: request.url,
                method: request.method
              })
            }
            
            userId = authResult.userId
          }

          // Handle request validation if schema provided
          if (config.validateSchema) {
            try {
              const body = await request.json()
              validatedData = config.validateSchema.parse(body)
            } catch (error) {
              if (error instanceof z.ZodError) {
                throw ErrorCreators.validation(
                  'request',
                  'Invalid request data',
                  { 
                    errors: error.errors.map(e => ({
                      path: e.path.join('.'),
                      message: e.message,
                      code: e.code
                    })),
                    received: await request.json().catch(() => ({}))
                  }
                )
              }
              throw error
            }
          }

          // Handle rate limiting if configured
          if (config.rateLimit && userId) {
            await checkRateLimit(userId, request.url, config.rateLimit)
          }

          // Execute the main handler
          return await handler(request, {
            userId,
            validatedData,
            requestId
          })
        }

      } catch (error) {
        // Enhanced error context
        const errorContext = {
          ...context,
          requestId,
          duration: Date.now() - startTime,
          userId: undefined, // Will be set if auth was successful
          endpoint: request.url,
          method: request.method
        }

        // Re-throw to be handled by withErrorHandling
        throw error
      }
    }

    // Apply error handling wrapper
    if (config.requireAuth) {
      return withErrorHandling(wrappedHandler)
    } else {
      return withErrorHandling(wrappedHandler)
    }
  }
}

// Rate limiting implementation
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

async function checkRateLimit(
  userId: string, 
  endpoint: string, 
  config: { maxRequests: number; windowMs: number }
) {
  const key = `${userId}:${endpoint}`
  const now = Date.now()
  const existing = rateLimitStore.get(key)

  if (!existing || now > existing.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return
  }

  if (existing.count >= config.maxRequests) {
    throw ErrorCreators.rateLimitExceeded(
      config.maxRequests,
      new Date(existing.resetTime)
    )
  }

  // Increment count
  existing.count++
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

// Specialized handlers for common patterns
export const createBookHandler = createApiHandler({
  requireAuth: true,
  timeout: 30000 // 30 seconds for book operations
})

export const createContentHandler = createApiHandler({
  requireAuth: true,
  timeout: 60000 // 60 seconds for content generation
})

export const createSocialHandler = createApiHandler({
  requireAuth: true,
  rateLimit: {
    maxRequests: 10,
    windowMs: 60000 // 10 requests per minute for social media operations
  },
  timeout: 30000
})

export const createAnalyticsHandler = createApiHandler({
  requireAuth: true,
  rateLimit: {
    maxRequests: 30,
    windowMs: 60000 // 30 requests per minute for analytics
  },
  timeout: 15000
})

// Utility functions for common validations
export const ApiValidations = {
  uuid: z.string().uuid('Invalid ID format'),
  
  bookId: z.string().uuid('Invalid book ID'),
  
  contentId: z.string().uuid('Invalid content ID'),
  
  accountIds: z.array(z.string().uuid()).min(1, 'At least one account must be selected'),
  
  platform: z.enum(['twitter', 'instagram', 'linkedin', 'facebook'], {
    errorMap: () => ({ message: 'Invalid platform' })
  }),
  
  scheduledAt: z.string().datetime().refine(
    (date) => new Date(date) > new Date(),
    'Scheduled time must be in the future'
  ),
  
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  }),
  
  fileUpload: z.object({
    file: z.instanceof(File).refine(
      (file) => file.size <= 50 * 1024 * 1024,
      'File size must be less than 50MB'
    ).refine(
      (file) => ['application/pdf', 'application/epub+zip', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type),
      'Unsupported file format'
    )
  })
}

// Error recovery suggestions for API responses
export function addRecoverySuggestions(error: AppError, context?: Record<string, unknown>): AppError {
  const suggestions: string[] = []

  // Add context-specific suggestions
  if (context?.endpoint && typeof context.endpoint === 'string' && context.endpoint.includes('/books/upload')) {
    suggestions.push('Ensure your file is in a supported format (PDF, EPUB, TXT, DOCX)')
    suggestions.push('Check that your file size is under 50MB')
    suggestions.push('Try uploading a different file if the current one is corrupted')
  } else if (context?.endpoint && typeof context.endpoint === 'string' && context.endpoint.includes('/content/generate')) {
    suggestions.push('Make sure your book has been analyzed first')
    suggestions.push('Check your AI service quota and limits')
    suggestions.push('Try generating content for fewer platforms at once')
  } else if (context?.endpoint && typeof context.endpoint === 'string' && context.endpoint.includes('/social/publish')) {
    suggestions.push('Verify your social media accounts are still connected')
    suggestions.push('Check if your accounts have the necessary permissions')
    suggestions.push('Try publishing to one platform at a time')
  }

  // Add general suggestions based on error type
  switch (error.type) {
    case ErrorType.RATE_LIMIT:
      suggestions.push('Consider upgrading your plan for higher limits')
      suggestions.push('Spread out your requests over time')
      break
    case ErrorType.EXTERNAL_SERVICE:
      suggestions.push('Check the service status page')
      suggestions.push('Try again during off-peak hours')
      break
  }

  return new AppError(
    error.message,
    error.type,
    error.statusCode,
    error.userMessage,
    error.severity,
    { ...error.details, suggestions },
    error.retryable
  )
}