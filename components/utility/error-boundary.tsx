"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Bug, Home, ArrowLeft } from "lucide-react"
import { ToastService } from "@/lib/toast-service-i18n"
import { ErrorLogger, AppError, ErrorType } from "@/lib/error-handling"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  context?: string
  translations?: {
    title: string
    defaultMessage: string
    retryButton: string
    refreshButton: string
    goBackButton: string
    goHomeButton: string
    copyErrorButton: string
    errorId: string
    message: string
    type: string
    retryable: string
    context: string
    yes: string
    no: string
    supportMessage: string
    retryDescription: string
    supportDescription: string
    maxRetryDescription: string
    somethingWentWrong: string
    unexpectedError: string
    retrying: string
    maxRetriesReached: string
    errorReportCopied: string
    failedToCopyError: string
  }
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Create enhanced error context
    const context = {
      component: this.props.context || "ErrorBoundary",
      errorBoundary: true,
      retryCount: this.retryCount,
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : undefined,
      componentStack: errorInfo.componentStack,
      errorInfo
    }

    // Convert to AppError if it's not already
    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            ErrorType.INTERNAL,
            500,
            "An unexpected error occurred in the application",
            undefined,
            { originalError: error.name, stack: error.stack },
            true
          )

    // Log the error
    ErrorLogger.log(appError, context)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Send error to monitoring service
    this.sendErrorToMonitoring(appError, context)

    // Show toast notification
    const translations = this.props.translations
    if (translations) {
      ToastService.error(translations.somethingWentWrong, {
        description: translations.unexpectedError,
        duration: 6000
      })
    }
  }

  private async sendErrorToMonitoring(
    error: AppError,
    context: Record<string, unknown>
  ) {
    try {
      await fetch("/api/monitoring/errors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          message: error.message,
          stack: error.stack,
          type: error.type,
          severity: error.severity,
          statusCode: error.statusCode,
          userMessage: error.userMessage,
          details: error.details,
          retryable: error.retryable,
          context
        })
      })
    } catch (monitoringError) {
      console.warn("Failed to send error to monitoring:", monitoringError)
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      })

      const translations = this.props.translations
      if (translations) {
        ToastService.info(`${translations.retrying} (${this.retryCount}/${this.maxRetries})`)
      }
    } else {
      const translations = this.props.translations
      if (translations) {
        ToastService.error(translations.maxRetriesReached, {
          description: translations.maxRetryDescription
        })
      }
    }
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = "/dashboard"
  }

  private handleGoBack = () => {
    window.history.back()
  }

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state

    if (!error || !errorId) return

    // Create error report
    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: window.navigator.userAgent,
      context: this.props.context
    }

    // Copy to clipboard
    navigator.clipboard
      .writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        const translations = this.props.translations
        if (translations) {
          ToastService.success(translations.errorReportCopied, {
            description: translations.supportDescription
          })
        }
      })
      .catch(() => {
        const translations = this.props.translations
        if (translations) {
          ToastService.error(translations.failedToCopyError)
        }
      })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo, errorId } = this.state
      const canRetry = this.retryCount < this.maxRetries
      const isAppError = error instanceof AppError
      const t = this.props.translations

      // Fallback to English if no translations provided
      const defaultTranslations = {
        title: "Something went wrong",
        defaultMessage: "The application encountered an unexpected error",
        retryButton: "Try Again",
        refreshButton: "Refresh Page",
        goBackButton: "Go Back",
        goHomeButton: "Go Home",
        copyErrorButton: "Copy Error Report",
        errorId: "Error ID:",
        message: "Message:",
        type: "Type:",
        retryable: "Retryable:",
        context: "Context:",
        yes: "Yes",
        no: "No",
        supportMessage: "If this problem persists, please contact support with the error ID:",
        retryDescription: "left"
      }

      const translations = t || defaultTranslations

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Bug className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-600">
                {translations.title}
              </CardTitle>
              <CardDescription>
                {isAppError
                  ? error.userMessage
                  : translations.defaultMessage}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Actions */}
              <div className="flex flex-wrap justify-center gap-3">
                {canRetry && (
                  <Button onClick={this.handleRetry} variant="default">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {translations.retryButton} ({this.maxRetries - this.retryCount} {translations.retryDescription})
                  </Button>
                )}

                <Button onClick={this.handleRefresh} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {translations.refreshButton}
                </Button>

                <Button onClick={this.handleGoBack} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {translations.goBackButton}
                </Button>

                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  {translations.goHomeButton}
                </Button>
              </div>

              {/* Error Details (if enabled) */}
              {this.props.showDetails && error && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>
                        <strong>{translations.errorId}</strong> {errorId}
                      </div>
                      <div>
                        <strong>{translations.message}</strong> {error.message}
                      </div>
                      {isAppError && (
                        <>
                          <div>
                            <strong>{translations.type}</strong> {error.type}
                          </div>
                          <div>
                            <strong>{translations.retryable}</strong>{" "}
                            {error.retryable ? translations.yes : translations.no}
                          </div>
                        </>
                      )}
                      {this.props.context && (
                        <div>
                          <strong>{translations.context}</strong> {this.props.context}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Support Actions */}
              <div className="space-y-3 text-center">
                <Button
                  onClick={this.handleReportError}
                  variant="ghost"
                  size="sm"
                >
                  {translations.copyErrorButton}
                </Button>

                <p className="text-sm text-gray-600">
                  {translations.supportMessage}
                  <code className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-xs">
                    {errorId}
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children" | "translations">
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryWrapper {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundaryWrapper>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Wrapper component that provides translations
export function ErrorBoundaryWrapper(props: Omit<Props, "translations">) {
  const t = useTranslations("errorBoundary")
  const tToast = useTranslations("toast")

  const translations = {
    title: t("title"),
    defaultMessage: t("defaultMessage"),
    retryButton: t("retryButton"),
    refreshButton: t("refreshButton"),
    goBackButton: t("goBackButton"),
    goHomeButton: t("goHomeButton"),
    copyErrorButton: t("copyErrorButton"),
    errorId: t("errorId"),
    message: t("message"),
    type: t("type"),
    retryable: t("retryable"),
    context: t("context"),
    yes: t("yes"),
    no: t("no"),
    supportMessage: t("supportMessage"),
    retryDescription: t("retryDescription"),
    supportDescription: t("supportDescription"),
    maxRetryDescription: t("maxRetryDescription"),
    somethingWentWrong: tToast("error.somethingWentWrong"),
    unexpectedError: t("defaultMessage"),
    retrying: tToast("info.retrying"),
    maxRetriesReached: tToast("error.maxRetriesReached"),
    errorReportCopied: tToast("success.errorReportCopied"),
    failedToCopyError: tToast("error.failedToCopyError")
  }

  return <ErrorBoundary {...props} translations={translations} />
}

// Hook for programmatic error reporting
export function useErrorReporting() {
  const reportError = React.useCallback(
    (error: Error, context?: Record<string, unknown>) => {
      const errorBoundary = new ErrorBoundary({} as Props)
      errorBoundary.componentDidCatch(error, { componentStack: "" })
    },
    []
  )

  return { reportError }
}
