import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured =
  supabaseUrl && supabaseUrl !== 'your_supabase_url' &&
  supabaseAnonKey && supabaseAnonKey !== 'your_supabase_anon_key'

// Use placeholder values so createClient doesn't throw when unconfigured
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key'
)
