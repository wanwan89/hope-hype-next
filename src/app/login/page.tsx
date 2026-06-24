'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Sesuaikan path ini
import './Login.css';

type Mode = 'login' | 'signup';
type LoadingState = 'google' | 'discord' | 'passkey' | 'magiclink' | 'credentials' | null;

export default function LoginPage() {
  const router = useRouter();

  // --- UI State ---
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState<LoadingState>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- Form State ---
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- Reset & Notifications ---
  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleError = (msg: string) => {
    clearMessages();
    setErrorMsg(msg);
  };

  const handleSuccess = (msg: string) => {
    clearMessages();
    setSuccessMsg(msg);
  };

  // --- Validations ---
  const validateForm = (): boolean => {
    if (!email || !email.includes('@')) {
      handleError('Please enter a valid email address.');
      return false;
    }
    if (mode === 'signup') {
      if (!username.trim()) {
        handleError('Username is required.');
        return false;
      }
      if (password.length < 8) {
        handleError('Password must be at least 8 characters.');
        return false;
      }
      if (password !== confirmPassword) {
        handleError('Passwords do not match.');
        return false;
      }
    } else {
      if (!password) {
        handleError('Password is required.');
        return false;
      }
    }
    return true;
  };

  // --- Auth Handlers ---
  const handleCredentialsAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading('credentials');
    clearMessages();

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (error) throw error;
        handleSuccess('Account created! Please check your email to verify.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/'); 
      }
    } catch (err: any) {
      handleError(err.message || 'Authentication failed');
    } finally {
      setLoading(null);
    }
  };

  const handleOAuth = async (provider: 'google' | 'discord') => {
    setLoading(provider);
    clearMessages();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) {
      handleError(err.message || `Failed to sign in with ${provider}`);
      setLoading(null);
    }
  };

  const handleMagicLink = async () => {
    if (!email || !email.includes('@')) {
      handleError('Please enter your email first to send a magic link.');
      return;
    }
    setLoading('magiclink');
    clearMessages();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      handleSuccess('Magic link sent! Check your inbox.');
    } catch (err: any) {
      handleError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(null);
    }
  };

  const handlePasskey = async () => {
    setLoading('passkey');
    clearMessages();
    try {
      if (!window.PublicKeyCredential) {
        throw new Error('Passkeys are not supported on this device/browser.');
      }
      await new Promise((res) => setTimeout(res, 1000)); 
      throw new Error('Passkey login is not configured on the server yet.');
    } catch (err: any) {
      handleError(err.message || 'Passkey authentication failed');
    } finally {
      setLoading(null);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    clearMessages();
  };

  // --- SVG Icons ---
  const LoaderIcon = () => (
    <svg className="spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
    </svg>
  );

  const LogoSVG = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="app-logo">
      <rect width="48" height="48" rx="14" fill="var(--text-main, #0f172a)" />
    </svg>
  );

  return (
    <div className="auth-layout">
      <div className="auth-container" role="main">
        
        {/* Header */}
        <header className="auth-header">
          <LogoSVG />
          <h1>{mode === 'login' ? 'Welcome Back' : 'Create an Account'}</h1>
          <p>{mode === 'login' ? 'Sign in to continue' : 'Sign up to get started'}</p>
        </header>

        {/* Alerts */}
        <div className="auth-alerts" aria-live="polite">
          {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}
        </div>

        {/* OAuth Buttons */}
        <div className="auth-socials">
          <button type="button" className="btn-social" onClick={() => handleOAuth('google')} disabled={loading !== null}>
            {loading === 'google' ? <LoaderIcon /> : (
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>

          <button type="button" className="btn-social" onClick={() => handleOAuth('discord')} disabled={loading !== null}>
            {loading === 'discord' ? <LoaderIcon /> : (
              <svg width="20" height="20" viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg">
                <path fill="#5865F2" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
              </svg>
            )}
            Continue with Discord
          </button>

          <button type="button" className="btn-social" onClick={handlePasskey} disabled={loading !== null}>
            {loading === 'passkey' ? <LoaderIcon /> : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
            Continue with Passkey
          </button>
        </div>

        {/* Divider */}
        <div className="auth-divider">
          <span>OR</span>
        </div>

        {/* Main Form */}
        <form onSubmit={handleCredentialsAuth} className="auth-form" noValidate>
          {mode === 'signup' && (
            <div className="form-group slide-down">
              <label htmlFor="username">Username</label>
              <input 
                id="username" type="text" value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="hypeuser" disabled={loading !== null}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email" type="email" value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="name@example.com" disabled={loading !== null}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password" type="password" value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" disabled={loading !== null}
            />
          </div>

          {mode === 'signup' && (
            <div className="form-group slide-down">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input 
                id="confirmPassword" type="password" value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="••••••••" disabled={loading !== null}
              />
            </div>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={loading !== null}>
            {loading === 'credentials' ? <LoaderIcon /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>

          {mode === 'login' && (
            <button type="button" className="btn-magic-link" onClick={handleMagicLink} disabled={loading !== null}>
              {loading === 'magiclink' ? 'Sending...' : 'Send Magic Link Instead'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </button>
          )}
        </form>

        {/* Footer */}
        <footer className="auth-footer">
          <p>
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
            <button type="button" onClick={toggleMode} className="btn-toggle">
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </footer>

      </div>
    </div>
  );
}
