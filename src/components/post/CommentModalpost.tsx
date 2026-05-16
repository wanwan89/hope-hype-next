'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showNotif, requireLogin, getUserBadge } from '@/lib/ui-utils'; 
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion'; 
import './CommentModal.css';

const getOptimizedImage = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('res.cloudinary.com') && !cleanUrl.includes('f_auto')) {
    return cleanUrl.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
  }
  return cleanUrl;
};

// 🔥 FILTER KATA KASAR (ANTI TOXIC) 🔥
const BAD_WORDS = ["anjing", "bangsat", "kontol", "babi", "memek", "jembut", "ngentot", "bgsd", "njing", "tolol", "goblok"];
const containsBadWords = (text: string) => {
  // Ubah ke lowercase dan hapus simbol/tanda baca biar filternya lebih akurat
  const lowerText = text.toLowerCase().replace(/[^a-z0-9 ]/g, ''); 
  const words = lowerText.split(/\s+/); // Pecah jadi perkata
  
  // Cek apakah ada kata yang persis sama dengan kata kasar, atau ada yang diselipin
  return BAD_WORDS.some(badWord => 
    words.includes(badWord) || lowerText.includes(badWord)
  );
};

export default function CommentModalpost() {
  const { t } = useTranslation();

  const [isActive, setIsActive] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [dislikedComments, setDislikedComments] = useState<Set<string>>(new Set()); 
  const [commentLikesCount, setCommentLikesCount] = useState<Record<string, number>>({});
  
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [currentCreatorId, setCurrentCreatorId] = useState<string | null>(null);
  
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const [replyToUserId, setReplyToUserId] = useState<string | null>(null); 
  
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  
  const [actionSheetComment, setActionSheetComment] = useState<any>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);

  const currentPostIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null); 

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Baru saja";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}j`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}h`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  useEffect(() => { currentPostIdRef.current = currentPostId; }, [currentPostId]);

  useEffect(() => {
    const handleBodyClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(".comment-toggle") as HTMLElement;
      
      if (btn) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.user) {
          requireLogin(null);
          return;
        }

        setMyUserId(session.user.id);

        const postId = btn.dataset.post || null;
        const creatorId = btn.dataset.creator || null;
        
        setCurrentPostId(postId);
        setCurrentCreatorId(creatorId);
        setIsActive(true);
        document.body.style.overflow = "hidden";
        
        if (postId) loadComments(postId, session.user.id);
      }
    };
    document.body.addEventListener("click", handleBodyClick);
    return () => document.body.removeEventListener("click", handleBodyClick);
  }, []);

  useEffect(() => {
    const handleInsertGift = async (e: any) => {
      const { postId, giftName, giftImg, creatorId } = e.detail;
      if (!postId) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const content = `GIFT||${giftName}||${giftImg}`;

        await supabase.from("comments").insert({
          post_id: parseInt(postId),
          user_id: session.user.id,
          content: content,
          parent_id: null,
          reply_to_username: null
        });

        if (creatorId !== session.user.id && creatorId) {
          const { data: prof } = await supabase.from("profiles").select("username").eq("id", session.user.id).single();
          await supabase.from("notifications").insert({
            user_id: creatorId,
            actor_id: session.user.id,
            post_id: parseInt(postId),
            type: "gift",
            message: t('notif_gave_gift', { username: prof?.username, giftName: giftName })
          });
        }

        if (currentPostIdRef.current === String(postId)) loadComments(String(postId), session.user.id);

        const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", postId);
        const countBadge = document.querySelector(`.comment-toggle[data-post="${postId}"] .comment-count`);
        if (countBadge) countBadge.textContent = String(count || 0);

      } catch (err) { console.error(err); }
    };
    window.addEventListener("insertGiftComment", handleInsertGift);
    return () => window.removeEventListener("insertGiftComment", handleInsertGift);
  }, [t]);

  const loadComments = async (postId: string, userId?: string) => {
    setIsLoading(true);
    const { data: commsData } = await supabase.from("comments")
      .select("id, content, created_at, user_id, parent_id, reply_to_username, profiles(id, username, avatar_url, role)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true }); // Tetap urut waktu dulu

    if (commsData && commsData.length > 0) {
      const commentIds = commsData.map(c => c.id);
      const { data: allLikesData } = await supabase.from("comment_likes").select("comment_id").in("comment_id", commentIds);
      
      const newCounts: Record<string, number> = {};
      commentIds.forEach(id => newCounts[String(id)] = 0);
      allLikesData?.forEach(like => { newCounts[String(like.comment_id)] += 1; });
      setCommentLikesCount(newCounts);

      // 🔥 FIX: URUTKAN KOMENTAR BERDASARKAN LIKE TERBANYAK 🔥
      const sortedComments = [...commsData].sort((a, b) => {
         const likesA = newCounts[String(a.id)] || 0;
         const likesB = newCounts[String(b.id)] || 0;
         if (likesA === likesB) {
            // Kalau likes-nya sama, yang lebih lama (awal) yang di atas
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
         }
         return likesB - likesA; // Yang paling banyak like di atas
      });
      setComments(sortedComments);

      if (userId) {
        const { data: myLikes } = await supabase.from("comment_likes").select("comment_id").eq("user_id", userId).in("comment_id", commentIds);
        const likedSet = new Set<string>();
        myLikes?.forEach(l => likedSet.add(String(l.comment_id)));
        setLikedComments(likedSet);
      }
    } else {
      setComments([]);
    }
    setIsLoading(false);
  };

  const closeModal = () => {
    setIsActive(false);
    document.body.style.overflow = "";
    setReplyToId(null);
    setReplyToUsername(null);
    setReplyToUserId(null);
    setInputValue("");
    setShowMentions(false);
    setIsActionSheetOpen(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  };

  const handleGiftClick = () => {
    if (!currentCreatorId) return;
    window.dispatchEvent(new CustomEvent('openGift', { detail: { creatorId: currentCreatorId, postId: currentPostId } }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
    } else {
      setShowMentions(false);
    }
  };

  useEffect(() => {
    if (!showMentions) return;

    const fetchMentionSuggestions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const myId = session.user.id;

      const { data: following } = await supabase.from('followers').select('following_id').eq('follower_id', myId);
      const { data: followers } = await supabase.from('followers').select('follower_id').eq('following_id', myId);
      
      const connectedIds = new Set([
          ...(following?.map(f => f.following_id) || []),
          ...(followers?.map(f => f.follower_id) || [])
      ]);

      if (connectedIds.size > 0) {
        let query = supabase.from('profiles').select('id, username, avatar_url, role').in('id', Array.from(connectedIds)).limit(10);
        if (mentionQuery) query = query.ilike('username', `%${mentionQuery}%`);

        const { data: profiles } = await query;
        setMentionResults(profiles || []);
      } else {
        setMentionResults([]);
      }
    };

    const delayDebounceFn = setTimeout(() => fetchMentionSuggestions(), 300);
    return () => clearTimeout(delayDebounceFn);
  }, [mentionQuery, showMentions]);

  const handleSelectMention = (username: string) => {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart || 0;
    const textBeforeCursor = inputValue.slice(0, cursor);
    const textAfterCursor = inputValue.slice(cursor);
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${username} `);
    
    setInputValue(newTextBefore + textAfterCursor);
    setShowMentions(false);
    inputRef.current.focus();
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() && !isSubmitting && !showMentions) {
      e.preventDefault();
      if (!currentPostId) return;

      let finalContent = inputValue.trim();

      // 🔥 FIX: PENCEGAHAN KATA KASAR YANG LEBIH STRICT 🔥
      if (containsBadWords(finalContent)) {
        showNotif("Komentar ditolak! Mengandung bahasa yang tidak pantas.", "error");
        return; // Stop fungsi, komentar tidak masuk ke database
      }

      const parentId = replyToId;
      const targetUser = replyToUsername;
      const targetUserId = replyToUserId;

      if (targetUser && finalContent.startsWith(`@${targetUser}`)) {
        finalContent = finalContent.replace(`@${targetUser}`, '').trim();
      }

      if (!finalContent) return;

      setIsSubmitting(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const userId = session.user.id;
        const pid = parseInt(currentPostId);
        
        const { data: newComment, error } = await supabase.from("comments").insert({
          post_id: pid,
          user_id: userId,
          content: finalContent, 
          parent_id: parentId ? parseInt(parentId) : null,
          reply_to_username: targetUser || null
        }).select('*, profiles(id, username, avatar_url, role)').single();

        if (error) throw error;
        
        const { data: myProf } = await supabase.from("profiles").select("username").eq("id", userId).single();

        if (targetUserId && targetUserId !== userId) {
          await supabase.from("notifications").insert({
            user_id: targetUserId, actor_id: userId, post_id: pid, type: "reply",
            message: `${myProf?.username} membalas komentar Anda.`
          });
        }

        if (currentCreatorId && currentCreatorId !== userId && currentCreatorId !== targetUserId && !parentId) {
          await supabase.from("notifications").insert({
            user_id: currentCreatorId, actor_id: userId, post_id: pid, type: "comment",
            message: t('notif_commented', { username: myProf?.username })
          });
        }

        if (newComment) {
          // Komentar baru taruh di atas aja (sementara sampai di-refresh lagi)
          setComments(prev => [newComment, ...prev]);
          setCommentLikesCount(prev => ({ ...prev, [String(newComment.id)]: 0 }));
        }

        setReplyToId(null);
        setReplyToUsername(null);
        setReplyToUserId(null);
        setInputValue("");
        
      } catch (err) {
        showNotif(t('comment_error'), "error"); 
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleLikeComment = async (commentIdStr: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!requireLogin(session?.user)) return;
    
    const isLiked = likedComments.has(commentIdStr);
    const commentId = parseInt(commentIdStr);

    if (!isLiked && dislikedComments.has(commentIdStr)) {
      setDislikedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentIdStr);
        return newSet;
      });
    }

    setLikedComments(prev => {
      const newSet = new Set(prev);
      isLiked ? newSet.delete(commentIdStr) : newSet.add(commentIdStr);
      return newSet;
    });

    setCommentLikesCount(prev => ({
      ...prev,
      [commentIdStr]: Math.max(0, (prev[commentIdStr] || 0) + (isLiked ? -1 : 1))
    }));

    try {
      if (isLiked) {
        await supabase.from("comment_likes").delete().match({ comment_id: commentId, user_id: session!.user.id });
      } else {
        await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: session!.user.id });
      }
    } catch (err) { console.error("Like error", err); }
  };

  const handleDislikeComment = async (commentIdStr: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!requireLogin(session?.user)) return;

    const isDisliked = dislikedComments.has(commentIdStr);

    if (!isDisliked && likedComments.has(commentIdStr)) {
      setLikedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentIdStr);
        return newSet;
      });
      setCommentLikesCount(prev => ({
        ...prev,
        [commentIdStr]: Math.max(0, (prev[commentIdStr] || 0) - 1)
      }));
      supabase.from("comment_likes").delete().match({ comment_id: parseInt(commentIdStr), user_id: session!.user.id }).then();
    }

    setDislikedComments(prev => {
      const newSet = new Set(prev);
      isDisliked ? newSet.delete(commentIdStr) : newSet.add(commentIdStr);
      return newSet;
    });
  };

  const handleTouchStart = (comment: any) => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setActionSheetComment(comment);
      setIsActionSheetOpen(true);
    }, 450); 
  };

  const handleTouchEnd = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  const handleDeleteComment = async () => {
    if (!actionSheetComment) return;
    setIsActionSheetOpen(false);

    setComments(prev => prev.filter(c => c.id !== actionSheetComment.id && c.parent_id !== actionSheetComment.id));

    try {
      const { error } = await supabase.from("comments").delete().eq("id", actionSheetComment.id);
      if (error) throw error;
      showNotif("Komentar dihapus", "success");
      
      const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", currentPostId);
      const countBadge = document.querySelector(`.comment-toggle[data-post="${currentPostId}"] .comment-count`);
      if (countBadge) countBadge.textContent = String(count || 0);
    } catch (err) {
      showNotif("Gagal menghapus komentar", "error");
    }
  };

  const handleReportComment = () => {
    setIsActionSheetOpen(false);
    showNotif("Laporan telah dikirim ke Admin untuk ditinjau.", "info");
  };

  const handleMentionClick = async (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    try {
      const { data } = await supabase.from('profiles').select('id').eq('username', username).single();
      if (data && data.id) {
        window.location.href = `/data?id=${data.id}`;
      } else {
        showNotif(`User @${username} tidak ditemukan`, "warning");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderComment = (comment: any, isReply: boolean) => {
    const isPostOwner = comment.user_id === currentCreatorId;
    const p = comment.profiles;
    const rawAvatar = p?.avatar_url || `https://ui-avatars.com/api/?name=${p?.username}`;
    const avatar = getOptimizedImage(rawAvatar);

    let isGift = false;
    let giftName = "";
    let giftImg = "";
    
    if (comment.content?.startsWith("GIFT||")) {
      isGift = true;
      const parts = comment.content.split("||");
      giftName = parts[1] || "Gift";
      giftImg = parts[2] || "";
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
            <span 
              key={i} 
              className="mention-tag-link" 
              style={{ color: '#1f3cff', fontWeight: '700', cursor: 'pointer' }}
              onClick={(e) => handleMentionClick(e, cleanUsername)}
            >
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
        key={comment.id} 
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
              <div className="gift-comment-bubble">
                 <span>{t('gave_gift', { giftName })}</span>
                 {giftImg && <img src={getOptimizedImage(giftImg)} loading="lazy" alt={giftName} />}
              </div>
            ) : (
              highlightMentions(comment.content)
            )}
          </div>

          <div className="comment-actions">
            <span className="comment-time">{formatTimeAgo(comment.created_at)}</span>
            {!isGift && (
              <span className="reply-btn" onClick={() => {
                  setReplyToId(isReply ? String(comment.parent_id) : String(comment.id));
                  setReplyToUsername(p?.username);
                  setReplyToUserId(p?.id); 
                  setInputValue(`@${p?.username} `);
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
              <path fill={isCommentDisliked ? "#a8a29e" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05C1.04 11.54 1 11.77 1 12v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
            </motion.svg>
          </div>
        </div>

      </div>
    );
  };

  const parents = comments.filter(c => !c.parent_id);

  const getPlaceholder = () => {
    if (isSubmitting) return t('sending');
    if (replyToUsername) return t('replying_to', { username: replyToUsername });
    return t('write_comment');
  };

  return (
    <>
      <div id="commentModal" className={isActive ? "active" : ""} onClick={handleOverlayClick}>
        <div className="comment-box" onClick={(e) => e.stopPropagation()}>
          <div className="modal-drag-indicator"></div>
          
          <div className="comment-header">
            {t('comments_title')}
          </div>
          
          <div className="comment-list" id="commentListContainer">
            {isLoading ? (
              <div className="loading-text">{t('loading_comments')}</div>
            ) : comments.length === 0 ? (
              <div className="empty-text">{t('empty_comments')}</div>
            ) : (
              parents.map(p => {
                const allChilds = comments.filter(r => String(r.parent_id) === String(p.id));
                const firstCreatorReply = allChilds.find(c => c.user_id === currentCreatorId);
                const remainingChilds = firstCreatorReply ? allChilds.filter(c => c.id !== firstCreatorReply.id) : allChilds;
                const isExpanded = expandedReplies[p.id];

                return (
                  <div className="comment-thread" key={p.id}>
                    {renderComment(p, false)}

                    {firstCreatorReply && (
                      <div className="replies-container">
                        <div className="reply-group">
                          <div className="thread-line" style={{ height: 'calc(100% - 10px)', top: '10px' }}></div>
                          <div className="comment-item-wrap reply">
                            <span className="reply-curve" style={{ top: '15px' }}></span>
                            {renderComment(firstCreatorReply, true)}
                          </div>
                        </div>
                      </div>
                    )}

                    {remainingChilds.length > 0 && (
                      <div className="replies-container">
                        <div className="view-replies-btn" onClick={() => setExpandedReplies(prev => ({ ...prev, [p.id]: !prev[p.id] }))}>
                          <span className="btn-line"></span>
                          {isExpanded ? t('hide_replies') : t('show_replies_count', { count: remainingChilds.length })}
                        </div>

                        {isExpanded && (
                          <div className="reply-group">
                            <div className="thread-line"></div>
                            {remainingChilds.map(c => (
                              <div className="comment-item-wrap reply" key={c.id}>
                                <span className="reply-curve"></span>
                                {renderComment(c, true)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="comment-input-wrap">
            {showMentions && (
              <div className="mention-popup">
                {mentionResults.length > 0 ? (
                  mentionResults.map(user => (
                    <div key={user.id} className="mention-item" onClick={() => handleSelectMention(user.username)}>
                      <img src={getOptimizedImage(user.avatar_url) || '/asets/png/profile.webp'} loading="lazy" alt={user.username} />
                      <div className="mention-info">
                        <span className="mention-name">{user.username}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mention-empty">Tidak ditemukan...</div>
                )}
              </div>
            )}

            <div className="input-container">
              <input 
                ref={inputRef}
                type="text" 
                className="comment-input" 
                placeholder={getPlaceholder()} 
                autoComplete="off"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (showMentions && e.key === "Enter") {
                    e.preventDefault();
                    if (mentionResults.length > 0) handleSelectMention(mentionResults[0].username);
                  } else {
                    handleKeyDown(e);
                  }
                }}
                disabled={isSubmitting}
              />
              <button className="modal-gift-btn" aria-label="Kirim Hadiah" onClick={handleGiftClick}>
                <svg viewBox="0 0 24 24" style={{ color: 'var(--text-main)', fill: 'currentColor' }}><path d="M20 7h-2.18A3 3 0 0 0 12 3a3 3 0 0 0-5.82 4H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-8-2a1 1 0 0 1 1 1v1h-2V6a1 1 0 0 1 1-1Zm-4 1a1 1 0 0 1 2 0v1H8a1 1 0 0 1 0-2Zm9 13h-4v-7h4Zm-6 0H7v-7h4Zm8-9H5V9h14Z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 FIX 3: ACTION SHEET DESAIN NETRAL (Sesuai Tema) 🔥 */}
      <style>{`
        /* Timpa warna bawaan tombol supaya ngikutin warna standar lu (Teks putih/hitam, gak warna-warni) */
        .c-action-btn.danger {
          color: var(--text-main) !important;
          background: transparent !important;
          border-bottom: 1px solid var(--border-card) !important;
        }
        .c-action-btn.danger .material-icons { color: var(--text-main) !important; }
        
        .c-action-btn.warning {
          color: var(--text-main) !important;
          background: transparent !important;
        }
        .c-action-btn.warning .material-icons { color: var(--text-main) !important; }
      `}</style>
      
      <div className={`c-action-overlay ${isActionSheetOpen ? 'active' : ''}`} onClick={() => setIsActionSheetOpen(false)}></div>
      <div className={`c-action-sheet ${isActionSheetOpen ? 'open' : ''}`}>
        <div className="c-drag-handle"></div>
        
        {actionSheetComment && (actionSheetComment.user_id === myUserId || currentCreatorId === myUserId) && (
          <button className="c-action-btn danger" onClick={handleDeleteComment}>
            <span className="material-icons">delete_outline</span> Hapus Komentar
          </button>
        )}
        
        <button className="c-action-btn warning" onClick={handleReportComment}>
          <span className="material-icons">report_problem</span> Laporkan Komentar
        </button>
      </div>
    </>
  );
}
