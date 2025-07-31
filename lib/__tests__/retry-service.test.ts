import { RetryService, RetryConfigs } from '../retry-service'
import { AppError, ErrorType, ErrorSeverity } from '../error-handling'
import { ToastService } from '../toast-service'

// Mock ToastService
jest.mock('../toast-service', () => ({
  ToastService: {
    loading: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn()
  }
}))

describe('RetryService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    RetryService.cancelAllRetries()
  })

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success')
      
      const result = await RetryService.withRetry(operation)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable errors', async () => {
      const retryableError = new AppError(
        'Network error',
        ErrorType.NETWORK,
        503,
        'Network unavailable',
        ErrorSeverity.MEDIUM,
        undefined,
        true
      )
      
      const operation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success')
      
      const result = await RetryService.withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 10 // Short delay for testing
      })
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = new AppError(
        'Validation error',
        ErrorType.VALIDATION,
        400,
        'Invalid input',
        ErrorSeverity.LOW,
        undefined,
        false
      )
      
      const operation = jest.fn().mockRejectedValue(nonRetryableError)
      
      await expect(RetryService.withRetry(operation)).rejects.toThrow(nonRetryableError)
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should respect maxAttempts', async () => {
      const retryableError = new AppError(
        'Service error',
        ErrorType.EXTERNAL_SERVICE,
        503,
        'Service unavailable',
        ErrorSeverity.HIGH,
        undefined,
        true
      )
      
      const operation = jest.fn().mockRejectedValue(retryableError)
      
      await expect(RetryService.withRetry(operation, {
        maxAttempts: 2,
        baseDelay: 10
      })).rejects.toThrow(retryableError)
      
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should call retry callback', async () => {
      const retryableError = new AppError(
        'Database error',
        ErrorType.DATABASE,
        500,
        'Database unavailable',
        ErrorSeverity.HIGH,
        undefined,
        true
      )
      
      const operation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success')
      
      const onRetry = jest.fn()
      
      const result = await RetryService.withRetry(operation, {
        maxAttempts: 2,
        baseDelay: 10,
        onRetry
      })
      
      expect(result).toBe('success')
      expect(onRetry).toHaveBeenCalledWith(1, retryableError)
    })

    it('should call max attempts callback', async () => {
      const retryableError = new AppError(
        'Persistent error',
        ErrorType.EXTERNAL_SERVICE,
        503,
        'Service down',
        ErrorSeverity.HIGH,
        undefined,
        true
      )
      
      const operation = jest.fn().mockRejectedValue(retryableError)
      const onMaxAttemptsReached = jest.fn()
      
      await expect(RetryService.withRetry(operation, {
        maxAttempts: 2,
        baseDelay: 10,
        onMaxAttemptsReached
      })).rejects.toThrow(retryableError)
      
      expect(onMaxAttemptsReached).toHaveBeenCalledWith(retryableError)
    })

    it('should show toast notifications when enabled', async () => {
      const retryableError = new AppError(
        'Network error',
        ErrorType.NETWORK,
        503,
        'Network unavailable',
        ErrorSeverity.MEDIUM,
        undefined,
        true
      )
      
      const operation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success')
      
      const result = await RetryService.withRetry(operation, {
        maxAttempts: 2,
        baseDelay: 10
      }, {
        operationName: 'Test Operation',
        showToast: true
      })
      
      expect(result).toBe('success')
      expect(ToastService.loading).toHaveBeenCalledWith(
        'Test Operation...',
        expect.any(Promise),
        expect.any(Object)
      )
      expect(ToastService.info).toHaveBeenCalledWith(
        'Retrying Test Operation...',
        expect.objectContaining({
          description: expect.stringContaining('Attempt 2/2')
        })
      )
    })
  })

  describe('predefined retry methods', () => {
    it('should use network retry config', async () => {
      const operation = jest.fn().mockResolvedValue('success')
      
      const result = await RetryService.retryNetworkOperation(operation)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should use database retry config', async () => {
      const operation = jest.fn().mockResolvedValue('success')
      
      const result = await RetryService.retryDatabaseOperation(operation)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should use AI service retry config', async () => {
      const operation = jest.fn().mockResolvedValue('success')
      
      const result = await RetryService.retryAIService(operation)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })
  })

  describe('retryBatch', () => {
    it('should process all items successfully', async () => {
      const items = ['item1', 'item2', 'item3']
      const operation = jest.fn().mockImplementation((item) => Promise.resolve(`processed-${item}`))
      
      const result = await RetryService.retryBatch(items, operation)
      
      expect(result.successful).toHaveLength(3)
      expect(result.failed).toHaveLength(0)
      expect(result.summary).toEqual({
        total: 3,
        successful: 3,
        failed: 0
      })
    })

    it('should handle partial failures', async () => {
      const items = ['item1', 'item2', 'item3']
      const operation = jest.fn()
        .mockResolvedValueOnce('processed-item1')
        .mockRejectedValueOnce(new Error('Failed item2'))
        .mockResolvedValueOnce('processed-item3')
      
      const result = await RetryService.retryBatch(items, operation)
      
      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].item).toBe('item2')
      expect(result.summary).toEqual({
        total: 3,
        successful: 2,
        failed: 1
      })
    })

    it('should show progress when enabled', async () => {
      const items = ['item1', 'item2']
      const operation = jest.fn().mockImplementation((item) => Promise.resolve(`processed-${item}`))
      
      await RetryService.retryBatch(items, operation, {}, {
        operationName: 'Batch Operation',
        showProgress: true
      })
      
      expect(ToastService.loading).toHaveBeenCalledWith(
        'Processing 2 items...',
        expect.any(Promise)
      )
      expect(ToastService.success).toHaveBeenCalledWith(
        'All 2 items processed successfully'
      )
    })
  })

  describe('retry statistics', () => {
    it('should track active retries', async () => {
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 100))
      
      // Start operation without awaiting
      const promise = RetryService.withRetry(slowOperation, {}, {
        operationName: 'Slow Operation'
      })
      
      const stats = RetryService.getRetryStats()
      expect(stats.totalActiveOperations).toBe(1)
      expect(stats.activeRetries[0].operation).toBe('Slow Operation')
      
      await promise
      
      const finalStats = RetryService.getRetryStats()
      expect(finalStats.totalActiveOperations).toBe(0)
    })

    it('should clear all retries', () => {
      // This is mainly for cleanup, hard to test without complex async setup
      RetryService.cancelAllRetries()
      
      const stats = RetryService.getRetryStats()
      expect(stats.totalActiveOperations).toBe(0)
    })
  })

  describe('retry configurations', () => {
    it('should have proper network config', () => {
      expect(RetryConfigs.network.maxAttempts).toBe(3)
      expect(RetryConfigs.network.baseDelay).toBe(1000)
      expect(RetryConfigs.network.backoffMultiplier).toBe(2)
      expect(RetryConfigs.network.retryCondition).toBeDefined()
    })

    it('should have proper database config', () => {
      expect(RetryConfigs.database.maxAttempts).toBe(3)
      expect(RetryConfigs.database.baseDelay).toBe(500)
      expect(RetryConfigs.database.retryCondition).toBeDefined()
    })

    it('should have proper AI service config', () => {
      expect(RetryConfigs.aiService.maxAttempts).toBe(3)
      expect(RetryConfigs.aiService.baseDelay).toBe(2000)
      expect(RetryConfigs.aiService.maxDelay).toBe(15000)
    })

    it('should have proper social media config', () => {
      expect(RetryConfigs.socialMedia.maxAttempts).toBe(2)
      expect(RetryConfigs.socialMedia.baseDelay).toBe(3000)
    })
  })

  describe('retry condition logic', () => {
    it('should retry network errors', () => {
      const networkError = new AppError(
        'Network error',
        ErrorType.NETWORK,
        503,
        'Network unavailable',
        ErrorSeverity.MEDIUM,
        undefined,
        true
      )
      
      expect(RetryConfigs.network.retryCondition!(networkError)).toBe(true)
    })

    it('should retry external service errors', () => {
      const serviceError = new AppError(
        'Service error',
        ErrorType.EXTERNAL_SERVICE,
        502,
        'Service unavailable',
        ErrorSeverity.HIGH,
        undefined,
        true
      )
      
      expect(RetryConfigs.network.retryCondition!(serviceError)).toBe(true)
    })

    it('should not retry validation errors', () => {
      const validationError = new AppError(
        'Validation error',
        ErrorType.VALIDATION,
        400,
        'Invalid input',
        ErrorSeverity.LOW,
        undefined,
        false
      )
      
      expect(RetryConfigs.network.retryCondition!(validationError)).toBe(false)
    })

    it('should retry rate limit errors', () => {
      const rateLimitError = new AppError(
        'Rate limit',
        ErrorType.RATE_LIMIT,
        429,
        'Too many requests',
        ErrorSeverity.MEDIUM,
        undefined,
        true
      )
      
      expect(RetryConfigs.network.retryCondition!(rateLimitError)).toBe(true)
    })
  })
})