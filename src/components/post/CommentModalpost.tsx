// CommentModal.tsx
'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif, requireLogin, getUserBadge } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { getOptimizedImage, containsBadWords, formatTimeAgo } from '@/lib/comment-utils';

import CommentItem from './CommentItem';
import CommentInputBar from './CommentInputBar';
import CommentActionSheet from './CommentActionSheet';

import './CommentModal.css';

function CommentModalContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- STATE ---
  const [isActive, setIsActive] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [dislikedComments, setDislikedComments] = useState<Set<string>>(new Set());
  const [commentLikesCount, setCommentLikesCount] = useState<Record<string, number>>({});

  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [currentCreatorId, setCurrentCreatorId] = useState<string | null>(null);
  const [isCommentsDisabled, setIsCommentsDisabled] = useState(false);

  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const [replyToUserId, setReplyToUserId] = useState<string | null>(null);

  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<any[]>([]);

  const [actionSheetComment, setActionSheetComment] = useState<any>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'comment' | 'likes_all' | 'likes_friends'>('comment');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [postLikers, setPostLikers] = useState<any[]>([]);
  const [mutualUsers, setMutualUsers] = useState<Set<string>>(new Set());
  const [isLoadingLikers, setIsLoadingLikers] = useState(false);

  const [showStickers, setShowStickers] = useState(false);
  const [stickers, setStickers] = useState<any[]>([]);
  const [stickerQuery, setStickerQuery] = useState('');

  // ==================== SINKRONISASI URL ====================
  useEffect(() => {
    const openComment = searchParams?.get('openComment');
    const postId = searchParams?.get('id');

    if (openComment === 'true' && postId) {
      setCurrentPostId(postId);
      setIsActive(true);
      setActiveTab('comment');
      document.body.style.overflow = 'hidden';

      (async () => {
        const { data } = await supabase.from('posts').select('creator_id').eq('id', postId).single();
        if (data) setCurrentCreatorId(data.creator_id);
      })();

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) setMyUserId(session.user.id);
      });

      loadComments(postId);
      checkPostSettings(postId);
    } else {
      closeModal(false);
    }
  }, [searchParams]);

  const checkPostSettings = async (postId: string) => {
    try {
      const { data } = await supabase.from('posts').select('comments_disabled').eq('id', postId).single();
      setIsCommentsDisabled(!!data?.comments_disabled);
    } catch (err) {
      console.error('Gagal cek status komentar', err);
    }
  };

  const checkMutuals = async (userId: string) => {
    try {
      const [followsRes, followersRes] = await Promise.all([
        supabase.from('followers').select('following_id').eq('follower_id', userId),
        supabase.from('followers').select('follower_id').eq('following_id', userId),
      ]);
      if (followsRes.data && followersRes.data) {
        const followingSet = new Set(followsRes.data.map(f => String(f.following_id)));
        const followerSet = new Set(followersRes.data.map(f => String(f.follower_id)));
        const mutuals = new Set([...followingSet].filter(x => followerSet.has(x)));
        setMutualUsers(mutuals);
      }
    } catch (err) {
      console.error('Error cek mutuals', err);
    }
  };

  useEffect(() => {
    if (myUserId && currentCreatorId && currentCreatorId === myUserId) {
      checkMutuals(myUserId);
    }
  }, [myUserId, currentCreatorId]);

  const loadLikers = async () => {
    if (!currentPostId) return;
    setIsLoadingLikers(true);
    try {
      const { data } = await supabase
        .from('likes')
        .select('user_id, created_at, profiles(id, username, full_name, avatar_url, role)')
        .eq('post_id', currentPostId)
        .order('created_at', { ascending: false });

      setPostLikers(data || []);
    } catch (err) {
      console.error('Error load likers', err);
    }
    setIsLoadingLikers(false);
  };

  useEffect(() => {
    if ((activeTab === 'likes_all' || activeTab === 'likes_friends') && currentPostId && postLikers.length === 0) {
      loadLikers();
    }
  }, [activeTab, currentPostId]);

  const closeModal = (updateUrl = true) => {
    setIsActive(false);
    document.body.style.overflow = '';
    setReplyToId(null);
    setReplyToUsername(null);
    setReplyToUserId(null);
    setInputValue('');
    setShowMentions(false);
    setShowStickers(false);
    setStickerQuery('');
    setIsActionSheetOpen(false);
    setPostLikers([]);

    if (updateUrl) {
      router.replace(pathname, { scroll: false });
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal(true);
  };

  // ==================== LOAD COMMENTS ====================
  const loadComments = async (postId: string, userId?: string) => {
    setIsLoading(true);
    const { data: commsData } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id, parent_id, reply_to_username, profiles(id, username, avatar_url, role)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commsData && commsData.length > 0) {
      const commentIds = commsData.map(c => c.id);
      const { data: allLikesData } = await supabase.from('comment_likes').select('comment_id').in('comment_id', commentIds);

      const newCounts: Record<string, number> = {};
      commentIds.forEach(id => (newCounts[String(id)] = 0));
      allLikesData?.forEach(like => {
        newCounts[String(like.comment_id)] += 1;
      });
      setCommentLikesCount(newCounts);
      setComments(commsData);

      if (userId) {
        const { data: myLikes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', userId)
          .in('comment_id', commentIds);
        const likedSet = new Set<string>();
        myLikes?.forEach(l => likedSet.add(String(l.comment_id)));
        setLikedComments(likedSet);
      }
    } else {
      setComments([]);
    }
    setIsLoading(false);
  };

  // ✅ FIX: Helper untuk dispatch event count update
  const dispatchCommentCountUpdate = (postId: string, newCount: number) => {
    window.dispatchEvent(
      new CustomEvent('commentCountUpdated', {
        detail: { postId, newCount },
      })
    );
  };

  // ==================== GIFT HANDLER ====================
  useEffect(() => {
    const handleInsertGift = async (e: any) => {
      const { postId, giftName, creatorId } = e.detail;
      if (!postId) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const content = `GIFT||${giftName}`;
        await supabase.from('comments').insert({
          post_id: parseInt(postId),
          user_id: session.user.id,
          content: content,
          parent_id: null,
          reply_to_username: null,
        });

        if (creatorId !== session.user.id && creatorId) {
          const { data: prof } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
          await supabase.from('notifications').insert({
            user_id: creatorId,
            actor_id: session.user.id,
            post_id: parseInt(postId),
            type: 'gift',
            message: t('notif_gave_gift', { username: prof?.username, giftName: giftName }),
          });
        }

        // ✅ FIX: Refresh comment list + update count via event
        if (currentPostId === String(postId)) {
          loadComments(String(postId), session.user.id);
        }

        // Ambil count terbaru dari DB
        const { count } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', postId);
        dispatchCommentCountUpdate(String(postId), count || 0);
      } catch (err) {
        console.error(err);
      }
    };
    window.addEventListener('insertGiftComment', handleInsertGift);
    return () => window.removeEventListener('insertGiftComment', handleInsertGift);
  }, [t, currentPostId]);

  // ==================== STICKERS ====================
  const fetchStickers = async (q = '') => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
      const res = await fetch(
        `https://api.giphy.com/v1/stickers/${q ? 'search' : 'trending'}?api_key=${apiKey}&limit=20&rating=g${q ? `&q=${q}` : ''}`
      );
      const d = await res.json();
      setStickers(d.data || []);
    } catch (error) {
      console.error('Gagal memuat stiker', error);
    }
  };

  useEffect(() => {
    if (!showStickers) return;
    const delayDebounceFn = setTimeout(() => {
      fetchStickers(stickerQuery);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [stickerQuery, showStickers]);

  // ==================== INPUT HANDLING ====================
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
        ...(followers?.map(f => f.follower_id) || []),
      ]);

      if (connectedIds.size > 0) {
        let query = supabase
          .from('profiles')
          .select('id, username, avatar_url, role')
          .in('id', Array.from(connectedIds))
          .limit(10);
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

  // ==================== KIRIM KOMENTAR TEKS ====================
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() && !isSubmitting && !showMentions) {
      e.preventDefault();
      if (!currentPostId || isCommentsDisabled) return;

      let finalContent = inputValue.trim();
      if (containsBadWords(finalContent)) {
        showNotif('Komentar ditolak! Mengandung bahasa yang tidak pantas.', 'error');
        return;
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

        const { data: newComment, error } = await supabase
          .from('comments')
          .insert({
            post_id: pid,
            user_id: userId,
            content: finalContent,
            parent_id: parentId ? parseInt(parentId) : null,
            reply_to_username: targetUser || null,
          })
          .select('*, profiles(id, username, avatar_url, role)')
          .single();

        if (error) throw error;

        const { data: myProf } = await supabase.from('profiles').select('username').eq('id', userId).single();

        if (targetUserId && targetUserId !== userId) {
          await supabase.from('notifications').insert({
            user_id: targetUserId,
            actor_id: userId,
            post_id: pid,
            type: 'reply',
            message: `${myProf?.username} membalas komentar Anda.`,
          });
        }

        if (currentCreatorId && currentCreatorId !== userId && currentCreatorId !== targetUserId && !parentId) {
          await supabase.from('notifications').insert({
            user_id: currentCreatorId,
            actor_id: userId,
            post_id: pid,
            type: 'comment',
            message: t('notif_commented', { username: myProf?.username }),
          });
        }

        if (newComment) {
          setComments(prev => [newComment, ...prev]);
          setCommentLikesCount(prev => ({ ...prev, [String(newComment.id)]: 0 }));
          // ✅ FIX: Dispatch count update
          const newCount = comments.length + 1;
          dispatchCommentCountUpdate(currentPostId, newCount);
        }

        setReplyToId(null);
        setReplyToUsername(null);
        setReplyToUserId(null);
        setInputValue('');
      } catch (err) {
        showNotif(t('comment_error'), 'error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ==================== KIRIM STICKER ====================
  const handleSendSticker = async (stickerUrl: string) => {
    if (!currentPostId || isCommentsDisabled || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;
      const pid = parseInt(currentPostId);
      const parentId = replyToId;
      const targetUser = replyToUsername;
      const targetUserId = replyToUserId;

      let finalCaption = inputValue.trim();
      if (containsBadWords(finalCaption)) {
        showNotif('Komentar ditolak! Mengandung bahasa yang tidak pantas.', 'error');
        setIsSubmitting(false);
        return;
      }

      if (targetUser && finalCaption.startsWith(`@${targetUser}`)) {
        finalCaption = finalCaption.replace(`@${targetUser}`, '').trim();
      }

      const content = `STICKER||${stickerUrl}||${finalCaption}`;

      const { data: newComment, error } = await supabase
        .from('comments')
        .insert({
          post_id: pid,
          user_id: userId,
          content: content,
          parent_id: parentId ? parseInt(parentId) : null,
          reply_to_username: targetUser || null,
        })
        .select('*, profiles(id, username, avatar_url, role)')
        .single();

      if (error) throw error;

      const { data: myProf } = await supabase.from('profiles').select('username').eq('id', userId).single();

      if (targetUserId && targetUserId !== userId) {
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          actor_id: userId,
          post_id: pid,
          type: 'reply',
          message: `${myProf?.username} membalas dengan stiker.`,
        });
      }

      if (currentCreatorId && currentCreatorId !== userId && currentCreatorId !== targetUserId && !parentId) {
        await supabase.from('notifications').insert({
          user_id: currentCreatorId,
          actor_id: userId,
          post_id: pid,
          type: 'comment',
          message: `${myProf?.username} mengomentari postingan Anda dengan stiker.`,
        });
      }

      if (newComment) {
        setComments(prev => [newComment, ...prev]);
        setCommentLikesCount(prev => ({ ...prev, [String(newComment.id)]: 0 }));
        // ✅ FIX: Dispatch count update
        const newCount = comments.length + 1;
        dispatchCommentCountUpdate(currentPostId, newCount);
      }

      setReplyToId(null);
      setReplyToUsername(null);
      setReplyToUserId(null);
      setShowStickers(false);
      setStickerQuery('');
      setInputValue('');
    } catch (err) {
      showNotif(t('comment_error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== LIKE / DISLIKE ====================
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
      [commentIdStr]: Math.max(0, (prev[commentIdStr] || 0) + (isLiked ? -1 : 1)),
    }));

    try {
      if (isLiked) {
        await supabase.from('comment_likes').delete().match({ comment_id: commentId, user_id: session!.user.id });
      } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: session!.user.id });
      }
    } catch (err) {
      console.error('Like error', err);
    }
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
        [commentIdStr]: Math.max(0, (prev[commentIdStr] || 0) - 1),
      }));
      supabase
        .from('comment_likes')
        .delete()
        .match({ comment_id: parseInt(commentIdStr), user_id: session!.user.id })
        .then();
    }

    setDislikedComments(prev => {
      const newSet = new Set(prev);
      isDisliked ? newSet.delete(commentIdStr) : newSet.add(commentIdStr);
      return newSet;
    });
  };

  // ==================== ACTION SHEET ====================
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

    try {
      const { error } = await supabase.from('comments').delete().eq('id', actionSheetComment.id);
      if (error) throw error;

      setComments(prev => prev.filter(c => c.id !== actionSheetComment.id && c.parent_id !== actionSheetComment.id));

      // ✅ FIX: Ambil count terbaru dari DB lalu dispatch event
      const { count } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', currentPostId);
      dispatchCommentCountUpdate(currentPostId!, count || 0);

      showNotif('Komentar dihapus', 'success');
    } catch (err) {
      showNotif('Gagal menghapus komentar', 'error');
    }
  };

  const handleReportComment = () => {
    setIsActionSheetOpen(false);
    showNotif('Laporan telah dikirim ke Admin untuk ditinjau.', 'info');
  };

  // ==================== MENTION CLICK ====================
  const handleMentionClick = async (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    try {
      const { data } = await supabase.from('profiles').select('id').eq('username', username).single();
      if (data && data.id) {
        window.location.href = `/data?id=${data.id}`;
      } else {
        showNotif(`User @${username} tidak ditemukan`, 'warning');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const setReplyData = (id: string, username: string, userId: string) => {
    setReplyToId(id);
    setReplyToUsername(username);
    setReplyToUserId(userId);
    setInputValue(`@${username} `);
    inputRef.current?.focus();
  };

  const handleGiftClick = () => {
    if (!currentCreatorId) return;
    window.dispatchEvent(
      new CustomEvent('openGift', { detail: { creatorId: currentCreatorId, postId: currentPostId } })
    );
  };

  // ==================== DERIVED DATA ====================
  const isOwner = currentCreatorId === myUserId;
  const parents = comments.filter(c => !c.parent_id);
  const sortedParents = [...parents].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
  });

  // ==================== RENDER ====================
  return (
    <>
      <div
        id="commentModal"
        className={isActive ? 'active' : ''}
        onClick={handleOverlayClick}
        style={{ overscrollBehavior: 'none' }}
      >
        <div
          className="comment-box"
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {/* Header tetap */}
          <div style={{ flexShrink: 0 }}>
            <div className="modal-drag-indicator" />

            {isOwner ? (
              <div className="c-owner-tabs">
                <div
                  className={`c-tab ${activeTab === 'comment' ? 'active' : ''}`}
                  onClick={() => setActiveTab('comment')}
                >
                  Komentar
                </div>
                <div
                  className={`c-tab ${activeTab === 'likes_all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('likes_all')}
                >
                  Suka
                </div>
                <div
                  className={`c-tab ${activeTab === 'likes_friends' ? 'active' : ''}`}
                  onClick={() => setActiveTab('likes_friends')}
                >
                  Suka (Teman)
                </div>
              </div>
            ) : (
              <div className="comment-header">{t('comments_title')}</div>
            )}

            {activeTab === 'comment' && (
              <div className="c-filter-bar">
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {comments.length} Komentar
                </span>
                <button
                  className="c-filter-btn"
                  onClick={() => setSortOrder(prev => (prev === 'newest' ? 'oldest' : 'newest'))}
                >
                  <span className="material-icons" style={{ fontSize: '14px' }}>
                    sort
                  </span>
                  {sortOrder === 'newest' ? 'Terbaru' : 'Terlama'}
                </button>
              </div>
            )}
          </div>

          {/* List komentar (flex: 1) */}
          <div
            className="comment-list"
            id="commentListContainer"
            style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              transform: 'translateZ(0)',
              minHeight: 0,
            }}
          >
            {activeTab !== 'comment' ? (
              isLoadingLikers ? (
                <div className="loading-text">Memuat daftar suka...</div>
              ) : (
                (() => {
                  const filteredLikers =
                    activeTab === 'likes_friends'
                      ? postLikers.filter(l => mutualUsers.has(l.user_id))
                      : postLikers;
                  if (filteredLikers.length === 0)
                    return <div className="empty-text">Belum ada yang menyukai</div>;

                  return filteredLikers.map(liker => (
                    <div className="c-liker-item" key={liker.user_id}>
                      <div
                        className="c-liker-left"
                        onClick={() => (window.location.href = `/data?id=${liker.user_id}`)}
                      >
                        <img
                          className="c-liker-avatar"
                          src={
                            getOptimizedImage(liker.profiles?.avatar_url) ||
                            '/asets/png/profile.webp'
                          }
                          alt="av"
                        />
                        <div>
                          <div className="c-liker-name">
                            {liker.profiles?.username}
                            <span
                              dangerouslySetInnerHTML={{
                                __html: getUserBadge(liker.profiles?.role || 'user'),
                              }}
                            />
                          </div>
                          <div className="c-liker-time">{formatTimeAgo(liker.created_at)}</div>
                        </div>
                      </div>
                      <span className="material-icons" style={{ color: '#ff2e63', fontSize: '20px' }}>
                        favorite
                      </span>
                    </div>
                  ));
                })()
              )
            ) : isLoading ? (
              <div className="loading-text">{t('loading_comments')}</div>
            ) : sortedParents.length === 0 ? (
              <div className="empty-text">{t('empty_comments')}</div>
            ) : (
              sortedParents.map(p => {
                const allChilds = comments.filter(r => String(r.parent_id) === String(p.id));
                const firstCreatorReply = allChilds.find(c => c.user_id === currentCreatorId);
                const remainingChilds = firstCreatorReply
                  ? allChilds.filter(c => c.id !== firstCreatorReply.id)
                  : allChilds;
                const isExpanded = expandedReplies[p.id];

                return (
                  <div className="comment-thread" key={p.id}>
                    <CommentItem
                      comment={p}
                      isReply={false}
                      currentCreatorId={currentCreatorId}
                      likedComments={likedComments}
                      dislikedComments={dislikedComments}
                      commentLikesCount={commentLikesCount}
                      isCommentsDisabled={isCommentsDisabled}
                      handleTouchStart={handleTouchStart}
                      handleTouchEnd={handleTouchEnd}
                      handleLikeComment={handleLikeComment}
                      handleDislikeComment={handleDislikeComment}
                      handleMentionClick={handleMentionClick}
                      setReplyData={setReplyData}
                      inputRef={inputRef}
                    />

                    {firstCreatorReply && (
                      <div className="replies-container">
                        <div className="reply-group">
                          <div
                            className="thread-line"
                            style={{ height: 'calc(100% - 10px)', top: '10px' }}
                          ></div>
                          <div className="comment-item-wrap reply">
                            <span className="reply-curve" style={{ top: '15px' }}></span>
                            <CommentItem
                              comment={firstCreatorReply}
                              isReply={true}
                              currentCreatorId={currentCreatorId}
                              likedComments={likedComments}
                              dislikedComments={dislikedComments}
                              commentLikesCount={commentLikesCount}
                              isCommentsDisabled={isCommentsDisabled}
                              handleTouchStart={handleTouchStart}
                              handleTouchEnd={handleTouchEnd}
                              handleLikeComment={handleLikeComment}
                              handleDislikeComment={handleDislikeComment}
                              handleMentionClick={handleMentionClick}
                              setReplyData={setReplyData}
                              inputRef={inputRef}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {remainingChilds.length > 0 && (
                      <div className="replies-container">
                        <div
                          className="view-replies-btn"
                          onClick={() =>
                            setExpandedReplies(prev => ({
                              ...prev,
                              [p.id]: !prev[p.id],
                            }))
                          }
                        >
                          <span className="btn-line"></span>
                          {isExpanded
                            ? t('hide_replies')
                            : t('show_replies_count', { count: remainingChilds.length })}
                        </div>

                        {isExpanded && (
                          <div className="reply-group">
                            <div className="thread-line"></div>
                            {remainingChilds.map(c => (
                              <div className="comment-item-wrap reply" key={c.id}>
                                <span className="reply-curve"></span>
                                <CommentItem
                                  comment={c}
                                  isReply={true}
                                  currentCreatorId={currentCreatorId}
                                  likedComments={likedComments}
                                  dislikedComments={dislikedComments}
                                  commentLikesCount={commentLikesCount}
                                  isCommentsDisabled={isCommentsDisabled}
                                  handleTouchStart={handleTouchStart}
                                  handleTouchEnd={handleTouchEnd}
                                  handleLikeComment={handleLikeComment}
                                  handleDislikeComment={handleDislikeComment}
                                  handleMentionClick={handleMentionClick}
                                  setReplyData={setReplyData}
                                  inputRef={inputRef}
                                />
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

          {/* Input bar tetap */}
          <div style={{ flexShrink: 0 }}>
            {activeTab === 'comment' &&
              (isCommentsDisabled ? (
                <div
                  style={{
                    padding: '15px',
                    textAlign: 'center',
                    background: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border-card)',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Komentar dinonaktifkan oleh kreator.
                </div>
              ) : (
                <CommentInputBar
                  inputRef={inputRef}
                  inputValue={inputValue}
                  isSubmitting={isSubmitting}
                  showMentions={showMentions}
                  mentionResults={mentionResults}
                  showStickers={showStickers}
                  stickers={stickers}
                  stickerQuery={stickerQuery}
                  replyToUsername={replyToUsername}
                  handleInputChange={handleInputChange}
                  handleKeyDown={handleKeyDown}
                  handleSelectMention={handleSelectMention}
                  setStickerQuery={setStickerQuery}
                  handleSendSticker={handleSendSticker}
                  toggleStickers={() => {
                    const willShow = !showStickers;
                    setShowStickers(willShow);
                    if (willShow && stickers.length === 0) fetchStickers('');
                  }}
                  handleGiftClick={() => {
                    setShowStickers(false);
                    handleGiftClick();
                  }}
                />
              ))}
          </div>
        </div>
      </div>

      <CommentActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        comment={actionSheetComment}
        myUserId={myUserId}
        currentCreatorId={currentCreatorId}
        onDelete={handleDeleteComment}
        onReport={handleReportComment}
      />
    </>
  );
}

export default function CommentModalpost() {
  return (
    <Suspense fallback={null}>
      <CommentModalContent />
    </Suspense>
  );
}