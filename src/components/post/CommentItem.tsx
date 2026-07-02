// components/CommentItem.tsx
'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedImage, formatTimeAgo } from '@/lib/comment-utils';
import { getUserBadge } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';

// Komponen SVG untuk Kado
const DogSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 16 16" style={{ color: '#3498DB' }}>
    <path d="M0 0h16v16H0z" fill="none" />
    <path fill="currentColor" d="M4.66 15H3.641a2.641 2.641 0 0 1-1.93-4.445l.797-.855a2.176 2.176 0 0 0-.052-3.023l-.783-.783a.5.5 0 0 1 .707-.707l.782.783a3.176 3.176 0 0 1 .076 4.412l-.797.855A1.643 1.643 0 0 0 3.64 14h.503c-.002-.204-.001-.46.008-.752c.026-.76.11-1.783.35-2.814c.24-1.025.642-2.098 1.33-2.924c.613-.736 1.446-1.265 2.542-1.388V3.186A2.19 2.19 0 0 1 10.56 1c.508 0 .92.413.92.922v.483h1.177c.66 0 1.271.341 1.619.902l.435.702c.761 1.229-.068 2.804-1.475 2.905v6.532c0 .858-.695 1.554-1.553 1.554h-.553v-1.554a2.607 2.607 0 0 0-2.607-2.608h-.878a.5.5 0 0 0 0 1h.878c.887 0 1.607.72 1.607 1.608V15z" />
  </svg>
);

const TigerSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 48 48" style={{ color: '#FFB300' }}>
    <path d="M0 0h48v48H0z" fill="none" />
    <g fill="currentColor">
      <path fillRule="evenodd" d="M20.208 13c-4.646 0-7.192.935-8.807 2.274c-1.352-.426-2.551-.346-4.401.175c1.252.907 1.936 1.553 2.402 2.288c-.233.4-.448.806-.663 1.211C7.738 20.84 6.747 22.711 4 23.762v3.32c1.98 1.96 5.972 3.312 9.108 2.87c1.628 3.824 6.97 3.165 11.099 2.656l.77-.094c-.689-.948-1.04-2.149-.968-3.565a1 1 0 0 1 1.998.102c-.072 1.4.425 2.323 1.226 2.933c.76.578 1.88.935 3.266 1.004C35.79 32.728 40 28.356 40 23c0-5.198-3.966-9.47-9.036-9.954V13zM13 21a1 1 0 1 0 0-2a1 1 0 0 0 0 2" clipRule="evenodd" />
      <path fillRule="evenodd" d="M41.126 11.046c.548.5.874 1.22.874 2.079c0 .303-.044.594-.12.869a30 30 0 0 1 1.008-.024a1 1 0 0 1 0 2c-.32 0-.642.012-.99.025c-.234.008-.48.017-.747.023q-.248.006-.506.006c-.331.348-.69.657-1.033.923a13.4 13.4 0 0 1-2.123 1.333l-.04.02l-.012.006l-.004.002h-.002L37 17.406l-.43-.903l.004-.002l.026-.013q.038-.018.111-.056a12 12 0 0 0 1.35-.825a3 3 0 0 1-.673-.422c-.587-.5-.888-1.209-.888-2.06c0-.861.324-1.584.875-2.084a2.78 2.78 0 0 1 1.877-.704a2.8 2.8 0 0 1 1.874.71m-1.408 2.935c.195-.32.282-.605.282-.856c0-.329-.112-.501-.22-.599a.8.8 0 0 0-.532-.19a.8.8 0 0 0-.53.186c-.105.095-.218.267-.218.603c0 .345.101.466.184.536c.129.11.384.226.843.295q.093.015.191.025" clipRule="evenodd" />
      <path d="M16 30h3v8h-3zm-1 7a1 1 0 0 1 1-1v2h-1zm16-7h3v8h-3zm-1 7a1 1 0 0 1 1-1v2h-1z" />
    </g>
  </svg>
);

// Data Kado langsung di-map ke komponen React SVG
const GIFT_DATA = [
  { id: 1, name: 'Tiger', amount: 1, icon: <TigerSVG /> },
  { id: 2, name: 'Dog', amount: 5, icon: <DogSVG /> },
];

