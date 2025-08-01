import {
  AppError,
  ErrorType,
  ErrorSeverity,
  ErrorCreators,
  ErrorLogger,
  ValidationHelpers,
  handleApiError,
  withErrorHandling
} from "../error-handling"
import { NextRequest, NextResponse } from "next/server"

// Mock request interface for testing
interface MockRequest {
  url: string
  method: string
  headers: {
    get: jest.Mock
  }
}

// Mock NextResponse
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({ data, options }))
  }
}))

describe("AppError", () => {
  it("should create an AppError with all properties", () => {
    const error = new AppError(
      "Test error",
      ErrorType.VALIDATION,
      400,
      "User friendly message",
      ErrorSeverity.LOW,
      { field: "test" },
      true
    )

    expect(error.message).toBe("Test error")
    expect(error.type).toBe(ErrorType.VALIDATION)
    expect(error.statusCode).toBe(400)
    expect(error.userMessage).toBe("User friendly message")
    expect(error.severity).toBe(ErrorSeverity.LOW)
    expect(error.details).toEqual({ field: "test" })
    expect(error.retryable).toBe(true)
    expect(error.timestamp).toBeInstanceOf(Date)
  })

  it("should have proper error name and stack trace", () => {
    const error = new AppError(
      "Test error",
      ErrorType.INTERNAL,
      500,
      "Internal error"
    )

    expect(error.name).toBe("AppError")
    expect(error.stack).toBeDefined()
  })
})

describe("ErrorCreators", () => {
  describe("validation errors", () => {
    it("should create validation error", () => {
      const error = ErrorCreators.validation("email", "Invalid email format")

      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.statusCode).toBe(400)
      expect(error.severity).toBe(ErrorSeverity.LOW)
      expect(error.retryable).toBe(false)
    })
  })

  describe("authentication errors", () => {
    it("should create unauthorized error", () => {
      const error = ErrorCreators.unauthorized()

      expect(error.type).toBe(ErrorType.AUTHENTICATION)
      expect(error.statusCode).toBe(401)
      expect(error.userMessage).toBe("Please log in to access this resource")
    })
  })

  describe("file processing errors", () => {
    it("should create file too big error", () => {
      const error = ErrorCreators.fileTooBig("50MB")

      expect(error.type).toBe(ErrorType.FILE_PROCESSING)
      expect(error.statusCode).toBe(400)
      expect(error.userMessage).toBe("File size must be less than 50MB")
      expect(error.details).toEqual({ maxSize: "50MB" })
    })

    it("should create unsupported format error", () => {
      const formats = ["PDF", "EPUB", "TXT"]
      const error = ErrorCreators.unsupportedFileFormat(formats)

      expect(error.type).toBe(ErrorType.FILE_PROCESSING)
      expect(error.userMessage).toBe("Supported formats: PDF, EPUB, TXT")
      expect(error.details).toEqual({ supportedFormats: formats })
    })
  })

  describe("external service errors", () => {
    it("should create AI service unavailable error", () => {
      const error = ErrorCreators.aiServiceUnavailable()

      expect(error.type).toBe(ErrorType.EXTERNAL_SERVICE)
      expect(error.statusCode).toBe(503)
      expect(error.retryable).toBe(true)
    })

    it("should create social media API error", () => {
      const error = ErrorCreators.socialMediaApiError("Twitter", {
        code: "RATE_LIMIT"
      })

      expect(error.type).toBe(ErrorType.EXTERNAL_SERVICE)
      expect(error.statusCode).toBe(502)
      expect(error.details).toEqual({ platform: "Twitter", code: "RATE_LIMIT" })
    })
  })

  describe("rate limiting errors", () => {
    it("should create rate limit exceeded error", () => {
      const resetTime = new Date()
      const error = ErrorCreators.rateLimitExceeded(100, resetTime)

      expect(error.type).toBe(ErrorType.RATE_LIMIT)
      expect(error.statusCode).toBe(429)
      expect(error.details).toEqual({ limit: 100, resetTime })
      expect(error.retryable).toBe(true)
    })
  })

  describe("content management errors", () => {
    it("should create content generation failed error", () => {
      const error = ErrorCreators.contentGenerationFailed("AI quota exceeded", {
        service: "OpenAI"
      })

      expect(error.type).toBe(ErrorType.EXTERNAL_SERVICE)
      expect(error.statusCode).toBe(422)
      expect(error.retryable).toBe(true)
      expect(error.details).toEqual({
        reason: "AI quota exceeded",
        service: "OpenAI"
      })
    })

    it("should create book analysis required error", () => {
      const error = ErrorCreators.bookAnalysisRequired("Test Book")

      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.statusCode).toBe(400)
      expect(error.userMessage).toBe(
        '"Test Book" must be analyzed before generating content. Please run the analysis first.'
      )
    })
  })
})

