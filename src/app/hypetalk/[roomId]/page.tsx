'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { showNotif, getUserBadge } from '@/lib/ui-utils';
import * as LiveKit from 'livekit-client';
import './ChatRoom.css';

// --- Interfaces ---
interface Profile {
  username: string;
  avatar_url: string;
  role: string;
  short_id?: string;
}

interface Message {
  id: string | number;
  message: string;
  user_id: string;
  created_at: string;
  room_id: string;
  status: string;
  sticker_url?: string;
  audio_url?: string;
  is_system?: boolean;
  reply_to?: string | number;
  reply_to_msg?: { id: any, username: string, message: string };
  reactions?: Record<string, string>;
  profiles?: Profile; // Sesuai kontrak: Profile atau undefined
}

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;

  // --- States ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [onlineUsers, setOnlineCount] = useState(0);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [stickers, setStickers] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [reactionMenu, setReactionMenu] = useState<{ id: any, x: number, y: number } | null>(null);

  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callData, setCallData] = useState<{ partnerName?: string, partnerAvatar?: string, room?: string, seconds: number }>({ seconds: 0 });

  // --- Refs ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const channels = useRef<{ msg?: any, presence?: any, global?: any }>({});
  const audioRefs = useRef<{ send: HTMLAudioElement, receive: HTMLAudioElement, ring: HTMLAudioElement } | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const lkRoom = useRef<LiveKit.Room | null>(null);
  const callTimerInterval = useRef<any>(null);

  // --- 1. Initial Setup ---
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');
      setCurrentUser(session.user);

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setMyProfile(prof);

      audioRefs.current = {
        send: new Audio("/asets/sound/send.mp3"),
        receive: new Audio("/asets/sound/receive.mp3"),
        ring: new Audio("/asets/sound/call.wav")
      };
      if (audioRefs.current.ring) audioRefs.current.ring.loop = true;
    };
    init();
  }, [router]);

  // --- 2. Real-time Logic ---
  useEffect(() => {
    if (!currentUser || !roomId) return;

    fetchMessages();
    setupRealtime();

    return () => {
      Object.values(channels.current).forEach(ch => ch && supabase.removeChannel(ch));
      if (lkRoom.current) lkRoom.current.disconnect();
    };
  }, [currentUser, roomId]);

  const setupRealtime = () => {
    channels.current.msg = supabase.channel(`msg-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as Message;
          
          if (newMsg.is_system && newMsg.message.includes("📞 Memanggil") && newMsg.user_id !== currentUser.id) {
            handleIncomingCallSignal(newMsg);
          }
          if (newMsg.is_system && (newMsg.message.includes("Panggilan berakhir") || newMsg.message.includes("Ditolak"))) {
            endCall(true);
          }
          
          // --- FIX DISINI: Konversi null ke undefined agar TypeScript senang ---
          const { data: p } = await supabase.from('profiles').select('username, avatar_url, role').eq('id', newMsg.user_id).single();
          newMsg.profiles = p || undefined; 
          
          setMessages(prev => [...prev, newMsg]);
          if (newMsg.user_id !== currentUser.id) {
            audioRefs.current?.receive.play().catch(() => {});
            markAsRead(newMsg.id);
          }
          scrollToBottom();
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      }).subscribe();

    channels.current.presence = supabase.channel(`presence-${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channels.current.presence.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .on('broadcast', { event: 'typing' }, (p) => {
        setTypingUser(p.payload.username);
        setTimeout(() => setTypingUser(null), 3000);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channels.current.presence.track({ user_id: currentUser.id, online: true });
        }
      });
  };

  // --- 3. Core Functions ---
  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*, profiles:user_id(*), reply_to_msg:reply_to(id, username, message)').eq('room_id', roomId).order('created_at', { ascending: true }).limit(50);
    if (data) setMessages(data as Message[]);
    scrollToBottom();
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = async (text?: string, sticker?: string, audio?: string) => {
    if (!currentUser) return;
    const content = text || inputValue;
    if (!content && !sticker && !audio) return;

    audioRefs.current?.send.play().catch(() => {});

    const { error } = await supabase.from('messages').insert([{
      room_id: roomId,
      user_id: currentUser.id,
      message: audio ? "🎤 Voice Note" : (sticker ? "🖼 Stiker" : content),
      sticker_url: sticker || null,
      audio_url: audio || null,
      reply_to: replyTo?.id || null,
      status: 'sent'
    }]);

    if (!error) {
      setInputValue('');
      setReplyTo(null);
      setIsStickerOpen(false);
    }
  };

  // --- 4. Voice Note Logic ---
  const handleStartRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/mpeg' });
        const fd = new FormData();
        fd.append("file", blob);
        fd.append("upload_preset", "hopehype_preset");
        const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: fd });
        const d = await res.json();
        if (d.secure_url) sendMessage(undefined, undefined, d.secure_url);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) { showNotif("Gagal akses mic", "error"); }
  };

  const handleStopRecord = (cancel = false) => {
    if (!isRecording) return;
    setIsRecording(false);
    if (cancel) {
      if (mediaRecorder.current) mediaRecorder.current.onstop = null;
      mediaRecorder.current?.stop();
    } else {
      mediaRecorder.current?.stop();
    }
  };

  // --- 5. Stickers ---
  const fetchStickers = async (q = "") => {
    const key = "vPUlBU5Qfz2ZygoEtKXVUqmIEAEcIB08";
    const url = q ? `https://api.giphy.com/v1/stickers/search?api_key=${key}&q=${q}&limit=15` : `https://api.giphy.com/v1/stickers/trending?api_key=${key}&limit=15`;
    const res = await fetch(url);
    const d = await res.json();
    setStickers(d.data || []);
  };

  // --- 6. Call System ---
  const startCall = async () => {
    const partnerId = roomId.replace('pv_', '').split('_').find(id => id !== currentUser.id);
    const { data: partner } = await supabase.from('profiles').select('username, avatar_url').eq('id', partnerId).single();
    
    setCallStatus('calling');
    setCallData({ partnerName: partner?.username, partnerAvatar: partner?.avatar_url, seconds: 0 });

    await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, message: `📞 Memanggil ${partner?.username}...`, is_system: true }]);
    connectLiveKit(roomId);
  };

  const handleIncomingCallSignal = async (msg: Message) => {
    const { data: partner } = await supabase.from('profiles').select('username, avatar_url').eq('id', msg.user_id).single();
    setCallStatus('incoming');
    setCallData({ partnerName: partner?.username, partnerAvatar: partner?.avatar_url, room: msg.room_id, seconds: 0 });
    audioRefs.current?.ring.play().catch(() => {});
  };

  const connectLiveKit = async (rName: string) => {
    try {
      const res = await fetch(`${supabase.supabaseUrl}/functions/v1/get-livekit-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${supabase.supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: myProfile?.username, identity: currentUser.id, roomName: rName })
      });
      const { token } = await res.json();

      lkRoom.current = new LiveKit.Room();
      await lkRoom.current.connect("wss://voicegrup-zxmeibkn.livekit.cloud", token);
      await lkRoom.current.localParticipant.setMicrophoneEnabled(true);

      lkRoom.current.on(LiveKit.RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "audio") {
          const el = track.attach();
          document.body.appendChild(el);
          setCallStatus('connected');
          startCallTimer();
        }
      });
    } catch (e) { endCall(); }
  };

  const endCall = (silent = false) => {
    audioRefs.current?.ring.pause();
    if (lkRoom.current) lkRoom.current.disconnect();
    setCallStatus('idle');
    if (callTimerInterval.current) clearInterval(callTimerInterval.current);
    if (!silent) showNotif("Panggilan berakhir", "info");
  };

  const startCallTimer = () => {
    callTimerInterval.current = setInterval(() => {
      setCallData(prev => ({ ...prev, seconds: prev.seconds + 1 }));
    }, 1000);
  };

  // --- 7. UI Helpers ---
  const markAsRead = async (id: any) => {
    await supabase.from('messages').update({ status: 'read' }).eq('id', id);
  };

  const handleDoubleTap = (msg: Message, e: any) => {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setReactionMenu({ id: msg.id, x, y });
  };

  const addReaction = async (emoji: string) => {
    if (!reactionMenu) return;
    const msg = messages.find(m => m.id === reactionMenu.id);
    const newReactions = { ...(msg?.reactions || {}), [currentUser.id]: emoji };
    await supabase.from('messages').update({ reactions: newReactions }).eq('id', reactionMenu.id);
    setReactionMenu(null);
  };

  return (
    <div className="telegram-chat">
      {/* --- Call Overlays --- */}
      {callStatus !== 'idle' && (
        <div className="call-overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100000, color: 'white' }}>
          <img src={callData.partnerAvatar || '/asets/png/profile.webp'} className={callStatus === 'calling' ? 'anim-calling-avatar' : ''} alt="avatar" style={{ width: 100, height: 100, borderRadius: '50%' }} />
          <h2>{callData.partnerName}</h2>
          <p>{callStatus === 'connected' ? `${Math.floor(callData.seconds/60)}:${String(callData.seconds%60).padStart(2,'0')}` : callStatus.toUpperCase()}</p>
          <div style={{ display: 'flex', gap: 20, marginTop: 40 }}>
            {callStatus === 'incoming' && <button onClick={() => connectLiveKit(callData.room || roomId)} style={{ background: '#2ecc71', border: 'none', padding: '15px 30px', borderRadius: 30, color: 'white' }}>Jawab</button>}
            <button onClick={() => endCall()} style={{ background: '#ff4757', border: 'none', padding: '15px 30px', borderRadius: 30, color: 'white' }}>Tutup</button>
          </div>
        </div>
      )}

      {/* --- Header --- */}
      <header className="chat-header">
        <div className="header-left">
          <button className="menu-btn" onClick={() => router.back()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="header-info">
            <h3>{callData.partnerName || "HypeTalk Chat"}</h3>
            <div className="status-container">
              {typingUser ? <span className="status-typing">{typingUser} sedang mengetik...</span> : <span>{onlineUsers} Online</span>}
            </div>
          </div>
        </div>
        <div className="header-right">
           <button className="btn-call" onClick={startCall}><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27 11.72 11.72 0 003.7.59 1 1 0 011 1V20a1 1 0 01-1 1A16 16 0 013 5a1 1 0 011-1h3.41a1 1 0 011 1 11.72 11.72 0 00.59 3.7 1 1 0 01-.27 1.11z"/></svg></button>
        </div>
      </header>

      {/* --- Messages --- */}
      <main className="chat-messages">
        <div className="encryption-notice">🔒 Pesan ini dienkripsi end-to-end.</div>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            id={`msg-${msg.id}`}
            className={`chat-message ${msg.user_id === currentUser?.id ? 'self' : 'other'} ${msg.is_system ? 'system' : ''}`}
            onTouchStart={(e) => {
               // Logic double tap mobile sederhana
               const now = Date.now();
               const lastTap = (e.currentTarget as any).lastTap || 0;
               if (now - lastTap < 300) handleDoubleTap(msg, e);
               (e.currentTarget as any).lastTap = now;
            }}
          >
            {!msg.is_system && <img className="avatar" src={msg.profiles?.avatar_url || "/asets/png/profile.webp"} alt="avatar" />}
            <div className="content">
              {msg.is_system ? (
                <div className="system-text">{msg.message}</div>
              ) : (
                <>
                  <div className="username">{msg.profiles?.username} <span dangerouslySetInnerHTML={{__html: getUserBadge(msg.profiles?.role)}}/></div>
                  {msg.reply_to_msg && <div className="reply-preview-in-chat"><b>{msg.reply_to_msg.username}</b>: {msg.reply_to_msg.message}</div>}
                  {msg.sticker_url ? <img src={msg.sticker_url} className="chat-sticker" alt="sticker" /> : 
                   msg.audio_url ? (
                     <div className="vn-custom-player">
                       <button onClick={() => new Audio(msg.audio_url).play()} className="vn-play-btn">▶</button>
                       <div className="vn-waveform"><span></span><span></span><span></span></div>
                     </div>
                   ) : <div className="text">{msg.message}</div>}
                   {msg.reactions && <div className="message-reactions">{Object.values(msg.reactions).slice(0,3).join('')}</div>}
                   <div className="timestamp">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </main>

      {/* --- Input --- */}
      <footer className="chat-input-container">
        {replyTo && (
           <div id="reply-preview-box" style={{ display: 'flex' }}>
             <div className="reply-content-wrapper">
               <div className="reply-title">Membalas {replyTo.profiles?.username}</div>
               <div className="reply-text-preview">{replyTo.message}</div>
             </div>
             <div className="close-reply-btn" onClick={() => setReplyTo(null)}>&times;</div>
           </div>
        )}

        {isStickerOpen && (
          <div id="sticker-menu" style={{ display: 'flex' }}>
            <input placeholder="Cari Giphy..." onChange={(e) => fetchStickers(e.target.value)} />
            <div id="sticker-list">
              {stickers.map((s, idx) => <img key={idx} src={s.images.fixed_width_small.url} alt="sticker" onClick={() => sendMessage(undefined, s.images.fixed_width.url)} />)}
            </div>
          </div>
        )}

        {isRecording && (
          <div id="vn-overlay" style={{ display: 'flex' }}>
             <span className="online-dot"></span> <span>Recording...</span>
          </div>
        )}

        <div className="input-row">
          <div className="input-group-wrapper">
            <button id="sticker-btn" onClick={() => { setIsStickerOpen(!isStickerOpen); if(!isStickerOpen) fetchStickers(); }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5s.67 1.5 1.5 1.5zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
            </button>
            <textarea 
              id="chat-input" 
              placeholder="Tulis pesan..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => markAsRead('all')}
            />
          </div>
          <button 
            id="action-btn" 
            className={inputValue.trim() ? 'mode-typing' : ''}
            onMouseDown={handleStartRecord}
            onMouseUp={() => handleStopRecord()}
            onTouchStart={handleStartRecord}
            onTouchEnd={() => handleStopRecord()}
            onClick={() => inputValue.trim() && sendMessage()}
          >
            <div className="icon-stack">
              <svg className="svg-send" viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              <svg className="svg-mic" viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/></svg>
            </div>
          </button>
        </div>
      </footer>

      {/* --- Reaction Menu --- */}
      {reactionMenu && (
        <div className="reaction-menu" style={{ display: 'flex', position: 'fixed', left: reactionMenu.x, top: reactionMenu.y }}>
          {['❤️', '😂', '😮', '🔥', '👍'].map(emoji => (
            <span key={emoji} className="reaction-emoji" onClick={() => addReaction(emoji)}>{emoji}</span>
          ))}
        </div>
      )}
    </div>
  );
}
