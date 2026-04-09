import type { ReactionCounts, ReactionType } from '@/lib/feed'
import { EMPTY_REACTION_COUNTS } from '@/lib/feed'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const REACTION_TYPES: ReactionType[] = ['love', 'thumbsup', 'informative', 'support', 'funny']

function isReactionType(value: unknown): value is ReactionType {
  return typeof value === 'string' && REACTION_TYPES.includes(value as ReactionType)
}

function normalizeReactionCounts(
  counts: Partial<ReactionCounts> | null | undefined
): ReactionCounts {
  return {
    ...EMPTY_REACTION_COUNTS,
    ...(counts ?? {}),
  }
}

async function getReactionCounts(
  supabase: ReturnType<typeof createSupabaseRouteHandlerClient>,
  prId: string
): Promise<ReactionCounts> {
  const { data } = await supabase
    .from('pull_requests')
    .select('reaction_counts')
    .eq('id', prId)
    .maybeSingle()

  return normalizeReactionCounts(
    (data as { reaction_counts?: Partial<ReactionCounts> | null } | null)?.reaction_counts
  )
}

export async function POST(request: Request) {
  const supabase = createSupabaseRouteHandlerClient(request)
  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession()

  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    pr_id?: string
    reaction_type?: unknown
  }

  if (typeof body.pr_id !== 'string' || !isReactionType(body.reaction_type)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { data: existingReaction } = await supabase
    .from('reactions')
    .select('id, reaction_type')
    .eq('pr_id', body.pr_id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  const existing = existingReaction as { id: string; reaction_type: ReactionType } | null

  let action: 'added' | 'removed' | 'changed'
  let reactionType: ReactionType | null

  if (existing && existing.reaction_type === body.reaction_type) {
    await supabase.from('reactions').delete().eq('id', existing.id)
    action = 'removed'
    reactionType = null
  } else if (existing) {
    await supabase
      .from('reactions')
      .update({ reaction_type: body.reaction_type } as never)
      .eq('id', existing.id)
    action = 'changed'
    reactionType = body.reaction_type
  } else {
    await supabase.from('reactions').insert({
      pr_id: body.pr_id,
      user_id: session.user.id,
      reaction_type: body.reaction_type,
    } as never)
    action = 'added'
    reactionType = body.reaction_type
  }

  const reaction_counts = await getReactionCounts(supabase, body.pr_id)

  return NextResponse.json({
    action,
    reaction_type: reactionType,
    reaction_counts,
  })
}

export async function DELETE(request: Request) {
  const supabase = createSupabaseRouteHandlerClient(request)
  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession()

  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { pr_id?: string }

  if (typeof body.pr_id !== 'string') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  await supabase
    .from('reactions')
    .delete()
    .eq('pr_id', body.pr_id)
    .eq('user_id', session.user.id)

  const reaction_counts = await getReactionCounts(supabase, body.pr_id)

  return NextResponse.json({
    action: 'removed',
    reaction_type: null,
    reaction_counts,
  })
}
