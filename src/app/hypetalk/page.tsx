'use client';

import { useState, useEffect } from 'react'; 
import { useRouter } from 'next/navigation'; 
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import './Hypetalk.css';

export default function HypetalkPage() {
  const router = useRouter();
  
  // --- STATES ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [requestChats, setRequestChats] = useState<any[]>([]); 
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

  // --- STATES BARU (ONLINE STATUS & PRIVASI) ---
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [mutedChats, setMutedChats] = useState<Set<string>>(new Set());
  const [privacySettings, setPrivacySettings] = useState({ 
    show_online: true, 
    last_seen: 'public' // 'public', 'mutuals', 'nobody'
  });
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLimit = localStorage.getItem('doi_limit');
      if (savedLimit) setSisaLimitDoi(parseInt(savedLimit));
    }
    initUser();
  }, []);

  useEffect(() => {
    return () => {
      setIsSidebarOpen(false);
      setActiveModal(null);
    };
  }, []);

  // --- REALTIME ONLINE PRESENCE ---
  useEffect(() => {
    if (!currentUser) return;
    
    const savedMutes = localStorage.getItem(`muted_chats_${currentUser.id}`);
    if (savedMutes) setMutedChats(new Set(JSON.parse(savedMutes)));

    if (!privacySettings.show_online) return;

    const presenceChannel = supabase.channel('global_online_users', {
      config: { presence: { key: currentUser.id } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setOnlineUsers(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [currentUser, privacySettings.show_online]);

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
      setPrivacySettings({
        show_online: profile.show_online !== false, 
        last_seen: profile.last_seen || 'public'
      });
    }

    await loadAllChats(user.id, false);
    subscribeToInbox(user.id);
  };

  const loadAllChats = async (userId: string, isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const { data: followerData } = await supabase.from('followers').select('follower_id').eq('following_id', userId);
      const followerIds = new Set(followerData?.map((f: any) => f.follower_id) || []);

      const waktu24JamLalu = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: allMsgs } = await supabase.from("messages")
        .select("*")
        .gte("created_at", waktu24JamLalu)
        .order("created_at", { ascending: false });

      let mainChats: any[] = [];
      let reqChats: any[] = [];
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

      // --- CHAT GLOBAL ---
      const globalMsgs = allMsgs?.filter(m => m.room_id === 'room-1');
      const lastGlobalMsg = globalMsgs && globalMsgs.length > 0 ? globalMsgs[0] : null;
      
      let globalPreview = 'Obrolan umum komunitas';
      let globalUnread = unreadMap.get('room-1') || 0;
      if (lastGlobalMsg) {
        globalPreview = lastGlobalMsg.sticker_url ? "Mengirim Stiker" : (lastGlobalMsg.audio_url ? "Mengirim Voice Note" : lastGlobalMsg.message);
        if (lastGlobalMsg.user_id === userId) {
          globalPreview = `Anda: ${globalPreview}`;
          globalUnread = 0; 
        }
      }

      mainChats.push({
        id: 'room-1',
        type: 'global',
        name: 'HopeTalk Globe',
        preview: globalPreview,
        time: lastGlobalMsg ? new Date(lastGlobalMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Always',
        sortTime: lastGlobalMsg ? new Date(lastGlobalMsg.created_at).getTime() : Date.now() + 10000,
        unread: globalUnread
      });

      // --- CHAT PRIVATE & REQUESTS ---
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
            
            let currentUnread = unreadMap.get(p.id) || 0;

            if (lastMsg.user_id === userId) {
              msgPreview = `${msgPreview}`; 
              currentUnread = 0;
            }

            const chatItem = {
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
              unread: currentUnread
            };

            const ids = [userId, p.id].sort();
            const roomIdStr = `pv_${ids[0]}_${ids[1]}`;
            const roomMsgs = allMsgs.filter(m => m.room_id === roomIdStr);
            
            const iHaveReplied = roomMsgs.some(m => m.user_id === userId);
            const isFollower = followerIds.has(p.id);

            if (!isFollower && !iHaveReplied) {
              reqChats.push(chatItem);
            } else {
              mainChats.push(chatItem);
            }
          });
        }
      }

      // --- CHAT GROUP ---
      const { data: myGroups } = await supabase.from('group_members').select('group_id, groups(name, photo_url)').eq('user_id', userId);
      if (myGroups) {
        myGroups.forEach((g: any) => {
          if (g.groups) {
            const groupMsgs = allMsgs?.filter(m => m.room_id === `group_${g.group_id}`);
            const lastGroupMsg = groupMsgs && groupMsgs.length > 0 ? groupMsgs[0] : null;
            
            let grpPreview = 'Grup Chat';
            let grpUnread = unreadMap.get(g.group_id) || 0;

            if (lastGroupMsg) {
              grpPreview = lastGroupMsg.sticker_url ? "Mengirim Stiker" : (lastGroupMsg.audio_url ? "Mengirim Voice Note" : lastGroupMsg.message);
              if (lastGroupMsg.user_id === userId) {
                grpPreview = `Anda: ${grpPreview}`;
                grpUnread = 0;
              }
            }

            mainChats.push({
              id: g.group_id,
              type: 'group',
              name: g.groups.name,
              avatar: g.groups.photo_url || '/asets/png/profile.webp',
              preview: grpPreview,
              time: lastGroupMsg ? new Date(lastGroupMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              sortTime: lastGroupMsg ? new Date(lastGroupMsg.created_at).getTime() : Date.now() - 1000,
              unread: grpUnread
            });
          }
        });
      }

      setChats(mainChats.sort((a, b) => b.sortTime - a.sortTime));
      setRequestChats(reqChats.sort((a, b) => b.sortTime - a.sortTime)); 
    } catch (err) {
      console.error(err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  const subscribeToInbox = (userId: string) => {
    const channelName = `inbox-lobby-user-${userId}-${Date.now()}`;
    supabase.channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
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

  const handleSavePrivacy = async () => {
    setIsSavingPrivacy(true);
    try {
      await supabase.from("profiles").update({ 
        show_online: privacySettings.show_online,
        last_seen: privacySettings.last_seen
      }).eq("id", currentUser.id);
      
      showNotif("Pengaturan Privasi tersimpan!", "success");
      closeModal();
    } catch (err) { 
      showNotif("Gagal menyimpan privasi.", "error"); 
    } finally { 
      setIsSavingPrivacy(false); 
    }
  };

  const handleToggleMute = (targetId: string) => {
    setMutedChats(prev => {
      const newMutes = new Set(prev);
      if (newMutes.has(targetId)) {
        newMutes.delete(targetId);
        showNotif("Notifikasi diaktifkan kembali", "success");
      } else {
        newMutes.add(targetId);
        showNotif("Obrolan disenyapkan", "info");
      }
      localStorage.setItem(`muted_chats_${currentUser.id}`, JSON.stringify(Array.from(newMutes)));
      return newMutes;
    });
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

    setTimeout(async () => {
      try {
        const { data: users } = await supabase.from("profiles").select("*").neq("id", currentUser.id).eq("gender", lawanJenis);
        setIsSearchingDoi(false);
        if (!users || users.length === 0) return showNotif("Belum ada kecocokan saat ini.", "info");
        setFoundDoi(users[Math.floor(Math.random() * users.length)]);
        openModal('doi-card');
      } catch (err) { 
        setIsSearchingDoi(false);
      }
    }, 4000);
  };

  const handleSearchAndChat = async () => {
    if (!searchUserId) return;
    const cleanId = searchUserId.replace('#', '').toUpperCase();
    const { data: target } = await supabase.from('profiles').select('id').eq('short_id', cleanId).maybeSingle();
    if (target) router.push(`/hypetalk/room?from=${target.id}`);
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
      router.push(`/hypetalk/room?group=${newGroup.id}&gname=${encodeURIComponent(newGroup.name)}`);
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

    if (chat.type === 'global') router.push('/hypetalk/room');
    else if (chat.type === 'group') router.push(`/hypetalk/room?group=${chat.id}&gname=${encodeURIComponent(chat.name)}`);
    else router.push(`/hypetalk/room?from=${chat.id}`);
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

  const filteredChats = chats.filter(c => (c.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()));

  const renderReadReceipt = (chat: any) => {
    if (!currentUser || chat.lastMsgUserId !== currentUser.id || chat.type !== 'private') return null;
    const isRead = chat.lastMsgStatus === 'read';
    return (
      <span style={{ marginRight: '4px', display: 'flex', alignItems: 'center' }}>
        {isRead ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#00a2ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 12l3 3 7-7" /><path d="M2 12l3 3 7-7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </span>
    );
  };

  return (
    <div className={`telegram-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <style>{`
        .tg-modal-overlay {
          background: rgba(0,0,0,0.85) !important;
          backdrop-filter: blur(5px) !important;
        }

        .wa-profile-card {
          width: 100%;
          max-width: 280px; 
          background: var(--bg-card);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: none;
          animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .wa-profile-img-container {
          width: 100%;
          padding-top: 100%; 
          position: relative;
          background: var(--bg-secondary);
        }
        .wa-profile-img {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          object-fit: cover;
        }
        .wa-profile-name-bar {
          position: absolute;
          bottom: 0; left: 0; width: 100%;
          padding: 24px 16px 12px;
          background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.8));
        }
        .wa-profile-actions {
          display: flex;
          justify-content: space-around;
          padding: 16px 10px;
          background: var(--bg-card);
          border-top: 1px solid var(--border-card);
        }
        .wa-action-btn {
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .wa-action-btn:active { transform: scale(0.9); }

        .doi-search-overlay {
          position: fixed; inset: 0; background: rgba(10,15,20,0.95);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          z-index: 100000; overflow: hidden; backdrop-filter: blur(10px);
        }
        .radar-wrapper {
          position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center;
          margin-bottom: 40px;
        }
        .radar-ring {
          position: absolute; inset: 0; border-radius: 50%; border: 2px solid #1DA1F2;
          opacity: 0; animation: radarPulse 2s linear infinite;
        }
        .radar-ring.delay-1 { animation-delay: 0.6s; }
        .radar-ring.delay-2 { animation-delay: 1.2s; }
        @keyframes radarPulse {
          0% { transform: scale(0.6); opacity: 1; border-width: 3px; }
          100% { transform: scale(2.5); opacity: 0; border-width: 1px; }
        }
        .radar-center-icon {
          font-size: 50px; color: white; z-index: 2; background: linear-gradient(135deg, #1DA1F2, #1f3cff);
          border-radius: 50%; padding: 18px; box-shadow: 0 0 25px rgba(29, 161, 242, 0.6);
        }
        .plane-container {
          position: absolute; inset: -40px; animation: spinOrbit 3s linear infinite; pointer-events: none;
        }
        .plane-container.reverse {
          inset: -70px; animation: spinOrbit 4.5s linear infinite reverse;
        }
        @keyframes spinOrbit { 100% { transform: rotate(360deg); } }
        .plane-svg {
          position: absolute; top: 0; left: 50%; transform: translateX(-50%) rotate(45deg);
          width: 24px; height: 24px; fill: #1DA1F2; filter: drop-shadow(0 0 5px rgba(29,161,242,0.8));
        }
        .search-title-glow {
          position: relative; z-index: 10; font-size: 18px; font-weight: bold; color: white;
          text-shadow: 0 0 15px rgba(29,161,242,0.8); letter-spacing: 1px;
        }

        .message-request-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--bg-secondary);
          margin: 0 16px 10px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .message-request-banner:active { transform: scale(0.98); }
        .req-left { display: flex; align-items: center; gap: 12px; }
        .req-left .material-icons { color: var(--primary); background: var(--primary-soft); padding: 8px; border-radius: 50%; }
        .req-text h4 { margin: 0; font-size: 14px; color: var(--text-main); font-weight: 700; }
        .req-text p { margin: 0; font-size: 12px; color: var(--text-muted); }
        .message-request-banner .arrow { color: var(--text-muted); }

        @keyframes skeletonPulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
        .skeleton-box {
          background-color: var(--border-card, #2a2d31);
          border-radius: 4px;
          animation: skeletonPulse 1.5s infinite ease-in-out;
        }

        /* IOS Toggle Switch CSS */
        .ios-toggle {
          position: relative; width: 44px; height: 24px; appearance: none; background: #444; outline: none; border-radius: 20px; transition: 0.4s; cursor: pointer;
        }
        .ios-toggle:checked { background: #2ecc71; }
        .ios-toggle::before {
          content: ''; position: absolute; width: 20px; height: 20px; border-radius: 50%; top: 2px; left: 2px; background: white; transition: 0.4s; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .ios-toggle:checked::before { transform: translateX(20px); }

        .settings-row {
          display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-card);
        }
        .settings-row:last-child { border-bottom: none; }
      `}</style>

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
        
        {!isLoading && requestChats.length > 0 && !searchQuery && (
          <div className="message-request-banner" onClick={() => router.push('/hypetalk/requests')}>
            <div className="req-left">
              <span className="material-icons">mark_email_unread</span>
              <div className="req-text">
                <h4>Permintaan Pesan</h4>
                <p>{requestChats.length} pesan belum dibalas</p>
              </div>
            </div>
            <span className="material-icons arrow">chevron_right</span>
          </div>
        )}

        {isLoading ? (
          <>
            {[...Array(6)].map((_, index) => (
              <div key={index} className="tg-chat-item" style={{ pointerEvents: 'none' }}>
                <div className="tg-avatar skeleton-box" style={{ borderRadius: '50%' }}></div>
                <div className="tg-chat-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="skeleton-box" style={{ width: '40%', height: '16px' }}></div>
                    <div className="skeleton-box" style={{ width: '30px', height: '12px' }}></div>
                  </div>
                  <div className="skeleton-box" style={{ width: '70%', height: '14px' }}></div>
                </div>
              </div>
            ))}
          </>
        ) : (
          filteredChats.map(chat => {
            const isMuted = mutedChats.has(chat.id);
            const isOnline = onlineUsers.has(chat.id);

            return (
              <div key={chat.id} className="tg-chat-item" onClick={() => handleOpenChat(chat)}>
                <div className="tg-avatar global-avatar" style={{ position: 'relative' }} onClick={(e) => handleAvatarClick(e, chat.id, chat.type)}>
                  {chat.type === 'global' ? <span className="material-icons">public</span> : <img src={chat.avatar || "/asets/png/profile.webp"} className="tg-avatar" alt="av" />}
                  
                  {/* 🔥 ONLINE/OFFLINE INDICATOR (DOT HIJAU/ABU) 🔥 */}
                  {chat.type === 'private' && (
                    <div style={{ 
                      position: 'absolute', bottom: '0px', right: '0px', width: '13px', height: '13px', 
                      backgroundColor: isOnline ? '#2ecc71' : '#8a8b91', // Abu-abu jika tidak aktif
                      borderRadius: '50%', border: '2.5px solid var(--bg-main)', zIndex: 2 
                    }}></div>
                  )}
                </div>

                <div className="tg-chat-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="tg-chat-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <h4 className="tg-name" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                      {chat.name}
                      {chat.type === 'group' && <span className="material-icons" style={{ fontSize: '15px', color: '#1da1f2', marginLeft: '4px' }}>groups</span>}
                      {chat.type === 'private' && <span dangerouslySetInnerHTML={{ __html: getUserBadge(chat.role || 'user') }} style={{ marginLeft: '4px' }} />}
                      {isMuted && <span className="material-icons" style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '6px' }}>notifications_off</span>}
                    </h4>
                    <span className="tg-time" style={{ fontSize: '11px', color: chat.unread > 0 ? '#1DA1F2' : 'var(--text-muted)', fontWeight: chat.unread > 0 ? 'bold' : 'normal', flexShrink: 0, marginLeft: '8px' }}>
                      {chat.time}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="tg-preview-container" style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      {!typingStatus[chat.id] && renderReadReceipt(chat)}
                      <p className="tg-preview" style={{ margin: 0, color: typingStatus[chat.id] ? '#1DA1F2' : 'var(--text-muted)', fontStyle: typingStatus[chat.id] ? 'italic' : 'normal', fontWeight: typingStatus[chat.id] ? 600 : 400, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {typingStatus[chat.id] ? `${typingStatus[chat.id]} sedang mengetik...` : chat.preview}
                      </p>
                    </div>
                    {chat.unread > 0 && !isMuted && (
                      <div style={{ background: '#1DA1F2', color: 'white', borderRadius: '10px', padding: '0 6px', fontSize: '11px', fontWeight: 'bold', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px', flexShrink: 0 }}>
                        {chat.unread}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
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
          
          {/* 🔥 MENU PRIVASI (ICON GEMBOK, PINDAH KE SINI) 🔥 */}
          <button className="menu-item" onClick={() => openModal('privacy-settings')}><span className="material-icons">lock</span> Privasi & Status</button>

          <button className="menu-item btn-cari-doi" onClick={handleCariDoi} style={{ marginTop: '10px' }}><span className="material-icons">favorite</span> Cari Doi Sekarang <span className="limit-badge">{sisaLimitDoi}/10</span></button>
        </div>
      </aside>

      {/* MODAL USER PROFILE (UPDATED DENGAN INFO ICON) */}
      {activeModal === 'user-profile' && selectedProfile && (
        <div className="tg-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={closeModal}>
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
              <button onClick={() => { closeModal(); router.push(`/hypetalk/room?from=${selectedProfile.id}`); }} className="wa-action-btn" style={{ color: '#1da1f2' }}>
                <span className="material-icons" style={{ fontSize: '24px' }}>chat</span> Chat
              </button>
              
              <button onClick={() => setActiveModal('chat-info')} className="wa-action-btn" style={{ color: '#2ecc71' }}>
                <span className="material-icons" style={{ fontSize: '24px' }}>info</span> Info
              </button>

              <button onClick={() => handleBlockUser(selectedProfile.id)} disabled={isBlocking} className="wa-action-btn" style={{ color: '#ff4757', opacity: isBlocking ? 0.5 : 1 }}>
                <span className="material-icons" style={{ fontSize: '24px' }}>block</span> Blokir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 MODAL INFO CHAT (MUTE & MEDIA) 🔥 */}
      {activeModal === 'chat-info' && selectedProfile && (
        <div className="tg-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="tg-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={selectedProfile.avatar_url || "/asets/png/profile.webp"} style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }} />
                <h3 style={{ margin: 0 }}>Info {selectedProfile.username}</h3>
              </div>
              <button className="close-modal-btn" onClick={() => setActiveModal('user-profile')}><span className="material-icons">arrow_back</span></button>
            </div>
            
            <div className="settings-row" style={{ marginTop: '10px' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '15px' }}>Senyapkan Notifikasi</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mute pesan dari obrolan ini</span>
              </div>
              <input type="checkbox" className="ios-toggle" checked={mutedChats.has(selectedProfile.id)} onChange={() => handleToggleMute(selectedProfile.id)} />
            </div>

            <div className="settings-row" style={{ padding: '16px 0', borderBottom: 'none' }}>
              <button 
                onClick={() => { closeModal(); router.push(`/hypetalk/media?userId=${selectedProfile.id}`); }} 
                style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', color: 'var(--text-main)', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-icons" style={{ color: '#1f3cff' }}>perm_media</span>
                  <span style={{ fontWeight: '600' }}>Media, Tautan, dan Dokumen</span>
                </div>
                <span className="material-icons" style={{ color: 'var(--text-muted)' }}>chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 MODAL PRIVASI DAN STATUS ONLINE 🔥 */}
      {activeModal === 'privacy-settings' && (
        <div className="tg-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="tg-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Privasi & Status</h3><button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button></div>
            
            <div className="settings-row" style={{ marginTop: '10px' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '15px' }}>Tampilkan Status Online</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Munculkan titik hijau saat Anda aktif</span>
              </div>
              <input 
                type="checkbox" 
                className="ios-toggle" 
                checked={privacySettings.show_online} 
                onChange={(e) => setPrivacySettings({ ...privacySettings, show_online: e.target.checked })} 
              />
            </div>

            <div style={{ padding: '15px 0', borderBottom: '1px solid var(--border-card)' }}>
              <strong style={{ display: 'block', fontSize: '15px', marginBottom: '8px' }}>Siapa yang bisa melihat "Terakhir Dilihat"?</strong>
              <div className="input-group" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '4px 10px' }}>
                <span className="material-icons" style={{ color: 'var(--text-muted)' }}>visibility</span>
                <select 
                  value={privacySettings.last_seen} 
                  onChange={(e) => setPrivacySettings({ ...privacySettings, last_seen: e.target.value })}
                  style={{ width: '100%', background: 'transparent', color: 'var(--text-main)', border: 'none', padding: '10px', outline: 'none' }}
                >
                  <option value="public">Semua Orang</option>
                  <option value="mutuals">Hanya Teman (Saling Mengikuti)</option>
                  <option value="nobody">Tidak Ada</option>
                </select>
              </div>
            </div>

            <button className="action-btn" style={{ marginTop: '20px' }} onClick={handleSavePrivacy} disabled={isSavingPrivacy}>Simpan Pengaturan</button>
          </div>
        </div>
      )}

      {activeModal === 'doi-card' && foundDoi && (
        <div className="tg-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="tg-modal-content doi-result-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Kecocokan Ditemukan!</h3><button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="doi-profile-box" style={{ padding: '10px 0', textAlign: 'center' }}>
              <img src={foundDoi.avatar_url || "/asets/png/profile.webp"} alt="Doi" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #1DA1F2', boxShadow: '0 0 15px rgba(29, 161, 242, 0.3)', marginBottom: '12px' }} />
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 15px 0', color: 'var(--text-main)' }}>{foundDoi.username}, {foundDoi.umur || '??'}</h2>
              <div className="doi-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
                {foundDoi.pekerjaan && <span className="d-tag" style={{ background: 'var(--bg-secondary)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>{foundDoi.pekerjaan}</span>}
                {foundDoi.hobi && <span className="d-tag" style={{ background: 'var(--bg-secondary)', color: '#dc2626', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>{foundDoi.hobi}</span>}
                {foundDoi.zodiak && <span className="d-tag" style={{ background: 'var(--bg-secondary)', color: '#d97706', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>{foundDoi.zodiak}</span>}
                {!foundDoi.pekerjaan && !foundDoi.hobi && !foundDoi.zodiak && <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Belum mengisi bio lengkap</span>}
              </div>
            </div>
            <button className="action-btn love-btn" onClick={() => router.push(`/hypetalk/room?from=${foundDoi.id}`)} style={{ width: '100%', background: 'linear-gradient(135deg, #1DA1F2, #1f3cff)', borderRadius: '15px', fontWeight: '800', color: 'white', padding: '14px', border: 'none' }}>Chat Sekarang </button>
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

      {isSearchingDoi && (
        <div className="doi-search-overlay">
          <div className="radar-wrapper">
            <div className="radar-ring"></div>
            <div className="radar-ring delay-1"></div>
            <div className="radar-ring delay-2"></div>
            <span className="material-icons radar-center-icon">person_search</span>
            <div className="plane-container">
              <svg className="plane-svg" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </div>
            <div className="plane-container reverse">
              <svg className="plane-svg" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </div>
          </div>
          <h3 className="search-title-glow">Mencari kecocokan..</h3>
        </div>
      )}
    </div>
  );
}
