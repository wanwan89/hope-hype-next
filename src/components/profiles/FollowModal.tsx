'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { getUserBadge } from '@/lib/ui-utils';

// 🔥 IMPORT LOTTIE SECARA DINAMIS (Mencegah SSR Error) 🔥
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// 🔥 IMPORT FILE LOTTIE JSON 🔥
import painAnimation from '@/assets/lottie/pain.json';

type Props = {
  isOpen: boolean;
  type: 'followers' | 'following';
  list: any[];
  isLoading: boolean;
  onClose: () => void;
  onUserClick: (userId: string) => void;
  t: (key: string, fallback?: string) => string;
};

const FollowModal: React.FC<Props> = ({ isOpen, type, list, isLoading, onClose, onUserClick, t }) => {
  return (
    <div className={`full-screen-modal ${isOpen ? 'open' : ''}`}>
      <div className="full-screen-header">
        <button className="icon-btn-header" onClick={onClose}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h3>{type === 'followers' ? t('followers', 'Pengikut') : t('following', 'Mengikuti')}</h3>
        <div style={{width: '24px'}}></div>
      </div>
      
      <div className="full-screen-body no-padding" style={{ display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="follow-item-skeleton">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-text"></div>
            </div>
          ))
        ) : list.length === 0 ? (
          // 🔥 CONTAINER KOSONG DENGAN FLEXBOX AGAR TEPAT DI TENGAH 🔥
          <div 
            className="empty-follow-state"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1, // Memastikan container ini mengisi sisa ruang di modal
              minHeight: '60vh', // Jaga-jaga agar punya tinggi minimum untuk centering vertikal
              textAlign: 'center',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <Lottie 
                animationData={painAnimation} 
                loop={true} 
                style={{ width: 150, height: 150 }} 
              />
            </div>
            <p style={{ color: 'var(--text-muted, #8a8b91)', margin: 0, fontWeight: 500 }}>
              Belum ada {type === 'followers' ? 'pengikut' : 'yang diikuti'}.
            </p>
          </div>
        ) : (
          list.map(user => (
            <div key={user.id} className="follow-item" onClick={() => onUserClick(user.id)}>
              <img src={user.avatar_url || '/asets/png/profile.webp'} alt="Avatar" />
              <div className="follow-item-info">
                <span className="follow-username">
                  {user.username} <span dangerouslySetInnerHTML={{ __html: getUserBadge(user.role) }} />
                </span>
                <span className="follow-handle">@{(user.username || 'user').toLowerCase().replace(/\s/g, '')}</span>
              </div>
              <span className="material-icons" style={{color: '#8a8b91'}}>chevron_right</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default React.memo(FollowModal);
