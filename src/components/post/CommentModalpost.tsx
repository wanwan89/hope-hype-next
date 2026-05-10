'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showNotif, requireLogin, getUserBadge } from '@/lib/ui-utils'; 
import { useTranslation } from 'react-i18next';
import './CommentModal.css';

export default function CommentModalpost() {
  const { t } = useTranslation();

  const [isActive, setIsActive] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [currentCreatorId, setCurrentCreatorId] = useState<string | null>(null);
  
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // 🔥 STATE UNTUK MENTIONS (@)
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  
  const currentPostIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null); // Reference buat input

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
        if (!requireLogin(session?.user)) return;

        const postId = btn.dataset.post || null;
        const creatorId = btn.dataset.creator || null;
        
        setCurrentPostId(postId);
        setCurrentCreatorId(creatorId);
        setIsActive(true);
        document.body.style.overflow = "hidden";
        
        if (postId) loadComments(postId, session?.user?.id);
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
      .select("id, content, created_at, user_id, parent_id, reply_to_username, likes_count, profiles(id, username, avatar_url, role)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    setComments(commsData || []);

    if (userId && commsData) {
      const commentIds = commsData.map(c => c.id);
      const { data: myLikes } = await supabase.from("comment_likes").select("comment_id").eq("user_id", userId).in("comment_id", commentIds);
      const likedSet = new Set<string>();
      myLikes?.forEach(l => likedSet.add(String(l.comment_id)));
      setLikedComments(likedSet);
    }
    setIsLoading(false);
  };

  const closeModal = () => {
    setIsActive(false);
    document.body.style.overflow = "";
    setReplyToId(null);
    setReplyToUsername(null);
    setInputValue("");
    setShowMentions(false);
  };

  const handleGiftClick = () => {
    if (!currentCreatorId) return;
    window.dispatchEvent(new CustomEvent('openGift', { detail: { creatorId: currentCreatorId, postId: currentPostId } }));
  };

  // 🔥 FUNGSI DETEKSI KETIKAN & MENTIONS
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Ambil posisi kursor saat ini
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPosition);
    
    // Cari apakah ada kata berawalan @ tepat sebelum kursor
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
    } else {
      setShowMentions(false);
    }
  };

  // 🔥 FUNGSI PENCARIAN TEMAN UNTUK MENTIONS
  useEffect(() => {
    if (!showMentions) return;

    const fetchMentionSuggestions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const myId = session.user.id;

      // Ambil list ID following/followers
      const { data: following } = await supabase.from('followers').select('following_id').eq('follower_id', myId);
      const { data: followers } = await supabase.from('followers').select('follower_id').eq('following_id', myId);
      
      const connectedIds = new Set([
          ...(following?.map(f => f.following_id) || []),
          ...(followers?.map(f => f.follower_id) || [])
      ]);

      if (connectedIds.size > 0) {
        let query = supabase.from('profiles')
          .select('id, username, avatar_url, role')
          .in('id', Array.from(connectedIds))
          .limit(10);
        
        if (mentionQuery) {
          query = query.ilike('username', `%${mentionQuery}%`);
        }

        const { data: profiles } = await query;
        setMentionResults(profiles || []);
      } else {
        setMentionResults([]);
      }
    };

    // Debounce biar ga ngespam request
    const delayDebounceFn = setTimeout(() => {
      fetchMentionSuggestions();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [mentionQuery, showMentions]);

  const handleSelectMention = (username: string) => {
    if (!inputRef.current) return;
    
    const cursor = inputRef.current.selectionStart || 0;
    const textBeforeCursor = inputValue.slice(0, cursor);
    const textAfterCursor = inputValue.slice(cursor);
    
    // Ganti kata yang di-mention
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${username} `);
    
    setInputValue(newTextBefore + textAfterCursor);
    setShowMentions(false);
    inputRef.current.focus();
  };

  // 🔥 SUBMIT KOMENTAR & NOTIF MENTIONS
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() && !isSubmitting && !showMentions) {
      e.preventDefault();
      if (!currentPostId) return;

      setIsSubmitting(true);
      const content = inputValue.trim();
      const parentId = replyToId;
      const targetUser = replyToUsername;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const myUserId = session.user.id;

        const pid = parseInt(currentPostId);
        
        // 1. Insert Komentar (Optimistic)
        const { data: newComment, error } = await supabase.from("comments").insert({
          post_id: pid,
          user_id: myUserId,
          content: content,
          parent_id: parentId ? parseInt(parentId) : null,
          reply_to_username: targetUser || null
        }).select('*, profiles(id, username, avatar_url, role)').single();

        if (error) throw error;
        
        const { data: myProf } = await supabase.from("profiles").select("username").eq("id", myUserId).single();

        // 2. Notif ke Pemilik Postingan
        if (currentCreatorId !== myUserId && currentCreatorId) {
          await supabase.from("notifications").insert({
            user_id: currentCreatorId,
            actor_id: myUserId,
            post_id: pid,
            type: "comment",
            message: t('notif_commented', { username: myProf?.username })
          });
        }

        // 🔥 3. LOGIKA NOTIFIKASI MENTIONS (@) 🔥
        const mentionedUsernames = [...new Set((content.match(/@(\w+)/g) || []).map(m => m.substring(1)))];
        if (mentionedUsernames.length > 0) {
          const { data: taggedUsers } = await supabase.from('profiles').select('id, username').in('username', mentionedUsernames);
          
          if (taggedUsers) {
            const notifInserts = taggedUsers
              .filter(u => u.id !== myUserId) // Jangan notif diri sendiri
              .map(u => ({
                user_id: u.id,
                actor_id: myUserId,
                post_id: pid,
                type: "mention",
                message: `${myProf?.username} menyebut Anda dalam komentar.`
              }));
            
            if (notifInserts.length > 0) {
              await supabase.from("notifications").insert(notifInserts);
            }
          }
        }

        // Update UI secara instan
        if (newComment) setComments(prev => [...prev, newComment]);

        setReplyToId(null);
        setReplyToUsername(null);
        setInputValue("");
        
        loadComments(currentPostId, myUserId);

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

    setLikedComments(prev => {
      const newSet = new Set(prev);
      isLiked ? newSet.delete(commentIdStr) : newSet.add(commentIdStr);
      return newSet;
    });

    setComments(prevComments => 
      prevComments.map(c => 
        String(c.id) === commentIdStr 
          ? { ...c, likes_count: Math.max(0, (c.likes_count || 0) + (isLiked ? -1 : 1)) }
          : c
      )
    );

    try {
      if (isLiked) {
        await supabase.from("comment_likes").delete().match({ comment_id: commentId, user_id: session!.user.id });
      } else {
        await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: session!.user.id });
      }
    } catch (err) { console.error("Like error", err); }
  };

  const renderComment = (comment: any, isReply: boolean) => {
    const isPostOwner = comment.user_id === currentCreatorId;
    const p = comment.profiles;
    const avatar = p?.avatar_url || `https://ui-avatars.com/api/?name=${p?.username}`;

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
    
    // Warnain mention di komentar
    const highlightMentions = (text: string) => {
      const parts = text.split(/(@\w+)/g);
      return parts.map((part, i) => 
        part.startsWith('@') ? <span key={i} className="mention-highlight">{part}</span> : part
      );
    };

    const content = (
      <>
        <div className="comment-left">
          <img className="comment-avatar" src={avatar} onClick={() => window.location.href = `/profile?id=${p?.id}`} alt="Avatar" />
        </div>
        <div className="comment-right" style={{ flex: 1, paddingRight: '45px', position: 'relative' }}>
          <div className="comment-topline">
            <span className="comment-username" onClick={() => window.location.href = `/profile?id=${p?.id}`}>
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
                 {giftImg && <img src={giftImg} alt={giftName} />}
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
                  setInputValue(`@${p?.username} `);
                  inputRef.current?.focus();
              }}>
                {t('reply', 'Balas')}
              </span>
            )}
          </div>

          <div className="comment-like-box" onClick={() => handleLikeComment(String(comment.id))}>
            <svg viewBox="0 0 24 24" className={`heart-icon ${isCommentLiked ? 'active' : ''}`}>
              <path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z" />
            </svg>
            {(comment.likes_count > 0 || isCommentLiked) && (
              <span className="comment-like-count">{comment.likes_count || (isCommentLiked ? 1 : 0)}</span>
            )}
          </div>
        </div>
      </>
    );

    return isReply ? content : <div className="comment-item" key={comment.id}>{content}</div>;
  };

  const parents = comments.filter(c => !c.parent_id);

  const getPlaceholder = () => {
    if (isSubmitting) return t('sending');
    if (replyToUsername) return t('replying_to', { username: replyToUsername });
    return t('write_comment');
  };

  return (
    <div id="commentModal" className={isActive ? "active" : ""}>
      <div className="comment-box">
        <div className="comment-header">
          {t('comments_title')}
          <button className="comment-close" onClick={closeModal}>&times;</button>
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
                        <div className="comment-item reply">
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
                            <div className="comment-item reply" key={c.id}>
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

        <div className="comment-input-wrap" style={{ position: 'relative' }}>
          
          {/* 🔥 POPUP MENTIONS SUGGESTION 🔥 */}
          {showMentions && (
            <div className="mention-popup">
              {mentionResults.length > 0 ? (
                mentionResults.map(user => (
                  <div key={user.id} className="mention-item" onClick={() => handleSelectMention(user.username)}>
                    <img src={user.avatar_url || '/asets/png/profile.webp'} alt={user.username} />
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
            <button className="modal-gift-btn" onClick={handleGiftClick}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 7h-2.18A3 3 0 0 0 12 3a3 3 0 0 0-5.82 4H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-8-2a1 1 0 0 1 1 1v1h-2V6a1 1 0 0 1 1-1Zm-4 1a1 1 0 0 1 2 0v1H8a1 1 0 0 1 0-2Zm9 13h-4v-7h4Zm-6 0H7v-7h4Zm8-9H5V9h14Z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