describe("ValidationHelpers", () => {
  describe("required validation", () => {
    it("should pass for valid values", () => {
      expect(() => ValidationHelpers.required("test", "field")).not.toThrow()
      expect(() => ValidationHelpers.required(0, "field")).not.toThrow()
      expect(() => ValidationHelpers.required(false, "field")).not.toThrow()
    })

    it("should throw for invalid values", () => {
      expect(() => ValidationHelpers.required(null, "field")).toThrow()
      expect(() => ValidationHelpers.required(undefined, "field")).toThrow()
      expect(() => ValidationHelpers.required("", "field")).toThrow()
    })
  })

  describe("email validation", () => {
    it("should pass for valid emails", () => {
      expect(() => ValidationHelpers.email("test@example.com")).not.toThrow()
      expect(() =>
        ValidationHelpers.email("user.name+tag@domain.co.uk")
      ).not.toThrow()
    })

    it("should throw for invalid emails", () => {
      expect(() => ValidationHelpers.email("invalid-email")).toThrow()
      expect(() => ValidationHelpers.email("test@")).toThrow()
      expect(() => ValidationHelpers.email("@domain.com")).toThrow()
    })
  })

  describe("length validations", () => {
    it("should validate minimum length", () => {
      expect(() =>
        ValidationHelpers.minLength("test", 3, "field")
      ).not.toThrow()
      expect(() => ValidationHelpers.minLength("ab", 3, "field")).toThrow()
    })

    it("should validate maximum length", () => {
      expect(() =>
        ValidationHelpers.maxLength("test", 5, "field")
      ).not.toThrow()
      expect(() => ValidationHelpers.maxLength("toolong", 5, "field")).toThrow()
    })
  })

  describe("date validations", () => {
    it("should validate dates", () => {
      expect(() =>
        ValidationHelpers.isValidDate("2023-01-01", "field")
      ).not.toThrow()
      expect(() =>
        ValidationHelpers.isValidDate("invalid-date", "field")
      ).toThrow()
    })

    it("should validate future dates", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString() // Tomorrow
      const pastDate = new Date(Date.now() - 86400000).toISOString() // Yesterday

      expect(() =>
        ValidationHelpers.futureDate(futureDate, "field")
      ).not.toThrow()
      expect(() => ValidationHelpers.futureDate(pastDate, "field")).toThrow()
    })
  })
})

describe("ErrorLogger", () => {
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleInfoSpy: jest.SpyInstance

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation()
    ErrorLogger.clearErrorStats()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleInfoSpy.mockRestore()
  })

  it("should log AppError with proper formatting", () => {
    const error = new AppError(
      "Test error",
      ErrorType.VALIDATION,
      400,
      "User message",
      ErrorSeverity.MEDIUM
    )

    ErrorLogger.log(error, { userId: "test-user" })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("MEDIUM SEVERITY ERROR:"),
      expect.objectContaining({
        message: "Test error",
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM
      })
    )
  })

  it("should log generic Error", () => {
    const error = new Error("Generic error")

    ErrorLogger.log(error, { context: "test" })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("UNHANDLED ERROR:"),
      expect.objectContaining({
        message: "Generic error"
      })
    )
  })

  it("should track error frequency", () => {
    const error = new AppError(
      "Frequent error",
      ErrorType.NETWORK,
      503,
      "Network error"
    )

    // Log the same error multiple times
    for (let i = 0; i < 5; i++) {
      ErrorLogger.log(error)
    }

    const stats = ErrorLogger.getErrorStats()
    expect(stats.errorCounts["NETWORK:503"]).toBe(5)
  })
})

describe("handleApiError", () => {
  it("should handle AppError correctly", () => {
    const error = new AppError(
      "Test error",
      ErrorType.VALIDATION,
      400,
      "User message",
      ErrorSeverity.LOW,
      { field: "test" },
      false
    )

    const response = handleApiError(error, { requestId: "test-123" })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "User message",
        type: ErrorType.VALIDATION,
        retryable: false,
        suggestions: expect.arrayContaining([expect.any(String)]),
        requestId: "test-123"
      }),
      expect.objectContaining({
        status: 400,
        headers: expect.objectContaining({
          "X-Error-Type": ErrorType.VALIDATION,
          "X-Retryable": "false"
        })
      })
    )
  })

  it("should handle generic Error", () => {
    const error = new Error("Generic error")

    const response = handleApiError(error)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "An unexpected error occurred. Please try again.",
        type: ErrorType.INTERNAL,
        retryable: true
      }),
      expect.objectContaining({
        status: 500
      })
    )
  })

  it("should categorize network errors", () => {
    const error = new Error("ENOTFOUND example.com")

    const response = handleApiError(error)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ErrorType.NETWORK,
        suggestions: expect.arrayContaining([
          expect.stringContaining("internet connection")
        ])
      }),
      expect.any(Object)
    )
  })
})

describe("withErrorHandling", () => {
  it("should handle successful requests", async () => {
    const mockHandler = jest
      .fn()
      .mockResolvedValue(NextResponse.json({ success: true }))
    const wrappedHandler = withErrorHandling(mockHandler)

    const mockRequest: MockRequest = {
      url: "http://localhost/api/test",
      method: "GET",
      headers: {
        get: jest.fn().mockReturnValue("test-agent")
      }
    }

    const response = await wrappedHandler(mockRequest as unknown as NextRequest)

    expect(mockHandler).toHaveBeenCalledWith(
      mockRequest as unknown as NextRequest,
      expect.objectContaining({
        requestId: expect.any(String),
        url: "http://localhost/api/test",
        method: "GET"
      })
    )
  })

  it("should handle errors in requests", async () => {
    const error = new AppError(
      "Handler error",
      ErrorType.INTERNAL,
      500,
      "Internal error"
    )

    const mockHandler = jest.fn().mockRejectedValue(error)
    const wrappedHandler = withErrorHandling(mockHandler)

    const mockRequest: MockRequest = {
      url: "http://localhost/api/test",
      method: "POST",
      headers: {
        get: jest.fn().mockReturnValue(null)
      }
    }

    const response = await wrappedHandler(mockRequest as unknown as NextRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Internal error",
        type: ErrorType.INTERNAL
      }),
      expect.any(Object)
    )
  })
})
