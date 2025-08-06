import { toast } from "sonner"

// Interfaccia per AppError senza importare il modulo server-only
interface AppError extends Error {
  type: string
  userMessage?: string
  retryable?: boolean
  details?: Record<string, unknown>
}

// Funzione helper per ottenere le traduzioni
// Questa verrà chiamata dai componenti React che hanno accesso a useTranslations
let getTranslations: ((key: string) => string) | null = null

export function setToastTranslations(t: (key: string) => string) {
  getTranslations = t
}

function t(key: string, fallback?: string): string {
  return getTranslations?.(key) || fallback || key
}

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
            label: t('common.retry', 'Retry'),
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

  // Loading notifications with promise support
  static loading(
    message: string,
    options?: {
      description?: string
    }
  ) {
    return toast.loading(message, {
      description: options?.description
    })
  }

  // Promise-based notifications for async operations
  static promise<T>(
    promise: Promise<T>,
    options: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    }
  ) {
    return toast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error
    })
  }

  // Custom toast with retry for operations
  static withRetry(
    message: string,
    operation: () => Promise<void>,
    options?: {
      success?: string
      error?: string
      maxRetries?: number
    }
  ) {
    const maxRetries = options?.maxRetries || 3
    let retryCount = 0

    const executeWithRetry = async (): Promise<void> => {
      try {
        await operation()
        this.success(options?.success || t('common.operationcompletedsuccessfully', 'Operation completed successfully'), {
          description: retryCount > 0 ? t('common.succeededafterretries', `Succeeded after ${retryCount} retries`) : undefined
        })
      } catch (error) {
        retryCount++
        if (retryCount < maxRetries) {
          this.error(options?.error || t('common.operationfailed', 'Operation failed'), {
            description: t('common.retryattempt', `Retry attempt ${retryCount} of ${maxRetries}`),
            retryable: true,
            onRetry: executeWithRetry
          })
        } else {
          this.error(options?.error || t('common.operationfailed', 'Operation failed'), {
            description: t('common.maxretriesreached', 'Maximum retries reached. Please try again later.')
          })
        }
      }
    }

    executeWithRetry()
  }

  // Specialized error handlers based on error type
  static handleError(error: unknown, context?: string) {
    // Type guard per AppError
    const isAppError = (err: unknown): err is AppError => {
      return err != null && 
             typeof err === 'object' && 
             'type' in err && 
             'message' in err &&
             typeof (err as Record<string, unknown>).type === 'string'
    }

    if (isAppError(error)) {
      switch (error.type) {
        case "AUTHENTICATION":
          return this.error(t('common.authenticationrequired', 'Authentication Required'), {
            description: error.userMessage,
            duration: 8000
          })

        case "AUTHORIZATION":
          return this.error(t('common.accessdenied', 'Access Denied'), {
            description: error.userMessage,
            duration: 6000
          })

        case "RATE_LIMIT":
          const retryAfter = error.details?.retryAfter as number
          const waitTime = retryAfter
            ? t('common.pleasewaitretryafter', `Please wait ${retryAfter} seconds before trying again`)
            : t('common.pleasewaitbeforetryingagain', 'Please wait before trying again')

          return this.warning(t('common.ratelimitexceeded', 'Rate Limit Exceeded'), {
            description: waitTime,
            duration: 8000
          })

        case "NETWORK":
          return this.error(error.userMessage || t('common.networkerror', 'Network Error'), {
            description: t('common.thismightbeatemporaryissue', 'This might be a temporary issue'),
            retryable: error.retryable
          })

        case "FILE_PROCESSING":
          return this.error(t('common.fileprocessingerror', 'File Processing Error'), {
            description: error.userMessage,
            duration: 6000
          })

        case "NOT_FOUND":
          return this.warning(t('common.notfound', 'Not Found'), {
            description: error.userMessage,
            duration: 5000
          })

        case "VALIDATION":
          return this.error(t('common.somethingwentwrong', 'Something went wrong'), {
            description: error.userMessage,
            duration: 6000
          })

        default:
          return this.error(t('common.anunexpectederroroccurred', 'An unexpected error occurred'), {
            description: context,
            duration: 6000
          })
      }
    }

    // Handle generic errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    return this.error(t('common.anunexpectederroroccurred', 'An unexpected error occurred'), {
      description: errorMessage,
      duration: 6000
    })
  }

  // Dismiss a specific toast
  static dismiss(id?: string | number) {
    toast.dismiss(id)
  }

  // Dismiss all toasts
  static dismissAll() {
    toast.dismiss()
  }

  // Business-specific toast helpers
  static file = {
    // File upload toasts
    upload: {
      start: (fileName: string) => toast.loading(t('toast.uploadingfile', `Uploading ${fileName}...`)),
      success: (fileName: string) =>
        this.success(t('common.fileuploadedsuccessfully', 'File uploaded successfully'), {
          description: fileName
        }),
      error: (fileName: string, error?: string) =>
        this.error(t('common.uploadfailed', 'Upload failed'), {
          description: error || t('common.pleasetryagain', 'Please try again')
        })
    },

    // File analysis toasts
    analysis: {
      start: (bookTitle: string) => toast.loading(t('toast.analyzingbook', `Analyzing "${bookTitle}"...`)),
      success: (bookTitle: string) =>
        this.success(t('common.analysiscompleted', 'Analysis completed'), {
          description: bookTitle
        }),
      error: (bookTitle: string, error?: string) =>
        this.error(t('common.analysisfailed', 'Analysis failed'), {
          description: error || t('common.pleasetryagain', 'Please try again')
        })
    }
  }

  // Social media publishing toasts
  static social = {
    publishing: {
      start: (accountCount: number, platform: string) =>
        toast.loading(
          t('toast.publishingto', `Publishing to ${accountCount} ${platform} account${accountCount > 1 ? 's' : ''}...`)
        ),
      success: (platform: string) =>
        this.success(t('common.postscheduledsuccessfully', 'Post scheduled successfully'), {
          description: platform
        }),
      cancelled: () => this.success(t('common.scheduledpostcancelled', 'Scheduled post cancelled')),
      rescheduled: (newTime: string) =>
        this.success(t('common.postrescheduled', 'Post rescheduled'), {
          description: newTime
        })
    },

    accounts: {
      connected: (platform: string) =>
        this.success(t('toast.accountconnected', `${platform} account connected`), {
          description: t('common.youcannowpublishcontenttothisaccount', 'You can now publish content to this account')
        }),
      disconnected: (platform: string) =>
        this.success(t('toast.accountdisconnected', `${platform} account disconnected`), {
          description: t('common.accounthasbeensafelyremoved', 'Account has been safely removed')
        }),
      error: (platform: string) =>
        this.error(t('toast.accounterror', `${platform} account error`), {
          description: t('common.pleasereconnectyouraccounttocontinuepublishing', 'Please reconnect your account to continue publishing'),
          duration: 8000
        })
    }
  }

  // Content generation toasts
  static content = {
    generation: {
      start: (bookTitle: string) =>
        toast.loading(
          t('toast.generatingcontent', `Generating content for "${bookTitle}"...`)
        ),
      success: (itemsGenerated: number) =>
        this.success(t('toast.contentgenerated', `Content generated successfully`), {
          description: t('toast.itemsgenerated', `${itemsGenerated} items created`)
        }),
      partialSuccess: (successful: number, failed: number) =>
        this.warning(t('common.contentgenerationpartiallycompleted', 'Content generation partially completed'), {
          description: t('toast.partialgeneration', `${successful} successful, ${failed} failed`)
        }),
      error: (error?: string) =>
        this.error(t('common.contentgenerationfailed', 'Content generation failed'), {
          description: error || t('common.pleasetryagain', 'Please try again')
        })
    }
  }

  // Analytics toasts
  static analytics = {
    updated: () =>
      this.success(t('common.analyticsupdated', 'Analytics updated'), {
        description: t('common.allplatformdatarefreshed', 'All platform data refreshed')
      }),
    outdated: () =>
      this.warning(t('toast.analyticsmaybeoutdated', 'Analytics may be outdated'), {
        description: t('common.analyticsdatamaybeoutdated', 'Analytics data may be outdated')
      }),
    noData: () =>
      this.info(t('toast.noanalyticsdata', 'No analytics data available'), {
        description: t('common.datawillbeavailableoncepostsarepublished', 'Data will be available once posts are published')
      })
  }

  // Book management toasts
  static books = {
    uploaded: (title: string) =>
      this.success(t('common.bookuploadedsuccessfully', 'Book uploaded successfully'), {
        description: title
      }),
    deleted: (title: string) =>
      this.success(t('common.bookdeleted', 'Book deleted'), {
        description: title
      }),
    analysisQueued: (title: string) =>
      this.info(t('common.analysisqueued', 'Analysis queued'), {
        description: title
      })
  }
}
