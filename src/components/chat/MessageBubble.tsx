'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
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
  if (status === 'read') return <span className="status-icon read" style={{color: '#34b7f1'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  
  return <span className="status-icon sent" style={{color: '#e2e8f0'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>; 
};

const renderReactionIcon = (emoji: string, size = 18) => {
  switch (emoji) {
    case '👍': return <svg width={size} height={size} viewBox="0 0 24 24" fill="#FBBF24" stroke="#D97706" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>;
    case '❤️': return <svg width={size} height={size} viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
    case '😂': return <svg width={size} height={size} viewBox="0 0 24 24" fill="#FCD34D" stroke="#D97706" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 9.05v-.1"></path><path d="M16 9.05v-.1"></path><path d="M10 14c.5 1.5 1.79 2 2 2s1.5-.5 2-2"></path><path d="M4 8l2 2"></path><path d="M20 8l-2 2"></path></svg>;
    case '😮': return <svg width={size} height={size} viewBox="0 0 24 24" fill="#FCD34D" stroke="#D97706" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 9.05v-.1"></path><path d="M16 9.05v-.1"></path><circle cx="12" cy="15" r="2"></circle></svg>;
    case '😢': return <svg width={size} height={size} viewBox="0 0 24 24" fill="#FCD34D" stroke="#D97706" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 9.05v-.1"></path><path d="M16 9.05v-.1"></path><path d="M16 16c-1.5-1.5-3.5-1.5-5.5 0"></path><path d="M9 12v3"></path></svg>;
    case '🙏': return <svg width={size} height={size} viewBox="0 0 24 24" fill="#FCD34D" stroke="#D97706" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-7l-2-2"></path><path d="M12 22v-7l2-2"></path><path d="M10 13V8a2 2 0 0 1 4 0v5"></path><path d="M10 8a2 2 0 0 0-4 0v3.5"></path><path d="M14 8a2 2 0 0 1 4 0v3.5"></path></svg>;
    default: return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{emoji}</span>;
  }
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
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', wordBreak: 'break-all', fontWeight: 600, color: 'inherit' }} onClick={(e) => e.stopPropagation()}>{part}</a>
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

export default function MessageBubble({ 
  msg, isMe, onReply, onDelete, onEdit, onSelect, onSelectAll, currentUser, 
  isFirstUnread, unreadCount, showDateSeparator, router, isSelectionMode, isSelected 
}: any) {
  const { t } = useTranslation(); 
  const bubbleRef = useRef<HTMLDivElement>(null);
  
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);
  const holdTimer = useRef<any>(null);
  const lastTap = useRef(0);

  const isDeleted = msg.is_deleted || msg.message === "Pesan ini telah dihapus" || msg.message === "Pesan telah dihapus";
  const isEdited = msg.is_edited || msg.is_edit || (msg.updated_at && new Date(msg.updated_at).getTime() - new Date(msg.created_at).getTime() > 1000);

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

  const parsedImages = useMemo(() => {
    if (!msg.image_url) return [];
    if (Array.isArray(msg.image_url)) return msg.image_url;
    if (typeof msg.image_url === 'string') {
      try {
        const parsed = JSON.parse(msg.image_url);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        if (msg.image_url.includes(',')) return msg.image_url.split(',').map((u: string) => u.trim());
      }
    }
    return [msg.image_url];
  }, [msg.image_url]);

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
    };
  }, []);

  const handleStart = (clientX: number) => {
    if (isSelectionMode) return;
    touchStartX.current = clientX;
    touchCurrentX.current = clientX;
    isSwiping.current = true;
    if (bubbleRef.current) bubbleRef.current.style.transition = 'none';

    if (!msg.is_system) {
      holdTimer.current = setTimeout(() => {
        setShowOptions(true);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    }
  };

  const handleMove = (clientX: number) => {
    if (!isSwiping.current || isSelectionMode) return;
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
    if (isSelectionMode) return;
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
      if (!isDeleted) {
        onReply(msg);
        if (navigator.vibrate) navigator.vibrate(30);
      }
    }
    isSwiping.current = false;
  };

  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => { 
    clearTimeout(holdTimer.current); 
    isSwiping.current = false; 
    if (bubbleRef.current) { 
      bubbleRef.current.style.transition = 'transform 0.3s'; 
      bubbleRef.current.style.transform = 'translateX(0)'; 
    } 
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDeleted && !msg.is_system && !isSelectionMode) setShowReactions(true);
  };

  const handleBubbleSelectionClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      if (onSelect) onSelect(msg.id);
    }
  };

  const handleReactionSelect = async (emoji: string, e: any) => {
    e.preventDefault(); e.stopPropagation(); 
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
    e.stopPropagation(); setShowOptions(false);
    if (onDelete) onDelete(msg, type);
  };

  const handleEditAction = (e: React.MouseEvent) => {
    e.stopPropagation(); setShowOptions(false);
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
        if (!hasData) setWaveData(Array.from({length: 12}, () => Math.max(20, Math.random() * 90)));
        else setWaveData(newLevels);
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

  const handleDownloadImage = async (url: string) => {
    try {
      showNotif("Mengunduh foto...", "info");
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none'; a.href = blobUrl;
      a.download = `HopeTalk_${Date.now()}.jpg`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      showNotif("Foto berhasil disimpan!", "success");
    } catch (err) {
      showNotif("Gagal mengunduh foto", "error");
    }
  };

  let cleanMsg = msg.caption || msg.post_caption || msg.message || "";
  
  if (isStoryReply) {
    cleanMsg = cleanMsg.replace("Membalas ceritamu", "").trim();
    if (cleanMsg.startsWith(':') || cleanMsg.startsWith('-')) cleanMsg = cleanMsg.substring(1).trim();
  }

  if (cleanMsg.includes("📸 Mengirim Foto")) {
    cleanMsg = cleanMsg.replace("📸 Mengirim Foto", "").trim();
  }
  if (cleanMsg.includes(" Mengirim Foto")) {
    cleanMsg = cleanMsg.replace(" Mengirim Foto", "").trim();
  }

  const isMediaOnly = ["Stiker", "Voice Note", " Voice Note", "Pesan ini telah dihapus"].includes(cleanMsg.trim());
  const shouldShowText = cleanMsg.length > 0 && !isMediaOnly && !isDeleted;

  const vnBgColor = isMe ? '#ffffff' : 'var(--primary-blue, #1f3cff)';
  const vnIconColor = isMe ? 'var(--primary-blue, #1f3cff)' : '#ffffff';
  const vnWaveColor = isPlaying ? (isMe ? '#ffffff' : 'var(--primary-blue, #1f3cff)') : (isMe ? 'rgba(255,255,255,0.5)' : 'rgba(150,150,150,0.5)');

  // Menyembunyikan elemen secara total jika pesan dihapus dan pesan itu dari lawan bicara
  if (isDeleted && !isMe) {
    return null; 
  }

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

      <div 
        className="hype-chat-scope" 
        style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}
        onClickCapture={handleBubbleSelectionClick}
        onTouchStartCapture={isSelectionMode ? handleBubbleSelectionClick : undefined}
      >
        
        <AnimatePresence>
          {isSelectionMode && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }} 
              animate={{ width: 44, opacity: 1 }} 
              exit={{ width: 0, opacity: 0 }}
              style={{ overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div style={{ 
                width: '22px', height: '22px', borderRadius: '50%', 
                border: `2px solid ${isSelected ? 'var(--primary-blue, #1f3cff)' : 'var(--text-muted, #94a3b8)'}`,
                background: isSelected ? 'var(--primary-blue, #1f3cff)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0, boxSizing: 'border-box'
              }}>
                {isSelected && <span className="material-icons" style={{ fontSize: '14px', color: '#fff' }}>check</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ flex: 1, minWidth: 0, opacity: (isSelectionMode && !isSelected) ? 0.7 : 1, transition: 'opacity 0.2s' }}>
          
          <AnimatePresence>
            {previewImage && !isSelectionMode && (
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
            {showOptions && !isSelectionMode && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }}
                  onClick={() => setShowOptions(false)}
                />
                <motion.div 
                  initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200, opacity: 0 }}
                  className="message-options-modal" style={{ zIndex: 100000 }}
                >
                  <div className="options-handle" />
                  
                  <button className="option-btn" onClick={(e) => { e.stopPropagation(); setShowOptions(false); if(onSelect) onSelect(msg.id); }}>
                    <span className="material-icons">check_circle_outline</span> Tandai
                  </button>
                  <button className="option-btn" onClick={(e) => { e.stopPropagation(); setShowOptions(false); if(onSelectAll) onSelectAll(); }}>
                    <span className="material-icons">done_all</span> Tandai Semua
                  </button>

                  {isMe && !isDeleted && shouldShowText && !msg.image_url && !msg.sticker_url && !msg.audio_url && !msg.shared_post && !msg.post_id && (
                    <button className="option-btn" onClick={(e) => handleEditAction(e)}>
                      <span className="material-icons">edit</span> Edit Pesan
                    </button>
                  )}

                  <button className="option-btn" onClick={(e) => handleDeleteAction(e, 'for_me')}>
                    <span className="material-icons">delete_outline</span> {isDeleted ? 'Hapus Permanen' : 'Hapus untuk Saya'}
                  </button>

                  {isMe && !isDeleted && (
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
            className={`chat-message ${isMe ? 'self me' : 'other'} ${msg.is_system ? 'system' : ''}`}
            style={showUserDetail && !msg.is_system ? { display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '8px' } : {}}
          >
            {msg.is_system ? (
              <div className="system-text" style={{ 
                  background: 'rgba(0, 0, 0, 0.3)', color: 'var(--text-main, #ffffff)', padding: '6px 14px', 
                  borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'inline-flex', 
                  alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '8px auto', textAlign: 'center'
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
                  style={{ 
                    display: 'flex', flexDirection: 'column', width: 'fit-content', minWidth: 0, 
                    padding: (msg.image_url || (msg.sticker_url && !isStoryReply) || msg.shared_post || msg.post_id) && !isDeleted ? '4px' : '8px 14px', 
                    cursor: isSelectionMode ? 'default' : 'pointer' 
                  }}
                >
                  
                  {showReactions && !msg.is_system && !isDeleted && !isSelectionMode && (
                    <div className="reaction-menu" style={{ [isMe ? 'right' : 'left']: '0', zIndex: 100, display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      {['👍','❤️','😂','😮','😢','🙏'].map(emoji => (
                        <div 
                          key={emoji} 
                          className="reaction-btn" 
                          onClick={(e) => handleReactionSelect(emoji, e)}
                          style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', cursor: 'pointer' }}
                        >
                          {renderReactionIcon(emoji, 26)}
                        </div>
                      ))}
                    </div>
                  )}

                  {showUserDetail && (
                    <div className="chat-username" style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', marginLeft: '2px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: (msg.image_url || msg.sticker_url || msg.shared_post || msg.post_id) && !isDeleted ? '4px' : '0' }}>
                      {msg.profiles?.username || 'User'} 
                      <span className="chat-badge" dangerouslySetInnerHTML={{__html: getUserBadge(msg.profiles?.role || 'user')}} style={{ display: 'inline-flex', alignItems: 'center' }}/>
                    </div>
                  )}
                  
                  {liveReply && !isDeleted && (
                    <div className="reply-preview-in-chat" onClick={(e) => { e.stopPropagation(); document.getElementById(`msg-${liveReply.id}`)?.scrollIntoView({behavior: 'smooth'})}} 
                      style={{ 
                        marginLeft: (msg.image_url || msg.sticker_url || msg.shared_post || msg.post_id) && !isStoryReply ? '4px' : '0', 
                        marginRight: (msg.image_url || msg.sticker_url || msg.shared_post || msg.post_id) && !isStoryReply ? '4px' : '0',
                        textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', display: 'block'
                      }}>
                      <b>{liveReply.username}</b>: {liveReply.message || t('media_label')}
                    </div>
                  )}

                  {!isDeleted ? (
                    <>
                      {msg.post_id && (
                        <div className="ig-card" onClick={(e) => { e.stopPropagation(); if(!isSelectionMode) router.push('/post/' + msg.post_id); }} style={{ cursor: 'pointer' }}>
                          <div className="ig-card-img-wrapper">
                            <img src={msg.post_cover || msg.image_url} alt="media" className="ig-card-img" loading="lazy" />
                          </div>
                          {(msg.post_title || msg.post_caption || msg.message) && (
                            <div className="ig-card-content">
                              {msg.post_title && <div className="ig-card-title">{msg.post_title}</div>}
                              {(msg.post_caption || msg.message) && (
                                 <div className="ig-caption">
                                   {msg.post_caption || (msg.message !== "📸 Mengirim Foto" && msg.message)}
                                 </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {!msg.post_id && parsedImages.length === 1 && (
                        <div style={{ position: 'relative', maxWidth: '280px', borderRadius: '12px', overflow: 'hidden', marginBottom: shouldShowText ? '6px' : '0' }}>
                          <img 
                            src={getOptimizedImage(parsedImages[0])} 
                            alt="Foto" 
                            onClick={(e) => { e.stopPropagation(); if(!isSelectionMode) setPreviewImage(parsedImages[0]); }} 
                            style={{ display: 'block', width: '100%', maxHeight: '350px', objectFit: 'cover', cursor: 'pointer' }} 
                          />
                          {msg.status === 'sending' && (
                             <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                               <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%' }} />
                             </div>
                          )}
                        </div>
                      )}

                      {!msg.post_id && parsedImages.length > 1 && (
                        <div style={{ position: 'relative', width: '230px', height: '260px', marginBottom: shouldShowText ? '8px' : '4px' }}>
                          {parsedImages.slice(0, 3).reverse().map((url: string, indexReverse: number) => {
                            const displayLimit = Math.min(parsedImages.length, 3);
                            const i = displayLimit - 1 - indexReverse; 
                            const isTop = i === 0;
                            const offset = i * 8; 
                            
                            return (
                              <div key={i} style={{ 
                                position: 'absolute', top: offset, left: offset, zIndex: 10 - i,
                                width: `calc(100% - 16px)`, height: `calc(100% - 16px)`,
                                borderRadius: '14px', overflow: 'hidden',
                                border: isMe ? '2px solid rgba(255,255,255,0.3)' : '2px solid var(--bg-main)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                              }}>
                                <img 
                                  src={getOptimizedImage(url)} 
                                  alt={`Foto ${i+1}`} 
                                  onClick={(e) => { e.stopPropagation(); if(!isSelectionMode) setPreviewImage(url); }} 
                                  style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                                />
                                
                                {msg.status === 'sending' && isTop && (
                                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%' }} />
                                  </div>
                                )}

                                {isTop && parsedImages.length > 3 && (
                                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontSize: '24px', fontWeight: 'bold', pointerEvents: 'none' }}>
                                    +{parsedImages.length - 3}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {msg.shared_post && (
                        <div className="shared-post-card" onClick={(e) => { e.stopPropagation(); if(!isSelectionMode) router.push(`/post/${msg.shared_post.id}`); }} style={{ background: isMe ? 'rgba(255,255,255,0.1)' : 'var(--bg-secondary)', borderRadius: '12px', padding: '10px', width: '250px', marginBottom: shouldShowText ? '8px' : '0', border: isMe ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-color)', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <img src={msg.shared_post.author_avatar || '/asets/png/profile.webp'} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ccc' }} alt="author" />
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'inherit' }}>{msg.shared_post.author_username || 'User'}</span>
                          </div>
                          {msg.shared_post.image_url && (
                            <div style={{ width: '100%', height: '160px', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px', background: '#000' }}>
                              <img src={getOptimizedImage(msg.shared_post.image_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="post cover" />
                            </div>
                          )}
                          <div style={{ fontSize: '12px', color: 'inherit', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', opacity: 0.9 }}>
                            {msg.shared_post.caption || 'Membagikan postingan...'}
                          </div>
                          <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '8px', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-icons" style={{ fontSize: '12px' }}>open_in_new</span> Lihat Postingan
                          </div>
                        </div>
                      )}

                      {isStoryReply && msg.sticker_url ? (
                        <div className="story-reply-card" onClick={(e) => { e.stopPropagation(); if(!isSelectionMode) setPreviewImage(msg.sticker_url); }} style={{ cursor: 'pointer', background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--bg-secondary)', padding: '6px', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: shouldShowText ? '8px' : '0', border: isMe ? 'none' : '1px solid var(--border-color)', width: '100%' }}>
                          <div style={{ position: 'relative', width: '40px', height: '55px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                             <img src={msg.sticker_url} alt="story" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ fontSize: '12px', color: 'inherit', opacity: 0.8, fontWeight: 600, fontStyle: 'italic', flex: 1 }}>Membalas Cerita...</div>
                        </div>
                      ) : (
                        msg.sticker_url && !isStoryReply && (
                          <div style={{ position: 'relative' }}>
                            <img src={msg.sticker_url} className="chat-sticker" alt="sticker" style={{ borderRadius: '12px', maxWidth: '200px', display: 'block', marginBottom: shouldShowText ? '6px' : '0' }} />
                          </div>
                        )
                      )}

                      {shouldShowText && (
                        <div className="text" style={{ opacity: msg.status === 'sending' ? 0.7 : 1, whiteSpace: 'pre-wrap', padding: (msg.image_url || (msg.sticker_url && !isStoryReply) || msg.shared_post || msg.post_id) ? '0 6px' : '0', wordBreak: 'break-word', marginTop: (msg.image_url || (msg.sticker_url && !isStoryReply) || msg.shared_post || msg.post_id) ? '4px' : '0' }}>
                          {renderTextWithLinks(cleanMsg)}
                        </div>
                      )}

                      {msg.audio_url && (
                        <div className={`vn-custom-player ${isPlaying ? 'playing' : ''}`} style={{ marginTop: (msg.image_url || msg.sticker_url || msg.shared_post || msg.post_id || shouldShowText) ? '6px' : '0', display: 'flex', alignItems: 'center', padding: (msg.image_url || (msg.sticker_url && !isStoryReply) || msg.shared_post || msg.post_id) ? '0 6px' : '0', opacity: msg.status === 'sending' ? 0.6 : 1 }}>
                          <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(!isSelectionMode) toggleVN(); }} 
                            disabled={msg.status === 'sending' || isSelectionMode} 
                            style={{ 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              width: '42px', height: '42px', borderRadius: '50%', background: vnBgColor,
                              border: 'none', color: vnIconColor, flexShrink: 0, cursor: 'pointer', outline: 'none',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.15)', transition: 'background 0.2s'
                            }}
                          >
                            {msg.status === 'sending' ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: '20px', height: '20px', border: `3px solid ${vnIconColor}`, borderTopColor: 'transparent', borderRadius: '50%' }} />
                            ) : isPlaying ? (
                              <span className="material-icons" style={{ fontSize: '24px' }}>pause</span>
                            ) : (
                              <span className="material-icons" style={{ fontSize: '24px', marginLeft: '2px' }}>play_arrow</span>
                            )}
                          </button>
                          
                          <div className="vn-waveform" style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '26px', flex: 1, marginLeft: '12px' }}>
                            {waveData.map((heightPercent, i) => (
                              <motion.div key={i} animate={{ height: `${heightPercent}%` }} transition={{ duration: 0.1 }} style={{ width: '3px', background: vnWaveColor, borderRadius: '2px' }} />
                            ))}
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'inherit', opacity: 0.8, marginLeft: '12px', marginRight: '4px' }}>
                            VN
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontStyle: 'italic', color: isMe ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', fontSize: '13.5px' }}>
                      <span className="material-icons" style={{ fontSize: '16px' }}>block</span>
                      {t('msg_deleted') || "Pesan ini telah dihapus"}
                    </div>
                  )}

                  {msg.reactions && Object.keys(msg.reactions).length > 0 && !isDeleted && (
                    <div className="message-reactions" style={{ bottom: (msg.image_url || (msg.sticker_url && !isStoryReply) || msg.shared_post || msg.post_id) ? '-12px' : '-16px', display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px' }}>
                      {[...new Set(Object.values(msg.reactions as Record<string, string>))].slice(0,3).map((emojiStr, idx) => (
                        <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                           {renderReactionIcon(emojiStr, 14)}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="message-info" style={{ 
                    paddingRight: (msg.image_url || (msg.sticker_url && !isStoryReply) || msg.shared_post || msg.post_id) && !isDeleted ? '6px' : '0', 
                    paddingBottom: (msg.image_url || (msg.sticker_url && !isStoryReply) || msg.shared_post || msg.post_id) && !isDeleted ? '4px' : '0', 
                    display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' 
                  }}>
                    {isEdited && !isDeleted && (
                      <span style={{ fontSize: '10.5px', fontStyle: 'italic', opacity: 0.75, marginRight: '2px' }}>(diedit)</span>
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
      </div>
    </>
  );
}
