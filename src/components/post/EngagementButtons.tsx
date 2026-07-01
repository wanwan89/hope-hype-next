'use client';
import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

type EngagementButtonsProps = {
  postId: string;
  creatorId: string;
  counts: Record<string, { likes: number; comments: number; reposts: number; saves: number }>;
  mySavedPosts: Set<string>;
  myRepostedPosts: Set<string>;
  myLikedPosts: Set<string>;
  animatingReposts: Set<string>;
  handleSave: (postId: string) => void;
  openRepostModal: (postId: string, creatorId: string) => void;
  handleLike: (postId: string, creatorId: string) => void;
};

const EngagementButtons: React.FC<EngagementButtonsProps> = ({
  postId,
  creatorId,
  counts,
  mySavedPosts,
  myRepostedPosts,
  myLikedPosts,
  animatingReposts,
  handleSave,
  openRepostModal,
  handleLike,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleOpenComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentOpenId = searchParams.get('id');
    const isOpen = searchParams.get('openComment') === 'true';
    if (isOpen && currentOpenId === postId) {
      router.replace(pathname, { scroll: false });
    } else {
      router.push(`${pathname}?openComment=true&id=${postId}`, { scroll: false });
    }
  };

  return (
    <div className="engagement-group" onClick={(e) => e.stopPropagation()}>
      {/* Save (Bookmark) */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        className={`icon-btn save-btn btn-press ${mySavedPosts.has(postId) ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          handleSave(postId);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="icon"
          fill={mySavedPosts.has(postId) ? '#FBBF24' : 'var(--text-main)'}
          style={{ transition: '0.2s' }}
        >
          {mySavedPosts.has(postId) ? (
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
          ) : (
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />
          )}
        </svg>
        <span className="save-count" style={{ color: 'var(--text-main)' }}>
          {counts[postId]?.saves || 0}
        </span>
      </motion.button>

      {/* Repost */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        className={`icon-btn repost-btn btn-press ${myRepostedPosts.has(postId) ? 'reposted' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          openRepostModal(postId, creatorId);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 12 12"
          className={`icon ${animatingReposts.has(postId) ? 'spin-anim' : ''}`}
          fill="currentColor"
          style={{
            color: myRepostedPosts.has(postId) ? '#1f3cff' : 'var(--text-main)',
            transition: '0.2s',
          }}
        >
          <path d="M2.511 2q.031 0 .063.005l.031.006l.046.012l.04.015a.5.5 0 0 1 .093.05l.018.014q.02.014.04.033l2.012 2.011a.5.5 0 0 1-.638.765l-.07-.057L3 3.707V7.5a1.5 1.5 0 0 0 1.356 1.493L4.5 9H6a.5.5 0 0 1 .09.992L6 10H4.5a2.5 2.5 0 0 1-2.495-2.336L2 7.5V3.707L.854 4.854a.5.5 0 0 1-.765-.638l.057-.07L2.16 2.135l.019-.017l.01-.009l-.042.037l.047-.041l.04-.028a.5.5 0 0 1 .162-.066l.036-.006L2.5 2zM7.5 2A2.5 2.5 0 0 1 10 4.5v3.792l1.146-1.146a.5.5 0 0 1 .765.638l-.057.07l-2 2l-.013.011l-.039.033l.052-.044A.5.5 0 0 1 9.5 10l.072-.005L9.52 10H9.5a.5.5 0 0 1-.284-.089l-.018-.013l-.04-.033l-.012-.011l-2-2a.5.5 0 0 1 .638-.765l.07.057L9 8.292V4.5a1.5 1.5 0 0 0-1.356-1.493L7.5 3H6a.5.5 0 0 1 0-1zm-5.302.102l-.005.003l-.005.004zm.239-.098l-.006.001h-.005zm.014-.002l-.014.002l.01-.001zM2.5 2l-.049.002L2.489 2z" />
        </svg>
        <span className="repost-count" style={{ color: 'var(--text-main)' }}>
          {counts[postId]?.reposts || 0}
        </span>
      </motion.button>

      {/* Like */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        className={`icon-btn like-btn btn-press ${myLikedPosts.has(postId) ? 'liked' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          handleLike(postId, creatorId);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className={`icon heart ${myLikedPosts.has(postId) ? 'heart-pop active' : ''}`}
          fill="currentColor"
          style={{
            color: myLikedPosts.has(postId) ? '#ff2e63' : 'var(--text-main)',
            transition: '0.2s',
          }}
        >
          <path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z" />
        </svg>
        <span className="like-count" style={{ color: 'var(--text-main)' }}>
          {counts[postId]?.likes || 0}
        </span>
      </motion.button>

      {/* Comment */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        className="icon-btn comment-toggle btn-press"
        data-post={postId}
        data-creator={creatorId}
        onClick={handleOpenComment}
      >
        <svg
          viewBox="0 0 24 24"
          className="icon"
          fill="currentColor"
          style={{ color: 'var(--text-main)' }}
        >
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
        <span className="comment-count" style={{ color: 'var(--text-main)' }}>
          {counts[postId]?.comments || 0}
        </span>
      </motion.button>
    </div>
  );
};

export default EngagementButtons;