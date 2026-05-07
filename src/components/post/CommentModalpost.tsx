'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showNotif, requireLogin, getUserBadge } from '@/lib/ui-utils'; 
import './CommentModal.css';

export default function CommentModalpost() {
  const [isActive, setIsActive] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [currentCreatorId, setCurrentCreatorId] = useState<string | null>(null);
  
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // 🔥 Gunakan useRef biar ID post saat ini ga nyangkut (stale closure)
  const currentPostIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentPostIdRef.current = currentPostId;
  }, [currentPostId]);

  useEffect(() => {
    const handleBodyClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(".comment-toggle") as HTMLElement;
      
      if (btn) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!requireLogin(session?.user)) {
          return;
        }

        const postId = btn.dataset.post || null;
        const creatorId = btn.dataset.creator || null;
        
        setCurrentPostId(postId);
        setCurrentCreatorId(creatorId);
        setIsActive(true);
        document.body.style.overflow = "hidden";
        
        if (postId) {
          loadComments(postId);
        }
      }
    };

    document.body.addEventListener("click", handleBodyClick);
    return () => document.body.removeEventListener("click", handleBodyClick);
  }, []);

  // 🔥 LISTENER BARU: Menerima data Gift dari Komponen Luar 🔥
  useEffect(() => {
    const handleInsertGift = async (e: any) => {
      const { postId, giftName, giftImg, creatorId } = e.detail;
      if (!postId) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Format spesial biar dibaca sebagai gambar gift
        const content = `GIFT||${giftName}||${giftImg}`;

        await supabase.from("comments").insert({
          post_id: parseInt(postId),
          user_id: session.user.id,
          content: content,
          parent_id: null,
          reply_to_username: null
        });

        // Kirim Notifikasi kalau yang ngirim bukan yang punya post
        if (creatorId !== session.user.id && creatorId) {
          const { data: prof } = await supabase.from("profiles").select("username").eq("id", session.user.id).single();
          await supabase.from("notifications").insert({
            user_id: creatorId,
            actor_id: session.user.id,
            post_id: parseInt(postId),
            type: "gift",
            message: `<b>${prof?.username}</b> memberimu ${giftName}.`
          });
        }

        // 🔥 FIX UTAMA: Refresh komentar secara instan tanpa masuk state updater! 🔥
        if (currentPostIdRef.current === String(postId)) {
          loadComments(String(postId));
        }

        // Update badge jumlah komentar otomatis
        const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", postId);
        const countBadge = document.querySelector(`.comment-toggle[data-post="${postId}"] .comment-count`);
        if (countBadge) countBadge.textContent = String(count || 0);

      } catch (err) {
        console.error("Gagal simpan gift ke komentar:", err);
      }
    };

    window.addEventListener("insertGiftComment", handleInsertGift);
    return () => window.removeEventListener("insertGiftComment", handleInsertGift);
  }, []);

  const loadComments = async (postId: string) => {
    setIsLoading(true);
    const { data } = await supabase.from("comments")
      .select("id, content, created_at, user_id, parent_id, reply_to_username, profiles(id, username, avatar_url, role)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    setComments(data || []);
    setIsLoading(false);
  };

  const closeModal = () => {
    setIsActive(false);
    document.body.style.overflow = "";
    setReplyToId(null);
    setReplyToUsername(null);
    setInputValue("");
  };

  const handleGiftClick = () => {
    if (!currentCreatorId) return;
    window.dispatchEvent(new CustomEvent('openGift', { detail: { creatorId: currentCreatorId, postId: currentPostId } }));
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() && !isSubmitting) {
      e.preventDefault();
      
      if (!currentPostId) return;

      setIsSubmitting(true);
      const content = inputValue.trim();
      const parentId = replyToId;
      const targetUser = replyToUsername;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const pid = parseInt(currentPostId);

        await supabase.from("comments").insert({
          post_id: pid,
          user_id: session.user.id,
          content: content,
          parent_id: parentId ? parseInt(parentId) : null,
          reply_to_username: targetUser || null
        });

        if (currentCreatorId !== session.user.id && currentCreatorId) {
          const { data: prof } = await supabase.from("profiles").select("username").eq("id", session.user.id).single();
          await supabase.from("notifications").insert({
            user_id: currentCreatorId,
            actor_id: session.user.id,
            post_id: pid,
            type: "comment",
            message: `<b>${prof?.username}</b> mengomentari karyamu.`
          });
        }

        const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", currentPostId);
        const countBadge = document.querySelector(`.comment-toggle[data-post="${currentPostId}"] .comment-count`);
        if (countBadge) countBadge.textContent = String(count || 0);

        setReplyToId(null);
        setReplyToUsername(null);
        setInputValue("");
        await loadComments(currentPostId);

      } catch (err) {
        showNotif("Gagal mengirim komentar", "error"); 
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const renderComment = (comment: any, isReply: boolean) => {
    const isPostOwner = comment.user_id === currentCreatorId;
    const p = comment.profiles;
    const avatar = p?.avatar_url || `https://ui-avatars.com/api/?name=${p?.username}`;
    const badgeHtml = getUserBadge(p?.role || 'user');

    let isGift = false;
    let giftName = "";
    let giftImg = "";
    
    if (comment.content?.startsWith("GIFT||")) {
      isGift = true;
      const parts = comment.content.split("||");
      giftName = parts[1] || "Gift";
      giftImg = parts[2] || "";
    }

    const content = (
      <>
        <div className="comment-left">
          <img 
            className="comment-avatar" 
            src={avatar} 
            onClick={() => window.location.href = `/profile?id=${p?.id}`} 
            alt="Avatar" 
          />
        </div>
        <div className="comment-right">
          <div className="comment-topline">
            <span className="comment-username" onClick={() => window.location.href = `/profile?id=${p?.id}`}>
              {p?.username} 
              <span dangerouslySetInnerHTML={{ __html: badgeHtml }} style={{ display: 'inline-flex', alignItems: 'center' }} />
              {isPostOwner && <span className="creator-tag">CREATOR</span>}
            </span>
          </div>
          
          <div className="comment-text">
            {comment.reply_to_username && <span className="reply-tag">@{comment.reply_to_username}</span>}
            {' '} 
            {isGift ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', marginTop: '4px' }}>
                 <span style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 600 }}>Memberi {giftName}</span>
                 {giftImg && <img src={giftImg} alt={giftName} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />}
              </div>
            ) : (
              comment.content
            )}
          </div>

          <div className="comment-actions">
            {!isGift && (
              <span 
                className="reply-btn" 
                onClick={() => {
                  setReplyToId(isReply ? String(comment.parent_id) : String(comment.id));
                  setReplyToUsername(p?.username);
                }}
              >
                Balas
              </span>
            )}
          </div>
        </div>
      </>
    );

    return isReply ? content : <div className="comment-item" key={comment.id}>{content}</div>;
  };

  const parents = comments.filter(c => !c.parent_id);

  return (
    <div id="commentModal" className={isActive ? "active" : ""}>
      <div className="comment-box">
        <div className="comment-header">
          Komentar
          <button className="comment-close" onClick={closeModal}>&times;</button>
        </div>
        
        <div className="comment-list" id="commentListContainer">
          {isLoading ? (
            <div className="loading-text">Memuat komentar...</div>
          ) : comments.length === 0 ? (
            <div className="empty-text">Belum ada komentar. Jadilah yang pertama!</div>
          ) : (
            parents.map(p => {
              const allChilds = comments.filter(r => String(r.parent_id) === String(p.id));
              const firstCreatorReply = allChilds.find(c => c.user_id === currentCreatorId);
              const remainingChilds = firstCreatorReply 
                ? allChilds.filter(c => c.id !== firstCreatorReply.id)
                : allChilds;

              const isExpanded = expandedReplies[p.id];

              return (
                <div className="comment-thread" key={p.id}>
                  {renderComment(p, false)}

                  {firstCreatorReply && (
                    <div className="replies-container" style={{ marginTop: '0' }}>
                      <div className="reply-group" style={{ paddingTop: '8px' }}>
                        <div className="thread-line" style={{ height: 'calc(100% - 10px)', top: '10px' }}></div>
                        <div className="comment-item reply" style={{ marginTop: 0 }}>
                          <span className="reply-curve" style={{ top: '15px' }}></span>
                          {renderComment(firstCreatorReply, true)}
                        </div>
                      </div>
                    </div>
                  )}

                  {remainingChilds.length > 0 && (
                    <div className="replies-container" style={{ marginTop: firstCreatorReply ? '0' : '8px' }}>
                      <div 
                        className="view-replies-btn"
                        onClick={() => setExpandedReplies(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                        style={{ marginLeft: '45px', marginBottom: isExpanded ? '8px' : '0' }}
                      >
                        <span className="btn-line" style={{ left: '-20px', width: '15px' }}></span>
                        {isExpanded ? 'Sembunyikan' : `Lihat ${remainingChilds.length} balasan lainnya`}
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

        <div className="comment-input-wrap">
          <div style={{ position: 'relative', width: '100%' }}>
            <input 
              type="text" 
              className="comment-input" 
              placeholder={isSubmitting ? "Mengirim..." : replyToUsername ? `Membalas @${replyToUsername}...` : "Tulis komentar..."} 
              autoComplete="off"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              style={{ width: '100%', boxSizing: 'border-box', paddingRight: '44px' }} 
            />
            <button 
              className="modal-gift-btn" 
              onClick={handleGiftClick} 
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', display: 'flex', padding: 0 }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 7h-2.18A3 3 0 0 0 12 3a3 3 0 0 0-5.82 4H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-8-2a1 1 0 0 1 1 1v1h-2V6a1 1 0 0 1 1-1Zm-4 1a1 1 0 0 1 2 0v1H8a1 1 0 0 1 0-2Zm9 13h-4v-7h4Zm-6 0H7v-7h4Zm8-9H5V9h14Z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
