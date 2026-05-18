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
      <div className={`profile-tab-item ${activeTab === 'post' ? 'active' : ''}`} onClick={() => onTabChange('post')}>
        {t('tab_post', 'Karya')}
      </div>
      {isMe && (
        <div className={`profile-tab-item ${activeTab === 'private' ? 'active' : ''}`} onClick={() => onTabChange('private')}>
          Privat
        </div>
      )}
      <div className={`profile-tab-item ${activeTab === 'like' ? 'active' : ''}`} onClick={() => onTabChange('like')}>
        {t('tab_like', 'Suka')}
        {!isMe && profile.hide_likes && <span className="material-icons" style={{fontSize: '14px', color: 'var(--text-muted)'}}>lock</span>}
      </div>
      <div className={`profile-tab-item ${activeTab === 'repost' ? 'active' : ''}`} onClick={() => onTabChange('repost')}>
        {t('tab_repost', 'Repost')}
        {!isMe && profile.hide_reposts && <span className="material-icons" style={{fontSize: '14px', color: 'var(--text-muted)'}}>lock</span>}
      </div>
      <div className={`profile-tab-item ${activeTab === 'simpan' ? 'active' : ''}`} onClick={() => onTabChange('simpan')}>
        {t('tab_saved', 'Simpan')}
      </div>
    </div>
  );
};

export default React.memo(ProfileTabs);