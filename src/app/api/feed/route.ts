import { getCachedCursorFeed, setCachedCursorFeed } from '@/lib/feed-cursor-cache'
import { buildFeed, FEED_PAGE_SIZE, getCachedFeed, getFollowingIds, setCachedFeed } from '@/lib/feed'
import { parseFeedScope } from '@/lib/feed-types'
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
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit'))
  const limit = requestedLimit > 0 ? Math.min(Math.floor(requestedLimit), 50) : FEED_PAGE_SIZE
  const scope = parseFeedScope(request.nextUrl.searchParams.get('scope'))

  // Following tab: filtered by who the user follows; only the in-process
  // cursor cache applies (feed_cache holds the "everyone" first page).
  if (scope === 'following') {
    const cacheUser = `${session.user.id}:following`
    if (cursor) {
      const cached = getCachedCursorFeed(cacheUser, cursor, limit)
      if (cached) return NextResponse.json(cached)
    }

    const followingIds = await getFollowingIds(supabase, session.user.id)
    const feed = await buildFeed(supabase, session.user.id, cursor, limit, followingIds)
    if (cursor) setCachedCursorFeed(cacheUser, cursor, limit, feed)
    return NextResponse.json(feed)
  }

  if (cursor) {
    const cachedCursorFeed = getCachedCursorFeed(session.user.id, cursor, limit)
    if (cachedCursorFeed) {
      return NextResponse.json(cachedCursorFeed)
    }

    const feed = await buildFeed(supabase, session.user.id, cursor, limit)
    setCachedCursorFeed(session.user.id, cursor, limit, feed)
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

  const feed = await buildFeed(supabase, session.user.id, null, limit)
  await setCachedFeed(supabase, session.user.id, feed)

  return NextResponse.json(feed)
}
