'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif, getUserBadge } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
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

  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUser, setTypingUser] = useState<{ username: string; avatar_url: string } | null>(null);

  const [replyTo, setReplyTo] = useState<any>(null);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [stickers, setStickers] = useState<any[]>([]);

  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editMessageId, setEditMessageId] = useState<any>(null);
  const [relation, setRelation] = useState({ iFollowThem: false, theyFollowMe: false });

  // VN states
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);

  const isRecordingRef = useRef(false);
  const vnTouchStartX = useRef(0);
  const vnIsCanceled = useRef(false);

  const [lightboxSticker, setLightboxSticker] = useState<string | null>(null);

  const refs = {
    scroll: useRef<HTMLDivElement>(null),
    msgChannel: useRef<any>(null),
    presenceChannel: useRef<any>(null),
    audio: useRef<{ send: HTMLAudioElement; receive: HTMLAudioElement } | null>(null),
    mediaRecorder: useRef<MediaRecorder | null>(null),
    audioChunks: useRef<Blob[]>([]),
    recordTimer: useRef<any>(null),
    audioCtx: useRef<AudioContext | null>(null),
    animFrame: useRef<number | null>(null),
  };

  useEffect(() => {
    initApp();
    return () => cleanup();
  }, [fromId, groupId]);

  const initApp = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');
      setCurrentUser(session.user);

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setMyProfile(prof);

      refs.audio.current = {
        send: new Audio('/asets/sound/send.mp3'),
        receive: new Audio('/asets/sound/receive.mp3'),
      };

      // 🔥 FIX 2: Giphy API Integration
      fetchStickers();

      let currentRoom = 'room-1';
      if (groupId) {
        currentRoom = `group_${groupId}`;
        const { data: gData } = await supabase.from('groups').select('*').eq('id', groupId).single();
        if (gData)
          setHeaderInfo({ title: gData.name, sub: 'Grup', avatar: gData.photo_url, role: 'user' });
      } else if (fromId) {
        const ids = [session.user.id, fromId].sort();
        currentRoom = `pv_${ids[0]}_${ids[1]}`;
        setTargetId(fromId);

        // 🔥 FIX 4: Safety Check biar ga error invalid UUID pas ngecek profil
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fromId || '');
        let profileQuery = supabase.from('profiles').select('id, username, short_id, avatar_url, role'); // HAPUS last_seen
        
        if (isUUID) {
          profileQuery = profileQuery.eq('id', fromId);
        } else {
          profileQuery = profileQuery.eq('short_id', fromId);
        }

        const { data: pTarget } = await profileQuery.maybeSingle();

        if (pTarget) {
          setHeaderInfo({
            title: pTarget.username,
            sub: `#${pTarget.short_id}`,
            avatar: pTarget.avatar_url,
            role: pTarget.role,
          });
        }

        const { data: f1 } = await supabase
          .from('followers')
          .select('id')
          .match({ follower_id: session.user.id, following_id: fromId })
          .maybeSingle();
        const { data: f2 } = await supabase
          .from('followers')
          .select('id')
          .match({ follower_id: fromId, following_id: session.user.id })
          .maybeSingle();
        setRelation({ iFollowThem: !!f1, theyFollowMe: !!f2 });
      }
      setRoomId(currentRoom);
      await fetchMessages(currentRoom);
      setupRealtime(currentRoom, session.user);
    } catch (e) {
      console.error(e);
      setIsLoading(false); 
    }
  };

  const cleanup = () => {
    if (refs.msgChannel.current) supabase.removeChannel(refs.msgChannel.current);
    if (refs.presenceChannel.current) supabase.removeChannel(refs.presenceChannel.current);
    if (refs.audioCtx.current) refs.audioCtx.current.close();
    if (refs.animFrame.current) cancelAnimationFrame(refs.animFrame.current);
    clearInterval(refs.recordTimer.current);
  };

  // 🔥 FIX 2: Giphy API Logic 🔥
  const fetchStickers = async () => {
    try {
      const res = await fetch('https://api.giphy.com/v1/stickers/trending?api_key=vPUlBU5Qfz2ZygoEtKXVUqmIEAEcIB08&limit=20');
      const json = await res.json();
      if (json && json.data) {
        setStickers(json.data.map((s: any) => s.images.fixed_height.url));
      }
    } catch (error) {
      console.error("Giphy API Error:", error);
    }
  };

  const fetchMessages = async (room: string) => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('messages')
        .select('*, profiles:user_id(*), reply_to_msg:reply_to(id, username, message)')
        .eq('room_id', room)
        .order('created_at', { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const setupRealtime = (room: string, user: any) => {
    if (refs.msgChannel.current) supabase.removeChannel(refs.msgChannel.current);
    if (refs.presenceChannel.current) supabase.removeChannel(refs.presenceChannel.current);

    refs.msgChannel.current = supabase
      .channel(`msg-${room}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;
            const { data: p } = await supabase
              .from('profiles')
              .select('username, avatar_url, role')
              .eq('id', newMsg.user_id)
              .single();
            newMsg.profiles = p || undefined;
            setMessages((prev) => [...prev, newMsg]);
            if (newMsg.user_id !== user.id) {
              refs.audio.current?.receive.play().catch(() => {});
              if (newMsg.status !== 'read')
                await supabase.from('messages').update({ status: 'read' }).eq('id', newMsg.id);
            }
            scrollToBottom();
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
            );
          }
        }
      )
      .subscribe();

    refs.presenceChannel.current = supabase
      .channel(`presence-${room}`)
      .on('presence', { event: 'sync' }, () =>
        setOnlineCount(Object.keys(refs.presenceChannel.current.presenceState()).length)
      )
      .on('broadcast', { event: 'typing' }, (p: any) => {
        setTypingUser({ username: p.payload.username, avatar_url: p.payload.avatar_url });
        setTimeout(() => setTypingUser(null), 3000);
      })
      .subscribe(async (s) => {
        if (s === 'SUBSCRIBED')
          await refs.presenceChannel.current.track({ user_id: user.id, online: true });
      });
  };

  const scrollToBottom = (isSmooth = true) => {
    setTimeout(
      () =>
        refs.scroll.current?.scrollIntoView({ behavior: isSmooth ? 'smooth' : 'auto' }),
      150
    );
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
    refs.audio.current?.send.play().catch(() => {});

    if (editMessageId) {
      await supabase.from('messages').update({ message: content }).eq('id', editMessageId);
      setEditMessageId(null);
      setInputValue('');
      return;
    }

    const messagePreview = image && !content ? 'Mengirim Foto' : audio ? 'Voice Note' : sticker ? 'Stiker' : content;
    const { error } = await supabase.from('messages').insert([
      {
        room_id: roomId, user_id: currentUser.id, message: messagePreview, sticker_url: sticker || null, audio_url: audio || null, image_url: image || null, reply_to: replyTo?.id || null, status: 'sent',
      },
    ]);

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

  const startVN = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        if (vnIsCanceled.current) { vnIsCanceled.current = false; return; }

        const blob = new Blob(refs.audioChunks.current, { type: 'audio/mpeg' });
        const fd = new FormData(); fd.append("file", blob); fd.append("upload_preset", "hopehype_preset"); fd.append("resource_type", "video");
        const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: fd });
        const d = await res.json();
        if (d.secure_url) sendMessage(undefined, undefined, d.secure_url, undefined);
      };

      refs.mediaRecorder.current.start();
      setIsRecording(true); isRecordingRef.current = true;
      setRecordTime(0);
      refs.recordTimer.current = setInterval(() => setRecordTime(p => p + 1), 1000);
    } catch (e) { showNotif("Izin mikrofon ditolak", "error"); }
  };

  const stopVN = (isCanceledByUser = false) => {
    setSlideOffset(0);
    if (!isRecordingRef.current) return;
    setIsRecording(false); isRecordingRef.current = false;
    clearInterval(refs.recordTimer.current);

    if (isCanceledByUser) vnIsCanceled.current = true; 
    refs.mediaRecorder.current?.stop();
  };

  const handleTouchStart = (e: any) => { 
    if (!inputValue.trim() && !editMessageId && !pendingImagePreview) { 
      vnIsCanceled.current = false; setSlideOffset(0);
      vnTouchStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
      startVN(); 
    } 
  };

  const handleTouchMove = (e: any) => {
    if (!isRecordingRef.current) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const diff = vnTouchStartX.current - currentX;
    if (diff > 0) {
      setSlideOffset(-diff);
      if (diff > 100) { vnIsCanceled.current = true; stopVN(true); }
    }
  };

  const handleTouchEnd = () => stopVN(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  let chatState = 'normal';
  if (targetId && currentUser) {
    const myRawMsgs = messages.filter((m) => m.user_id === currentUser.id);
    const partnerRawMsgs = messages.filter((m) => m.user_id === targetId);
    if (partnerRawMsgs.length > 0 && myRawMsgs.length === 0 && !relation.iFollowThem) chatState = 'i_must_approve';
    else if (myRawMsgs.length > 0 && partnerRawMsgs.length === 0 && !relation.theyFollowMe) chatState = 'i_am_blocked_by_request';
  }

  let displayStatus = '';
  if (typingUser) {
    displayStatus = `${typingUser.username} mengetik...`;
  } else if (groupId) {
    displayStatus = `${onlineCount} hopers sedang online`;
  } else if (targetId) {
    displayStatus = onlineCount >= 2 ? 'Online' : `Offline`;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0b141a]">
      {lightboxSticker && <div className="sticker-lightbox z-[9999] fixed inset-0 bg-black/80 flex items-center justify-center" onClick={() => setLightboxSticker(null)}><img src={lightboxSticker} alt="s" className="max-w-[80%] max-h-[80%]" /></div>}

      <header className="flex items-center justify-between px-4 py-2.5 bg-[#1f2c34] z-50 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3 w-full">
          <button 
            className="text-gray-300 hover:text-white transition-colors cursor-pointer p-1 flex items-center justify-center" 
            style={{ background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
            onClick={() => router.push('/hypetalk')}
          >
            <span className="material-icons text-[26px]">arrow_back</span>
          </button>
          
          {targetId && (
            <img 
              src={headerInfo.avatar || '/asets/png/profile.webp'} 
              alt="avatar" 
              className="rounded-full object-cover border border-transparent shadow-sm" 
              style={{ width: '40px', height: '40px', minWidth: '40px' }} 
            />
          )}
          
          <div className="flex flex-col overflow-hidden flex-1">
            <h3 className="flex items-center gap-1 font-medium truncate text-white text-[17px]">
              {headerInfo.title} {targetId && <span dangerouslySetInnerHTML={{ __html: getUserBadge(headerInfo.role) }} />}
            </h3>
            <span className={`text-[12px] truncate ${typingUser ? "text-[#1da1f2]" : "text-[#8696a0]"}`}>
              {displayStatus}
            </span>
          </div>
          
          {targetId && (
            <button 
              className="p-1 rounded-full text-white transition-all cursor-pointer relative z-50 flex-shrink-0 flex items-center justify-center" 
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none', opacity: chatState === 'normal' ? 1 : 0.3, pointerEvents: chatState === 'normal' ? 'auto' : 'none' }} 
              onClick={startCall}
            >
              <span className="material-icons text-[24px]">call</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-[#0b141a]">
        {isLoading ? (
          <ChatSkeleton />
        ) : (
          <>
            <div className="flex justify-center mb-6 mt-2">
               <div className="bg-[#ffeebd] text-[#544336] rounded-lg p-3 text-[11.5px] leading-[1.4] text-center shadow-sm flex items-start gap-2 max-w-[85%] font-medium">
                 <span className="material-icons text-[14px] mt-[1px]">lock</span>
                 <p>Pesan dan panggilan dienkripsi secara end-to-end. Tidak ada orang di luar chat ini yang dapat membaca atau mendengarkannya.</p>
               </div>
            </div>
            
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} currentUser={currentUser} isMe={msg.user_id === currentUser?.id} onReply={setReplyTo} roomId={roomId} />
            ))}
          </>
        )}
        <div ref={refs.scroll} />
      </main>

      <footer className="relative bg-[#0b141a] p-2 px-3 pb-3 z-50">
        <AnimatePresence>
          {isStickerOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full left-3 right-3 mb-2 bg-[#1f2c34] border border-white/10 rounded-2xl p-4 shadow-2xl max-h-60 overflow-y-auto z-[60]"
            >
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {stickers.length > 0 ? (
                  stickers.map((s, i) => (
                    <img key={i} src={s} alt="sticker" className="w-full h-auto cursor-pointer hover:scale-110 transition-transform bg-white/5 rounded-lg p-1" onClick={() => sendMessage(undefined, s)} />
                  ))
                ) : (
                  <p className="col-span-full text-center text-gray-400 text-xs py-6 font-medium">Memuat stiker...</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {chatState === 'normal' ? (
          <div className="w-full flex items-end gap-2 px-1 relative">
            
            {/* 🔥 FIX 1 & 3: BUNGKUS INPUT & REPLY DALAM SATU PILL BULET BIAR KUNCI & MENYATU 🔥 */}
            <div className="flex-1 bg-[#1f2c34] rounded-[24px] flex flex-col overflow-hidden min-h-[48px] shadow-sm relative">
              
              {/* REPLY PREVIEW MENYATU DI DALAM BOX */}
              <AnimatePresence>
                {replyTo && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-[#1f2c34] border-l-4 border-[#1da1f2] flex items-center justify-between border-b border-white/5 mx-2 mt-2 px-2 py-1.5 rounded-lg overflow-hidden"
                  >
                    <div className="flex flex-col truncate pr-4">
                      <span className="text-[#1da1f2] font-bold text-[12px] mb-0.5">Membalas {replyTo.profiles?.username || 'User'}</span>
                      <span className="text-[#8696a0] truncate text-[12px]">{replyTo.message || (replyTo.image_url ? 'Foto' : replyTo.audio_url ? 'Voice Note' : 'Stiker')}</span>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white flex-shrink-0 p-1 flex items-center justify-center" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
                      <span className="material-icons text-lg">close</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* INPUT AREA (TEXTAREA / VN) */}
              <div className="flex items-center min-h-[48px] w-full relative">
                 {pendingImagePreview && (
                   <div className="p-2 relative z-10">
                     <img src={pendingImagePreview} alt="p" className="w-12 h-12 object-cover rounded-xl border border-white/10" />
                     <button onClick={() => setPendingImagePreview(null)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs" style={{ border: 'none' }}>&times;</button>
                   </div>
                 )}
                 
                 <AnimatePresence>
                   {isRecording ? (
                     <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex-1 flex items-center justify-between px-4 py-3 bg-[#1f2c34] absolute inset-0 w-full h-full z-20"
                     >
                        <div className="flex items-center gap-2">
                           <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                           <span className="text-[#e9edef] text-sm font-bold tracking-widest">{formatTime(recordTime)}</span>
                        </div>
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
                        <div className="flex items-center text-[#8696a0] text-[12px] animate-pulse">
                           <span className="material-icons text-[16px] mr-1">keyboard_double_arrow_left</span>
                           Geser batal
                        </div>
                     </motion.div>
                   ) : (
                     <div className="flex w-full items-end min-h-[48px] z-10">
                       <button 
                         onClick={() => setIsStickerOpen(!isStickerOpen)} 
                         className="p-3 mb-0.5 text-[#8696a0] hover:text-white transition-colors focus:outline-none flex items-center justify-center flex-shrink-0"
                         style={{ background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
                       >
                         <span className="material-icons">sentiment_satisfied_alt</span>
                       </button>
                       
                       <textarea 
                         placeholder={t('write_message')} 
                         value={inputValue} 
                         onChange={(e) => setInputValue(e.target.value)} 
                         className="flex-1 bg-transparent border-none outline-none py-3 text-white resize-none text-[15px]" 
                         rows={1}
                         style={{ maxHeight: '100px', minHeight: '48px' }}
                       />
                       
                       <button 
                         onClick={() => fileInputRef.current?.click()} 
                         className="p-3 mb-0.5 text-[#8696a0] hover:text-white transition-colors focus:outline-none flex items-center justify-center flex-shrink-0"
                         style={{ background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
                       >
                         <span className="material-icons">image</span>
                       </button>
                       <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e:any) => setPendingImagePreview(URL.createObjectURL(e.target.files[0]))} />
                     </div>
                   )}
                 </AnimatePresence>
              </div>
            </div>
            
            {/* Tombol Mic/Send */}
            <motion.button 
              animate={{ x: slideOffset }}
              className={`w-[48px] h-[48px] flex-shrink-0 flex items-center justify-center rounded-full text-white shadow-md relative z-50`}
              style={{ 
                 backgroundColor: isRecording ? '#ef4444' : '#1da1f2', 
                 border: 'none', 
                 outline: 'none',
                 transform: isRecording ? 'scale(1.15)' : 'scale(1)'
              }}
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
        ) : (
          <div className="p-4 text-center text-sm text-[#8696a0] w-full bg-[#1f2c34] rounded-xl">Menunggu persetujuan chat...</div>
        )}
      </footer>
    </div>
  );
}
