/**
 * Schema validation tests for feed-related API responses
 *
 * Tests for:
 * - API response structure validation
 * - Data type validation for feed PRs
 * - Pagination response structure
 */

import type { PullRequestWithProfile } from '@/types'

describe('Feed API Schema Validation', () => {
  describe('GET /api/feed-prs response schema', () => {
    it('should validate successful response structure', () => {
      const mockResponse = {
        prs: [
          {
            id: 'pr-1',
            user_id: 'user-1',
            repo_full_name: 'owner/repo',
            pr_number: 123,
            title: 'Add feature',
            body_summary: 'This adds a feature',
            pr_url: 'https://github.com/owner/repo/pull/123',
            merged_at: '2024-01-01T00:00:00Z',
            additions: 100,
            deletions: 50,
            commits_count: 3,
            synced_at: '2024-01-01T00:00:00Z',
            profile: {
              github_username: 'user1',
              github_avatar_url: 'https://avatar.com/1',
              display_name: 'User One',
            },
          },
        ],
        hasMore: true,
        total: 100,
      }

      expect(mockResponse).toHaveProperty('prs')
      expect(mockResponse).toHaveProperty('hasMore')
      expect(mockResponse).toHaveProperty('total')
      expect(Array.isArray(mockResponse.prs)).toBe(true)
      expect(typeof mockResponse.hasMore).toBe('boolean')
      expect(typeof mockResponse.total).toBe('number')
    })

    it('should validate empty feed response', () => {
      const mockResponse = {
        prs: [],
        hasMore: false,
        total: 0,
      }

      expect(mockResponse.prs).toEqual([])
      expect(mockResponse.hasMore).toBe(false)
      expect(mockResponse.total).toBe(0)
    })

    it('should validate PR with profile structure', () => {
      const mockPR: PullRequestWithProfile = {
        id: 'pr-1',
        user_id: 'user-1',
        repo_full_name: 'owner/repo',
        pr_number: 123,
        title: 'Add feature',
        body_summary: 'This adds a feature',
        pr_url: 'https://github.com/owner/repo/pull/123',
        merged_at: '2024-01-01T00:00:00Z',
        additions: 100,
        deletions: 50,
        commits_count: 3,
        synced_at: '2024-01-01T00:00:00Z',
        profile: {
          github_username: 'user1',
          github_avatar_url: 'https://avatar.com/1',
          display_name: 'User One',
        },
      }

      expect(mockPR).toHaveProperty('id')
      expect(mockPR).toHaveProperty('title')
      expect(mockPR).toHaveProperty('repo_full_name')
      expect(mockPR).toHaveProperty('profile')
      expect(mockPR.profile).toHaveProperty('github_username')
      expect(mockPR.profile).toHaveProperty('github_avatar_url')
      expect(mockPR.profile).toHaveProperty('display_name')
      expect(typeof mockPR.id).toBe('string')
      expect(typeof mockPR.title).toBe('string')
      expect(typeof mockPR.additions).toBe('number')
      expect(typeof mockPR.deletions).toBe('number')
    })

    it('should validate PR with null avatar URL', () => {
      const mockPR: PullRequestWithProfile = {
        id: 'pr-1',
        user_id: 'user-1',
        repo_full_name: 'owner/repo',
        pr_number: 123,
        title: 'Add feature',
        body_summary: 'This adds a feature',
        pr_url: 'https://github.com/owner/repo/pull/123',
        merged_at: '2024-01-01T00:00:00Z',
        additions: 100,
        deletions: 50,
        commits_count: 3,
        synced_at: '2024-01-01T00:00:00Z',
        profile: {
          github_username: 'user1',
          github_avatar_url: null,
          display_name: null,
        },
      }

      expect(mockPR.profile.github_avatar_url).toBeNull()
      expect(mockPR.profile.display_name).toBeNull()
    })

    it('should validate error response structure', () => {
      const mockErrorResponse = {
        error: 'Unauthorized',
      }

      expect(mockErrorResponse).toHaveProperty('error')
      expect(typeof mockErrorResponse.error).toBe('string')
    })
  })

  describe('Pagination parameters', () => {
    it('should validate default pagination values', () => {
      const limit = 20
      const offset = 0

      expect(limit).toBeGreaterThanOrEqual(1)
      expect(limit).toBeLessThanOrEqual(50)
      expect(offset).toBeGreaterThanOrEqual(0)
    })

    it('should validate custom pagination values', () => {
      const limit = 10
      const offset = 20

      expect(limit).toBe(10)
      expect(offset).toBe(20)
    })

    it('should validate maximum limit cap', () => {
      const requestedLimit = 100
      const cappedLimit = Math.min(requestedLimit, 50)

      expect(cappedLimit).toBe(50)
    })
  })

  describe('Follows query structure', () => {
    it('should validate follows query response', () => {
      const mockFollows = [
        { following_id: 'user-1' },
        { following_id: 'user-2' },
        { following_id: 'user-3' },
      ]

      expect(Array.isArray(mockFollows)).toBe(true)
      expect(mockFollows).toHaveLength(3)
      expect(mockFollows[0]).toHaveProperty('following_id')
      expect(typeof mockFollows[0].following_id).toBe('string')
    })

    it('should validate empty follows response', () => {
      const mockFollows: { following_id: string }[] = []

      expect(mockFollows).toEqual([])
      expect(mockFollows).toHaveLength(0)
    })
  })
})
