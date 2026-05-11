'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ini bakal nge-print error aslinya di Console Inspect Element
    console.error("TERJADI CRASH DI HALAMAN INI:", error);
  }, [error]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px', textAlign: 'center', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <span className="material-icons" style={{ fontSize: '50px', color: '#ff4757', marginBottom: '15px' }}>error_outline</span>
      <h2 style={{ marginBottom: '10px' }}>Waduh, Halaman Crash!</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px' }}>
        Ada kode yang error: <br/>
        <b style={{ color: '#ff4757' }}>{error.message}</b>
      </p>
      <button 
        onClick={() => reset()} 
        style={{ background: '#1f3cff', color: 'white', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: 'bold' }}
      >
        Coba Muat Ulang
      </button>
    </div>
  );
}