interface CommentItemProps {
  comment: any;
  isReply: boolean;
  currentCreatorId: string | null;
  likedComments: Set<string>;
  dislikedComments: Set<string>;
  commentLikesCount: Record<string, number>;
  isCommentsDisabled: boolean;
  handleTouchStart: (comment: any) => void;
  handleTouchEnd: () => void;
  handleLikeComment: (id: string) => void;
  handleDislikeComment: (id: string) => void;
  handleMentionClick: (e: any, username: string) => void;
  setReplyData: (id: string, username: string, userId: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const CommentItem = ({
  comment, isReply, currentCreatorId, likedComments, dislikedComments,
  commentLikesCount, isCommentsDisabled, handleTouchStart, handleTouchEnd,
  handleLikeComment, handleDislikeComment, handleMentionClick, setReplyData, inputRef
}: CommentItemProps) => {
  const { t } = useTranslation();
  const isPostOwner = comment.user_id === currentCreatorId;
  const p = comment.profiles;
  const rawAvatar = p?.avatar_url || `https://ui-avatars.com/api/?name=${p?.username}`;
  const avatar = getOptimizedImage(rawAvatar);

  let isGift = false;
  let isSticker = false;
  let giftName = "";
  let giftIcon: React.ReactNode = null;
  let stickerUrl = "";
  let stickerCaption = "";

  if (comment.content?.startsWith("GIFT||")) {
    isGift = true;
    const parts = comment.content.split("||");
    giftName = parts[1] || "Gift";
    const giftObj = GIFT_DATA.find(g => g.name.toLowerCase() === giftName.toLowerCase());
    if (giftObj) giftIcon = giftObj.icon;
  } else if (comment.content?.startsWith("STICKER||")) {
    isSticker = true;
    const parts = comment.content.split("||");
    stickerUrl = parts[1] || "";
    stickerCaption = parts[2] || ""; 
  }

  const isCommentLiked = likedComments.has(String(comment.id));
  const isCommentDisliked = dislikedComments.has(String(comment.id));
  const currentLikeCount = commentLikesCount[String(comment.id)] || 0;

  const highlightMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const cleanUsername = part.substring(1);
        return (
          <span key={i} className="mention-tag-link" onClick={(e) => handleMentionClick(e, cleanUsername)}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div 
      className="comment-item" 
      onTouchStart={() => handleTouchStart(comment)} 
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd} 
      onMouseDown={() => handleTouchStart(comment)}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onContextMenu={(e) => { e.preventDefault(); }} 
    >
      <div className="comment-left">
        <img className="comment-avatar" src={avatar} loading="lazy" onClick={() => window.location.href = `/data?id=${p?.id}`} alt="Avatar" />
      </div>
      
      <div className="comment-main-content">
        <div className="comment-topline">
          <span className="comment-username" onClick={() => window.location.href = `/data?id=${p?.id}`}>
            {p?.username} 
            <span dangerouslySetInnerHTML={{ __html: getUserBadge(p?.role || 'user') }} style={{ display: 'inline-flex', alignItems: 'center' }} />
            {isPostOwner && <span className="creator-tag">CREATOR</span>}
          </span>
        </div>
        
        <div className="comment-text">
          {comment.reply_to_username && <span className="reply-tag">@{comment.reply_to_username}</span>}
          {' '} 
          {isGift ? (
            <div className="gift-comment-bubble" style={{ background: 'rgba(150, 150, 150, 0.15)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '12px 16px', borderRadius: '12px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', border: '1px solid rgba(255, 255, 255, 0.1)', gap: '6px', marginTop: '4px' }}>
               <span style={{ fontSize: '13px', fontWeight: 600 }}>Memberi {giftName}</span>
               {giftIcon ? (
                 <div style={{ width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                   {/* Langsung me-render SVG component dari variabel */}
                   {giftIcon}
                 </div>
               ) : (
                 <div style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} />
               )}
            </div>
          ) : isSticker ? (
            <div className="sticker-comment-bubble" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
               {stickerCaption && <div className="sticker-caption">{highlightMentions(stickerCaption)}</div>}
               <img src={stickerUrl} loading="lazy" alt="Sticker" style={{ maxWidth: '120px', borderRadius: '8px', background: 'transparent' }} />
            </div>
          ) : (
            highlightMentions(comment.content)
          )}
        </div>

        <div className="comment-actions">
          <span className="comment-time">{formatTimeAgo(comment.created_at)}</span>
          {!isCommentsDisabled && (
            <span className="reply-btn" onClick={() => {
                setReplyData(isReply ? String(comment.parent_id) : String(comment.id), p?.username, p?.id);
                inputRef.current?.focus();
            }}>
              {t('reply', 'Balas')}
            </span>
          )}
        </div>
      </div>

      <div className="comment-right-actions">
        <div className="action-button-wrapper" onClick={(e) => { e.stopPropagation(); handleLikeComment(String(comment.id)); }}>
          <div style={{ position: 'relative' }}>
            <AnimatePresence>
              {isCommentLiked && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{ position: 'absolute', top: '-4px', left: '-4px', right: '-4px', bottom: '-4px', borderRadius: '50%', border: '2px solid #ff4757', pointerEvents: 'none' }}
                />
              )}
            </AnimatePresence>
            <motion.svg 
              viewBox="0 0 24 24" 
              className={`heart-icon ${isCommentLiked ? 'active' : ''}`} 
              whileTap={{ scale: 0.8 }}
              animate={isCommentLiked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {isCommentLiked ? (
                <path fill="#ff4757" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              ) : (
                <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              )}
            </motion.svg>
          </div>
          {currentLikeCount > 0 && <span className="action-count">{currentLikeCount}</span>}
        </div>

        <div className="action-button-wrapper" onClick={(e) => { e.stopPropagation(); handleDislikeComment(String(comment.id)); }}>
          <motion.svg 
            viewBox="0 0 24 24" 
            className={`dislike-icon ${isCommentDisliked ? 'active' : ''}`}
            whileTap={{ scale: 0.8 }}
          >
            <path fill={isCommentDisliked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05C1.04 11.54 1 11.77 1 12v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
          </motion.svg>
        </div>
      </div>
    </div>
  );
};

// Menggunakan React.memo agar komponen ini tidak re-render kecuali props-nya benar-benar berubah
export default memo(CommentItem);
