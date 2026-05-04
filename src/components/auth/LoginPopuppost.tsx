'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import './LoginPopup.css';

export default function LoginPopuppost() {
  const [isActive, setIsActive] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Listener Global untuk membuka popup dari komponen manapun
    const openLogin = () => {
      setIsActive(true);
      document.body.style.overflow = "hidden";
    };

    window.addEventListener('openLogin', openLogin);
    return () => window.removeEventListener('openLogin', openLogin);
  }, []);

  const closePopup = () => {
    setIsActive(false);
    document.body.style.overflow = "";
    setEmail('');
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;

      if ((window as any).showNotif) (window as any).showNotif("Masuk Pak Eko! 🔥", "success");
      
      // Beri sedikit delay agar notifikasi terlihat sebelum reload
      setTimeout(() => window.location.reload(), 1000);

    } catch (err: any) {
      if ((window as any).showNotif) (window as any).showNotif(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      id="loginPopup" 
      className={`popup-overlay ${isActive ? 'active' : ''}`}
      onClick={(e) => e.target === e.currentTarget && closePopup()}
    >
      <div className="popup-content">
        <button className="close-login" onClick={closePopup}>&times;</button>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--text-main)', fontWeight: 800 }}>
          LOGIN DULU BRO
        </h2>

        <form className="form" onSubmit={handleLogin}>
          <div className="flex-column">
            <label>Email</label>
          </div>
          <div className="inputForm">
            <svg height="20" viewBox="0 0 32 32" width="20">
              <path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082 15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13 14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711 13.007 13.007 0 1 1 5.458-6.529 2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274 15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6 6.006 6.006 0 0 1 -6 6z"></path>
            </svg>
            <input 
              type="email" 
              className="input" 
              placeholder="Enter your Email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex-column" style={{ marginTop: '15px' }}>
            <label>Password</label>
          </div>
          <div className="inputForm">
            <svg height="20" viewBox="0 0 24 24" width="20">
              <path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z"/>
            </svg>
            <input 
              type="password" 
              className="input" 
              placeholder="Enter your Password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="button-submit" type="submit" disabled={isLoading}>
            {isLoading ? "Memeriksa..." : "Sign In"}
          </button>
          
          <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Belum punya akun? <a href="/register" style={{ color: '#2d79f3', fontWeight: 'bold', textDecoration: 'none' }}>Daftar</a>
          </p>
        </form>
      </div>
    </div>
  );
}
