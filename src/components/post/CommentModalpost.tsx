'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; 
import { supabase } from '@/lib/supabase';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';
import './CommentModal.css';

function CommentModalContent() {
  const searchParams = useSearchParams(); 
  
  const [isActive, setIsActive] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [currentCreatorId, setCurrentCreatorId] = useState<string | null>(null);
  const [isCommentsDisabled, setIsCommentsDisabled] = useState(false);

  // States di-hoist dari anak
  const [replyTo, setReplyTo] = useState({ id: null, username: null, userId: null });
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [dislikedComments, setDislikedComments] = useState<Set<string>>(new Set());
  const [commentLikesCount, setCommentLikesCount] = useState<Record<string, number>>({});
  
  const [actionSheetComment, setActionSheetComment] = useState<any>(null);

  useEffect(() => {
     // ... (Logic pengecekan search params & fetch data utama)
  }, []);

  const handleCommentAdded = (newComment: any) => {
    setComments(prev => [newComment, ...prev]);
  };

  const handleGiftClick = () => {
    if (currentCreatorId) {
      window.dispatchEvent(new CustomEvent('openGift', { detail: { creatorId: currentCreatorId, postId: currentPostId } }));
    }
  };

  const parents = comments.filter(c => !c.parent_id);

  return (
    <>
      <div id="commentModal" className={isActive ? "active" : ""}>
        <div className="comment-box">
          <div className="comment-list">
            {parents.map(p => (
              <CommentItem 
                key={p.id} 
                comment={p} 
                isReply={false}
                currentCreatorId={currentCreatorId}
                setReplyTo={setReplyTo}
                handleTouchStart={setActionSheetComment}
                // ... pass likes states
              />
            ))}
          </div>

          <CommentInput 
             currentPostId={currentPostId}
             isCommentsDisabled={isCommentsDisabled}
             replyTo={replyTo}
             setReplyTo={setReplyTo}
             onCommentAdded={handleCommentAdded}
             handleGiftClick={handleGiftClick}
          />
        </div>
      </div>

      {/* ACTION SHEET UNTUK DELETE/REPORT */}
      {actionSheetComment && (
         <div className="c-action-sheet open">
           <button onClick={() => setActionSheetComment(null)}>Tutup</button>
         </div>
      )}
    </>
  );
}

export default function CommentModal() {
  return (
    <Suspense fallback={null}>
      <CommentModalContent />
    </Suspense>
  );
}
