import { FeedContainer } from '@/components/feed/FeedContainer'
import { AppShell } from '@/components/layout/AppShell'
import { buildFeed, getCachedFeed, setCachedFeed } from '@/lib/feed'
import { createSupabaseServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

// Force dynamic rendering - don't statically generate during build
export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/')
  }

  const cachedFeed = await getCachedFeed(supabase, session.user.id)
  const initialFeed = cachedFeed ?? (await buildFeed(supabase, session.user.id, null))

  if (!cachedFeed) {
    await setCachedFeed(supabase, session.user.id, initialFeed)
  }

  return (
    <AppShell className="py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Feed</h1>
        <p className="text-muted-foreground mt-2">
          Merged pull requests ranked by who you follow, recency, and community reactions.
        </p>
      </div>

      <FeedContainer initialFeed={initialFeed} userId={session.user.id} />
    </AppShell>
  )
}
