'use client';
import React from 'react';

type Props = {
  isMe: boolean;
  isMutual: boolean;
  profile: any; // untuk hide_likes, hide_reposts
  activeTab: string;
  onTabChange: (tab: string) => void;
  t: (key: string, fallback?: string) => string;
};

const ProfileTabs: React.FC<Props> = ({ isMe, isMutual, profile, activeTab, onTabChange, t }) => {
  if (profile.is_private && !isMe && !isMutual) return null; // jangan render tab jika private dan bukan mutual/owner

  return (
    <div className="profile-tabs">
      {/* TAB: KARYA (Post Icon) */}
      <div 
        className={`profile-tab-item ${activeTab === 'post' ? 'active' : ''}`} 
        onClick={() => onTabChange('post')}
        title={t('tab_post', 'Karya')}
        aria-label="Karya"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
          <path fill="currentColor" d="M8 5.5h8a3 3 0 0 0 3-3a.5.5 0 0 0-.5-.5h-13a.5.5 0 0 0-.5.5a3 3 0 0 0 3 3m8 13H8a3 3 0 0 0-3 3a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5a3 3 0 0 0-3-3" opacity=".5"/>
          <path fill="currentColor" d="M5 11.5c0-1.886 0-2.828.586-3.414S7.114 7.5 9 7.5h6c1.886 0 2.828 0 3.414.586S19 9.614 19 11.5v1c0 1.886 0 2.828-.586 3.414S16.886 16.5 15 16.5H9c-1.886 0-2.828 0-3.414-.586S5 14.386 5 12.5z"/>
        </svg>
      </div>

      {/* TAB: PRIVAT (Gembok Icon) - Hanya untuk owner */}
      {isMe && (
        <div 
          className={`profile-tab-item ${activeTab === 'private' ? 'active' : ''}`} 
          onClick={() => onTabChange('private')}
          title="Privat"
          aria-label="Privat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
            <path fill="currentColor" d="M17 9V7c0-2.8-2.2-5-5-5S7 4.2 7 7v2c-1.7 0-3 1.3-3 3v7c0 1.7 1.3 3 3 3h10c1.7 0 3-1.3 3-3v-7c0-1.7-1.3-3-3-3M9 7c0-1.7 1.3-3 3-3s3 1.3 3 3v2H9zm4.1 8.5l-.1.1V17c0 .6-.4 1-1 1s-1-.4-1-1v-1.4c-.6-.6-.7-1.5-.1-2.1s1.5-.7 2.1-.1c.6.5.7 1.5.1 2.1"/>
          </svg>
        </div>
      )}

      {/* TAB: SUKA (Love/Like Icon) */}
      <div 
        className={`profile-tab-item ${activeTab === 'like' ? 'active' : ''}`} 
        onClick={() => onTabChange('like')}
        title={t('tab_like', 'Suka')}
        aria-label="Suka"
        style={{ position: 'relative' }} // Buat indikator gembok kecil
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
          <path fill="currentColor" d="m12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53z"/>
        </svg>
        {/* Ikon Gembok Kecil Jika Disembunyikan */}
        {!isMe && profile.hide_likes && (
          <span className="material-icons" style={{ fontSize: '10px', color: 'var(--text-muted)', position: 'absolute', bottom: '6px', right: '15px' }}>lock</span>
        )}
      </div>

      {/* TAB: REPOST (Repost Icon) */}
      <div 
        className={`profile-tab-item ${activeTab === 'repost' ? 'active' : ''}`} 
        onClick={() => onTabChange('repost')}
        title={t('tab_repost', 'Repost')}
        aria-label="Repost"
        style={{ position: 'relative' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 640 640">
          <path fill="currentColor" d="M150.6 105.4c-12.5-12.5-32.8-12.5-45.3 0l-64 64c-9.2 9.2-11.9 22.9-6.9 34.9S51.1 224 64 224h32v224c0 53 43 96 96 96h128c17.7 0 32-14.3 32-32s-14.3-32-32-32H192c-17.7 0-32-14.3-32-32V224h32c12.9 0 24.6-7.8 29.6-19.8s2.2-25.7-6.9-34.9l-64-64zm338.8 429.2c12.5 12.5 32.8 12.5 45.3 0l64-64c9.2-9.2 11.9-22.9 6.9-34.9S588.9 416 576 416h-32V192c0-53-43-96-96-96H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h128c17.7 0 32 14.3 32 32v224h-32c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l64 64z"/>
        </svg>
        {/* Ikon Gembok Kecil Jika Disembunyikan */}
        {!isMe && profile.hide_reposts && (
          <span className="material-icons" style={{ fontSize: '10px', color: 'var(--text-muted)', position: 'absolute', bottom: '6px', right: '15px' }}>lock</span>
        )}
      </div>

      {/* TAB: SIMPAN (Simpan Icon) */}
      <div 
        className={`profile-tab-item ${activeTab === 'simpan' ? 'active' : ''}`} 
        onClick={() => onTabChange('simpan')}
        title={t('tab_saved', 'Simpan')}
        aria-label="Simpan"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
          <path fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 6.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C7.52 3 8.08 3 9.2 3h5.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C18 4.52 18 5.08 18 6.2v13.305c0 .486 0 .729-.101.862a.5.5 0 0 1-.37.198c-.167.01-.369-.125-.773-.394L12 17l-4.756 3.17c-.404.27-.606.405-.774.395a.5.5 0 0 1-.369-.198C6 20.234 6 19.991 6 19.505z"/>
        </svg>
      </div>
    </div>
  );
};

export default React.memo(ProfileTabs);
