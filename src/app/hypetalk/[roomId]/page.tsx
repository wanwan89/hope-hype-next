'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import * as LiveKit from 'livekit-client';
import './ChatRoom.css';

// --- HELPER: ICON STATUS WHATSAPP ---
const getStatusIcon = (status: string) => {
  if (status === 'sending') return <span className="status-icon sending" style={{fontSize: '10px', opacity: 0.6}}>🕒</span>;
  if (status === 'sent') return <span className="status-icon sent" style={{color: '#8e8e93'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === 'delivered') return <span className="status-icon delivered" style={{color: '#8e8e93'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  if (status === 'read') return <span className="status-icon read" style={{color: '#4fc3f7'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M1.8 8.5L5 11.5L11.8 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.8 8.5L9 11.5L15 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
  return <span className="status-icon sent" style={{color: '#8e8e93'}}><svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>; 
};

// --- SUB-COMPONENT: MESSAGE BUBBLE ---
const MessageBubble = ({ msg, isMe, onReply, onReaction, onDelete }: any) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);
  const holdTimer = useRef<any>(null);
  const lastTap = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = touchStartX.current;
    isSwiping.current = true;
    if (bubbleRef.current) bubbleRef.current.style.transition = 'none';

    if (isMe && msg.message !== "Pesan ini telah dihapus") {
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
    if (now - lastTap.current < 300 && Math.abs(diff) < 10 && msg.message !== "Pesan ini telah dihapus") {
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

  return (
    <div 
      ref={bubbleRef}
      id={`msg-${msg.id}`}
      className={`chat-message ${isMe ? 'self' : 'other'} ${msg.is_system ? 'system' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {msg.is_system ? (
        <div className="system-text">{msg.message}</div>
      ) : (
        <>
          {!isMe && <img className="avatar" src={msg.profiles?.avatar_url || "/asets/png/profile.webp"} alt="avatar" />}
          <div className="content" style={{ display: 'flex', flexDirection: 'column', minWidth: '90px' }}>
            <div className="username" style={{ marginBottom: '4px' }}>
              {msg.profiles?.username} 
              <span dangerouslySetInnerHTML={{__html: getUserBadge(msg.profiles?.role || 'user')}}/>
            </div>
            
            {msg.reply_to_msg && (
              <div className="reply-preview-in-chat" onClick={() => document.getElementById(`msg-${msg.reply_to_msg.id}`)?.scrollIntoView({behavior: 'smooth'})} style={{ marginBottom: '6px', opacity: 0.9 }}>
                <b>{msg.reply_to_msg.username}</b>: {msg.reply_to_msg.message || "Media"}
              </div>
            )}

            {msg.sticker_url ? (
              <img src={msg.sticker_url} className="chat-sticker" alt="sticker" style={{ borderRadius: '8px' }} />
            ) : msg.audio_url ? (
              <div className={`vn-custom-player ${isPlaying ? 'playing' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isMe ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.04)', padding: '6px 12px', borderRadius: '20px', minWidth: '150px' }}>
                <button onClick={toggleVN} className="vn-play-btn" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-blue)', border: 'none', cursor: 'pointer', flexShrink: 0}}>
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="white" style={{marginLeft: '2px'}}><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
                <div className="vn-waveform" style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1, height: '18px' }}>
                  {[...Array(12)].map((_, i) => <span key={i} className="bar" style={{ width: '3px', height: isPlaying ? (i % 2 === 0 ? '16px' : '8px') : '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px', transition: 'height 0.2s ease' }}></span>)}
                </div>
                <span className="vn-time" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>VN</span>
              </div>
            ) : (
              <div className={`text ${msg.message === "Pesan ini telah dihapus" ? "deleted" : ""}`}>
                {msg.message}
              </div>
            )}

            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
              <div className="message-reactions" style={{ marginTop: '4px' }}>
                {[...new Set(Object.values(msg.reactions as Record<string, string>))].slice(0,3).join('')}
              </div>
            )}
            
            <div className="message-info" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px', alignSelf: 'flex-end' }}>
              <span className="timestamp" style={{ fontSize: '10px', opacity: 0.6 }}>{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
              {isMe && getStatusIcon(msg.status || 'sent')}
            </div>
          </div>
        </>
      )}
    </div>
  );
};


