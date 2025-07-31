import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { GDPRComplianceService } from '@/lib/gdpr-compliance'
import { createSecurityMiddleware, addSecurityHeaders } from '@/lib/security-middleware'
import { rateLimiters } from '@/lib/rate-limiting'

const securityMiddleware = createSecurityMiddleware({
  enableRateLimit: true,
  enableInputValidation: false,
  enableFileScanning: false,
  enableGDPRLogging: true,
  rateLimiter: 'api'
})

export async function POST(req: NextRequest) {
  // Apply security middleware
  const securityResult = await securityMiddleware(req)
  if (securityResult) return securityResult

  try {
    const { userId } = await auth()
    
    if (!userId) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ))
    }

    // Export user data
    const exportData = await GDPRComplianceService.exportUserData(userId)
    
    // Generate encrypted export
    const encryptedExport = await GDPRComplianceService.generateEncryptedExport(userId)
    
    // Log GDPR activity
    await GDPRComplianceService.logDataProcessing({
      userId,
      action: 'export',
      dataTypes: ['books', 'content', 'social_accounts', 'analytics'],
      timestamp: new Date().toISOString(),
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown'
    })

    return addSecurityHeaders(NextResponse.json({
      success: true,
      exportData,
      encryptedExport: encryptedExport.substring(0, 100) + '...', // Truncated for response
      exportDate: new Date().toISOString()
    }))
  } catch (error) {
    console.error('GDPR export error:', error)
    return addSecurityHeaders(NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    ))
  }
}