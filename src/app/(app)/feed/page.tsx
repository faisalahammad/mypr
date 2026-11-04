import Link from 'next/link'
import { FeedContainer } from '@/components/feed/FeedContainer'
import { AppShell } from '@/components/layout/AppShell'
import { buildFeed, getCachedFeed, getFollowingIds, setCachedFeed } from '@/lib/feed'
import { parseFeedScope, type FeedScope } from '@/lib/feed-types'
import { createSupabaseServerClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { redirect } from 'next/navigation'

// Force dynamic rendering - don't statically generate during build
export const dynamic = 'force-dynamic'

interface FeedPageProps {
  searchParams: Promise<{ tab?: string }>
}

const TABS: Array<{ scope: FeedScope; label: string; href: string }> = [
  { scope: 'following', label: 'Following', href: '/feed?tab=following' },
  { scope: 'everyone', label: 'Everyone', href: '/feed' },
]

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const { tab } = await searchParams
  const scope = parseFeedScope(tab)
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/')
  }

  const followingIds = await getFollowingIds(supabase, session.user.id)

  let initialFeed
  if (scope === 'following') {
    initialFeed = await buildFeed(supabase, session.user.id, null, undefined, followingIds)
  } else {
    const cachedFeed = await getCachedFeed(supabase, session.user.id)
    initialFeed = cachedFeed ?? (await buildFeed(supabase, session.user.id, null))

    if (!cachedFeed) {
      await setCachedFeed(supabase, session.user.id, initialFeed)
    }
  }

  return (
    <AppShell className="py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
        <p className="text-muted-foreground mt-2">
          {scope === 'following'
            ? 'Merged pull requests from developers you follow, newest first.'
            : 'Merged pull requests from everyone on MyPR, newest first.'}
        </p>
      </div>

      <nav className="mb-6 flex gap-2" aria-label="Feed filter">
        {TABS.map((item) => (
          <Link
            key={item.scope}
            href={item.href}
            aria-current={scope === item.scope ? 'page' : undefined}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              scope === item.scope
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:bg-muted'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <FeedContainer
        key={scope}
        initialFeed={initialFeed}
        userId={session.user.id}
        scope={scope}
        initialFollowingIds={followingIds}
      />
    </AppShell>
  )
}
