/**
 * Supabase test helpers
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const testClient = createClient(supabaseUrl, supabaseServiceKey)

export async function cleanupTestData(userId: string) {
  // Delete test data in correct order due to foreign keys
  await testClient.from('pull_requests').delete().eq('user_id', userId)
  await testClient.from('repositories').delete().eq('user_id', userId)
  await testClient.from('follows').delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`)
  await testClient.from('profiles').delete().eq('id', userId)

  // Delete auth user
  await testClient.auth.admin.deleteUser(userId)
}

export async function createTestUserProfile(githubUsername: string) {
  // Create auth user
  const { data: userData, error: userError } = await testClient.auth.admin.createUser({
    email: `test-${githubUsername}@example.com`,
    email_confirm: true,
    user_metadata: {
      user_name: githubUsername,
      name: `Test ${githubUsername}`,
      avatar_url: `https://github.com/${githubUsername}.png`
    }
  })

  if (userError || !userData.user) {
    throw new Error(`Failed to create test user: ${userError?.message}`)
  }

  // Create profile
  const { data: profile, error: profileError } = await testClient
    .from('profiles')
    .insert({
      id: userData.user.id,
      github_username: githubUsername,
      github_avatar_url: `https://github.com/${githubUsername}.png`,
      github_access_token: process.env.TEST_GITHUB_TOKEN || 'test-token',
      display_name: `Test ${githubUsername}`
    })
    .select()
    .single()

  if (profileError) {
    await testClient.auth.admin.deleteUser(userData.user.id)
    throw new Error(`Failed to create profile: ${profileError.message}`)
  }

  return profile
}
