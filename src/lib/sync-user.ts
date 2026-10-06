import { createSupabaseServiceClient } from '@/lib/supabase'
import { searchMergedPRs, getPRSummary, getPRKey, type DateRange } from '@/lib/github'
import { getProfileResultsTag } from '@/lib/profile-results'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { Database } from '@/lib/supabase'

interface SyncUserProfile {
  id: string
  github_username: string
  github_access_token: string
}

export interface SyncResult {
  user_id: string
  github_username: string
  synced: number
  repos_found: number
  error?: string
}

interface SyncUserOptions {
  /**
   * When false, the user's saved last_date_range in sync_metadata is left
   * untouched (used by the cron so its lifetime sync doesn't overwrite
   * the range the user picked for manual syncs).
   */
  persistDateRange?: boolean
  /**
   * When true, PRs already in pull_requests are not fetched again. Merged PRs
   * don't change, so the daily lifetime cron only pays for new ones, and a run
   * cut off by the function timeout picks up where it stopped the next day.
   */
  skipCachedPRs?: boolean
}

/**
 * Core sync logic extracted for reuse by both the manual POST handler
 * and the automated cron job.
 *
 * Syncs merged PRs for a single user: searches GitHub, upserts repos & PRs,
 * updates counts, invalidates caches, and revalidates profile pages.
 */
export async function syncUserPRs(
  profile: SyncUserProfile,
  dateRange: DateRange,
  options: SyncUserOptions = {}
): Promise<SyncResult> {
  const { persistDateRange = true, skipCachedPRs = false } = options
  const serviceClient = createSupabaseServiceClient()
  const now = new Date().toISOString()

  // Record when the user was last synced, even when nothing new was found.
  // The range is only saved when persistDateRange is set.
  const recordSyncTime = async () => {
    const { error: metaError } = await serviceClient
      .from('sync_metadata')
      .upsert({
        user_id: profile.id,
        updated_at: now,
        ...(persistDateRange ? { last_date_range: dateRange } : {}),
      } as Database['public']['Tables']['sync_metadata']['Insert'] as never)

    if (metaError) {
      console.error('[auto-sync] Error upserting sync metadata:', metaError)
    }
  }

  try {
    const cachedPRs = new Set<string>()

    if (skipCachedPRs) {
      // ponytail: PostgREST caps this at max-rows (1000); past that, extra PRs are just re-fetched
      const { data: cached, error: cachedError } = await serviceClient
        .from('pull_requests')
        .select('repo_full_name, pr_number')
        .eq('user_id', profile.id)

      if (cachedError) {
        throw new Error(`Failed to read cached PRs: ${cachedError.message}`)
      }

      for (const pr of (cached ?? []) as Array<{ repo_full_name: string; pr_number: number }>) {
        cachedPRs.add(getPRKey(pr.repo_full_name, pr.pr_number))
      }
    }

    const reposWithPRs = await searchMergedPRs(
      profile.github_access_token,
      profile.github_username,
      dateRange,
      cachedPRs
    )

    if (reposWithPRs.length === 0) {
      await recordSyncTime()
      return {
        user_id: profile.id,
        github_username: profile.github_username,
        synced: 0,
        repos_found: 0,
      }
    }

    let totalSynced = 0

    for (const repoData of reposWithPRs) {
      const { repo_full_name, description, owner_avatar_url, prs } = repoData

      // Preserve is_active status for existing repos; new repos default to false
      const { data: existingRepo } = await serviceClient
        .from('repositories')
        .select('is_active')
        .eq('user_id', profile.id)
        .eq('repo_full_name', repo_full_name)
        .maybeSingle<{ is_active: boolean }>()

      const repoUpsertData = {
        user_id: profile.id,
        repo_full_name,
        description,
        owner_avatar_url,
        pr_count: prs.length,
        last_synced_at: now,
        is_active: existingRepo?.is_active ?? false,
      } as Database['public']['Tables']['repositories']['Insert']

      const { error: repoError } = await serviceClient
        .from('repositories')
        .upsert(repoUpsertData as never, {
          onConflict: 'user_id,repo_full_name',
        })

      if (repoError) {
        console.error(`[auto-sync] Error upserting repository ${repo_full_name}:`, repoError)
        continue
      }

      const prInsertData = prs.map(pr => ({
        user_id: profile.id,
        repo_full_name: pr.repo_full_name,
        pr_number: pr.pr_number,
        title: pr.title,
        body_summary: getPRSummary(pr.body),
        pr_url: pr.html_url,
        merged_at: pr.merged_at,
        additions: pr.additions,
        deletions: pr.deletions,
        commits_count: pr.commits,
        is_approved: true,
        synced_at: now,
      } as Database['public']['Tables']['pull_requests']['Insert']))

      const { error: prsError } = await serviceClient
        .from('pull_requests')
        .upsert(prInsertData as never, {
          onConflict: 'user_id,repo_full_name,pr_number',
        })

      if (prsError) {
        console.error(`[auto-sync] Error upserting PRs for ${repo_full_name}:`, prsError)
      } else {
        totalSynced += prs.length
      }
    }

    // Refresh pr_count from database for accuracy
    for (const { repo_full_name } of reposWithPRs) {
      const { count } = await serviceClient
        .from('pull_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('repo_full_name', repo_full_name)

      await serviceClient
        .from('repositories')
        .update(({ pr_count: count ?? 0, last_synced_at: now } as Database['public']['Tables']['repositories']['Update']) as never)
        .eq('user_id', profile.id)
        .eq('repo_full_name', repo_full_name)
    }

    await recordSyncTime()

    // Invalidate feed caches for the user and their followers
    const { data: followers } = await serviceClient
      .from('follows')
      .select('follower_id')
      .eq('following_id', profile.id)

    const cacheInvalidationIds = Array.from(
      new Set([
        profile.id,
        ...((followers ?? []) as Array<{ follower_id: string }>).map((row) => row.follower_id),
      ])
    )

    if (cacheInvalidationIds.length > 0) {
      await serviceClient
        .from('feed_cache')
        .delete()
        .in('user_id', cacheInvalidationIds)
    }

    // Revalidate profile pages
    revalidateTag(getProfileResultsTag(profile.github_username), 'max')
    revalidatePath(`/${profile.github_username}`)

    return {
      user_id: profile.id,
      github_username: profile.github_username,
      synced: totalSynced,
      repos_found: reposWithPRs.length,
    }
  } catch (error) {
    console.error(`[auto-sync] Error syncing user ${profile.github_username}:`, error)
    return {
      user_id: profile.id,
      github_username: profile.github_username,
      synced: 0,
      repos_found: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
