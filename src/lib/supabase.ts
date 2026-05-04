import { createClient } from '@supabase/supabase-js';

// Di Next.js, variabel lingkungan untuk Client Side harus diawali dengan NEXT_PUBLIC_
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Ini akan muncul di terminal jika kamu lupa isi file .env.local
  console.warn("⚠️ Warning: Supabase URL atau Key tidak ditemukan di .env.local!");
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || '',
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
