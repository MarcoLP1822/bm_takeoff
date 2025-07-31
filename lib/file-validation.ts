export interface FileValidationResult {
  isValid: boolean
  error?: string
  details?: string
  securityScan?: {
    passed: boolean
    threats?: string[]
  }
}

export interface SupportedFileFormat {
  extension: string
  mimeType: string
  description: string
}

export const SUPPORTED_FILE_FORMATS: SupportedFileFormat[] = [
  {
    extension: '.pdf',
    mimeType: 'application/pdf',
    description: 'PDF Document'
  },
  {
    extension: '.epub',
    mimeType: 'application/epub+zip',
    description: 'EPUB eBook'
  },
  {
    extension: '.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    description: 'Microsoft Word Document'
  },
  {
    extension: '.txt',
    mimeType: 'text/plain',
    description: 'Plain Text File'
  }
]

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export class FileValidationService {
  /**
   * Validate a file before upload
   */
  static async validateFile(file: File): Promise<FileValidationResult> {
    // Check if file exists
    if (!file) {
      return {
        isValid: false,
        error: 'No file provided',
        details: 'Please select a file to upload'
      }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: 'File too large',
        details: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`
      }
    }

    // Check if file is empty
    if (file.size === 0) {
      return {
        isValid: false,
        error: 'Empty file',
        details: 'The selected file appears to be empty'
      }
    }

    // Check file format by MIME type
    const supportedMimeTypes = SUPPORTED_FILE_FORMATS.map(format => format.mimeType)
    if (!supportedMimeTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Unsupported file format',
        details: `Supported formats: ${SUPPORTED_FILE_FORMATS.map(f => f.description).join(', ')}`
      }
    }

    // Additional validation: check file extension matches MIME type
    const fileExtension = this.getFileExtension(file.name).toLowerCase()
    const expectedFormat = SUPPORTED_FILE_FORMATS.find(format => format.mimeType === file.type)
    
    if (expectedFormat && expectedFormat.extension !== fileExtension) {
      return {
        isValid: false,
        error: 'File extension mismatch',
        details: `File extension (${fileExtension}) doesn't match the file type (${expectedFormat.description})`
      }
    }

    // Perform security scan
    const securityScan = await this.performSecurityScan(file)
    if (!securityScan.passed) {
      return {
        isValid: false,
        error: 'Security scan failed',
        details: `File contains potential threats: ${securityScan.threats?.join(', ')}`,
        securityScan
      }
    }

    return {
      isValid: true,
      securityScan
    }
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.')
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : ''
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get supported file formats for display
   */
  static getSupportedFormatsText(): string {
    return SUPPORTED_FILE_FORMATS.map(format => format.description).join(', ')
  }

  /**
   * Get file accept attribute for input element
   */
  static getAcceptAttribute(): string {
    return SUPPORTED_FILE_FORMATS.map(format => format.extension).join(',')
  }

  /**
   * Check if a file extension is supported
   */
  static isExtensionSupported(extension: string): boolean {
    return SUPPORTED_FILE_FORMATS.some(format => 
      format.extension.toLowerCase() === extension.toLowerCase()
    )
  }

  /**
   * Get MIME type from file extension
   */
  static getMimeTypeFromExtension(extension: string): string | null {
    const format = SUPPORTED_FILE_FORMATS.find(format => 
      format.extension.toLowerCase() === extension.toLowerCase()
    )
    return format ? format.mimeType : null
  }

  /**
   * Perform basic security scan on file content
   */
  static async performSecurityScan(file: File): Promise<{ passed: boolean; threats?: string[] }> {
    const threats: string[] = []
    
    try {
      // Read file content as text for scanning
      const buffer = await file.arrayBuffer()
      const content = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, threat: 'JavaScript code' },
        { pattern: /javascript:/gi, threat: 'JavaScript protocol' },
        { pattern: /vbscript:/gi, threat: 'VBScript protocol' },
        { pattern: /on\w+\s*=/gi, threat: 'Event handlers' },
        { pattern: /eval\s*\(/gi, threat: 'Code evaluation' },
        { pattern: /document\.write/gi, threat: 'DOM manipulation' },
        { pattern: /window\.location/gi, threat: 'Location manipulation' },
        { pattern: /%3Cscript/gi, threat: 'Encoded script tags' },
        { pattern: /\x00/g, threat: 'Null bytes' }
      ]
      
      for (const { pattern, threat } of suspiciousPatterns) {
        if (pattern.test(content)) {
          threats.push(threat)
        }
      }
      
      // Check file header for known malicious signatures
      const headerThreats = this.checkFileHeader(new Uint8Array(buffer.slice(0, 1024)))
      threats.push(...headerThreats)
      
      // Additional checks for specific file types
      if (file.type === 'application/pdf') {
        const pdfThreats = this.scanPdfContent(content)
        threats.push(...pdfThreats)
      }
      
      return {
        passed: threats.length === 0,
        threats: threats.length > 0 ? threats : undefined
      }
    } catch (error) {
      console.error('Security scan error:', error)
      // Fail secure - reject file if scan fails
      return {
        passed: false,
        threats: ['Security scan failed']
      }
    }
  }

  /**
   * Check file header for malicious signatures
   */
  private static checkFileHeader(header: Uint8Array): string[] {
    const threats: string[] = []
    
    // Convert to hex string for pattern matching
    const hexHeader = Array.from(header)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Known malicious file signatures
    const maliciousSignatures = [
      { signature: '4d5a', threat: 'Executable file' }, // MZ header
      { signature: '7f454c46', threat: 'ELF executable' }, // ELF header
      { signature: 'cafebabe', threat: 'Java class file' }, // Java class
      { signature: 'feedface', threat: 'Mach-O executable' }, // Mach-O
    ]
    
    for (const { signature, threat } of maliciousSignatures) {
      if (hexHeader.startsWith(signature)) {
        threats.push(threat)
      }
    }
    
    return threats
  }

  /**
   * Scan PDF content for suspicious elements
   */
  private static scanPdfContent(content: string): string[] {
    const threats: string[] = []
    
    const pdfThreats = [
      { pattern: /\/JavaScript/gi, threat: 'PDF JavaScript' },
      { pattern: /\/JS/gi, threat: 'PDF JavaScript (short form)' },
      { pattern: /\/Launch/gi, threat: 'PDF Launch action' },
      { pattern: /\/URI/gi, threat: 'PDF URI action' },
      { pattern: /\/SubmitForm/gi, threat: 'PDF form submission' },
      { pattern: /\/ImportData/gi, threat: 'PDF data import' }
    ]
    
    for (const { pattern, threat } of pdfThreats) {
      if (pattern.test(content)) {
        threats.push(threat)
      }
    }
    
    return threats
  }

  /**
   * Validate file content integrity
   */
  static async validateFileIntegrity(file: File): Promise<boolean> {
    try {
      const buffer = await file.arrayBuffer()
      
      // Basic integrity checks based on file type
      switch (file.type) {
        case 'application/pdf':
          return this.validatePdfIntegrity(buffer)
        case 'application/epub+zip':
          return this.validateEpubIntegrity(buffer)
        case 'text/plain':
          return this.validateTextIntegrity(buffer)
        default:
          return true // Skip integrity check for other types
      }
    } catch (error) {
      console.error('File integrity check failed:', error)
      return false
    }
  }

  /**
   * Validate PDF file integrity
   */
  private static validatePdfIntegrity(buffer: ArrayBuffer): boolean {
    const content = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
    
    // Check for PDF header
    if (!content.startsWith('%PDF-')) {
      return false
    }
    
    // Check for PDF trailer
    if (!content.includes('%%EOF')) {
      return false
    }
    
    return true
  }

  /**
   * Validate EPUB file integrity
   */
  private static validateEpubIntegrity(buffer: ArrayBuffer): boolean {
    const header = new Uint8Array(buffer.slice(0, 4))
    
    // Check for ZIP header (EPUB is a ZIP file)
    return header[0] === 0x50 && header[1] === 0x4B
  }

  /**
   * Validate text file integrity
   */
  private static validateTextIntegrity(buffer: ArrayBuffer): boolean {
    try {
      // Try to decode as UTF-8
      new TextDecoder('utf-8', { fatal: true }).decode(buffer)
      return true
    } catch {
      return false
    }
  }
}

// Export function for backward compatibility with tests
export const validateFile = FileValidationService.validateFile