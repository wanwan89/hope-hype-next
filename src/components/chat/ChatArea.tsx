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
  
  // Tangkap 3 tipe parameter panggilan
  const autoCall = searchParams?.get('autoCall');
  const answerCall = searchParams?.get('answerCall');
  const incomingCall = searchParams?.get('incomingCall');

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
  const [imageCaption, setImageCaption] = useState(''); 
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
    let pName = 'User';
    let pAvatar = '/asets/png/profile.webp';

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
        pName = pTarget.username;
        pAvatar = pTarget.avatar_url;
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
    await fetchMessages(currentRoom, session.user.id); 
    setupRealtime(currentRoom, session.user, prof);

    const { data: lastMsg } = await supabase.from('messages')
      .select('*').eq('room_id', currentRoom).order('created_at', { ascending: false }).limit(1).maybeSingle();
    
    const lastMsgText = lastMsg?.message?.toLowerCase() || '';
    const isCallStillActive = lastMsg?.is_system && lastMsgText.includes("memanggil") && lastMsg?.user_id !== session.user.id;

    if (autoCall === 'true' && currentRoom !== 'room-1') {
      setCallStatus('calling');
      setCallData({ partnerName: pName, partnerAvatar: pAvatar, seconds: 0, room: currentRoom });
      connectLiveKit(currentRoom);
    } else if (answerCall === 'true' && currentRoom !== 'room-1' && isCallStillActive) {
      setCallStatus('incoming'); 
      setCallData({ partnerName: pName, partnerAvatar: pAvatar, seconds: 0, room: currentRoom });
      connectLiveKit(currentRoom); 
    } else if (incomingCall === 'true' && currentRoom !== 'room-1' && isCallStillActive) {
      setCallStatus('incoming');
      setCallData({ partnerName: pName, partnerAvatar: pAvatar, seconds: 0, room: currentRoom });
      if (refs.audio.current?.ring) refs.audio.current.ring.play().catch(() => {});
    }
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

  const fetchMessages = async (room: string, userId: string) => {
    setIsLoading(true);
    
    const { data, error } = await supabase.from('messages')
      .select('*')
      .eq('room_id', room)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (data) {
      const reversedData = data.reverse();
      const userIds = [...new Set(reversedData.map(m => m.user_id))];
      const { data: profs } = await supabase.from('profiles').select('id, username, avatar_url, role').in('id', userIds);
      const profMap = profs?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {}) || {};
      
      const enrichedData = reversedData.map(m => ({ ...m, profiles: profMap[m.user_id] }));
      setMessages(enrichedData);

      if (room.startsWith('pv_')) {
        const unreadIds = enrichedData
          .filter(m => m.user_id !== userId && m.status !== 'read')
          .map(m => m.id);
          
        if (unreadIds.length > 0) {
          await supabase.from('messages').update({ status: 'read' }).in('id', unreadIds);
        }
      }
    } else if (error) {
      console.error("Gagal load pesan:", error);
    }
    
    setIsLoading(false);
    scrollToBottom();
  };

  const setupRealtime = (room: string, user: any, prof: any) => {
    refs.msgChannel.current = supabase.channel(`msg-${room}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as any;

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
          
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) {
              return prev.map(m => m.id === newMsg.id ? newMsg : m);
            }
            if (newMsg.user_id === user.id) {
              const tempMsg = prev.find(m => String(m.id).startsWith('temp-') && m.message === newMsg.message);
              if (tempMsg) {
                 return prev.map(m => m.id === tempMsg.id ? newMsg : m);
              }
            }
            return [...prev, newMsg];
          });
          
          if (newMsg.user_id !== user.id) {
            refs.audio.current?.receive.play().catch(()=>{});
          }
          
          if (room.startsWith('pv_') && newMsg.status !== 'read' && newMsg.user_id !== user.id) {
             await supabase.from('messages').update({ status: 'read' }).eq('id', newMsg.id);
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
    }]).select().single();
    
    if (!error && data) {
      data.profiles = myProfile; 
      data.reply_to_msg = tempMsg.reply_to_msg; 
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      
      if (targetId && !sticker && !audio && !image) {
        supabase.functions.invoke('send-chat-notif', { 
          body: { record: { sender_id: currentUser.id, receiver_id: targetId, content: content, type: 'chat', room_id: roomId } } 
        });
      }
    } else {
      console.error("Gagal ngirim pesan detail:", error);
      setTimeout(() => {
        setMessages(prev => {
          const stillTemp = prev.find(m => m.id === tempId);
          if (stillTemp) {
             showNotif("Pesan gagal terkirim", "error");
             return prev.filter(m => m.id !== tempId);
          }
          return prev;
        });
      }, 3000);
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
      room_id: roomId, user_id: currentUser.id, message: `Permintaan pesan diterima.`, is_system: true, status: 'sent'
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
           const { data, error } = await supabase.from('messages').insert([{
              room_id: roomId, user_id: currentUser.id, message: "🎤 Voice Note", audio_url: d.secure_url, status: 'sent'
           }]).select().single(); 
           
           if(data && !error) {
             data.profiles = myProfile;
             setMessages(prev => prev.map(m => m.id === tempId ? data : m));
           } else {
             setTimeout(() => setMessages(prev => prev.filter(m => m.id !== tempId)), 3000);
           }
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
    setImageCaption(''); 
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const handleSendImageFullScreen = async () => {
    if (!pendingImage) return;
    setIsUploadingImg(true);
    try {
      const fd = new FormData(); 
      fd.append("file", pendingImage); 
      fd.append("upload_preset", "hopehype_preset");
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: fd });
      const d = await res.json();
      
      if (d.secure_url) {
        await sendMessage(imageCaption, undefined, undefined, d.secure_url);
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
      setImageCaption('');
    }
  };

  const handleSendClick = async () => {
    sendMessage();
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

    if (targetId) {
      supabase.functions.invoke('send-chat-notif', { 
        body: { record: { sender_id: currentUser.id, receiver_id: targetId, content: "📞 Memanggil...", type: 'call', room_id: roomId } } 
      });
    }
    
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

  const canSend = inputValue.trim() || editMessageId;

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
        
        .slim-input-wrapper {
          display: flex;
          align-items: flex-end;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 24px; 
          padding: 6px 12px;
          flex: 1;
          gap: 4px;
        }
        .slim-input-wrapper textarea {
          flex: 1;
          resize: none;
          border: none;
          background: transparent;
          outline: none;
          color: var(--text-color);
          font-size: 15px;
          line-height: 20px;
          max-height: 100px;
          padding: 6px 0;
        }
        .action-icon-btn {
          border: none;
          background: transparent;
          color: var(--text-muted);
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 50%;
          transition: background 0.2s, color 0.2s;
        }
        .action-icon-btn:active {
          background: rgba(255,255,255,0.1);
        }
        .action-icon-btn .material-icons {
          font-size: 24px;
        }
        .send-btn-round {
          background: var(--primary-blue);
          border: none;
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 8px;
          box-shadow: 0 4px 10px rgba(31, 60, 255, 0.3);
          transition: transform 0.2s;
        }
        .send-btn-round:active {
          transform: scale(0.9);
        }
      `}</style>

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
              <button onClick={() => { setGroupModalTab('invite'); setIsGroupSettingsOpen(true); }} style={{ background: 'rgba(29, 161, 242, 0.1)', color: 'var(--primary-blue)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>INVITE</button>
              {isOwner && <button onClick={() => { setGroupModalTab('settings'); setIsGroupSettingsOpen(true); }} style={{ background: 'var(--border-color)', color: 'var(--text-color)', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>SETTINGS</button>}
            </div>
          ) : null}
        </div>
      </header>

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
            {messages.map((msg, idx) => {
              const isUnread = msg.user_id !== currentUser?.id && msg.status !== 'read';
              let isFirstUnread = false;
              if (isUnread) {
                 const prevMsg = messages[idx + 1]; 
                 if (!prevMsg || prevMsg.status === 'read' || prevMsg.user_id === currentUser?.id) {
                    isFirstUnread = true;
                 }
              }

          // GANTI JADI SEPERTI INI
          let showDateSeparator = false;
          if (idx === 0) {
            // Selalu munculkan separator di pesan paling pertama
            showDateSeparator = true; 
          } else {
            const prevMsg = messages[idx - 1];
            
            // Cek perubahan hari
            const currDate = new Date(msg.created_at).toDateString();
            const prevDate = new Date(prevMsg.created_at).toDateString();
            
            // Cek selisih waktu
            const prevTime = new Date(prevMsg.created_at).getTime();
            const currTime = new Date(msg.created_at).getTime();
            const diffInHours = (currTime - prevTime) / (1000 * 60 * 60);

            // Munculkan separator jika beda hari ATAU jaraknya 5 jam lebih
            if (currDate !== prevDate || diffInHours >= 5) {
              showDateSeparator = true;
            }
          }

              return (
                <MessageBubble 
                  key={msg.id} 
                  msg={msg} 
                  currentUser={currentUser}
                  isMe={msg.user_id === currentUser?.id} 
                  onReply={setReplyTo} 
                  onDelete={(id:any) => setMsgOptions(messages.find(m => m.id === id))} 
                  isFirstUnread={isFirstUnread}
                  unreadCount={isFirstUnread ? messages.filter(m => m.user_id !== currentUser?.id && m.status !== 'read').length : 0}
                  showDateSeparator={showDateSeparator}
                />
              );
            })}
            
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

      <footer className="chat-input-container" style={{ padding: '8px 10px', background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)' }}>
        {chatState === 'i_must_approve' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{headerInfo.title} bukan pengikutmu. Terima pesan untuk membalas dan melakukan panggilan.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleTolakRequest} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#ff4757', color: 'white', fontWeight: 600 }}>Tolak</button>
              <button onClick={handleTerimaRequest} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#1f3cff', color: 'white', fontWeight: 600 }}>Terima</button>
            </div>
          </div>
        ) : chatState === 'i_am_blocked_by_request' ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Menunggu permintaan pesan diterima oleh {headerInfo.title}.</p>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {isStickerOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  id="sticker-menu" style={{ position: 'absolute', bottom: '100%', left: '10px', right: '10px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 -4px 15px rgba(0,0,0,0.1)', padding: '10px', zIndex: 10 }}
                >
                  <div className="sticker-search-wrapper"><input placeholder={t('search_sticker')} onChange={(e) => fetchStickers(e.target.value)} /></div>
                  <div id="sticker-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginTop: '10px' }}>
                    {stickers.map((s, idx) => (
                      <img 
                        key={idx} src={s.images.fixed_width_small.url} alt="sticker" 
                        style={{ width: '100%', height: 'auto', borderRadius: '8px', cursor: 'pointer' }}
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

            <AnimatePresence>
              {replyTo && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  style={{ display: 'flex', background: 'rgba(29, 161, 242, 0.05)', borderRadius: '12px', padding: '8px 12px', marginBottom: '8px', border: '1px solid rgba(29, 161, 242, 0.1)', position: 'relative' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{color: 'var(--primary-blue)', fontSize: '11px', fontWeight: 'bold'}}>{t('replying_to', { username: replyTo.profiles?.username })}</div>
                    <div style={{fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{replyTo.message || t('media_label')}</div>
                  </div>
                  <div onClick={() => setReplyTo(null)} style={{fontSize: '22px', cursor: 'pointer', color: '#94a3b8', padding: '0 5px'}}>&times;</div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}>
              
              {isRecording ? (
                <div className="slim-input-wrapper" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px', color: '#ff4757', fontWeight: 600 }}>
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
                    <span style={{ fontSize: '11px', opacity: 0.6, whiteSpace: 'nowrap' }}>&lt; Geser batal</span>
                  </div>
                </div>
              ) : (
                <div className="slim-input-wrapper">
                  {/* Ikon stiker yang dibuat selalu warna biru tema */}
                  <button className="action-icon-btn" onClick={() => { setIsStickerOpen(!isStickerOpen); if(!isStickerOpen) fetchStickers(); }}>
                    <span className="material-icons" style={{ color: 'var(--primary-blue)' }}>sentiment_satisfied_alt</span>
                  </button>
                  
                  <textarea 
                    placeholder="Tulis pesan..." 
                    value={inputValue} 
                    onChange={handleTyping} 
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                    }}
                  />
                  
                  {/* FIX: Ikon lampiran diubah menjadi icon kamera SVG */}
                  <button className="action-icon-btn" onClick={handlePhotoClick} disabled={isUploadingImg}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </button>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handlePhotoSelect} />
                </div>
              )}
              
              <button 
                className="send-btn-round"
                onMouseDown={!canSend ? handleMicTouchStart : undefined} 
                onMouseUp={!canSend ? () => stopVN(false) : undefined} 
                onTouchStart={!canSend ? handleMicTouchStart : undefined} 
                onTouchEnd={!canSend ? () => stopVN(false) : undefined} 
                onTouchMove={!canSend ? handleMicTouchMove : undefined} 
                onClick={() => canSend && handleSendClick()}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={editMessageId ? 'edit' : canSend ? 'send' : 'mic'}
                    initial={{ scale: 0, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.15 }}
                    className="material-icons"
                    style={{ fontSize: '20px' }}
                  >
                    {editMessageId ? 'check' : (canSend ? 'send' : 'mic')}
                  </motion.span>
                </AnimatePresence>
              </button>

            </div>
          </>
        )}
      </footer>

      <AnimatePresence>
        {pendingImagePreview && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ 
              position: 'fixed', inset: 0, background: 'var(--bg-main)', zIndex: 9999999, 
              display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
              <button onClick={() => { setPendingImage(null); setPendingImagePreview(null); setImageCaption(''); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <span className="material-icons" style={{fontSize: '28px'}}>close</span>
              </button>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>Kirim Foto</span>
              <div style={{width: '28px'}}></div>
            </div>

            <div style={{ flex: 1, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={pendingImagePreview} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="preview full" />
            </div>

            {/* FIX: Layout khusus form chat saat edit/preview foto dirapihkan agar tidak tertutup */}
            <div style={{ padding: '12px 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div className="slim-input-wrapper" style={{ flex: 1, background: 'var(--bg-secondary)' }}>
                <textarea 
                  placeholder="Tambahkan keterangan..." 
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  rows={1}
                  style={{ width: '100%', padding: '8px 4px', fontSize: '15px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                  }}
                  autoFocus
                />
              </div>
              <button 
                onClick={handleSendImageFullScreen} 
                disabled={isUploadingImg}
                className="send-btn-round"
              >
                {isUploadingImg ? (
                   <span className="material-icons" style={{ animation: 'spinLoading 1s linear infinite' }}>autorenew</span>
                ) : (
                   <span className="material-icons">send</span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGroupSettingsOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setIsGroupSettingsOpen(false)}
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'relative', background: 'var(--bg-main)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '85vh' }}
            >
              <div style={{ width: '40px', height: '5px', background: 'var(--border-color)', borderRadius: '10px', margin: '0 auto 10px' }} />
              
              <h3 style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {groupModalTab === 'invite' ? 'Tambah Anggota' : 'Pengaturan Grup'}
                <span className="material-icons" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsGroupSettingsOpen(false)}>close</span>
              </h3>

              <div style={{ overflowY: 'auto', paddingRight: '4px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {groupModalTab === 'invite' ? (
                  <>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        placeholder="Username atau #ShortID" 
                        value={inviteSearch} 
                        onChange={e => setInviteSearch(e.target.value)} 
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-color)', outline: 'none' }}
                      />
                      <button 
                        onClick={handleAddMember} 
                        disabled={isUpdatingGroup || !inviteSearch.trim()}
                        style={{ background: 'var(--primary-blue)', color: 'white', border: 'none', padding: '0 20px', borderRadius: '12px', fontWeight: 'bold', opacity: (isUpdatingGroup || !inviteSearch.trim()) ? 0.7 : 1, cursor: 'pointer' }}
                      >
                        Tambah
                      </button>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--text-muted)' }}>Daftar Anggota ({groupMembers.length})</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {groupMembers.map(m => (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '12px' }}>
                            <img src={m.profiles?.avatar_url || '/asets/png/profile.webp'} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="avatar"/>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{m.profiles?.username}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.user_id === currentUser?.id ? 'Kamu' : 'Member'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                      <div style={{ position: 'relative' }}>
                        <img src={headerInfo.avatar || '/asets/png/profile.webp'} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} alt="group avatar" />
                        <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary-blue)', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <span className="material-icons" style={{ fontSize: '16px' }}>edit</span>
                          <input type="file" hidden accept="image/*" onChange={handleGroupPhotoUpload} disabled={isUpdatingGroup} />
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        <input 
                          value={newGroupName} 
                          onChange={e => setNewGroupName(e.target.value)} 
                          style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-color)', textAlign: 'center', fontWeight: 'bold' }}
                        />
                        <button 
                          onClick={() => updateGroupInfo('name', newGroupName)} 
                          disabled={isUpdatingGroup || newGroupName === headerInfo.title || !newGroupName.trim()}
                          style={{ background: 'var(--primary-blue)', color: 'white', border: 'none', padding: '0 20px', borderRadius: '12px', fontWeight: 'bold', opacity: (isUpdatingGroup || newGroupName === headerInfo.title) ? 0.7 : 1, cursor: 'pointer' }}
                        >
                          Simpan
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--text-muted)' }}>Manajemen Anggota</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {groupMembers.map(m => (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '12px' }}>
                            <img src={m.profiles?.avatar_url || '/asets/png/profile.webp'} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="avatar"/>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{m.profiles?.username}</div>
                            </div>
                            {isOwner && m.user_id !== currentUser?.id && (
                              <button 
                                onClick={() => kickMember(m.user_id, m.profiles?.username)}
                                style={{ background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Keluarkan
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
