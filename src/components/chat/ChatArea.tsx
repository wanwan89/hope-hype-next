'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif, getUserBadge } from '@/lib/ui-utils'; 
import * as LiveKit from 'livekit-client';
import { useTranslation } from 'react-i18next';
import MessageBubble from './MessageBubble';
import './ChatArea.css';

export default function ChatArea() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation(); 
  
  const fromId = searchParams?.get('from');
  const groupId = searchParams?.get('group');
  const groupName = searchParams?.get('gname');

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
  const [reactionMenu, setReactionMenu] = useState<{ id: any, x: number, y: number } | null>(null);
  const [deleteMenu, setDeleteMenu] = useState<any>(null);
  
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [groupModalTab, setGroupModalTab] = useState<'invite' | 'settings'>('invite');
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [inviteSearch, setInviteSearch] = useState(''); 

  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0); 
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
    typingTimer: useRef<any>(null),
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
      receive: new Audio("/asets/sound/receive.mp3"),
      ring: new Audio("/asets/sound/call.wav")
    };
    if (refs.audio.current.ring) refs.audio.current.ring.loop = true;

    let currentRoom = 'room-1';
    if (groupId) {
      currentRoom = `group_${groupId}`;
      const { data: gData } = await supabase.from('groups').select('*').eq('id', groupId).single();
      if (gData) {
        setHeaderInfo({ title: gData.name, sub: "Grup", avatar: gData.avatar_url, role: 'user' });
        setNewGroupName(gData.name);
        setIsOwner(gData.created_by === session.user.id);
      }
      fetchGroupMembers();
    } else if (fromId) {
      const ids = [session.user.id, fromId].sort();
      currentRoom = `pv_${ids[0]}_${ids[1]}`;
      setTargetId(fromId);
      const { data: pTarget } = await supabase.from('profiles').select('username, short_id, avatar_url, role').eq('id', fromId).single();
      if (pTarget) {
        setHeaderInfo({ title: pTarget.username, sub: `#${pTarget.short_id}`, avatar: pTarget.avatar_url, role: pTarget.role });
      }
    }
    setRoomId(currentRoom);
    await fetchMessages(currentRoom);
    setupRealtime(currentRoom, session.user, prof);
  };

  const fetchGroupMembers = async () => {
    if (!groupId) return;
    const { data } = await supabase.from('group_members').select('*, profiles:user_id(*)').eq('group_id', groupId);
    if (data) setGroupMembers(data);
  };

  const handleAddMember = async () => {
    if (!inviteSearch.trim() || !groupId) return;
    setIsUpdatingGroup(true);
    
    // 🔥 FIX: Query Filter Supabase yang lebih stabil
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, username')
      .or(`username.eq.${inviteSearch},short_id.eq.${inviteSearch}`)
      .single();

    if (userError || !userData) {
      showNotif("User tidak ditemukan!", "error");
    } else {
      const { error: addError } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userData.id });
      if (!addError) {
        showNotif(`${userData.username} ditambahkan!`, "success");
        fetchGroupMembers();
        setInviteSearch('');
      } else {
        if (addError.code === '23505') showNotif("User sudah ada di grup", "info");
        else showNotif("Gagal menambahkan member", "error");
      }
    }
    setIsUpdatingGroup(false);
  };

  const updateGroupInfo = async (field: 'name' | 'avatar_url', value: string) => {
    if (!groupId || !isOwner) return;
    setIsUpdatingGroup(true);
    const { error } = await supabase.from('groups').update({ [field]: value }).eq('id', groupId);
    if (!error) {
      setHeaderInfo(prev => ({ ...prev, [field === 'name' ? 'title' : 'avatar']: value }));
      showNotif("Grup diperbarui!", "success");
    }
    setIsUpdatingGroup(false);
  };

  const kickMember = async (targetUserId: string) => {
    if (!groupId || !isOwner) return;
    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', targetUserId);
    if (!error) {
      setGroupMembers(prev => prev.filter(m => m.user_id !== targetUserId));
      showNotif("Member dikeluarkan!", "success");
    }
  };

  const handleGroupPhotoUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !isOwner) return;
    setIsUpdatingGroup(true);
    const fd = new FormData();
    fd.append("file", file); fd.append("upload_preset", "hopehype_preset");
    const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: fd });
    const d = await res.json();
    if (d.secure_url) updateGroupInfo('avatar_url', d.secure_url);
    else setIsUpdatingGroup(false);
  };

  const cleanup = () => {
    if (refs.msgChannel.current) supabase.removeChannel(refs.msgChannel.current);
    if (refs.presenceChannel.current) supabase.removeChannel(refs.presenceChannel.current);
    if (refs.globalChannel.current) supabase.removeChannel(refs.globalChannel.current);
    if (refs.lkRoom.current) refs.lkRoom.current.disconnect();
    if (refs.audioCtx.current) refs.audioCtx.current.close();
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
      refs.presenceChannel.current.send({ type: 'broadcast', event: 'typing', payload: { username: myProfile?.username, avatar_url: myProfile?.avatar_url } });
    }
  };

  const startVisualizer = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    refs.audioCtx.current = audioContext;
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 64; 
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const update = () => {
      if (!isRecordingRef.current) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      setAudioLevel(sum / bufferLength); 
      requestAnimationFrame(update);
    };
    update();
  };

  const startVN = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startVisualizer(stream);
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
      setIsRecording(true); isRecordingRef.current = true;
      setRecordTime(0);
      refs.recordTimer.current = setInterval(() => setRecordTime(p => p + 1), 1000);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) { showNotif(t('mic_error'), "error"); }
  };

  const stopVN = (cancel = false) => {
    if (!isRecordingRef.current) return;
    setIsRecording(false); isRecordingRef.current = false;
    setAudioLevel(0);
    if (refs.audioCtx.current) { refs.audioCtx.current.close(); refs.audioCtx.current = null; }
    clearInterval(refs.recordTimer.current);
    if (cancel) { refs.mediaRecorder.current!.onstop = null; showNotif(t('vn_canceled'), "info"); }
    refs.mediaRecorder.current?.stop();
    refs.audioChunks.current = [];
  };

  const handleMicTouchStart = (e: any) => {
    if (!inputValue.trim()) {
      vnTouchStartX.current = ('touches' in e) ? e.touches[0].clientX : e.clientX;
      vnIsCanceled.current = false;
      startVN();
    }
  };

  const handleMicTouchMove = (e: any) => {
    if (isRecordingRef.current && !vnIsCanceled.current) {
      const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
      if (vnTouchStartX.current - clientX > 80) { vnIsCanceled.current = true; stopVN(true); }
    }
  };

  const startCall = async () => {
    if (!targetId) return;
    const { data: pTarget } = await supabase.from('profiles').select('avatar_url').eq('id', targetId).single();
    setCallStatus('calling'); 
    setCallData({ partnerName: headerInfo.title, partnerAvatar: pTarget?.avatar_url, seconds: 0 });
    await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, message: `📞 Memanggil ${headerInfo.title}...`, is_system: true }]);
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
      if (error || !data) throw new Error("Gagal ambil token");
      refs.lkRoom.current = new LiveKit.Room();
      await refs.lkRoom.current.connect("wss://voicegrup-zxmeibkn.livekit.cloud", data.token);
      await refs.lkRoom.current.localParticipant.setMicrophoneEnabled(true);
      if (refs.lkRoom.current.remoteParticipants.size > 0) {
         setCallStatus('connected'); clearTimeout(refs.callTimer.current);
         refs.callTimer.current = setInterval(() => setCallData((p:any) => ({...p, seconds: p.seconds+1})), 1000);
      }
      refs.lkRoom.current.on(LiveKit.RoomEvent.ParticipantConnected, () => {
        setCallStatus('connected'); clearTimeout(refs.callTimer.current);
        refs.callTimer.current = setInterval(() => setCallData((p:any) => ({...p, seconds: p.seconds+1})), 1000);
      });
      refs.lkRoom.current.on(LiveKit.RoomEvent.TrackSubscribed, (t) => { if (t.kind === "audio") document.body.appendChild(t.attach()); });
    } catch (e: any) { showNotif(t('call_error'), "error"); endCall(); }
  };

  const endCall = (silent = false) => {
    if (refs.audio.current?.ring) { refs.audio.current.ring.pause(); refs.audio.current.ring.currentTime = 0; }
    refs.lkRoom.current?.disconnect();
    setCallStatus('idle'); clearInterval(refs.callTimer.current);
    if (!silent) showNotif(t('call_ended'), "info");
  };

  const fetchStickers = async (q="") => {
    const res = await fetch(`https://api.giphy.com/v1/stickers/${q ? 'search' : 'trending'}?api_key=vPUlBU5Qfz2ZygoEtKXVUqmIEAEcIB08&limit=20&rating=g${q ? `&q=${q}` : ''}`);
    const d = await res.json(); setStickers(d.data || []);
  };

  return (
    <div className="telegram-chat hype-chat-scope">
      {/* 🔥 FIX: CALL OVERLAY (POSISI PALING ATAS) 🔥 */}
      {callStatus !== 'idle' && (
        <div className="call-overlay">
          <img src={callData.partnerAvatar || '/asets/png/profile.webp'} className={callStatus === 'calling' ? 'anim-calling-avatar' : ''} alt="avatar" />
          <h2>{callData.partnerName}</h2>
          <p>{callStatus === 'connected' ? `${Math.floor(callData.seconds/60)}:${String(callData.seconds%60).padStart(2,'0')}` : callStatus.toUpperCase()}</p>
          <div style={{ display: 'flex', gap: 20, marginTop: 40 }}>
            {callStatus === 'incoming' && <button onClick={() => { refs.audio.current?.ring.pause(); connectLiveKit(callData.room); }} className="btn-answer" style={{background:'#2ecc71', padding:'12px 30px', borderRadius:25, border:'none', color:'white', fontWeight:'bold'}}>{t('btn_answer')}</button>}
            <button onClick={() => endCall()} className="btn-decline" style={{background:'#ff4757', padding:'12px 30px', borderRadius:25, border:'none', color:'white', fontWeight:'bold'}}>{t('btn_decline')}</button>
          </div>
        </div>
      )}

      <header className="chat-header">
        <div className="header-left">
          <button className="menu-btn" onClick={() => router.push('/hypetalk')}><span className="material-icons">arrow_back</span></button>
          {targetId && (
            <img src={headerInfo.avatar || '/asets/png/profile.webp'} alt="avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-color)', background: 'var(--bg-panel)' }} />
          )}
          <div className="header-info">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {headerInfo.title}
              {targetId && headerInfo.role && <span dangerouslySetInnerHTML={{ __html: getUserBadge(headerInfo.role) }} />}
            </h3>
            <div className="status-container">{typingUser ? <span className="status-typing">{t('typing_status', { username: typingUser.username })}</span> : <span className="status-online">{t('online_status', { count: onlineCount })}</span>}</div>
          </div>
        </div>
        <div className="header-right">
          {targetId ? (
            <button className="btn-call" onClick={startCall}><span className="material-icons">call</span></button>
          ) : groupId ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setGroupModalTab('invite'); setIsGroupSettingsOpen(true); }} style={{ background: 'rgba(29, 161, 242, 0.1)', color: 'var(--primary-blue)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>INVITE</button>
              {isOwner && <button onClick={() => { setGroupModalTab('settings'); setIsGroupSettingsOpen(true); }} style={{ background: 'var(--border-color)', color: 'var(--text-color)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>SETTINGS</button>}
            </div>
          ) : null}
        </div>
      </header>

      <main className="chat-messages">
        {isLoading ? (
          /* 🔥 FIX: SKELETON PEMBUNGKUS (AGAR SHIMMER MUNCUL) 🔥 */
          <div className="chat-loading-screen">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`skeleton-msg ${i % 2 === 0 ? 'left' : 'right'}`}>
                <div className="skeleton-avatar"></div>
                <div className="skeleton-bubble"></div>
              </div>
            ))}
            <div className="loading-chat-hint">{t('connecting_chat')}</div>
          </div>
        ) : (
          <>
            <div className="encryption-notice">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>
              <span>{t('encryption_notice')}</span>
            </div>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} isMe={msg.user_id === currentUser?.id} onReply={setReplyTo} onReaction={(m:any, touch:any) => setReactionMenu({ id: m.id, x: touch.clientX, y: touch.clientY })} onDelete={(id:any) => setDeleteMenu(id)} />
            ))}
          </>
        )}
        <div ref={refs.scroll} />
      </main>

      <footer className="chat-input-container">
        {isStickerOpen && (
          <div id="sticker-menu" style={{ display: 'flex' }}>
            <div className="sticker-search-wrapper"><input placeholder={t('search_sticker')} onChange={(e) => fetchStickers(e.target.value)} /></div>
            <div id="sticker-list">{stickers.map((s, idx) => <img key={idx} src={s.images.fixed_width_small.url} alt="sticker" onClick={() => sendMessage(undefined, s.images.fixed_width.url)} />)}</div>
          </div>
        )}
        <div className="input-row">
          <div className="input-group-wrapper" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '4px 6px', borderRadius: replyTo ? '16px' : '28px' }}>
            {replyTo && (
              <div id="reply-preview-box" style={{ display: 'flex' }}>
                <div className="reply-content-wrapper" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{color: 'var(--primary-blue)', fontSize: '11px', fontWeight: 'bold'}}>{t('replying_to', { username: replyTo.profiles?.username })}</div>
                  <div style={{fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{replyTo.message || t('media_label')}</div>
                </div>
                <div onClick={() => setReplyTo(null)} style={{fontSize: '22px', cursor: 'pointer', color: '#94a3b8'}}>&times;</div>
              </div>
            )}
            <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
              {isRecording ? (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px', color: '#ff4757', fontWeight: 600, padding: '8px 10px' }}>
                  <span className="online-dot" style={{ background: '#ff4757' }}></span>
                  <span>{Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,'0')}</span>
                  <div style={{ flex: 1 }}>{t('recording')}...</div>
                  <span style={{ fontSize: '12px', opacity: 0.6 }}>{t('slide_cancel')}</span>
                </div>
              ) : (
                <>
                  <button onClick={() => { setIsStickerOpen(!isStickerOpen); if(!isStickerOpen) fetchStickers(); }} style={{ border: 'none', background: 'transparent', padding: '8px', color: '#64748b' }}><span className="material-icons">sentiment_satisfied_alt</span></button>
                  <textarea placeholder={t('write_message')} value={inputValue} onChange={handleTyping} style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', outline: 'none', padding: '12px 0', fontSize: '15px' }} />
                </>
              )}
            </div>
          </div>
          <button id="action-btn" onMouseDown={handleMicTouchStart} onMouseUp={() => stopVN(false)} onTouchStart={handleMicTouchStart} onTouchEnd={() => stopVN(false)} onClick={() => inputValue.trim() && sendMessage()}><span className="material-icons">{inputValue.trim() ? 'send' : 'mic'}</span></button>
        </div>
      </footer>

      {/* 🔥 FIX: MODAL BOTTOM SHEET 🔥 */}
      {isGroupSettingsOpen && groupId && (
        <div className="custom-modal-overlay" onClick={() => setIsGroupSettingsOpen(false)}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            {groupModalTab === 'invite' ? (
              <>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0 }}>Tambah Member</h3>
                  <button onClick={() => setIsGroupSettingsOpen(false)} style={{ background: 'none', border: 'none', color: '#ff4757' }}><span className="material-icons">close</span></button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" placeholder="Username / ID..." value={inviteSearch} onChange={(e) => setInviteSearch(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-color)', outline: 'none' }} />
                  <button onClick={handleAddMember} disabled={isUpdatingGroup} style={{ background: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: '12px', padding: '0 20px', fontWeight: 'bold' }}>TAMBAH</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <label style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={headerInfo.avatar || '/asets/png/group_placeholder.png'} style={{ width: '90px', height: '90px', borderRadius: '50%', border: '3px solid var(--primary-blue)' }} alt="g" />
                    {isOwner && <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary-blue)', borderRadius: '50%', padding: '6px', color: 'white' }}><span className="material-icons" style={{fontSize: '18px'}}>camera_alt</span></div>}
                    <input type="file" hidden accept="image/*" onChange={handleGroupPhotoUpload} disabled={!isOwner} />
                  </label>
                </div>
                <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onBlur={() => newGroupName !== headerInfo.title && updateGroupInfo('name', newGroupName)} disabled={!isOwner} style={{ width: '100%', padding: '12px', borderRadius: '15px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', textAlign: 'center', fontWeight: 'bold' }} />
                <div style={{ marginTop: '20px', maxHeight: '200px', overflowY: 'auto' }}>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>MEMBER ({groupMembers.length})</p>
                  {groupMembers.map(m => (
                    <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <img src={m.profiles?.avatar_url || '/asets/png/profile.webp'} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt="u" />
                        <span>{m.profiles?.username}</span>
                      </div>
                      {isOwner && m.user_id !== currentUser.id && <button onClick={() => kickMember(m.user_id)} style={{ background: 'none', border: 'none', color: '#ff4757' }}><span className="material-icons">person_remove</span></button>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}