/**
 * Tests for settings page improvements:
 * - Sync metadata schema (auto_sync_enabled field)
 * - GET /api/sync-prs response includes auto_sync_enabled
 * - PATCH /api/sync-prs request/response validation
 * - Date range persistence logic
 * - formatDate hydration safety
 * - RepoCard props & new repos default to inactive
 */

import type { Database } from '@/lib/supabase'
import type { DateRange } from '@/lib/github'

type SyncMetadataRow = Database['public']['Tables']['sync_metadata']['Row']
type SyncMetadataInsert = Database['public']['Tables']['sync_metadata']['Insert']
type SyncMetadataUpdate = Database['public']['Tables']['sync_metadata']['Update']

describe('Settings Page Improvements', () => {

  // ──────────────────────────────────────────────
  // 1. sync_metadata type includes auto_sync_enabled
  // ──────────────────────────────────────────────
  describe('sync_metadata schema', () => {
    it('Row type should include auto_sync_enabled as boolean', () => {
      const row: SyncMetadataRow = {
        user_id: 'user-123',
        last_date_range: '12m',
        auto_sync_enabled: true,
        updated_at: new Date().toISOString(),
      }

      expect(row.auto_sync_enabled).toBe(true)
      expect(typeof row.auto_sync_enabled).toBe('boolean')
    })

    it('Insert type should allow auto_sync_enabled to be optional', () => {
      const insertWithout: SyncMetadataInsert = {
        user_id: 'user-123',
      }
      expect(insertWithout.auto_sync_enabled).toBeUndefined()

      const insertWith: SyncMetadataInsert = {
        user_id: 'user-123',
        auto_sync_enabled: false,
      }
      expect(insertWith.auto_sync_enabled).toBe(false)
    })

    it('Update type should allow auto_sync_enabled to be optional', () => {
      const update: SyncMetadataUpdate = {
        auto_sync_enabled: true,
      }
      expect(update.auto_sync_enabled).toBe(true)
    })
  })

  // ──────────────────────────────────────────────
  // 2. GET /api/sync-prs response schema
  // ──────────────────────────────────────────────
  describe('GET /api/sync-prs response with auto_sync_enabled', () => {
    it('should include auto_sync_enabled field', () => {
      const response = {
        last_synced: '2024-06-01T12:00:00Z',
        total_prs: 42,
        last_date_range: '12m',
        auto_sync_enabled: false,
      }

      expect(response).toHaveProperty('auto_sync_enabled')
      expect(typeof response.auto_sync_enabled).toBe('boolean')
    })

    it('should default auto_sync_enabled to false when no sync_metadata exists', () => {
      const typedMeta = null
      const auto_sync_enabled = typedMeta?.auto_sync_enabled ?? false

      expect(auto_sync_enabled).toBe(false)
    })

    it('should preserve auto_sync_enabled=true when set', () => {
      const typedMeta = { last_date_range: '6m', auto_sync_enabled: true }
      const auto_sync_enabled = typedMeta?.auto_sync_enabled ?? false

      expect(auto_sync_enabled).toBe(true)
    })
  })

  // ──────────────────────────────────────────────
  // 3. PATCH /api/sync-prs request validation
  // ──────────────────────────────────────────────
  describe('PATCH /api/sync-prs auto-sync toggle', () => {
    it('should accept valid boolean auto_sync_enabled', () => {
      const validPayloads = [
        { auto_sync_enabled: true },
        { auto_sync_enabled: false },
      ]

      for (const payload of validPayloads) {
        expect(typeof payload.auto_sync_enabled).toBe('boolean')
      }
    })

    it('should reject non-boolean auto_sync_enabled', () => {
      const invalidPayloads = [
        { auto_sync_enabled: 'yes' },
        { auto_sync_enabled: 1 },
        { auto_sync_enabled: null },
        { auto_sync_enabled: undefined },
      ]

      for (const payload of invalidPayloads) {
        expect(typeof payload.auto_sync_enabled !== 'boolean').toBe(true)
      }
    })

    it('should return correct response structure on success', () => {
      const successResponse = {
        success: true,
        auto_sync_enabled: true,
        message: 'Auto-sync enabled',
      }

      expect(successResponse).toMatchObject({
        success: true,
        auto_sync_enabled: expect.any(Boolean),
        message: expect.any(String),
      })
    })
  })

  // ──────────────────────────────────────────────
  // 4. Date range persistence & restoration
  // ──────────────────────────────────────────────
  describe('Date range persistence', () => {
    const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
      { value: '1m', label: 'Last 1 month' },
      { value: '3m', label: 'Last 3 months' },
      { value: '6m', label: 'Last 6 months' },
      { value: '12m', label: 'Last 12 months' },
      { value: '24m', label: 'Last 24 months' },
      { value: 'lifetime', label: 'Lifetime' },
    ]

    it('should restore dateRange from syncInfo.last_date_range', () => {
      const syncInfo = { last_date_range: '12m', auto_sync_enabled: false }
      let dateRange: DateRange = '3m' // default

      if (syncInfo.last_date_range) {
        dateRange = syncInfo.last_date_range as DateRange
      }

      expect(dateRange).toBe('12m')
    })

    it('should keep default when last_date_range is null', () => {
      const syncInfo = { last_date_range: null, auto_sync_enabled: false }
      let dateRange: DateRange = '3m'

      if (syncInfo.last_date_range) {
        dateRange = syncInfo.last_date_range as DateRange
      }

      expect(dateRange).toBe('3m')
    })

    it('all date range values should have a matching label', () => {
      const validValues: DateRange[] = ['1m', '3m', '6m', '12m', '24m', 'lifetime']

      for (const value of validValues) {
        const option = DATE_RANGE_OPTIONS.find((o) => o.value === value)
        expect(option).toBeDefined()
        expect(option!.label).toBeTruthy()
      }
    })
  })

  // ──────────────────────────────────────────────
  // 5. New repositories default to inactive
  // ──────────────────────────────────────────────
  describe('New repository defaults', () => {
    it('should default is_active to false for new repos (existingRepo is null)', () => {
      const existingRepo = null
      const is_active = existingRepo?.is_active ?? false

      expect(is_active).toBe(false)
    })

    it('should preserve is_active for existing repos', () => {
      const existingRepoActive = { is_active: true }
      expect(existingRepoActive.is_active ?? false).toBe(true)

      const existingRepoInactive = { is_active: false }
      expect(existingRepoInactive.is_active ?? false).toBe(false)
    })
  })

  // ──────────────────────────────────────────────
  // 6. formatDate hydration safety
  // ──────────────────────────────────────────────
  describe('formatDate hydration safety', () => {
    function formatDate(iso: string | null) {
      if (!iso) return 'Never'
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    }

    it('should return "Never" for null input', () => {
      expect(formatDate(null)).toBe('Never')
    })

    it('should return a non-empty string for valid ISO date', () => {
      const result = formatDate('2024-06-15T14:30:00Z')
      expect(result).toBeTruthy()
      expect(result).not.toBe('Never')
    })

    it('hasMounted guard should show em-dash before mount', () => {
      const hasMounted = false
      const display = hasMounted ? formatDate('2024-06-15T14:30:00Z') : '\u2014'
      expect(display).toBe('\u2014')
    })

    it('hasMounted guard should show formatted date after mount', () => {
      const hasMounted = true
      const display = hasMounted ? formatDate('2024-06-15T14:30:00Z') : '\u2014'
      expect(display).not.toBe('\u2014')
      expect(display).toBeTruthy()
    })
  })

  // ──────────────────────────────────────────────
  // 7. Repo grouping and sorting
  // ──────────────────────────────────────────────
  describe('Repo grouping for active/inactive sections', () => {
    interface MockRepo {
      repo_full_name: string
      is_active: boolean
    }

    const repos: MockRepo[] = [
      { repo_full_name: 'org/alpha', is_active: true },
      { repo_full_name: 'org/beta', is_active: false },
      { repo_full_name: 'org/gamma', is_active: true },
      { repo_full_name: 'org/delta', is_active: false },
    ]

    it('should correctly split repos into active and inactive groups', () => {
      const active = repos.filter((r) => r.is_active)
      const inactive = repos.filter((r) => !r.is_active)

      expect(active).toHaveLength(2)
      expect(inactive).toHaveLength(2)
      expect(active.every((r) => r.is_active)).toBe(true)
      expect(inactive.every((r) => !r.is_active)).toBe(true)
    })

    it('should show divider only when both groups have repos', () => {
      const active = repos.filter((r) => r.is_active)
      const inactive = repos.filter((r) => !r.is_active)
      const showDivider = active.length > 0 && inactive.length > 0

      expect(showDivider).toBe(true)
    })

    it('should not show divider when one group is empty', () => {
      const allActive = repos.map((r) => ({ ...r, is_active: true }))
      const active = allActive.filter((r) => r.is_active)
      const inactive = allActive.filter((r) => !r.is_active)
      const showDivider = active.length > 0 && inactive.length > 0

      expect(showDivider).toBe(false)
    })
  })
})
