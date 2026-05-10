'use client';

import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import { getUserBadge } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next'; 
import { useRouter } from 'next/navigation'; 
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
  const router = useRouter(); 
  const bubbleRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);
  const holdTimer = useRef<any>(null);
  const lastTap = useRef(0);

  const isDeleted = msg.message === "Pesan ini telah dihapus";
  
  // Deteksi Ruang Obrolan Eksplisit
  const isGlobalChat = msg.room_id === 'room-1';
  const isGroupChat = msg.room_id?.startsWith('group_');
  
  const showUserDetail = (isGlobalChat || isGroupChat) && !isMe;

  // State handle data reply hasil realtime
  const [liveReply, setLiveReply] = useState<any>(msg.reply_to_msg || null);

  useEffect(() => {
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
          console.error("Fetch reply error:", err);
        }
      };
      fetchReplyData();
    } else if (msg.reply_to_msg) {
      setLiveReply(msg.reply_to_msg);
    }
  }, [msg.reply_to, msg.reply_to_msg, liveReply]);

  useEffect(() => {
    setTimeout(() => {
        const chatContainer = document.querySelector('.chat-messages');
        if(chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, 150);
  }, []);

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
    if (now - lastTap.current < 400 && Math.abs(diff) < 15 && !isDeleted) {
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isDeleted) {
      onReaction(msg, { clientX: e.clientX, clientY: e.clientY });
    }
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
  const wavePattern = [35, 60, 100, 75, 45, 80, 100, 60, 40, 85, 50, 30];

  const handleStickerClick = async (url: string) => {
    if (msg.message && msg.message.includes("Membalas ceritamu")) {
      try {
        const { data } = await supabase.from('stories').select('id').eq('image_url', url).maybeSingle();
        if (data && data.id) {
          router.push(`/story/${data.id}`);
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="hype-chat-scope">
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
              background: 'var(--bg-card, rgba(0, 0, 0, 0.4))', 
              color: 'var(--text-main, #ffffff)', 
              padding: '6px 16px', 
              borderRadius: '20px', 
              fontSize: '12px', 
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              margin: '8px auto',
              textAlign: 'center'
            }}
          >
            {/* Tambahin Icon Telepon Kecil biar makin jelas */}
            {(displayMessage.includes("Memanggil") || displayMessage.includes("Panggilan") || displayMessage.includes("terjawab") || displayMessage.includes("dibatalkan")) && (
               <span className="material-icons" style={{ fontSize: '14px', color: displayMessage.includes("ditolak") || displayMessage.includes("tak") ? '#ff4757' : '#2ecc71' }}>
                 {displayMessage.includes("ditolak") || displayMessage.includes("tak") ? 'call_missed' : 'phone_in_talk'}
               </span>
            )}
            {/* 🔥 FIX 1: Potong emoji bawaan database biar gak dobel 🔥 */}
            {displayMessage.replace(/📞/g, '').replace(/🎤/g, '').trim()}
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
            
            <div className="content" style={{ display: 'flex', flexDirection: 'column', width: 'fit-content', minWidth: 0 }}>
              
              {showUserDetail && (
                <div style={{
                  fontSize: '11px', fontWeight: 'bold', color: 'var(--primary-blue)', 
                  marginBottom: '2px', marginLeft: '2px', display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  {msg.profiles?.username || 'User'} 
                  <span dangerouslySetInnerHTML={{__html: getUserBadge(msg.profiles?.role || 'user')}} style={{ display: 'inline-flex', alignItems: 'center' }}/>
                </div>
              )}
              
              {liveReply && (
                <div 
                  className="reply-preview-in-chat" 
                  onClick={() => document.getElementById(`msg-${liveReply.id}`)?.scrollIntoView({behavior: 'smooth'})}
                >
                  <b>{liveReply.username}</b>: {liveReply.message || t('media_label')}
                </div>
              )}

              {msg.sticker_url && (
                <div 
                  style={{ 
                    cursor: msg.message?.includes("Membalas ceritamu") ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                  onClick={() => handleStickerClick(msg.sticker_url)}
                >
                  <img src={msg.sticker_url} className="chat-sticker" alt="sticker" style={{ borderRadius: '8px', maxWidth: '200px', display: 'block', marginBottom: msg.message && !msg.message.includes("Stiker") ? '6px' : '0' }} />
                  
                  {msg.message?.includes("Membalas ceritamu") && (
                    <div style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-icons" style={{ fontSize: '14px', color: 'white' }}>open_in_new</span>
                    </div>
                  )}
                </div>
              )}

              {/* 🔥 FIX 2: RENDER TEKS (Kecuali VN dan Stiker) 🔥 */}
              {(!msg.sticker_url && !msg.audio_url) || (msg.message && !msg.message.includes("Stiker") && !msg.message.includes("Voice Note")) ? (
                <div 
                  className={`text ${isDeleted ? "deleted" : ""}`} 
                  style={{ 
                    fontStyle: isDeleted ? 'italic' : 'normal',
                    opacity: isDeleted ? 0.7 : 1,
                    whiteSpace: 'pre-wrap' 
                  }}
                >
                  {displayMessage}
                </div>
              ) : null}

              {/* 🔥 FIX 3: RENDER VN DENGAN TULISAN "VN" DI KANAN 🔥 */}
              {msg.audio_url && (
                <div className={`vn-custom-player ${isPlaying ? 'playing' : ''}`} style={{ marginTop: msg.sticker_url || (msg.message && !msg.message.includes("Voice Note")) ? '6px' : '0', display: 'flex', alignItems: 'center' }}>
                  <button onClick={toggleVN} className="vn-play-btn">
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="white" style={{marginLeft: '2px'}}><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                  <div className="vn-waveform" style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '20px', flex: 1 }}>
                    {wavePattern.map((heightPercent, i) => (
                      <span 
                        key={i} 
                        className="bar" 
                        style={{
                          height: `${heightPercent}%`,
                          animationDelay: `${i * 0.1}s`,
                          transition: 'height 0.2s ease'
                        }}
                      ></span>
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted, #8e8e93)', marginLeft: '12px', marginRight: '4px' }}>VN</span>
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
    </div>
  );
}
