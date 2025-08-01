import { toast } from "sonner"
import { AppError, ErrorType } from "./error-handling"

// Toast notification service with enhanced functionality
export class ToastService {
  // Success notifications
  static success(
    message: string,
    options?: {
      description?: string
      duration?: number
      action?: {
        label: string
        onClick: () => void
      }
    }
  ) {
    return toast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action
    })
  }

  // Error notifications with retry functionality
  static error(
    message: string,
    options?: {
      description?: string
      duration?: number
      retryable?: boolean
      onRetry?: () => void
      details?: Record<string, unknown>
    }
  ) {
    const action =
      options?.retryable && options?.onRetry
        ? {
            label: "Retry",
            onClick: options.onRetry
          }
        : undefined

    return toast.error(message, {
      description: options?.description,
      duration: options?.duration || 6000,
      action
    })
  }

  // Warning notifications
  static warning(
    message: string,
    options?: {
      description?: string
      duration?: number
    }
  ) {
    return toast.warning(message, {
      description: options?.description,
      duration: options?.duration || 5000
    })
  }

  // Info notifications
  static info(
    message: string,
    options?: {
      description?: string
      duration?: number
    }
  ) {
    return toast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000
    })
  }

  // Loading notifications with promise handling
  static loading(
    message: string,
    promise: Promise<unknown>,
    options?: {
      success?: string
      error?: string
      finally?: () => void
    }
  ) {
    return toast.promise(promise, {
      loading: message,
      success: options?.success || "Operation completed successfully",
      error: options?.error || "Operation failed",
      finally: options?.finally
    })
  }

  // Handle AppError instances with appropriate styling and actions
  static handleError(
    error: AppError | Error,
    options?: {
      onRetry?: () => void
      context?: string
    }
  ) {
    if (error instanceof AppError) {
      const description = options?.context
        ? `${options.context}: ${error.userMessage}`
        : error.userMessage

      // Different handling based on error type
      switch (error.type) {
        case ErrorType.VALIDATION:
          return this.warning(error.userMessage, {
            description: error.details?.field
              ? `Field: ${error.details.field}`
              : undefined,
            duration: 5000
          })

        case ErrorType.AUTHENTICATION:
          return this.error("Authentication Required", {
            description: error.userMessage,
            duration: 6000
          })

        case ErrorType.AUTHORIZATION:
          return this.error("Access Denied", {
            description: error.userMessage,
            duration: 6000
          })

        case ErrorType.RATE_LIMIT:
          const resetTime = error.details?.resetTime
          const resetMessage =
            resetTime &&
            (typeof resetTime === "string" ||
              typeof resetTime === "number" ||
              resetTime instanceof Date)
              ? `Try again after ${new Date(resetTime).toLocaleTimeString()}`
              : "Please wait before trying again"

          return this.warning("Rate Limit Exceeded", {
            description: resetMessage,
            duration: 8000
          })

        case ErrorType.EXTERNAL_SERVICE:
        case ErrorType.NETWORK:
          return this.error(error.userMessage, {
            description: "This might be a temporary issue",
            retryable: error.retryable,
            onRetry: options?.onRetry,
            duration: 7000
          })

        case ErrorType.FILE_PROCESSING:
          return this.error("File Processing Error", {
            description: error.userMessage,
            retryable: error.retryable,
            onRetry: options?.onRetry,
            duration: 6000
          })

        case ErrorType.NOT_FOUND:
          return this.warning("Not Found", {
            description: error.userMessage,
            duration: 5000
          })

        default:
          return this.error("Something went wrong", {
            description: error.userMessage,
            retryable: error.retryable,
            onRetry: options?.onRetry,
            duration: 6000
          })
      }
    } else {
      // Handle generic errors
      return this.error("An unexpected error occurred", {
        description: error.message,
        onRetry: options?.onRetry,
        duration: 6000
      })
    }
  }

  // Batch operations with progress
  static batchOperation<T>(
    items: T[],
    operation: (item: T) => Promise<unknown>,
    options: {
      successMessage: (successCount: number, totalCount: number) => string
      errorMessage: (errorCount: number, totalCount: number) => string
      itemName: string
    }
  ) {
    const promise = this.executeBatchOperation(items, operation)

    return toast.promise(promise, {
      loading: `Processing ${items.length} ${options.itemName}${items.length > 1 ? "s" : ""}...`,
      success: (result: { successCount: number; errorCount: number }) => {
        if (result.errorCount === 0) {
          return options.successMessage(result.successCount, items.length)
        } else {
          // Show partial success
          return `${options.successMessage(result.successCount, items.length)}. ${result.errorCount} failed.`
        }
      },
      error: (error: Error) => {
        return `Failed to process ${options.itemName}s: ${error.message}`
      }
    })
  }

  private static async executeBatchOperation<T>(
    items: T[],
    operation: (item: T) => Promise<unknown>
  ): Promise<{ successCount: number; errorCount: number }> {
    let successCount = 0
    let errorCount = 0

    const results = await Promise.allSettled(items.map(item => operation(item)))

    results.forEach(result => {
      if (result.status === "fulfilled") {
        successCount++
      } else {
        errorCount++
      }
    })

    return { successCount, errorCount }
  }

  // Dismiss all toasts
  static dismissAll() {
    toast.dismiss()
  }

  // Custom toast for specific operations
  static fileUpload = {
    start: (fileName: string) => toast.loading(`Uploading ${fileName}...`),

    success: (fileName: string) =>
      this.success("File uploaded successfully", {
        description: fileName,
        duration: 4000
      }),

    error: (fileName: string, error: string, onRetry?: () => void) =>
      this.error("Upload failed", {
        description: `${fileName}: ${error}`,
        retryable: !!onRetry,
        onRetry,
        duration: 6000
      })
  }

  static analysis = {
    start: (bookTitle: string) => toast.loading(`Analyzing "${bookTitle}"...`),

    success: (bookTitle: string) =>
      this.success("Analysis completed", {
        description: `"${bookTitle}" has been analyzed successfully`,
        duration: 5000
      }),

    error: (bookTitle: string, error: string, onRetry?: () => void) =>
      this.error("Analysis failed", {
        description: `"${bookTitle}": ${error}`,
        retryable: !!onRetry,
        onRetry,
        duration: 7000
      })
  }

  static publishing = {
    start: (platform: string, accountCount: number) =>
      toast.loading(
        `Publishing to ${accountCount} ${platform} account${accountCount > 1 ? "s" : ""}...`
      ),

    success: (successCount: number, totalCount: number) => {
      if (successCount === totalCount) {
        return this.success(
          `Published to ${successCount} account${successCount > 1 ? "s" : ""}`
        )
      } else {
        return this.warning("Partial success", {
          description: `Published to ${successCount} of ${totalCount} accounts`,
          duration: 6000
        })
      }
    },

    error: (failCount: number, totalCount: number, onRetry?: () => void) =>
      this.error(
        `Failed to publish to ${failCount} account${failCount > 1 ? "s" : ""}`,
        {
          description:
            totalCount > failCount
              ? `${totalCount - failCount} succeeded`
              : undefined,
          retryable: !!onRetry,
          onRetry,
          duration: 7000
        }
      )
  }

  static scheduling = {
    success: (scheduledTime: Date) =>
      this.success("Post scheduled successfully", {
        description: `Will be published on ${scheduledTime.toLocaleDateString()} at ${scheduledTime.toLocaleTimeString()}`,
        duration: 5000
      }),

    cancelled: () => this.success("Scheduled post cancelled"),

    rescheduled: (newTime: Date) =>
      this.success("Post rescheduled", {
        description: `New time: ${newTime.toLocaleDateString()} at ${newTime.toLocaleTimeString()}`,
        duration: 5000
      })
  }

  static socialAccount = {
    connected: (platform: string) =>
      this.success(`${platform} connected successfully`, {
        description: "You can now publish content to this account"
      }),

    disconnected: (platform: string) =>
      this.success(`${platform} disconnected`, {
        description: "Account has been safely removed"
      }),

    connectionError: (platform: string, error: string, onRetry?: () => void) =>
      this.error(`Failed to connect ${platform}`, {
        description: error,
        retryable: !!onRetry,
        onRetry,
        duration: 6000
      }),

    expired: (platform: string, onReconnect?: () => void) =>
      this.error(`${platform} connection expired`, {
        description: "Please reconnect your account to continue publishing",
        duration: 8000,
        retryable: !!onReconnect,
        onRetry: onReconnect
      })
  }

  static contentGeneration = {
    start: (bookTitle: string, platforms: string[]) =>
      toast.loading(
        `Generating content for "${bookTitle}" (${platforms.join(", ")})...`
      ),

    success: (generatedCount: number, platforms: string[]) =>
      this.success(`Generated ${generatedCount} posts`, {
        description: `Content created for ${platforms.join(", ")}`,
        duration: 5000
      }),

    partialSuccess: (
      successCount: number,
      totalCount: number,
      platforms: string[]
    ) =>
      this.warning("Content generation partially completed", {
        description: `${successCount}/${totalCount} posts generated for ${platforms.join(", ")}`,
        duration: 6000
      }),

    error: (bookTitle: string, error: string, onRetry?: () => void) =>
      this.error("Content generation failed", {
        description: `"${bookTitle}": ${error}`,
        retryable: !!onRetry,
        onRetry,
        duration: 7000
      })
  }

  static analytics = {
    updated: (platform?: string) =>
      this.success("Analytics updated", {
        description: platform
          ? `${platform} data refreshed`
          : "All platform data refreshed"
      }),

    updateError: (platform: string, onRetry?: () => void) =>
      this.error(`Failed to update ${platform} analytics`, {
        description: "Analytics data may be outdated",
        retryable: !!onRetry,
        onRetry,
        duration: 6000
      }),

    unavailable: (platform: string) =>
      this.warning(`${platform} analytics unavailable`, {
        description: "Data will be available once posts are published",
        duration: 5000
      })
  }

  static bookManagement = {
    uploaded: (fileName: string) =>
      this.success("Book uploaded successfully", {
        description: `"${fileName}" is ready for analysis`,
        duration: 4000
      }),

    deleted: (bookTitle: string) =>
      this.success("Book deleted", {
        description: `"${bookTitle}" and all associated content removed`,
        duration: 4000
      }),

    analysisQueued: (bookTitle: string) =>
      this.info("Analysis queued", {
        description: `"${bookTitle}" will be analyzed shortly`,
        duration: 4000
      })
  }
}
