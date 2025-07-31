import { useCallback } from 'react'
import { ToastService } from '@/lib/toast-service'
import { AppError, ErrorType } from '@/lib/error-handling'

// Interface for API error response objects
interface ApiErrorResponse {
  error?: string
  type?: string
  status?: number
  details?: unknown
  retryable?: boolean
  message?: string
}

// Interface for content generation options
interface ContentGenerationOptions {
  platform?: string
  tone?: string
  length?: number
  hashtags?: boolean
  includeImages?: boolean
  [key: string]: unknown
}

// Client-side error handling hook
export function useErrorHandler() {
  const handleError = useCallback((error: unknown, options?: {
    context?: string
    onRetry?: () => void
    showToast?: boolean
  }) => {
    const { context, onRetry, showToast = true } = options || {}

    // Parse API error responses
    let parsedError: AppError | Error

    if (error instanceof Error) {
      parsedError = error
    } else if (typeof error === 'object' && error !== null) {
      // Handle fetch response errors
      const errorObj = error as ApiErrorResponse
      if (errorObj.error && errorObj.type) {
        // This looks like an API error response
        parsedError = new AppError(
          errorObj.error,
          errorObj.type as ErrorType,
          errorObj.status || 500,
          errorObj.error,
          undefined,
          errorObj.details as Record<string, unknown>,
          errorObj.retryable || false
        )
      } else {
        parsedError = new Error(errorObj.message || 'Unknown error occurred')
      }
    } else {
      parsedError = new Error('Unknown error occurred')
    }

    // Log error for debugging
    console.error('Error handled:', {
      error: parsedError,
      context,
      timestamp: new Date().toISOString()
    })

    // Show toast notification if requested
    if (showToast) {
      if (parsedError instanceof AppError) {
        ToastService.handleError(parsedError, { onRetry, context })
      } else {
        ToastService.handleError(parsedError, { onRetry, context })
      }
    }

    return parsedError
  }, [])

  // Handle API fetch errors specifically
  const handleApiError = useCallback(async (response: Response, options?: {
    context?: string
    onRetry?: () => void
    showToast?: boolean
  }) => {
    let errorData: ApiErrorResponse

    try {
      errorData = await response.json()
    } catch {
      errorData = {
        error: `HTTP ${response.status}: ${response.statusText}`,
        type: 'NETWORK',
        retryable: response.status >= 500
      }
    }

    const appError = new AppError(
      errorData.error || `HTTP ${response.status}`,
      (errorData.type as ErrorType) || ErrorType.INTERNAL,
      response.status,
      errorData.error || 'An error occurred',
      undefined,
      errorData.details as Record<string, unknown>,
      errorData.retryable || response.status >= 500
    )

    return handleError(appError, options)
  }, [handleError])

  // Async operation wrapper with error handling
  const withErrorHandling = useCallback(<T>(
    operation: () => Promise<T>,
    options?: {
      context?: string
      onRetry?: () => void
      showToast?: boolean
      onError?: (error: AppError | Error) => void
    }
  ) => {
    return async (): Promise<T | null> => {
      try {
        return await operation()
      } catch (error) {
        const handledError = handleError(error, options)
        options?.onError?.(handledError)
        return null
      }
    }
  }, [handleError])

  // Fetch wrapper with error handling
  const fetchWithErrorHandling = useCallback(async (
    url: string,
    options?: RequestInit & {
      context?: string
      onRetry?: () => void
      showToast?: boolean
    }
  ) => {
    const { context, onRetry, showToast, ...fetchOptions } = options || {}

    try {
      const response = await fetch(url, fetchOptions)

      if (!response.ok) {
        await handleApiError(response, { context, onRetry, showToast })
        return null
      }

      return response
    } catch (error) {
      handleError(error, { context, onRetry, showToast })
      return null
    }
  }, [handleApiError, handleError])

  return {
    handleError,
    handleApiError,
    withErrorHandling,
    fetchWithErrorHandling
  }
}

// Specific error handlers for common operations
export function useBookOperations() {
  const { handleError, fetchWithErrorHandling } = useErrorHandler()

  const uploadBook = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetchWithErrorHandling('/api/books/upload', {
      method: 'POST',
      body: formData,
      context: 'Book Upload'
    })

    if (response) {
      const data = await response.json()
      ToastService.fileUpload.success(file.name)
      return data
    }

    return null
  }, [fetchWithErrorHandling])

  const analyzeBook = useCallback(async (bookId: string, bookTitle: string) => {
    const response = await fetchWithErrorHandling(`/api/books/${bookId}/analyze`, {
      method: 'POST',
      context: 'Book Analysis',
      onRetry: () => analyzeBook(bookId, bookTitle)
    })

    if (response) {
      const data = await response.json()
      ToastService.analysis.success(bookTitle)
      return data
    }

    return null
  }, [fetchWithErrorHandling])

  const generateContent = useCallback(async (bookId: string, options?: ContentGenerationOptions) => {
    const response = await fetchWithErrorHandling('/api/content/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, options }),
      context: 'Content Generation',
      onRetry: () => generateContent(bookId, options)
    })

    if (response) {
      const data = await response.json()
      ToastService.success('Content generated successfully')
      return data
    }

    return null
  }, [fetchWithErrorHandling])

  return {
    uploadBook,
    analyzeBook,
    generateContent,
    handleError
  }
}

export function useSocialOperations() {
  const { handleError, fetchWithErrorHandling } = useErrorHandler()

  const publishContent = useCallback(async (contentId: string, accountIds: string[]) => {
    const response = await fetchWithErrorHandling('/api/social/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId, accountIds }),
      context: 'Content Publishing',
      onRetry: () => publishContent(contentId, accountIds)
    })

    if (response) {
      const data = await response.json()
      const { summary } = data
      
      if (summary.failed === 0) {
        ToastService.publishing.success(summary.successful, summary.total)
      } else {
        ToastService.publishing.error(summary.failed, summary.total, 
          () => publishContent(contentId, accountIds))
      }
      
      return data
    }

    return null
  }, [fetchWithErrorHandling])

  const scheduleContent = useCallback(async (contentId: string, accountIds: string[], scheduledAt: Date) => {
    const response = await fetchWithErrorHandling('/api/social/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId, accountIds, scheduledAt }),
      context: 'Content Scheduling',
      onRetry: () => scheduleContent(contentId, accountIds, scheduledAt)
    })

    if (response) {
      const data = await response.json()
      ToastService.scheduling.success(scheduledAt)
      return data
    }

    return null
  }, [fetchWithErrorHandling])

  const connectAccount = useCallback(async (platform: string) => {
    try {
      // This would typically redirect to OAuth flow
      window.location.href = `/api/social/connect/${platform}`
    } catch (error) {
      handleError(error, {
        context: 'Social Account Connection',
        showToast: true
      })
    }
  }, [handleError])

  const disconnectAccount = useCallback(async (accountId: string, platform: string) => {
    const response = await fetchWithErrorHandling(`/api/social/accounts/${accountId}`, {
      method: 'DELETE',
      context: 'Social Account Disconnection'
    })

    if (response) {
      ToastService.socialAccount.disconnected(platform)
      return true
    }

    return false
  }, [fetchWithErrorHandling])

  return {
    publishContent,
    scheduleContent,
    connectAccount,
    disconnectAccount,
    handleError
  }
}