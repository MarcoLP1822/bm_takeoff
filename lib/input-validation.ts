import DOMPurify from "isomorphic-dompurify"
import validator from "validator"

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  customValidator?: (value: unknown) => boolean | string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedValue?: unknown
}

export interface FileMetadata {
  title?: string
  author?: string
  [key: string]: unknown
}

export interface SanitizedFileMetadata {
  title?: string
  author?: string
}

export class InputValidator {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    if (!input) return ""
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
      ALLOWED_ATTR: []
    })
  }

  /**
   * Sanitize plain text input
   */
  static sanitizeText(input: string): string {
    if (!input) return ""
    // Remove null bytes and control characters except newlines and tabs
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
  }

  /**
   * Validate and sanitize string input
   */
  static validateString(
    input: unknown,
    rules: ValidationRule = {}
  ): ValidationResult {
    const errors: string[] = []

    // Convert to string if not already
    const stringValue = input?.toString() || ""

    // Check required
    if (rules.required && !stringValue.trim()) {
      errors.push("This field is required")
    }

    // Check length constraints
    if (rules.minLength && stringValue.length < rules.minLength) {
      errors.push(`Must be at least ${rules.minLength} characters long`)
    }

    if (rules.maxLength && stringValue.length > rules.maxLength) {
      errors.push(`Must be no more than ${rules.maxLength} characters long`)
    }

    // Check pattern
    if (rules.pattern && stringValue && !rules.pattern.test(stringValue)) {
      errors.push("Invalid format")
    }

    // Custom validation
    if (rules.customValidator && stringValue) {
      const customResult = rules.customValidator(stringValue)
      if (typeof customResult === "string") {
        errors.push(customResult)
      } else if (!customResult) {
        errors.push("Invalid value")
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: this.sanitizeText(stringValue)
    }
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = []

    if (!email) {
      errors.push("Email is required")
    } else if (!validator.isEmail(email)) {
      errors.push("Invalid email format")
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: email?.toLowerCase().trim()
    }
  }

  /**
   * Validate URL
   */
  static validateUrl(url: string): ValidationResult {
    const errors: string[] = []

    if (
      url &&
      !validator.isURL(url, {
        protocols: ["http", "https"],
        require_protocol: true
      })
    ) {
      errors.push("Invalid URL format")
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: url?.trim()
    }
  }

  /**
   * Validate UUID
   */
  static validateUuid(uuid: string): ValidationResult {
    const errors: string[] = []

    if (!uuid) {
      errors.push("ID is required")
    } else if (!validator.isUUID(uuid)) {
      errors.push("Invalid ID format")
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: uuid
    }
  }

  /**
   * Validate social media content
   */
  static validateSocialContent(
    content: string,
    platform: string
  ): ValidationResult {
    const errors: string[] = []

    // Check for potentially harmful content BEFORE sanitization
    if (this.containsSuspiciousContent(content)) {
      errors.push("Content contains potentially harmful elements")
    }

    const sanitized = this.sanitizeHtml(content)

    // Platform-specific character limits
    const limits = {
      twitter: 280,
      instagram: 2200,
      linkedin: 3000,
      facebook: 63206
    }

    const limit = limits[platform as keyof typeof limits]
    if (limit && sanitized.length > limit) {
      errors.push(`Content exceeds ${platform} character limit of ${limit}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    }
  }

  /**
   * Validate file metadata
   */
  static validateFileMetadata(metadata: FileMetadata): ValidationResult {
    const errors: string[] = []
    const sanitized: SanitizedFileMetadata = {}

    if (metadata.title) {
      const titleResult = this.validateString(metadata.title, {
        maxLength: 255,
        customValidator: value => {
          const stringValue = typeof value === "string" ? value : String(value)
          return this.containsSuspiciousContent(stringValue)
            ? "Content contains potentially harmful elements"
            : true
        }
      })
      if (!titleResult.isValid) {
        errors.push(...titleResult.errors.map(e => `Title: ${e}`))
      } else {
        sanitized.title = titleResult.sanitizedValue as string
      }
    }

    if (metadata.author) {
      const authorResult = this.validateString(metadata.author, {
        maxLength: 255,
        customValidator: value => {
          const stringValue = typeof value === "string" ? value : String(value)
          return this.containsSuspiciousContent(stringValue)
            ? "Content contains potentially harmful elements"
            : true
        }
      })
      if (!authorResult.isValid) {
        errors.push(...authorResult.errors.map(e => `Author: ${e}`))
      } else {
        sanitized.author = authorResult.sanitizedValue as string
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    }
  }

  /**
   * Check for suspicious content patterns
   */
  private static containsSuspiciousContent(content: string): boolean {
    const suspiciousPatterns = [
      /<script[\s\S]*?>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i,
      /expression\s*\(/i
    ]

    return suspiciousPatterns.some(pattern => pattern.test(content))
  }

  /**
   * Validate API request body
   */
  static validateApiRequest(
    body: Record<string, unknown>,
    schema: Record<string, ValidationRule>
  ): ValidationResult {
    const errors: string[] = []
    const sanitized: Record<string, unknown> = {}

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field]
      const result = this.validateString(value, rules)

      if (!result.isValid) {
        errors.push(...result.errors.map(e => `${field}: ${e}`))
      } else if (result.sanitizedValue !== undefined) {
        sanitized[field] = result.sanitizedValue
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized
    }
  }
}

/**
 * Middleware for validating API requests
 */
export function createValidationMiddleware(
  schema: Record<string, ValidationRule>
) {
  return (body: Record<string, unknown>) => {
    const result = InputValidator.validateApiRequest(body, schema)
    if (!result.isValid) {
      throw new Error(`Validation failed: ${result.errors.join(", ")}`)
    }
    return result.sanitizedValue
  }
}
