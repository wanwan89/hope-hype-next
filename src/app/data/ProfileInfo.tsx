'use client';
import React from 'react';
import { getUserBadge } from '@/lib/ui-utils';

type Props = {
  profile: any;
  stats: { followers: number; following: number; likes: number };
  isMe: boolean;
  isFollowing: boolean;
  isMutual: boolean;
  hasStory: boolean;
  storyIdToGo: string | null;
  onAvatarClick: () => void;
  onChat: () => void;
  onToggleFollow: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onOpenActionSheet: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  t: (key: string, fallback?: string) => string;
};

const ProfileInfo: React.FC<Props> = ({
  profile, stats, isMe, isFollowing, isMutual, hasStory, storyIdToGo,
  onAvatarClick, onChat, onToggleFollow, onEdit, onShare, onOpenActionSheet,
  onOpenFollowers, onOpenFollowing, t
}) => {
  return (
    <section className="profile-info">
      <div className="avatar-container" style={{ display: 'flex', justifyContent: 'center' }}>
        <div 
          className={`avatar-ring ${hasStory ? 'has-story' : 'normal-ring'}`} 
          onClick={onAvatarClick} 
          style={{ 
            cursor: hasStory ? 'pointer' : 'default',
            padding: hasStory ? '2px' : '0px',
            background: hasStory ? 'var(--accent-story)' : 'transparent',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img 
            className="profile-avatar-img" 
            src={profile.avatar_url || '/asets/png/profile.webp'} 
            alt="Avatar" 
            style={{
              border: hasStory ? '2px solid var(--bg-main)' : 'none',
              borderRadius: '50%',
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>
      </div>
      
      <h1 className="profile-name">
        {profile.full_name || profile.username} 
        <span dangerouslySetInnerHTML={{ __html: getUserBadge(profile.role) }} />
      </h1>
      <p className="profile-username">@{profile.username}</p>
      
      <div className="profile-stats">
        <div className="stat-box" onClick={onOpenFollowers}>
          <span className="stat-num">{stats.followers}</span>
          <span className="stat-label">{t('followers', 'Pengikut')}</span>
        </div>
        <div className="stat-box" onClick={onOpenFollowing}>
          <span className="stat-num">{stats.following}</span>
          <span className="stat-label">{t('following', 'Mengikuti')}</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{stats.likes}</span>
          <span className="stat-label">{t('likes', 'Suka')}</span>
        </div>
      </div>
      
      {!isMe && (
        <div className="profile-actions">
          <button className="btn-action btn-secondary" onClick={onChat}>
            <span className="material-icons" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '4px' }}>chat</span> Chat
          </button>
          <button className={`btn-action ${isFollowing ? 'btn-secondary' : 'btn-primary'}`} onClick={onToggleFollow}>
            {isFollowing ? (isMutual ? 'Berteman' : 'Mengikuti') : t('follow', 'Ikuti')}
          </button>
          <button className="btn-action btn-secondary" onClick={onOpenActionSheet} style={{ padding: '8px 12px' }}>
            <span className="material-icons" style={{ fontSize: '18px' }}>more_horiz</span>
          </button>
        </div>
      )}

      <p className="profile-bio">{profile.bio || t('no_bio', 'Belum ada bio')}</p>
      
      {profile.website && (
        <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', color: '#8e8e8e', fontWeight: '500', marginTop: '4px', textDecoration: 'none' }}>
          <span className="material-icons" style={{ fontSize: '12px' }}>link</span>
          {profile.website.replace(/^https?:\/\//, '').split('/')[0]}
        </a>
      )}
    </section>
  );
};

export default React.memo(ProfileInfo);
