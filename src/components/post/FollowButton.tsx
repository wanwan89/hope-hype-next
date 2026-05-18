'use client';

import React from 'react';

type FollowButtonProps = {
  creatorId: string;
  currentUser: any;
  followedUsers: Set<string>;
  mutualUsers: Set<string>;
  animatingFollows: Set<string>;
  handleFollowToggle: (e: React.MouseEvent, creatorId: string) => void;
  t: (key: string, fallback?: string) => string;
};

const FollowButton: React.FC<FollowButtonProps> = ({
  creatorId, currentUser, followedUsers, mutualUsers, animatingFollows, handleFollowToggle, t
}) => {
  if (!currentUser || currentUser.id === creatorId) return null;
  const isFollowing = followedUsers.has(creatorId);
  const isMutual = mutualUsers.has(creatorId);
  const isAnimating = animatingFollows.has(creatorId);

  return (
    <button
      onClick={(e) => handleFollowToggle(e, creatorId)}
      className="btn-press"
      style={{
        background: isFollowing ? 'var(--bg-secondary)' : '#1f3cff',
        color: isFollowing ? 'var(--text-main)' : '#ffffff',
        border: isFollowing ? '1px solid var(--border-card)' : 'none',
        padding: '4px 12px',
        borderRadius: '16px',
        fontSize: '11px',
        fontWeight: 700,
        marginLeft: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transform: isAnimating ? 'scale(0.85)' : 'scale(1)',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      {isFollowing && (
        <span className="material-icons check-pop" style={{ fontSize: '13px', color: 'var(--text-main)' }}>
          check
        </span>
      )}
      {isFollowing ? (isMutual ? 'Berteman' : 'Mengikuti') : t('follow', 'Ikuti')}
    </button>
  );
};

export default React.memo(FollowButton);