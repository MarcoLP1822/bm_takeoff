import { NextRequest, NextResponse } from 'next/server'
import { createSecurityMiddleware, createInputValidationMiddleware, addSecurityHeaders } from '../security-middleware'

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn().mockResolvedValue({ userId: 'test-user-id' })
}))

jest.mock('../rate-limiting', () => ({
  rateLimiters: {
    api: {
      checkLimit: jest.fn().mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        resetTime: Date.now() + 900000
      })
    }
  },
  createRateLimitMiddleware: jest.fn().mockReturnValue(
    jest.fn().mockResolvedValue({
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': new Date().toISOString()
      }
    })
  )
}))

jest.mock('../gdpr-compliance', () => ({
  GDPRComplianceService: {
    logDataProcessing: jest.fn().mockResolvedValue(undefined)
  }
}))

describe('Security Middleware', () => {
  const createMockRequest = (url: string = 'http://localhost:3000/api/test', options: { headers?: Record<string, string>; body?: unknown } = {}) => {
    return new NextRequest(url, {
      method: 'POST',
      headers: new Headers({
        'content-type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent',
        ...options.headers
      }),
      body: options.body ? JSON.stringify(options.body) : undefined
    })
  }

  describe('createSecurityMiddleware', () => {
    it('should pass security checks for valid request', async () => {
      const middleware = createSecurityMiddleware({
        enableRateLimit: true,
        enableInputValidation: false,
        enableFileScanning: false,
        enableGDPRLogging: true,
        rateLimiter: 'api'
      })

      const req = createMockRequest()
      const result = await middleware(req)

      expect(result).toBeNull() // Should continue to next middleware
    })

    it('should handle rate limit exceeded', async () => {
      // Mock rate limit exceeded
      const mockRateLimitMiddleware = jest.fn().mockRejectedValue({
        status: 429,
        headers: { 'Retry-After': '60' }
      })

      jest.doMock('../rate-limiting', () => ({
        rateLimiters: { api: {} },
        createRateLimitMiddleware: jest.fn().mockReturnValue(mockRateLimitMiddleware)
      }))

      const middleware = createSecurityMiddleware({
        enableRateLimit: true,
        enableInputValidation: false,
        enableFileScanning: false,
        enableGDPRLogging: false,
        rateLimiter: 'api'
      })

      const req = createMockRequest()
      const result = await middleware(req)

      expect(result?.status).toBe(429)
    })
  })

  describe('createInputValidationMiddleware', () => {
    it('should validate input successfully', async () => {
      const middleware = createInputValidationMiddleware({
        title: { required: true, maxLength: 100 },
        content: { required: true, maxLength: 1000 }
      })

      const req = createMockRequest('http://localhost:3000/api/test', {
        body: {
          title: 'Valid Title',
          content: 'Valid content'
        }
      })

      const result = await middleware(req)
      expect(result).toBeNull()
      expect((req as NextRequest & { validatedBody: unknown }).validatedBody).toEqual({
        title: 'Valid Title',
        content: 'Valid content'
      })
    })

    it('should fail validation for invalid input', async () => {
      const middleware = createInputValidationMiddleware({
        title: { required: true, maxLength: 10 },
        content: { required: true }
      })

      const req = createMockRequest('http://localhost:3000/api/test', {
        body: {
          title: 'This title is way too long',
          content: ''
        }
      })

      const result = await middleware(req)
      expect(result?.status).toBe(400)
      
      const responseBody = await result?.json()
      expect(responseBody.error).toBe('Validation failed')
      expect(responseBody.details).toContain('title: Must be no more than 10 characters long')
    })

    it('should sanitize input data', async () => {
      const middleware = createInputValidationMiddleware({
        content: { required: true }
      })

      const req = createMockRequest('http://localhost:3000/api/test', {
        body: {
          content: 'Content with\x00null bytes\x01and control chars'
        }
      })

      const result = await middleware(req)
      expect(result).toBeNull()
      expect((req as NextRequest & { validatedBody: { content: string } }).validatedBody.content).toBe('Content withnull bytesand control chars')
    })
  })

  describe('addSecurityHeaders', () => {
    it('should add security headers to response', () => {
      const response = NextResponse.json({ message: 'test' })
      const secureResponse = addSecurityHeaders(response)

      expect(secureResponse.headers.get('X-Frame-Options')).toBe('DENY')
      expect(secureResponse.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(secureResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(secureResponse.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(secureResponse.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains')
    })
  })
})