'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../ui/dialog'
import { 
  Bug, 
  Send, 
  Copy, 
  CheckCircle, 
  AlertTriangle,
  Info,
  X
} from 'lucide-react'
import { ToastService } from '@/lib/toast-service'
import { AppError, ErrorType } from '@/lib/error-handling'
import { useErrorHandler } from '@/hooks/use-error-handler'

interface ErrorReportingProps {
  error?: AppError | Error
  context?: string
  onClose?: () => void
  trigger?: React.ReactNode
}

export function ErrorReporting({ error, context, onClose, trigger }: ErrorReportingProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [userDescription, setUserDescription] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { handleError } = useErrorHandler()

  const errorDetails = error ? {
    id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    type: error instanceof AppError ? error.type : 'UNKNOWN',
    severity: error instanceof AppError ? error.severity : 'UNKNOWN',
    userMessage: error instanceof AppError ? error.userMessage : error.message,
    retryable: error instanceof AppError ? error.retryable : false,
    context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
  } : null

  const handleSubmitReport = async () => {
    if (!errorDetails) return

    setIsSubmitting(true)
    
    try {
      const reportData = {
        ...errorDetails,
        userDescription,
        userEmail,
        reportedAt: new Date().toISOString()
      }

      const response = await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      })

      if (!response.ok) {
        throw new Error('Failed to submit error report')
      }

      setIsSubmitted(true)
      ToastService.success('Error report submitted', {
        description: 'Thank you for helping us improve the application'
      })

      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false)
        onClose?.()
      }, 2000)

    } catch (submitError) {
      handleError(submitError, {
        context: 'Error Report Submission',
        showToast: true
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyDetails = () => {
    if (!errorDetails) return

    const reportText = `
Error Report
============
ID: ${errorDetails.id}
Timestamp: ${errorDetails.timestamp}
Type: ${errorDetails.type}
Severity: ${errorDetails.severity}
Message: ${errorDetails.message}
Context: ${errorDetails.context || 'None'}
URL: ${errorDetails.url || 'Unknown'}

User Description:
${userDescription || 'None provided'}

Technical Details:
${errorDetails.stack || 'No stack trace available'}
    `.trim()

    navigator.clipboard.writeText(reportText)
      .then(() => {
        ToastService.success('Error details copied to clipboard')
      })
      .catch(() => {
        ToastService.error('Failed to copy error details')
      })
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'MEDIUM':
        return <Info className="h-4 w-4 text-yellow-600" />
      case 'LOW':
        return <Info className="h-4 w-4 text-blue-600" />
      default:
        return <Bug className="h-4 w-4 text-gray-600" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'border-red-200 bg-red-50'
      case 'HIGH':
        return 'border-orange-200 bg-orange-50'
      case 'MEDIUM':
        return 'border-yellow-200 bg-yellow-50'
      case 'LOW':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const content = (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Report Error
        </DialogTitle>
        <DialogDescription>
          Help us improve the application by reporting this error. Your feedback is valuable.
        </DialogDescription>
      </DialogHeader>

      {isSubmitted ? (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-600 mb-2">
            Report Submitted Successfully
          </h3>
          <p className="text-gray-600">
            Thank you for your feedback. We'll investigate this issue.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Error Summary */}
          {errorDetails && (
            <Card className={`${getSeverityColor(errorDetails.severity)}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {getSeverityIcon(errorDetails.severity)}
                  {errorDetails.type} Error
                  <span className="ml-auto text-xs text-gray-500">
                    {errorDetails.severity}
                  </span>
                </CardTitle>
                <CardDescription className="text-sm">
                  {errorDetails.userMessage}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Error ID:</strong> {errorDetails.id}</div>
                  <div><strong>Time:</strong> {new Date(errorDetails.timestamp).toLocaleString()}</div>
                  {errorDetails.context && (
                    <div><strong>Context:</strong> {errorDetails.context}</div>
                  )}
                  <div><strong>Retryable:</strong> {errorDetails.retryable ? 'Yes' : 'No'}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Input Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-description">
                What were you trying to do when this error occurred?
              </Label>
              <Textarea
                id="user-description"
                placeholder="Please describe what you were doing, what you expected to happen, and what actually happened..."
                value={userDescription}
                onChange={(e) => setUserDescription(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="user-email">
                Email (optional)
              </Label>
              <Input
                id="user-email"
                type="email"
                placeholder="your.email@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                We may contact you for additional information about this error
              </p>
            </div>
          </div>

          {/* Technical Details (Collapsible) */}
          {errorDetails && (
            <details className="border rounded-lg">
              <summary className="p-3 cursor-pointer hover:bg-gray-50 font-medium text-sm">
                Technical Details
              </summary>
              <div className="p-3 border-t bg-gray-50">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleCopyDetails}
              disabled={!errorDetails}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Details
            </Button>
            
            <Button
              onClick={handleSubmitReport}
              disabled={isSubmitting || !errorDetails}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      )}
    </DialogContent>
  )

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        {content}
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bug className="h-4 w-4 mr-2" />
          Report Error
        </Button>
      </DialogTrigger>
      {content}
    </Dialog>
  )
}

// Quick error reporting hook for programmatic use
export function useErrorReporting() {
  const [reportingError, setReportingError] = useState<AppError | Error | null>(null)
  const [reportingContext, setReportingContext] = useState<string>('')

  const reportError = (error: AppError | Error, context?: string) => {
    setReportingError(error)
    setReportingContext(context || '')
  }

  const clearError = () => {
    setReportingError(null)
    setReportingContext('')
  }

  return {
    reportError,
    clearError,
    ErrorReportingDialog: () => reportingError ? (
      <ErrorReporting
        error={reportingError}
        context={reportingContext}
        onClose={clearError}
      />
    ) : null
  }
}

// Global error reporting component that can be placed in the app layout
export function GlobalErrorReporting() {
  const [errors, setErrors] = useState<Array<{
    error: AppError | Error
    context?: string
    id: string
  }>>([])

  React.useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      const error = new Error(event.message)
      error.stack = event.error?.stack
      
      setErrors(prev => [...prev, {
        error,
        context: 'Unhandled JavaScript Error',
        id: `unhandled_${Date.now()}`
      }])
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))
      
      setErrors(prev => [...prev, {
        error,
        context: 'Unhandled Promise Rejection',
        id: `rejection_${Date.now()}`
      }])
    }

    window.addEventListener('error', handleUnhandledError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleUnhandledError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id))
  }

  if (errors.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {errors.map(({ error, context, id }) => (
        <Alert key={id} className="max-w-md shadow-lg border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              An unexpected error occurred
            </span>
            <div className="flex gap-2 ml-2">
              <ErrorReporting
                error={error}
                context={context}
                trigger={
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    Report
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => removeError(id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}