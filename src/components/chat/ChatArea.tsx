'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif, getUserBadge } from '@/lib/ui-utils'; 
import * as LiveKit from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion'; 
import MessageBubble from './MessageBubble';
import './ChatArea.css';

const formatLastSeen = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
  const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  
  if (isToday) return `Hari ini, ${time}`;
  if (isYesterday) return `Kemarin, ${time}`;
  return `${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${time}`;
};

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
  
  const [headerInfo, setHeaderInfo] = useState({ title: 'HopeTalk Globe', sub: '', avatar: '', role: 'user', lastSeen: null as string | null });
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

  const [msgOptions, setMsgOptions] = useState<any>(null);
  const [editMessageId, setEditMessageId] = useState<any>(null);
  
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [groupModalTab, setGroupModalTab] = useState<'invite' | 'settings'>('invite');
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [inviteSearch, setInviteSearch] = useState(''); 

  const [relation, setRelation] = useState({ iFollowThem: false, theyFollowMe: false });
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const [isMicPressed, setIsMicPressed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cancelAnim, setCancelAnim] = useState(false); 
  const isRecordingRef = useRef(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0); 
  const vnTouchStartX = useRef(0);
  const vnIsCanceled = useRef(false);

  const [lightboxSticker, setLightboxSticker] = useState<string | null>(null);

  const [callStatus, setCallStatus] = useState<'idle'|'calling'|'incoming'|'connected'>('idle');
  const [callData, setCallData] = useState<any>({ seconds: 0, partnerName: '', partnerAvatar: '', room: '' });

  const callStatusRef = useRef(callStatus);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

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
  }, [fromId, groupId]);

  const initApp = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    setCurrentUser(session.user);

    await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id);

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
        setHeaderInfo({ title: gData.name, sub: "Grup", avatar: gData.photo_url, role: 'user', lastSeen: null });
        setNewGroupName(gData.name);
        setIsOwner(gData.created_by === session.user.id);
      }
      fetchGroupMembers();
    } else if (fromId) {
      const ids = [session.user.id, fromId].sort();
      currentRoom = `pv_${ids[0]}_${ids[1]}`;
      setTargetId(fromId);
      
      const { data: pTarget } = await supabase.from('profiles').select('username, short_id, avatar_url, role, last_seen').eq('id', fromId).single();
      if (pTarget) {
        setHeaderInfo({ 
          title: pTarget.username, 
          sub: `#${pTarget.short_id}`, 
          avatar: pTarget.avatar_url, 
          role: pTarget.role,
          lastSeen: pTarget.last_seen 
        });
      }

      const { data: f1 } = await supabase.from('followers').select('id').match({ follower_id: session.user.id, following_id: fromId }).maybeSingle();
      const { data: f2 } = await supabase.from('followers').select('id').match({ follower_id: fromId, following_id: session.user.id }).maybeSingle();
      setRelation({ iFollowThem: !!f1, theyFollowMe: !!f2 });
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

  const updateGroupInfo = async (field: 'name' | 'photo_url', value: string) => {
    if (!groupId || !isOwner) return;
    setIsUpdatingGroup(true);
    const { error } = await supabase.from('groups').update({ [field]: value }).eq('id', groupId);
    if (!error) {
      setHeaderInfo(prev => ({ ...prev, [field === 'name' ? 'title' : 'avatar']: value }));
      showNotif("Grup diperbarui!", "success");
    }
    setIsUpdatingGroup(false);
  };

  const kickMember = async (targetUserId: string, targetName: string) => {
    if (!groupId || !isOwner) return;
    const confirmKick = window.confirm(`Apakah kamu yakin ingin mengeluarkan ${targetName} dari grup?`);
    if (!confirmKick) return;

    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', targetUserId);
    if (!error) {
      setGroupMembers(prev => prev.filter(m => m.user_id !== targetUserId));
      showNotif("Member berhasil dikeluarkan!", "success");
    }
  };

  const handleGroupPhotoUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !isOwner) return;
    
    const objectUrl = URL.createObjectURL(file);
    setHeaderInfo(prev => ({ ...prev, avatar: objectUrl })); 
    
    setIsUpdatingGroup(true);
    const fd = new FormData();
    fd.append("file", file); fd.append("upload_preset", "hopehype_preset");
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: fd });
    const d = await res.json();
    
    if (d.secure_url) {
      updateGroupInfo('photo_url', d.secure_url);
    } else {
      setIsUpdatingGroup(false);
      showNotif("Gagal upload foto", "error");
    }
  };

  const cleanup = () => {
    if (refs.msgChannel.current) supabase.removeChannel(refs.msgChannel.current);
    if (refs.presenceChannel.current) supabase.removeChannel(refs.presenceChannel.current);
    if (refs.globalChannel.current) supabase.removeChannel(refs.globalChannel.current);
    if (refs.lkRoom.current) {
      refs.lkRoom.current.removeAllListeners();
      refs.lkRoom.current.disconnect();
      refs.lkRoom.current = null;
    }
    if (refs.audioCtx.current) refs.audioCtx.current.close();
    clearInterval(refs.callTimer.current);
    clearTimeout(refs.callTimeout.current);
    clearInterval(refs.callInterval.current);
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
          if (newMsg.user_id === user.id) return;

          const msgTextLower = String(newMsg.message).toLowerCase();
          
          if (newMsg.is_system && msgTextLower.includes("memanggil") && newMsg.user_id !== user.id) {
             handleIncomingCall(newMsg);
          }
          if (newMsg.is_system && (
              msgTextLower.includes("panggilan berakhir") || 
              msgTextLower.includes("ditolak") || 
              msgTextLower.includes("tak terjawab") ||
              msgTextLower.includes("dibatalkan") 
          )) {
             endCall(true);
          }
          
          const { data: p } = await supabase.from('profiles').select('username, avatar_url, role').eq('id', newMsg.user_id).single();
          newMsg.profiles = p || undefined;
          setMessages(prev => [...prev, newMsg]);
          
          refs.audio.current?.receive.play().catch(()=>{});
          if (newMsg.status !== 'read') await supabase.from('messages').update({ status: 'read' }).eq('id', newMsg.id);
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

  const sendMessage = async (text?: string, sticker?: string, audio?: string, image?: string) => {
    const content = text || inputValue;
    if (!content && !sticker && !audio && !image) return;
    
    refs.audio.current?.send.play().catch(()=>{});

    if (editMessageId) {
      setMessages(prev => prev.map(m => m.id === editMessageId ? { ...m, message: content } : m));
      await supabase.from('messages').update({ message: content }).eq('id', editMessageId);
      setEditMessageId(null);
      setInputValue('');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      room_id: roomId, 
      user_id: currentUser.id, 
      message: image && !content ? "📸 Mengirim Foto" : audio ? "🎤 Voice Note" : (sticker ? "🎨 Stiker" : content),
      sticker_url: sticker || null, 
      audio_url: audio || null, 
      image_url: image || null, 
      reply_to: replyTo?.id || null, 
      reply_to_msg: replyTo || null,
      profiles: myProfile,
      status: 'sending',
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMsg]);
    setInputValue(''); 
    setReplyTo(null); 
    setIsStickerOpen(false);
    scrollToBottom();

    const { data, error } = await supabase.from('messages').insert([{
      room_id: roomId, 
      user_id: currentUser.id, 
      message: tempMsg.message,
      sticker_url: sticker || null, 
      audio_url: audio || null, 
      image_url: image || null, 
      reply_to: tempMsg.reply_to, 
      status: 'sent'
    }]).select('*, profiles:user_id(*), reply_to_msg:reply_to(id, username, message)').single();
    
    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      if (targetId && !sticker && !audio && !image) {
        supabase.functions.invoke('send-chat-notif', { body: { record: { sender_id: currentUser.id, receiver_id: targetId, content } } });
      }
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      showNotif("Gagal mengirim pesan", "error");
    }
  };

  const handleTyping = (e: any) => {
    setInputValue(e.target.value);
    if (refs.presenceChannel.current && refs.presenceChannel.current.state === 'joined') {
      refs.presenceChannel.current.send({ type: 'broadcast', event: 'typing', payload: { username: myProfile?.username, avatar_url: myProfile?.avatar_url } });
    }
  };

  const handleTerimaRequest = async () => {
    await supabase.from('messages').insert([{
      room_id: roomId, user_id: currentUser.id, message: `Permintaan pesan diterima. Kamu sekarang bisa membalas dan melakukan panggilan.`, is_system: true, status: 'sent'
    }]);
    showNotif("Pesan diterima", "success");
  };

  const handleTolakRequest = async () => {
    await supabase.from('messages').delete().eq('room_id', roomId);
    showNotif("Permintaan obrolan dihapus", "info");
    router.back();
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
        if (vnIsCanceled.current) {
          refs.audioChunks.current = [];
          return;
        }
        
        if (refs.audioChunks.current.length === 0) return;
        const blob = new Blob(refs.audioChunks.current, { type: 'audio/mpeg' });
        const fd = new FormData(); fd.append("file", blob); fd.append("upload_preset", "hopehype_preset"); fd.append("resource_type", "video");
        
        const localUrl = URL.createObjectURL(blob);
        const tempId = `temp-${Date.now()}`;
        setMessages(prev => [...prev, {
          id: tempId, room_id: roomId, user_id: currentUser.id, message: "🎤 Voice Note", audio_url: localUrl, status: 'sending', created_at: new Date().toISOString()
        }]);
        scrollToBottom();

        const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: fd });
        const d = await res.json();
        if (d.secure_url) {
           const { data } = await supabase.from('messages').insert([{
              room_id: roomId, user_id: currentUser.id, message: "🎤 Voice Note", audio_url: d.secure_url, status: 'sent'
           }]).select('*, profiles:user_id(*)').single();
           if(data) setMessages(prev => prev.map(m => m.id === tempId ? data : m));
        }
      };
      refs.mediaRecorder.current.start();
      setIsRecording(true); isRecordingRef.current = true;
      setRecordTime(0);
      refs.recordTimer.current = setInterval(() => setRecordTime(p => p + 1), 1000);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) { 
      setIsMicPressed(false); 
      showNotif(t('mic_error'), "error"); 
    }
  };

  const stopVN = (isCanceledByUser = false) => {
    setIsMicPressed(false); 
    if (!isRecordingRef.current) return;
    
    setIsRecording(false); 
    isRecordingRef.current = false;
    setAudioLevel(0);
    
    if (refs.audioCtx.current) { refs.audioCtx.current.close(); refs.audioCtx.current = null; }
    clearInterval(refs.recordTimer.current);
    
    if (isCanceledByUser || vnIsCanceled.current) { 
      vnIsCanceled.current = true; 
      setCancelAnim(true);
      if (navigator.vibrate) navigator.vibrate(50); 
      setTimeout(() => setCancelAnim(false), 2000);
    } else {
      vnIsCanceled.current = false; 
    }
    
    refs.mediaRecorder.current?.stop();
  };

  const handleMicTouchStart = (e: any) => {
    if (!inputValue.trim() && !editMessageId && !pendingImage) {
      setIsMicPressed(true); 
      vnTouchStartX.current = ('touches' in e) ? e.touches[0].clientX : e.clientX;
      vnIsCanceled.current = false; 
      startVN();
    }
  };

  const handleMicTouchMove = (e: any) => {
    if ((isRecordingRef.current || isMicPressed) && !vnIsCanceled.current) {
      const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
      const diff = vnTouchStartX.current - clientX;
      
      if (diff > 60) { 
        vnIsCanceled.current = true;
        stopVN(true); 
      }
    }
  };

  const handlePhotoClick = () => {
    const allowedRoles = ['verified', 'vip', 'admin', 'developer', 'creator'];
    const userRole = myProfile?.role?.toLowerCase() || 'user';
    
    if (allowedRoles.includes(userRole)) {
      fileInputRef.current?.click();
    } else {
      showNotif("Fitur Kirim Foto khusus member Verified/VIP!", "warning");
    }
  };

  const handlePhotoSelect = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingImage(file);
    setPendingImagePreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const handleSendClick = async () => {
    if (pendingImage) {
      setIsUploadingImg(true);
      try {
        const fd = new FormData(); 
        fd.append("file", pendingImage); 
        fd.append("upload_preset", "hopehype_preset");
        
        const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: fd });
        const d = await res.json();
        
        if (d.secure_url) {
          await sendMessage(inputValue, undefined, undefined, d.secure_url);
        } else {
          showNotif("Gagal upload foto", "error");
        }
      } catch (err) {
        console.error(err);
        showNotif("Terjadi kesalahan saat upload", "error");
      } finally {
        setIsUploadingImg(false);
        setPendingImage(null);
        setPendingImagePreview(null);
      }
    } else {
      sendMessage();
    }
  };

  const startCall = async () => {
    if (callStatus !== 'idle') {
      showNotif("Panggilan sedang berlangsung", "warning");
      return;
    }
    if (!targetId) return;
    
    const { data: pTarget } = await supabase.from('profiles').select('avatar_url').eq('id', targetId).single();
    
    setCallStatus('calling'); 
    setCallData({ partnerName: headerInfo.title, partnerAvatar: pTarget?.avatar_url, seconds: 0, room: roomId });
    
    await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, message: ` Memanggil ${headerInfo.title}...`, is_system: true }]);
    
    clearTimeout(refs.callTimeout.current);
    refs.callTimeout.current = setTimeout(async () => {
      if (callStatusRef.current === 'calling') {
        endCall(true);
        await supabase.from('messages').insert([{ room_id: roomId, user_id: currentUser.id, message: `☎️ Panggilan tak terjawab`, is_system: true }]);
      }
    }, 30000); 
    
    connectLiveKit(roomId);
  };

  const handleIncomingCall = async (msg: any) => {
    if (callStatus !== 'idle') {
      await supabase.from('messages').insert([{ room_id: msg.room_id, user_id: currentUser.id, message: `Sibuk, coba lagi nanti`, is_system: true }]);
      return;
    }
    const { data: p } = await supabase.from('profiles').select('username, avatar_url').eq('id', msg.user_id).single();
    setCallStatus('incoming'); 
    setCallData({ partnerName: p?.username, partnerAvatar: p?.avatar_url, room: msg.room_id, seconds: 0 });
    
    if (refs.audio.current?.ring) {
      refs.audio.current.ring.play().catch(() => console.log("Audio play diblokir"));
    }
  };

  const connectLiveKit = async (rName: string) => {
    try {
      if (refs.lkRoom.current) {
        refs.lkRoom.current.removeAllListeners();
        await refs.lkRoom.current.disconnect();
        refs.lkRoom.current = null;
      }
      
      const { data, error } = await supabase.functions.invoke('get-livekit-token', { 
         body: { username: myProfile?.username, identity: currentUser.id, roomName: rName } 
      });
      if (error || !data) throw new Error("Gagal ambil token");
      
      refs.lkRoom.current = new LiveKit.Room({
         adaptiveStream: true,
         dynacast: true,
      });

      const handleCallConnected = () => {
        if (callStatus === 'connected') return;
        setCallStatus('connected'); 
        clearTimeout(refs.callTimeout.current);
        clearInterval(refs.callInterval.current);
        refs.callInterval.current = setInterval(() => {
          setCallData((p:any) => ({ ...p, seconds: p.seconds + 1 }));
        }, 1000);
      };

      refs.lkRoom.current.on(LiveKit.RoomEvent.ParticipantConnected, handleCallConnected);
      refs.lkRoom.current.on(LiveKit.RoomEvent.ParticipantDisconnected, () => {
        if (!groupId && callStatus === 'connected') endCall(true);
      });
      refs.lkRoom.current.on(LiveKit.RoomEvent.Disconnected, () => {
        if (callStatus !== 'idle') endCall(true);
      });
      refs.lkRoom.current.on(LiveKit.RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === LiveKit.Track.Kind.Audio) {
          const audioElement = document.createElement('audio');
          audioElement.autoplay = true;
          track.attach(audioElement);
        }
      });

      await refs.lkRoom.current.connect("wss://voicegrup-zxmeibkn.livekit.cloud", data.token);
      try {
        await refs.lkRoom.current.localParticipant.setMicrophoneEnabled(true);
      } catch (micErr) {
        showNotif("Harap izinkan akses Mikrofon!", "warning");
      }
      if (refs.lkRoom.current.remoteParticipants.size > 0) handleCallConnected();
    } catch (e: any) { 
      console.error("ConnectLiveKit error:", e);
      showNotif("Panggilan gagal tersambung", "error"); 
      endCall(); 
    }
  };

  const endCall = (silent = false) => {
    if (refs.audio.current?.ring) { 
      refs.audio.current.ring.pause(); 
      refs.audio.current.ring.currentTime = 0; 
    }
    if (refs.lkRoom.current) {
      refs.lkRoom.current.removeAllListeners();
      refs.lkRoom.current.disconnect();
      refs.lkRoom.current = null;
    }
    setCallStatus('idle');
    clearTimeout(refs.callTimeout.current);
    clearInterval(refs.callInterval.current);
    if (!silent) showNotif(t('call_ended'), "info");
  };

  const fetchStickers = async (q="") => {
    const res = await fetch(`https://api.giphy.com/v1/stickers/${q ? 'search' : 'trending'}?api_key=vPUlBU5Qfz2ZygoEtKXVUqmIEAEcIB08&limit=20&rating=g${q ? `&q=${q}` : ''}`);
    const d = await res.json(); setStickers(d.data || []);
  };

  let chatState = 'normal';
  if (targetId && currentUser) {
    const myRawMsgs = messages.filter(m => m.user_id === currentUser.id);
    const partnerRawMsgs = messages.filter(m => m.user_id === targetId);

    if (partnerRawMsgs.length > 0 && myRawMsgs.length === 0 && !relation.iFollowThem) {
      chatState = 'i_must_approve';
    } 
    else if (myRawMsgs.length > 0 && partnerRawMsgs.length === 0 && !relation.theyFollowMe) {
      chatState = 'i_am_blocked_by_request';
    }
  }

  let displayStatus = 'Offline';
  if (typingUser) {
    displayStatus = `${typingUser.username} sedang mengetik...`;
  } else if (targetId) {
    if (onlineCount >= 2) {
      displayStatus = 'Online';
    } else if (headerInfo.lastSeen) {
      displayStatus = `Terakhir dilihat ${formatLastSeen(headerInfo.lastSeen)}`;
    } else {
      displayStatus = 'Offline';
    }
  } else if (groupId) {
    displayStatus = `${onlineCount} anggota sedang online`;
  } else {
    displayStatus = `${onlineCount} hopers sedang online`;
  }

  const canSend = inputValue.trim() || editMessageId || pendingImagePreview;

  return (
    <div className="telegram-chat hype-chat-scope">
      
      <style>{`
        @keyframes pulseCall {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(46, 204, 113, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
        }
        @keyframes slideDownCall {
          from { transform: translate(-50%, -120%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .call-floating-popup {
          position: fixed; top: max(env(safe-area-inset-top, 20px), 20px); left: 50%;
          transform: translateX(-50%); background: rgba(20, 20, 20, 0.95); backdrop-filter: blur(10px);
          border: 1px solid rgba(46, 204, 113, 0.4); border-radius: 24px; padding: 12px 20px;
          display: flex; align-items: center; gap: 15px; z-index: 9999999;
          box-shadow: 0 15px 35px rgba(0,0,0,0.5); width: 90%; max-width: 360px;
          animation: slideDownCall 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .global-call-avatar { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #2ecc71; animation: pulseCallGlobal 1.5s infinite; }
        @keyframes pulseCallGlobal {
          0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.6); }
          70% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
          100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
        }
        .global-call-btn { border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: transform 0.2s; }
        .global-call-btn:active { transform: scale(0.9); }
      `}</style>

      {/* FLOATING CALL */}
      {(callStatus !== 'idle') && (
        <div className="call-floating-popup">
          <img src={callData.partnerAvatar || '/asets/png/profile.webp'} className="global-call-avatar" alt="partner" />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {callData.partnerName}
            </div>
            <div style={{ color: callStatus === 'connected' ? '#888' : '#2ecc71', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {callStatus === 'connected' ? (
                <span>{Math.floor(callData.seconds / 60)}:{String(callData.seconds % 60).padStart(2, '0')}</span>
              ) : (
                <>
                  <span className="material-icons" style={{ fontSize: '12px' }}>ring_volume</span> 
                  {callStatus === 'calling' ? 'Memanggil...' : 'Menghubungi...'}
                </>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {callStatus === 'incoming' && (
              <button className="global-call-btn" style={{ background: '#2ecc71', boxShadow: '0 4px 10px rgba(46, 204, 113, 0.4)' }} onClick={() => { refs.audio.current?.ring.pause(); connectLiveKit(callData.room); }}>
                <span className="material-icons" style={{ fontSize: '20px' }}>call</span>
              </button>
            )}
            <button className="global-call-btn" style={{ background: '#ff4757', boxShadow: '0 4px 10px rgba(255, 71, 87, 0.4)' }} onClick={async () => {
                const currentRoom = callData.room;
                const isIncoming = callStatus === 'incoming';
                const isConnected = callStatus === 'connected';
                endCall(true);
                if (isIncoming) await supabase.from('messages').insert([{ room_id: currentRoom, user_id: currentUser.id, message: `Panggilan Ditolak`, is_system: true }]);
                else if (isConnected) await supabase.from('messages').insert([{ room_id: currentRoom, user_id: currentUser.id, message: `Panggilan berakhir (${Math.floor(callData.seconds / 60)}:${String(callData.seconds % 60).padStart(2, '0')})`, is_system: true }]);
                else await supabase.from('messages').insert([{ room_id: currentRoom, user_id: currentUser.id, message: `Panggilan dibatalkan`, is_system: true }]);
              }}>
              <span className="material-icons" style={{ fontSize: '20px' }}>call_end</span>
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="chat-header">
        <div className="header-left">
          <button className="menu-btn" onClick={() => router.push('/hypetalk')}><span className="material-icons">arrow_back</span></button>
          {targetId && <img src={headerInfo.avatar || '/asets/png/profile.webp'} alt="avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-color)' }} />}
          <div className="header-info">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {headerInfo.title}
              {roomId !== 'room-1' && targetId && headerInfo.role && <span dangerouslySetInnerHTML={{ __html: getUserBadge(headerInfo.role) }} />}
            </h3>
            <div className="status-container">
              {/* STATUS ONLINE / TYPING / LAST SEEN */}
              <span className={displayStatus === 'Online' || displayStatus.includes('mengetik') ? "status-typing" : "status-online"} style={{ color: displayStatus === 'Online' ? '#2ecc71' : '' }}>
                {displayStatus}
              </span>
            </div>
          </div>
        </div>
        <div className="header-right">
          {targetId ? (
            <button className="btn-call" style={{ opacity: chatState === 'normal' ? 1 : 0.3 }} onClick={() => { if (chatState === 'normal') startCall(); else showNotif("Permintaan pesan belum disetujui", "warning"); }}>
              <span className="material-icons">call</span>
            </button>
          ) : groupId ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setGroupModalTab('invite'); setIsGroupSettingsOpen(true); }} style={{ background: 'rgba(29, 161, 242, 0.1)', color: 'var(--primary-blue)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>INVITE</button>
              {isOwner && <button onClick={() => { setGroupModalTab('settings'); setIsGroupSettingsOpen(true); }} style={{ background: 'var(--border-color)', color: 'var(--text-color)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>SETTINGS</button>}
            </div>
          ) : null}
        </div>
      </header>

      {/* MESSAGES */}
      <main className="chat-messages">
        {isLoading ? (
          <div className="chat-loading-screen">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`skeleton-msg ${i % 2 === 0 ? 'left' : 'right'}`}>
                <div className="skeleton-avatar"></div><div className="skeleton-bubble"></div>
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
              <MessageBubble 
                key={msg.id} 
                msg={msg} 
                currentUser={currentUser}
                isMe={msg.user_id === currentUser?.id} 
                onReply={setReplyTo} 
                onDelete={(id:any) => setMsgOptions(messages.find(m => m.id === id))} 
              />
            ))}
            {typingUser && (
              <div className="chat-message other" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '8px', marginBottom: '8px', paddingLeft: '12px' }}>
                <img src={typingUser.avatar_url || "/asets/png/profile.webp"} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginBottom: '2px', border: '1px solid var(--border-color)' }} />
                <div className="content" style={{ display: 'flex', flexDirection: 'column', width: 'fit-content', background: 'var(--bg-panel)', padding: '8px 14px', borderRadius: '14px 14px 14px 4px', border: '1px solid var(--border-color)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary-blue)', marginBottom: '4px' }}>{typingUser.username}</div>
                  <div className="typing-bubble" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '14px' }}>
                    <span style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out' }}></span>
                    <span style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out 0.2s' }}></span>
                    <span style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out 0.4s' }}></span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={refs.scroll} />
      </main>

      <footer className="chat-input-container">
        {chatState === 'i_must_approve' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{headerInfo.title} bukan pengikutmu. Terima pesan untuk membalas dan melakukan panggilan.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleTolakRequest} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#ff4757', color: 'white', fontWeight: 600 }}>Tolak</button>
              <button onClick={handleTerimaRequest} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#1f3cff', color: 'white', fontWeight: 600 }}>Terima</button>
            </div>
          </div>
        ) : chatState === 'i_am_blocked_by_request' ? (
          <div style={{ padding: '20px 15px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Menunggu permintaan pesan diterima oleh {headerInfo.title}.</p>
          </div>
        ) : (
          <>
            {/* 🔥 FIX 1: KEMBALIKAN FITUR STIKER DAN TAMBAHKAN ANIMASI MUNCUL/HILANG 🔥 */}
            <AnimatePresence>
              {isStickerOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  id="sticker-menu"
                >
                  <div className="sticker-search-wrapper"><input placeholder={t('search_sticker')} onChange={(e) => fetchStickers(e.target.value)} /></div>
                  <div id="sticker-list">
                    {stickers.map((s, idx) => (
                      <img 
                        key={idx} 
                        src={s.images.fixed_width_small.url} 
                        alt="sticker" 
                        onClick={() => {
                          sendMessage(undefined, s.images.fixed_width.url);
                          setIsStickerOpen(false); 
                        }} 
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="input-row">
              <div className="input-group-wrapper" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '4px 6px', borderRadius: replyTo || editMessageId || pendingImagePreview ? '16px' : '28px' }}>
                
                <AnimatePresence>
                  {replyTo && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      id="reply-preview-box" 
                      style={{ display: 'flex', background: 'rgba(29, 161, 242, 0.05)', borderRadius: '12px', padding: '8px 12px', marginBottom: '4px', border: '1px solid rgba(29, 161, 242, 0.1)' }}
                    >
                      <div className="reply-content-wrapper" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{color: 'var(--primary-blue)', fontSize: '11px', fontWeight: 'bold'}}>{t('replying_to', { username: replyTo.profiles?.username })}</div>
                        <div style={{fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{replyTo.message || t('media_label')}</div>
                      </div>
                      <div onClick={() => setReplyTo(null)} style={{fontSize: '22px', cursor: 'pointer', color: '#94a3b8'}}>&times;</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 🔥 FIX 2: KEMBALIKAN FITUR PREVIEW FOTO DAN TAMBAHKAN ANIMASI MUNCUL/HILANG 🔥 */}
                <AnimatePresence>
                  {pendingImagePreview && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ padding: '10px', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', position: 'relative', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'center' }}
                    >
                      <img src={pendingImagePreview} style={{ maxHeight: '160px', borderRadius: '8px', border: '1px solid var(--border-color)' }} alt="preview" />
                      <button 
                        onClick={() => { setPendingImage(null); setPendingImagePreview(null); }} 
                        style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <span className="material-icons" style={{fontSize: '18px'}}>close</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  
                  {isRecording ? (
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px', color: '#ff4757', fontWeight: 600, padding: '8px 10px' }}>
                      <span className="online-dot" style={{ background: '#ff4757' }}></span>
                      <span>{Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,'0')}</span>
                      
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '3px', height: '24px', overflow: 'hidden' }}>
                        {[...Array(12)].map((_, i) => (
                           <motion.div 
                             key={i} 
                             animate={{ height: Math.max(4, (audioLevel/255) * 24 + (Math.random() * 6 - 3)) }} 
                             transition={{ duration: 0.1 }}
                             style={{ width: '3px', background: '#ff4757', borderRadius: '2px' }} 
                           />
                        ))}
                      </div>

                      <span style={{ fontSize: '12px', opacity: 0.6 }}>&lt; Geser batal</span>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setIsStickerOpen(!isStickerOpen); if(!isStickerOpen) fetchStickers(); }} style={{ border: 'none', background: 'transparent', padding: '8px', color: 'var(--text-color)', cursor: 'pointer' }}><span className="material-icons">sentiment_satisfied_alt</span></button>
                      <textarea placeholder={t('write_message')} value={inputValue} onChange={handleTyping} style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', outline: 'none', padding: '12px 6px', fontSize: '15px' }} />
                      <button onClick={handlePhotoClick} disabled={isUploadingImg} style={{ border: 'none', background: 'transparent', padding: '8px', color: 'var(--text-color)', cursor: 'pointer', position: 'relative' }}>
                        <span className="material-icons">image</span>
                      </button>
                      <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handlePhotoSelect} />
                    </>
                  )}
                </div>
              </div>
              
              <button 
                id="action-btn" 
                className={canSend ? 'mode-typing' : (isRecording || isMicPressed ? 'is-recording' : '')} 
                onMouseDown={!canSend ? handleMicTouchStart : undefined} 
                onMouseUp={!canSend ? () => stopVN(false) : undefined} 
                onTouchStart={!canSend ? handleMicTouchStart : undefined} 
                onTouchEnd={!canSend ? () => stopVN(false) : undefined} 
                onTouchMove={!canSend ? handleMicTouchMove : undefined} 
                onClick={() => canSend && handleSendClick()}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isUploadingImg ? 'load' : editMessageId ? 'edit' : canSend ? 'send' : 'mic'}
                    initial={{ scale: 0, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.15 }}
                    className="material-icons"
                  >
                    {isUploadingImg ? 'hourglass_empty' : editMessageId ? 'check' : (canSend ? 'send' : 'mic')}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </>
        )}
      </footer>
    </div>
  );
}
