import { buildFeed, setCachedFeed } from '@/lib/feed'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createSupabaseRouteHandlerClient(request)
  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession()

  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const feed = await buildFeed(supabase, session.user.id, null)
  await setCachedFeed(supabase, session.user.id, feed)

  return NextResponse.json({ ok: true, generated_at: feed.generated_at })
}
