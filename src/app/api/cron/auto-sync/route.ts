import { createSupabaseServiceClient } from '@/lib/supabase'
import { syncUserPRs, type SyncResult } from '@/lib/sync-user'
import { NextRequest, NextResponse } from 'next/server'

// Vercel kills the invocation after this many seconds; every user must fit in it
export const maxDuration = 300

// Users sync with their own GitHub tokens, so they can run side by side
// without sharing GitHub rate limits
const USER_CONCURRENCY = 5

interface AutoSyncProfile {
  id: string
  github_username: string
  github_access_token: string | null
}

/**
 * GET /api/cron/auto-sync
 *
 * Vercel Cron Job handler — runs daily at 00:00 UTC (06:00 Bangladesh time)
 * via vercel.json schedule. Auto-sync is forced on for every registered user:
 * all profiles with a GitHub token are synced with the "lifetime" date range,
 * fetching only PRs that aren't cached yet. Their manually chosen date range
 * in sync_metadata is preserved (persistDateRange: false).
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

    // Sync every registered user with a GitHub access token
    const { data: profiles, error: queryError } = await serviceClient
      .from('profiles')
      .select('id, github_username, github_access_token')
      .not('github_access_token', 'is', null)

    if (queryError) {
      console.error('[auto-sync cron] Error querying profiles:', queryError)
      return NextResponse.json(
        { error: 'Database error', message: queryError.message },
        { status: 500 }
      )
    }

    const users = (profiles ?? []) as unknown as AutoSyncProfile[]

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No registered users to sync',
        users_processed: 0,
        results: [],
      })
    }

    const syncUser = async (user: AutoSyncProfile): Promise<SyncResult> => {
      if (!user.github_access_token) {
        console.warn(`[auto-sync cron] No GitHub token for user: ${user.github_username}`)
        return {
          user_id: user.id,
          github_username: user.github_username,
          synced: 0,
          repos_found: 0,
          error: 'No GitHub access token',
        }
      }

      console.log(`[auto-sync cron] Syncing user: ${user.github_username} (range: lifetime)`)

      const result = await syncUserPRs(
        {
          id: user.id,
          github_username: user.github_username,
          github_access_token: user.github_access_token,
        },
        'lifetime',
        { persistDateRange: false, skipCachedPRs: true }
      )

      console.log(
        `[auto-sync cron] Completed: ${user.github_username} — ${result.synced} PRs, ${result.repos_found} repos`
      )

      return result
    }

    const results: SyncResult[] = []

    for (let i = 0; i < users.length; i += USER_CONCURRENCY) {
      results.push(...(await Promise.all(users.slice(i, i + USER_CONCURRENCY).map(syncUser))))
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
