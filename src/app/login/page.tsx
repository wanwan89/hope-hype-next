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
  | 'find-account'
  | 'find-account-result';

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
  } | null>(null);

  // --- Reset password ---
  const [resetEmail, setResetEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Referensi untuk kotak OTP
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ---------- Helper format nomor telepon ----------
  const getFormattedPhone = (raw: string) => {
    let cleaned = raw.replace(/\s+/g, '');
    if (cleaned.startsWith('0')) cleaned = '+62' + cleaned.slice(1);
    else if (cleaned.length > 0 && !cleaned.startsWith('+')) cleaned = '+' + cleaned;
    return cleaned;
  };

  // ---------- Cek sesi & auto-create profile ----------
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const userId = session.user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();

        if (!profile) {
          const userMeta = session.user.user_metadata;
          const rawName =
            userMeta?.full_name ||
            userMeta?.name ||
            session.user.email?.split('@')[0] ||
            session.user.phone?.replace('+', '') ||
            'user_hype';
          const safeUsername = rawName.toLowerCase().replace(/\s+/g, '');
          const safeAvatar =
            userMeta?.avatar_url ||
            userMeta?.picture ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${safeUsername}`;

          await supabase.from('profiles').insert([
            {
              id: userId,
              username: safeUsername,
              avatar_url: safeAvatar,
              role: 'user',
            },
          ]);
        }

        router.push('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // ---------- OAuth (Google) ----------
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    });
  };

  // ---------- Kirim OTP (email / telepon) ----------
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (step === 'input-email') {
        if (!email) {
          setIsLoading(false);
          return showNotif(t('email_required'), 'warning');
        }
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
        showNotif(t('otp_email_sent'), 'success');
      } else if (step === 'input-phone') {
        if (!phone) {
          setIsLoading(false);
          return showNotif(t('phone_required'), 'warning');
        }
        const formatted = getFormattedPhone(phone);
        const { error } = await supabase.auth.signInWithOtp({
          phone: formatted,
          options: {
            channel: phoneChannel,
            shouldCreateUser: true,
          },
        });
        if (error) throw error;
        showNotif(
          `Kode OTP dikirim melalui ${phoneChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`,
          'success',
        );
      }
      // Pindah ke langkah verifikasi OTP
      setStep('otp');
    } catch (error: any) {
      showNotif(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Verifikasi OTP (kotak 6 digit) ----------
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
      // Redirect otomatis oleh onAuthStateChange
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
      const identifier =
        searchType === 'email'
          ? searchEmail.trim()
          : getFormattedPhone(searchPhone);
      if (!identifier) {
        setIsLoading(false);
        return showNotif('Masukkan email atau nomor telepon', 'warning');
      }

      // Panggil API backend (wajib dibuat)
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
        });
      } else {
        setSearchResult({ exists: false });
      }
    } catch (error) {
      showNotif('Gagal memeriksa akun', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Lanjut login setelah menemukan akun
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

  // ---------- Render berdasarkan step ----------
  const renderMethodSelection = () => (
    <>
      <div className="method-selection">
        <button
          className="method-btn"
          onClick={() => setStep('input-email')}
        >
          <span className="material-icons">email</span>
          Masuk dengan Email
        </button>
        <button
          className="method-btn"
          onClick={() => setStep('input-phone')}
        >
          <span className="material-icons">phone</span>
          Masuk dengan Nomor Telepon
        </button>
        <button
          className="method-btn google-btn"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg> {/* Icon Google */} </svg>
          Masuk dengan Google
        </button>
      </div>

      <div className="auth-links">
        <button className="link-btn" onClick={() => setStep('find-account')}>
          Cari akun / Lupa akun?
        </button>
        <button className="link-btn" onClick={() => setShowForgotPassword(true)}>
          Lupa kata sandi?
        </button>
      </div>
    </>
  );

  const renderEmailForm = () => (
    <form onSubmit={handleSendOtp} className="auth-form">
      <div className="input-group-auth">
        <span className="material-icons">mail_outline</span>
        <input
          type="email"
          placeholder="user@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn-auth-main" disabled={isLoading}>
        {isLoading ? 'Mengirim...' : 'Kirim Kode OTP'}
      </button>
      <button type="button" className="back-link" onClick={() => setStep('method-selection')}>
        ← Kembali
      </button>
    </form>
  );

  const renderPhoneForm = () => (
    <form onSubmit={handleSendOtp} className="auth-form">
      <div className="input-group-auth">
        <span className="material-icons">phone</span>
        <input
          type="tel"
          placeholder="0812xxx atau +62812xxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <div className="channel-selector">
        <label>
          <input
            type="radio"
            name="channel"
            value="whatsapp"
            checked={phoneChannel === 'whatsapp'}
            onChange={() => setPhoneChannel('whatsapp')}
          />
          WhatsApp
        </label>
        <label>
          <input
            type="radio"
            name="channel"
            value="sms"
            checked={phoneChannel === 'sms'}
            onChange={() => setPhoneChannel('sms')}
          />
          SMS
        </label>
      </div>
      <button type="submit" className="btn-auth-main" disabled={isLoading}>
        {isLoading ? 'Mengirim...' : 'Kirim Kode OTP'}
      </button>
      <button type="button" className="back-link" onClick={() => setStep('method-selection')}>
        ← Kembali
      </button>
    </form>
  );

  const renderOtpInput = () => {
    // Fungsi untuk mengisi 6 digit kotak
    const handleOtpChange = (index: number, value: string) => {
      if (!/^\d?$/.test(value)) return; // hanya angka
      const newOtp = otpToken.split('');
      newOtp[index] = value;
      const joined = newOtp.join('').slice(0, 6);
      setOtpToken(joined);

      // Auto-fokus ke kotak berikutnya
      if (value && index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !otpToken[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    };

    return (
      <form onSubmit={handleVerifyOtp} className="otp-form">
        <p style={{ textAlign: 'center' }}>Masukkan 6 digit kode OTP</p>
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
        <button
          type="button"
          className="back-link"
          onClick={() => {
            setStep(email ? 'input-email' : 'input-phone');
            setOtpToken('');
          }}
        >
          ← Kembali / Ubah Tujuan
        </button>
      </form>
    );
  };

  const renderFindAccount = () => (
    <form onSubmit={handleFindAccount} className="auth-form">
      <h4>Cari akun Anda</h4>
      <div className="tab-mini">
        <button
          type="button"
          className={searchType === 'email' ? 'active' : ''}
          onClick={() => setSearchType('email')}
        >
          Email
        </button>
        <button
          type="button"
          className={searchType === 'phone' ? 'active' : ''}
          onClick={() => setSearchType('phone')}
        >
          Telepon
        </button>
      </div>

      {searchType === 'email' ? (
        <input
          type="email"
          placeholder="Email terdaftar"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          required
        />
      ) : (
        <input
          type="tel"
          placeholder="Nomor telepon"
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          required
        />
      )}

      <button type="submit" className="btn-auth-main" disabled={isLoading}>
        {isLoading ? 'Mencari...' : 'Cari Akun'}
      </button>

      {searchResult && (
        <div className="search-result">
          {searchResult.exists ? (
            <>
              <p>✅ Akun ditemukan: <strong>{searchResult.username}</strong></p>
              <button type="button" onClick={handleLoginFoundAccount} className="btn-auth-main">
                Lanjutkan Login
              </button>
            </>
          ) : (
            <p>❌ Tidak ada akun dengan {searchType === 'email' ? 'email' : 'nomor'} tersebut.</p>
          )}
        </div>
      )}

      <button type="button" className="back-link" onClick={() => setStep('method-selection')}>
        ← Kembali
      </button>
    </form>
  );

  // ---------- Main Render ----------
  if (showForgotPassword) {
    return (
      <div className="auth-wrapper fade-in-scale">
        <div className="auth-container">
          <h3>Lupa Kata Sandi</h3>
          <input
            type="email"
            placeholder="Email terdaftar"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />
          <button onClick={handleForgotPassword} className="btn-auth-main" disabled={isLoading}>
            Kirim Link Reset
          </button>
          <button onClick={() => setShowForgotPassword(false)} className="back-link">
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper fade-in-scale">
      <div className="auth-container">
        {/* Header brand tetap */}
        <div className="auth-header">
          <img src="/brand.png" alt="Hypeco" width="45" height="45" />
          <h1>hypeco</h1>
          <p>
            {step === 'method-selection'
              ? t('login_subtitle', 'Masuk ke HypeTalk hari ini.')
              : step === 'otp'
              ? t('otp_subtitle', 'Masukkan kode verifikasi')
              : t('login_subtitle')}
          </p>
        </div>

        {/* Render sesuai step */}
        {step === 'method-selection' && renderMethodSelection()}
        {step === 'input-email' && renderEmailForm()}
        {step === 'input-phone' && renderPhoneForm()}
        {step === 'otp' && renderOtpInput()}
        {step === 'find-account' && renderFindAccount()}
      </div>
    </div>
  );
}