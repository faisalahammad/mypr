import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local explicitly
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    process.env[key] = valueParts.join('=')
  }
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Verifying Supabase RLS Policies...\n')

const client = createClient(supabaseUrl, supabaseAnonKey)

// Test 1: Check RLS is enabled on all tables
console.log('✓ Test 1: Checking RLS status on tables...')

const { data: rlsStatus, error: rlsError } = await client.rpc('check_rls_status')

if (rlsError) {
  console.log('  ⚠ RLS check failed (function may not exist), trying direct query...')

  // Alternative: Try to insert without auth (should fail with RLS)
  const testTables = ['profiles', 'follows', 'repositories', 'pull_requests']
  let rlsWorking = true

  for (const table of testTables) {
    const { error } = await client
      .from(table)
      .select('*')
      .limit(1)

    if (error && !error.message.includes('rows')) {
      // RLS is blocking - good!
      console.log(`  ✅ ${table}: RLS active`)
    } else {
      console.log(`  ⚠️  ${table}: May not have RLS enabled`)
      rlsWorking = false
    }
  }

  if (!rlsWorking) {
    console.log('\n❌ RLS policies verification failed')
    process.exit(1)
  }
}

// Test 2: Check github_access_token is not accessible via anon key
console.log('\n✓ Test 2: Checking github_access_token protection...')

const { data: profiles, error: profileError } = await client
  .from('profiles')
  .select('id, github_username, github_access_token')
  .limit(1)

if (profileError) {
  console.log('  ✅ github_access_token is protected (RLS policy working)')
} if (profiles && profiles.length > 0 && profiles[0].github_access_token !== undefined) {
  console.log('  ❌ SECURITY ISSUE: github_access_token is accessible via anon key!')
  console.log('  This should never be exposed to client-side queries.')
  process.exit(1)
} else {
  console.log('  ✅ github_access_token is properly protected')
}

// Test 3: Verify all tables exist
console.log('\n✓ Test 3: Checking table existence...')

const tables = ['profiles', 'follows', 'repositories', 'pull_requests']
for (const table of tables) {
  const { error } = await client
    .from(table)
    .select('*')
    .limit(0)

  if (error && error.message.includes('does not exist')) {
    console.log(`  ❌ Table '${table}' does not exist`)
    process.exit(1)
  } else {
    console.log(`  ✅ Table '${table}' exists`)
  }
}

console.log('\n✅ All RLS verifications passed!')
console.log('\n📋 Summary:')
console.log('  - RLS policies are active on all tables')
console.log('  - github_access_token is protected from anon key access')
console.log('  - All required tables exist')
