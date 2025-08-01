import { AppError, ErrorType, ErrorLogger } from "./error-handling"
import { ToastService } from "./toast-service"

// Retry configuration interface
export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryCondition?: (error: Error) => boolean
  onRetry?: (attempt: number, error: Error) => void
  onMaxAttemptsReached?: (error: Error) => void
}

// Default retry configurations for different operation types
export const RetryConfigs = {
  // Network operations (API calls, file uploads)
  network: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: (error: Error) => {
      if (error instanceof AppError) {
        return (
          error.retryable &&
          (error.type === ErrorType.NETWORK ||
            error.type === ErrorType.EXTERNAL_SERVICE ||
            (error.type === ErrorType.RATE_LIMIT && error.statusCode === 429))
        )
      }
      return true // Retry generic errors
    }
  },

  // Database operations
  database: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryCondition: (error: Error) => {
      if (error instanceof AppError) {
        return error.retryable && error.type === ErrorType.DATABASE
      }
      return false // Don't retry generic database errors
    }
  },

  // File processing operations
  fileProcessing: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    retryCondition: (error: Error) => {
      if (error instanceof AppError) {
        return error.retryable && error.type === ErrorType.FILE_PROCESSING
      }
      return false
    }
  },

  // AI service operations
  aiService: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    retryCondition: (error: Error) => {
      if (error instanceof AppError) {
        return (
          error.retryable &&
          (error.type === ErrorType.EXTERNAL_SERVICE ||
            error.type === ErrorType.NETWORK ||
            (error.type === ErrorType.RATE_LIMIT && error.statusCode === 429))
        )
      }
      return true
    }
  },

  // Social media API operations
  socialMedia: {
    maxAttempts: 2,
    baseDelay: 3000,
    maxDelay: 12000,
    backoffMultiplier: 2,
    retryCondition: (error: Error) => {
      if (error instanceof AppError) {
        return (
          error.retryable &&
          (error.type === ErrorType.EXTERNAL_SERVICE ||
            error.type === ErrorType.NETWORK ||
            (error.type === ErrorType.RATE_LIMIT && error.statusCode === 429))
        )
      }
      return false
    }
  }
} as const

// Enhanced retry service with monitoring and user feedback
export class RetryService {
  private static activeRetries = new Map<
    string,
    {
      attempts: number
      startTime: number
      operation: string
    }
  >()

