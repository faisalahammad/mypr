/**
 * Schema validation tests for sync API responses
 */

describe('Sync API Response Schemas', () => {
  describe('POST /api/sync-prs success response', () => {
    it('should have correct structure', () => {
      const successResponse = {
        success: true,
        synced: 5,
        message: 'Successfully synced 5 pull requests',
        prs: expect.any(Array)
      }

      expect(successResponse).toMatchObject({
        success: expect.any(Boolean),
        synced: expect.any(Number),
        message: expect.any(String)
      })
    })

    it('should handle zero synced PRs', () => {
      const response = {
        success: true,
        synced: 0,
        message: 'No active repositories found',
        prs: []
      }

      expect(response.synced).toBe(0)
      expect(response.prs).toEqual([])
    })
  })

  describe('POST /api/sync-prs error response', () => {
    it('should have correct error structure', () => {
      const errorResponse = {
        error: 'Unauthorized',
        message: 'You must be logged in to sync PRs'
      }

      expect(errorResponse).toMatchObject({
        error: expect.any(String),
        message: expect.any(String)
      })
    })

    it('should handle missing token error', () => {
      const errorResponse = {
        error: 'No GitHub token',
        message: 'GitHub access token not found'
      }

      expect(errorResponse.error).toBeTruthy()
      expect(errorResponse.message).toContain('token')
    })
  })

  describe('GET /api/sync-prs status response', () => {
    it('should have correct structure', () => {
      const statusResponse = {
        last_synced: '2024-01-15T10:30:00Z',
        total_prs: 25
      }

      expect(statusResponse).toHaveProperty('last_synced')
      expect(statusResponse).toHaveProperty('total_prs')
      expect(typeof statusResponse.total_prs).toBe('number')
    })

    it('should handle no sync history', () => {
      const statusResponse = {
        last_synced: null,
        total_prs: 0
      }

      expect(statusResponse.last_synced).toBeNull()
      expect(statusResponse.total_prs).toBe(0)
    })

    it('should handle valid sync history', () => {
      const statusResponse = {
        last_synced: '2024-01-15T10:30:00Z',
        total_prs: 25
      }

      expect(statusResponse.last_synced).toBeTruthy()
      expect(statusResponse.total_prs).toBeGreaterThan(0)
    })
  })
})
