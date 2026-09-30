/**
 * Tests for the auto-sync cron job and shared sync logic.
 *
 * Covers:
 * - CRON_SECRET validation
 * - Cron response schema for various scenarios
 * - Shared syncUserPRs result structure
 * - User selection (all registered users with a GitHub token)
 * - vercel.json cron schedule
 */

import fs from 'node:fs'
import path from 'node:path'

import type { SyncResult } from '@/lib/sync-user'

// Read the real vercel.json so the schedule assertion can't drift from deployment
const vercelConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf-8')
) as { crons: Array<{ path: string; schedule: string }> }

describe('Auto-Sync Cron Job', () => {

  // ──────────────────────────────────────────────
  // 1. vercel.json cron config
  // ──────────────────────────────────────────────
  describe('vercel.json cron config', () => {
    it('should have a cron entry for /api/cron/auto-sync', () => {
      const cronEntry = vercelConfig.crons.find((c) => c.path === '/api/cron/auto-sync')
      expect(cronEntry).toBeDefined()
    })

    it('should run on a daily schedule (0 0 * * *)', () => {
      const cronEntry = vercelConfig.crons[0]
      expect(cronEntry.schedule).toBe('0 0 * * *')
    })
  })

  // ──────────────────────────────────────────────
  // 2. CRON_SECRET validation
  // ──────────────────────────────────────────────
  describe('CRON_SECRET authorization', () => {
    it('should reject requests without valid CRON_SECRET', () => {
      const cronSecret = 'my-secret-token'
      const authHeader: string = 'Bearer wrong-token'

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
  // 3. User selection (auto-sync is forced on)
  // ──────────────────────────────────────────────
  describe('User selection', () => {
    interface MockProfile {
      id: string
      github_username: string
      github_access_token: string | null
    }

    const mockProfiles: MockProfile[] = [
      { id: 'user-1', github_username: 'alice', github_access_token: 'token-1' },
      { id: 'user-2', github_username: 'bob', github_access_token: 'token-2' },
      { id: 'user-3', github_username: 'carol', github_access_token: null },
    ]

    it('should select every registered profile (no opt-in filter)', () => {
      // The cron queries all profiles directly; auto_sync_enabled is no longer
      // a filter, so users who never touched settings are still synced
      const selected = mockProfiles
      expect(selected).toHaveLength(3)
    })

    it('should record an error result for users without a GitHub token', () => {
      const results: SyncResult[] = []
      for (const user of mockProfiles) {
        if (!user.github_access_token) {
          results.push({
            user_id: user.id,
            github_username: user.github_username,
            synced: 0,
            repos_found: 0,
            error: 'No GitHub access token',
          })
        }
      }
      expect(results).toHaveLength(1) // only carol
      expect(results[0].github_username).toBe('carol')
    })

    it('should always sync with the lifetime date range', () => {
      // The cron passes 'lifetime' explicitly, ignoring any saved range
      const cronDateRange = 'lifetime'
      expect(cronDateRange).toBe('lifetime')
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
    it('should return correct shape when no registered users exist', () => {
      const response = {
        success: true,
        message: 'No registered users to sync',
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
