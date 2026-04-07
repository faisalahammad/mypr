import { requireAuth, getFollowedPRs } from '@/lib/supabase'
import { FeedClient } from '@/components/feed/FeedClient'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

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

  // Fetch PRs from followed users (first 20)
  const prs = await getFollowedPRs(user.id, 20, 0)

  // Check if there are more PRs to load for pagination
  // We do this by making another query with limit=1 to see if there's a 21st PR
  const checkMorePRs = await getFollowedPRs(user.id, 1, 20)
  const hasMore = checkMorePRs.length > 0

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Feed</h1>
        <p className="text-muted-foreground mt-2">
          Pull requests from developers you follow
        </p>
      </div>

      {/* Client component for feed with pagination */}
      <FeedClient initialPRs={prs} initialHasMore={hasMore} />
    </div>
  )
}
