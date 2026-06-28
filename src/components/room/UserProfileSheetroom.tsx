'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { getUserBadge } from '@/lib/ui-utils';

// 🔥 IMPORT RUMUS SAKTI 🔥
import { calculateLevel, getLevelBadgeHTML } from '@/lib/level-utils';

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

  // 🔥 Hitung level pakai fungsi sakti yang sama dengan sistem Gift
  const currentLevel = calculateLevel(selectedUser.total_gift_sent || 0);

  return (
    <div className={`user-profile-sheet-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div
        className="user-profile-sheet"
        onClick={e => e.stopPropagation()}
        style={{ overflow: 'visible' }} // biar SVG bisa keluar dari box tanpa kepotong
      >
        <div className="sheet-handle"></div>
        <div className="profile-sheet-content">
          {/* Bagian atas: foto + username */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={selectedUser.avatar_url || '/asets/png/profile.webp'}
                alt="Avatar"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: 'none', // tanpa border
                  objectFit: 'cover',
                }}
              />
              {/* 🔥 Level badge tetap nempel di avatar */}
              <span
                style={{
                  position: 'absolute',
                  bottom: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                }}
                dangerouslySetInnerHTML={{ __html: getLevelBadgeHTML(currentLevel) }}
              />
            </div>
            <div>
              <h3 className="profile-sheet-name" style={{ margin: 0 }}>
                {selectedUser.username}
                <span dangerouslySetInnerHTML={{ __html: getUserBadge(selectedUser.role) }} />
              </h3>
            </div>
          </div>

          {/* Pengikut & Mengikuti – di bawah foto */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              margin: '0 0 15px',
              padding: '10px 0',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <b style={{ color: '#fff', fontSize: '18px' }}>{selectedUser.followersCount || 0}</b>
              <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>Pengikut</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <b style={{ color: '#fff', fontSize: '18px' }}>{selectedUser.followingCount || 0}</b>
              <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>Mengikuti</div>
            </div>
          </div>

          {/* Bio */}
          <p
            style={{
              color: '#aaa',
              fontSize: '14px',
              margin: '0 0 20px',
              lineHeight: '1.5',
              fontStyle: selectedUser.bio ? 'normal' : 'italic',
              textAlign: 'center',
            }}
          >
            {selectedUser.bio || 'Belum ada bio'}
          </p>

          {/* Kotak putih dengan SVG setengah di dalam, setengah di luar */}
          <div
            style={{
              position: 'relative',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              margin: '40px 0 20px', // atas 40px biar SVG yang keluar gak nabrak bio
              padding: '20px 20px 20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '50px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
              overflow: 'visible',
            }}
          >
            {/* SVG hati biru – setengah di atas kotak */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="72"
              height="72"
              viewBox="0 0 48 48"
              style={{
                position: 'absolute',
                top: '-36px', // setengah tinggi SVG
                left: '50%',
                transform: 'translateX(-50%)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              }}
            >
              <path
                fill="#2F88FF"
                stroke="#000"
                strokeLinejoin="round"
                strokeWidth="4"
                d="M24 44C32.2347 44 38.9998 37.4742 38.9998 29.0981C38.9998 27.0418 38.8953 24.8375 37.7555 21.4116C36.6157 17.9858 36.3861 17.5436 35.1809 15.4279C34.666 19.7454 31.911 21.5448 31.2111 22.0826C31.2111 21.5231 29.5445 15.3359 27.0176 11.6339C24.537 8 21.1634 5.61592 19.1853 4C19.1853 7.06977 18.3219 11.6339 17.0854 13.9594C15.8489 16.2849 15.6167 16.3696 14.0722 18.1002C12.5278 19.8308 11.8189 20.3653 10.5274 22.4651C9.23596 24.565 9 27.3618 9 29.4181C9 37.7942 15.7653 44 24 44Z"
              />
            </svg>
            {/* Di dalam kotak bisa dikosongkan atau diberi teks sesuai kebutuhan */}
          </div>

          {/* Tombol aksi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedUser.id === myUserId && (
              <button
                className="btn-action-sheet danger"
                onClick={() => {
                  onClose();
                  onTurunSlot();
                }}
              >
                <span className="material-icons" style={{ fontSize: '18px' }}>
                  mic_off
                </span>{' '}
                Turun Slot
              </button>
            )}
            {isOwner && selectedUser.id !== myUserId && (
              <button
                className="btn-action-sheet danger"
                onClick={() => {
                  onClose();
                  onKickUser(selectedUser.id, selectedUser.username);
                }}
              >
                <span className="material-icons" style={{ fontSize: '18px' }}>
                  person_remove
                </span>{' '}
                Turunkan dari Slot
              </button>
            )}
            <button
              className="btn-action-sheet btn-gradient"
              onClick={() => router.push(`/data?id=${selectedUser.id}`)}
            >
              Lihat Profil Lengkap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}