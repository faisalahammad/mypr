import { createSupabaseRouteHandlerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/follow - Follow a user
 *
 * Body: { target_user_id: string }
 * Returns: { following: true }
 */
export async function POST(request: NextRequest) {
  const supabase = createSupabaseRouteHandlerClient(request)

  const { data: { session }, error: authError } = await supabase.auth.getSession()
  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { target_user_id } = body

  if (!target_user_id || typeof target_user_id !== 'string') {
    return NextResponse.json({ error: 'target_user_id is required' }, { status: 400 })
  }

  // Cannot follow yourself
  if (target_user_id === session.user.id) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
  }

  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: session.user.id,
      following_id: target_user_id,
    } as any)

  if (error) {
    // Unique constraint violation = already following
    if (error.code === '23505') {
      return NextResponse.json({ following: true })
    }
    return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 })
  }

  await supabase
    .from('feed_cache')
    .delete()
    .eq('user_id', session.user.id)

  return NextResponse.json({ following: true })
}

/**
 * DELETE /api/follow - Unfollow a user
 *
 * Body: { target_user_id: string }
 * Returns: { following: false }
 */
export async function DELETE(request: NextRequest) {
  const supabase = createSupabaseRouteHandlerClient(request)

  const { data: { session }, error: authError } = await supabase.auth.getSession()
  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { target_user_id } = body

  if (!target_user_id || typeof target_user_id !== 'string') {
    return NextResponse.json({ error: 'target_user_id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', session.user.id)
    .eq('following_id', target_user_id)

  if (error) {
    return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 })
  }

  await supabase
    .from('feed_cache')
    .delete()
    .eq('user_id', session.user.id)

  return NextResponse.json({ following: false })
}
