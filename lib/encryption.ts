import * as crypto from 'crypto'

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-cbc'
  private static readonly IV_LENGTH = 16
  private static readonly TAG_LENGTH = 16

  /**
   * Get encryption key from environment or generate one
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required')
    }
    
    // If key is hex-encoded, decode it
    if (key.length === 64) {
      return Buffer.from(key, 'hex')
    }
    
    // Otherwise, hash the key to get consistent 32-byte key
    return crypto.createHash('sha256').update(key).digest()
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(plaintext: string): string {
    try {
      const key = this.getEncryptionKey()
      const iv = crypto.randomBytes(this.IV_LENGTH)
      
      // Use createCipheriv with explicit IV for CBC mode
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      // Combine IV and encrypted data
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')])
      return combined.toString('base64')
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey()
      const combined = Buffer.from(encryptedData, 'base64')
      
      // Extract IV and encrypted data
      const iv = combined.subarray(0, this.IV_LENGTH)
      const encrypted = combined.subarray(this.IV_LENGTH)
      
      // Use createDecipheriv with explicit IV for CBC mode
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  static hash(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512')
    return `${actualSalt}:${hash.toString('hex')}`
  }

  /**
   * Verify hashed data
   */
  static verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, hash] = hashedData.split(':')
      const newHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512')
      return hash === newHash.toString('hex')
    } catch (error) {
      console.error('Hash verification error:', error)
      return false
    }
  }

  /**
   * Generate secure random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Encrypt social media tokens
   */
  static encryptSocialToken(token: string): string {
    return this.encrypt(token)
  }

  /**
   * Decrypt social media tokens
   */
  static decryptSocialToken(encryptedToken: string): string {
    return this.decrypt(encryptedToken)
  }

  /**
   * Encrypt user data for GDPR compliance
   */
  static encryptUserData(userData: Record<string, unknown>): string {
    const jsonData = JSON.stringify(userData)
    return this.encrypt(jsonData)
  }

  /**
   * Decrypt user data
   */
  static decryptUserData(encryptedData: string): Record<string, unknown> {
    const jsonData = this.decrypt(encryptedData)
    return JSON.parse(jsonData) as Record<string, unknown>
  }

  /**
   * Create secure session token
   */
  static createSessionToken(): { token: string; hash: string } {
    const token = this.generateToken(32)
    const hash = this.hash(token)
    return { token, hash }
  }

  /**
   * Verify session token
   */
  static verifySessionToken(token: string, hash: string): boolean {
    return this.verifyHash(token, hash)
  }
}

/**
 * Database field encryption helpers
 */
export class DatabaseEncryption {
  /**
   * Encrypt field before storing in database
   */
  static encryptField(value: string | null): string | null {
    if (!value) return null
    return EncryptionService.encrypt(value)
  }

  /**
   * Decrypt field after retrieving from database
   */
  static decryptField(encryptedValue: string | null): string | null {
    if (!encryptedValue) return null
    try {
      return EncryptionService.decrypt(encryptedValue)
    } catch (error) {
      console.error('Failed to decrypt database field:', error)
      return null
    }
  }

  /**
   * Encrypt multiple fields
   */
  static encryptFields(data: Record<string, unknown>, fieldsToEncrypt: string[]): Record<string, unknown> {
    const result = { ...data }
    
    for (const field of fieldsToEncrypt) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = this.encryptField(result[field] as string)
      }
    }
    
    return result
  }

  /**
   * Decrypt multiple fields
   */
  static decryptFields(data: Record<string, unknown>, fieldsToDecrypt: string[]): Record<string, unknown> {
    const result = { ...data }
    
    for (const field of fieldsToDecrypt) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = this.decryptField(result[field] as string)
      }
    }
    
    return result
  }
}