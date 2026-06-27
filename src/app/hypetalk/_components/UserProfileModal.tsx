'use client';
import React from 'react';
// Sesuaikan path import dengan struktur folder Anda. 
// Asumsi menggunakan alias '@' atau path relatif.
import { useConfirm } from '@/components/ConfirmProvider'; 

type Props = {
  profile: any;
  isBlocking: boolean;
  onClose: () => void;
  onChat: () => void;
  onShowInfo: () => void;
  onBlock: () => void;
};

const UserProfileModal: React.FC<Props> = ({ profile, isBlocking, onClose, onChat, onShowInfo, onBlock }) => {
  // Inisialisasi hook konfirmasi
  const confirm = useConfirm(); 

  if (!profile) return null;

  // Fungsi untuk menangani klik tombol blokir
  const handleBlockClick = async () => {
    try {
      // Menunggu jawaban konfirmasi dari user (true/false)
      const isConfirmed = await confirm({
        title: 'Konfirmasi Blokir',
        description: `Apakah Anda yakin ingin memblokir ${profile.username}? Anda tidak akan menerima pesan dari pengguna ini lagi.`,
        confirmText: 'Ya, Blokir',
        cancelText: 'Batal',
        variant: 'danger' // Opsi tambahan jika ConfirmProvider Anda mendukung tema warna (opsional)
      });

      // Jika user menekan "Ya, Blokir"
      if (isConfirmed) {
        onBlock();
      }
    } catch (error) {
      console.error('Konfirmasi dibatalkan', error);
    }
  };
  
  return (
    <div 
      className="tg-modal-overlay" 
      style={{ 
        alignItems: 'center', 
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none', 
        backgroundColor: 'rgba(0, 0, 0, 0.65)', 
        padding: '20px' 
      }} 
      onClick={onClose}
    >
      <div className="wa-profile-card" onClick={(e) => e.stopPropagation()}>
        <div className="wa-profile-img-container">
          <img src={profile.avatar_url || "/asets/png/profile.webp"} alt="Profile" className="wa-profile-img" />
          <div className="wa-profile-name-bar">
            <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '600' }}>
              {profile.username}{profile.umur ? `, ${profile.umur}` : ''}
            </h2>
            {profile.pekerjaan && <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '2px' }}>{profile.pekerjaan}</div>}
          </div>
        </div>
        <div className="wa-profile-actions">
          <button onClick={onChat} className="wa-action-btn" style={{ color: '#1da1f2' }}>
            <span className="material-icons" style={{ fontSize: '24px' }}>chat</span> Chat
          </button>
          <button onClick={onShowInfo} className="wa-action-btn" style={{ color: '#2ecc71' }}>
            <span className="material-icons" style={{ fontSize: '24px' }}>info</span> Info
          </button>
          
          {/* Ubah onClick menjadi handleBlockClick */}
          <button onClick={handleBlockClick} disabled={isBlocking} className="wa-action-btn" style={{ color: '#ff4757', opacity: isBlocking ? 0.5 : 1 }}>
            <span className="material-icons" style={{ fontSize: '24px' }}>block</span> Blokir
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(UserProfileModal);
