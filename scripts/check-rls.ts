import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkRLS() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔒 Checking Row Level Security status...\n')

  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'follows', 'repositories', 'pull_requests')
      ORDER BY tablename;
    `
  })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(data)
}

checkRLS()
