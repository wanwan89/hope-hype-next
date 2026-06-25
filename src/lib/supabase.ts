import { createClient } from '@supabase/supabase-js';

// Ambil URL dan Key dari environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 🔥 VALIDASI KERAS: Jangan pakai placeholder! 
// Biarkan konsol menjerit kalau env-nya kosong biar kita tahu ada yang salah.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "❌ FATAL ERROR: NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan!\n" +
    "Pastikan file .env atau .env.local kamu sudah terisi dengan benar sebelum melakukan build."
  );
}

// Inisialisasi Supabase Client
export const supabase = createClient(
  // Paksa tipe data menjadi string karena kita butuh URL yang asli
  supabaseUrl as string, 
  supabaseAnonKey as string,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Memastikan storage hanya diakses di sisi Client (Browser) agar tidak error saat SSR
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce',
    }
  }
);
