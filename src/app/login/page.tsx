'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import './Login.css';

// ---------- Tipe step ----------
type Step =
  | 'method-selection'
  | 'input-email'
  | 'input-phone'
  | 'otp'
  | 'find-account';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();

  // --- Step navigasi ---
  const [step, setStep] = useState<Step>('method-selection');

  // --- Data form ---
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneChannel, setPhoneChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [otpToken, setOtpToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Fitur "Cari Akun" ---
  const [searchType, setSearchType] = useState<'email' | 'phone'>('email');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState<{
    exists: boolean;
    username?: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
  } | null>(null);

  // --- Reset password ---
  const [resetEmail, setResetEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Referensi untuk kotak OTP
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ---------- Helper format nomor & sensor username ----------
  const getFormattedPhone = (raw: string) => {
    let cleaned = raw.replace(/\s+/g, '');
    if (cleaned.startsWith('0')) cleaned = '+62' + cleaned.slice(1);
    else if (cleaned.length > 0 && !cleaned.startsWith('+')) cleaned = '+' + cleaned;
    return cleaned;
  };

  const maskUsername = (name?: string) => {
    if (!name) return '';
    if (name.length <= 5) return name.slice(0, 2) + '***';
    const first = name.slice(0, 4);
    const last = name.slice(-3);
    return `${first}***${last}`;
  };

  // ---------- Cek sesi & auto-create profile ----------
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const userId = session.user.id;
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single();

        if (!profile) {
          const userMeta = session.user.user_metadata;
          const rawName = userMeta?.full_name || userMeta?.name || session.user.email?.split('@')[0] || session.user.phone?.replace('+', '') || 'user_hype';
          const safeUsername = rawName.toLowerCase().replace(/\s+/g, '');
          const safeAvatar = userMeta?.avatar_url || userMeta?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${safeUsername}`;

          await supabase.from('profiles').insert([{ id: userId, username: safeUsername, avatar_url: safeAvatar, role: 'user' }]);
        }
        router.push('/');
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [router]);

  // ---------- OAuth (Google) ----------
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    });
  };

  // ---------- Kirim OTP ----------
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (step === 'input-email') {
        if (!email) throw new Error(t('email_required'));
        const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
        if (error) throw error;
        showNotif(t('otp_email_sent'), 'success');
      } else if (step === 'input-phone') {
        if (!phone) throw new Error(t('phone_required'));
        const formatted = getFormattedPhone(phone);
        const { error } = await supabase.auth.signInWithOtp({
          phone: formatted,
          options: { channel: phoneChannel, shouldCreateUser: true },
        });
        if (error) throw error;
        showNotif(`Kode OTP dikirim melalui ${phoneChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`, 'success');
      }
      setStep('otp');
    } catch (error: any) {
      showNotif(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Verifikasi OTP ----------
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otpToken.trim();
    if (token.length !== 6) return showNotif('Kode OTP harus 6 digit', 'warning');
    setIsLoading(true);

    try {
      const verifyParams: any = {
        token,
        type: step === 'input-email' || (step === 'otp' && email) ? 'email' : 'sms',
      };
      if (email) verifyParams.email = email;
      else if (phone) verifyParams.phone = getFormattedPhone(phone);

      const { error } = await supabase.auth.verifyOtp(verifyParams);
      if (error) throw error;
      showNotif(t('verify_success'), 'success');
    } catch (error: any) {
      showNotif(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Pencarian akun ----------
  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSearchResult(null);

    try {
      const identifier = searchType === 'email' ? searchEmail.trim() : getFormattedPhone(searchPhone);
      if (!identifier) throw new Error('Masukkan email atau nomor telepon');

      // Simulasi pemanggilan API (Ganti dengan endpoint API aslimu)
      const res = await fetch('/api/check-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: searchType, identifier }),
      });
      const data = await res.json();

      if (data.exists) {
        setSearchResult({
          exists: true,
          username: data.username,
          email: data.email,
          phone: data.phone,
          avatar_url: data.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=hype', // Fallback image
        });
      } else {
        setSearchResult({ exists: false });
      }
    } catch (error: any) {
      showNotif(error.message || 'Gagal memeriksa akun', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginFoundAccount = () => {
    if (searchType === 'email') {
      setEmail(searchEmail);
      setStep('input-email');
    } else {
      setPhone(searchPhone);
      setStep('input-phone');
    }
    setSearchResult(null);
  };

  // ---------- Lupa kata sandi ----------
  const handleForgotPassword = async () => {
    if (!resetEmail) return showNotif('Masukkan email terdaftar', 'warning');
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      showNotif('Email reset password telah dikirim', 'success');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      showNotif(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================================
  // RENDER BLOCKS
  // =====================================================================

  const renderMethodSelection = () => (
    <>
      <div className="method-selection">
        <button className="method-btn" onClick={() => setStep('input-email')}>
          <span className="material-icons">email</span> Masuk dengan Email
        </button>
        <button className="method-btn" onClick={() => setStep('input-phone')}>
          <span className="material-icons">phone</span> Masuk dengan Nomor Telepon
        </button>
        <button className="method-btn google-btn" onClick={handleGoogleLogin} disabled={isLoading}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Masuk dengan Google
        </button>
      </div>
      <div className="auth-links">
        <button className="link-btn" onClick={() => setStep('find-account')}>Cari akun Anda</button>
        <button className="link-btn" onClick={() => setShowForgotPassword(true)}>Lupa kata sandi?</button>
      </div>
    </>
  );

  const renderOtpInput = () => {
    const handleOtpChange = (index: number, value: string) => {
      if (!/^\d?$/.test(value)) return;
      const newOtp = otpToken.split('');
      newOtp[index] = value;
      setOtpToken(newOtp.join('').slice(0, 6));
      if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !otpToken[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    };

    return (
      <form onSubmit={handleVerifyOtp} className="otp-form slide-in">
        <div className="otp-boxes">
          {Array.from({ length: 6 }).map((_, i) => (
            <input
              key={i}
              ref={(el) => { otpInputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={otpToken[i] || ''}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className="otp-digit"
              autoFocus={i === 0}
            />
          ))}
        </div>
        <button type="submit" className="btn-auth-main" disabled={isLoading}>
          {isLoading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
        </button>
        <button type="button" className="back-link" onClick={() => { setStep(email ? 'input-email' : 'input-phone'); setOtpToken(''); }}>
          ← Ubah Tujuan
        </button>
      </form>
    );
  };

  const renderFindAccount = () => (
    <form onSubmit={handleFindAccount} className="auth-form slide-in">
      <h4 style={{ marginBottom: '16px' }}>Cari akun Anda</h4>
      
      {/* Tampilan Avatar jika ketemu */}
      {searchResult?.exists && searchResult.avatar_url && (
        <div className="profile-preview-container fade-in-scale">
          <img src={searchResult.avatar_url} alt="Profile" className="profile-preview-img" />
        </div>
      )}

      <div className="tab-mini">
        <button type="button" className={searchType === 'email' ? 'active' : ''} onClick={() => setSearchType('email')}>Email</button>
        <button type="button" className={searchType === 'phone' ? 'active' : ''} onClick={() => setSearchType('phone')}>Telepon</button>
      </div>

      {/* Input sudah dibungkus dengan input-group-auth agar ada CSS nya */}
      <div className="input-group-auth">
        {searchType === 'email' ? (
          <input type="email" placeholder="Email terdaftar" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} required />
        ) : (
          <input type="tel" placeholder="Nomor telepon" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} required />
        )}
      </div>

      <button type="submit" className="btn-auth-main" disabled={isLoading}>
        {isLoading ? 'Mencari...' : 'Mencari...'}
      </button>

      {searchResult && (
        <div className="search-result fade-in-scale">
          {searchResult.exists ? (
            <>
              <div className="result-status">
                <span className="material-icons" style={{ color: '#10b981', fontSize: '18px' }}>check_box</span>
                <p>Akun ditemukan: <strong>{maskUsername(searchResult.username)}</strong></p>
              </div>
              <button type="button" onClick={handleLoginFoundAccount} className="btn-auth-main secondary-btn">
                Lanjutkan Login
              </button>
            </>
          ) : (
            <p style={{ color: '#ef4444' }}>Tidak ada akun yang terdaftar.</p>
          )}
        </div>
      )}

      <button type="button" className="back-link" onClick={() => { setStep('method-selection'); setSearchResult(null); }}>← Kembali</button>
    </form>
  );

  // =====================================================================
  // MAIN RENDER
  // =====================================================================

  if (showForgotPassword) {
    return (
      <div className="auth-wrapper fade-in-scale">
        <div className="auth-container">
          <h2 style={{ marginBottom: '20px' }}>Lupa Kata Sandi</h2>
          {/* Input sudah dibungkus dengan input-group-auth */}
          <div className="input-group-auth">
            <input type="email" placeholder="Email terdaftar" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
          </div>
          <button onClick={handleForgotPassword} className="btn-auth-main" disabled={isLoading}>
            Kirim Link Reset
          </button>
          <button onClick={() => setShowForgotPassword(false)} className="back-link">← Kembali</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper fade-in-scale">
      <div className="auth-container">
        <div className="auth-header">
          <h1 style={{ fontSize: '32px' }}># hypeco</h1>
          <p>
            {step === 'method-selection' ? 'Login dulu buat lanjut cari hype' :
             step === 'otp' ? 'Masukkan kode verifikasi' : 'Login dulu buat lanjut cari hype'}
          </p>
        </div>

        {step === 'method-selection' && renderMethodSelection()}
        
        {step === 'input-email' && (
          <form onSubmit={handleSendOtp} className="auth-form slide-in">
            <div className="input-group-auth"><input type="email" placeholder="user@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <button type="submit" className="btn-auth-main" disabled={isLoading}>{isLoading ? 'Mengirim...' : 'Kirim Kode OTP'}</button>
            <button type="button" className="back-link" onClick={() => setStep('method-selection')}>← Kembali</button>
          </form>
        )}

        {step === 'input-phone' && (
          <form onSubmit={handleSendOtp} className="auth-form slide-in">
            <div className="input-group-auth"><input type="tel" placeholder="0812xxx / +628..." value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
            <div className="channel-selector">
              <label><input type="radio" value="whatsapp" checked={phoneChannel === 'whatsapp'} onChange={() => setPhoneChannel('whatsapp')} /> WhatsApp</label>
              <label><input type="radio" value="sms" checked={phoneChannel === 'sms'} onChange={() => setPhoneChannel('sms')} /> SMS</label>
            </div>
            <button type="submit" className="btn-auth-main" disabled={isLoading}>{isLoading ? 'Mengirim...' : 'Kirim Kode OTP'}</button>
            <button type="button" className="back-link" onClick={() => setStep('method-selection')}>← Kembali</button>
          </form>
        )}

        {step === 'otp' && renderOtpInput()}
        {step === 'find-account' && renderFindAccount()}
      </div>
    </div>
  );
}
