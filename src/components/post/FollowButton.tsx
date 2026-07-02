'use client';
import React from 'react';
import { motion } from 'framer-motion';

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
    <motion.button
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
        justifyContent: 'center',
        gap: '4px',
        minWidth: '100px',       // ← ukuran tetap, tidak berubah saat konten berubah
        flexShrink: 0
      }}
      whileTap={{ scale: 0.85 }}             // animasi instan saat ditekan
      animate={{ scale: isAnimating ? 0.85 : 1 }}  // skala saat proses follow/unfollow
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {isFollowing && (
        <motion.span
          className="material-icons check-pop"
          style={{ fontSize: '13px', color: 'var(--text-main)' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        >
          check
        </motion.span>
      )}
      {isFollowing ? (isMutual ? 'Berteman' : 'Mengikuti') : t('follow', 'Ikuti')}
    </motion.button>
  );
};

export default FollowButton;