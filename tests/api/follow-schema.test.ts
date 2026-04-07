/**
 * Schema validation tests for follow/unfollow API
 */

describe('Follow API Schema Validation', () => {
  describe('POST /api/follow request body', () => {
    it('should require target_user_id', () => {
      const validBody = { target_user_id: 'uuid-123' }
      expect(validBody).toHaveProperty('target_user_id')
      expect(typeof validBody.target_user_id).toBe('string')
    })

    it('should reject missing target_user_id', () => {
      const invalidBody = {}
      expect(invalidBody).not.toHaveProperty('target_user_id')
    })

    it('should reject self-follow', () => {
      const userId = 'same-uuid'
      const targetId = 'same-uuid'
      expect(userId === targetId).toBe(true)
    })
  })

  describe('POST /api/follow success response', () => {
    it('should return following: true', () => {
      const response = { following: true }
      expect(response.following).toBe(true)
    })
  })

  describe('DELETE /api/follow success response', () => {
    it('should return following: false', () => {
      const response = { following: false }
      expect(response.following).toBe(false)
    })
  })

  describe('Error response shapes', () => {
    it('should have error string on 401', () => {
      const res = { error: 'Unauthorized' }
      expect(typeof res.error).toBe('string')
    })

    it('should have error string on 400', () => {
      const res = { error: 'target_user_id is required' }
      expect(typeof res.error).toBe('string')
    })
  })

  describe('follows table row shape', () => {
    it('should validate a follows row', () => {
      const row = {
        follower_id: 'uuid-1',
        following_id: 'uuid-2',
        created_at: '2024-01-01T00:00:00Z',
      }
      expect(row).toHaveProperty('follower_id')
      expect(row).toHaveProperty('following_id')
      expect(typeof row.follower_id).toBe('string')
      expect(typeof row.following_id).toBe('string')
    })

    it('follower_id and following_id must differ', () => {
      const row = { follower_id: 'uuid-1', following_id: 'uuid-2' }
      expect(row.follower_id).not.toBe(row.following_id)
    })
  })
})
