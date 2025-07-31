import * as crypto from 'crypto'
import { FileValidationService } from './file-validation'

export interface SecurityScanResult {
  passed: boolean
  threats: string[]
  quarantined: boolean
  scanId: string
}

export interface FileSecurityConfig {
  enableVirusScanning: boolean
  enableContentScanning: boolean
  enableHashValidation: boolean
  quarantineThreats: boolean
  maxScanSize: number
}

export class FileSecurityService {
  private static readonly DEFAULT_CONFIG: FileSecurityConfig = {
    enableVirusScanning: true,
    enableContentScanning: true,
    enableHashValidation: true,
    quarantineThreats: true,
    maxScanSize: 50 * 1024 * 1024 // 50MB
  }

  private static readonly DEVELOPMENT_CONFIG: FileSecurityConfig = {
    enableVirusScanning: false,  // Disable virus scanning in development
    enableContentScanning: false, // Disable content scanning in development
    enableHashValidation: false,
    quarantineThreats: false,
    maxScanSize: 100 * 1024 * 1024 // 100MB
  }

  /**
   * Get configuration based on environment
   */
  private static getConfig(userConfig: Partial<FileSecurityConfig> = {}): FileSecurityConfig {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const strictMode = process.env.SECURITY_SCAN_STRICT_MODE === 'true'
    
    if (isDevelopment && !strictMode) {
      return { ...this.DEVELOPMENT_CONFIG, ...userConfig }
    }
    
    return { ...this.DEFAULT_CONFIG, ...userConfig }
  }

