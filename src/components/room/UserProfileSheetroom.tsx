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

  // 🔥 Hitung level
  const currentLevel = calculateLevel(selectedUser.total_gift_sent || 0);

  return (
    <div className={`user-profile-sheet-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div
        className="user-profile-sheet"
        onClick={e => e.stopPropagation()}
        style={{ overflow: 'visible' }}
      >
        <div className="sheet-handle"></div>
        <div className="profile-sheet-content">
          
          {/* AVATAR + USERNAME (TANPA BADGE LEVEL) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            {/* Foto Profil – bisa diklik untuk buka profil lengkap */}
            <div 
              style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
              onClick={() => router.push(`/data?id=${selectedUser.id}`)}
            >
              <img
                src={selectedUser.avatar_url || '/asets/png/profile.webp'}
                alt="Avatar"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: 'none',
                  objectFit: 'cover',
                }}
              />
              {/* TIDAK ADA BADGE LEVEL DI SINI */}
            </div>
            <div>
              <h3 className="profile-sheet-name" style={{ margin: 0 }}>
                {selectedUser.username}
                <span dangerouslySetInnerHTML={{ __html: getUserBadge(selectedUser.role) }} />
              </h3>
            </div>
          </div>

          {/* FOLLOWERS & FOLLOWING – TANPA GARIS */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              margin: '0 0 15px',
              padding: '10px 0',
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

          {/* BIO */}
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

          {/* KOTAK KECIL ABU-ABU GLASS DENGAN SVG HATI & ANGKA LEVEL */}
          <div
            style={{
              position: 'relative',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              margin: '25px 0 20px',
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              overflow: 'visible',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            }}
          >
            {/* SVG hati – posisi setengah di luar kotak */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
              viewBox="0 0 48 48"
              style={{
                position: 'absolute',
                top: '-18px',
                left: '50%',
                transform: 'translateX(-50%)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
              }}
            >
              <path
                fill={
                  currentLevel >= 40 ? '#ff0844' :
                  currentLevel >= 30 ? '#00f2fe' :
                  currentLevel >= 20 ? '#f59e0b' :
                  currentLevel >= 10 ? '#e2e8f0' :
                  '#93c5fd'
                }
                stroke="#000"
                strokeLinejoin="round"
                strokeWidth="4"
                d="M24 44C32.2347 44 38.9998 37.4742 38.9998 29.0981C38.9998 27.0418 38.8953 24.8375 37.7555 21.4116C36.6157 17.9858 36.3861 17.5436 35.1809 15.4279C34.666 19.7454 31.911 21.5448 31.2111 22.0826C31.2111 21.5231 29.5445 15.3359 27.0176 11.6339C24.537 8 21.1634 5.61592 19.1853 4C19.1853 7.06977 18.3219 11.6339 17.0854 13.9594C15.8489 16.2849 15.6167 16.3696 14.0722 18.1002C12.5278 19.8308 11.8189 20.3653 10.5274 22.4651C9.23596 24.565 9 27.3618 9 29.4181C9 37.7942 15.7653 44 24 44Z"
              />
            </svg>
            {/* Angka level */}
            <span style={{
              color: '#fff',
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              marginTop: '6px', // beri jarak dari SVG yang setengah keluar
            }}>
              Level {currentLevel}
            </span>
          </div>

          {/* TOMBOL AKSI – HAPUS "LIHAT PROFIL LENGKAP" */}
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
            {/* Tombol "Lihat Profil Lengkap" dihapus, karena user bisa klik foto profil */}
          </div>
        </div>
      </div>
    </div>
  );
}