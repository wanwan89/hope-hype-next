'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif, getUserBadge } from '@/lib/ui-utils'; 
import { useTranslation } from 'react-i18next';
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
  const [stickers, setStickers] = useState<any[]>([]);
  
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
      setInputValue(''); setReplyTo(null); setIsStickerOpen(false); 
      if (targetId) triggerPushNotification('chat', myProfile?.username || 'Pesan Baru', messagePreview);
    }
  };

  const startCall = () => {
    if (!targetId) return;
    // 🔥 TRIGGER EVENT KE LAYOUT.TSX 🔥
    window.dispatchEvent(new CustomEvent('init-global-call', { 
      detail: { roomId, targetId, partnerName: headerInfo.title, partnerAvatar: headerInfo.avatar } 
    }));
  };

  // --- VN LOGIC (Keep Local) ---
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

  const handleMicTouchStart = (e: any) => { if (!inputValue.trim() && !editMessageId && !pendingImage) { setIsMicPressed(true); vnIsCanceled.current = false; startVN(); } };

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
        <div className="header-left">
          <button className="menu-btn" onClick={() => router.push('/hypetalk')}><span className="material-icons">arrow_back</span></button>
          {targetId && <img src={headerInfo.avatar || '/asets/png/profile.webp'} alt="avatar" className="header-avatar" />}
          <div className="header-info">
            <h3 className="flex items-center gap-1">{headerInfo.title} {targetId && <span dangerouslySetInnerHTML={{ __html: getUserBadge(headerInfo.role) }} />}</h3>
            <span className={typingUser ? "status-typing" : "status-online"}>{displayStatus}</span>
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

      <footer className="chat-input-container">
        {chatState === 'normal' ? (
          <div className="input-row">
            <div className="input-group-wrapper">
               {pendingImagePreview && <div className="preview-box"><img src={pendingImagePreview} alt="p" /><span onClick={() => setPendingImagePreview(null)}>&times;</span></div>}
               <div className="flex w-full items-center">
                 <button onClick={() => { setIsStickerOpen(!isStickerOpen); }} className="p-2"><span className="material-icons">sentiment_satisfied_alt</span></button>
                 <textarea placeholder={t('write_message')} value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="flex-1 bg-transparent border-none outline-none p-2" />
                 <button onClick={() => fileInputRef.current?.click()} className="p-2"><span className="material-icons">image</span></button>
                 <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e:any) => setPendingImagePreview(URL.createObjectURL(e.target.files[0]))} />
               </div>
            </div>
            <button id="action-btn" onMouseDown={handleMicTouchStart} onMouseUp={() => stopVN(false)} onClick={() => (inputValue || pendingImagePreview) && sendMessage()}>
               <span className="material-icons">{ (inputValue || pendingImagePreview) ? 'send' : 'mic' }</span>
            </button>
          </div>
        ) : <div className="p-4 text-center text-sm text-gray-500">Selesaikan permintaan pesan untuk mengobrol.</div>}
      </footer>
    </div>
  );
}
