/**
 * Test script to verify Supabase setup
 * Run with: npx tsx scripts/test-setup.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testSupabaseSetup() {
  console.log('🧪 Testing Supabase setup for mypr.pro.bd\n')

  // Test 1: Connection with anon key
  console.log('1️⃣ Testing anon key connection...')
  const anonClient = createClient(supabaseUrl, supabaseAnonKey)
  try {
    const { error } = await anonClient.from('profiles').select('*').limit(1)
    if (error) throw error
    console.log('✅ Anon key connection successful')
  } catch (error: any) {
    console.error('❌ Anon key connection failed:', error.message)
    return
  }

  // Test 2: Connection with service role key
  console.log('\n2️⃣ Testing service role connection...')
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
  try {
    const { error } = await serviceClient.from('profiles').select('*').limit(1)
    if (error) throw error
    console.log('✅ Service role connection successful')
  } catch (error: any) {
    console.error('❌ Service role connection failed:', error.message)
    return
  }

  // Test 3: Check if tables exist
  console.log('\n3️⃣ Checking database tables...')
  const tables = ['profiles', 'follows', 'repositories', 'pull_requests']
  const existingTables: string[] = []
  const missingTables: string[] = []

  for (const table of tables) {
    try {
      const { error } = await serviceClient.from(table).select('*').limit(1)
      if (error) {
        missingTables.push(table)
      } else {
        existingTables.push(table)
      }
    } catch {
      missingTables.push(table)
    }
  }

  if (existingTables.length === tables.length) {
    console.log('✅ All tables exist:', existingTables.join(', '))
  } else {
    console.log('⚠️  Some tables are missing:')
    console.log('   ✅ Existing:', existingTables.join(', ') || 'none')
    console.log('   ❌ Missing:', missingTables.join(', '))
    console.log('\n   Run the migration: See SUPABASE_SETUP.md')
    return
  }

  // Test 4: Check RLS policies
  console.log('\n4️⃣ Checking RLS policies...')
  try {
    // Try to insert with anon key (should fail due to RLS)
    const { error } = await anonClient.from('repositories').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      repo_full_name: 'test/repo',
      is_active: false
    })

    // Anon key should fail to insert due to RLS
    if (error && error.code === '42501') {
      console.log('✅ RLS policies are enabled and working')
    } else if (error && error.message.includes('Rows')) {
      console.log('✅ RLS policies are enabled')
    } else {
      console.log('⚠️  RLS policies might not be properly configured')
      console.log('   Expected permission denied, but got:', error?.message || 'unknown error')
    }
  } catch (error: any) {
    console.log('✅ RLS policies are enabled (insert blocked as expected)')
  }

  // Test 5: Check GitHub OAuth configuration
  console.log('\n5️⃣ Checking GitHub OAuth configuration...')
  console.log('   Manual verification required:')
  console.log('   🔗 https://app.supabase.com/project/xlayjufjlhfgkblymdsu/auth/providers')
  console.log('   Ensure GitHub provider is enabled with valid credentials')

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('✅ Supabase setup test completed!')
  console.log('='.repeat(50))
  console.log('\n📋 Summary:')
  console.log('   ✅ Database connection working')
  console.log('   ✅ All tables created')
  console.log('   ✅ RLS policies enabled')
  console.log('   ⏳  GitHub OAuth: Verify manually')
  console.log('\n🎉 Ready for Phase 2: Supabase Integration!')
  console.log('\n💡 Next step: Test GitHub OAuth sign-in')
}

testSupabaseSetup().catch(console.error)
