import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import {
  createSuccessResponse,
  createErrorResponse,
  createAuthErrorResponse,
  createValidationErrorResponse
} from "./api-response"

// Simplified API helpers that work with standard Next.js route handlers
export class ApiHandler {
  static async withAuth<T>(
    request: NextRequest,
    handler: (userId: string, request: NextRequest) => Promise<T>
  ): Promise<T | NextResponse> {
    try {
      const { userId } = await auth()
      
      if (!userId) {
        return createAuthErrorResponse()
      }
      
      return await handler(userId, request)
    } catch (error) {
      console.error('Auth error:', error)
      return createErrorResponse(
        "Authentication failed",
        401
      )
    }
  }

  static async withValidation<TSchema, TResult>(
    request: NextRequest,
    schema: z.ZodSchema<TSchema>,
    handler: (data: TSchema, request: NextRequest) => Promise<TResult>
  ): Promise<TResult | NextResponse> {
    try {
      const body = await request.json()
      const validatedData = schema.parse(body)
      
      return await handler(validatedData, request)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createValidationErrorResponse(
          error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
          }))
        )
      }
      
      console.error('Validation error:', error)
      return createErrorResponse(
        "Invalid request data",
        400
      )
    }
  }

  static async withAuthAndValidation<TSchema, TResult>(
    request: NextRequest,
    schema: z.ZodSchema<TSchema>,
    handler: (userId: string, data: TSchema, request: NextRequest) => Promise<TResult>
  ): Promise<TResult | NextResponse> {
    return this.withAuth(request, async (userId, req) => {
      return this.withValidation(req, schema, async (data, validatedReq) => {
        return handler(userId, data, validatedReq)
      })
    })
  }

  static wrapWithErrorHandling<T extends (...args: unknown[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await handler(...args)
      } catch (error) {
        console.error('API Error:', error)
        
        // Handle specific error types
        if (error instanceof z.ZodError) {
          return createValidationErrorResponse(
            error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
              code: e.code
            }))
          )
        }
        
        if (error instanceof Error) {
          return createErrorResponse(
            error.message,
            500,
            {
              details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
          )
        }
        
        return createErrorResponse(
          "Internal server error",
          500
        )
      }
    }) as T
  }
}

// Utility functions for common validations (re-export from existing)
export const ApiValidations = {
  uuid: z.string().uuid("Invalid ID format"),
  bookId: z.string().uuid("Invalid book ID"),
  contentId: z.string().uuid("Invalid content ID"),
  accountIds: z
    .array(z.string().uuid())
    .min(1, "At least one account must be selected"),
  platform: z.enum(["twitter", "instagram", "linkedin", "facebook"], {
    errorMap: () => ({ message: "Invalid platform" })
  }),
  scheduledAt: z
    .string()
    .datetime()
    .refine(
      date => new Date(date) > new Date(),
      "Scheduled time must be in the future"
    ),
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  }),
  fileUpload: z.object({
    file: z
      .instanceof(File)
      .refine(
        file => file.size <= 50 * 1024 * 1024,
        "File size must be less than 50MB"
      )
      .refine(
        file =>
          [
            "application/pdf",
            "application/epub+zip",
            "text/plain",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          ].includes(file.type),
        "Unsupported file format"
      )
  })
}

// Convenience helpers for specific endpoint types
export const BookApiHandler = {
  async withAuth<T>(
    request: NextRequest,
    handler: (userId: string, request: NextRequest) => Promise<T>
  ): Promise<T | NextResponse> {
    return ApiHandler.withAuth(request, handler)
  }
}

export const ContentApiHandler = {
  async withAuth<T>(
    request: NextRequest,
    handler: (userId: string, request: NextRequest) => Promise<T>
  ): Promise<T | NextResponse> {
    return ApiHandler.withAuth(request, handler)
  }
}

export const SocialApiHandler = {
  async withAuth<T>(
    request: NextRequest,
    handler: (userId: string, request: NextRequest) => Promise<T>
  ): Promise<T | NextResponse> {
    return ApiHandler.withAuth(request, handler)
  }
}
