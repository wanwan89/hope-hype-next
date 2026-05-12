'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif, getUserBadge } from '@/lib/ui-utils'; 
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion'; // 🔥 TAMBAHAN FRAMER MOTION
import MessageBubble from './MessageBubble';
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
  const [typingUser, setTypingUser] = useState<{ username: string, avatar_url: string } | null>(null);

  const [replyTo, setReplyTo] = useState<any>(null);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [stickers, setStickers] = useState<any[]>([]); // Array stiker lu (bisa diisi URL gambar)
  
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editMessageId, setEditMessageId] = useState<any>(null);
  const [relation, setRelation] = useState({ iFollowThem: false, theyFollowMe: false });

  // --- VN STATES ---
  const [isMicPressed, setIsMicPressed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cancelAnim, setCancelAnim] = useState(false); 
  const isRecordingRef = useRef(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0); 
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
    audioCtx: useRef<AudioContext | null>(null)
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
      const { data: pTarget } = await supabase.from('profiles').select('username, short_id, avatar_url, role').eq('id', fromId).single();
      if (pTarget) setHeaderInfo({ title: pTarget.username, sub: `#${pTarget.short_id}`, avatar: pTarget.avatar_url, role: pTarget.role });

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

  // --- VN LOGIC ---
  const startVN = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      refs.mediaRecorder.current = new MediaRecorder(stream);
      refs.audioChunks.current = [];
      refs.mediaRecorder.current.ondataavailable = (e) => refs.audioChunks.current.push(e.data);
      refs.mediaRecorder.current.onstop = async () => {
        if (vnIsCanceled.current) return;
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
    } catch (e) { showNotif(t('mic_error'), "error"); }
  };

  const stopVN = (isCanceledByUser = false) => {
    setIsMicPressed(false); 
    if (!isRecordingRef.current) return;
    setIsRecording(false); isRecordingRef.current = false;
    clearInterval(refs.recordTimer.current);
    if (isCanceledByUser || vnIsCanceled.current) { vnIsCanceled.current = true; setCancelAnim(true); setTimeout(() => setCancelAnim(false), 2000); }
    refs.mediaRecorder.current?.stop();
  };

  const handleMicTouchStart = (e: any) => { if (!inputValue.trim() && !editMessageId && !pendingImagePreview) { setIsMicPressed(true); vnIsCanceled.current = false; startVN(); } };

  // --- UI HELPERS ---
  let chatState = 'normal';
  if (targetId && currentUser) {
    const myRawMsgs = messages.filter(m => m.user_id === currentUser.id);
    const partnerRawMsgs = messages.filter(m => m.user_id === targetId);
    if (partnerRawMsgs.length > 0 && myRawMsgs.length === 0 && !relation.iFollowThem) chatState = 'i_must_approve';
    else if (myRawMsgs.length > 0 && partnerRawMsgs.length === 0 && !relation.theyFollowMe) chatState = 'i_am_blocked_by_request';
  }

  const displayStatus = typingUser ? `${typingUser.username} mengetik...` : (onlineCount >= 2 ? 'Sedang online' : 'Offline');

  return (
    <div className="telegram-chat hype-chat-scope">
      {lightboxSticker && <div className="sticker-lightbox" onClick={() => setLightboxSticker(null)}><img src={lightboxSticker} alt="s" /></div>}

      <header className="chat-header">
        <div className="header-left flex items-center gap-3">
          <button className="menu-btn" onClick={() => router.push('/hypetalk')}><span className="material-icons">arrow_back</span></button>
          
          {targetId && (
            <img 
              src={headerInfo.avatar || '/asets/png/profile.webp'} 
              alt="avatar" 
              className="header-avatar w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/10 shadow-sm" 
              style={{ width: '40px', height: '40px', minWidth: '40px' }} 
            />
          )}
          
          <div className="header-info overflow-hidden">
            <h3 className="flex items-center gap-1 font-semibold truncate text-white">{headerInfo.title} {targetId && <span dangerouslySetInnerHTML={{ __html: getUserBadge(headerInfo.role) }} />}</h3>
            <span className={`text-xs ${typingUser ? "status-typing text-[#1f3cff] font-medium" : "status-online text-gray-400"}`}>{displayStatus}</span>
          </div>
        </div>
        <div className="header-right">
          {targetId && <button className="btn-call" style={{ opacity: chatState === 'normal' ? 1 : 0.3 }} onClick={startCall}><span className="material-icons">call</span></button>}
        </div>
      </header>

      <main className="chat-messages">
        {isLoading ? <div className="chat-loading-screen">Memuat obrolan...</div> : (
          <>
            <div className="encryption-notice"><span className="material-icons text-xs">lock</span> {t('encryption_notice')}</div>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} currentUser={currentUser} isMe={msg.user_id === currentUser?.id} onReply={setReplyTo} roomId={roomId} />
            ))}
          </>
        )}
        <div ref={refs.scroll} />
      </main>

      {/* 🔥 CONTAINER BAWAH: Menggunakan relative agar panel stiker & reply bisa menumpang sempurna 🔥 */}
      <footer className="chat-input-container relative z-10">
        
        {/* --- 1. FIX UI STICKER PANEL --- */}
        <AnimatePresence>
          {isStickerOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full mb-3 left-4 right-4 bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 shadow-xl max-h-48 overflow-y-auto z-50 backdrop-blur-md"
            >
              <div className="grid grid-cols-4 gap-3">
                {stickers.length > 0 ? (
                  stickers.map((s, i) => (
                    <img key={i} src={s} alt="sticker" className="w-full h-auto cursor-pointer hover:scale-110 transition-transform" onClick={() => sendMessage(undefined, s)} />
                  ))
                ) : (
                  <p className="col-span-4 text-center text-gray-500 text-xs py-4">Belum ada stiker tersedia.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {chatState === 'normal' ? (
          <div className="w-full flex flex-col">
            
            {/* --- 2. FIX UI REPLY BOX --- */}
            <AnimatePresence>
              {replyTo && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between bg-white/5 border-l-4 border-[#1f3cff] p-3 mb-2 mx-2 rounded-lg text-sm backdrop-blur-sm"
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="text-[#1f3cff] font-bold text-xs mb-0.5">Membalas {replyTo.profiles?.username || 'User'}</span>
                    <span className="text-gray-300 truncate text-xs">{replyTo.message || (replyTo.image_url ? 'Foto' : replyTo.audio_url ? 'Voice Note' : 'Stiker')}</span>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white p-1">
                    <span className="material-icons text-sm">close</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* --- BAGIAN INPUT UTAMA --- */}
            <div className="input-row flex items-end gap-2 w-full">
              <div className="input-group-wrapper flex-1 bg-white/5 rounded-3xl flex flex-col overflow-hidden border border-white/10">
                 
                 {pendingImagePreview && (
                   <div className="preview-box p-2 relative">
                     <img src={pendingImagePreview} alt="p" className="w-20 h-20 object-cover rounded-xl" />
                     <button onClick={() => setPendingImagePreview(null)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs translate-x-1 -translate-y-1">&times;</button>
                   </div>
                 )}
                 
                 <div className="flex w-full items-center min-h-[48px]">
                   <button 
                     onClick={() => setIsStickerOpen(!isStickerOpen)} 
                     className="p-3 flex items-center justify-center text-gray-400 hover:text-white transition-colors outline-none border-none bg-transparent"
                   >
                     <span className="material-icons">sentiment_satisfied_alt</span>
                   </button>
                   
                   <textarea 
                     placeholder={t('write_message')} 
                     value={inputValue} 
                     onChange={(e) => setInputValue(e.target.value)} 
                     className="flex-1 bg-transparent border-none outline-none py-3 text-white resize-none text-sm" 
                     rows={1}
                     style={{ maxHeight: '100px' }}
                   />
                   
                   <button 
                     onClick={() => fileInputRef.current?.click()} 
                     className="p-3 flex items-center justify-center text-gray-400 hover:text-white transition-colors outline-none border-none bg-transparent"
                   >
                     <span className="material-icons">image</span>
                   </button>
                   
                   <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e:any) => setPendingImagePreview(URL.createObjectURL(e.target.files[0]))} />
                 </div>
              </div>
              
              {/* --- 3. FIX ANIMASI FRAMER MOTION PADA TOMBOL ACTION --- */}
              <button 
                id="action-btn" 
                className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-[#1f3cff] text-white shadow-lg overflow-hidden relative border-none outline-none"
                onMouseDown={handleMicTouchStart} 
                onMouseUp={() => stopVN(false)} 
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
              </button>
              
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-gray-500 w-full">Selesaikan permintaan pesan untuk mengobrol.</div>
        )}
      </footer>
    </div>
  );
}