// --- KOMPONEN UTAMA (CHAT PAGE) ---
function ChatCore() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams?.get('from');
  const groupId = searchParams?.get('group');
  const groupName = searchParams?.get('gname');

  const [roomId, setRoomId] = useState('room-1');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [headerInfo, setHeaderInfo] = useState({ title: 'HopeTalk Globe', sub: '' });
  const [targetId, setTargetId] = useState<string | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  
  // FIX: Ganti statenya biar bisa nyimpen avatar dan username barengan
  const [typingUser, setTypingUser] = useState<{ username: string, avatar_url: string } | null>(null);

  const [replyTo, setReplyTo] = useState<any>(null);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [stickers, setStickers] = useState<any[]>([]);
  const [reactionMenu, setReactionMenu] = useState<{ id: any, x: number, y: number } | null>(null);
  const [deleteMenu, setDeleteMenu] = useState<any>(null);

  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [recordTime, setRecordTime] = useState(0);
  const vnTouchStartX = useRef(0);
  const vnIsCanceled = useRef(false);

  const [callStatus, setCallStatus] = useState<'idle'|'calling'|'incoming'|'connected'>('idle');
  const [callData, setCallData] = useState<any>({ seconds: 0 });

  const refs = {
    scroll: useRef<HTMLDivElement>(null),
    msgChannel: useRef<any>(null),
    presenceChannel: useRef<any>(null),
    globalChannel: useRef<any>(null),
    audio: useRef<{ send: HTMLAudioElement, receive: HTMLAudioElement, ring: HTMLAudioElement } | null>(null),
    mediaRecorder: useRef<MediaRecorder | null>(null),
    audioChunks: useRef<Blob[]>([]),
    lkRoom: useRef<LiveKit.Room | null>(null),
    callTimer: useRef<any>(null),
    recordTimer: useRef<any>(null),
    typingTimer: useRef<any>(null)
  };

  useEffect(() => {
    initApp();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromId, groupId]);

  const initApp = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    setCurrentUser(session.user);

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    setMyProfile(prof);

    refs.audio.current = {
      send: new Audio("/asets/sound/send.mp3"),
      receive: new Audio("/asets/sound/receive.mp3"),
      ring: new Audio("/asets/sound/call.wav")
    };
    if (refs.audio.current.ring) refs.audio.current.ring.loop = true;

    let currentRoom = 'room-1';
    if (groupId) {
      currentRoom = `group_${groupId}`;
      setHeaderInfo({ title: groupName || "Grup", sub: "Grup" });
    } else if (fromId) {
      const ids = [session.user.id, fromId].sort();
      currentRoom = `pv_${ids[0]}_${ids[1]}`;
      setTargetId(fromId);
      const { data: pTarget } = await supabase.from('profiles').select('username, short_id').eq('id', fromId).single();
      if (pTarget) setHeaderInfo({ title: pTarget.username, sub: `#${pTarget.short_id}` });
    }
    setRoomId(currentRoom);

    await fetchMessages(currentRoom);
    setupRealtime(currentRoom, session.user, prof);
  };

  const cleanup = () => {
    if (refs.msgChannel.current) supabase.removeChannel(refs.msgChannel.current);
    if (refs.presenceChannel.current) supabase.removeChannel(refs.presenceChannel.current);
    if (refs.globalChannel.current) supabase.removeChannel(refs.globalChannel.current);
    if (refs.lkRoom.current) refs.lkRoom.current.disconnect();
    clearInterval(refs.callTimer.current);
    clearInterval(refs.recordTimer.current);
  };

  const fetchMessages = async (room: string) => {
    setIsLoading(true);
    const { data } = await supabase.from('messages').select('*, profiles:user_id(*), reply_to_msg:reply_to(id, username, message)').eq('room_id', room).order('created_at', { ascending: true }).limit(50);
    if (data) setMessages(data);
    setIsLoading(false);
    scrollToBottom();
  };

  const setupRealtime = (room: string, user: any, prof: any) => {
    refs.msgChannel.current = supabase.channel(`msg-${room}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as any;
          if (newMsg.is_system && newMsg.message.includes("📞 Memanggil") && newMsg.user_id !== user.id) handleIncomingCall(newMsg);
          if (newMsg.is_system && (newMsg.message.includes("Panggilan berakhir") || newMsg.message.includes("Ditolak") || newMsg.message.includes("tak terjawab"))) endCall(true);
          
          const { data: p } = await supabase.from('profiles').select('username, avatar_url, role').eq('id', newMsg.user_id).single();
          newMsg.profiles = p || undefined;
          
          setMessages(prev => [...prev, newMsg]);
          if (newMsg.user_id !== user.id) {
            refs.audio.current?.receive.play().catch(()=>{});
            if (newMsg.status !== 'read') {
              await supabase.from('messages').update({ status: 'read' }).eq('id', newMsg.id);
            }
          }
          scrollToBottom();
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      }).subscribe();

    refs.presenceChannel.current = supabase.channel(`presence-${room}`)
      .on('presence', { event: 'sync' }, () => setOnlineCount(Object.keys(refs.presenceChannel.current.presenceState()).length))
      .on('broadcast', { event: 'typing' }, (p: any) => { 
        // FIX: Nangkap username dan avatar
        setTypingUser({ username: p.payload.username, avatar_url: p.payload.avatar_url }); 
        setTimeout(() => setTypingUser(null), 3000); 
      })
      .subscribe(async (s) => { if (s === 'SUBSCRIBED') await refs.presenceChannel.current.track({ user_id: user.id, online: true }); });
  };

  const scrollToBottom = () => setTimeout(() => refs.scroll.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const sendMessage = async (text?: string, sticker?: string, audio?: string) => {
    const content = text || inputValue;
    if (!content && !sticker && !audio) return;

    refs.audio.current?.send.play().catch(()=>{});
    const { error } = await supabase.from('messages').insert([{
      room_id: roomId, user_id: currentUser.id, message: audio ? "🎤 Voice Note" : (sticker ? "🖼 Stiker" : content),
      sticker_url: sticker || null, audio_url: audio || null, reply_to: replyTo?.id || null, status: 'sent'
    }]);

    if (!error) { setInputValue(''); setReplyTo(null); setIsStickerOpen(false); }
    if (targetId && !sticker && !audio) {
      supabase.functions.invoke('send-chat-notif', { body: { record: { sender_id: currentUser.id, receiver_id: targetId, content } } });
    }
  };

  const handleTyping = (e: any) => {
    setInputValue(e.target.value);
    if (refs.presenceChannel.current && refs.presenceChannel.current.state === 'joined') {
      // FIX: Kirim juga avatar kita ke broadcast
      refs.presenceChannel.current.send({ type: 'broadcast', event: 'typing', payload: { username: myProfile?.username, avatar_url: myProfile?.avatar_url } });
    }
  };

  const startVN = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      refs.mediaRecorder.current = new MediaRecorder(stream);
      refs.audioChunks.current = [];
      
      refs.mediaRecorder.current.ondataavailable = (e) => refs.audioChunks.current.push(e.data);
      refs.mediaRecorder.current.onstop = async () => {
        if (refs.audioChunks.current.length === 0) return;
        const blob = new Blob(refs.audioChunks.current, { type: 'audio/mpeg' });
        const fd = new FormData(); fd.append("file", blob); fd.append("upload_preset", "hopehype_preset"); fd.append("resource_type", "video");
        const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: fd });
        const d = await res.json();
        if (d.secure_url) sendMessage(undefined, undefined, d.secure_url);
      };

      refs.mediaRecorder.current.start();
      setIsRecording(true); 
      isRecordingRef.current = true;
      setRecordTime(0);
      refs.recordTimer.current = setInterval(() => setRecordTime(p => p + 1), 1000);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) { showNotif("Gagal akses Mic", "error"); }
  };

  const stopVN = (cancel = false) => {
    if (!isRecordingRef.current) return;
    setIsRecording(false); 
    isRecordingRef.current = false;
    clearInterval(refs.recordTimer.current);
    if (cancel) { refs.mediaRecorder.current!.onstop = null; showNotif("VN Dibatalkan", "info"); }
    refs.mediaRecorder.current?.stop();
    refs.audioChunks.current = [];
  };

  const handleMicTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!inputValue.trim()) {
      vnTouchStartX.current = ('touches' in e) ? e.touches[0].clientX : e.clientX;
      vnIsCanceled.current = false;
      startVN();
    }
  };

  const handleMicTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (isRecordingRef.current && !vnIsCanceled.current) {
      const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
      const diff = vnTouchStartX.current - clientX;
      if (diff > 80) {
        vnIsCanceled.current = true;
        stopVN(true); 
      }
    }
  };

  const handleMicTouchEnd = () => {
    if (isRecordingRef.current && !vnIsCanceled.current) {
      stopVN(false); 
    }
  };

  const startCall = async () => {
    if (!targetId) return;

    const { data: pTarget } = await supabase.from('profiles').select('avatar_url').eq('id', targetId).single();

    setCallStatus('calling'); 
    setCallData({ partnerName: headerInfo.title, partnerAvatar: pTarget?.avatar_url, seconds: 0 });
    
    await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, message: `📞 Memanggil ${headerInfo.title}...`, is_system: true }]);
    
    // Nunggu 30 Detik
    refs.callTimer.current = setTimeout(async () => {
      endCall(true);
      await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, message: `☎️ Panggilan tak terjawab`, is_system: true }]);
    }, 30000);

    connectLiveKit(roomId);
  };

  const handleIncomingCall = async (msg: any) => {
    const { data: p } = await supabase.from('profiles').select('username, avatar_url').eq('id', msg.user_id).single();
    setCallStatus('incoming'); setCallData({ partnerName: p?.username, partnerAvatar: p?.avatar_url, room: msg.room_id, seconds: 0 });
    refs.audio.current?.ring.play().catch(()=>{});
  };

  const connectLiveKit = async (rName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-livekit-token', { body: { username: myProfile?.username, identity: currentUser.id, roomName: rName } });
      if (error || !data) throw new Error("Gagal ambil token: " + error?.message);
      
      refs.lkRoom.current = new LiveKit.Room();
      await refs.lkRoom.current.connect("wss://voicegrup-zxmeibkn.livekit.cloud", data.token);
      await refs.lkRoom.current.localParticipant.setMicrophoneEnabled(true);

      // Kalo diangkat lawan / lawan udah di room duluan
      if (refs.lkRoom.current.remoteParticipants.size > 0) {
         setCallStatus('connected');
         clearTimeout(refs.callTimer.current);
         refs.callTimer.current = setInterval(() => setCallData((p:any) => ({...p, seconds: p.seconds+1})), 1000);
      }

      refs.lkRoom.current.on(LiveKit.RoomEvent.ParticipantConnected, () => {
        setCallStatus('connected');
        clearTimeout(refs.callTimer.current);
        refs.callTimer.current = setInterval(() => setCallData((p:any) => ({...p, seconds: p.seconds+1})), 1000);
      });

      refs.lkRoom.current.on(LiveKit.RoomEvent.TrackSubscribed, (t) => {
        if (t.kind === "audio") { document.body.appendChild(t.attach()); }
      });

    } catch (e: any) { 
      console.error(e);
      showNotif("Koneksi Panggilan Gagal", "error");
      endCall(); 
    }
  };

  const endCall = (silent = false) => {
    refs.audio.current?.ring.pause();
    refs.lkRoom.current?.disconnect();
    setCallStatus('idle'); clearInterval(refs.callTimer.current);
    if (!silent) showNotif("Panggilan berakhir", "info");
  };

  const fetchStickers = async (q="") => {
    const res = await fetch(`https://api.giphy.com/v1/stickers/${q ? 'search' : 'trending'}?api_key=vPUlBU5Qfz2ZygoEtKXVUqmIEAEcIB08&limit=20&rating=g${q ? `&q=${q}` : ''}`);
    const d = await res.json(); setStickers(d.data || []);
  };

  return (
    <div className="telegram-chat">
      {callStatus !== 'idle' && (
        <div className="call-overlay">
          <img src={callData.partnerAvatar || '/asets/png/profile.webp'} className={callStatus === 'calling' ? 'anim-calling-avatar' : ''} alt="avatar" />
          <h2>{callData.partnerName}</h2>
          <p>{callStatus === 'connected' ? `${Math.floor(callData.seconds/60)}:${String(callData.seconds%60).padStart(2,'0')}` : callStatus.toUpperCase()}</p>
          <div style={{ display: 'flex', gap: 20, marginTop: 40 }}>
            {callStatus === 'incoming' && <button onClick={() => { refs.audio.current?.ring.pause(); connectLiveKit(callData.room); }} className="btn-answer" style={{background:'#2ecc71', padding:'12px 30px', borderRadius:20, border:'none', color:'white'}}>Jawab</button>}
            <button onClick={() => endCall()} className="btn-decline" style={{background:'#ff4757', padding:'12px 30px', borderRadius:20, border:'none', color:'white'}}>Tutup</button>
          </div>
        </div>
      )}

      <header className="chat-header">
        <div className="header-left">
          <button className="menu-btn" onClick={() => router.push('/hypetalk')}><span className="material-icons">arrow_back</span></button>
          <div className="header-info">
            <h3>{headerInfo.title}</h3>
            <div className="status-container">{typingUser ? <span className="status-typing">{typingUser.username} mengetik...</span> : <span className="status-online">{onlineCount} Online</span>}</div>
          </div>
        </div>
        {targetId && <div className="header-right"><button className="btn-call" onClick={startCall}><span className="material-icons">call</span></button></div>}
      </header>

      <main className="chat-messages">
        {isLoading ? (
          <div className="chat-loading-screen">
            <div className="skeleton-msg left"><div className="skeleton-avatar"></div><div className="skeleton-bubble"><div className="skeleton-line w1"></div><div className="skeleton-line w2"></div><div className="skeleton-line w3"></div></div></div>
            <div className="skeleton-msg right"><div className="skeleton-bubble me"><div className="skeleton-line w4"></div><div className="skeleton-line w5"></div></div></div>
            <div className="skeleton-msg left"><div className="skeleton-avatar"></div><div className="skeleton-bubble typing-bubble"><span></span><span></span><span></span></div></div>
            <div className="loading-chat-hint">Menyambungkan obrolan...</div>
          </div>
        ) : (
          <>
            <div className="encryption-notice">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>
              <span>Pesan dan panggilan dienkripsi secara <strong>end-to-end</strong>. Tidak ada orang di luar chat ini yang dapat membaca atau mendengarkannya.</span>
            </div>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} isMe={msg.user_id === currentUser?.id} 
                onReply={setReplyTo} 
                onReaction={(m:any, touch:any) => setReactionMenu({ id: m.id, x: touch.clientX, y: touch.clientY })}
                onDelete={(id:any) => setDeleteMenu(id)}
              />
            ))}
          </>
        )}

        {/* FIX: TYPING BUBBLE DENGAN FOTO PROFIL */}
        {typingUser && (
          <div className="chat-message other" style={{ alignItems: 'flex-end', marginBottom: '8px' }}>
            <img className="avatar" src={typingUser.avatar_url || "/asets/png/profile.webp"} alt="avatar" />
            <div className="content" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="username" style={{ marginBottom: '4px' }}>{typingUser.username}</div>
              <div style={{ background: 'var(--bg-panel)', padding: '8px 14px', borderRadius: '16px 16px 16px 6px', display: 'inline-block', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div className="typing-bubble" style={{ padding: 0 }}><span></span><span></span><span></span></div>
              </div>
            </div>
          </div>
        )}

        <div ref={refs.scroll} />
      </main>

      <footer className="chat-input-container">
        {isStickerOpen && (
          <div id="sticker-menu" style={{ display: 'flex' }}>
            <div className="sticker-search-wrapper"><input placeholder="Cari stiker..." onChange={(e) => fetchStickers(e.target.value)} /></div>
            <div id="sticker-list">{stickers.map((s, idx) => <img key={idx} src={s.images.fixed_width_small.url} alt="sticker" onClick={() => sendMessage(undefined, s.images.fixed_width.url)} />)}</div>
          </div>
        )}

        <div className="input-row">
          <div className="input-group-wrapper" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '4px 6px', borderRadius: replyTo ? '16px' : '24px' }}>
            
            {replyTo && (
              <div id="reply-preview-box" style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'rgba(0,0,0,0.04)', borderRadius: '12px 12px 4px 4px', margin: '0 0 6px 0', borderLeft: '4px solid var(--primary-blue)', padding: '8px 12px' }}>
                <div className="reply-content-wrapper" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div className="reply-title" style={{color: 'var(--primary-blue)', fontSize: '12px', fontWeight: 'bold'}}>Membalas {replyTo.profiles?.username}</div>
                  <div className="reply-text-preview" style={{fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{replyTo.message || "Media"}</div>
                </div>
                <div className="close-reply-btn" onClick={() => setReplyTo(null)} style={{fontSize: '24px', paddingLeft: '12px', cursor: 'pointer', color: '#94a3b8', lineHeight: 1}}>&times;</div>
              </div>
            )}

            <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
              {isRecording ? (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px', color: '#ff4757', fontWeight: 600, animation: 'fadeIn 0.2s ease', padding: '8px 6px' }}>
                  <span className="online-dot" style={{ background: '#ff4757', boxShadow: '0 0 5px #ff4757' }}></span>
                  <span>{Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,'0')}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-icons" style={{fontSize: '16px'}}>chevron_left</span> Geser batal
                  </span>
                </div>
              ) : (
                <>
                  <button id="sticker-btn" style={{ border: 'none', background: 'transparent', outline: 'none', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }} onClick={() => { setIsStickerOpen(!isStickerOpen); if(!isStickerOpen) fetchStickers(); }}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 1.5 8.5 1.5zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                    </svg>
                  </button>
                  <textarea id="chat-input" placeholder="Tulis pesan..." value={inputValue} onChange={handleTyping} style={{ paddingTop: '10px', paddingBottom: '10px', minHeight: '40px', maxHeight: '80px', flex: 1, resize: 'none', border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', lineHeight: '20px' }} />
                </>
              )}
            </div>
          </div>
          
          <button id="action-btn" className={inputValue.trim() ? 'mode-typing' : (isRecording ? 'is-recording' : '')}
            onMouseDown={handleMicTouchStart} onMouseMove={handleMicTouchMove} onMouseUp={handleMicTouchEnd}
            onTouchStart={handleMicTouchStart} onTouchMove={handleMicTouchMove} onTouchEnd={handleMicTouchEnd}
            onClick={() => inputValue.trim() && sendMessage()}
          >
            <span className="material-icons">{inputValue.trim() ? 'send' : 'mic'}</span>
          </button>
        </div>
      </footer>

      {reactionMenu && (
        <>
          <div style={{position:'fixed', inset:0, zIndex:10005}} onClick={()=>setReactionMenu(null)}></div>
          <div className="reaction-menu" style={{ display: 'flex', position: 'fixed', left: Math.min(reactionMenu.x, window.innerWidth - 200), top: Math.min(reactionMenu.y - 60, window.innerHeight - 100) }}>
            {['❤️', '😂', '😮', '🔥', '👍'].map(emoji => (
              <span key={emoji} className="reaction-emoji" onClick={async () => {
                if (!currentUser) return;
                const msg = messages.find(m => m.id === reactionMenu.id);
                if (!msg) return;

                let newReactions = { ...(msg.reactions || {}) };
                if (newReactions[currentUser.id] === emoji) {
                  delete newReactions[currentUser.id];
                } else {
                  newReactions[currentUser.id] = emoji;
                }

                await supabase.from('messages').update({ reactions: newReactions }).eq('id', reactionMenu.id);
                setReactionMenu(null);
              }}>{emoji}</span>
            ))}
          </div>
        </>
      )}

      {deleteMenu && (
        <div className="delete-overlay" style={{display:'flex'}}>
          <div className="delete-menu">
            <p>Hapus pesan ini?</p>
            <div className="delete-menu-btns">
              <button className="btn-cancel" onClick={()=>setDeleteMenu(null)}>Batal</button>
              <button id="confirm-delete" onClick={async () => {
                await supabase.from('messages').update({ message: 'Pesan ini telah dihapus', sticker_url: null, audio_url: null }).eq('id', deleteMenu);
                setDeleteMenu(null);
              }}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<div className="loading-state">Loading Chat...</div>}>
      <ChatCore />
    </Suspense>
  );
}
