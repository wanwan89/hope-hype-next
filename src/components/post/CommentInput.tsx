'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { getOptimizedImage, containsBadWords } from '@/lib/constants';
import { useTranslation } from 'react-i18next';

export default function CommentInput({ 
  currentPostId, isCommentsDisabled, replyTo, setReplyTo, 
  currentCreatorId, onCommentAdded, handleGiftClick 
}: any) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showStickers, setShowStickers] = useState(false);
  const [stickers, setStickers] = useState<any[]>([]);
  const [stickerQuery, setStickerQuery] = useState("");

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<any[]>([]);

  // Fokus jika reply berubah
  useEffect(() => {
    if (replyTo.username) {
      setInputValue(`@${replyTo.username} `);
      inputRef.current?.focus();
    }
  }, [replyTo]);

  const fetchStickers = async (q = "") => {
    try {
      // ✅ Menggunakan API Route internal kita, BUKAN API KEY langsung
      const res = await fetch(`/api/stickers?q=${q}`);
      const d = await res.json(); 
      setStickers(d.data || []);
    } catch (error) {
      console.error("Gagal memuat stiker", error);
    }
  };

  useEffect(() => {
    if (!showStickers) return;
    const delay = setTimeout(() => fetchStickers(stickerQuery), 500);
    return () => clearTimeout(delay);
  }, [stickerQuery, showStickers]);

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

  const submitComment = async (content: string, type: 'text' | 'sticker' = 'text', stickerUrl?: string) => {
    if (!currentPostId || isSubmitting) return;
    
    let finalContent = content.trim();
    if (containsBadWords(finalContent)) {
      showNotif("Komentar ditolak! Mengandung bahasa tidak pantas.", "error");
      return;
    }

    if (replyTo.username && finalContent.startsWith(`@${replyTo.username}`)) {
      finalContent = finalContent.replace(`@${replyTo.username}`, '').trim();
    }

    if (type === 'sticker') {
      finalContent = `STICKER||${stickerUrl}||${finalContent}`;
    } else if (!finalContent) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: newComment, error } = await supabase.from("comments").insert({
        post_id: parseInt(currentPostId),
        user_id: session.user.id,
        content: finalContent, 
        parent_id: replyTo.id ? parseInt(replyTo.id) : null,
        reply_to_username: replyTo.username || null
      }).select('*, profiles(id, username, avatar_url, role)').single();

      if (error) throw error;

      onCommentAdded(newComment);
      
      // Reset State
      setReplyTo({ id: null, username: null, userId: null });
      setInputValue("");
      setShowStickers(false);
    } catch (err) {
      showNotif(t('comment_error'), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCommentsDisabled) {
    return <div className="disabled-comment-box">Komentar dinonaktifkan oleh kreator.</div>;
  }

  return (
    <div className="comment-input-wrap">
      {/* ... Render Mention & Sticker Popup ... (Sama seperti kode asli) */}
      <div className="input-container" style={{ display: 'flex', position: 'relative' }}>
        <input 
          ref={inputRef}
          className="comment-input" 
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && submitComment(inputValue, 'text')}
          placeholder={replyTo.username ? `Membalas @${replyTo.username}...` : t('write_comment')}
        />
        <div style={{ position: 'absolute', right: '12px', display: 'flex', gap: '8px' }}>
           <button onClick={() => setShowStickers(!showStickers)}>😊</button>
           <button onClick={handleGiftClick}>🎁</button>
        </div>
      </div>
    </div>
  );
}
