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

  // Cek kalau user udah login, langsung lempar ke home
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
    if (!email) return showNotif(t('forgot_pass_error', 'Ketik email lo dulu di kolom Email!'), "warning");

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password"
    });

    setIsLoading(false);
    if (error) {
      showNotif(error.message, "error");
    } else {
      showNotif(t('forgot_pass_success', 'Berhasil! Cek email buat reset password.'), "success");
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
        showNotif(t('login_success_notif', 'Selamat datang kembali, Bree!'), "success");
        router.push('/');
      }
    } else {
      // --- SIGNUP LOGIC ---
      if (!username) {
        setIsLoading(false);
        return showNotif("Isi username dulu!", "warning");
      }
      if (!agreed) {
        setIsLoading(false);
        return showNotif("Ceklis syarat dan ketentuannya!", "warning");
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
        showNotif(t('signup_success_notif', 'Berhasil daftar! Cek email untuk aktivasi.'), "success");
        setIsSignUpMode(false); // Balik ke login
      }
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        {/* Header Logo/Title */}
        <div className="auth-header">
          <img src="/asets/png/book.png" alt="Logo" className="auth-logo" />
          <h1>HypeTalk</h1>
          <p id="subTitle">
            {isSignUpMode 
              ? t('signup_subtitle', 'Bikin akun buat pamer karya lo') 
              : t('login_subtitle', 'Login dulu buat lanjut cari hype')}
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
                  <option value="user">User Biasa</option>
                  <option value="creator">Kreator Konten</option>
                </select>
              </div>

              {role === 'creator' && (
                <div className="input-group-auth creator-type-select">
                  <span className="material-icons">category</span>
                  <select value={creatorType} onChange={(e) => setCreatorType(e.target.value)}>
                    <option value="karya">Art/Karya</option>
                    <option value="photography">Photography</option>
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
                  <span className="checkmark"></span>
                  Gue setuju sama aturan main di sini.
                </label>
              </div>
            </div>
          )}

          {/* Forgot Password Link (Only Login) */}
          {!isSignUpMode && (
            <a href="#" className="forgot-link" onClick={handleForgotPassword}>
              {t('forgot_password', 'Lupa password?')}
            </a>
          )}

          {/* Submit Button */}
          <button type="submit" className="btn-auth-main" disabled={isLoading}>
            {isLoading ? t('loading', 'Loading...') : (
              isSignUpMode ? t('signup_btn', 'Daftar Akun') : t('login_btn', 'Masuk Sekarang')
            )}
          </button>
        </form>

        <div className="divider-auth">
          <span>{t('or_divider', 'Atau masuk dengan')}</span>
        </div>

        {/* Google Login */}
        <button onClick={handleGoogleLogin} className="btn-google">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Logo.svg" alt="Google" />
          Google
        </button>

        <p className="footer-auth">
          {isSignUpMode ? 'Udah punya akun?' : 'Belum ada akun?'} 
          <span onClick={() => setIsSignUpMode(!isSignUpMode)}>
            {isSignUpMode ? ' Login' : ' Daftar'}
          </span>
        </p>
      </div>
    </div>
  );
}
