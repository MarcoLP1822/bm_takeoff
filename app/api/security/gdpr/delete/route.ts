import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { GDPRComplianceService } from '@/lib/gdpr-compliance'
import { createSecurityMiddleware, addSecurityHeaders, createInputValidationMiddleware } from '@/lib/security-middleware'
import { InputValidator } from '@/lib/input-validation'

// Type for the validated request body
interface ValidatedGDPRRequest extends NextRequest {
  validatedBody?: {
    confirmDeletion?: string
    anonymize?: boolean
  }
}

const securityMiddleware = createSecurityMiddleware({
  enableRateLimit: true,
  enableInputValidation: true,
  enableFileScanning: false,
  enableGDPRLogging: true,
  rateLimiter: 'api'
})

const validationMiddleware = createInputValidationMiddleware({
  confirmDeletion: {
    required: true,
    customValidator: (value: unknown) => {
      if (typeof value !== 'string') return 'Confirmation must be a string'
      return value === 'DELETE_MY_DATA'
    }
  },
  anonymize: {
    required: false,
    customValidator: (value: unknown) => typeof value === 'boolean'
  }
})

export async function POST(req: NextRequest) {
  // Apply security middleware
  const securityResult = await securityMiddleware(req)
  if (securityResult) return securityResult

  // Apply input validation
  const validationResult = await validationMiddleware(req)
  if (validationResult) return validationResult

  try {
    const { userId } = await auth()
    
    if (!userId) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ))
    }

    const body = (req as ValidatedGDPRRequest).validatedBody
    const { anonymize = false } = body || {}

    let deletionResult
    
    if (anonymize) {
      // Anonymize data instead of deletion
      deletionResult = await GDPRComplianceService.anonymizeUserData(userId)
    } else {
      // Complete data deletion
      deletionResult = await GDPRComplianceService.deleteUserData(userId)
    }

    // Log GDPR activity
    await GDPRComplianceService.logDataProcessing({
      userId,
      action: anonymize ? 'anonymize' : 'delete',
      dataTypes: ['books', 'content', 'social_accounts', 'analytics'],
      timestamp: new Date().toISOString(),
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown'
    })

    return addSecurityHeaders(NextResponse.json({
      success: deletionResult.success,
      deletedRecords: deletionResult.deletedRecords,
      errors: deletionResult.errors,
      action: anonymize ? 'anonymized' : 'deleted',
      timestamp: new Date().toISOString()
    }))
  } catch (error) {
    console.error('GDPR deletion error:', error)
    return addSecurityHeaders(NextResponse.json(
      { error: 'Failed to process data deletion request' },
      { status: 500 }
    ))
  }
}