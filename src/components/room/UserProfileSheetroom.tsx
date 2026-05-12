'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { getUserBadge } from '@/lib/ui-utils';

interface UserProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: any | null;
  myUserId: string | null;
  isOwner: boolean;
  onTurunSlot: () => void;
  onKickUser: (id: string, name: string) => void;
}

export default function UserProfileSheetroom({
  isOpen, onClose, selectedUser, myUserId, isOwner, onTurunSlot, onKickUser
}: UserProfileSheetProps) {
  const router = useRouter();

  if (!selectedUser) return null;

  return (
    <div className={`user-profile-sheet-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="user-profile-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"></div>
        <div className="profile-sheet-content">
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '15px' }}>
             <img src={selectedUser.avatar_url || '/asets/png/profile.webp'} className="profile-sheet-avatar" alt="Avatar" style={{ marginBottom: '0' }}/>
             <div style={{ position: 'absolute', bottom: '0', right: '-10px' }}>
                <span dangerouslySetInnerHTML={{ 
                  __html: `<span style="display:inline-flex;align-items:center;background:linear-gradient(135deg,#ff0844,#ffb199);color:#fff;font-size:10px;font-weight:900;padding:4px 8px;border-radius:12px;border:2px solid #1A2228;box-shadow:0 2px 4px rgba(0,0,0,0.5);"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>&nbsp;${Math.floor((selectedUser.total_gift_sent || 0) / 500) + 1}</span>` 
                }} />
             </div>
          </div>
          <div className="profile-sheet-info">
            <h3 className="profile-sheet-name">
              {selectedUser.username}
              <span dangerouslySetInnerHTML={{ __html: getUserBadge(selectedUser.role) }} />
            </h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', margin: '20px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '15px 0' }}>
             <div style={{ textAlign: 'center' }}>
                <b style={{ color: '#fff', fontSize: '20px' }}>{selectedUser.followersCount || 0}</b>
                <div style={{ color: '#888', fontSize: '12px', marginTop: '2px' }}>Pengikut</div>
             </div>
             <div style={{ textAlign: 'center' }}>
                <b style={{ color: '#fff', fontSize: '20px' }}>{selectedUser.followingCount || 0}</b>
                <div style={{ color: '#888', fontSize: '12px', marginTop: '2px' }}>Mengikuti</div>
             </div>
          </div>
          <p style={{ color: '#aaa', fontSize: '14px', margin: '0 0 25px', padding: '0 20px', lineHeight: '1.5', fontStyle: selectedUser.bio ? 'normal' : 'italic' }}>
             {selectedUser.bio || 'Belum ada bio'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedUser.id === myUserId && (
              <button className="btn-action-sheet danger" onClick={() => { onClose(); onTurunSlot(); }}>
                <span className="material-icons" style={{ fontSize: '18px' }}>mic_off</span> Turun Slot
              </button>
            )}
            {isOwner && selectedUser.id !== myUserId && (
              <button className="btn-action-sheet danger" onClick={() => { onClose(); onKickUser(selectedUser.id, selectedUser.username); }}>
                <span className="material-icons" style={{ fontSize: '18px' }}>person_remove</span> Turunkan dari Slot
              </button>
            )}
            <button className="btn-action-sheet btn-gradient" onClick={() => router.push(`/data?id=${selectedUser.id}`)}>
              Lihat Profil Lengkap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
