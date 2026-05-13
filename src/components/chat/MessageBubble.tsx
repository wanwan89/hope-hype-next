'use client';

import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import { getUserBadge } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next'; 
import { useRouter } from 'next/navigation'; 
import { motion } from 'framer-motion';
import './MessageBubble.css';

// 🔥 FIX 6: ICON OPTIMISTIC UI UNTUK "SENDING" 🔥
export const getStatusIcon = (status: string) => {
  if (status === 'sending') return <span className="status-icon sending" style={{color: '#8e8e93'}}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>;
  if (status === 'sent') return <span className="status-icon sent" style={{color: '#8e8e93'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === 'delivered') return <span className="status-icon delivered" style={{color: '#8e8e93'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === 'read') return <span className="status-icon read" style={{color: '#4fc3f7'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  return <span className="status-icon sent" style={{color: '#8e8e93'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>; 
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
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#1DA1F2', textDecoration: 'underline', wordBreak: 'break-all' }} onClick={(e) => e.stopPropagation()}>{part}</a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export default function MessageBubble({ msg, isMe, onReply, onDelete, currentUser }: any) {
  const { t } = useTranslation(); 
  const router = useRouter(); 
  const bubbleRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);
  const holdTimer = useRef<any>(null);
  const lastTap = useRef(0);

  const isDeleted = msg.message === "Pesan ini telah dihapus";
  const isGlobalChat = msg.room_id === 'room-1';
  const isGroupChat = msg.room_id?.startsWith('group_');
  const showUserDetail = (isGlobalChat || isGroupChat) && !isMe;
  const isStoryReply = msg.message && msg.message.includes("Membalas ceritamu");

  const [liveReply, setLiveReply] = useState<any>(msg.reply_to_msg || null);
  const [showReactions, setShowReactions] = useState(false);

  // 🔥 FIX 5: STATE VISUALIZER PLAYBACK VN (UDAH DIBENERIN TYPENYA) 🔥
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const requestFrameRef = useRef<number>(0);
  
  // Default wave (12 bar)
  const [waveData, setWaveData] = useState<number[]>(Array(12).fill(20));

  useEffect(() => {
    if (msg.reply_to && !msg.reply_to_msg && !liveReply) {
      const fetchReplyData = async () => {
        try {
          const { data, error } = await supabase.from('messages').select('id, message, profiles(username)').eq('id', msg.reply_to).single();
          if (data && !error) setLiveReply({ id: data.id, username: (data.profiles as any)?.username || 'User', message: data.message });
        } catch (err) { console.error(err); }
      };
      fetchReplyData();
    } else if (msg.reply_to_msg) {
      setLiveReply(msg.reply_to_msg);
    }
  }, [msg.reply_to, msg.reply_to_msg, liveReply]);

  // Clean up audio
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
      cancelAnimationFrame(requestFrameRef.current);
    }
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

  // 🔥 FIX 5: LOGIKA VISUALIZER PLAYBACK VN 🔥
  const startPlaybackVisualizer = () => {
    const updateWave = () => {
      if (!audioRef.current || audioRef.current.paused) return;
      
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const step = Math.floor(dataArray.length / 12);
        const newLevels = [];
        let hasData = false;
        
        for(let i=0; i<12; i++) {
            let sum = 0;
            for(let j=0; j<step; j++) sum += dataArray[i*step + j];
            const val = sum/step;
            if (val > 0) hasData = true;
            newLevels.push(Math.max(15, (val / 255) * 100)); 
        }
        
        // CORS Fallback: Kalau array kosong (diblokir Cloudinary) tapi audio jalan, bikin gelombang dummy yang natural
        if (!hasData) {
            setWaveData(Array.from({length: 12}, () => Math.max(20, Math.random() * 90)));
        } else {
            setWaveData(newLevels);
        }
      } else {
         setWaveData(Array.from({length: 12}, () => Math.max(20, Math.random() * 90)));
      }
      requestFrameRef.current = requestAnimationFrame(updateWave);
    };
    updateWave();
  };

  const toggleVN = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      cancelAnimationFrame(requestFrameRef.current);
      setWaveData(Array(12).fill(20)); // Reset wave
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(msg.audio_url);
        audioRef.current.crossOrigin = "anonymous"; // Penting buat Web Audio API
        audioRef.current.onended = () => { 
          setIsPlaying(false); 
          cancelAnimationFrame(requestFrameRef.current);
          setWaveData(Array(12).fill(20));
        };
        
        // Setup AudioContext (Gagal kalau CORS ketat, tapi kita udah punya fallback)
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const src = ctx.createMediaElementSource(audioRef.current);
            const anl = ctx.createAnalyser();
            anl.fftSize = 64;
            src.connect(anl);
            anl.connect(ctx.destination);
            analyserRef.current = anl;
            audioCtxRef.current = ctx;
        } catch(e) { console.warn("AudioContext bypass CORS"); }
      }
      audioRef.current.play();
      setIsPlaying(true);
      startPlaybackVisualizer();
    }
  };

  const handleStoryClick = async (url: string) => {
    try {
      const { data } = await supabase.from('stories').select('id').eq('image_url', url).maybeSingle();
      if (data && data.id) router.push(`/story/${data.id}`);
    } catch (err) { console.error(err); }
  };

  let cleanMsg = msg.message || "";
  if (isStoryReply) {
    cleanMsg = cleanMsg.replace("Membalas ceritamu", "").trim();
    if (cleanMsg.startsWith(':') || cleanMsg.startsWith('-')) cleanMsg = cleanMsg.substring(1).trim();
  }
  const isPlaceholder = ["📸 Mengirim Foto", "🎨 Stiker", "🎤 Voice Note"].includes(cleanMsg);
  const shouldShowText = cleanMsg && (!isPlaceholder || isDeleted);

  return (
    <div className="hype-chat-scope" style={{ position: 'relative' }}>
      
      {/* OVERLAY REACTION */}
      {showReactions && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }} onClick={() => setShowReactions(false)} />
          <div style={{
            position: 'absolute', top: '-45px', [isMe ? 'right' : 'left']: '0',
            background: 'var(--bg-panel, #ffffff)', padding: '8px 14px', borderRadius: '24px',
            boxShadow: '0 5px 20px rgba(0,0,0,0.2)', display: 'flex', gap: '12px',
            border: '1px solid var(--border-color)', zIndex: 99999,
            animation: 'hype-pop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            {['👍','❤️','😂','😮','😢','🙏'].map(emoji => (
              <span 
                key={emoji} onClick={(e) => handleReactionSelect(emoji, e)}
                style={{ fontSize: '22px', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >{emoji}</span>
            ))}
          </div>
        </>
      )}

      <div 
        ref={bubbleRef} id={`msg-${msg.id}`}
        className={`chat-message ${isMe ? 'self' : 'other'} ${msg.is_system ? 'system' : ''}`}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onDoubleClick={handleDoubleClick}
        style={showUserDetail && !msg.is_system ? { display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '8px' } : {}}
      >
        {msg.is_system ? (
          <div className="system-text" style={{ 
              background: 'rgba(0, 0, 0, 0.3)', color: 'var(--text-main, #ffffff)', padding: '6px 14px', 
              borderRadius: '20px', fontSize: '11px', fontWeight: 600, boxShadow: 'none', border: 'none', 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '8px auto', textAlign: 'center'
            }}>
            {(msg.message.includes("Memanggil") || msg.message.includes("Panggilan") || msg.message.includes("terjawab") || msg.message.includes("dibatalkan")) && (
               <span className="material-icons" style={{ fontSize: '14px', color: msg.message.includes("ditolak") || msg.message.includes("tak") ? '#ff4757' : '#2ecc71' }}>
                 {msg.message.includes("ditolak") || msg.message.includes("tak") ? 'call_missed' : 'phone_in_talk'}
               </span>
            )}
            {msg.message.replace(/📞/g, '').replace(/🎤/g, '').trim()}
          </div>
        ) : (
          <>
            {showUserDetail && (
              <img src={msg.profiles?.avatar_url || "/asets/png/profile.webp"} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginBottom: '2px', border: '1px solid var(--border-color)' }} />
            )}
            
            <div className="content" style={{ display: 'flex', flexDirection: 'column', width: 'fit-content', minWidth: 0, padding: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '4px' : '10px 14px' }}>
              
              {showUserDetail && (
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary-blue)', marginBottom: '4px', marginLeft: '6px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: (msg.image_url || msg.sticker_url) ? '4px' : '0' }}>
                  {msg.profiles?.username || 'User'} 
                  <span dangerouslySetInnerHTML={{__html: getUserBadge(msg.profiles?.role || 'user')}} style={{ display: 'inline-flex', alignItems: 'center' }}/>
                </div>
              )}
              
              {liveReply && (
                <div className="reply-preview-in-chat" onClick={() => document.getElementById(`msg-${liveReply.id}`)?.scrollIntoView({behavior: 'smooth'})} style={{ marginLeft: (msg.image_url || msg.sticker_url) && !isStoryReply ? '4px' : '0', marginRight: (msg.image_url || msg.sticker_url) && !isStoryReply ? '4px' : '0' }}>
                  <b>{liveReply.username}</b>: {liveReply.message || t('media_label')}
                </div>
              )}

              {msg.image_url && !isDeleted && (
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', marginBottom: shouldShowText ? '6px' : '0' }}>
                  <img src={getOptimizedImage(msg.image_url)} alt="Foto Kiriman" style={{ display: 'block', maxWidth: '240px', maxHeight: '300px', width: '100%', height: 'auto', objectFit: 'cover', opacity: msg.status === 'sending' ? 0.6 : 1 }} />
                </div>
              )}

              {isStoryReply && msg.sticker_url && !isDeleted ? (
                <div className="story-reply-card" onClick={() => handleStoryClick(msg.sticker_url)} style={{ cursor: 'pointer', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: shouldShowText ? '8px' : '0', border: '1px solid var(--border-color)', width: '100%' }}>
                  <div style={{ position: 'relative', width: '40px', height: '55px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                     <img src={msg.sticker_url} alt="story" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, fontStyle: 'italic', flex: 1 }}>Membalas Cerita...</div>
                </div>
              ) : (
                msg.sticker_url && !isDeleted && !isStoryReply && (
                  <div style={{ position: 'relative' }}>
                    <img src={msg.sticker_url} className="chat-sticker" alt="sticker" style={{ borderRadius: '8px', maxWidth: '200px', display: 'block', marginBottom: shouldShowText ? '6px' : '0' }} />
                  </div>
                )
              )}

              {shouldShowText && (
                <div className={`text ${isDeleted ? "deleted" : ""}`} style={{ fontStyle: isDeleted ? 'italic' : 'normal', opacity: (isDeleted || msg.status === 'sending') ? 0.7 : 1, whiteSpace: 'pre-wrap', padding: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '0 6px' : '0', wordBreak: 'break-word' }}>
                  {isDeleted ? t('msg_deleted') : renderTextWithLinks(cleanMsg)}
                </div>
              )}

              {/* 🔥 VN DENGAN GELOMBANG SINKRON 🔥 */}
              {msg.audio_url && !isDeleted && (
                <div className={`vn-custom-player ${isPlaying ? 'playing' : ''}`} style={{ marginTop: (msg.image_url || msg.sticker_url || shouldShowText) ? '6px' : '0', display: 'flex', alignItems: 'center', padding: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '0 6px' : '0', opacity: msg.status === 'sending' ? 0.6 : 1 }}>
                  <button onClick={toggleVN} className="vn-play-btn">
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="white" style={{marginLeft: '2px'}}><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                  <div className="vn-waveform" style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '24px', flex: 1, marginLeft: '8px' }}>
                    {waveData.map((heightPercent, i) => (
                      <motion.div 
                        key={i} 
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.1 }}
                        style={{ width: '3px', background: isPlaying ? '#1f3cff' : '#8e8e93', borderRadius: '2px' }} 
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted, #8e8e93)', marginLeft: '12px', marginRight: '4px' }}>VN</span>
                </div>
              )}

              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="message-reactions" style={{ bottom: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '-12px' : '-16px' }}>
                  {[...new Set(Object.values(msg.reactions as Record<string, string>))].slice(0,3).join('')}
                </div>
              )}
              
              <div className="message-info" style={{ paddingRight: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '6px' : '0', paddingBottom: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '4px' : '0' }}>
                <span className="timestamp">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                {isMe && getStatusIcon(msg.status || 'sent')}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
