/**
 * Migration script to run SQL migrations via Supabase REST API
 * Run with: npx tsx scripts/run-migration.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function executeMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🚀 Starting migration...')

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    // Execute the migration using PostgreSQL RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!')
    console.log('Database schema created with:')
    console.log('  - profiles table')
    console.log('  - follows table')
    console.log('  - repositories table')
    console.log('  - pull_requests table')
    console.log('  - RLS policies enabled')
    console.log('  - Indexes created')
    console.log('  - User creation trigger set up')

  } catch (error) {
    console.error('❌ Error executing migration:', error)
    process.exit(1)
  }
}

executeMigration()
