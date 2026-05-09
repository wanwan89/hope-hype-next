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
  const [msgOptions, setMsgOptions] = useState<any>(null);
  const [editMessageId, setEditMessageId] = useState<any>(null);
  
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [groupModalTab, setGroupModalTab] = useState<'invite' | 'settings'>('invite');
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [inviteSearch, setInviteSearch] = useState(''); 

  // 🔥 STATE PROFIL MINIMALIS 🔥
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // State VN & Batal
  const [isMicPressed, setIsMicPressed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cancelAnim, setCancelAnim] = useState(false); 
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
    callTimeout: useRef<any>(null), 
    callInterval: useRef<any>(null), 
    recordTimer: useRef<any>(null),
    typingTimer: useRef<any>(null),
    audioCtx: useRef<AudioContext | null>(null)
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
      const { data: gData } = await supabase.from('groups').select('*').eq('id', groupId).single();
      if (gData) {
        setHeaderInfo({ title: gData.name, sub: "Grup", avatar: gData.photo_url, role: 'user' });
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
    const { data: userData, error: userError } = await supabase.from('profiles').select('id, username').or(`username.eq.${inviteSearch},short_id.eq.${inviteSearch}`).single();
    if (userError || !userData) { showNotif("User tidak ditemukan!", "error"); } 
    else {
      const { error: addError } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userData.id });
      if (!addError) { showNotif(`${userData.username} ditambahkan!`, "success"); fetchGroupMembers(); setInviteSearch(''); }
      else { if (addError.code === '23505') showNotif("User sudah ada di grup", "info"); else showNotif("Gagal menambahkan member", "error"); }
    }
    setIsUpdatingGroup(false);
  };

  const updateGroupInfo = async (field: 'name' | 'photo_url', value: string) => {
    if (!groupId || !isOwner) return;
    setIsUpdatingGroup(true);
    const { error } = await supabase.from('groups').update({ [field]: value }).eq('id', groupId);
    if (!error) { setHeaderInfo(prev => ({ ...prev, [field === 'name' ? 'title' : 'avatar']: value })); showNotif("Grup diperbarui!", "success"); }
    setIsUpdatingGroup(false);
  };

  const kickMember = async (targetUserId: string, targetName: string) => {
    if (!groupId || !isOwner) return;
    const confirmKick = window.confirm(`Apakah kamu yakin ingin mengeluarkan ${targetName} dari grup?`);
    if (!confirmKick) return;
    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', targetUserId);
    if (!error) { setGroupMembers(prev => prev.filter(m => m.user_id !== targetUserId)); showNotif("Member berhasil dikeluarkan!", "success"); }
  };

  const handleGroupPhotoUpload = async (e: any) => {
    const file = e.target.files[0]; if (!file || !isOwner) return;
    const objectUrl = URL.createObjectURL(file); setHeaderInfo(prev => ({ ...prev, avatar: objectUrl })); 
    setIsUpdatingGroup(true);
    const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", "hopehype_preset");
    const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: fd });
    const d = await res.json();
    if (d.secure_url) updateGroupInfo('photo_url', d.secure_url);
    else { setIsUpdatingGroup(false); showNotif("Gagal upload foto", "error"); }
  };

  const cleanup = () => {
    if (refs.msgChannel.current) supabase.removeChannel(refs.msgChannel.current);
    if (refs.presenceChannel.current) supabase.removeChannel(refs.presenceChannel.current);
    if (refs.globalChannel.current) supabase.removeChannel(refs.globalChannel.current);
    if (refs.lkRoom.current) refs.lkRoom.current.disconnect();
    if (refs.audioCtx.current) refs.audioCtx.current.close();
    clearInterval(refs.callTimer.current); clearTimeout(refs.callTimeout.current);
    clearInterval(refs.callInterval.current); clearInterval(refs.recordTimer.current);
  };

  const fetchMessages = async (room: string) => {
    setIsLoading(true);
    const { data } = await supabase.from('messages').select('*, profiles:user_id(*), reply_to_msg:reply_to(id, username, message)').eq('room_id', room).order('created_at', { ascending: true }).limit(50);
    if (data) setMessages(data);
    setIsLoading(false); scrollToBottom();
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
          if (newMsg.user_id !== user.id) { refs.audio.current?.receive.play().catch(()=>{}); if (newMsg.status !== 'read') await supabase.from('messages').update({ status: 'read' }).eq('id', newMsg.id); }
          scrollToBottom();
        } else if (payload.eventType === 'UPDATE') { setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)); }
      }).subscribe();

    refs.presenceChannel.current = supabase.channel(`presence-${room}`)
      .on('presence', { event: 'sync' }, () => setOnlineCount(Object.keys(refs.presenceChannel.current.presenceState()).length))
      .on('broadcast', { event: 'typing' }, (p: any) => { setTypingUser({ username: p.payload.username, avatar_url: p.payload.avatar_url }); setTimeout(() => setTypingUser(null), 3000); })
      .subscribe(async (s) => { if (s === 'SUBSCRIBED') await refs.presenceChannel.current.track({ user_id: user.id, online: true }); });
  };

  const scrollToBottom = () => setTimeout(() => refs.scroll.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const sendMessage = async (text?: string, sticker?: string, audio?: string) => {
    const content = text || inputValue; if (!content && !sticker && !audio) return;
    refs.audio.current?.send.play().catch(()=>{});
    if (editMessageId) { await supabase.from('messages').update({ message: content }).eq('id', editMessageId); setEditMessageId(null); setInputValue(''); return; }
    const { error } = await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, message: audio ? "🎤 Voice Note" : (sticker ? "🖼 Stiker" : content), sticker_url: sticker || null, audio_url: audio || null, reply_to: replyTo?.id || null, status: 'sent' }]);
    if (!error) { setInputValue(''); setReplyTo(null); setIsStickerOpen(false); }
    if (targetId && !sticker && !audio) { supabase.functions.invoke('send-chat-notif', { body: { record: { sender_id: currentUser.id, receiver_id: targetId, content } } }); }
  };

  const handleTyping = (e: any) => {
    setInputValue(e.target.value);
    if (refs.presenceChannel.current && refs.presenceChannel.current.state === 'joined') {
      refs.presenceChannel.current.send({ type: 'broadcast', event: 'typing', payload: { username: myProfile?.username, avatar_url: myProfile?.avatar_url } });
    }
  };

  const startCall = async () => {
    if (!targetId) return;
    const { data: pTarget } = await supabase.from('profiles').select('avatar_url').eq('id', targetId).single();
    setCallStatus('calling'); 
    setCallData({ partnerName: headerInfo.title, partnerAvatar: pTarget?.avatar_url, seconds: 0 });
    await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, message: `📞 Memanggil ${headerInfo.title}...`, is_system: true }]);
    clearTimeout(refs.callTimeout.current);
    refs.callTimeout.current = setTimeout(async () => {
      setCallStatus(prev => { if(prev !== 'connected') { endCall(true); supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, message: `☎️ Panggilan tak terjawab`, is_system: true }]); } return prev; });
    }, 15000); 
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
      const handleCallConnected = () => {
        setCallStatus('connected'); clearTimeout(refs.callTimeout.current); clearInterval(refs.callInterval.current);
        refs.callInterval.current = setInterval(() => setCallData((p:any) => ({...p, seconds: p.seconds+1})), 1000);
      };
      if (refs.lkRoom.current.remoteParticipants.size > 0) handleCallConnected();
      refs.lkRoom.current.on(LiveKit.RoomEvent.ParticipantConnected, handleCallConnected);
      refs.lkRoom.current.on(LiveKit.RoomEvent.TrackSubscribed, (t) => { if (t.kind === "audio") document.body.appendChild(t.attach()); });
    } catch (e: any) { showNotif(t('call_error'), "error"); endCall(); }
  };

  const endCall = (silent = false) => {
    if (refs.audio.current?.ring) { refs.audio.current.ring.pause(); refs.audio.current.ring.currentTime = 0; }
    refs.lkRoom.current?.disconnect(); setCallStatus('idle'); 
    clearInterval(refs.callTimer.current); clearTimeout(refs.callTimeout.current); clearInterval(refs.callInterval.current);
    if (!silent) showNotif(t('call_ended'), "info");
  };

  const startVN = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); refs.mediaRecorder.current = new MediaRecorder(stream); refs.audioChunks.current = []; refs.mediaRecorder.current.ondataavailable = (e) => refs.audioChunks.current.push(e.data); refs.mediaRecorder.current.onstop = async () => { if (vnIsCanceled.current) { refs.audioChunks.current = []; return; } if (refs.audioChunks.current.length === 0) return; const blob = new Blob(refs.audioChunks.current, { type: 'audio/mpeg' }); const fd = new FormData(); fd.append("file", blob); fd.append("upload_preset", "hopehype_preset"); fd.append("resource_type", "video"); const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: fd }); const d = await res.json(); if (d.secure_url) sendMessage(undefined, undefined, d.secure_url); }; refs.mediaRecorder.current.start(); setIsRecording(true); isRecordingRef.current = true; setRecordTime(0); refs.recordTimer.current = setInterval(() => setRecordTime(p => p + 1), 1000); if (navigator.vibrate) navigator.vibrate(50); } catch (e) { setIsMicPressed(false); showNotif(t('mic_error'), "error"); } };
  const stopVN = (isCanceledByUser = false) => { setIsMicPressed(false); if (!isRecordingRef.current) return; setIsRecording(false); isRecordingRef.current = false; setAudioLevel(0); if (refs.audioCtx.current) { refs.audioCtx.current.close(); refs.audioCtx.current = null; } clearInterval(refs.recordTimer.current); if (isCanceledByUser || vnIsCanceled.current) { vnIsCanceled.current = true; setCancelAnim(true); if (navigator.vibrate) navigator.vibrate(50); setTimeout(() => setCancelAnim(false), 2000); } else { vnIsCanceled.current = false; } refs.mediaRecorder.current?.stop(); };
  const handleMicTouchStart = (e: any) => { if (!inputValue.trim() && !editMessageId) { setIsMicPressed(true); vnTouchStartX.current = ('touches' in e) ? e.touches[0].clientX : e.clientX; vnIsCanceled.current = false; startVN(); } };
  const handleMicTouchMove = (e: any) => { if ((isRecordingRef.current || isMicPressed) && !vnIsCanceled.current) { const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX; const diff = vnTouchStartX.current - clientX; if (diff > 60) { vnIsCanceled.current = true; stopVN(true); } } };
  const fetchStickers = async (q="") => { const res = await fetch(`https://api.giphy.com/v1/stickers/${q ? 'search' : 'trending'}?api_key=vPUlBU5Qfz2ZygoEtKXVUqmIEAEcIB08&limit=20&rating=g${q ? `&q=${q}` : ''}`); const d = await res.json(); setStickers(d.data || []); };
  const handleSendReaction = async (msgId: string, emoji: string) => { const msg = messages.find(m => m.id === msgId); if(!msg) return; const currentReactions = msg.reactions || {}; currentReactions[currentUser.id] = emoji; await supabase.from('messages').update({ reactions: currentReactions }).eq('id', msgId); setReactionMenu(null); };
  const handleDeleteMsg = async (id: string) => { await supabase.from('messages').update({ message: 'Pesan ini telah dihapus', sticker_url: null, audio_url: null }).eq('id', id); setMsgOptions(null); };

  // 🔥 FIX 2: BUKA PROFIL MINIMALIS 🔥
  const handleOpenHeaderProfile = async () => {
    if (groupId) { setIsGroupSettingsOpen(true); return; }
    if (!targetId) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', targetId).single();
    if (data) setSelectedProfile(data);
  };

  let displayStatus = 'Offline';
  if (typingUser) { displayStatus = `${typingUser.username} sedang mengetik...`; } 
  else if (targetId) { displayStatus = onlineCount >= 2 ? 'Sedang online' : 'Offline'; } 
  else if (groupId) { displayStatus = `${onlineCount} anggota online`; } 
  else { displayStatus = `${onlineCount} hopers online`; }

  return (
    <div className="telegram-chat hype-chat-scope">
      
      {/* SUNTIKAN CSS FULL FIX UNTUK CALL & MODAL LITE */}
      <style>{`
        .call-overlay { position: fixed; inset: 0; background: rgba(10,10,10,0.95); z-index: 1000000; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; backdrop-filter: blur(15px); text-align: center; }
        .call-overlay img { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #1f3cff; margin-bottom: 25px; box-shadow: 0 0 30px rgba(31,60,255,0.3); }
        .anim-calling-avatar { animation: pulseAvatar 1.5s infinite; }
        @keyframes pulseAvatar { 0% { box-shadow: 0 0 0 0 rgba(31, 60, 255, 0.7); } 70% { box-shadow: 0 0 0 20px rgba(31, 60, 255, 0); } 100% { box-shadow: 0 0 0 0 rgba(31, 60, 255, 0); } }
        .call-btn-circle { width: 65px; height: 65px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: transform 0.2s; }
        .call-btn-circle:active { transform: scale(0.9); }
        .floating-call-pill { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: #111; border: 1px solid #1f3cff; padding: 10px 20px; border-radius: 40px; display: flex; align-items: center; gap: 12px; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        
        .user-profile-lite { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 25px; }
        .profile-lite-card { width: 100%; max-width: 320px; background: var(--bg-panel); border-radius: 28px; overflow: hidden; animation: popLite 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
        @keyframes popLite { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .profile-lite-header { width: 100%; height: 300px; position: relative; }
        .profile-lite-header img { width: 100%; height: 100%; object-fit: cover; }
        .profile-lite-body { padding: 20px; text-align: center; }
        .profile-lite-btn-group { display: flex; border-top: 1px solid var(--border-color); }
        .profile-lite-btn { flex: 1; padding: 18px; background: none; border: none; font-weight: 800; font-size: 12px; color: var(--primary-blue); cursor: pointer; letter-spacing: 1px; }
        .profile-lite-btn.danger { color: #ff4757; }
        .profile-lite-btn:active { background: rgba(0,0,0,0.05); }
      `}</style>

      {/* 🔥 UI CALL OVERLAY FIXED 🔥 */}
      {(callStatus === 'calling' || callStatus === 'incoming') && (
        <div className="call-overlay">
          <img src={callData.partnerAvatar || '/asets/png/profile.webp'} className={callStatus === 'calling' ? 'anim-calling-avatar' : ''} alt="avatar" />
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>{callData.partnerName}</h2>
          <p style={{ opacity: 0.7, marginTop: '5px', letterSpacing: '1px' }}>{callStatus.toUpperCase()}</p>
          <div style={{ display: 'flex', gap: 30, marginTop: 50 }}>
            {callStatus === 'incoming' && <button onClick={() => { refs.audio.current?.ring.pause(); connectLiveKit(callData.room); }} className="call-btn-circle" style={{ background: '#2ecc71' }}><span className="material-icons" style={{ fontSize: '32px' }}>call</span></button>}
            <button onClick={() => endCall()} className="call-btn-circle" style={{ background: '#ff4757' }}><span className="material-icons" style={{ fontSize: '32px' }}>call_end</span></button>
          </div>
        </div>
      )}

      {callStatus === 'connected' && (
        <div className="floating-call-pill">
          <div style={{ width: 10, height: 10, background: '#2ecc71', borderRadius: '50%', animation: 'pulseAvatar 1.5s infinite' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{callData.partnerName}</span>
            <span style={{ fontSize: '11px', color: '#888' }}>{Math.floor(callData.seconds/60)}:{String(callData.seconds%60).padStart(2,'0')}</span>
          </div>
          <button onClick={() => endCall()} style={{ background: '#ff4757', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justify: 'center', cursor: 'pointer', marginLeft: '10px' }}>
            <span className="material-icons" style={{ color: 'white', fontSize: '18px' }}>call_end</span>
          </button>
        </div>
      )}

      {/* 🔥 MODAL PROFIL MINIMALIS (NO ICON) 🔥 */}
      {selectedProfile && (
        <div className="user-profile-lite" onClick={() => setSelectedProfile(null)}>
          <div className="profile-lite-card" onClick={e => e.stopPropagation()}>
            <div className="profile-lite-header">
              <img src={selectedProfile.avatar_url || '/asets/png/profile.webp'} alt="av" />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '25px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))' }}>
                <h3 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: 800 }}>{selectedProfile.username}</h3>
                <p style={{ color: '#aaa', margin: '4px 0 0', fontSize: '12px', fontWeight: 600 }}>#{selectedProfile.short_id}</p>
              </div>
            </div>
            <div className="profile-lite-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {selectedProfile.pekerjaan && <span style={{ padding: '6px 14px', background: 'var(--bg-main)', borderRadius: '12px', fontSize: '11px', fontWeight: 800, color: 'var(--text-color)' }}>{selectedProfile.pekerjaan.toUpperCase()}</span>}
                {selectedProfile.zodiak && <span style={{ padding: '6px 14px', background: 'var(--bg-main)', borderRadius: '12px', fontSize: '11px', fontWeight: 800, color: 'var(--text-color)' }}>{selectedProfile.zodiak.toUpperCase()}</span>}
              </div>
            </div>
            <div className="profile-lite-btn-group">
              <button className="profile-lite-btn" onClick={() => setSelectedProfile(null)}>CHAT</button>
              <button className="profile-lite-btn" onClick={() => { setSelectedProfile(null); startCall(); }}>TELPON</button>
              <button className="profile-lite-btn danger" onClick={() => { if(confirm('Blokir user ini?')) showNotif('User diblokir', 'success'); setSelectedProfile(null); }}>BLOKIR</button>
            </div>
          </div>
        </div>
      )}

      <header className="chat-header">
        <div className="header-left">
          <button className="menu-btn" onClick={() => router.push('/hypetalk')}><span className="material-icons">arrow_back</span></button>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={handleOpenHeaderProfile}>
            {targetId && <img src={headerInfo.avatar || '/asets/png/profile.webp'} alt="avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-color)' }} />}
            <div className="header-info">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {headerInfo.title}
                {/* 🔥 FIX 1: HAPUS BADGE JIKA ROOM GLOBAL 🔥 */}
                {roomId !== 'room-1' && targetId && headerInfo.role && <span dangerouslySetInnerHTML={{ __html: getUserBadge(headerInfo.role) }} />}
              </h3>
              <div className="status-container">
                <span className={typingUser ? "status-typing" : "status-online"}>{displayStatus}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="header-right">
          {targetId ? (
            <button className="btn-call" onClick={startCall}><span className="material-icons">call</span></button>
          ) : groupId ? (
            <button onClick={() => { setGroupModalTab('invite'); setIsGroupSettingsOpen(true); }} style={{ background: 'var(--primary-blue)', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>INVITE</button>
          ) : null}
        </div>
      </header>

      <main className="chat-messages">
        {isLoading ? (
          <div className="chat-loading-screen">{[...Array(5)].map((_, i) => <div key={i} className={`skeleton-msg ${i % 2 === 0 ? 'left' : 'right'}`}><div className="skeleton-avatar"></div><div className="skeleton-bubble"></div></div>)}</div>
        ) : (
          <>
            <div className="encryption-notice">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>
              <span>{t('encryption_notice')}</span>
            </div>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} isMe={msg.user_id === currentUser?.id} onReply={setReplyTo} onReaction={(m:any, touch:any) => setReactionMenu({ id: m.id, x: touch.clientX, y: touch.clientY })} onDelete={(id:any) => setMsgOptions(messages.find(m => m.id === id))} />
            ))}
          </>
        )}
        <div ref={refs.scroll} />
      </main>

      <footer className="chat-input-container">
        {isStickerOpen && (
          <div id="sticker-menu">
            <div className="sticker-search-wrapper"><input placeholder={t('search_sticker')} onChange={(e) => fetchStickers(e.target.value)} /></div>
            <div id="sticker-list">{stickers.map((s, idx) => <img key={idx} src={s.images.fixed_width_small.url} alt="sticker" onClick={() => sendMessage(undefined, s.images.fixed_width.url)} />)}</div>
          </div>
        )}
        <div className="input-row">
          <div className="input-group-wrapper" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '4px 6px', borderRadius: replyTo || editMessageId ? '16px' : '28px' }}>
            {editMessageId && (
              <div style={{ background: 'rgba(29, 161, 242, 0.1)', borderBottom: '1px solid var(--border-color)', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary-blue)' }}>MENGEDIT PESAN</span>
                <span onClick={() => { setEditMessageId(null); setInputValue(''); }} style={{ cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)' }}>&times;</span>
              </div>
            )}
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
              {cancelAnim ? (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px', color: '#ff4757', fontWeight: 600, padding: '8px 10px' }}><div style={{ flex: 1, fontSize: '14px', textAlign: 'center' }}>Voice Note dibatalkan</div></div>
              ) : isRecording ? (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px', color: '#ff4757', fontWeight: 600, padding: '8px 10px' }}><span className="online-dot" style={{ background: '#ff4757' }}></span><span>{Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,'0')}</span><div style={{ flex: 1 }}>{t('recording')}...</div><span style={{ fontSize: '12px', opacity: 0.6 }}>&lt; {t('slide_cancel')}</span></div>
              ) : (
                <>
                  <button onClick={() => { setIsStickerOpen(!isStickerOpen); if(!isStickerOpen) fetchStickers(); }} style={{ border: 'none', background: 'transparent', padding: '8px', color: '#64748b' }}><span className="material-icons">sentiment_satisfied_alt</span></button>
                  <textarea placeholder={t('write_message')} value={inputValue} onChange={handleTyping} style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', outline: 'none', padding: '12px 0', fontSize: '15px' }} />
                </>
              )}
            </div>
          </div>
          <button id="action-btn" className={inputValue.trim() || editMessageId ? 'mode-typing' : (isRecording || isMicPressed ? 'is-recording' : '')} onMouseDown={handleMicTouchStart} onMouseUp={() => stopVN(false)} onTouchStart={handleMicTouchStart} onTouchEnd={() => stopVN(false)} onTouchMove={handleMicTouchMove} onClick={() => (inputValue.trim() || editMessageId) && sendMessage()}>
            <span className="material-icons">{editMessageId ? 'check' : (inputValue.trim() ? 'send' : 'mic')}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
