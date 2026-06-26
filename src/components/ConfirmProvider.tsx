'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Tipe data untuk Context
type ConfirmContextType = {
  confirm: (message: string) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | null>(null);

// Hook kustom untuk memudahkan pemanggilan
export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm harus digunakan di dalam ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null);

  // Fungsi yang akan dipanggil oleh komponen lain
  const confirm = useCallback((msg: string) => {
    setMessage(msg);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveCallback(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveCallback) resolveCallback(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveCallback) resolveCallback(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      {/* UI Custom Modal Popup */}
      {isOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: 'var(--text-main)' }}>
              Konfirmasi
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted)' }}>
              {message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={handleCancel} style={btnCancelStyle}>Batal</button>
              <button onClick={handleConfirm} style={btnConfirmStyle}>Oke</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

// --- CSS in JS Styles ---
const overlayStyle: React.CSSProperties = {
  position: 'fixed', 
  inset: 0, 
  background: 'rgba(0,0,0,0.6)', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  zIndex: 999999 
  // backdropFilter: 'blur(4px)' dihapus
};

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-card, #1a1a1a)', 
  padding: '20px', 
  borderRadius: '16px', 
  width: '90%', 
  maxWidth: '320px', 
  border: '1px solid var(--border-card, #333)', 
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
};

const btnCancelStyle: React.CSSProperties = {
  background: 'transparent', 
  border: 'none', 
  color: 'var(--text-muted, #aaa)', 
  padding: '8px 16px', 
  fontWeight: 600, 
  cursor: 'pointer'
};

const btnConfirmStyle: React.CSSProperties = {
  background: '#007BFF', // Diubah dari #ff4757 (merah) menjadi #007BFF (biru)
  border: 'none', 
  color: '#fff', 
  padding: '8px 16px', 
  borderRadius: '8px', 
  fontWeight: 600, 
  cursor: 'pointer'
};
