'use client';

import { motion, AnimatePresence } from 'framer-motion'; 
import Lottie from 'lottie-react';
import { getOptimizedImage } from '@/lib/constants';
import { getUserBadge } from '@/lib/ui-utils';
import tigerJson from '@/assets/gifts/tiger.json';
import dogJson from '@/assets/gifts/dog.json';

const GIFT_DATA = [
  { id: 1, name: 'Tiger', amount: 1, animation: tigerJson },
  { id: 2, name: 'Dog', amount: 5, animation: dogJson },
];

export default function CommentItem({ 
  comment, isReply, currentCreatorId, handleLike, handleDislike, 
  likedComments, dislikedComments, commentLikesCount, setReplyTo, handleTouchStart 
}: any) {
  
  const p = comment.profiles;
  const isPostOwner = comment.user_id === currentCreatorId;
  const isCommentLiked = likedComments.has(String(comment.id));
  const currentLikeCount = commentLikesCount[String(comment.id)] || 0;
  
  // Logic Cek Tipe Komentar (Gift/Sticker/Text) dipisah ke sini
  let isGift = comment.content?.startsWith("GIFT||");
  let giftName = isGift ? comment.content.split("||")[1] : "";
  let giftAnimation = GIFT_DATA.find(g => g.name.toLowerCase() === giftName.toLowerCase())?.animation;

  return (
    <div 
      className="comment-item" 
      onContextMenu={(e) => e.preventDefault()}
      onTouchStart={() => handleTouchStart(comment)}
    >
      <img className="comment-avatar" src={getOptimizedImage(p?.avatar_url)} alt="Avatar" />
      
      <div className="comment-main-content">
        <span className="comment-username">
          {p?.username} {isPostOwner && <span className="creator-tag">CREATOR</span>}
        </span>
        
        <div className="comment-text">
           {isGift ? (
              <div className="gift-bubble">
                 <span>Memberi {giftName}</span>
                 {giftAnimation && <Lottie animationData={giftAnimation} loop style={{width: 80, height: 80}}/>}
              </div>
           ) : (
              <span>{comment.content}</span>
           )}
        </div>

        <div className="comment-actions">
           <span className="reply-btn" onClick={() => setReplyTo({
              id: isReply ? String(comment.parent_id) : String(comment.id),
              username: p?.username, userId: p?.id
           })}>Balas</span>
        </div>
      </div>

      <div className="comment-right-actions">
         {/* Tombol Like/Dislike (Kode Framer Motion dipindah ke sini) */}
         <button onClick={() => handleLike(String(comment.id))}>❤️ {currentLikeCount}</button>
      </div>
    </div>
  );
}
