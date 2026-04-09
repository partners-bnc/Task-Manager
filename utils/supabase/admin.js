import { createClient } from '@supabase/supabase-js';
import { supabaseServiceRoleKey, supabaseUrl } from '@/utils/supabase/config';

if (!supabaseServiceRoleKey) {
  throw new Error('NEXT_SUPABASE_SERVICE_ROLE_KEY is missing');
}

export const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
