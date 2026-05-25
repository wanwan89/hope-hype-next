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
      {/* TAB: KARYA (Grid Icon) */}
      <div 
        className={`profile-tab-item ${activeTab === 'post' ? 'active' : ''}`} 
        onClick={() => onTabChange('post')}
        title={t('tab_post', 'Karya')}
        aria-label="Karya"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      </div>

      {/* TAB: PRIVAT (Lock Icon) - Hanya untuk owner */}
      {isMe && (
        <div 
          className={`profile-tab-item ${activeTab === 'private' ? 'active' : ''}`} 
          onClick={() => onTabChange('private')}
          title="Privat"
          aria-label="Privat"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
      )}

      {/* TAB: SUKA (Heart Icon) */}
      <div 
        className={`profile-tab-item ${activeTab === 'like' ? 'active' : ''}`} 
        onClick={() => onTabChange('like')}
        title={t('tab_like', 'Suka')}
        aria-label="Suka"
        style={{ position: 'relative' }} // Buat indikator gembok kecil
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        {/* Ikon Gembok Kecil Jika Disembunyikan */}
        {!isMe && profile.hide_likes && (
          <span className="material-icons" style={{ fontSize: '10px', color: 'var(--text-muted)', position: 'absolute', bottom: '6px', right: '15px' }}>lock</span>
        )}
      </div>

      {/* TAB: REPOST (Repeat/Repost Icon) */}
      <div 
        className={`profile-tab-item ${activeTab === 'repost' ? 'active' : ''}`} 
        onClick={() => onTabChange('repost')}
        title={t('tab_repost', 'Repost')}
        aria-label="Repost"
        style={{ position: 'relative' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9"></polyline>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
          <polyline points="7 23 3 19 7 15"></polyline>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
        </svg>
        {/* Ikon Gembok Kecil Jika Disembunyikan */}
        {!isMe && profile.hide_reposts && (
          <span className="material-icons" style={{ fontSize: '10px', color: 'var(--text-muted)', position: 'absolute', bottom: '6px', right: '15px' }}>lock</span>
        )}
      </div>

      {/* TAB: SIMPAN (Bookmark Icon) */}
      <div 
        className={`profile-tab-item ${activeTab === 'simpan' ? 'active' : ''}`} 
        onClick={() => onTabChange('simpan')}
        title={t('tab_saved', 'Simpan')}
        aria-label="Simpan"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
    </div>
  );
};

export default React.memo(ProfileTabs);
