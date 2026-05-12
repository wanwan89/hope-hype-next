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

  const isDeleted = msg?.message === "Pesan ini telah dihapus";
  const showUserDetail = (msg?.room_id === 'room-1' || msg?.room_id?.startsWith('group_')) && !isMe;
  const isStoryReply = msg?.message?.includes("Membalas ceritamu");

  const [liveReply, setLiveReply] = useState<any>(msg?.reply_to_msg || null);
  const [showReactions, setShowReactions] = useState(false);

  // --- STATE & REF UNTUK VOICE NOTE SINKRONISASI ---
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [waveData, setWaveData] = useState<number[]>(new Array(15).fill(15));
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const reqFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (msg?.reply_to && !liveReply) {
      supabase.from('messages').select('id, message, profiles(username)').eq('id', msg.reply_to).single()
        .then(({ data }) => data && setLiveReply({ id: data.id, username: (data.profiles as any)?.username, message: data.message }));
    }
  }, [msg?.reply_to]);

  // Cleanup audio dan animasi saat komponen di-unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      cancelAnimationFrame(reqFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

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

  // --- 🔥 LOGIKA AUDIO WAVEFORM REAL-TIME 🔥 ---
  const toggleVN = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
      cancelAnimationFrame(reqFrameRef.current);
      setWaveData(new Array(15).fill(15)); // Reset garis wave
    } else {
      if (!audioRef.current) {
        const audio = new Audio(msg.audio_url);
        audio.crossOrigin = "anonymous"; // Bypass CORS Cloudinary agar bisa di-analisis
        
        audio.onended = () => {
          setIsPlaying(false);
          isPlayingRef.current = false;
          cancelAnimationFrame(reqFrameRef.current);
          setWaveData(new Array(15).fill(15));
        };
        audioRef.current = audio;

        // Inisialisasi Penganalisis Suara
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContext();
          audioCtxRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64; 
          const source = ctx.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(ctx.destination);
          analyserRef.current = analyser;
        } catch(e) {
          console.warn("Visualizer gagal: Server Audio menolak CORS atau browser tidak support", e);
        }
      }

      // Mulai mainkan suara
      audioRef.current.play().catch(e => console.error("Gagal play audio", e));
      setIsPlaying(true);
      isPlayingRef.current = true;
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();

      // Loop Animasi Gelombang
      const updateWave = () => {
        if (!isPlayingRef.current) return;
        
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          const newWave = [];
          for (let i = 0; i < 15; i++) {
            const val = dataArray[i];
            newWave.push(Math.max(15, (val / 255) * 100)); // Minimal tinggi 15%
          }
          setWaveData(newWave);
          reqFrameRef.current = requestAnimationFrame(updateWave);
        } else {
          // 🛡️ FALLBACK: Animasi Fake jika Web Audio API terblokir CORS
          setWaveData(Array.from({length: 15}, () => Math.random() * 80 + 20));
          setTimeout(() => {
            if (isPlayingRef.current) reqFrameRef.current = requestAnimationFrame(updateWave);
          }, 100);
        }
      };
      updateWave();
    }
  };

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
            
            {/* 🔥 WARNA BUBBLE DIUBAH KE HIJAU SULTAN KHUSUS UNTUK USER (isMe) 🔥 */}
            <div className="content" style={{ background: isMe ? '#00a884' : 'var(--bg-panel)', color: isMe ? 'white' : 'var(--text-color)' }}>
              
              {showUserDetail && <div className="username-label">{msg.profiles?.username} <span dangerouslySetInnerHTML={{__html: getUserBadge(msg.profiles?.role)}} /></div>}
              
              {liveReply && (
                <div className="reply-box" style={{ background: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)' }} onClick={() => document.getElementById(`msg-${liveReply.id}`)?.scrollIntoView({behavior: 'smooth'})}>
                  <b style={{ color: isMe ? '#e0f2f1' : 'var(--primary-blue)' }}>{liveReply.username}</b>: {liveReply.message || 'Media'}
                </div>
              )}

              {msg.image_url && !isDeleted && <img src={getOptimizedImage(msg.image_url)} alt="foto" className="msg-image" />}

              {msg.sticker_url && !isDeleted && <img src={msg.sticker_url} alt="sticker" className="msg-sticker" />}

              {!isDeleted && msg.message && ![" Mengirim Foto", " Stiker", "Voice Note"].includes(msg.message) && (
                <div className="text-body">{renderTextWithLinks(msg.message.replace("Membalas ceritamu", "").trim())}</div>
              )}

              {isDeleted && <div className="text-deleted" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>🚫 {t('msg_deleted')}</div>}

              {/* 🔥 VN UI PREMIUM & SINKRON 🔥 */}
              {msg.audio_url && !isDeleted && (
                <div className={`vn-player ${isPlaying ? 'playing' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', minWidth: '160px' }}>
                  <button onClick={toggleVN} className="vn-btn" style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,168,132,0.1)', color: isMe ? '#fff' : '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    {isPlaying ? <span className="material-icons text-lg">pause</span> : <span className="material-icons text-lg">play_arrow</span>}
                  </button>
                  
                  {/* Waveform Sinkron Suara */}
                  <div className="vn-wave" style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '24px', flex: 1 }}>
                    {waveData.map((h, i) => (
                      <span key={i} className="v-bar" style={{ width: '3px', borderRadius: '2px', height: `${h}%`, background: isMe ? 'rgba(255,255,255,0.9)' : '#00a884', transition: 'height 0.1s linear' }}></span>
                    ))}
                  </div>
                </div>
              )}

              {/* REACTION BADGE */}
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="reaction-badge" style={{ background: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)' }}>
                  {Object.values(msg.reactions).slice(0, 3).join('')}
                  {Object.keys(msg.reactions).length > 1 && <span>{Object.keys(msg.reactions).length}</span>}
                </div>
              )}
              
              <div className="msg-footer">
                <span className="time" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                {isMe && getStatusIcon(msg.status)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ==================================================
   🔥 KOMPONEN BARU: SKELETON LOADING UNTUK CHAT 🔥
   ================================================== */
export const ChatSkeleton = () => {
  // Array dummy untuk ngebentuk pola chat (kiri-kiri-kanan-kiri-kanan)
  const dummyChats = [false, false, true, false, true]; 
  
  return (
    <div className="flex flex-col gap-5 p-2 w-full mt-2">
      {dummyChats.map((isMe, index) => (
        <div key={index} className={`flex items-end gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
          
          {/* Avatar Skeleton untuk orang lain */}
          {!isMe && (
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
          )}
          
          {/* Bubble Chat Skeleton */}
          <div 
            className={`bg-white/10 animate-pulse ${isMe ? 'rounded-[16px_16px_4px_16px]' : 'rounded-[16px_16px_16px_4px]'}`}
            style={{ 
              height: index % 3 === 0 ? '60px' : '44px', // Tinggi random
              width: index % 2 === 0 ? '65%' : '45%'     // Lebar random
            }}
          />
        </div>
      ))}
    </div>
  );
};
