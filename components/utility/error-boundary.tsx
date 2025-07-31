'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, Bug, Home, ArrowLeft } from 'lucide-react'
import { ToastService } from '@/lib/toast-service'
import { ErrorLogger, AppError, ErrorType } from '@/lib/error-handling'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  context?: string
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
      component: this.props.context || 'ErrorBoundary',
      errorBoundary: true,
      retryCount: this.retryCount,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      componentStack: errorInfo.componentStack,
      errorInfo
    }

    // Convert to AppError if it's not already
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          error.message,
          ErrorType.INTERNAL,
          500,
          'An unexpected error occurred in the application',
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
    ToastService.error('Something went wrong', {
      description: 'The application encountered an unexpected error',
      duration: 6000
    })
  }

  private async sendErrorToMonitoring(error: AppError, context: Record<string, unknown>) {
    try {
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
      console.warn('Failed to send error to monitoring:', monitoringError)
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
      
      ToastService.info(`Retrying... (${this.retryCount}/${this.maxRetries})`)
    } else {
      ToastService.error('Maximum retry attempts reached', {
        description: 'Please refresh the page or contact support'
      })
    }
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/dashboard'
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
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        ToastService.success('Error report copied to clipboard', {
          description: 'You can now paste this in a support ticket'
        })
      })
      .catch(() => {
        ToastService.error('Failed to copy error report')
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

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Bug className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-600">
                Something went wrong
              </CardTitle>
              <CardDescription>
                {isAppError 
                  ? error.userMessage 
                  : 'The application encountered an unexpected error'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Actions */}
              <div className="flex flex-wrap gap-3 justify-center">
                {canRetry && (
                  <Button onClick={this.handleRetry} variant="default">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({this.maxRetries - this.retryCount} left)
                  </Button>
                )}
                
                <Button onClick={this.handleRefresh} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
                
                <Button onClick={this.handleGoBack} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
                
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Error Details (if enabled) */}
              {this.props.showDetails && error && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>
                        <strong>Error ID:</strong> {errorId}
                      </div>
                      <div>
                        <strong>Message:</strong> {error.message}
                      </div>
                      {isAppError && (
                        <>
                          <div>
                            <strong>Type:</strong> {error.type}
                          </div>
                          <div>
                            <strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}
                          </div>
                        </>
                      )}
                      {this.props.context && (
                        <div>
                          <strong>Context:</strong> {this.props.context}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Support Actions */}
              <div className="text-center space-y-3">
                <Button 
                  onClick={this.handleReportError} 
                  variant="ghost" 
                  size="sm"
                >
                  Copy Error Report
                </Button>
                
                <p className="text-sm text-gray-600">
                  If this problem persists, please contact support with the error ID: 
                  <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-xs">
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
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for programmatic error reporting
export function useErrorReporting() {
  const reportError = React.useCallback((error: Error, context?: Record<string, unknown>) => {
    const errorBoundary = new ErrorBoundary({} as Props)
    errorBoundary.componentDidCatch(error, { componentStack: '' })
  }, [])

  return { reportError }
}