import { requireAuth, getMixedFeedPRs } from '@/lib/supabase'
import { FeedClient } from '@/components/feed/FeedClient'
import { AppShell } from '@/components/layout/AppShell'

// Force dynamic rendering - don't statically generate during build
export const dynamic = 'force-dynamic'

/**
 * Home Feed Page - Protected route showing PRs from followed users
 *
 * This page:
 * - Requires authentication (redirects to /login if not authenticated)
 * - Fetches PRs from users that the current user follows
 * - Displays PRs in reverse chronological order with pagination
 * - Shows an empty state if not following anyone or if followed users have no PRs
 */
export default async function FeedPage() {
  // Require authentication - will redirect to /login if not authenticated
  const user = await requireAuth()

  const { prs, hasMore } = await getMixedFeedPRs(user.id, 20, 0)

  return (
    <AppShell className="py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Feed</h1>
        <p className="text-muted-foreground mt-2">
          Pull requests from developers you follow, plus suggested contributors when your feed needs a boost.
        </p>
      </div>

      {/* Client component for feed with pagination */}
      <FeedClient initialPRs={prs} initialHasMore={hasMore} />
    </AppShell>
  )
}