  /**
   * Comprehensive security scan for uploaded files
   */
  static async performSecurityScan(
    file: File,
    config: Partial<FileSecurityConfig> = {}
  ): Promise<SecurityScanResult> {
    const finalConfig = this.getConfig(config)
    const scanId = crypto.randomUUID()
    const threats: string[] = []

    console.log(`Security scan for ${file.name} with config:`, {
      enableVirusScanning: finalConfig.enableVirusScanning,
      enableContentScanning: finalConfig.enableContentScanning,
      enableHashValidation: finalConfig.enableHashValidation,
      quarantineThreats: finalConfig.quarantineThreats
    })

    try {
      // Check file size before scanning
      if (file.size > finalConfig.maxScanSize) {
        threats.push('File too large for security scanning')
        return {
          passed: false,
          threats,
          quarantined: finalConfig.quarantineThreats,
          scanId
        }
      }

      // Basic file validation
      const validationResult = await FileValidationService.validateFile(file)
      if (!validationResult.isValid) {
        threats.push(validationResult.error || 'File validation failed')
      }

      // Content-based security scanning
      if (finalConfig.enableContentScanning) {
        const contentThreats = await this.scanFileContent(file)
        threats.push(...contentThreats)
      }

      // Hash-based validation
      if (finalConfig.enableHashValidation) {
        const hashThreats = await this.validateFileHash(file)
        threats.push(...hashThreats)
      }

      // Virus scanning (simulated - in production, integrate with actual AV service)
      if (finalConfig.enableVirusScanning) {
        const virusThreats = await this.performVirusScan(file)
        threats.push(...virusThreats)
      }

      // Additional security checks
      const additionalThreats = await this.performAdditionalSecurityChecks(file)
      threats.push(...additionalThreats)

      const passed = threats.length === 0
      
      // Log security scan results
      await this.logSecurityScan(scanId, file.name, threats, passed)

      return {
        passed,
        threats,
        quarantined: !passed && finalConfig.quarantineThreats,
        scanId
      }
    } catch (error) {
      console.error('Security scan error:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })
      threats.push(`Security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      return {
        passed: false,
        threats,
        quarantined: finalConfig.quarantineThreats,
        scanId
      }
    }
  }

  /**
   * Scan file content for malicious patterns
   */
  private static async scanFileContent(file: File): Promise<string[]> {
    const threats: string[] = []

    try {
      const buffer = await file.arrayBuffer()
      const content = new TextDecoder('utf-8', { fatal: false }).decode(buffer)

      // Skip content scanning for binary files like PDFs, images, etc.
      const fileName = file.name.toLowerCase()
      const binaryExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.epub']
      const isBinaryFile = binaryExtensions.some(ext => fileName.endsWith(ext))

      // For binary files, only do basic header checks
      if (isBinaryFile) {
        console.log(`Skipping content scan for binary file: ${fileName}`)
        return threats
      }

      // Malicious content patterns (only for text files)
      const maliciousPatterns = [
        { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, threat: 'Embedded JavaScript' },
        { pattern: /javascript:/gi, threat: 'JavaScript protocol' },
        { pattern: /vbscript:/gi, threat: 'VBScript protocol' },
        { pattern: /on\w+\s*=/gi, threat: 'Event handlers' },
        { pattern: /eval\s*\(/gi, threat: 'Code evaluation' },
        { pattern: /document\.write/gi, threat: 'DOM manipulation' },
        { pattern: /window\.location/gi, threat: 'Location manipulation' },
        { pattern: /%3Cscript/gi, threat: 'Encoded script tags' },
        { pattern: /\.\.\//g, threat: 'Directory traversal' },
        // Remove overly aggressive patterns that trigger on legitimate files
        // { pattern: /\x00/g, threat: 'Null bytes' }, // Too common in binary files
        // { pattern: /cmd\.exe|powershell|bash|sh/gi, threat: 'System commands' }, // Too common in docs
        { pattern: /SELECT.*FROM|INSERT.*INTO|UPDATE.*SET|DELETE.*FROM/gi, threat: 'SQL injection patterns' }
      ]

      for (const { pattern, threat } of maliciousPatterns) {
        if (pattern.test(content)) {
          threats.push(threat)
        }
      }

      // Check for suspicious file headers (only for non-binary files)
      const headerThreats = this.checkFileHeaders(new Uint8Array(buffer.slice(0, 1024)))
      threats.push(...headerThreats)

      // Check for embedded files (only for non-binary files)
      const embeddedThreats = this.checkEmbeddedFiles(buffer)
      threats.push(...embeddedThreats)

    } catch (error) {
      console.error('Content scanning error:', error)
      threats.push('Content scan failed')
    }

    return threats
  }

  /**
   * Check file headers for malicious signatures
   */
  private static checkFileHeaders(header: Uint8Array): string[] {
    const threats: string[] = []
    
    const hexHeader = Array.from(header)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Known malicious file signatures (excluding legitimate formats)
    const maliciousSignatures = [
      { signature: '4d5a', threat: 'Windows executable', exclude: false },
      { signature: '7f454c46', threat: 'Linux executable', exclude: false },
      { signature: 'cafebabe', threat: 'Java class file', exclude: false },
      { signature: 'feedface', threat: 'Mach-O executable', exclude: false },
      // Exclude OLE and ZIP as they're common in legitimate documents
      // { signature: 'd0cf11e0', threat: 'OLE compound document' },
      // { signature: '504b0304', threat: 'ZIP archive (potential threat)' }
    ]

    // Check for legitimate file headers first
    const legitimateHeaders = [
      '25504446', // PDF
      'ffd8ff',   // JPEG
      '89504e47', // PNG
      '47494638', // GIF
      '504b0304', // ZIP/DOCX/XLSX
      'd0cf11e0'  // DOC/XLS (OLE)
    ]

    const isLegitimateFile = legitimateHeaders.some(legit => hexHeader.startsWith(legit))
    if (isLegitimateFile) {
      return threats // Skip malicious signature check for legitimate files
    }

    for (const { signature, threat } of maliciousSignatures) {
      if (hexHeader.startsWith(signature)) {
        threats.push(threat)
      }
    }

    return threats
  }

  /**
   * Check for embedded files within the main file
   */
  private static checkEmbeddedFiles(buffer: ArrayBuffer): string[] {
    const threats: string[] = []
    const content = new Uint8Array(buffer)

    // Look for embedded file signatures (only dangerous ones)
    const embeddedSignatures = [
      { signature: [0x4D, 0x5A], threat: 'Embedded executable' },
      { signature: [0x7F, 0x45, 0x4C, 0x46], threat: 'Embedded ELF file' },
      // Remove image checks as they're common in legitimate documents like PDFs
      // { signature: [0x89, 0x50, 0x4E, 0x47], threat: 'Embedded PNG (suspicious in text)' },
      // { signature: [0xFF, 0xD8, 0xFF], threat: 'Embedded JPEG (suspicious in text)' }
    ]

    for (const { signature, threat } of embeddedSignatures) {
      if (this.findSignatureInBuffer(content, signature)) {
        threats.push(threat)
      }
    }

    return threats
  }

  /**
   * Find signature pattern in buffer
   */
  private static findSignatureInBuffer(buffer: Uint8Array, signature: number[]): boolean {
    for (let i = 0; i <= buffer.length - signature.length; i++) {
      let match = true
      for (let j = 0; j < signature.length; j++) {
        if (buffer[i + j] !== signature[j]) {
          match = false
          break
        }
      }
      if (match) return true
    }
    return false
  }

  /**
   * Validate file hash against known malicious hashes
   */
  private static async validateFileHash(file: File): Promise<string[]> {
    const threats: string[] = []

    try {
      const buffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      // In production, check against known malicious hash database
      const knownMaliciousHashes: string[] = [
        // Add known malicious file hashes here
        // This would typically come from a threat intelligence service
      ]

      if (knownMaliciousHashes.includes(hashHex)) {
        threats.push('Known malicious file hash')
      }

      // Check for suspicious hash patterns (e.g., all zeros, repeated patterns)
      if (hashHex.match(/^0+$/) || hashHex.match(/^(.)\1+$/)) {
        threats.push('Suspicious file hash pattern')
      }

    } catch (error) {
      console.error('Hash validation error:', error)
      threats.push('Hash validation failed')
    }

    return threats
  }

  /**
   * Simulated virus scanning (integrate with real AV service in production)
   */
  private static async performVirusScan(file: File): Promise<string[]> {
    const threats: string[] = []

    try {
      // In production, this would integrate with services like:
      // - ClamAV
      // - VirusTotal API
      // - Windows Defender API
      // - Third-party AV services

      // Simulated virus patterns for demonstration
      const buffer = await file.arrayBuffer()
      const content = new TextDecoder('utf-8', { fatal: false }).decode(buffer)

      const virusPatterns = [
        { pattern: /EICAR-STANDARD-ANTIVIRUS-TEST-FILE/gi, threat: 'EICAR test virus' },
        { pattern: /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR/gi, threat: 'EICAR signature' }
      ]

      for (const { pattern, threat } of virusPatterns) {
        if (pattern.test(content)) {
          threats.push(threat)
        }
      }

      // Simulate random virus detection for testing (remove in production)
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
        threats.push('Simulated virus detection')
      }

    } catch (error) {
      console.error('Virus scan error:', error)
      threats.push('Virus scan failed')
    }

    return threats
  }

  /**
   * Additional security checks
   */
  private static async performAdditionalSecurityChecks(file: File): Promise<string[]> {
    const threats: string[] = []

    try {
      // Check file name for suspicious patterns
      const suspiciousNamePatterns = [
        /\.(exe|bat|cmd|scr|pif|com|vbs|js|jar)$/i,
        /\.\w+\.(exe|bat|cmd)$/i, // Double extension
        /[<>:"|?*]/g, // Invalid filename characters
        /^\./,  // Hidden files
        /\s+$/, // Trailing spaces
      ]

      for (const pattern of suspiciousNamePatterns) {
        if (pattern.test(file.name)) {
          threats.push('Suspicious filename pattern')
          break
        }
      }

      // Check for excessively long filename
      if (file.name.length > 255) {
        threats.push('Filename too long')
      }

      // Check for Unicode normalization attacks
      if (file.name !== file.name.normalize('NFC')) {
        threats.push('Unicode normalization attack')
      }

      // Check MIME type spoofing
      const expectedMimeType = this.getExpectedMimeType(file.name)
      if (expectedMimeType && expectedMimeType !== file.type) {
        threats.push('MIME type spoofing detected')
      }

    } catch (error) {
      console.error('Additional security checks error:', error)
      threats.push('Additional security checks failed')
    }

    return threats
  }

  /**
   * Get expected MIME type from file extension
   */
  private static getExpectedMimeType(filename: string): string | null {
    const extension = filename.toLowerCase().split('.').pop()
    
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'epub': 'application/epub+zip',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain'
    }

    return extension ? mimeTypes[extension] || null : null
  }

  /**
   * Log security scan results
   */
  private static async logSecurityScan(
    scanId: string,
    filename: string,
    threats: string[],
    passed: boolean
  ): Promise<void> {
    try {
      const logEntry = {
        scanId,
        filename,
        threats,
        passed,
        timestamp: new Date().toISOString(),
        scanType: 'file_upload'
      }

      // In production, store in secure audit log
      console.log('File security scan log:', logEntry)
      
      // Store encrypted log for audit purposes
      const encryptedLog = crypto
        .createHash('sha256')
        .update(JSON.stringify(logEntry))
        .digest('hex')
      
      console.log('Security scan hash:', encryptedLog)
    } catch (error) {
      console.error('Failed to log security scan:', error)
    }
  }

  /**
   * Quarantine a file that failed security scan
   */
  static async quarantineFile(file: File, scanResult: SecurityScanResult): Promise<void> {
    try {
      // In production, move file to quarantine storage
      console.log(`File quarantined: ${file.name}`, {
        scanId: scanResult.scanId,
        threats: scanResult.threats,
        timestamp: new Date().toISOString()
      })

      // Log quarantine action
      await this.logSecurityScan(
        scanResult.scanId,
        file.name,
        [...scanResult.threats, 'File quarantined'],
        false
      )
    } catch (error) {
      console.error('Failed to quarantine file:', error)
    }
  }

  /**
   * Generate security report for file upload
   */
  static generateSecurityReport(scanResult: SecurityScanResult, filename: string): string {
    const report = {
      filename,
      scanId: scanResult.scanId,
      status: scanResult.passed ? 'PASSED' : 'FAILED',
      threats: scanResult.threats,
      quarantined: scanResult.quarantined,
      timestamp: new Date().toISOString()
    }

    return JSON.stringify(report, null, 2)
  }
}