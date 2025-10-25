// Supabase client (frontend)
import { createClient } from '@supabase/supabase-js'

const url = process.env.REACT_APP_SUPABASE_URL
const key = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing Supabase env vars. Define REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(url, key)


