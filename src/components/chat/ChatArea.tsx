'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif, getUserBadge } from '@/lib/ui-utils'; 
import * as LiveKit from 'livekit-client';
import { useTranslation } from 'react-i18next';
import './ChatArea.css';

// Import komponen UI yang sudah dipisah
import ChatCallPopup from './ChatCallPopup';
import ChatHeader from './ChatHeader';
import ChatMessageList from './ChatMessageList';
import ChatInputFooter from './ChatInputFooter';
import ChatModals from './ChatModals';

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
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

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
      setMessages(prev => prev.map(m => m.id === editMessageId ? { ...m, message: content, is_edited: true } : m));
      await supabase.from('messages').update({ message: content, is_edited: true }).eq('id', editMessageId);
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

  const handleEditMessage = (msg: any) => {
    if (!msg) return;
    setEditMessageId(msg.id);
    setInputValue(msg.message);
    setMsgOptions(null); 
  };

  const handleDeleteMessage = async (msgOrId: any, type: 'for_me' | 'for_everyone' = 'for_me') => {
    const targetMsg = typeof msgOrId === 'object' ? msgOrId : messages.find(m => m.id === msgOrId);
    if (!targetMsg) return;

    const confirmDelete = window.confirm("Apakah kamu yakin ingin menghapus pesan ini?");
    if (!confirmDelete) return;

    if (type === 'for_everyone') {
      // Perbarui state lokal secara instan untuk soft-delete
      setMessages(prev => prev.map(m => m.id === targetMsg.id ? { ...m, message: 'Pesan ini telah dihapus', is_deleted: true } : m));
      await supabase.from('messages').update({ message: 'Pesan ini telah dihapus', is_deleted: true }).eq('id', targetMsg.id);
      showNotif("Pesan berhasil dihapus untuk semua orang", "success");
    } else {
      // Hapus hanya dari visual state lokal atau db personal (jika dihandle kolom terpisah)
      setMessages(prev => prev.filter(m => m.id !== targetMsg.id));
      showNotif("Pesan dihapus untuk Anda", "success");
    }
    setMsgOptions(null);
  };

  const toggleSelectMessage = (id: string) => {
    setSelectedMessages(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const selectAllMessages = () => {
    setSelectedMessages(messages.map(m => m.id));
  };

  const handleBulkDelete = async () => {
    if (selectedMessages.length === 0) return;
    const confirmDelete = window.confirm(`Apakah kamu yakin ingin menghapus ${selectedMessages.length} pesan?`);
    if (!confirmDelete) return;

    setMessages(prev => prev.map(m => selectedMessages.includes(m.id) ? { ...m, message: 'Pesan ini telah dihapus', is_deleted: true } : m));

    const { error } = await supabase.from('messages')
      .update({ message: 'Pesan ini telah dihapus', is_deleted: true })
      .in('id', selectedMessages);

    if (error) {
      showNotif("Gagal menghapus pesan massal", "error");
    } else {
      showNotif("Pesan massal berhasil dihapus", "success");
    }

    setIsSelectionMode(false);
    setSelectedMessages([]);
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
      <ChatCallPopup 
        callStatus={callStatus} callData={callData} refs={refs} 
        connectLiveKit={connectLiveKit} endCall={endCall} currentUser={currentUser} 
      />

      <ChatHeader 
        router={router} targetId={targetId} headerInfo={headerInfo} 
        displayStatus={displayStatus} chatState={chatState} roomId={roomId}
        groupId={groupId} isOwner={isOwner} setGroupModalTab={setGroupModalTab} 
        setIsGroupSettingsOpen={setIsGroupSettingsOpen} startCall={startCall}
        isSelectionMode={isSelectionMode} setIsSelectionMode={setIsSelectionMode}
        selectAllMessages={selectAllMessages} handleBulkDelete={handleBulkDelete}
        selectedMessages={selectedMessages}
      />

      <ChatMessageList 
        isLoading={isLoading} 
        t={t} 
        messages={messages} 
        currentUser={currentUser} 
        setReplyTo={setReplyTo} 
        setMsgOptions={setMsgOptions} 
        typingUser={typingUser} 
        refs={refs}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        router={router}
        isSelectionMode={isSelectionMode}
        selectedMessages={selectedMessages}
        toggleSelectMessage={toggleSelectMessage}
        setIsSelectionMode={setIsSelectionMode} 
      />

      <ChatInputFooter 
        chatState={chatState} headerInfo={headerInfo} handleTolakRequest={handleTolakRequest} 
        handleTerimaRequest={handleTerimaRequest} isStickerOpen={isStickerOpen} 
        setIsStickerOpen={setIsStickerOpen} fetchStickers={fetchStickers} t={t} 
        stickers={stickers} sendMessage={sendMessage} replyTo={replyTo} setReplyTo={setReplyTo} 
        isRecording={isRecording} recordTime={recordTime} audioLevel={audioLevel} 
        inputValue={inputValue} handleTyping={handleTyping} handlePhotoClick={handlePhotoClick} 
        isUploadingImg={isUploadingImg} fileInputRef={fileInputRef} handlePhotoSelect={handlePhotoSelect} 
        canSend={canSend} handleMicTouchStart={handleMicTouchStart} stopVN={stopVN} 
        handleMicTouchMove={handleMicTouchMove} handleSendClick={handleSendClick} editMessageId={editMessageId}
      />

      <ChatModals 
        pendingImagePreview={pendingImagePreview} setPendingImage={setPendingImage} 
        setPendingImagePreview={setPendingImagePreview} setImageCaption={setImageCaption} 
        imageCaption={imageCaption} handleSendImageFullScreen={handleSendImageFullScreen} 
        isUploadingImg={isUploadingImg} isGroupSettingsOpen={isGroupSettingsOpen} 
        setIsGroupSettingsOpen={setIsGroupSettingsOpen} groupModalTab={groupModalTab} 
        inviteSearch={inviteSearch} setInviteSearch={setInviteSearch} handleAddMember={handleAddMember} 
        isUpdatingGroup={isUpdatingGroup} groupMembers={groupMembers} currentUser={currentUser} 
        headerInfo={headerInfo} handleGroupPhotoUpload={handleGroupPhotoUpload} newGroupName={newGroupName} 
        setNewGroupName={setNewGroupName} updateGroupInfo={updateGroupInfo} isOwner={isOwner} kickMember={kickMember}
      />
    </div>
  );
}
