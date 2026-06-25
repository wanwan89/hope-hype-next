'use client';

import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import { getUserBadge, showNotif } from '@/lib/ui-utils'; 
import { useTranslation } from 'react-i18next'; 
import { useRouter } from 'next/navigation'; 
import { motion, AnimatePresence } from 'framer-motion'; 
import './MessageBubble.css';

export const getStatusIcon = (status: string) => {
  if (status === 'sending') return <span className="status-icon sending" style={{color: '#e2e8f0'}}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>;
  if (status === 'sent') return <span className="status-icon sent" style={{color: '#e2e8f0'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === 'delivered') return <span className="status-icon delivered" style={{color: '#e2e8f0'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === 'read') return <span className="status-icon read" style={{color: '#1e3a8a', filter: 'drop-shadow(0px 1px 1.5px rgba(255,255,255,0.85))'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  return <span className="status-icon sent" style={{color: '#e2e8f0'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>; 
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
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', wordBreak: 'break-all', fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>{part}</a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

const formatChatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (date.toDateString() === now.toDateString()) {
    return `Hari ini, ${timeStr}`;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Kemarin, ${timeStr}`;
  }

  if (diffDays < 7) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return `${days[date.getDay()]}, ${timeStr}`;
  }

  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}, ${timeStr}`;
};

export default function MessageBubble({ msg, isMe, onReply, onDelete, onEdit, currentUser, isFirstUnread, unreadCount, showDateSeparator }: any) {
  const { t } = useTranslation(); 
  const router = useRouter(); 
  const bubbleRef = useRef<HTMLDivElement>(null);
  
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);
  const holdTimer = useRef<any>(null);
  const lastTap = useRef(0);

  // FIX: Tambahkan msg.is_deleted jika backend kamu menggunakan boolean flag
  const isDeleted = msg.message === "Pesan ini telah dihapus" || msg.message === "Pesan telah dihapus" || msg.is_deleted;
  const isGlobalChat = msg.room_id === 'room-1';
  const isGroupChat = msg.room_id?.startsWith('group_');
  const showUserDetail = (isGlobalChat || isGroupChat) && !isMe;
  const isStoryReply = msg.message && msg.message.includes("Membalas ceritamu");

  const [liveReply, setLiveReply] = useState<any>(msg.reply_to_msg || null);
  const [showReactions, setShowReactions] = useState(false);
  const [showOptions, setShowOptions] = useState(false); 
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const requestFrameRef = useRef<number>(0);
  
  const [waveData, setWaveData] = useState<number[]>(Array(12).fill(20));

  useEffect(() => {
    const handleGlobalClick = (e: any) => {
      if (e.target?.closest('.reaction-menu')) return;
      if (showReactions) setShowReactions(false);
    };

    if (showReactions) {
      setTimeout(() => {
        window.addEventListener('click', handleGlobalClick);
        window.addEventListener('touchstart', handleGlobalClick);
      }, 10);
    }
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [showReactions]);

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

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
      cancelAnimationFrame(requestFrameRef.current);
    }
  }, []);

  const handleStart = (clientX: number) => {
    touchStartX.current = clientX;
    touchCurrentX.current = clientX;
    isSwiping.current = true;
    if (bubbleRef.current) bubbleRef.current.style.transition = 'none';

    if (!isDeleted && !msg.is_system) {
      holdTimer.current = setTimeout(() => {
        setShowOptions(true);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    }
  };

  const handleMove = (clientX: number) => {
    if (!isSwiping.current) return;
    touchCurrentX.current = clientX;
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

  const handleEnd = () => {
    clearTimeout(holdTimer.current);
    let diff = touchCurrentX.current - touchStartX.current;
    const now = Date.now();
    
    if (now - lastTap.current < 300 && Math.abs(diff) < 15 && !isDeleted && !msg.is_system) {
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

  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => { clearTimeout(holdTimer.current); isSwiping.current = false; if (bubbleRef.current) { bubbleRef.current.style.transition = 'transform 0.3s'; bubbleRef.current.style.transform = 'translateX(0)'; } };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDeleted && !msg.is_system) setShowReactions(true);
  };

  const handleReactionSelect = async (emoji: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
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

  const handleDeleteAction = (e: React.MouseEvent, type: 'for_me' | 'for_everyone') => {
    e.stopPropagation();
    setShowOptions(false);
    if (onDelete) onDelete(msg.id, type);
  };

  const handleEditAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOptions(false);
    if (onEdit) onEdit(msg);
  };

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
    if (msg.status === 'sending') return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      cancelAnimationFrame(requestFrameRef.current);
      setWaveData(Array(12).fill(20)); 
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(msg.audio_url);
        audioRef.current.crossOrigin = "anonymous"; 
        audioRef.current.onended = () => { 
          setIsPlaying(false); 
          cancelAnimationFrame(requestFrameRef.current);
          setWaveData(Array(12).fill(20));
        };
        
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

  const handleDownloadImage = async (url: string) => {
    try {
      showNotif("Mengunduh foto...", "info");
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = `HopeTalk_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      showNotif("Foto berhasil disimpan!", "success");
    } catch (err) {
      console.error(err);
      showNotif("Gagal mengunduh foto", "error");
    }
  };

  // Pastikan teks placeholder untuk foto/VN tidak tertimpa jika pesan terhapus
  let cleanMsg = msg.message || "";
  if (isStoryReply) {
    cleanMsg = cleanMsg.replace("Membalas ceritamu", "").trim();
    if (cleanMsg.startsWith(':') || cleanMsg.startsWith('-')) cleanMsg = cleanMsg.substring(1).trim();
  }
  const isPlaceholder = ["📸 Mengirim Foto", "🎨 Stiker", "🎤 Voice Note"].includes(cleanMsg);
  const shouldShowText = cleanMsg && (!isPlaceholder || isDeleted);

  return (
    <>
      {showDateSeparator && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 8px' }}>
          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
            {formatChatDate(msg.created_at)}
          </div>
        </div>
      )}

      {isFirstUnread && unreadCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px 0 10px', width: '100%' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)', opacity: 0.5 }}></div>
          <div style={{ background: 'rgba(31, 60, 255, 0.1)', color: 'var(--primary-blue, #1f3cff)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', margin: '0 10px' }}>
            {unreadCount} Pesan Baru
          </div>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)', opacity: 0.5 }}></div>
        </div>
      )}

      <div className="hype-chat-scope" style={{ position: 'relative' }}>
        
        <AnimatePresence>
          {previewImage && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setPreviewImage(null)}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top))', display: 'flex', justifyContent: 'space-between', zIndex: 1000000, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
                <button onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '5px' }}>
                  <span className="material-icons" style={{fontSize: '32px'}}>arrow_back</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDownloadImage(previewImage); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '5px' }}>
                  <span className="material-icons" style={{fontSize: '32px'}}>download</span>
                </button>
              </div>
              
              <motion.img
                initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
                src={previewImage} style={{ maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain' }}
                onClick={(e) => e.stopPropagation()} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showOptions && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }}
                onClick={() => setShowOptions(false)}
              />
              <motion.div 
                initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200, opacity: 0 }}
                className="message-options-modal"
                style={{ zIndex: 100000 }}
              >
                <div className="options-handle" />
                {isMe && !isDeleted && shouldShowText && !msg.image_url && !msg.sticker_url && !msg.audio_url && (
                  <button className="option-btn" onClick={(e) => handleEditAction(e)}>
                    <span className="material-icons">edit</span> Edit Pesan
                  </button>
                )}
                <button className="option-btn" onClick={(e) => handleDeleteAction(e, 'for_me')}>
                  <span className="material-icons">delete_outline</span> Hapus untuk Saya
                </button>
                {isMe && (
                  <button className="option-btn danger" onClick={(e) => handleDeleteAction(e, 'for_everyone')}>
                    <span className="material-icons">delete_forever</span> Hapus untuk Semua Orang
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div 
          ref={bubbleRef} id={`msg-${msg.id}`}
          className={`chat-message ${isMe ? 'self' : 'other'} ${msg.is_system ? 'system' : ''}`}
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
              
              <div 
                className="content" 
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} 
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}
                onDoubleClick={handleDoubleClick}
                style={{ display: 'flex', flexDirection: 'column', width: 'fit-content', minWidth: 0, padding: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '4px' : '8px 14px', cursor: 'pointer' }}
              >
                
                {showReactions && !msg.is_system && (
                  <div className="reaction-menu" style={{ [isMe ? 'right' : 'left']: '0', zIndex: 100 }} onClick={(e) => e.stopPropagation()}>
                    {['👍','❤️','😂','😮','😢','🙏'].map(emoji => (
                      <div 
                        key={emoji} 
                        className="reaction-btn" 
                        onClick={(e) => handleReactionSelect(emoji, e)}
                        onTouchStart={(e) => handleReactionSelect(emoji, e)} 
                      >
                        {emoji}
                      </div>
                    ))}
                  </div>
                )}

                {showUserDetail && (
                  <div className="chat-username" style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', marginLeft: '2px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: (msg.image_url || msg.sticker_url) ? '4px' : '0' }}>
                    {msg.profiles?.username || 'User'} 
                    <span className="chat-badge" dangerouslySetInnerHTML={{__html: getUserBadge(msg.profiles?.role || 'user')}} style={{ display: 'inline-flex', alignItems: 'center' }}/>
                  </div>
                )}
                
                {liveReply && (
                  <div className="reply-preview-in-chat" onClick={(e) => { e.stopPropagation(); document.getElementById(`msg-${liveReply.id}`)?.scrollIntoView({behavior: 'smooth'})}} style={{ marginLeft: (msg.image_url || msg.sticker_url) && !isStoryReply ? '4px' : '0', marginRight: (msg.image_url || msg.sticker_url) && !isStoryReply ? '4px' : '0' }}>
                    <b>{liveReply.username}</b>: {liveReply.message || t('media_label')}
                  </div>
                )}

                {msg.image_url && !isDeleted && (
                  <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '14px', marginBottom: shouldShowText ? '6px' : '0' }}>
                    <img 
                      src={getOptimizedImage(msg.image_url)} 
                      alt="Foto Kiriman" 
                      onClick={(e) => { e.stopPropagation(); setPreviewImage(msg.image_url); }} 
                      style={{ display: 'block', maxWidth: '240px', maxHeight: '300px', width: '100%', height: 'auto', objectFit: 'cover', opacity: msg.status === 'sending' ? 0.6 : 1, cursor: 'pointer' }} 
                    />
                  </div>
                )}

                {isStoryReply && msg.sticker_url && !isDeleted ? (
                  <div className="story-reply-card" onClick={(e) => { e.stopPropagation(); handleStoryClick(msg.sticker_url); }} style={{ cursor: 'pointer', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: shouldShowText ? '8px' : '0', border: '1px solid var(--border-color)', width: '100%' }}>
                    <div style={{ position: 'relative', width: '40px', height: '55px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                       <img src={msg.sticker_url} alt="story" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, fontStyle: 'italic', flex: 1 }}>Membalas Cerita...</div>
                  </div>
                ) : (
                  msg.sticker_url && !isDeleted && !isStoryReply && (
                    <div style={{ position: 'relative' }}>
                      <img src={msg.sticker_url} className="chat-sticker" alt="sticker" style={{ borderRadius: '12px', maxWidth: '200px', display: 'block', marginBottom: shouldShowText ? '6px' : '0' }} />
                    </div>
                  )
                )}

                {shouldShowText && (
                  <div className={`text ${isDeleted ? "deleted" : ""}`} style={{ fontStyle: isDeleted ? 'italic' : 'normal', opacity: (isDeleted || msg.status === 'sending') ? 0.7 : 1, whiteSpace: 'pre-wrap', padding: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '0 6px' : '0', wordBreak: 'break-word' }}>
                    {/* FIX 1: Tampilan Pesan Dihapus yang Jelas */}
                    {isDeleted ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}>
                        <span className="material-icons" style={{ fontSize: '14px' }}>block</span>
                        {t('msg_deleted') || "Pesan ini telah dihapus"}
                      </span>
                    ) : renderTextWithLinks(cleanMsg)}
                  </div>
                )}

                {msg.audio_url && !isDeleted && (
                  <div className={`vn-custom-player ${isPlaying ? 'playing' : ''}`} style={{ marginTop: (msg.image_url || msg.sticker_url || shouldShowText) ? '6px' : '0', display: 'flex', alignItems: 'center', padding: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '0 6px' : '0', opacity: msg.status === 'sending' ? 0.6 : 1 }}>
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleVN(); }} 
                      className="vn-play-btn" 
                      disabled={msg.status === 'sending'} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        background: 'rgba(255, 255, 255, 0.25)', 
                        border: 'none', 
                        color: '#fff', 
                        flexShrink: 0, 
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {msg.status === 'sending' ? (
                        <motion.div
                          animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          style={{ width: '16px', height: '16px', border: '2px solid rgba(255, 255, 255, 0.3)', borderTopColor: '#ffffff', borderRadius: '50%' }}
                        />
                      ) : isPlaying ? (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{marginLeft: '3px'}}><path d="M8 5v14l11-7z"/></svg>
                      )}
                    </button>
                    
                    <div className="vn-waveform" style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '24px', flex: 1, marginLeft: '10px' }}>
                      {waveData.map((heightPercent, i) => (
                        <motion.div 
                          key={i} animate={{ height: `${heightPercent}%` }} transition={{ duration: 0.1 }}
                          style={{ width: '3px', background: isPlaying ? 'currentColor' : 'rgba(255,255,255,0.7)', borderRadius: '2px' }} 
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'inherit', opacity: 0.8, marginLeft: '12px', marginRight: '4px' }}>VN</span>
                  </div>
                )}

                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="message-reactions" style={{ bottom: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '-12px' : '-16px' }}>
                    {[...new Set(Object.values(msg.reactions as Record<string, string>))].slice(0,3).join('')}
                  </div>
                )}
                
                <div className="message-info" style={{ paddingRight: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '6px' : '0', paddingBottom: (msg.image_url || (msg.sticker_url && !isStoryReply)) ? '4px' : '0', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  
                  {/* FIX 2: Indikator "(diedit)" di samping timestamp */}
                  {msg.is_edited && !isDeleted && (
                    <span style={{ fontSize: '10px', fontStyle: 'italic', opacity: 0.7, marginRight: '2px' }}>
                      diedit
                    </span>
                  )}
                  
                  <span className="timestamp" style={{ fontSize: '10px', fontWeight: 500 }}>
                    {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </span>
                  
                  {isMe && getStatusIcon(msg.status || 'sent')}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
