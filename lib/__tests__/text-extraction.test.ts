import { TextExtractionService } from '../text-extraction'

describe('TextExtractionService', () => {
  describe('isValidFileFormat', () => {
    it('should return true for supported MIME types', () => {
      expect(TextExtractionService.isValidFileFormat('application/pdf')).toBe(true)
      expect(TextExtractionService.isValidFileFormat('application/epub+zip')).toBe(true)
      expect(TextExtractionService.isValidFileFormat('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
      expect(TextExtractionService.isValidFileFormat('text/plain')).toBe(true)
    })

    it('should return false for unsupported MIME types', () => {
      expect(TextExtractionService.isValidFileFormat('image/jpeg')).toBe(false)
      expect(TextExtractionService.isValidFileFormat('application/json')).toBe(false)
      expect(TextExtractionService.isValidFileFormat('video/mp4')).toBe(false)
    })
  })

  describe('getFileExtension', () => {
    it('should return correct extensions for MIME types', () => {
      expect(TextExtractionService.getFileExtension('application/pdf')).toBe('.pdf')
      expect(TextExtractionService.getFileExtension('application/epub+zip')).toBe('.epub')
      expect(TextExtractionService.getFileExtension('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('.docx')
      expect(TextExtractionService.getFileExtension('text/plain')).toBe('.txt')
    })

    it('should return empty string for unknown MIME types', () => {
      expect(TextExtractionService.getFileExtension('unknown/type')).toBe('')
    })
  })

  describe('extractFromTXT', () => {
    it('should extract text from plain text buffer', async () => {
      const testText = 'This is a test document with some content.'
      const buffer = Buffer.from(testText, 'utf-8')
      
      const result = await TextExtractionService.extractText(buffer, 'text/plain', 'test.txt')
      
      expect(result.text).toBe(testText)
      expect(result.metadata?.wordCount).toBe(8)
    })
  })

  describe('extractText', () => {
    it('should throw error for unsupported MIME type', async () => {
      const buffer = Buffer.from('test content')
      
      await expect(
        TextExtractionService.extractText(buffer, 'unsupported/type', 'test.unknown')
      ).rejects.toThrow('Unsupported file format: unsupported/type')
    })
  })
})