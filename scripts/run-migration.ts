/**
 * Migration script to run SQL migrations via Supabase REST API
 * Run with: npx tsx scripts/run-migration.ts
 */

import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function executeMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🚀 Starting migration...')

  try {
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
    const migrationFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort()

    if (migrationFiles.length === 0) {
      console.error('❌ No migration files found in supabase/migrations')
      process.exit(1)
    }

    const sql = migrationFiles
      .map((file) => readFileSync(join(migrationsDir, file), 'utf-8'))
      .join('\n\n')

    // Execute the migration using PostgreSQL RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migrations completed successfully!')
    console.log('Applied migration files:')
    for (const file of migrationFiles) {
      console.log(`  - ${file}`)
    }
    console.log('Database schema updated with:')
    console.log('  - profiles table')
    console.log('  - follows table')
    console.log('  - repositories table')
    console.log('  - pull_requests table')
    console.log('  - RLS policies enabled')
    console.log('  - Indexes created')
    console.log('  - User creation trigger set up')
    console.log('  - Public visibility RPCs/functions')

  } catch (error) {
    console.error('❌ Error executing migration:', error)
    process.exit(1)
  }
}

executeMigration()
