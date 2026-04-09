import { createBrowserClient } from '@supabase/ssr'
import { supabasePublicKey, supabaseUrl } from '@/utils/supabase/config'

export function createClient() {
  return createBrowserClient(
    supabaseUrl,
    supabasePublicKey
  )
}
