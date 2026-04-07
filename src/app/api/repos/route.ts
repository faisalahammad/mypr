import { createSupabaseRouteHandlerClient, createSupabaseServiceClient } from '@/lib/supabase'
import { getUserRepos, type GitHubRepo } from '@/lib/github'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get session from cookie
    const supabase = createSupabaseRouteHandlerClient(request)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Please log in to continue' },
        { status: 401 }
      )
    }

    // Get user profile with GitHub username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('github_username, github_access_token')
      .eq('id', session.user.id)
      .single()

    type ProfileType = {
      github_username: string
      github_access_token: string
    }

    const typedProfile = profile as ProfileType | null

    if (profileError || !typedProfile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found', message: 'User profile not found' },
        { status: 404 }
      )
    }

    if (!typedProfile.github_access_token) {
      return NextResponse.json(
        { success: false, error: 'No GitHub token', message: 'GitHub access token not found' },
        { status: 400 }
      )
    }

    // Fetch repositories from GitHub
    const githubRepos = await getUserRepos(
      typedProfile.github_access_token,
      typedProfile.github_username
    )

    // Fetch active repositories from database
    const { data: activeRepos, error: activeReposError } = await supabase
      .from('repositories')
      .select('repo_full_name, is_active')
      .eq('user_id', session.user.id)

    if (activeReposError) {
      console.error('Error fetching active repos:', activeReposError)
    }

    type ActiveRepoType = {
      repo_full_name: string
      is_active: boolean
    }

    const typedActiveRepos = activeRepos as ActiveRepoType[] | null

    // Create a map of active repos
    const activeRepoMap = new Map<string, boolean>()
    typedActiveRepos?.forEach(repo => {
      activeRepoMap.set(repo.repo_full_name, repo.is_active)
    })

    // Merge GitHub repos with database active status
    const repos = githubRepos.map(repo => ({
      ...repo,
      is_active: activeRepoMap.get(repo.full_name) || false
    }))

    const activeCount = repos.filter(r => r.is_active).length

    return NextResponse.json({
      success: true,
      repos,
      total_count: repos.length,
      active_count: activeCount
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

    // Upsert repository using service role client
    const serviceClient = createSupabaseServiceClient()

    const repoData = {
      user_id: session.user.id,
      repo_full_name,
      is_active
    } as Database['public']['Tables']['repositories']['Insert']

    const { data, error } = await serviceClient
      .from('repositories')
      .upsert(repoData, {
        onConflict: 'user_id,repo_full_name'
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting repository:', error)
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
