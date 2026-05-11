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
  if (status === 'delivered') return <span className="status-icon delivered" style={{color: 'rgba(255,255,255,0.7)'}}><svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M2 13l4 4L16 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 13l4 4L22 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === 'read') return <span className="status-icon read" style={{color: '#4fc3f7'}}><svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M2 13l4 4L16 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 13l4 4L22 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  return <span className="status-icon sent" style={{color: 'rgba(255,255,255,0.7)'}}><svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>; 
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

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: 'inherit', textDecoration: 'underline', wordBreak: 'break-all', opacity: 0.9 }}
          onClick={(e) => e.stopPropagation()} 
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
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
  const isGlobalChat = msg?.room_id === 'room-1';
  const isGroupChat = msg?.room_id?.startsWith('group_');
  const showUserDetail = (isGlobalChat || isGroupChat) && !isMe;
  const isStoryReply = msg?.message && msg?.message.includes("Membalas ceritamu");

  const [liveReply, setLiveReply] = useState<any>(msg?.reply_to_msg || null);
  const [showReactions, setShowReactions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (msg?.reply_to && !msg?.reply_to_msg && !liveReply) {
      const fetchReplyData = async () => {
        try {
          const { data, error } = await supabase.from('messages').select('id, message, profiles(username)').eq('id', msg.reply_to).single();
          if (data && !error) setLiveReply({ id: data.id, username: (data.profiles as any)?.username || 'User', message: data.message });
        } catch (err) { console.error(err); }
      };
      fetchReplyData();
    } else if (msg?.reply_to_msg) {
      setLiveReply(msg.reply_to_msg);
    }
  }, [msg?.reply_to, msg?.reply_to_msg, liveReply]);

  if (isTyping && typingUser) {
    const showUserDetailTyping = roomId === 'room-1' || roomId?.startsWith('group_');
    return (
      <div className="hype-chat-scope" style={{ position: 'relative' }}>
        <div className="chat-message other" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '8px', marginBottom: '8px', paddingLeft: '12px' }}>
          {showUserDetailTyping && (
            <img src={typingUser.avatar_url || "/asets/png/profile.webp"} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginBottom: '2px', border: '1px solid var(--border-color)' }} />
          )}
          <div className="content" style={{ display: 'flex', flexDirection: 'column', width: 'fit-content', background: 'var(--bg-panel)', padding: '8px 14px', borderRadius: '14px 14px 14px 4px', border: '1px solid var(--border-color)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary-blue)', marginBottom: '4px' }}>{typingUser.username}</div>
            <div className="typing-bubble" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '14px' }}>
              <span style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out' }}></span>
              <span style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out 0.2s' }}></span>
              <span style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out 0.4s' }}></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    
    if (now - lastTap.current < 400 && Math.abs(diff) < 15 && !isDeleted && !msg.is_system) {
      setShowReactions(true);
      if (navigator.vibrate) navigator.vibrate(20);
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isDeleted && !msg.is_system) {
      setShowReactions(true);
    }
  };

  const handleReactionSelect = async (emoji: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    
    const currentReactions = msg.reactions || {};
    if (currentReactions[currentUser.id] === emoji) {
      delete currentReactions[currentUser.id]; 
    } else {
      currentReactions[currentUser.id] = emoji; 
    }
    
    await supabase.from('messages').update({ reactions: currentReactions }).eq('id', msg.id);
    setShowReactions(false);
  };

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

  const handleStoryClick = async (url: string) => {
    try {
      const { data } = await supabase.from('stories').select('id').eq('image_url', url).maybeSingle();
      if (data && data.id) router.push(`/story/${data.id}`);
    } catch (err) { console.error(err); }
  };

  let cleanMsg = msg?.message || "";
  if (isStoryReply) {
    cleanMsg = cleanMsg.replace("Membalas ceritamu", "").trim();
    if (cleanMsg.startsWith(':') || cleanMsg.startsWith('-')) cleanMsg = cleanMsg.substring(1).trim();
  }
  const isPlaceholder = [" Mengirim Foto", " Stiker", "Voice Note", "🎤 Voice Note", "📸 Mengirim Foto", "🎨 Stiker"].includes(cleanMsg);
  const shouldShowText = cleanMsg && (!isPlaceholder || isDeleted);

  const wavePattern = [35, 60, 100, 75, 45, 80, 100, 60, 40, 85, 50, 30];

  return (
    <div className="hype-chat-scope" style={{ position: 'relative' }}>
      
      {showReactions && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }} onClick={() => setShowReactions(false)} />
          <div style={{
            position: 'absolute',
            top: '-45px',
            [isMe ? 'right' : 'left']: '0',
            background: 'var(--bg-panel, #ffffff)',
            padding: '8px 14px',
            borderRadius: '24px',
            boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
            display: 'flex',
            gap: '12px',
            border: '1px solid var(--border-color)',
            zIndex: 99999,
            animation: 'hype-pop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            {['👍','❤️','😂','😮','😢','🙏'].map(emoji => (
              <span 
                key={emoji} 
                onClick={(e) => handleReactionSelect(emoji, e)}
                style={{ fontSize: '22px', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {emoji}
              </span>
            ))}
          </div>
        </>
      )}

      <div 
        ref={bubbleRef}
        id={`msg-${msg.id}`}
        className={`chat-message ${isMe ? 'self' : 'other'} ${msg.is_system ? 'system' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        style={showUserDetail && !msg.is_system ? { display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '8px' } : {}}
      >
        {msg.is_system ? (
          <div 
            className="system-text" 
            style={{ 
              background: 'rgba(0, 0, 0, 0.05)', 
              color: 'var(--text-muted)', 
              padding: '6px 14px', 
              borderRadius: '20px', 
              fontSize: '11px', 
              fontWeight: 600,
              boxShadow: 'none', 
              border: '1px solid var(--border-color)', 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              margin: '8px auto',
              textAlign: 'center'
            }}
          >
            {(msg.message.includes("Memanggil") || msg.message.includes("Panggilan") || msg.message.includes("terjawab") || msg.message.includes("dibatalkan") || msg.message.includes("ditolak")) && (
               <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={msg.message.includes("ditolak") || msg.message.includes("tak") ? '#ff4757' : '#2ecc71'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 {msg.message.includes("ditolak") || msg.message.includes("tak") ? (
                   <path d="M16 4L22 10M16 10L22 4M2 13.9C3.6 11.2 6.5 9 10 9c3.5 0 6.4 2.2 8 4.9"/>
                 ) : (
                   <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                 )}
               </svg>
            )}
            {msg.message.replace(/📞/g, '').replace(/🎤/g, '').trim()}
          </div>
        ) : (
          <>
            {showUserDetail && (
              <img 
                src={msg.profiles?.avatar_url || "/asets/png/profile.webp"} 
                alt="avatar" 
                style={{
                  width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', 
                  flexShrink: 0, marginBottom: '2px', border: '1px solid var(--border-color)'
                }}
              />
            )}
            
            <div className="content" style={{ 
              position: 'relative', 
              display: 'flex', 
              flexDirection: 'column', 
              width: 'fit-content', 
              minWidth: 0, 
              padding: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '4px' : '8px 12px',
              background: isMe ? 'var(--primary-blue)' : 'var(--bg-panel)',
              color: isMe ? 'white' : 'var(--text-color)',
              borderRadius: '16px',
              border: isMe ? 'none' : '1px solid var(--border-color)',
            }}>
              
              {showUserDetail && (
                <div style={{
                  fontSize: '11px', fontWeight: 'bold', color: 'var(--primary-blue)', 
                  marginBottom: '4px', marginLeft: '2px', display: 'flex', alignItems: 'center', gap: '4px',
                  marginTop: (msg.image_url || msg.sticker_url) ? '4px' : '0'
                }}>
                  {msg.profiles?.username || 'User'} 
                  <span dangerouslySetInnerHTML={{__html: getUserBadge(msg.profiles?.role || 'user')}} style={{ display: 'inline-flex', alignItems: 'center' }}/>
                </div>
              )}
              
              {liveReply && (
                <div 
                  className="reply-preview-in-chat" 
                  onClick={() => document.getElementById(`msg-${liveReply.id}`)?.scrollIntoView({behavior: 'smooth'})}
                  style={{
                    marginLeft: (msg.image_url || msg.sticker_url) && !isStoryReply ? '4px' : '0',
                    marginRight: (msg.image_url || msg.sticker_url) && !isStoryReply ? '4px' : '0',
                    color: isMe ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'
                  }}
                >
                  <b style={{color: isMe ? 'white' : 'var(--primary-blue)'}}>{liveReply.username}</b>: {liveReply.message || t('media_label')}
                </div>
              )}

              {msg.image_url && !isDeleted && (
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', marginBottom: shouldShowText ? '6px' : '0' }}>
                  <img 
                    src={getOptimizedImage(msg.image_url)} 
                    alt="Foto Kiriman" 
                    style={{ display: 'block', maxWidth: '240px', maxHeight: '300px', width: '100%', height: 'auto', objectFit: 'cover' }} 
                  />
                </div>
              )}

              {isStoryReply && msg.sticker_url && !isDeleted ? (
                <div 
                  className="story-reply-card"
                  onClick={() => handleStoryClick(msg.sticker_url)}
                  style={{ 
                    cursor: 'pointer', background: 'var(--bg-secondary)', padding: '6px', 
                    borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center',
                    marginBottom: shouldShowText ? '8px' : '0', border: '1px solid var(--border-color)',
                    width: '100%'
                  }}
                >
                  <div style={{ position: 'relative', width: '40px', height: '55px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                     <img src={msg.sticker_url} alt="story" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, fontStyle: 'italic', flex: 1 }}>
                    Membalas Cerita...
                  </div>
                </div>
              ) : (
                msg.sticker_url && !isDeleted && !isStoryReply && (
                  <div style={{ position: 'relative' }}>
                    <img src={msg.sticker_url} className="chat-sticker" alt="sticker" style={{ borderRadius: '8px', maxWidth: '200px', display: 'block', marginBottom: shouldShowText ? '6px' : '0', background: 'transparent' }} />
                  </div>
                )
              )}

              {shouldShowText && (
                <div 
                  className={`text ${isDeleted ? "deleted" : ""}`} 
                  style={{ 
                    fontStyle: isDeleted ? 'italic' : 'normal',
                    opacity: isDeleted ? 0.7 : 1,
                    whiteSpace: 'pre-wrap',
                    padding: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '0 6px' : '0',
                    wordBreak: 'break-word',
                    color: isMe ? 'white' : 'inherit',
                    textShadow: 'none' // 🔥 FIX BAYANGAN TEKS DIHAPUS 🔥
                  }}
                >
                  {isDeleted ? t('msg_deleted') : renderTextWithLinks(cleanMsg)}
                </div>
              )}

              {/* 🔥 TAMPILAN VN ELEGAN 🔥 */}
              {msg.audio_url && !isDeleted && (
                <div className={`vn-custom-player ${isPlaying ? 'playing' : ''}`} style={{ marginTop: (msg.image_url || msg.sticker_url || shouldShowText) ? '6px' : '0', display: 'flex', alignItems: 'center', padding: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '0 6px' : '0' }}>
                  <button onClick={toggleVN} className="vn-play-btn" style={{ background: isMe ? 'rgba(255,255,255,0.2)' : 'var(--primary-blue)' }}>
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill={isMe ? "white" : "white"}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill={isMe ? "white" : "white"} style={{marginLeft: '2px'}}><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                  <div className="vn-waveform" style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '20px', flex: 1, opacity: isMe ? 0.9 : 1 }}>
                    {wavePattern.map((heightPercent, i) => (
                      <span key={i} className="bar" style={{ height: `${heightPercent}%`, animationDelay: `${i * 0.1}s`, transition: 'height 0.2s ease', background: isMe ? 'white' : 'var(--primary-blue)' }}></span>
                    ))}
                  </div>
                  {/* 🔥 TEKS VN AJA, HAPUS "VOICE NOTE" 🔥 */}
                  <span style={{ fontSize: '11px', fontWeight: 800, color: isMe ? 'rgba(255,255,255,0.8)' : 'var(--primary-blue)', marginLeft: '12px', marginRight: '4px' }}>VN</span>
                </div>
              )}

              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div 
                  className="message-reactions-badge" 
                  style={{ 
                    position: 'absolute',
                    bottom: '-12px',
                    [isMe ? 'right' : 'left']: '16px',
                    background: 'var(--bg-modal, #ffffff)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '2px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    zIndex: 10,
                    fontSize: '13px'
                  }}
                >
                  {[...new Set(Object.values(msg.reactions as Record<string, string>))].slice(0,3).join('')}
                  {Object.keys(msg.reactions).length > 1 && (
                    <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', marginLeft: '3px' }}>
                      {Object.keys(msg.reactions).length}
                    </span>
                  )}
                </div>
              )}
              
              <div className="message-info" style={{ 
                paddingRight: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '6px' : '0',
                paddingBottom: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '4px' : '0',
                marginTop: (msg.reactions && Object.keys(msg.reactions).length > 0) ? '6px' : '0'
              }}>
                <span className="timestamp" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                </span>
                {isMe && getStatusIcon(msg.status || 'sent')}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
