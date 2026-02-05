import { createClient } from '@supabase/supabase-js'
import { getEnv } from './env'

const env = getEnv()
const url = env?.VITE_SUPABASE_URL
const anonKey = env?.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (set in .env or container env)')
}

export const supabase = createClient(url, anonKey)
