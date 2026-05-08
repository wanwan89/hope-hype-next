'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import './Login.css';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();

  // --- States ---
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // --- Form Data ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('user');
  const [creatorType, setCreatorType] = useState('karya');
  const [agreed, setAgreed] = useState(false);

  // Cek sesi login
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/');
    });
  }, [router]);

  // --- Handlers ---
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + "/" }
    });
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) return showNotif(t('forgot_pass_error', 'Silakan masukkan email Anda terlebih dahulu!'), "warning");

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password"
    });

    setIsLoading(false);
    if (error) {
      showNotif(error.message, "error");
    } else {
      showNotif(t('forgot_pass_success', 'Berhasil! Silakan periksa email Anda untuk mengatur ulang kata sandi.'), "success");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!isSignUpMode) {
      // --- LOGIN LOGIC ---
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        showNotif(error.message, "error");
        setIsLoading(false);
      } else {
        showNotif(t('login_success_notif', 'Selamat datang kembali!'), "success");
        router.push('/');
      }
    } else {
      // --- SIGNUP LOGIC ---
      if (!username) {
        setIsLoading(false);
        return showNotif("Nama pengguna tidak boleh kosong!", "warning");
      }
      if (!agreed) {
        setIsLoading(false);
        return showNotif("Anda harus menyetujui syarat dan ketentuan!", "warning");
      }

      const finalRole = role === 'creator' ? `creator_${creatorType}` : 'user';
      const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${username}`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, avatar_url: avatar, role: finalRole }
        }
      });

      setIsLoading(false);
      if (error) {
        showNotif(error.message, "error");
      } else {
        showNotif(t('signup_success_notif', 'Pendaftaran berhasil! Silakan periksa email Anda untuk aktivasi.'), "success");
        setIsSignUpMode(false); 
      }
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        
        {/* Header Logo/Title */}
        <div className="auth-header">
          <div className="auth-logo-box">
            {/* Logo Hype (SVG Murni) */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="36" height="36">
              <rect x="6" y="14" width="8" height="12" rx="4" fill="#3b82f6" />
              <rect x="26" y="14" width="8" height="12" rx="4" fill="#1e3a8a" />
              <path d="M10 20 H30" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <h1>HypeTalk</h1>
          <p id="subTitle">
            {isSignUpMode 
              ? t('signup_subtitle', 'Buat akun untuk membagikan karya Anda') 
              : t('login_subtitle', 'Masuk untuk melanjutkan ke HypeTalk')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email Input */}
          <div className="input-group-auth">
            <span className="material-icons">mail_outline</span>
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          {/* Username Input (Only Signup) */}
          {isSignUpMode && (
            <div className="input-group-auth slide-down">
              <span className="material-icons">person_outline</span>
              <input 
                type="text" 
                placeholder="Username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </div>
          )}

          {/* Password Input */}
          <div className="input-group-auth">
            <span className="material-icons">lock_outline</span>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <span 
              className="material-icons toggle-eye" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </div>

          {/* Role Selection (Only Signup) */}
          {isSignUpMode && (
            <div className="role-area slide-down">
              <div className="input-group-auth">
                <span className="material-icons">badge</span>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="user">Pengguna Biasa</option>
                  <option value="creator">Kreator Konten</option>
                </select>
              </div>

              {role === 'creator' && (
                <div className="input-group-auth creator-type-select">
                  <span className="material-icons">category</span>
                  <select value={creatorType} onChange={(e) => setCreatorType(e.target.value)}>
                    <option value="karya">Art / Karya</option>
                    <option value="photography">Fotografi</option>
                    <option value="thread">Penulis Thread</option>
                  </select>
                </div>
              )}

              <div className="terms-area">
                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={agreed} 
                    onChange={(e) => setAgreed(e.target.checked)} 
                  />
                  Saya menyetujui syarat dan ketentuan yang berlaku.
                </label>
              </div>
            </div>
          )}

          {/* Forgot Password Link (Only Login) */}
          {!isSignUpMode && (
            <a href="#" className="forgot-link" onClick={handleForgotPassword}>
              {t('forgot_password', 'Lupa kata sandi?')}
            </a>
          )}

          {/* Submit Button */}
          <button type="submit" className="btn-auth-main" disabled={isLoading}>
            {isLoading ? t('loading', 'Memproses...') : (
              isSignUpMode ? t('signup_btn', 'Daftar Akun') : t('login_btn', 'Masuk')
            )}
          </button>
        </form>

        <div className="divider-auth">
          <span>{t('or_divider', 'Atau masuk dengan')}</span>
        </div>

        {/* Google Login (SVG Murni) */}
        <button type="button" onClick={handleGoogleLogin} className="btn-google">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="22px" height="22px">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Google
        </button>

        <p className="footer-auth">
          {isSignUpMode ? 'Sudah punya akun?' : 'Belum punya akun?'} 
          <span onClick={() => setIsSignUpMode(!isSignUpMode)}>
            {isSignUpMode ? ' Masuk' : ' Daftar'}
          </span>
        </p>
      </div>
    </div>
  );
}
