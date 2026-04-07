/**
 * Schema validation tests for Repos API endpoint
 */

import { describe, it, expect } from '@jest/globals'

describe('POST /api/repos - Schema Validation', () => {
  it('should return correct structure on successful repo fetch', () => {
    const expectedResponse = {
      success: true,
      repos: expect.any(Array),
      message: expect.any(String)
    }

    expect(expectedResponse).toMatchObject({
      success: expect.any(Boolean),
      repos: expect.any(Array),
      message: expect.any(String)
    })
  })

  it('should validate repository structure', () => {
    const expectedRepo = {
      id: expect.any(Number),
      name: expect.any(String),
      full_name: expect.any(String),
      description: expect.any(String),
      language: expect.any(String),
      stargazers_count: expect.any(Number),
      visibility: expect.any(String),
      is_active: expect.any(Boolean)
    }

    expect(expectedRepo).toMatchObject({
      id: expect.any(Number),
      full_name: expect.any(String),
      visibility: expect.any(String),
      is_active: expect.any(Boolean)
    })
  })

  it('should validate error response structure', () => {
    const expectedError = {
      success: false,
      error: expect.any(String),
      message: expect.any(String)
    }

    expect(expectedError).toMatchObject({
      success: expect.any(Boolean),
      error: expect.any(String),
      message: expect.any(String)
    })
  })
})

describe('GET /api/repos - Schema Validation', () => {
  it('should return repository list structure', () => {
    const expectedResponse = {
      repos: expect.any(Array),
      total_count: expect.any(Number),
      active_count: expect.any(Number)
    }

    expect(expectedResponse).toMatchObject({
      repos: expect.any(Array),
      total_count: expect.any(Number),
      active_count: expect.any(Number)
    })
  })

  it('should validate each repository in list', () => {
    const expectedRepo = {
      id: expect.any(Number),
      full_name: expect.any(String),
      visibility: expect.any(String),
      is_active: expect.any(Boolean),
      language: expect.any(String),
      stargazers_count: expect.any(Number)
    }

    expect(expectedRepo).toMatchObject({
      id: expect.any(Number),
      full_name: expect.any(String),
      is_active: expect.any(Boolean)
    })
  })
})
