'use client';

import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import { getUserBadge } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next'; 
import { useRouter } from 'next/navigation'; 
import './MessageBubble.css';

export const getStatusIcon = (status: string) => {
  if (status === 'sending') return <span className="status-icon sending" style={{fontSize: '10px', opacity: 0.6}}>🕒</span>;
  if (status === 'sent') return <span className="status-icon sent" style={{color: 'rgba(255,255,255,0.7)'}}><svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === 'read') return <span className="status-icon read" style={{color: '#4fc3f7'}}><svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M2 13l4 4L16 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 13l4 4L22 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  return null;
};

const getOptimizedImage = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('res.cloudinary.com') && !cleanUrl.includes('f_auto')) {
    return cleanUrl.replace('/image/upload/', '/image/upload/w_600,c_limit,f_auto,q_auto/');
  }
  return cleanUrl;
};

const renderTextWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => (
    part.match(urlRegex) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', wordBreak: 'break-all' }} onClick={(e) => e.stopPropagation()}>{part}</a>
    ) : <span key={i}>{part}</span>
  ));
};

export default function MessageBubble({ msg = {}, isMe, onReply, onDelete, currentUser, isTyping, typingUser, roomId }: any) {
  const { t } = useTranslation(); 
  const router = useRouter(); 
  const bubbleRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);
  const holdTimer = useRef<any>(null);
  const lastTap = useRef(0);

  const isDeleted = msg?.message === "Pesan ini telah dihapus";
  const showUserDetail = (msg?.room_id === 'room-1' || msg?.room_id?.startsWith('group_')) && !isMe;
  const isStoryReply = msg?.message?.includes("Membalas ceritamu");

  const [liveReply, setLiveReply] = useState<any>(msg?.reply_to_msg || null);
  const [showReactions, setShowReactions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (msg?.reply_to && !liveReply) {
      supabase.from('messages').select('id, message, profiles(username)').eq('id', msg.reply_to).single()
        .then(({ data }) => data && setLiveReply({ id: data.id, username: (data.profiles as any)?.username, message: data.message }));
    }
  }, [msg?.reply_to]);

  if (isTyping && typingUser) {
    return (
      <div className="chat-message other typing-container" style={{ display: 'flex', gap: '8px', marginBottom: '8px', paddingLeft: '12px' }}>
        {(roomId === 'room-1' || roomId?.startsWith('group_')) && <img src={typingUser.avatar_url || "/asets/png/profile.webp"} alt="av" className="typing-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />}
        <div className="content typing-bubble-box" style={{ background: 'var(--bg-panel)', padding: '10px 16px', borderRadius: '15px 15px 15px 5px', border: '1px solid var(--border-color)' }}>
          <div className="typing-dots"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
        </div>
      </div>
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = true;
    if (isMe && !isDeleted) holdTimer.current = setTimeout(() => onDelete(msg.id), 600);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    touchCurrentX.current = e.touches[0].clientX;
    let diff = touchCurrentX.current - touchStartX.current;
    if (Math.abs(diff) > 10) clearTimeout(holdTimer.current);
    
    // 🔥 LIMIT SWIPE RANGE 🔥
    if ((isMe && diff < 0) || (!isMe && diff > 0)) {
      const move = isMe ? Math.max(diff, -60) : Math.min(diff, 60);
      if (bubbleRef.current) bubbleRef.current.style.transform = `translateX(${move}px)`;
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(holdTimer.current);
    const diff = touchCurrentX.current - touchStartX.current;
    if (bubbleRef.current) {
      bubbleRef.current.style.transition = 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
      bubbleRef.current.style.transform = 'translateX(0)';
    }
    if ((isMe && diff < -50) || (!isMe && diff > 50)) {
       onReply(msg);
       if (navigator.vibrate) navigator.vibrate(25);
    }
    isSwiping.current = false;
  };

  const handleReactionSelect = async (emoji: string) => {
    if (!currentUser) return;
    const reactions = { ...(msg.reactions || {}) };
    reactions[currentUser.id] === emoji ? delete reactions[currentUser.id] : reactions[currentUser.id] = emoji;
    await supabase.from('messages').update({ reactions }).eq('id', msg.id);
    setShowReactions(false);
  };

  const toggleVN = () => {
    if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); } 
    else {
      if (!audioRef.current) { audioRef.current = new Audio(msg.audio_url); audioRef.current.onended = () => setIsPlaying(false); }
      audioRef.current.play(); setIsPlaying(true);
    }
  };

  const wavePattern = [40, 70, 100, 60, 80, 45, 90, 70, 50, 85, 40];

  return (
    <div className="hype-chat-scope" style={{ position: 'relative' }}>
      
      {/* REACTION MENU */}
      {showReactions && (
        <div className="reaction-popover" style={{ position: 'absolute', top: '-50px', [isMe ? 'right' : 'left']: '0', zIndex: 1000, background: 'var(--bg-panel)', padding: '8px 12px', borderRadius: '30px', display: 'flex', gap: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', animation: 'pop 0.2s ease-out' }}>
          {['👍','❤️','😂','😮','😢','🔥'].map(e => <span key={e} onClick={() => handleReactionSelect(e)} style={{ fontSize: '22px', cursor: 'pointer' }}>{e}</span>)}
        </div>
      )}

      <div 
        ref={bubbleRef}
        className={`chat-message ${isMe ? 'self' : 'other'} ${msg.is_system ? 'system' : ''}`}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        onDoubleClick={() => !msg.is_system && setShowReactions(true)}
      >
        {msg.is_system ? (
          <div className="system-text-clean">{msg.message.replace(/📞|🎤/g, '').trim()}</div>
        ) : (
          <>
            {showUserDetail && <img src={msg.profiles?.avatar_url || "/asets/png/profile.webp"} alt="av" className="msg-avatar" />}
            
            <div className="content" style={{ background: isMe ? 'var(--primary-blue)' : 'var(--bg-panel)', color: isMe ? 'white' : 'var(--text-color)' }}>
              
              {showUserDetail && <div className="username-label">{msg.profiles?.username} <span dangerouslySetInnerHTML={{__html: getUserBadge(msg.profiles?.role)}} /></div>}
              
              {liveReply && (
                <div className="reply-box" onClick={() => document.getElementById(`msg-${liveReply.id}`)?.scrollIntoView({behavior: 'smooth'})}>
                  <b>{liveReply.username}</b>: {liveReply.message || 'Media'}
                </div>
              )}

              {msg.image_url && !isDeleted && <img src={getOptimizedImage(msg.image_url)} alt="foto" className="msg-image" />}

              {msg.sticker_url && !isDeleted && <img src={msg.sticker_url} alt="sticker" className="msg-sticker" />}

              {!isDeleted && msg.message && ![" Mengirim Foto", " Stiker", "Voice Note"].includes(msg.message) && (
                <div className="text-body">{renderTextWithLinks(msg.message.replace("Membalas ceritamu", "").trim())}</div>
              )}

              {isDeleted && <div className="text-deleted">{t('msg_deleted')}</div>}

              {/* VN UI PREMiUM */}
              {msg.audio_url && !isDeleted && (
                <div className={`vn-player ${isPlaying ? 'playing' : ''}`}>
                  <button onClick={toggleVN} className="vn-btn">
                    {isPlaying ? <span className="material-icons">pause</span> : <span className="material-icons">play_arrow</span>}
                  </button>
                  <div className="vn-wave">
                    {wavePattern.map((h, i) => <span key={i} className="v-bar" style={{ height: `${h}%`, background: isMe ? 'rgba(255,255,255,0.5)' : 'var(--primary-blue)' }}></span>)}
                  </div>
                  <span className="vn-tag">VN</span>
                </div>
              )}

              {/* REACTION BADGE */}
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="reaction-badge">
                  {Object.values(msg.reactions).slice(0, 3).join('')}
                  {Object.keys(msg.reactions).length > 1 && <span>{Object.keys(msg.reactions).length}</span>}
                </div>
              )}
              
              <div className="msg-footer">
                <span className="time">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                {isMe && getStatusIcon(msg.status)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