  // Main retry method with comprehensive error handling
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context?: {
      operationName?: string
      userId?: string
      showToast?: boolean
    }
  ): Promise<T> {
    const finalConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryCondition: () => true,
      ...config
    }

    const operationId = context?.operationName
      ? `${context.operationName}_${Date.now()}`
      : `operation_${Date.now()}`

    // Track retry attempts
    this.activeRetries.set(operationId, {
      attempts: 0,
      startTime: Date.now(),
      operation: context?.operationName || "Unknown Operation"
    })

    let lastError: Error | null = null

    try {
      for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
        const retryInfo = this.activeRetries.get(operationId)!
        retryInfo.attempts = attempt

        try {
          // Show loading toast for first attempt or retry with better messaging
          if (context?.showToast && attempt === 1) {
            ToastService.loading(
              `${context.operationName || "Processing"}...`,
              Promise.resolve(), // We'll handle the promise manually
              {
                success: `${context.operationName || "Operation"} completed successfully`,
                error: `${context.operationName || "Operation"} failed`
              }
            )
          } else if (context?.showToast && attempt > 1) {
            const retryReason =
              lastError instanceof AppError
                ? this.getRetryReason(lastError)
                : "due to an error"

            ToastService.info(
              `Retrying ${context.operationName || "operation"}...`,
              {
                description: `Attempt ${attempt}/${finalConfig.maxAttempts} ${retryReason}`,
                duration: 3000
              }
            )
          }

          // Execute the operation
          const result = await operation()

          // Success - clean up and return
          this.activeRetries.delete(operationId)

          if (context?.showToast && attempt > 1) {
            ToastService.success(
              `${context.operationName || "Operation"} succeeded after ${attempt} attempts`
            )
          }

          return result
        } catch (error) {
          lastError = error as Error

          // Log each attempt
          ErrorLogger.log(lastError, {
            operationId,
            attempt,
            maxAttempts: finalConfig.maxAttempts,
            operationName: context?.operationName,
            userId: context?.userId,
            retryable: finalConfig.retryCondition?.(lastError) ?? true
          })

          // Check if we should retry
          const shouldRetry =
            attempt < finalConfig.maxAttempts &&
            (finalConfig.retryCondition?.(lastError) ?? true)

          if (!shouldRetry) {
            break
          }

          // Call retry callback
          finalConfig.onRetry?.(attempt, lastError)

          // Calculate delay with jitter to prevent thundering herd
          const baseDelay = Math.min(
            finalConfig.baseDelay *
              Math.pow(finalConfig.backoffMultiplier, attempt - 1),
            finalConfig.maxDelay
          )
          const jitter = Math.random() * 0.1 * baseDelay // 10% jitter
          const delay = baseDelay + jitter

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      // All attempts failed
      this.activeRetries.delete(operationId)

      // Ensure we have an error to work with
      if (!lastError) {
        lastError = new Error("Operation failed without specific error")
      }

      // Call max attempts callback
      finalConfig.onMaxAttemptsReached?.(lastError)

      // Show final error toast
      if (context?.showToast) {
        if (lastError instanceof AppError) {
          ToastService.handleError(lastError, {
            context: `${context.operationName} failed after ${finalConfig.maxAttempts} attempts`
          })
        } else {
          ToastService.error(`${context.operationName || "Operation"} failed`, {
            description: `Failed after ${finalConfig.maxAttempts} attempts: ${lastError.message}`,
            duration: 8000
          })
        }
      }

      throw lastError
    } catch (error) {
      this.activeRetries.delete(operationId)
      throw error
    }
  }

  // Predefined retry methods for common operations
  static async retryNetworkOperation<T>(
    operation: () => Promise<T>,
    context?: { operationName?: string; userId?: string; showToast?: boolean }
  ): Promise<T> {
    return this.withRetry(operation, RetryConfigs.network, context)
  }

  static async retryDatabaseOperation<T>(
    operation: () => Promise<T>,
    context?: { operationName?: string; userId?: string; showToast?: boolean }
  ): Promise<T> {
    return this.withRetry(operation, RetryConfigs.database, context)
  }

  static async retryFileProcessing<T>(
    operation: () => Promise<T>,
    context?: { operationName?: string; userId?: string; showToast?: boolean }
  ): Promise<T> {
    return this.withRetry(operation, RetryConfigs.fileProcessing, context)
  }

  static async retryAIService<T>(
    operation: () => Promise<T>,
    context?: { operationName?: string; userId?: string; showToast?: boolean }
  ): Promise<T> {
    return this.withRetry(operation, RetryConfigs.aiService, context)
  }

  static async retrySocialMedia<T>(
    operation: () => Promise<T>,
    context?: { operationName?: string; userId?: string; showToast?: boolean }
  ): Promise<T> {
    return this.withRetry(operation, RetryConfigs.socialMedia, context)
  }

  // Batch retry operations with progress tracking
  static async retryBatch<T>(
    items: T[],
    operation: (item: T) => Promise<unknown>,
    config: Partial<RetryConfig> = {},
    context?: {
      operationName?: string
      userId?: string
      showProgress?: boolean
    }
  ): Promise<{
    successful: unknown[]
    failed: { item: T; error: Error }[]
    summary: { total: number; successful: number; failed: number }
  }> {
    const successful: unknown[] = []
    const failed: { item: T; error: Error }[] = []

    if (context?.showProgress) {
      ToastService.loading(
        `Processing ${items.length} items...`,
        Promise.resolve()
      )
    }

    // Process items with retry
    const results = await Promise.allSettled(
      items.map(async (item, index) => {
        try {
          const result = await this.withRetry(() => operation(item), config, {
            operationName: `${context?.operationName || "Item"} ${index + 1}`,
            userId: context?.userId,
            showToast: false // Don't show individual toasts in batch
          })
          return { item, result, success: true }
        } catch (error) {
          return { item, error: error as Error, success: false }
        }
      })
    )

    // Categorize results
    results.forEach(result => {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          successful.push(result.value.result)
        } else {
          const error =
            result.value.error || new Error("Unknown error occurred")
          failed.push({ item: result.value.item, error })
        }
      } else {
        // This shouldn't happen with our error handling, but just in case
        failed.push({
          item: items[results.indexOf(result)],
          error: new Error(result.reason)
        })
      }
    })

    const summary = {
      total: items.length,
      successful: successful.length,
      failed: failed.length
    }

    // Show completion toast
    if (context?.showProgress) {
      if (failed.length === 0) {
        ToastService.success(`All ${items.length} items processed successfully`)
      } else if (successful.length === 0) {
        ToastService.error(`All ${items.length} items failed to process`)
      } else {
        ToastService.warning(
          `Partial success: ${successful.length}/${items.length} items processed`,
          {
            description: `${failed.length} items failed`,
            duration: 6000
          }
        )
      }
    }

    return { successful, failed, summary }
  }

  // Get current retry statistics
  static getRetryStats() {
    const stats = Array.from(this.activeRetries.entries()).map(
      ([id, info]) => ({
        operationId: id,
        operation: info.operation,
        attempts: info.attempts,
        duration: Date.now() - info.startTime
      })
    )

    return {
      activeRetries: stats,
      totalActiveOperations: stats.length
    }
  }

  // Cancel all active retries (for cleanup)
  static cancelAllRetries() {
    this.activeRetries.clear()
  }

  // Get user-friendly retry reason based on error type
  private static getRetryReason(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK:
        return "due to network issues"
      case ErrorType.EXTERNAL_SERVICE:
        return "due to service unavailability"
      case ErrorType.RATE_LIMIT:
        return "due to rate limiting"
      case ErrorType.DATABASE:
        return "due to database issues"
      case ErrorType.FILE_PROCESSING:
        return "due to file processing issues"
      default:
        return "due to a temporary issue"
    }
  }
}

// React hook for using retry service in components
export function useRetryService() {
  const retryWithToast = async <T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    operationName?: string
  ): Promise<T | null> => {
    try {
      return await RetryService.withRetry(operation, config, {
        operationName,
        showToast: true
      })
    } catch (error) {
      return null
    }
  }

  return {
    retry: RetryService.withRetry,
    retryWithToast,
    retryNetwork: RetryService.retryNetworkOperation,
    retryDatabase: RetryService.retryDatabaseOperation,
    retryFileProcessing: RetryService.retryFileProcessing,
    retryAI: RetryService.retryAIService,
    retrySocialMedia: RetryService.retrySocialMedia,
    retryBatch: RetryService.retryBatch,
    getStats: RetryService.getRetryStats
  }
}
