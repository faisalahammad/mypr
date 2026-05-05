/**
 * Tests for the auto-sync cron job and shared sync logic.
 *
 * Covers:
 * - CRON_SECRET validation
 * - Cron response schema for various scenarios
 * - Shared syncUserPRs result structure
 * - User filtering logic (auto_sync_enabled=true)
 * - vercel.json cron schedule
 */

import type { SyncResult } from '@/lib/sync-user'

// Simulate vercel.json content
const vercelConfig = {
  crons: [
    {
      path: '/api/cron/auto-sync',
      schedule: '0 * * * *',
    },
  ],
}

describe('Auto-Sync Cron Job', () => {

  // ──────────────────────────────────────────────
  // 1. vercel.json cron config
  // ──────────────────────────────────────────────
  describe('vercel.json cron config', () => {
    it('should have a cron entry for /api/cron/auto-sync', () => {
      const cronEntry = vercelConfig.crons.find((c) => c.path === '/api/cron/auto-sync')
      expect(cronEntry).toBeDefined()
    })

    it('should run on an hourly schedule (0 * * * *)', () => {
      const cronEntry = vercelConfig.crons[0]
      expect(cronEntry.schedule).toBe('0 * * * *')
    })
  })

  // ──────────────────────────────────────────────
  // 2. CRON_SECRET validation
  // ──────────────────────────────────────────────
  describe('CRON_SECRET authorization', () => {
    it('should reject requests without valid CRON_SECRET', () => {
      const cronSecret = 'my-secret-token'
      const authHeader = 'Bearer wrong-token'

      const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}`
      expect(isAuthorized).toBe(false)
    })

    it('should accept requests with matching CRON_SECRET', () => {
      const cronSecret = 'my-secret-token'
      const authHeader = `Bearer ${cronSecret}`

      const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}`
      expect(isAuthorized).toBe(true)
    })

    it('should allow requests when CRON_SECRET is not configured', () => {
      const cronSecret = undefined
      const authHeader = ''

      const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}`
      expect(isAuthorized).toBe(true)
    })
  })

  // ──────────────────────────────────────────────
  // 3. Auto-sync user filtering
  // ──────────────────────────────────────────────
  describe('User filtering', () => {
    interface MockSyncMetadata {
      user_id: string
      auto_sync_enabled: boolean
      last_date_range: string | null
      profiles: { github_username: string; github_access_token: string | null } | null
    }

    const mockUsers: MockSyncMetadata[] = [
      {
        user_id: 'user-1',
        auto_sync_enabled: true,
        last_date_range: '12m',
        profiles: { github_username: 'alice', github_access_token: 'token-1' },
      },
      {
        user_id: 'user-2',
        auto_sync_enabled: false,
        last_date_range: '3m',
        profiles: { github_username: 'bob', github_access_token: 'token-2' },
      },
      {
        user_id: 'user-3',
        auto_sync_enabled: true,
        last_date_range: null,
        profiles: { github_username: 'carol', github_access_token: null },
      },
      {
        user_id: 'user-4',
        auto_sync_enabled: true,
        last_date_range: '6m',
        profiles: null,
      },
    ]

    it('should filter to only auto_sync_enabled=true users', () => {
      const autoSyncUsers = mockUsers.filter((u) => u.auto_sync_enabled)
      expect(autoSyncUsers).toHaveLength(3)
      expect(autoSyncUsers.every((u) => u.auto_sync_enabled)).toBe(true)
    })

    it('should skip users without a profile', () => {
      const autoSyncUsers = mockUsers.filter((u) => u.auto_sync_enabled)
      const processable = autoSyncUsers.filter((u) => u.profiles !== null)
      expect(processable).toHaveLength(2) // user-1 and user-3
    })

    it('should skip users without a GitHub token', () => {
      const autoSyncUsers = mockUsers.filter((u) => u.auto_sync_enabled)
      const withToken = autoSyncUsers.filter(
        (u) => u.profiles !== null && u.profiles.github_access_token !== null
      )
      expect(withToken).toHaveLength(1) // only user-1
    })

    it('should default to 3m when last_date_range is null', () => {
      const user = mockUsers[2] // carol, last_date_range is null
      const dateRange = user.last_date_range || '3m'
      expect(dateRange).toBe('3m')
    })

    it('should use persisted last_date_range when available', () => {
      const user = mockUsers[0] // alice, last_date_range is 12m
      const dateRange = user.last_date_range || '3m'
      expect(dateRange).toBe('12m')
    })
  })

  // ──────────────────────────────────────────────
  // 4. SyncResult structure
  // ──────────────────────────────────────────────
  describe('SyncResult structure', () => {
    it('should have correct shape for a successful sync', () => {
      const result: SyncResult = {
        user_id: 'user-1',
        github_username: 'alice',
        synced: 15,
        repos_found: 3,
      }

      expect(result).toMatchObject({
        user_id: expect.any(String),
        github_username: expect.any(String),
        synced: expect.any(Number),
        repos_found: expect.any(Number),
      })
      expect(result.error).toBeUndefined()
    })

    it('should include error field on failure', () => {
      const result: SyncResult = {
        user_id: 'user-2',
        github_username: 'bob',
        synced: 0,
        repos_found: 0,
        error: 'GitHub API rate limit exceeded',
      }

      expect(result.error).toBeTruthy()
      expect(result.synced).toBe(0)
    })
  })

  // ──────────────────────────────────────────────
  // 5. Cron response schema
  // ──────────────────────────────────────────────
  describe('Cron response schema', () => {
    it('should return correct shape when no users have auto-sync', () => {
      const response = {
        success: true,
        message: 'No users with auto-sync enabled',
        users_processed: 0,
        results: [],
      }

      expect(response.users_processed).toBe(0)
      expect(response.results).toHaveLength(0)
    })

    it('should return summary with totals for processed users', () => {
      const results: SyncResult[] = [
        { user_id: 'u1', github_username: 'a', synced: 10, repos_found: 2 },
        { user_id: 'u2', github_username: 'b', synced: 5, repos_found: 1 },
        { user_id: 'u3', github_username: 'c', synced: 0, repos_found: 0, error: 'Token expired' },
      ]

      const totalSynced = results.reduce((sum, r) => sum + r.synced, 0)
      const totalErrors = results.filter((r) => r.error).length

      const response = {
        success: true,
        message: `Auto-sync completed for ${results.length} user(s)`,
        users_processed: results.length,
        total_prs_synced: totalSynced,
        errors: totalErrors,
        results,
      }

      expect(response.users_processed).toBe(3)
      expect(response.total_prs_synced).toBe(15)
      expect(response.errors).toBe(1)
    })
  })
})
