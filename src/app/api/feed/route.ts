import { buildFeed, getCachedFeed, setCachedFeed } from '@/lib/feed'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createSupabaseRouteHandlerClient(request)
  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession()

  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cursor = request.nextUrl.searchParams.get('cursor')

  if (cursor) {
    const feed = await buildFeed(supabase, session.user.id, cursor)
    return NextResponse.json(feed)
  }

  const cachedFeed = await getCachedFeed(supabase, session.user.id)

  if (cachedFeed) {
    const invalidateUrl = new URL('/api/feed/invalidate', request.url)
    const cookie = request.headers.get('cookie')
    const headers = cookie ? { cookie } : undefined

    void fetch(invalidateUrl, {
      method: 'POST',
      headers,
      cache: 'no-store',
    }).catch(() => {
      return undefined
    })

    return NextResponse.json(cachedFeed)
  }

  const feed = await buildFeed(supabase, session.user.id, null)
  await setCachedFeed(supabase, session.user.id, feed)

  return NextResponse.json(feed)
}
