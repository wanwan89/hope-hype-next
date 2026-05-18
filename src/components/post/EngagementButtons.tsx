'use client';
import React from 'react';

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
  postId, creatorId, counts, mySavedPosts, myRepostedPosts, myLikedPosts,
  animatingReposts, handleSave, openRepostModal, handleLike
}) => {
  return (
    <div className="engagement-group">
      <button className={`icon-btn save-btn btn-press ${mySavedPosts.has(postId) ? 'active' : ''}`}
        onClick={() => handleSave(postId)}>
        <svg viewBox="0 0 24 24" className="icon" fill="currentColor"
          style={{ color: mySavedPosts.has(postId) ? "#1f3cff" : "inherit", transition: '0.2s' }}>
          {mySavedPosts.has(postId)
            ? <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
            : <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />}
        </svg>
        <span className="save-count" style={{ color: 'var(--text-main)' }}>{counts[postId]?.saves || 0}</span>
      </button>

      <button className={`icon-btn repost-btn btn-press ${myRepostedPosts.has(postId) ? 'reposted' : ''}`}
        onClick={() => openRepostModal(postId, creatorId)}>
        <svg viewBox="0 0 24 24" className={`icon ${animatingReposts.has(postId) ? 'spin-anim' : ''}`}
          fill="currentColor" style={{ color: myRepostedPosts.has(postId) ? "#1f3cff" : "inherit", transition: '0.2s' }}>
          <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
        </svg>
        <span className="repost-count" style={{ color: 'var(--text-main)' }}>{counts[postId]?.reposts || 0}</span>
      </button>

      <button className={`icon-btn like-btn btn-press ${myLikedPosts.has(postId) ? 'liked' : ''}`}
        onClick={() => handleLike(postId, creatorId)}>
        <svg viewBox="0 0 24 24" className={`icon heart ${myLikedPosts.has(postId) ? 'heart-pop active' : ''}`}
          fill="currentColor" style={{ transition: '0.2s' }}>
          <path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z"/>
        </svg>
        <span className="like-count">{counts[postId]?.likes || 0}</span>
      </button>

      <button className="icon-btn comment-toggle btn-press" data-post={postId} data-creator={creatorId}>
        <svg viewBox="0 0 24 24" className="icon" fill="currentColor"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>
        <span className="comment-count">{counts[postId]?.comments || 0}</span>
      </button>
    </div>
  );
};

export default EngagementButtons;