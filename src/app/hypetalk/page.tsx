'use client';

import { useState, useEffect, useRef } from 'react'; 
import { useRouter } from 'next/navigation'; 
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import * as LiveKit from 'livekit-client'; 
import './Hypetalk.css';

export default function HypetalkPage() {
  const router = useRouter();
  
  // --- STATES ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [sisaLimitDoi, setSisaLimitDoi] = useState(10);
  const [isSearchingDoi, setIsSearchingDoi] = useState(false);
  const [foundDoi, setFoundDoi] = useState<any>(null);
  const [bioForm, setBioForm] = useState({ umur: '', gender: 'Pria', zodiak: '', pekerjaan: '', hobi: '' });
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [searchUserId, setSearchUserId] = useState(''); 
  const [groupName, setGroupName] = useState(''); 

  const [typingStatus, setTypingStatus] = useState<Record<string, string>>({});

  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isBlocking, setIsBlocking] = useState(false);
  const [floatingAvatars, setFloatingAvatars] = useState<string[]>([]); // untuk efek doi

  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callData, setCallData] = useState<any>({ seconds: 0, partnerId: null, partnerName: '', partnerAvatar: '', roomId: '' });
  const refs = {
    audio: useRef<{ ring: HTMLAudioElement } | null>(null),
    lkRoom: useRef<LiveKit.Room | null>(null),
    callTimeout: useRef<any>(null),
    callInterval: useRef<any>(null)
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLimit = localStorage.getItem('doi_limit');
      if (savedLimit) setSisaLimitDoi(parseInt(savedLimit));
      refs.audio.current = { ring: new Audio("/asets/sound/call.wav") };
      if (refs.audio.current.ring) refs.audio.current.ring.loop = true;
    }
    initUser();
  }, []);

  useEffect(() => {
    return () => {
      setIsSidebarOpen(false);
      setActiveModal(null);
      endCall(true);
    };
  }, []);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setCurrentUser({ ...user, ...profile });

    if (profile) {
      setBioForm({
        umur: profile.umur || '',
        gender: profile.gender || 'Pria',
        zodiak: profile.zodiak || '',
        pekerjaan: profile.pekerjaan || '',
        hobi: profile.hobi || ''
      });
    }

    await loadAllChats(user.id, false);
    subscribeToInbox(user.id);
  };

  const loadAllChats = async (userId: string, isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const waktu24JamLalu = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: allMsgs } = await supabase.from("messages")
        .select("*")
        .gte("created_at", waktu24JamLalu)
        .order("created_at", { ascending: false });

      let finalChats: any[] = [];
      const unreadMap = new Map();

      allMsgs?.forEach(msg => {
        if (msg.status !== 'read' && msg.user_id !== userId) {
          let targetRoomId = msg.room_id;
          if (msg.room_id.startsWith('pv_')) {
            const pId = msg.room_id.replace("pv_", "").split("_").find((id: string) => id !== userId);
            if (pId) targetRoomId = pId;
          } else if (msg.room_id.startsWith('group_')) {
            targetRoomId = msg.room_id.replace("group_", "");
          }
          unreadMap.set(targetRoomId, (unreadMap.get(targetRoomId) || 0) + 1);
        }
      });

      const globalMsgs = allMsgs?.filter(m => m.room_id === 'room-1');
      const lastGlobalMsg = globalMsgs && globalMsgs.length > 0 ? globalMsgs[0] : null;
      finalChats.push({
        id: 'room-1',
        type: 'global',
        name: 'HopeTalk Globe',
        preview: lastGlobalMsg ? (lastGlobalMsg.sticker_url ? "Mengirim Stiker" : (lastGlobalMsg.audio_url ? "Mengirim Voice Note" : lastGlobalMsg.message)) : 'Obrolan umum komunitas',
        time: lastGlobalMsg ? new Date(lastGlobalMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Always',
        sortTime: lastGlobalMsg ? new Date(lastGlobalMsg.created_at).getTime() : Date.now() + 10000,
        unread: unreadMap.get('room-1') || 0
      });

      if (allMsgs) {
        const lastPvMap = new Map();
        allMsgs.filter(m => m.room_id.startsWith('pv_') && m.room_id.includes(userId)).forEach(msg => {
          const pId = msg.room_id.replace("pv_", "").split("_").find((id: string) => id !== userId);
          if (pId && !lastPvMap.has(pId)) lastPvMap.set(pId, msg);
        });
        const partnerIds = Array.from(lastPvMap.keys());
        if (partnerIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, role").in("id", partnerIds);
          profiles?.forEach(p => {
            const lastMsg = lastPvMap.get(p.id);
            let msgPreview = lastMsg.message;
            if (lastMsg.sticker_url) msgPreview = "Mengirim Stiker";
            if (lastMsg.audio_url) msgPreview = "Mengirim Voice Note";
            finalChats.push({
              id: p.id,
              type: 'private',
              name: p.username,
              avatar: p.avatar_url,
              role: p.role,
              preview: msgPreview,
              lastMsgUserId: lastMsg.user_id,
              lastMsgStatus: lastMsg.status,
              time: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              sortTime: new Date(lastMsg.created_at).getTime(),
              unread: unreadMap.get(p.id) || 0
            });
          });
        }
      }

      const { data: myGroups } = await supabase.from('group_members').select('group_id, groups(name, photo_url)').eq('user_id', userId);
      if (myGroups) {
        myGroups.forEach((g: any) => {
          if (g.groups) {
            const groupMsgs = allMsgs?.filter(m => m.room_id === `group_${g.group_id}`);
            const lastGroupMsg = groupMsgs && groupMsgs.length > 0 ? groupMsgs[0] : null;
            finalChats.push({
              id: g.group_id,
              type: 'group',
              name: g.groups.name,
              avatar: g.groups.photo_url || '/asets/png/profile.webp',
              preview: lastGroupMsg ? (lastGroupMsg.sticker_url ? "Mengirim Stiker" : (lastGroupMsg.audio_url ? "Mengirim Voice Note" : lastGroupMsg.message)) : 'Grup Chat',
              time: lastGroupMsg ? new Date(lastGroupMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              sortTime: lastGroupMsg ? new Date(lastGroupMsg.created_at).getTime() : Date.now() - 1000,
              unread: unreadMap.get(g.group_id) || 0
            });
          }
        });
      }

      setChats(finalChats.sort((a, b) => b.sortTime - a.sortTime));
    } catch (err) {
      console.error(err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  // 🔥 FIX 1: PENDETEKSI TELPON MASUK DI HALAMAN UTAMA 🔥
  const subscribeToInbox = (userId: string) => {
    const channelName = `inbox-lobby-user-${userId}-${Date.now()}`;
    supabase.channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: any) => {
        const newMsg = payload.new;
        if (newMsg && newMsg.room_id?.includes(userId)) {
          // Telpon Masuk
          if (newMsg.is_system && newMsg.message.includes("Memanggil") && newMsg.user_id !== userId) {
            handleIncomingCall(newMsg);
          }
          // Telpon Berakhir
          if (newMsg.is_system && (newMsg.message.includes("Panggilan berakhir") || newMsg.message.includes("Ditolak") || newMsg.message.includes("tak terjawab"))) {
            endCall(true);
          }
        }
        loadAllChats(userId, true);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        loadAllChats(userId, true);
      })
      .subscribe();
  };

  const roomIdsStr = chats.map(c => c.id).sort().join(',');
  useEffect(() => {
    if (!currentUser || chats.length === 0) return;

    const channels = chats.map(chat => {
      let roomIdStr = '';
      if (chat.type === 'global') roomIdStr = 'room-1';
      else if (chat.type === 'group') roomIdStr = `group_${chat.id}`;
      else {
        const ids = [currentUser.id, chat.id].sort();
        roomIdStr = `pv_${ids[0]}_${ids[1]}`;
      }
      return supabase.channel(`presence-${roomIdStr}`)
        .on('broadcast', { event: 'typing' }, (p: any) => {
          if (p.payload.username !== currentUser.username) {
            setTypingStatus(prev => ({ ...prev, [chat.id]: p.payload.username }));
            setTimeout(() => {
              setTypingStatus(prev => {
                const newStat = { ...prev };
                delete newStat[chat.id];
                return newStat;
              });
            }, 3000);
          }
        })
        .subscribe();
    });
    return () => { channels.forEach(c => c && supabase.removeChannel(c)); };
  }, [roomIdsStr, currentUser]);

  const openModal = (modalName: string) => { setActiveModal(modalName); setIsSidebarOpen(false); };
  const closeModal = () => setActiveModal(null);

  const handleSaveBio = async () => {
    setIsSavingBio(true);
    try {
      const updateData = { ...bioForm, umur: Number(bioForm.umur) || null };
      await supabase.from("profiles").update(updateData).eq("id", currentUser.id);
      showNotif("Profil tersimpan!", "success");
      setCurrentUser((prev: any) => ({ ...prev, ...updateData }));
      closeModal();
    } catch (err) { showNotif("Gagal simpan.", "error"); }
    finally { setIsSavingBio(false); }
  };

  const handleCariDoi = async () => {
    if (sisaLimitDoi <= 0) return openModal('limit-doi');
    if (!currentUser?.gender) return openModal('bio');
    const newLimit = sisaLimitDoi - 1;
    setSisaLimitDoi(newLimit);
    localStorage.setItem('doi_limit', String(newLimit));
    setIsSidebarOpen(false);
    setIsSearchingDoi(true);
    const lawanJenis = currentUser.gender === "Pria" ? "Wanita" : "Pria";

    // Efek floating avatars: ambil 8 avatar random dari database
    try {
      const { data: randomUsers } = await supabase
        .from('profiles')
        .select('avatar_url')
        .neq('id', currentUser.id)
        .limit(8);
      if (randomUsers && randomUsers.length > 0) {
        const urls = randomUsers.map(u => u.avatar_url).filter(Boolean);
        setFloatingAvatars(urls);
      } else {
        // Fallback default avatar jika database sepi
        setFloatingAvatars(Array(8).fill('/asets/png/profile.webp'));
      }
    } catch(e) { 
      setFloatingAvatars(Array(8).fill('/asets/png/profile.webp'));
    }

    setTimeout(async () => {
      try {
        const { data: users } = await supabase.from("profiles").select("*").neq("id", currentUser.id).eq("gender", lawanJenis);
        setIsSearchingDoi(false);
        setFloatingAvatars([]);
        if (!users || users.length === 0) return showNotif("Belum ada kecocokan saat ini.", "info");
        setFoundDoi(users[Math.floor(Math.random() * users.length)]);
        openModal('doi-card');
      } catch (err) { 
        setIsSearchingDoi(false);
        setFloatingAvatars([]);
      }
    }, 4000);
  };

  const handleSearchAndChat = async () => {
    if (!searchUserId) return;
    const cleanId = searchUserId.replace('#', '').toUpperCase();
    const { data: target } = await supabase.from('profiles').select('id').eq('short_id', cleanId).maybeSingle();
    if (target) router.push(`/hypetalk/chat?from=${target.id}`);
    else showNotif("ID tidak ditemukan", "error");
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return showNotif("Nama grup tidak boleh kosong", "error");
    try {
      const { data: newGroup, error } = await supabase.from('groups').insert([{ name: groupName, created_by: currentUser.id }]).select().single();
      if (error) throw error;
      await supabase.from('group_members').insert([{ group_id: newGroup.id, user_id: currentUser.id }]);
      showNotif("Grup berhasil dibuat!", "success");
      closeModal();
      router.push(`/hypetalk/chat?group=${newGroup.id}&gname=${encodeURIComponent(newGroup.name)}`);
    } catch (err) { showNotif("Gagal membuat grup", "error"); }
  };

  const handleOpenChat = async (chat: any) => {
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
    let roomIdToRead = '';
    if (chat.type === 'global') roomIdToRead = 'room-1';
    else if (chat.type === 'group') roomIdToRead = `group_${chat.id}`;
    else {
      const ids = [currentUser.id, chat.id].sort();
      roomIdToRead = `pv_${ids[0]}_${ids[1]}`;
    }
    supabase.from('messages')
      .update({ status: 'read' })
      .eq('room_id', roomIdToRead)
      .neq('user_id', currentUser.id)
      .neq('status', 'read')
      .then();

    if (chat.type === 'global') router.push('/hypetalk/room-1');
    else if (chat.type === 'group') router.push(`/hypetalk/chat?group=${chat.id}&gname=${encodeURIComponent(chat.name)}`);
    else router.push(`/hypetalk/chat?from=${chat.id}`);
  };

  const handleAvatarClick = async (e: React.MouseEvent, chatId: string, chatType: string) => {
    e.stopPropagation();
    if (chatType !== 'private') return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', chatId).single();
      if (data && !error) {
        setSelectedProfile(data);
        openModal('user-profile');
      }
    } catch (err) {
      showNotif("Gagal mengambil data profil", "error");
    }
  };

  const handleBlockUser = async (targetId: string) => {
    if (!confirm("Yakin ingin memblokir user ini? Obrolan akan hilang dari daftar.")) return;
    setIsBlocking(true);
    try {
      const { error } = await supabase.from('blocked_users').insert({ blocker_id: currentUser.id, blocked_id: targetId });
      if (error) {
        if (error.code === '23505') showNotif("User sudah diblokir sebelumnya", "info");
        else throw error;
      } else {
        showNotif("User berhasil diblokir", "success");
        closeModal();
        setChats(prev => prev.filter(c => c.id !== targetId));
      }
    } catch (err) {
      showNotif("Gagal memblokir user", "error");
    } finally {
      setIsBlocking(false);
    }
  };

  // ==================== CALL LOGIC STABIL ====================
  const startCallFromLobby = async (targetProfile: any) => {
    if (!currentUser) return;
    if (callStatus !== 'idle') {
      showNotif("Panggilan sedang berlangsung", "warning");
      return;
    }
    const ids = [currentUser.id, targetProfile.id].sort();
    const callRoomId = `pv_${ids[0]}_${ids[1]}`;
    setCallStatus('calling');
    setCallData({
      partnerId: targetProfile.id,
      partnerName: targetProfile.username,
      partnerAvatar: targetProfile.avatar_url,
      seconds: 0,
      roomId: callRoomId
    });
    await supabase.from('messages').insert([{ 
      room_id: callRoomId, 
      user_id: currentUser.id, 
      message: `Memanggil ${targetProfile.username}...`, 
      is_system: true 
    }]);
    clearTimeout(refs.callTimeout.current);
    refs.callTimeout.current = setTimeout(async () => {
      setCallStatus(prev => {
        if (prev !== 'connected') {
          endCall(true);
          supabase.from('messages').insert([{ 
            room_id: callRoomId, 
            user_id: currentUser.id, 
            message: `Panggilan tak terjawab`, 
            is_system: true 
          }]);
        }
        return prev;
      });
    }, 30000);
    connectLiveKit(callRoomId, targetProfile.id);
  };

  const handleIncomingCall = async (msg: any) => {
    if (callStatus !== 'idle') {
      await supabase.from('messages').insert([{ room_id: msg.room_id, user_id: currentUser.id, message: `Sibuk, coba lagi nanti`, is_system: true }]);
      return;
    }
    const { data: p } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', msg.user_id).single();
    setCallStatus('incoming'); 
    setCallData({ 
      partnerId: p?.id,
      partnerName: p?.username, 
      partnerAvatar: p?.avatar_url, 
      roomId: msg.room_id, 
      seconds: 0 
    });
    refs.audio.current?.ring.play().catch(()=>{});
  };

  const connectLiveKit = async (rName: string, partnerId?: string) => {
    if (!currentUser) return;
    try {
      if (refs.lkRoom.current) {
        refs.lkRoom.current.removeAllListeners();
        await refs.lkRoom.current.disconnect();
        refs.lkRoom.current = null;
      }
      const { data, error } = await supabase.functions.invoke('get-livekit-token', {
        body: { username: currentUser.username, identity: currentUser.id, roomName: rName }
      });
      if (error || !data) throw new Error("Gagal ambil token");
      refs.lkRoom.current = new LiveKit.Room({ adaptiveStream: true, dynacast: true });
      const handleCallConnected = () => {
        if (callStatus === 'connected') return;
        setCallStatus('connected');
        clearTimeout(refs.callTimeout.current);
        clearInterval(refs.callInterval.current);
        refs.callInterval.current = setInterval(() => {
          setCallData((p: any) => ({ ...p, seconds: p.seconds + 1 }));
        }, 1000);
      };
      refs.lkRoom.current.on(LiveKit.RoomEvent.ParticipantConnected, handleCallConnected);
      refs.lkRoom.current.on(LiveKit.RoomEvent.ParticipantDisconnected, (participant) => {
        if (participant.identity !== currentUser.id && callStatus === 'connected') {
          endCall(true);
        }
      });
      refs.lkRoom.current.on(LiveKit.RoomEvent.Disconnected, () => {
        if (callStatus !== 'idle' && callStatus !== 'calling') {
          endCall(true);
        }
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
    if (callStatus === 'idle') return;
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
    if (!silent) showNotif('Panggilan berakhir', "info");
  };

  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className={`telegram-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <style>{`
        @keyframes pulseCall {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(46, 204, 113, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
        }
        /* Floating call di ATAS */
        .call-overlay {
          position: fixed;
          top: 80px;
          left: 20px;
          right: 20px;
          background: var(--bg-panel);
          backdrop-filter: blur(12px);
          border-radius: 28px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          z-index: 10000;
          border: 1px solid rgba(255,255,255,0.2);
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .call-overlay .call-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .call-overlay .call-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #2ecc71;
        }
        .anim-calling-avatar {
          animation: pulseCall 1.2s infinite;
        }
        .call-duration {
          font-family: monospace;
          font-size: 16px;
          font-weight: bold;
        }
        .call-actions {
          display: flex;
          gap: 12px;
        }
        .call-btn-end, .call-btn-accept {
          border: none;
          border-radius: 40px;
          padding: 6px 16px;
          color: white;
          font-weight: bold;
          cursor: pointer;
        }
        .call-btn-end { background: #ff4757; }
        .call-btn-accept { background: #2ecc71; }

        /* 🔥 FIX 2: MODAL PROFIL KECIL ALA WA & SOLID BACKGROUND 🔥 */
        .tg-modal-overlay {
          background: rgba(0,0,0,0.65) !important; /* Gelap pekat, tidak tembus */
          backdrop-filter: blur(4px) !important;
        }
        .wa-profile-card {
          width: 100%;
          max-width: 270px;
          background: var(--bg-panel);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0,0,0,0.4);
          animation: fadeInModal 0.2s ease;
        }
        .wa-profile-img-container {
          width: 100%;
          padding-top: 100%; /* Bikin Kotak (Aspect Ratio 1:1) */
          position: relative;
          background: var(--border-color);
        }
        .wa-profile-img {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          object-fit: cover;
        }
        .wa-profile-name-bar {
          position: absolute;
          bottom: 0; left: 0; width: 100%;
          padding: 15px 15px;
          background: linear-gradient(transparent, rgba(0,0,0,0.85));
        }
        .wa-profile-actions {
          display: flex;
          justify-content: space-around;
          padding: 15px 10px;
          background: var(--bg-panel);
        }
        .wa-action-btn {
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        /* 🔥 FIX 3: EFEK DOI AVATAR MELAYANG 🔥 */
        .doi-search-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.85);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          z-index: 100000; overflow: hidden;
        }
        .floating-avatars {
          position: absolute; inset: 0; pointer-events: none;
        }
        .floating-avatar {
          position: absolute;
          width: 60px; height: 60px; border-radius: 50%; object-fit: cover;
          opacity: 0; border: 2px solid white; box-shadow: 0 0 15px rgba(0,0,0,0.4);
          animation: floatAround 4s linear infinite;
        }
        @keyframes floatAround {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          20% { opacity: 0.9; }
          80% { opacity: 0.9; }
          100% { opacity: 0; transform: translate(var(--tx, 150px), var(--ty, -150px)) scale(1.2); }
        }
        .search-title-glow {
          position: relative; z-index: 10; font-size: 20px; font-weight: bold; color: white;
          text-shadow: 0 0 10px rgba(255,71,87,0.8); margin-top: 20px;
        }
      `}</style>

      {/* TAMPILAN PANGGILAN CALLING / INCOMING */}
      {(callStatus === 'calling' || callStatus === 'incoming') && (
        <div className="call-overlay">
          <div className="call-info">
            <img src={callData.partnerAvatar || '/asets/png/profile.webp'} className={`call-avatar ${callStatus === 'calling' ? 'anim-calling-avatar' : ''}`} alt="avatar" />
            <div>
              <div style={{ fontWeight: 'bold' }}>{callData.partnerName}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>{callStatus === 'calling' ? 'Memanggil...' : 'Menghubungi...'}</div>
            </div>
          </div>
          <div className="call-actions">
            {callStatus === 'incoming' && (
              <button className="call-btn-accept" onClick={() => { refs.audio.current?.ring.pause(); connectLiveKit(callData.roomId, callData.partnerId); }}>Terima</button>
            )}
            <button className="call-btn-end" onClick={() => endCall()}>Tutup</button>
          </div>
        </div>
      )}

      {/* FLOATING CALL SAAT SUDAH TERHUBUNG */}
      {callStatus === 'connected' && (
        <div className="call-overlay">
          <div className="call-info">
            <div style={{ width: 10, height: 10, background: '#2ecc71', borderRadius: '50%', animation: 'pulseCall 1.5s infinite' }}></div>
            <img src={callData.partnerAvatar || '/asets/png/profile.webp'} className="call-avatar" alt="partner" />
            <div>
              <div style={{ fontWeight: 'bold' }}>{callData.partnerName}</div>
              <div className="call-duration">
                {Math.floor(callData.seconds / 60)}:{String(callData.seconds % 60).padStart(2, '0')}
              </div>
            </div>
          </div>
          <button className="call-btn-end" onClick={() => {
            endCall();
            const ids = [currentUser.id, callData.partnerId].sort();
            const room = `pv_${ids[0]}_${ids[1]}`;
            supabase.from('messages').insert([{ 
              room_id: room, 
              user_id: currentUser.id, 
              message: `Panggilan berakhir (${Math.floor(callData.seconds / 60)}:${String(callData.seconds % 60).padStart(2, '0')})`, 
              is_system: true 
            }]);
          }}>Akhiri</button>
        </div>
      )}

      <header className="tg-header">
        <div className="tg-header-top">
          <div className="tg-header-left">
            <button className="icon-btn" onClick={() => setIsSidebarOpen(true)}>
              <span className="material-icons">menu</span>
            </button>
            <h2>Hypetalk</h2>
          </div>
        </div>
        <div className="tg-search-container">
          <div className="tg-search-box">
            <span className="material-icons">search</span>
            <input type="text" placeholder="Cari obrolan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </header>

      <main className="tg-chat-list">
        {isLoading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="tg-chat-item skeleton-chat">
              <div className="tg-avatar skeleton-shimmer"></div>
              <div className="tg-chat-info" style={{ flex: 1 }}>
                <div className="tg-chat-top">
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '14px' }}></div>
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '30px', height: '10px' }}></div>
                </div>
                <div className="skeleton-line skeleton-shimmer" style={{ width: '70%', height: '12px', marginTop: '8px' }}></div>
              </div>
            </div>
          ))
        ) : (
          filteredChats.map(chat => (
            <div key={chat.id} className="tg-chat-item" onClick={() => handleOpenChat(chat)}>
              <div className="tg-avatar global-avatar" onClick={(e) => handleAvatarClick(e, chat.id, chat.type)}>
                {chat.type === 'global' ? <span className="material-icons">public</span> : <img src={chat.avatar || "/asets/png/profile.webp"} className="tg-avatar" alt="av" />}
              </div>
              <div className="tg-chat-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="tg-chat-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h4 className="tg-name" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--tg-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                    {chat.name}
                    {chat.type === 'group' && <span className="material-icons" style={{ fontSize: '15px', color: '#1da1f2', marginLeft: '4px' }}>groups</span>}
                    {chat.type === 'private' && <span dangerouslySetInnerHTML={{ __html: getUserBadge(chat.role || 'user') }} style={{ marginLeft: '4px' }} />}
                  </h4>
                  <span className="tg-time" style={{ fontSize: '11px', color: chat.unread > 0 ? '#1DA1F2' : 'var(--tg-text-muted)', fontWeight: chat.unread > 0 ? 'bold' : 'normal', flexShrink: 0, marginLeft: '8px' }}>
                    {chat.time}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="tg-preview-container" style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <p className="tg-preview" style={{ margin: 0, color: typingStatus[chat.id] ? '#1DA1F2' : 'var(--tg-text-muted)', fontStyle: typingStatus[chat.id] ? 'italic' : 'normal', fontWeight: typingStatus[chat.id] ? 600 : 400, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {typingStatus[chat.id] ? `${typingStatus[chat.id]} sedang mengetik...` : chat.preview}
                    </p>
                  </div>
                  {chat.unread > 0 && (
                    <div style={{ background: '#1DA1F2', color: 'white', borderRadius: '10px', padding: '0 6px', fontSize: '11px', fontWeight: 'bold', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px', flexShrink: 0 }}>
                      {chat.unread}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {!activeModal && !isSearchingDoi && (
        <button className="tg-fab" onClick={() => openModal('search')}><span className="material-icons">chat</span></button>
      )}

      <div className={`tg-sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <aside className={`tg-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img className="side-avatar" src={currentUser?.avatar_url || "/asets/png/profile.webp"} alt="me" />
          <div className="sidebar-user-info">
            <h3 className="side-username">{currentUser?.username || "User"}</h3>
            <p className="side-id">#{currentUser?.short_id || "0000"}</p>
          </div>
          <button className="btn-edit-bio" onClick={() => openModal('bio')}>Edit Biodata</button>
        </div>
        <div className="sidebar-menu">
          <button className="menu-item" onClick={() => openModal('group')}><span className="material-icons">group_add</span> Buat Grup Baru</button>
          <button className="menu-item btn-cari-doi" onClick={handleCariDoi}><span className="material-icons">favorite</span> Cari Doi Sekarang <span className="limit-badge">{sisaLimitDoi}/10</span></button>
        </div>
      </aside>

      {/* MODAL USER PROFILE (KOTAK KECIL ALA WA) */}
      {activeModal === 'user-profile' && selectedProfile && (
        <div className="tg-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '20px' }} onClick={closeModal}>
          <div className="wa-profile-card" onClick={(e) => e.stopPropagation()}>
            <div className="wa-profile-img-container">
              <img src={selectedProfile.avatar_url || "/asets/png/profile.webp"} alt="Profile" className="wa-profile-img" />
              <div className="wa-profile-name-bar">
                <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  {selectedProfile.username}{selectedProfile.umur ? `, ${selectedProfile.umur}` : ''}
                </h2>
                {selectedProfile.pekerjaan && <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '2px' }}>{selectedProfile.pekerjaan}</div>}
              </div>
            </div>
            <div className="wa-profile-actions">
              <button onClick={() => { closeModal(); router.push(`/hypetalk/chat?from=${selectedProfile.id}`); }} className="wa-action-btn" style={{ color: '#1da1f2' }}>
                <span className="material-icons" style={{ fontSize: '24px' }}>chat</span> Chat
              </button>
              <button onClick={() => { closeModal(); startCallFromLobby(selectedProfile); }} className="wa-action-btn" style={{ color: '#2ecc71' }}>
                <span className="material-icons" style={{ fontSize: '24px' }}>call</span> Telpon
              </button>
              <button onClick={() => handleBlockUser(selectedProfile.id)} disabled={isBlocking} className="wa-action-btn" style={{ color: '#ff4757', opacity: isBlocking ? 0.5 : 1 }}>
                <span className="material-icons" style={{ fontSize: '24px' }}>block</span> Blokir
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'doi-card' && foundDoi && (
        <div className="tg-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="tg-modal-content doi-result-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Kecocokan Ditemukan!</h3><button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="doi-profile-box" style={{ padding: '10px 0', textAlign: 'center' }}>
              <img src={foundDoi.avatar_url || "/asets/png/profile.webp"} alt="Doi" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #ff4757', boxShadow: '0 0 15px rgba(255, 71, 87, 0.3)', marginBottom: '12px' }} />
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 15px 0', color: 'var(--tg-text)' }}>{foundDoi.username}, {foundDoi.umur || '??'}</h2>
              <div className="doi-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
                {foundDoi.pekerjaan && <span className="d-tag" style={{ background: 'var(--tg-bg-secondary)', color: 'var(--tg-primary)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>{foundDoi.pekerjaan}</span>}
                {foundDoi.hobi && <span className="d-tag" style={{ background: 'var(--tg-bg-secondary)', color: '#dc2626', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>{foundDoi.hobi}</span>}
                {foundDoi.zodiak && <span className="d-tag" style={{ background: 'var(--tg-bg-secondary)', color: '#d97706', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>{foundDoi.zodiak}</span>}
                {!foundDoi.pekerjaan && !foundDoi.hobi && !foundDoi.zodiak && <span style={{ color: 'var(--tg-text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Belum mengisi bio lengkap</span>}
              </div>
            </div>
            <button className="action-btn love-btn" onClick={() => router.push(`/hypetalk/chat?from=${foundDoi.id}`)} style={{ width: '100%', background: 'linear-gradient(135deg, #ff4757, #ff7755)', borderRadius: '15px', fontWeight: '800' }}>Gas Chat</button>
          </div>
        </div>
      )}

      {activeModal === 'search' && (
        <div className="tg-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="tg-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Mulai Chat Baru</h3><button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="input-group">
              <span className="material-icons">tag</span>
              <input type="text" placeholder="ID teman (Contoh: ABCD)" value={searchUserId} onChange={e => setSearchUserId(e.target.value)} />
            </div>
            <button className="action-btn" onClick={handleSearchAndChat}>Cari dan Chat</button>
          </div>
        </div>
      )}

      {activeModal === 'group' && (
        <div className="tg-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="tg-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Buat Grup Baru</h3><button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="input-group">
              <span className="material-icons">groups</span>
              <input type="text" placeholder="Nama Grup (Max 20 Karakter)..." maxLength={20} value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
            <button className="action-btn" onClick={handleCreateGroup}>Buat dan Mulai Obrolan</button>
          </div>
        </div>
      )}

      {activeModal === 'bio' && (
        <div className="tg-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="tg-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Edit Biodata</h3><button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="form-grid">
              <div className="input-group"><input type="number" placeholder="Umur" value={bioForm.umur} onChange={e => setBioForm({ ...bioForm, umur: e.target.value })} /></div>
              <div className="input-group"><select value={bioForm.gender} onChange={e => setBioForm({ ...bioForm, gender: e.target.value })}><option value="Pria">Pria</option><option value="Wanita">Wanita</option></select></div>
              <input type="text" className="input-group" placeholder="Pekerjaan" value={bioForm.pekerjaan} onChange={e => setBioForm({ ...bioForm, pekerjaan: e.target.value })} />
              <input type="text" className="input-group" placeholder="Hobi" value={bioForm.hobi} onChange={e => setBioForm({ ...bioForm, hobi: e.target.value })} />
              <input type="text" className="input-group" placeholder="Zodiak" value={bioForm.zodiak} onChange={e => setBioForm({ ...bioForm, zodiak: e.target.value })} />
            </div>
            <button className="action-btn" onClick={handleSaveBio} disabled={isSavingBio}>Simpan</button>
          </div>
        </div>
      )}

      {/* ANIMASI DOI (TANPA ICON SISTEM) */}
      {isSearchingDoi && (
        <div className="doi-search-overlay">
          <div className="floating-avatars">
            {floatingAvatars.map((url, idx) => {
              const randomX = (Math.random() - 0.5) * (typeof window !== 'undefined' ? window.innerWidth : 400) * 1.5;
              const randomY = (Math.random() - 0.5) * (typeof window !== 'undefined' ? window.innerHeight : 600) * 1.5;
              const duration = 2.5 + Math.random() * 2;
              return (
                <img
                  key={idx}
                  src={url}
                  className="floating-avatar"
                  style={{
                    left: 'calc(50% - 30px)',
                    top: 'calc(50% - 30px)',
                    '--tx': `${randomX}px`,
                    '--ty': `${randomY}px`,
                    animationDuration: `${duration}s`,
                    animationDelay: `${idx * 0.2}s`
                  } as React.CSSProperties}
                  alt="floating"
                />
              );
            })}
          </div>
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Radar glow ringan di tengah */}
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid rgba(255, 71, 87, 0.8)', animation: 'pulseCall 1.5s infinite' }}></div>
            <h3 className="search-title-glow">Mencari kecocokan..</h3>
          </div>
        </div>
      )}
    </div>
  );
}
