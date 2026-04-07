// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Mock Next.js Request and Response for API route tests
global.Request = class MockRequest {
  constructor(url) {
    this.url = url
    this.headers = new Headers()
  }
}

global.Response = class MockResponse {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.headers = init.headers || new Headers()
  }

  static json(data, init = {}) {
    return new MockResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
  }

  async json() {
    return JSON.parse(this.body)
  }
}

global.Headers = class MockHeaders {
  constructor(init = []) {
    this.headers = new Map(init)
  }

  append(name, value) {
    this.headers.set(name, value)
  }

  get(name) {
    return this.headers.get(name)
  }

  set(name, value) {
    this.headers.set(name, value)
  }

  delete(name) {
    this.headers.delete(name)
  }

  has(name) {
    return this.headers.has(name)
  }

  entries() {
    return this.headers.entries()
  }

  forEach(callback) {
    this.headers.forEach((value, name) => callback(value, name, this))
  }
}
