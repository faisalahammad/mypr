import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './supabase'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Re-export Database type from supabase.ts
export type { Database } from './supabase'

/**
 * Client for use in browser/client components
 * This can be safely imported in client components
 */
export const createSupabaseClient = () => {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Singleton instance
let browserClient: ReturnType<typeof createSupabaseClient> | null = null

export const getSupabaseClient = () => {
  if (!browserClient) {
    browserClient = createSupabaseClient()
  }
  return browserClient
}
