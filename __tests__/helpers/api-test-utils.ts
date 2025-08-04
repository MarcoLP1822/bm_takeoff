/**
 * Test utilities for API route testing
 */

// Mock NextRequest class for Jest environment
export class MockNextRequest {
  private bodyData: string | undefined
  private searchParamsData: URLSearchParams
  public url: string
  public method: string
  public headers: Record<string, string>

  constructor(url: string, options: {
    method?: string
    headers?: Record<string, string>
    body?: string
    searchParams?: Record<string, string>
  } = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = options.headers || {}
    this.bodyData = options.body
    
    // Handle search params
    const urlObj = new URL(url)
    if (options.searchParams) {
      Object.entries(options.searchParams).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value)
      })
    }
    this.searchParamsData = urlObj.searchParams
  }

  async json() {
    if (!this.bodyData) {
      throw new Error('No body data')
    }
    return JSON.parse(this.bodyData)
  }

  get nextUrl() {
    return {
      searchParams: this.searchParamsData
    }
  }
}

// Helper to create authenticated user mock
export const createAuthMock = (userId: string | null = 'test-user-123') => {
  return { userId }
}

// Helper to create request with JSON body
export const createJSONRequest = (
  url: string,
  body: Record<string, unknown>,
  options: {
    method?: string
    headers?: Record<string, string>
  } = {}
) => {
  return new MockNextRequest(url, {
    method: options.method || 'POST',
    headers: {
      'content-type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(body)
  })
}

// Helper to create GET request with search params
export const createGETRequest = (
  url: string,
  searchParams: Record<string, string> = {}
) => {
  return new MockNextRequest(url, {
    method: 'GET',
    searchParams
  })
}
