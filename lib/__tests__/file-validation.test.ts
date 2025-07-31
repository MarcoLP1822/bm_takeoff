import { FileValidationService, MAX_FILE_SIZE } from '../file-validation'

// Mock File constructor for testing
class MockFile {
  name: string
  size: number
  type: string

  constructor(name: string, size: number, type: string) {
    this.name = name
    this.size = size
    this.type = type
  }

  // Mock the arrayBuffer method for security scanning
  async arrayBuffer(): Promise<ArrayBuffer> {
    // Return a mock buffer with safe content
    const buffer = new ArrayBuffer(this.size)
    const view = new Uint8Array(buffer)
    
    // Fill buffer with safe non-null bytes first
    for (let i = 0; i < this.size; i++) {
      view[i] = 32 // Space character
    }
    
    // Fill with safe content based on file type
    if (this.type === 'application/pdf') {
      // Mock PDF header
      const pdfHeader = '%PDF-1.4\n'
      for (let i = 0; i < Math.min(pdfHeader.length, this.size); i++) {
        view[i] = pdfHeader.charCodeAt(i)
      }
      // Add mock EOF at the end if there's space
      const eofText = '%%EOF'
      const startPos = Math.max(0, this.size - eofText.length)
      for (let i = 0; i < eofText.length && startPos + i < this.size; i++) {
        view[startPos + i] = eofText.charCodeAt(i)
      }
    } else if (this.type === 'application/epub+zip') {
      // Mock ZIP header for EPUB
      view[0] = 0x50 // P
      view[1] = 0x4B // K
      view[2] = 0x03
      view[3] = 0x04
      // Fill rest with safe content
      for (let i = 4; i < this.size; i++) {
        view[i] = 32 // Space character
      }
    } else if (this.type === 'text/plain') {
      // Mock text content
      const textContent = 'This is mock text content for testing.'
      const repeatContent = textContent.repeat(Math.ceil(this.size / textContent.length))
      for (let i = 0; i < this.size; i++) {
        view[i] = repeatContent.charCodeAt(i % repeatContent.length)
      }
    }
    
    return buffer
  }
}

describe('FileValidationService', () => {
  describe('validateFile', () => {
    it('should validate a correct PDF file', async () => {
      const file = new MockFile('test.pdf', 1024 * 1024, 'application/pdf') as File
      const result = await FileValidationService.validateFile(file)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate a correct EPUB file', async () => {
      const file = new MockFile('book.epub', 2 * 1024 * 1024, 'application/epub+zip') as File
      const result = await FileValidationService.validateFile(file)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate a correct DOCX file', async () => {
      const file = new MockFile('document.docx', 5 * 1024 * 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') as File
      const result = await FileValidationService.validateFile(file)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate a correct TXT file', async () => {
      const file = new MockFile('text.txt', 1024, 'text/plain') as File
      const result = await FileValidationService.validateFile(file)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject files that are too large', async () => {
      const file = new MockFile('large.pdf', MAX_FILE_SIZE + 1, 'application/pdf') as File
      const result = await FileValidationService.validateFile(file)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('File too large')
      expect(result.details).toContain('File size must be less than')
    })

    it('should reject empty files', async () => {
      const file = new MockFile('empty.pdf', 0, 'application/pdf') as File
      const result = await FileValidationService.validateFile(file)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Empty file')
    })

    it('should reject unsupported file formats', async () => {
      const file = new MockFile('image.jpg', 1024, 'image/jpeg') as File
      const result = await FileValidationService.validateFile(file)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Unsupported file format')
      expect(result.details).toContain('Supported formats:')
    })

    it('should reject files with mismatched extensions', async () => {
      const file = new MockFile('document.txt', 1024, 'application/pdf') as File
      const result = await FileValidationService.validateFile(file)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('File extension mismatch')
    })
  })

  describe('getFileExtension', () => {
    it('should extract file extensions correctly', () => {
      expect(FileValidationService.getFileExtension('document.pdf')).toBe('.pdf')
      expect(FileValidationService.getFileExtension('book.epub')).toBe('.epub')
      expect(FileValidationService.getFileExtension('file.docx')).toBe('.docx')
      expect(FileValidationService.getFileExtension('text.txt')).toBe('.txt')
    })

    it('should handle files without extensions', () => {
      expect(FileValidationService.getFileExtension('filename')).toBe('')
    })

    it('should handle multiple dots in filename', () => {
      expect(FileValidationService.getFileExtension('my.document.pdf')).toBe('.pdf')
    })
  })

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(FileValidationService.formatFileSize(0)).toBe('0 Bytes')
      expect(FileValidationService.formatFileSize(1024)).toBe('1 KB')
      expect(FileValidationService.formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(FileValidationService.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })
  })

  describe('isExtensionSupported', () => {
    it('should return true for supported extensions', () => {
      expect(FileValidationService.isExtensionSupported('.pdf')).toBe(true)
      expect(FileValidationService.isExtensionSupported('.PDF')).toBe(true)
      expect(FileValidationService.isExtensionSupported('.epub')).toBe(true)
      expect(FileValidationService.isExtensionSupported('.docx')).toBe(true)
      expect(FileValidationService.isExtensionSupported('.txt')).toBe(true)
    })

    it('should return false for unsupported extensions', () => {
      expect(FileValidationService.isExtensionSupported('.jpg')).toBe(false)
      expect(FileValidationService.isExtensionSupported('.doc')).toBe(false)
      expect(FileValidationService.isExtensionSupported('.html')).toBe(false)
    })
  })

  describe('getMimeTypeFromExtension', () => {
    it('should return correct MIME types for extensions', () => {
      expect(FileValidationService.getMimeTypeFromExtension('.pdf')).toBe('application/pdf')
      expect(FileValidationService.getMimeTypeFromExtension('.epub')).toBe('application/epub+zip')
      expect(FileValidationService.getMimeTypeFromExtension('.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      expect(FileValidationService.getMimeTypeFromExtension('.txt')).toBe('text/plain')
    })

    it('should return null for unsupported extensions', () => {
      expect(FileValidationService.getMimeTypeFromExtension('.jpg')).toBeNull()
      expect(FileValidationService.getMimeTypeFromExtension('.unknown')).toBeNull()
    })
  })
})