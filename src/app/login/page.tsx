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
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  
  // --- Form Data ---
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneChannel, setPhoneChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [otpToken, setOtpToken] = useState('');

  // Otomatis bersihkan spasi & format nomor ke standar internasional (+62)
  const getFormattedPhone = (rawPhone: string) => {
    let cleaned = rawPhone.replace(/\s+/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+62' + cleaned.slice(1);
    } else if (cleaned.length > 0 && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  };

  // Cek sesi login & auto-create profile jika pengguna baru
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const userId = session.user.id;
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single();
        
        if (!profile) {
          const userMeta = session.user.user_metadata;
          // Fallback username dari nama google, email prefix, atau nomor telpon
          const rawName = userMeta?.full_name || userMeta?.name || session.user.email?.split('@')[0] || session.user.phone?.replace('+', '') || 'user_hype';
          const safeUsername = rawName.toLowerCase().replace(/\s+/g, '');
          const safeAvatar = userMeta?.avatar_url || userMeta?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${safeUsername}`;

          await supabase.from('profiles').insert([{
            id: userId,
            username: safeUsername,
            avatar_url: safeAvatar,
            role: 'user'
          }]);
        }
        
        router.push('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // --- OAuth Handlers ---
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + "/" }
    });
  };

  // --- Step 1: Kirim Kode OTP ---
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (loginMethod === 'email') {
        if (!email) {
          setIsLoading(false);
          return showNotif(t('email_required', 'Silakan masukkan email Anda!'), "warning");
        }

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true }
        });

        if (error) throw error;
        showNotif(t('otp_email_sent', 'Kode OTP telah dikirim ke email Anda!'), "success");
      } else {
        if (!phone) {
          setIsLoading(false);
          return showNotif(t('phone_required', 'Silakan masukkan nomor telepon Anda!'), "warning");
        }

        const formattedPhone = getFormattedPhone(phone);
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
          options: { 
            channel: phoneChannel, // Menggunakan parameter 'whatsapp' atau 'sms' sesuai pilihan
            shouldCreateUser: true 
          }
        });

        if (error) throw error;
        showNotif(`Kode OTP telah dikirim melalui ${phoneChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}!`, "success");
      }

      setIsOtpSent(true);
    } catch (error: any) {
      showNotif(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Step 2: Verifikasi Kode OTP ---
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken) return showNotif(t('otp_required', 'Silakan masukkan kode OTP Anda!'), "warning");
    setIsLoading(true);

    try {
      const verifyParams: any = {
        token: otpToken,
        type: loginMethod === 'email' ? 'email' : 'sms' // Supabase membaca token HP via type 'sms'
      };

      if (loginMethod === 'email') {
        verifyParams.email = email;
      } else {
        verifyParams.phone = getFormattedPhone(phone);
      }

      const { error } = await supabase.auth.verifyOtp(verifyParams);

      if (error) throw error;
      showNotif(t('verify_success', 'Verifikasi berhasil!'), "success");
    } catch (error: any) {
      showNotif(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper fade-in-scale">
      <div className="auth-container">
        
        {/* Header Branding */}
        <div className="auth-header">
          <div className="auth-logo">
            <img 
              src="/brand.png" 
              alt="Hypeco Logo" 
              width="45" 
              height="45" 
              style={{ objectFit: 'contain' }} 
            />
          </div>
          <h1>hypeco</h1>
          <p>
            {isOtpSent 
              ? t('otp_subtitle', 'Masukkan kode verifikasi yang Anda terima.') 
              : t('login_subtitle', 'Masuk ke HypeTalk hari ini.')}
          </p>
        </div>

        {/* ALUR 1: INPUT EMAIL / TELEPON (Sebelum OTP dikirim) */}
        {!isOtpSent ? (
          <>
            {/* Tab Selector Metode Login */}
            <div className="auth-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button 
                type="button"
                className={`tab-btn ${loginMethod === 'email' ? 'active' : ''}`}
                onClick={() => setLoginMethod('email')}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-card)', background: loginMethod === 'email' ? 'var(--text-main)' : 'transparent', color: loginMethod === 'email' ? 'var(--bg-main)' : 'var(--text-main)' }}
              >
                Email
              </button>
              <button 
                type="button"
                className={`tab-btn ${loginMethod === 'phone' ? 'active' : ''}`}
                onClick={() => setLoginMethod('phone')}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-card)', background: loginMethod === 'phone' ? 'var(--text-main)' : 'transparent', color: loginMethod === 'phone' ? 'var(--bg-main)' : 'var(--text-main)' }}
              >
                Nomor Telepon
              </button>
            </div>

            <form onSubmit={handleSendOtp} className="auth-form">
              {loginMethod === 'email' ? (
                <div className="input-group-auth">
                  <span className="material-icons">mail_outline</span>
                  <input 
                    type="email" 
                    placeholder="Contoh: user@email.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
              ) : (
                <>
                  <div className="input-group-auth">
                    <span className="material-icons">phone</span>
                    <input 
                      type="tel" 
                      placeholder="Contoh: 08123456789 atau +62812..." 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      required 
                    />
                  </div>
                  
                  {/* Pilihan Kirim via WhatsApp atau SMS */}
                  <div className="channel-selector" style={{ display: 'flex', justifyContent: 'space-around', margin: '10px 0', fontSize: '14px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="channel" 
                        value="whatsapp" 
                        checked={phoneChannel === 'whatsapp'} 
                        onChange={() => setPhoneChannel('whatsapp')} 
                      />
                      <span>Kirim via WhatsApp</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="channel" 
                        value="sms" 
                        checked={phoneChannel === 'sms'} 
                        onChange={() => setPhoneChannel('sms')} 
                      />
                      <span>Kirim via SMS</span>
                    </label>
                  </div>
                </>
              )}

              <button type="submit" className="btn-auth-main" disabled={isLoading}>
                {isLoading ? t('loading', 'Memproses...') : t('send_otp_btn', 'Kirim Kode OTP')}
              </button>
            </form>
          </>
        ) : (
          /* ALUR 2: INPUT VERIFIKASI KODE OTP (Setelah OTP dikirim) */
          <form onSubmit={handleVerifyOtp} className="auth-form slide-down">
            <div className="input-group-auth">
              <span className="material-icons">lock_open</span>
              <input 
                type="text" 
                placeholder="Masukkan 6 Digit OTP" 
                value={otpToken} 
                onChange={(e) => setOtpToken(e.target.value.replace(/\s/g, ''))} 
                maxLength={6}
                required 
                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontWeight: 'bold' }}
              />
            </div>

            <button type="submit" className="btn-auth-main" disabled={isLoading}>
              {isLoading ? t('loading', 'Memverifikasi...') : t('verify_otp_btn', 'Verifikasi & Masuk')}
            </button>

            <button 
              type="button" 
              className="btn-forgot-pass" 
              onClick={() => { setIsOtpSent(false); setOtpToken(''); }}
              style={{ marginTop: '10px', textAlign: 'center', width: '100%' }}
            >
              {t('change_method_or_back', 'Kembali / Ubah Tujuan')}
            </button>
          </form>
        )}

        {/* Divider & Google Login (Hanya muncul di awal pemilihan metode) */}
        {!isOtpSent && (
          <>
            <div className="divider-auth">
              <span>{t('or_divider', 'atau')}</span>
            </div>

            <button type="button" onClick={handleGoogleLogin} className="btn-google" disabled={isLoading}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Masuk dengan Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}
