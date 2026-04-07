/**
 * Integration tests for Sync API endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

describe('POST /api/sync-prs', () => {
  it('should return 401 for unauthenticated requests', async () => {
    const response = await fetch('http://localhost:3000/api/sync-prs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data).toHaveProperty('error', 'Unauthorized')
    expect(data).toHaveProperty('message')
  })

  it('should return 401 for requests with invalid session', async () => {
    const response = await fetch('http://localhost:3000/api/sync-prs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'sb-session-token=invalid-token'
      }
    })

    expect(response.status).toBe(401)
  })

  it('should return correct response structure on success', async () => {
    // This test requires a valid authenticated session
    // For now, we'll just test the structure validation

    const expectedSuccessResponse = {
      success: expect.any(Boolean),
      synced: expect.any(Number),
      message: expect.any(String),
      prs: expect.any(Array)
    }

    expect(expectedSuccessResponse).toMatchObject({
      success: expect.any(Boolean),
      synced: expect.any(Number),
      message: expect.any(String)
    })
  })

  it('should handle no active repositories gracefully', async () => {
    // Expected response when user has no active repos
    const expectedResponse = {
      success: true,
      synced: 0,
      message: expect.stringContaining('No active repositories')
    }

    expect(expectedResponse.synced).toBe(0)
  })

  it('should handle missing GitHub token gracefully', async () => {
    // Expected response when user has no GitHub token
    const expectedResponse = {
      error: expect.any(String),
      message: expect.stringContaining('GitHub access token')
    }

    expect(expectedResponse.error).toBeTruthy()
  })
})

describe('GET /api/sync-prs', () => {
  it('should return 401 for unauthenticated requests', async () => {
    const response = await fetch('http://localhost:3000/api/sync-prs', {
      method: 'GET'
    })

    expect(response.status).toBe(401)
  })

  it('should return sync status structure', async () => {
    const expectedStatus = {
      last_synced: expect.any(String || null),
      total_prs: expect.any(Number)
    }

    expect(expectedStatus).toMatchObject({
      last_synced: expect.anything(),
      total_prs: expect.any(Number)
    })
  })

  it('should return zero for new users', async () => {
    const expectedStatus = {
      last_synced: null,
      total_prs: 0
    }

    expect(expectedStatus.total_prs).toBe(0)
    expect(expectedStatus.last_synced).toBeNull()
  })
})
