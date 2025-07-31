import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Add TextEncoder and TextDecoder polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock scrollIntoView - only in browser environment
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = jest.fn()
}

// Mock fetch for OpenAI
global.fetch = jest.fn()

// Mock Headers for NextRequest
global.Headers = class Headers {
  constructor(init) {
    this._headers = {}
    if (init) {
      if (typeof init === 'object') {
        for (const [key, value] of Object.entries(init)) {
          this._headers[key.toLowerCase()] = value
        }
      }
    }
  }
  
  entries() {
    return Object.entries(this._headers)
  }
  
  get(name) {
    return this._headers[name.toLowerCase()] || null
  }
  
  set(name, value) {
    this._headers[name.toLowerCase()] = value
  }
  
  has(name) {
    return name.toLowerCase() in this._headers
  }
  
  delete(name) {
    delete this._headers[name.toLowerCase()]
  }
  
  append(name, value) {
    const key = name.toLowerCase()
    if (this._headers[key]) {
      this._headers[key] += ', ' + value
    } else {
      this._headers[key] = value
    }
  }
  
  forEach(callback) {
    for (const [key, value] of Object.entries(this._headers)) {
      callback(value, key)
    }
  }
  
  [Symbol.iterator]() {
    return this.entries()
  }
}

// Mock Request for NextRequest
global.Request = class Request {
  constructor(url, options = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Headers(options.headers)
    this._body = options.body
  }
  
  async json() {
    if (this._body) {
      return JSON.parse(this._body)
    }
    return {}
  }
  
  async text() {
    return this._body || ''
  }
  
  clone() {
    return new Request(this.url, {
      method: this.method,
      headers: this.headers,
      body: this._body
    })
  }
}

// Mock Request for Next.js
global.Request = class MockRequest {
  constructor(input, init) {
    Object.assign(this, { input, ...init })
  }
}

// Mock Headers
global.Headers = class MockHeaders extends Map {
  constructor(init) {
    super()
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.set(key, value))
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.set(key, value))
      }
    }
  }
  
  get(key) {
    return super.get(key.toLowerCase())
  }
  
  set(key, value) {
    return super.set(key.toLowerCase(), value)
  }
  
  has(key) {
    return super.has(key.toLowerCase())
  }
  
  delete(key) {
    return super.delete(key.toLowerCase())
  }
}

// Mock Response for Next.js
global.Response = class MockResponse {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.headers = new Map(Object.entries(init?.headers || {}))
    this.ok = this.status >= 200 && this.status < 300
  }
  
  static json(object, init) {
    return new MockResponse(JSON.stringify(object), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers || {})
      }
    })
  }
  
  async json() {
    return JSON.parse(this.body)
  }
  
  async text() {
    return this.body
  }
}