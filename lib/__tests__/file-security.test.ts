import { FileSecurityService } from '../file-security'
import { TextDecoder } from 'util'
import { webcrypto } from 'crypto'

// Polyfills for Node.js test environment
global.TextDecoder = global.TextDecoder || TextDecoder
global.crypto = global.crypto || webcrypto

// Mock file for testing
interface MockFile extends File {
  arrayBuffer(): Promise<ArrayBuffer>
}

const createMockFile = (name: string, content: string, type: string): MockFile => {
  const blob = new Blob([content], { type })
  const file = new File([blob], name, { type }) as MockFile
  
  // Add arrayBuffer method for testing
  file.arrayBuffer = async () => {
    const buffer = new ArrayBuffer(content.length)
    const view = new Uint8Array(buffer)
    for (let i = 0; i < content.length; i++) {
      view[i] = content.charCodeAt(i)
    }
    return buffer
  }
  
  return file
}

describe('FileSecurityService', () => {
  describe('performSecurityScan', () => {
    it('should pass security scan for clean PDF file', async () => {
      const cleanPdfContent = '%PDF-1.4\nClean PDF content\n%%EOF'
      const file = createMockFile('test.pdf', cleanPdfContent, 'application/pdf')
      
      const result = await FileSecurityService.performSecurityScan(file, {
        enableHashValidation: false // Disable hash validation for testing
      })
      
      expect(result.passed).toBe(true)
      expect(result.threats).toHaveLength(0)
      expect(result.scanId).toBeDefined()
    })

    it('should fail security scan for file with JavaScript', async () => {
      const maliciousContent = '<script>alert("xss")</script>'
      const file = createMockFile('malicious.txt', maliciousContent, 'text/plain')
      
      const result = await FileSecurityService.performSecurityScan(file, {
        enableHashValidation: false
      })
      
      expect(result.passed).toBe(false)
      expect(result.threats).toContain('Embedded JavaScript')
      expect(result.quarantined).toBe(true)
    })

    it('should fail security scan for file with suspicious patterns', async () => {
      const suspiciousContent = 'javascript:void(0) eval(malicious_code)'
      const file = createMockFile('suspicious.txt', suspiciousContent, 'text/plain')
      
      const result = await FileSecurityService.performSecurityScan(file, {
        enableHashValidation: false
      })
      
      expect(result.passed).toBe(false)
      expect(result.threats).toContain('JavaScript protocol')
      expect(result.threats).toContain('Code evaluation')
    })

    it('should fail security scan for executable file', async () => {
      const executableContent = 'MZ\x90\x00' // PE header
      const file = createMockFile('malware.exe', executableContent, 'application/octet-stream')
      
      const result = await FileSecurityService.performSecurityScan(file, {
        enableHashValidation: false
      })
      
      expect(result.passed).toBe(false)
      expect(result.threats).toContain('Windows executable')
    })

    it('should fail security scan for EICAR test virus', async () => {
      const eicarContent = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      const file = createMockFile('eicar.txt', eicarContent, 'text/plain')
      
      const result = await FileSecurityService.performSecurityScan(file, {
        enableHashValidation: false
      })
      
      expect(result.passed).toBe(false)
      expect(result.threats).toContain('EICAR signature')
    })

    it('should fail security scan for file too large', async () => {
      const largeContent = 'a'.repeat(100 * 1024 * 1024) // 100MB
      const file = createMockFile('large.txt', largeContent, 'text/plain')
      
      const result = await FileSecurityService.performSecurityScan(file, {
        maxScanSize: 50 * 1024 * 1024 // 50MB limit
      })
      
      expect(result.passed).toBe(false)
      expect(result.threats).toContain('File too large for security scanning')
    })

    it('should detect suspicious filename patterns', async () => {
      const cleanContent = 'Clean content'
      const file = createMockFile('document.pdf.exe', cleanContent, 'text/plain')
      
      const result = await FileSecurityService.performSecurityScan(file, {
        enableHashValidation: false // Disable hash validation for testing
      })
      
      expect(result.passed).toBe(false)
      expect(result.threats).toContain('Suspicious filename pattern')
    })

    it('should detect MIME type spoofing', async () => {
      const cleanContent = 'Clean content'
      const file = createMockFile('document.pdf', cleanContent, 'text/plain')
      
      const result = await FileSecurityService.performSecurityScan(file, {
        enableHashValidation: false
      })
      
      expect(result.passed).toBe(false)
      expect(result.threats).toContain('MIME type spoofing detected')
    })
  })

  describe('quarantineFile', () => {
    it('should quarantine a file with threats', async () => {
      const maliciousContent = '<script>alert("xss")</script>'
      const file = createMockFile('malicious.txt', maliciousContent, 'text/plain')
      
      const scanResult = {
        passed: false,
        threats: ['Embedded JavaScript'],
        quarantined: true,
        scanId: 'test-scan-id'
      }

      // Should not throw
      await expect(FileSecurityService.quarantineFile(file, scanResult)).resolves.toBeUndefined()
    })
  })

  describe('generateSecurityReport', () => {
    it('should generate security report for passed scan', () => {
      const scanResult = {
        passed: true,
        threats: [],
        quarantined: false,
        scanId: 'test-scan-id'
      }

      const report = FileSecurityService.generateSecurityReport(scanResult, 'test.pdf')
      const parsedReport = JSON.parse(report)

      expect(parsedReport.filename).toBe('test.pdf')
      expect(parsedReport.status).toBe('PASSED')
      expect(parsedReport.threats).toHaveLength(0)
      expect(parsedReport.quarantined).toBe(false)
    })

    it('should generate security report for failed scan', () => {
      const scanResult = {
        passed: false,
        threats: ['Embedded JavaScript', 'Code evaluation'],
        quarantined: true,
        scanId: 'test-scan-id'
      }

      const report = FileSecurityService.generateSecurityReport(scanResult, 'malicious.txt')
      const parsedReport = JSON.parse(report)

      expect(parsedReport.filename).toBe('malicious.txt')
      expect(parsedReport.status).toBe('FAILED')
      expect(parsedReport.threats).toHaveLength(2)
      expect(parsedReport.quarantined).toBe(true)
    })
  })
})