export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

export const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();

export const supabaseServiceRoleKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing');
}

if (!supabasePublicKey) {
  throw new Error(
    'A public Supabase key is missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY.'
  );
}
