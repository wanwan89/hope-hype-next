import { createClient } from '@supabase/supabase-js';

// FIX: Gunakan URL placeholder jika env kosong, JANGAN gunakan string kosong ''
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn("⚠️ Warning: Supabase URL atau Key tidak ditemukan di .env.local/Vercel!");
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Memastikan storage hanya diakses di sisi Client (Browser)
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce',
    }
  }
);
