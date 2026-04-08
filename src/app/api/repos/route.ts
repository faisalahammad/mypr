import { createSupabaseRouteHandlerClient, createSupabaseServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase'

// GET — return repositories from our local Supabase cache (no GitHub API call)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteHandlerClient(request)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Please log in to continue' },
        { status: 401 }
      )
    }

    // Fetch repos from our cache — only repos that have been discovered via sync
    const { data: repos, error: reposError } = await supabase
      .from('repositories')
      .select('repo_full_name, description, is_active, pr_count, last_synced_at, created_at')
      .eq('user_id', session.user.id)
      .order('pr_count', { ascending: false })

    if (reposError) {
      return NextResponse.json(
        { success: false, error: 'Database error', message: reposError.message },
        { status: 500 }
      )
    }

    const typedRepos = (repos ?? []) as Array<{
      repo_full_name: string
      description: string | null
      is_active: boolean
      pr_count: number
      last_synced_at: string | null
      created_at: string
    }>

    const activeCount = typedRepos.filter(r => r.is_active).length

    return NextResponse.json({
      success: true,
      repos: typedRepos,
      total_count: typedRepos.length,
      active_count: activeCount,
    })
  } catch (error) {
    console.error('Error in GET /api/repos:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch repositories'
      },
      { status: 500 }
    )
  }
}

// POST — toggle a repository's is_active status
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteHandlerClient(request)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Please log in to continue' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { repo_full_name, is_active } = body

    if (!repo_full_name || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid input', message: 'repo_full_name and is_active are required' },
        { status: 400 }
      )
    }

    // Only allow toggling repos that belong to this user (extra safety on top of RLS)
    const serviceClient = createSupabaseServiceClient() as typeof supabase

    const { data, error } = await serviceClient
      .from('repositories')
      .update(({ is_active } as Database['public']['Tables']['repositories']['Update']) as never)
      .eq('user_id', session.user.id)
      .eq('repo_full_name', repo_full_name)
      .select()
      .single()

    if (error) {
      console.error('Error updating repository:', error)
      return NextResponse.json(
        { success: false, error: 'Database error', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Repository ${is_active ? 'activated' : 'deactivated'} successfully`,
      repo: data
    })
  } catch (error) {
    console.error('Error in POST /api/repos:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to update repository'
      },
      { status: 500 }
    )
  }
}
