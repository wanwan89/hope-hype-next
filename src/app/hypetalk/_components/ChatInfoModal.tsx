'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  profile: any;
  mutedChats: Set<string>;
  onToggleMute: (id: string) => void;
  onBack: () => void;
  onClose: () => void;
};

const ChatInfoModal: React.FC<Props> = ({ profile, mutedChats, onToggleMute, onBack, onClose }) => {
  const router = useRouter();
  if (!profile) return null;

  return (
    // FIX: Menghapus style={{ display: 'flex' }} agar mengikuti CSS global yang sudah diperbaiki
    <div className="tg-modal-overlay" onClick={onClose}>
      <div className="tg-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={profile.avatar_url || "/asets/png/profile.webp"} style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }} />
            <h3 style={{ margin: 0 }}>Info {profile.username}</h3>
          </div>
          <button className="close-modal-btn" onClick={onBack}>
            <span className="material-icons">arrow_back</span>
          </button>
        </div>
        
        <div className="settings-row" style={{ marginTop: '10px' }}>
          <div>
            <strong style={{ display: 'block', fontSize: '15px' }}>Senyapkan Notifikasi</strong>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mute pesan dari obrolan ini</span>
          </div>
          <input 
            type="checkbox" 
            className="ios-toggle" 
            checked={mutedChats.has(profile.id)} 
            onChange={() => onToggleMute(profile.id)} 
          />
        </div>

        <div className="settings-row" style={{ padding: '16px 0', borderBottom: 'none' }}>
          <button 
            onClick={() => { onClose(); router.push(`/hypetalk/media?userId=${profile.id}`); }} 
            style={{ 
              width: '100%', 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-card)', 
              color: 'var(--text-main)', 
              padding: '14px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              cursor: 'pointer' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-icons" style={{ color: '#1f3cff' }}>perm_media</span>
              <span style={{ fontWeight: '600' }}>Media, Tautan, dan Dokumen</span>
            </div>
            <span className="material-icons" style={{ color: 'var(--text-muted)' }}>chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChatInfoModal);
