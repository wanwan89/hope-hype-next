// components/CommentItem.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import { getOptimizedImage, formatTimeAgo } from '@/lib/comment-utils';
import { getUserBadge } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';

// Data Kado
import tigerJson from '@/assets/gifts/tiger.json';
import dogJson from '@/assets/gifts/dog.json';

const GIFT_DATA = [
  { id: 1, name: 'Tiger', amount: 1, animation: tigerJson },
  { id: 2, name: 'Dog', amount: 5, animation: dogJson },
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

export default function CommentItem({
  comment, isReply, currentCreatorId, likedComments, dislikedComments,
  commentLikesCount, isCommentsDisabled, handleTouchStart, handleTouchEnd,
  handleLikeComment, handleDislikeComment, handleMentionClick, setReplyData, inputRef
}: CommentItemProps) {
  const { t } = useTranslation();
  const isPostOwner = comment.user_id === currentCreatorId;
  const p = comment.profiles;
  const rawAvatar = p?.avatar_url || `https://ui-avatars.com/api/?name=${p?.username}`;
  const avatar = getOptimizedImage(rawAvatar);

  let isGift = false;
  let isSticker = false;
  let giftName = "";
  let giftAnimationData: any = null;
  let stickerUrl = "";
  let stickerCaption = "";

  if (comment.content?.startsWith("GIFT||")) {
    isGift = true;
    const parts = comment.content.split("||");
    giftName = parts[1] || "Gift";
    const giftObj = GIFT_DATA.find(g => g.name.toLowerCase() === giftName.toLowerCase());
    if (giftObj) giftAnimationData = giftObj.animation;
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
               {giftAnimationData ? (
                 <div style={{ width: '80px', height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                   <Lottie animationData={giftAnimationData} loop={true} style={{ width: '100%', height: '100%' }} />
                 </div>
               ) : (
                 <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} />
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
}
