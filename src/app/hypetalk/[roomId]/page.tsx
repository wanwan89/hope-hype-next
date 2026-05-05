'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import * as LiveKit from 'livekit-client';
import './ChatRoom.css';

// --- SUB-COMPONENT: MESSAGE BUBBLE (Untuk Swipe & Double Tap) ---
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

    // Double Tap Logic
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

  // VN Player Internal State
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
          <div className="content">
            <div className="username">
              {msg.profiles?.username} 
              <span dangerouslySetInnerHTML={{__html: getUserBadge(msg.profiles?.role || 'user')}}/>
            </div>
            
            {msg.reply_to_msg && (
              <div className="reply-preview-in-chat" onClick={() => document.getElementById(`msg-${msg.reply_to_msg.id}`)?.scrollIntoView({behavior: 'smooth'})}>
                <b>{msg.reply_to_msg.username}</b>: {msg.reply_to_msg.message || "Stiker/Audio"}
              </div>
            )}

            {msg.sticker_url ? (
              <img src={msg.sticker_url} className="chat-sticker" alt="sticker" />
            ) : msg.audio_url ? (
              <div className={`vn-custom-player ${isPlaying ? 'playing' : ''}`}>
                <button onClick={toggleVN} className="vn-play-btn">
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <div className="vn-waveform">
                  {[...Array(10)].map((_, i) => <span key={i} className="bar"></span>)}
                </div>
                <span className="vn-time">Voice Note</span>
              </div>
            ) : (
              <div className={`text ${msg.message === "Pesan ini telah dihapus" ? "deleted" : ""}`}>
                {msg.message}
              </div>
            )}

            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
              <div className="message-reactions">
                {[...new Set(Object.values(msg.reactions as Record<string, string>))].slice(0,3).join('')}
              </div>
            )}
            
            <div className="message-info">
              <span className="timestamp">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
              {isMe && <span className="status-icon read">✓✓</span>}
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
  const [inputValue, setInputValue] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const [replyTo, setReplyTo] = useState<any>(null);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [stickers, setStickers] = useState<any[]>([]);
  const [reactionMenu, setReactionMenu] = useState<{ id: any, x: number, y: number } | null>(null);
  const [deleteMenu, setDeleteMenu] = useState<any>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
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

    // Routing Logic
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
    const { data } = await supabase.from('messages').select('*, profiles:user_id(*), reply_to_msg:reply_to(id, username, message)').eq('room_id', room).order('created_at', { ascending: true }).limit(50);
    if (data) setMessages(data);
    scrollToBottom();
  };

  const setupRealtime = (room: string, user: any, prof: any) => {
    refs.msgChannel.current = supabase.channel(`msg-${room}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as any;
          if (newMsg.is_system && newMsg.message.includes("📞 Memanggil") && newMsg.user_id !== user.id) handleIncomingCall(newMsg);
          if (newMsg.is_system && (newMsg.message.includes("Panggilan berakhir") || newMsg.message.includes("Ditolak"))) endCall(true);
          
          const { data: p } = await supabase.from('profiles').select('username, avatar_url, role').eq('id', newMsg.user_id).single();
          newMsg.profiles = p || undefined;
          
          setMessages(prev => [...prev, newMsg]);
          if (newMsg.user_id !== user.id) refs.audio.current?.receive.play().catch(()=>{});
          scrollToBottom();
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      }).subscribe();

    refs.presenceChannel.current = supabase.channel(`presence-${room}`)
      .on('presence', { event: 'sync' }, () => setOnlineCount(Object.keys(refs.presenceChannel.current.presenceState()).length))
      .on('broadcast', { event: 'typing' }, (p: any) => { setTypingUser(p.payload.username); setTimeout(() => setTypingUser(null), 3000); })
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
      refs.presenceChannel.current.send({ type: 'broadcast', event: 'typing', payload: { username: myProfile?.username } });
    }
  };

  // --- Voice Note Logic ---
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
      setIsRecording(true); setRecordTime(0);
      refs.recordTimer.current = setInterval(() => setRecordTime(p => p + 1), 1000);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) { showNotif("Gagal akses Mic", "error"); }
  };

  const stopVN = (cancel = false) => {
    if (!isRecording) return;
    setIsRecording(false); clearInterval(refs.recordTimer.current);
    if (cancel) { refs.mediaRecorder.current!.onstop = null; showNotif("VN Dibatalkan", "info"); }
    refs.mediaRecorder.current?.stop();
    refs.audioChunks.current = [];
  };

  // --- Call Logic ---
  const startCall = async () => {
    if (!targetId) return;
    setCallStatus('calling'); setCallData({ partnerName: headerInfo.title, seconds: 0 });
    await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, message: `📞 Memanggil ${headerInfo.title}...`, is_system: true }]);
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
      if (error || !data) throw new Error("Gagal ambil token");
      refs.lkRoom.current = new LiveKit.Room();
      await refs.lkRoom.current.connect("wss://voicegrup-zxmeibkn.livekit.cloud", data.token);
      await refs.lkRoom.current.localParticipant.setMicrophoneEnabled(true);
      refs.lkRoom.current.on(LiveKit.RoomEvent.TrackSubscribed, (t) => {
        if (t.kind === "audio") { document.body.appendChild(t.attach()); setCallStatus('connected'); refs.callTimer.current = setInterval(() => setCallData((p:any) => ({...p, seconds: p.seconds+1})), 1000); }
      });
    } catch (e) { endCall(); }
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
      {/* Call Overlay */}
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

      {/* Header */}
      <header className="chat-header">
        <div className="header-left">
          <button className="menu-btn" onClick={() => router.push('/hypetalk')}><span className="material-icons">arrow_back</span></button>
          <div className="header-info">
            <h3>{headerInfo.title}</h3>
            <div className="status-container">{typingUser ? <span className="status-typing">{typingUser} mengetik...</span> : <span className="status-online">{onlineCount} Online</span>}</div>
          </div>
        </div>
        {targetId && <div className="header-right"><button className="btn-call" onClick={startCall}><span className="material-icons">call</span></button></div>}
      </header>

      {/* Messages */}
      <main className="chat-messages">
        <div className="encryption-notice">🔒 Pesan ini dienkripsi end-to-end.</div>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isMe={msg.user_id === currentUser?.id} 
            onReply={setReplyTo} 
            onReaction={(m:any, touch:any) => setReactionMenu({ id: m.id, x: touch.clientX, y: touch.clientY })}
            onDelete={(id:any) => setDeleteMenu(id)}
          />
        ))}
        <div ref={refs.scroll} />
      </main>

      {/* Input Container */}
      <footer className="chat-input-container">
        {replyTo && (
           <div id="reply-preview-box" style={{ display: 'flex' }}>
             <div className="reply-content-wrapper"><div className="reply-title">Membalas {replyTo.profiles?.username}</div><div className="reply-text-preview">{replyTo.message || "Media"}</div></div>
             <div className="close-reply-btn" onClick={() => setReplyTo(null)}>&times;</div>
           </div>
        )}

        {isStickerOpen && (
          <div id="sticker-menu" style={{ display: 'flex' }}>
            <div className="sticker-search-wrapper"><input placeholder="Cari stiker..." onChange={(e) => fetchStickers(e.target.value)} /></div>
            <div id="sticker-list">{stickers.map((s, idx) => <img key={idx} src={s.images.fixed_width_small.url} alt="sticker" onClick={() => sendMessage(undefined, s.images.fixed_width.url)} />)}</div>
          </div>
        )}

        {isRecording && <div id="vn-overlay" style={{ display: 'flex' }}><span className="online-dot"></span> <span>Merekam... {Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,'0')}</span></div>}

        <div className="input-row">
          <div className="input-group-wrapper" style={{ visibility: isRecording ? 'hidden' : 'visible' }}>
            <button id="sticker-btn" onClick={() => { setIsStickerOpen(!isStickerOpen); if(!isStickerOpen) fetchStickers(); }}><span className="material-icons">emoji_emotions</span></button>
            <textarea id="chat-input" placeholder="Tulis pesan..." value={inputValue} onChange={handleTyping} />
          </div>
          <button id="action-btn" className={inputValue.trim() ? 'mode-typing' : (isRecording ? 'is-recording' : '')}
            onMouseDown={() => !inputValue.trim() && startVN()} onMouseUp={() => !inputValue.trim() && stopVN()}
            onTouchStart={() => !inputValue.trim() && startVN()} onTouchEnd={() => !inputValue.trim() && stopVN()}
            onClick={() => inputValue.trim() && sendMessage()}
          >
            <span className="material-icons">{inputValue.trim() ? 'send' : 'mic'}</span>
          </button>
        </div>
      </footer>

      {/* Reaction Menu */}
      {reactionMenu && (
        <>
          <div style={{position:'fixed', inset:0, zIndex:10005}} onClick={()=>setReactionMenu(null)}></div>
          <div className="reaction-menu" style={{ display: 'flex', position: 'fixed', left: Math.min(reactionMenu.x, window.innerWidth - 200), top: Math.min(reactionMenu.y - 60, window.innerHeight - 100) }}>
            {['❤️', '😂', '😮', '🔥', '👍'].map(emoji => (
              <span key={emoji} className="reaction-emoji" onClick={async () => {
                const msg = messages.find(m => m.id === reactionMenu.id);
                const newReactions = { ...(msg?.reactions || {}), [currentUser.id]: emoji };
await supabase.from('messages').update({ reactions: newReactions }).eq('id', reactionMenu.id);

                setReactionMenu(null);
              }}>{emoji}</span>
            ))}
          </div>
        </>
      )}

      {/* Delete Menu */}
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

// Wrapper for useSearchParams
export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<div className="loading-state">Loading Chat...</div>}>
      <ChatCore />
    </Suspense>
  );
}
