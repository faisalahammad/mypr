/**
 * Test utilities for Phase 4 functionality
 */

import { createSupabaseServiceClient } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

// Test helpers
export const createTestUser = async (githubUsername: string) => {
  const supabase = createSupabaseServiceClient()

  // Check if user already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('github_username', githubUsername)
    .single()

  if (existing) {
    return existing
  }

  // Create test user
  const { data, error } = await supabase.auth.admin.createUser({
    email: `test-${githubUsername}@example.com`,
    email_confirm: true,
    user_metadata: {
      user_name: githubUsername,
      name: `Test ${githubUsername}`,
      avatar_url: `https://github.com/${githubUsername}.png`
    }
  })

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`)
  }

  // Create profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      github_username: githubUsername,
      github_avatar_url: `https://github.com/${githubUsername}.png`,
      github_access_token: 'test_token',
      display_name: `Test ${githubUsername}`
    })
    .select()
    .single()

  if (profileError) {
    throw new Error(`Failed to create profile: ${profileError.message}`)
  }

  return profile
}

export const cleanupTestUser = async (userId: string) => {
  const supabase = createSupabaseServiceClient()

  // Delete profile (cascade will delete related records)
  await supabase.from('profiles').delete().eq('id', userId)

  // Delete auth user
  await supabase.auth.admin.deleteUser(userId)
}

export const createTestRepositories = async (userId: string, repos: string[]) => {
  const supabase = createSupabaseServiceClient()

  const { data, error } = await supabase
    .from('repositories')
    .insert(
      repos.map(repo_full_name => ({
        user_id: userId,
        repo_full_name,
        is_active: true
      }))
    )
    .select()

  if (error) {
    throw new Error(`Failed to create test repositories: ${error.message}`)
  }

  return data
}

export const createTestPullRequests = async (
  userId: string,
  prs: Array<{
    repo_full_name: string
    pr_number: number
    title: string
    pr_url: string
    merged_at: string
  }>
) => {
  const supabase = createSupabaseServiceClient()

  const { data, error } = await supabase
    .from('pull_requests')
    .insert(
      prs.map(pr => ({
        user_id: userId,
        ...pr,
        body_summary: 'Test PR body',
        additions: 10,
        deletions: 5,
        commits_count: 2
      }))
    )
    .select()

  if (error) {
    throw new Error(`Failed to create test PRs: ${error.message}`)
  }

  return data
}

// Mock GitHub API responses
export const mockGitHubPRs = [
  {
    id: 123456789,
    number: 1,
    title: 'Add new feature',
    body: 'This PR adds a new feature',
    html_url: 'https://github.com/test/repo/pull/1',
    merged_at: '2024-01-15T10:30:00Z',
    additions: 100,
    deletions: 50,
    commits: 3,
    user: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png'
    },
    base: {
      repo: {
        full_name: 'test/repo'
      }
    }
  }
]
