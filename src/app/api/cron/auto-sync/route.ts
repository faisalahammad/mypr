import { createSupabaseServiceClient } from '@/lib/supabase'
import { syncUserPRs, type SyncResult } from '@/lib/sync-user'
import type { DateRange } from '@/lib/github'
import { NextRequest, NextResponse } from 'next/server'

interface AutoSyncUser {
  user_id: string
  last_date_range: string | null
  profiles: {
    id: string
    github_username: string
    github_access_token: string | null
  } | null
}

/**
 * GET /api/cron/auto-sync
 *
 * Vercel Cron Job handler — runs hourly via vercel.json schedule.
 * Queries all users with auto_sync_enabled=true, then syncs their
 * PRs and repos using the shared syncUserPRs logic.
 *
 * Security: Protected by CRON_SECRET header validation.
 * Vercel automatically sends this header for cron-triggered requests.
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const serviceClient = createSupabaseServiceClient()

    // Find all users with auto-sync enabled
    const { data: autoSyncUsers, error: queryError } = await serviceClient
      .from('sync_metadata')
      .select(`
        user_id,
        last_date_range,
        profiles (
          id,
          github_username,
          github_access_token
        )
      `)
      .eq('auto_sync_enabled', true)

    if (queryError) {
      console.error('[auto-sync cron] Error querying auto-sync users:', queryError)
      return NextResponse.json(
        { error: 'Database error', message: queryError.message },
        { status: 500 }
      )
    }

    const users = (autoSyncUsers ?? []) as unknown as AutoSyncUser[]

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with auto-sync enabled',
        users_processed: 0,
        results: [],
      })
    }

    const results: SyncResult[] = []

    // Process each user sequentially to avoid overwhelming GitHub API rate limits
    for (const user of users) {
      if (!user.profiles) {
        console.warn(`[auto-sync cron] No profile found for user_id: ${user.user_id}`)
        continue
      }

      if (!user.profiles.github_access_token) {
        console.warn(`[auto-sync cron] No GitHub token for user: ${user.profiles.github_username}`)
        results.push({
          user_id: user.user_id,
          github_username: user.profiles.github_username,
          synced: 0,
          repos_found: 0,
          error: 'No GitHub access token',
        })
        continue
      }

      // Use the user's last saved date range, default to 3m
      const dateRange: DateRange = (user.last_date_range as DateRange) || '3m'

      console.log(`[auto-sync cron] Syncing user: ${user.profiles.github_username} (range: ${dateRange})`)

      const result = await syncUserPRs(
        {
          id: user.profiles.id,
          github_username: user.profiles.github_username,
          github_access_token: user.profiles.github_access_token,
        },
        dateRange
      )

      results.push(result)

      console.log(
        `[auto-sync cron] Completed: ${user.profiles.github_username} — ${result.synced} PRs, ${result.repos_found} repos`
      )
    }

    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0)
    const totalErrors = results.filter((r) => r.error).length

    return NextResponse.json({
      success: true,
      message: `Auto-sync completed for ${results.length} user(s)`,
      users_processed: results.length,
      total_prs_synced: totalSynced,
      errors: totalErrors,
      results,
    })
  } catch (error) {
    console.error('[auto-sync cron] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
