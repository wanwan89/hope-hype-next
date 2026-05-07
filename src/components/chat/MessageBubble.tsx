import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import { getUserBadge } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next'; 
import './MessageBubble.css';

// --- HELPER: ICON STATUS WHATSAPP ---
export const getStatusIcon = (status: string) => {
  if (status === 'sending') return <span className="status-icon sending" style={{fontSize: '10px', opacity: 0.6}}>🕒</span>;
  if (status === 'sent') return <span className="status-icon sent" style={{color: '#8e8e93'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === 'delivered') return <span className="status-icon delivered" style={{color: '#8e8e93'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === 'read') return <span className="status-icon read" style={{color: '#4fc3f7'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  return <span className="status-icon sent" style={{color: '#8e8e93'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>; 
};

export default function MessageBubble({ msg, isMe, onReply, onReaction, onDelete }: any) {
  const { t } = useTranslation(); 
  const bubbleRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);
  const holdTimer = useRef<any>(null);
  const lastTap = useRef(0);

  const isDeleted = msg.message === "Pesan ini telah dihapus";
  const isPrivateChat = msg.room_id?.startsWith('pv_');

  // 🔥 State untuk menghandle data reply secara dinamis
  const [liveReply, setLiveReply] = useState<any>(msg.reply_to_msg || null);

  useEffect(() => {
    // 🔥 FIX LOGIC: Hanya fetch jika ada ID reply tapi data objek reply-nya kosong
    if (msg.reply_to && !msg.reply_to_msg && !liveReply) {
      const fetchReplyData = async () => {
        try {
          const { data, error } = await supabase
            .from('messages')
            .select('id, message, profiles(username)')
            .eq('id', msg.reply_to)
            .single();
          
          if (data && !error) {
            setLiveReply({
              id: data.id,
              username: (data.profiles as any)?.username || 'User',
              message: data.message
            });
          }
        } catch (err) {
          console.error("Gagal fetch reply:", err);
        }
      };
      fetchReplyData();
    } 
    // Jika props berubah (misal pas scrolling/render ulang), sync ulang
    else if (msg.reply_to_msg) {
      setLiveReply(msg.reply_to_msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg.reply_to, msg.reply_to_msg]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = touchStartX.current;
    isSwiping.current = true;
    if (bubbleRef.current) bubbleRef.current.style.transition = 'none';

    if (isMe && !isDeleted) {
      holdTimer.current = setTimeout(() => onDelete(msg.id), 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    touchCurrentX.current = e.touches[0].clientX;
    let diff = touchCurrentX.current - touchStartX.current;
    
    if (Math.abs(diff) > 10) clearTimeout(holdTimer.current);

    if (isMe && diff < 0) {
      diff = Math.max(diff, -70);
      if (bubbleRef.current) bubbleRef.current.style.transform = `translateX(${diff}px)`;
    } else if (!isMe && diff > 0) {
      diff = Math.min(diff, 70);
      if (bubbleRef.current) bubbleRef.current.style.transform = `translateX(${diff}px)`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    clearTimeout(holdTimer.current);
    let diff = touchCurrentX.current - touchStartX.current;

    const now = Date.now();
    if (now - lastTap.current < 300 && Math.abs(diff) < 10 && !isDeleted) {
      onReaction(msg, e.changedTouches ? e.changedTouches[0] : (e as any));
    }
    lastTap.current = now;

    if (bubbleRef.current) {
      bubbleRef.current.style.transition = 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
      bubbleRef.current.style.transform = 'translateX(0)';
    }

    if ((isMe && diff < -50) || (!isMe && diff > 50)) {
      onReply(msg);
      if (navigator.vibrate) navigator.vibrate(30);
    }
    isSwiping.current = false;
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleVN = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(msg.audio_url);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const displayMessage = isDeleted ? t('msg_deleted') : msg.message;

  return (
    <div 
      ref={bubbleRef}
      id={`msg-${msg.id}`}
      className={`chat-message ${isMe ? 'self' : 'other'} ${msg.is_system ? 'system' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {msg.is_system ? (
        <div className="system-text">{displayMessage}</div>
      ) : (
        <>
          {/* Avatar muncul jika bukan Private Chat (Grup/Global) */}
          {!isPrivateChat && (
            <img className="avatar" src={msg.profiles?.avatar_url || "/asets/png/profile.webp"} alt="avatar" />
          )}
          
          <div className="content">
            
            {/* Username & Badge muncul jika bukan Private Chat */}
            {!isPrivateChat && (
              <div className="username">
                {msg.profiles?.username} 
                <span dangerouslySetInnerHTML={{__html: getUserBadge(msg.profiles?.role || 'user')}}/>
              </div>
            )}
            
            {/* 🔥 LIVE REPLY BOX 🔥 */}
            {liveReply && (
              <div 
                className="reply-preview-in-chat" 
                onClick={() => document.getElementById(`msg-${liveReply.id}`)?.scrollIntoView({behavior: 'smooth'})}
              >
                <b>{liveReply.username}</b>: {liveReply.message || t('media_label')}
              </div>
            )}

            {msg.sticker_url ? (
              <img src={msg.sticker_url} className="chat-sticker" alt="sticker" style={{ borderRadius: '8px', maxWidth: '150px' }} />
            ) : msg.audio_url ? (
              <div className={`vn-custom-player ${isPlaying ? 'playing' : ''}`}>
                <button onClick={toggleVN} className="vn-play-btn">
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="white" style={{marginLeft: '2px'}}><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
                <div className="vn-waveform">
                  {[...Array(12)].map((_, i) => <span key={i} className="bar"></span>)}
                </div>
                <span className="vn-time">VN</span>
              </div>
            ) : (
              <div className={`text ${isDeleted ? "deleted" : ""}`}>
                {displayMessage}
              </div>
            )}

            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
              <div className="message-reactions">
                {[...new Set(Object.values(msg.reactions as Record<string, string>))].slice(0,3).join('')}
              </div>
            )}
            
            <div className="message-info">
              <span className="timestamp">
                {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
              </span>
              {isMe && getStatusIcon(msg.status || 'sent')}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
