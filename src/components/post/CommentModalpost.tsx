'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showNotif, requireLogin, getUserBadge } from '@/lib/ui-utils'; 
import './CommentModal.css';

export default function CommentModalpost() {
  const [isActive, setIsActive] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [currentCreatorId, setCurrentCreatorId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

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
        if (postId) loadComments(postId);
      }
    };
    document.body.addEventListener("click", handleBodyClick);
    return () => document.body.removeEventListener("click", handleBodyClick);
  }, []);

  const loadComments = async (postId: string) => {
    setIsLoading(true);
    const { data } = await supabase.from("comments").select("id, content, created_at, user_id, parent_id, reply_to_username, profiles(id, username, avatar_url, role)").eq("post_id", postId).order("created_at", { ascending: true });
    setComments(data || []);
    setIsLoading(false);
  };

  const closeModal = () => { setIsActive(false); document.body.style.overflow = ""; };

  // 🔥 LOGIC GIFT BARU 🔥
  const handleGiftClick = () => {
    if (!currentCreatorId) return;
    // Trigger event custom buat komponen Gift lu (kalo ada) atau arahkan ke logic kirim gift
    window.dispatchEvent(new CustomEvent('openGift', { detail: { creatorId: currentCreatorId, postId: currentPostId } }));
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() && !isSubmitting) {
      if (!currentPostId) return;
      setIsSubmitting(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await supabase.from("comments").insert({ post_id: parseInt(currentPostId), user_id: session.user.id, content: inputValue.trim() });
        setInputValue("");
        await loadComments(currentPostId);
      } catch (err) { showNotif("Gagal kirim", "error"); } finally { setIsSubmitting(false); }
    }
  };

  return (
    <div id="commentModal" className={isActive ? "active" : ""}>
      <div className="comment-box">
        <div className="comment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Komentar</span>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {/* 🔥 TOMBOL GIFT PINDAH KE HEADER MODAL 🔥 */}
            <button className="modal-gift-btn" onClick={handleGiftClick} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', display: 'flex' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 7h-2.18A3 3 0 0 0 12 3a3 3 0 0 0-5.82 4H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-8-2a1 1 0 0 1 1 1v1h-2V6a1 1 0 0 1 1-1Zm-4 1a1 1 0 0 1 2 0v1H8a1 1 0 0 1 0-2Zm9 13h-4v-7h4Zm-6 0H7v-7h4Zm8-9H5V9h14Z"/></svg>
            </button>
            <button className="comment-close" onClick={closeModal} style={{ position: 'static' }}>&times;</button>
          </div>
        </div>
        
        <div className="comment-list">
          {isLoading ? <div className="loading-text">Memuat...</div> : comments.length === 0 ? <div className="empty-text">Belum ada komentar.</div> : (
            comments.filter(c => !c.parent_id).map(p => (
              <div className="comment-item" key={p.id}>
                <div className="comment-right">
                  <div className="comment-topline"><span className="comment-username">{p.profiles?.username}</span></div>
                  <div className="comment-text">{p.content}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="comment-input-wrap">
          <input type="text" className="comment-input" placeholder="Tulis komentar..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} disabled={isSubmitting} />
        </div>
      </div>
    </div>
  );
}
