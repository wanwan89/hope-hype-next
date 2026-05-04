'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
// 1. IMPORT DARI UI-UTILS DI SINI
import { showNotif, requireLogin } from '@/lib/ui-utils'; 
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

  useEffect(() => {
    const handleBodyClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(".comment-toggle") as HTMLElement;
      
      if (btn) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // 2. PANGGIL REQUIRE LOGIN DI SINI
          requireLogin(); 
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

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() && !isSubmitting) {
      e.preventDefault();
      setIsSubmitting(true);
      const content = inputValue.trim();
      const parentId = replyToId;
      const targetUser = replyToUsername;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await supabase.from("comments").insert({
          post_id: parseInt(currentPostId!),
          user_id: session.user.id,
          content: content,
          parent_id: parentId ? parseInt(parentId) : null,
          reply_to_username: targetUser || null
        });

        if (currentCreatorId !== session.user.id) {
          const { data: prof } = await supabase.from("profiles").select("username").eq("id", session.user.id).single();
          await supabase.from("notifications").insert({
            user_id: currentCreatorId,
            actor_id: session.user.id,
            post_id: parseInt(currentPostId!),
            type: "comment",
            message: `<b>${prof?.username}</b> mengomentari karyamu.`
          });
        }

        const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", currentPostId!);
        const countBadge = document.querySelector(`.comment-toggle[data-post="${currentPostId}"] .comment-count`);
        if (countBadge) countBadge.textContent = String(count || 0);

        setReplyToId(null);
        setReplyToUsername(null);
        setInputValue("");
        await loadComments(currentPostId!);

      } catch (err) {
        // 3. PANGGIL SHOW NOTIF DI SINI
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

    const content = (
      <>
        <div className="comment-left">
          <img className="comment-avatar" src={avatar} onClick={() => window.location.href = `/data?id=${p?.id}`} alt="Avatar" />
        </div>
        <div className="comment-right">
          <div className="comment-topline">
            <span className="comment-username" onClick={() => window.location.href = `/data?id=${p?.id}`}>
              {p?.username} 
              {isPostOwner && <span style={{ background: '#1DA1F2', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', marginLeft: '4px', fontWeight: 800 }}>CREATOR</span>}
            </span>
          </div>
          <div className="comment-text">
            {comment.reply_to_username && <span className="reply-tag">@{comment.reply_to_username}</span>}
            {' '} {comment.content}
          </div>
          <div className="comment-actions">
            <span 
              className="reply-btn" 
              onClick={() => {
                setReplyToId(isReply ? comment.parent_id : comment.id);
                setReplyToUsername(p?.username);
              }}
            >
              Balas
            </span>
          </div>
        </div>
      </>
    );

    return isReply ? content : <div className="comment-item">{content}</div>;
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
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Memuat komentar...
            </div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Belum ada komentar. Jadilah yang pertama!
            </div>
          ) : (
            parents.map(p => {
              const childs = comments.filter(r => String(r.parent_id) === String(p.id));
              const isExpanded = expandedReplies[p.id];

              return (
                <div className="comment-thread" key={p.id}>
                  {renderComment(p, false)}

                  {childs.length > 0 && (
                    <>
                      <div 
                        className="view-replies-btn"
                        onClick={() => setExpandedReplies(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                      >
                        {isExpanded ? 'Sembunyikan balasan' : `Lihat ${childs.length} balasan`}
                      </div>

                      {isExpanded && (
                        <div className="reply-group">
                          {childs.map(c => (
                            <div className="comment-item reply" key={c.id}>
                              {renderComment(c, true)}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="comment-input-wrap">
          <input 
            type="text" 
            className="comment-input" 
            placeholder={isSubmitting ? "Mengirim..." : replyToUsername ? `Membalas @${replyToUsername}...` : "Tulis komentar..."} 
            autoComplete="off"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
