import { InputValidator } from "../input-validation"

describe("InputValidator", () => {
  describe("sanitizeHtml", () => {
    it("should sanitize malicious HTML", () => {
      const maliciousHtml = '<script>alert("xss")</script><p>Safe content</p>'
      const result = InputValidator.sanitizeHtml(maliciousHtml)

      expect(result).toBe("<p>Safe content</p>")
      expect(result).not.toContain("<script>")
    })

    it("should allow safe HTML tags", () => {
      const safeHtml =
        "<p>This is <strong>bold</strong> and <em>italic</em></p>"
      const result = InputValidator.sanitizeHtml(safeHtml)

      expect(result).toBe(
        "<p>This is <strong>bold</strong> and <em>italic</em></p>"
      )
    })

    it("should handle empty input", () => {
      expect(InputValidator.sanitizeHtml("")).toBe("")
      expect(InputValidator.sanitizeHtml(null as unknown as string)).toBe("")
      expect(InputValidator.sanitizeHtml(undefined as unknown as string)).toBe(
        ""
      )
    })
  })

  describe("sanitizeText", () => {
    it("should remove control characters", () => {
      const textWithControlChars = "Normal text\x00with\x01control\x02chars"
      const result = InputValidator.sanitizeText(textWithControlChars)

      expect(result).toBe("Normal textwithcontrolchars")
    })

    it("should preserve newlines and tabs", () => {
      const textWithWhitespace = "Line 1\nLine 2\tTabbed"
      const result = InputValidator.sanitizeText(textWithWhitespace)

      expect(result).toBe("Line 1\nLine 2\tTabbed")
    })

    it("should handle empty input", () => {
      expect(InputValidator.sanitizeText("")).toBe("")
      expect(InputValidator.sanitizeText(null as unknown as string)).toBe("")
      expect(InputValidator.sanitizeText(undefined as unknown as string)).toBe(
        ""
      )
    })
  })

  describe("validateString", () => {
    it("should validate required field", () => {
      const result = InputValidator.validateString("", { required: true })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("This field is required")
    })

    it("should validate minimum length", () => {
      const result = InputValidator.validateString("abc", { minLength: 5 })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Must be at least 5 characters long")
    })

    it("should validate maximum length", () => {
      const result = InputValidator.validateString("abcdefghijk", {
        maxLength: 5
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Must be no more than 5 characters long")
    })

    it("should validate pattern", () => {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const result = InputValidator.validateString("invalid-email", {
        pattern: emailPattern
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Invalid format")
    })

    it("should use custom validator", () => {
      const customValidator = (value: unknown) =>
        typeof value === "string" && value.includes("test")
      const result = InputValidator.validateString("no match", {
        customValidator
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Invalid value")
    })

    it("should use custom validator with custom error message", () => {
      const customValidator = (value: unknown): string | boolean =>
        typeof value === "string" && value.includes("test")
          ? true
          : 'Must contain "test"'
      const result = InputValidator.validateString("no match", {
        customValidator
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Must contain "test"')
    })

    it("should pass validation for valid input", () => {
      const result = InputValidator.validateString("valid input", {
        required: true,
        minLength: 5,
        maxLength: 20
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedValue).toBe("valid input")
    })
  })

  describe("validateEmail", () => {
    it("should validate correct email", () => {
      const result = InputValidator.validateEmail("test@example.com")

      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("test@example.com")
    })

    it("should reject invalid email", () => {
      const result = InputValidator.validateEmail("invalid-email")

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Invalid email format")
    })

    it("should require email", () => {
      const result = InputValidator.validateEmail("")

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Email is required")
    })

    it("should normalize email case", () => {
      const result = InputValidator.validateEmail("TEST@EXAMPLE.COM")

      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("test@example.com")
    })
  })

  describe("validateUrl", () => {
    it("should validate correct URL", () => {
      const result = InputValidator.validateUrl("https://example.com")

      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe("https://example.com")
    })

    it("should reject invalid URL", () => {
      const result = InputValidator.validateUrl("not-a-url")

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Invalid URL format")
    })

    it("should allow empty URL", () => {
      const result = InputValidator.validateUrl("")

      expect(result.isValid).toBe(true)
    })

    it("should require protocol", () => {
      const result = InputValidator.validateUrl("example.com")

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Invalid URL format")
    })
  })

  describe("validateUuid", () => {
    it("should validate correct UUID", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000"
      const result = InputValidator.validateUuid(uuid)

      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe(uuid)
    })

    it("should reject invalid UUID", () => {
      const result = InputValidator.validateUuid("not-a-uuid")

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Invalid ID format")
    })

    it("should require UUID", () => {
      const result = InputValidator.validateUuid("")

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("ID is required")
    })
  })

  describe("validateSocialContent", () => {
    it("should validate Twitter content within limit", () => {
      const content = "Short tweet content"
      const result = InputValidator.validateSocialContent(content, "twitter")

      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe(content)
    })

    it("should reject Twitter content over limit", () => {
      const content = "a".repeat(300) // Over 280 character limit
      const result = InputValidator.validateSocialContent(content, "twitter")

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        "Content exceeds twitter character limit of 280"
      )
    })

    it("should detect suspicious content", () => {
      const content = '<script>alert("xss")</script>'
      const result = InputValidator.validateSocialContent(content, "twitter")

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        "Content contains potentially harmful elements"
      )
    })

    it("should sanitize HTML in content", () => {
      const content = '<p>Safe content</p><script>alert("xss")</script>'
      const result = InputValidator.validateSocialContent(content, "twitter")

      expect(result.sanitizedValue).toBe("<p>Safe content</p>")
    })
  })

  describe("validateFileMetadata", () => {
    it("should validate clean metadata", () => {
      const metadata = {
        title: "Clean Book Title",
        author: "Clean Author Name"
      }

      const result = InputValidator.validateFileMetadata(metadata)

      expect(result.isValid).toBe(true)
      expect((result.sanitizedValue as Record<string, string>).title).toBe(
        "Clean Book Title"
      )
      expect((result.sanitizedValue as Record<string, string>).author).toBe(
        "Clean Author Name"
      )
    })

    it("should reject metadata with suspicious content", () => {
      const metadata = {
        title: '<script>alert("xss")</script>Book Title',
        author: "Clean Author"
      }

      const result = InputValidator.validateFileMetadata(metadata)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        "Title: Content contains potentially harmful elements"
      )
    })

    it("should reject metadata exceeding length limits", () => {
      const metadata = {
        title: "a".repeat(300), // Over 255 character limit
        author: "Clean Author"
      }

      const result = InputValidator.validateFileMetadata(metadata)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        "Title: Must be no more than 255 characters long"
      )
    })
  })

  describe("validateApiRequest", () => {
    it("should validate API request body", () => {
      const body = {
        title: "Valid Title",
        content: "Valid content"
      }

      const schema = {
        title: { required: true, maxLength: 100 },
        content: { required: true, maxLength: 1000 }
      }

      const result = InputValidator.validateApiRequest(body, schema)

      expect(result.isValid).toBe(true)
      expect((result.sanitizedValue as Record<string, string>).title).toBe(
        "Valid Title"
      )
      expect((result.sanitizedValue as Record<string, string>).content).toBe(
        "Valid content"
      )
    })

    it("should reject invalid API request body", () => {
      const body = {
        title: "", // Required but empty
        content: "a".repeat(1100) // Over 1000 character limit
      }

      const schema = {
        title: { required: true, maxLength: 100 },
        content: { required: true, maxLength: 1000 }
      }

      const result = InputValidator.validateApiRequest(body, schema)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("title: This field is required")
      expect(result.errors).toContain(
        "content: Must be no more than 1000 characters long"
      )
    })
  })
})
