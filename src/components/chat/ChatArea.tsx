'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif, getUserBadge } from '@/lib/ui-utils'; 
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
// 🔥 IMPORT SKELETON YANG UDAH KITA BUAT DI MESSAGEBUBBLE 🔥
import MessageBubble, { ChatSkeleton } from './MessageBubble';
import './ChatArea.css';

export default function ChatArea() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation(); 
  
  const fromId = searchParams?.get('from');
  const groupId = searchParams?.get('group');

  const [roomId, setRoomId] = useState('room-1');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  
  const [headerInfo, setHeaderInfo] = useState({ title: 'HopeTalk Globe', sub: '', avatar: '', role: 'user' });
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetLastSeen, setTargetLastSeen] = useState<string | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUser, setTypingUser] = useState<{ username: string, avatar_url: string } | null>(null);

  const [replyTo, setReplyTo] = useState<any>(null);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [stickers, setStickers] = useState<any[]>([]); 
  
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editMessageId, setEditMessageId] = useState<any>(null);
  const [relation, setRelation] = useState({ iFollowThem: false, theyFollowMe: false });

  // --- VN STATES (DENGAN INDIKATOR BARU) ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0); 
  const [slideOffset, setSlideOffset] = useState(0); // Posisi geser tombol
  
  const isRecordingRef = useRef(false);
  const vnTouchStartX = useRef(0);
  const vnIsCanceled = useRef(false);

  const [lightboxSticker, setLightboxSticker] = useState<string | null>(null);

  const refs = {
    scroll: useRef<HTMLDivElement>(null),
    msgChannel: useRef<any>(null),
    presenceChannel: useRef<any>(null),
    audio: useRef<{ send: HTMLAudioElement, receive: HTMLAudioElement } | null>(null),
    mediaRecorder: useRef<MediaRecorder | null>(null),
    audioChunks: useRef<Blob[]>([]),
    recordTimer: useRef<any>(null),
    audioCtx: useRef<AudioContext | null>(null),
    animFrame: useRef<number | null>(null)
  };

  useEffect(() => {
    initApp();
    return () => cleanup();
  }, [fromId, groupId]);

  const initApp = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    setCurrentUser(session.user);

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    setMyProfile(prof);

    refs.audio.current = {
      send: new Audio("/asets/sound/send.mp3"),
      receive: new Audio("/asets/sound/receive.mp3")
    };

    let currentRoom = 'room-1';
    if (groupId) {
      currentRoom = `group_${groupId}`;
      const { data: gData } = await supabase.from('groups').select('*').eq('id', groupId).single();
      if (gData) setHeaderInfo({ title: gData.name, sub: "Grup", avatar: gData.photo_url, role: 'user' });
    } else if (fromId) {
      const ids = [session.user.id, fromId].sort();
      currentRoom = `pv_${ids[0]}_${ids[1]}`;
      setTargetId(fromId);
      // Fetch target data + last_seen
      const { data: pTarget } = await supabase.from('profiles').select('username, short_id, avatar_url, role, last_seen').eq('id', fromId).single();
      if (pTarget) {
        setHeaderInfo({ title: pTarget.username, sub: `#${pTarget.short_id}`, avatar: pTarget.avatar_url, role: pTarget.role });
        setTargetLastSeen(pTarget.last_seen);
      }

      const { data: f1 } = await supabase.from('followers').select('id').match({ follower_id: session.user.id, following_id: fromId }).maybeSingle();
      const { data: f2 } = await supabase.from('followers').select('id').match({ follower_id: fromId, following_id: session.user.id }).maybeSingle();
      setRelation({ iFollowThem: !!f1, theyFollowMe: !!f2 });
    }
    setRoomId(currentRoom);
    await fetchMessages(currentRoom);
    setupRealtime(currentRoom, session.user);
  };

  const cleanup = () => {
    if (refs.msgChannel.current) supabase.removeChannel(refs.msgChannel.current);
    if (refs.presenceChannel.current) supabase.removeChannel(refs.presenceChannel.current);
    if (refs.audioCtx.current) refs.audioCtx.current.close();
    if (refs.animFrame.current) cancelAnimationFrame(refs.animFrame.current);
    clearInterval(refs.recordTimer.current);
  };

  const fetchMessages = async (room: string) => {
    setIsLoading(true);
    const { data } = await supabase.from('messages').select('*, profiles:user_id(*), reply_to_msg:reply_to(id, username, message)').eq('room_id', room).order('created_at', { ascending: true }).limit(50);
    if (data) setMessages(data);
    setIsLoading(false);
    scrollToBottom();
  };

  const setupRealtime = (room: string, user: any) => {
    refs.msgChannel.current = supabase.channel(`msg-${room}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as any;
          const { data: p } = await supabase.from('profiles').select('username, avatar_url, role').eq('id', newMsg.user_id).single();
          newMsg.profiles = p || undefined;
          setMessages(prev => [...prev, newMsg]);
          if (newMsg.user_id !== user.id) {
            refs.audio.current?.receive.play().catch(()=>{});
            if (newMsg.status !== 'read') await supabase.from('messages').update({ status: 'read' }).eq('id', newMsg.id);
          }
          scrollToBottom();
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      }).subscribe();

    refs.presenceChannel.current = supabase.channel(`presence-${room}`)
      .on('presence', { event: 'sync' }, () => setOnlineCount(Object.keys(refs.presenceChannel.current.presenceState()).length))
      .on('broadcast', { event: 'typing' }, (p: any) => { 
        setTypingUser({ username: p.payload.username, avatar_url: p.payload.avatar_url }); 
        setTimeout(() => setTypingUser(null), 3000); 
      })
      .subscribe(async (s) => { if (s === 'SUBSCRIBED') await refs.presenceChannel.current.track({ user_id: user.id, online: true }); });
  };

  const scrollToBottom = (isSmooth = true) => {
    setTimeout(() => refs.scroll.current?.scrollIntoView({ behavior: isSmooth ? 'smooth' : 'auto' }), 150);
  };

  const triggerPushNotification = async (type: string, title: string, message: string) => {
    if (!targetId || !myProfile) return;
    try {
      const { data: targetUser } = await supabase.from('profiles').select('fcm_token').eq('id', targetId).single();
      if (targetUser?.fcm_token) {
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetToken: targetUser.fcm_token, type, title, message, callerId: currentUser.id, roomId })
        });
      }
    } catch (e) { console.error(e); }
  };

  const sendMessage = async (text?: string, sticker?: string, audio?: string, image?: string) => {
    const content = text || inputValue;
    if (!content && !sticker && !audio && !image) return;
    refs.audio.current?.send.play().catch(()=>{});

    if (editMessageId) {
      await supabase.from('messages').update({ message: content }).eq('id', editMessageId);
      setEditMessageId(null); setInputValue(''); return;
    }

    const messagePreview = image && !content ? "Mengirim Foto" : audio ? "Voice Note" : (sticker ? "Stiker" : content);
    const { error } = await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, message: messagePreview, sticker_url: sticker || null, audio_url: audio || null, image_url: image || null, reply_to: replyTo?.id || null, status: 'sent' }]);
    
    if (!error) { 
      setInputValue(''); setReplyTo(null); setIsStickerOpen(false); setPendingImagePreview(null);
      if (targetId) triggerPushNotification('chat', myProfile?.username || 'Pesan Baru', messagePreview);
    }
  };

  const startCall = () => {
    if (!targetId) return;
    window.dispatchEvent(new CustomEvent('init-global-call', { 
      detail: { roomId, targetId, partnerName: headerInfo.title, partnerAvatar: headerInfo.avatar } 
    }));
  };

  // --- 🔥 VN LOGIC & REALTIME AUDIO WAVE 🔥 ---
  const startVN = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Audio Analyzer untuk Waveform
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      refs.audioCtx.current = audioCtx;

      const updateWave = () => {
        if (!isRecordingRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average);
        refs.animFrame.current = requestAnimationFrame(updateWave);
      };
      updateWave();

      refs.mediaRecorder.current = new MediaRecorder(stream);
      refs.audioChunks.current = [];
      refs.mediaRecorder.current.ondataavailable = (e) => refs.audioChunks.current.push(e.data);
      refs.mediaRecorder.current.onstop = async () => {
        if (refs.audioCtx.current) refs.audioCtx.current.close();
        if (refs.animFrame.current) cancelAnimationFrame(refs.animFrame.current);
        if (vnIsCanceled.current) return;
        
        const blob = new Blob(refs.audioChunks.current, { type: 'audio/mpeg' });
        const fd = new FormData(); fd.append("file", blob); fd.append("upload_preset", "hopehype_preset"); fd.append("resource_type", "video");
        const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: fd });
        const d = await res.json();
        if (d.secure_url) sendMessage(undefined, undefined, d.secure_url, undefined);
      };
      
      refs.mediaRecorder.current.start();
      setIsRecording(true); 
      isRecordingRef.current = true;
      setRecordTime(0);
      refs.recordTimer.current = setInterval(() => setRecordTime(p => p + 1), 1000);
    } catch (e) { showNotif("Izin mikrofon ditolak", "error"); }
  };

  const stopVN = (isCanceledByUser = false) => {
    setSlideOffset(0);
    if (!isRecordingRef.current) return;
    setIsRecording(false); 
    isRecordingRef.current = false;
    clearInterval(refs.recordTimer.current);
    
    if (isCanceledByUser || vnIsCanceled.current) { 
      vnIsCanceled.current = true; 
    }
    refs.mediaRecorder.current?.stop();
  };

  // Slide to cancel logic
  const handleTouchStart = (e: any) => { 
    if (!inputValue.trim() && !editMessageId && !pendingImagePreview) { 
      vnIsCanceled.current = false; 
      setSlideOffset(0);
      vnTouchStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
      startVN(); 
    } 
  };

  const handleTouchMove = (e: any) => {
    if (!isRecordingRef.current) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const diff = vnTouchStartX.current - currentX;
    
    if (diff > 0) { // Geser ke kiri
      setSlideOffset(-diff);
      if (diff > 100) { // Threshold Batal
        vnIsCanceled.current = true;
        stopVN(true);
      }
    }
  };

  const handleTouchEnd = () => stopVN(false);

  // --- UI FORMATTER ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return 'Tidak diketahui';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Hari ini ${timeStr}` : `${date.toLocaleDateString('id-ID')} ${timeStr}`;
  };

  let chatState = 'normal';
  if (targetId && currentUser) {
    const myRawMsgs = messages.filter(m => m.user_id === currentUser.id);
    const partnerRawMsgs = messages.filter(m => m.user_id === targetId);
    if (partnerRawMsgs.length > 0 && myRawMsgs.length === 0 && !relation.iFollowThem) chatState = 'i_must_approve';
    else if (myRawMsgs.length > 0 && partnerRawMsgs.length === 0 && !relation.theyFollowMe) chatState = 'i_am_blocked_by_request';
  }

  // --- FIX 6: Indikator Online/Last Seen ---
  let displayStatus = "";
  if (typingUser) {
    displayStatus = `${typingUser.username} mengetik...`;
  } else if (groupId) {
    displayStatus = `${onlineCount} member online`;
  } else if (targetId) {
    displayStatus = onlineCount >= 2 ? 'Online' : `Terakhir dilihat: ${formatLastSeen(targetLastSeen)}`;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#050505]">
      {lightboxSticker && <div className="sticker-lightbox z-[9999] fixed inset-0 bg-black/80 flex items-center justify-center" onClick={() => setLightboxSticker(null)}><img src={lightboxSticker} alt="s" className="max-w-[80%] max-h-[80%]" /></div>}

      {/* --- FIX 5 & 7: HEADER RAPIH + TOMBOL KEMBALI FIX --- */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#111111]/90 backdrop-blur-md border-b border-white/5 z-50 sticky top-0">
        <div className="flex items-center gap-3 w-full">
          <button 
            className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1" 
            onClick={() => router.push('/hypetalk')}
          >
            <span className="material-icons text-2xl">arrow_back</span>
          </button>
          
          {targetId && (
            <img 
              src={headerInfo.avatar || '/asets/png/profile.webp'} 
              alt="avatar" 
              className="rounded-full object-cover border border-white/10 shadow-sm" 
              style={{ width: '42px', height: '42px', minWidth: '42px' }} 
            />
          )}
          
          <div className="flex flex-col overflow-hidden flex-1">
            <h3 className="flex items-center gap-1 font-semibold truncate text-white text-[15px]">
              {headerInfo.title} {targetId && <span dangerouslySetInnerHTML={{ __html: getUserBadge(headerInfo.role) }} />}
            </h3>
            <span className={`text-[11px] truncate ${typingUser ? "text-[#1f3cff] font-medium" : onlineCount >= 2 ? "text-[#2ecc71]" : "text-gray-500"}`}>
              {displayStatus}
            </span>
          </div>
          
          {/* --- FIX 1: TOMBOL TELPON --- */}
          {targetId && (
            <button 
              className="p-2 bg-white/5 rounded-full text-gray-300 hover:text-green-400 hover:bg-white/10 transition-all cursor-pointer relative z-50 flex-shrink-0" 
              style={{ opacity: chatState === 'normal' ? 1 : 0.3, pointerEvents: chatState === 'normal' ? 'auto' : 'none' }} 
              onClick={startCall}
            >
              <span className="material-icons text-xl">call</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-[#050505]">
        {/* 🔥 FIX PANGGIL CHATSKELETON DI SINI SAAT LOADING 🔥 */}
        {isLoading ? (
          <ChatSkeleton />
        ) : (
          <>
            <div className="text-center mb-6"><span className="inline-flex items-center gap-1 text-[10px] bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full"><span className="material-icons text-[12px]">lock</span> Pesan terenkripsi end-to-end</span></div>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} currentUser={currentUser} isMe={msg.user_id === currentUser?.id} onReply={setReplyTo} roomId={roomId} />
            ))}
          </>
        )}
        <div ref={refs.scroll} />
      </main>

      {/* --- FIX 8: CHAT INPUT AREA (MODERN PILL) --- */}
      <footer className="relative bg-[#0b0c10] border-t border-white/5 p-2 px-3 z-50">
        
        {/* --- FIX 2: STICKER PANEL CSS --- */}
        <AnimatePresence>
          {isStickerOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full left-3 right-3 mb-3 bg-[#151515] border border-white/10 rounded-2xl p-4 shadow-2xl max-h-60 overflow-y-auto z-[60]"
            >
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {stickers.length > 0 ? (
                  stickers.map((s, i) => (
                    <img key={i} src={s} alt="sticker" className="w-full h-auto cursor-pointer hover:scale-110 transition-transform bg-white/5 rounded-lg p-1" onClick={() => sendMessage(undefined, s)} />
                  ))
                ) : (
                  <p className="col-span-full text-center text-gray-500 text-xs py-6 font-medium">Belum ada stiker tersedia.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {chatState === 'normal' ? (
          <div className="w-full flex flex-col relative">
            
            {/* --- FIX 3: REPLY BOX CSS --- */}
            <AnimatePresence>
              {replyTo && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#1a1a1a] border-l-4 border-[#1f3cff] rounded-xl p-3 mb-2 flex items-center justify-between shadow-md"
                >
                  <div className="flex flex-col truncate pr-4">
                    <span className="text-[#1f3cff] font-bold text-[11px] mb-1">Membalas {replyTo.profiles?.username || 'User'}</span>
                    <span className="text-gray-300 truncate text-xs">{replyTo.message || (replyTo.image_url ? 'Foto' : replyTo.audio_url ? 'Voice Note' : 'Stiker')}</span>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-white bg-white/5 rounded-full p-1 w-6 h-6 flex items-center justify-center">
                    <span className="material-icons text-sm">close</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2 w-full">
              
              {/* --- FIX 4: INPUT AREA & VN INDICATOR --- */}
              <div className="flex-1 bg-[#1a1a1a] rounded-[24px] flex items-center overflow-hidden border border-white/5 min-h-[48px] relative">
                 
                 {/* PREVIEW GAMBAR */}
                 {pendingImagePreview && (
                   <div className="p-2 relative">
                     <img src={pendingImagePreview} alt="p" className="w-16 h-16 object-cover rounded-xl border border-white/10" />
                     <button onClick={() => setPendingImagePreview(null)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                   </div>
                 )}
                 
                 {/* STATE SAAT MEREKAM VN */}
                 <AnimatePresence>
                   {isRecording ? (
                     <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex-1 flex items-center justify-between px-4 py-3 bg-red-500/10 text-red-400 absolute inset-0 w-full h-full"
                     >
                        <div className="flex items-center gap-2">
                           <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                           <span className="text-sm font-bold tracking-widest">{formatTime(recordTime)}</span>
                        </div>

                        {/* WAVEFORM ANIMATION */}
                        <div className="flex items-end gap-1 h-6">
                           {[1,2,3,4,5,6].map((i) => (
                              <motion.div 
                                key={i}
                                className="w-1 bg-red-400 rounded-full"
                                animate={{ height: Math.max(4, (audioLevel / 255) * 24 * (Math.random() * 0.5 + 0.5)) + 'px' }}
                                transition={{ type: "tween", duration: 0.1 }}
                              />
                           ))}
                        </div>

                        <div className="flex items-center text-gray-400 text-[11px] animate-pulse">
                           <span className="material-icons text-[14px]">keyboard_double_arrow_left</span>
                           Geser batal
                        </div>
                     </motion.div>
                   ) : (
                     <div className="flex w-full items-center">
                       {/* TOMBOL STIKER */}
                       <button onClick={() => setIsStickerOpen(!isStickerOpen)} className="p-3 text-gray-400 hover:text-white transition-colors focus:outline-none">
                         <span className="material-icons">sentiment_satisfied_alt</span>
                       </button>
                       
                       {/* TEXTAREA */}
                       <textarea 
                         placeholder={t('write_message')} 
                         value={inputValue} 
                         onChange={(e) => setInputValue(e.target.value)} 
                         className="flex-1 bg-transparent border-none outline-none py-3 text-white resize-none text-[14px]" 
                         rows={1}
                         style={{ maxHeight: '100px' }}
                       />
                       
                       {/* TOMBOL GAMBAR */}
                       <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-white transition-colors focus:outline-none">
                         <span className="material-icons">image</span>
                       </button>
                       <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e:any) => setPendingImagePreview(URL.createObjectURL(e.target.files[0]))} />
                     </div>
                   )}
                 </AnimatePresence>
              </div>
              
              {/* --- TOMBOL MIC / SEND (DENGAN DRAG TO CANCEL) --- */}
              <motion.button 
                id="action-btn" 
                animate={{ x: slideOffset }}
                className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full text-white shadow-lg relative border-none outline-none z-50 ${isRecording ? 'bg-red-500 scale-110' : 'bg-[#1f3cff]'}`}
                onTouchStart={handleTouchStart} 
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={(e) => isRecording && handleTouchMove(e)}
                onMouseUp={handleTouchEnd}
                onMouseLeave={() => isRecording && handleTouchEnd()}
                onClick={() => (inputValue || pendingImagePreview) && sendMessage()}
              >
                <AnimatePresence mode="wait">
                  {(inputValue || pendingImagePreview) ? (
                    <motion.span
                      key="send"
                      initial={{ scale: 0, rotate: -45, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0, rotate: 45, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="material-icons absolute"
                    >
                      send
                    </motion.span>
                  ) : (
                    <motion.span
                      key="mic"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="material-icons absolute"
                    >
                      mic
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-gray-500 w-full bg-[#1a1a1a] rounded-xl">Menunggu persetujuan chat...</div>
        )}
      </footer>
    </div>
  );
}
