'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import './Hypetalk.css';

// Import komponen anak
import HypetalkHeader from './_components/HypetalkHeader';
import ChatList from './_components/ChatList';
import HypetalkSidebar from './_components/HypetalkSidebar';
import UserProfileModal from './_components/UserProfileModal';
import ChatInfoModal from './_components/ChatInfoModal';
import PrivacySettingsModal from './_components/PrivacySettingsModal';
import HypeMatchOverlay from './_components/HypeMatchOverlay'; // Diubah dari DoiCardModal
import SearchModal from './_components/SearchModal';
import GroupModal from './_components/GroupModal';
import BioModal from './_components/BioModal';
import DoiSearchingOverlay from './_components/DoiSearchingOverlay';

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
  const [isSearchingDoi, setIsSearchingDoi] = useState(false);
  const [potentialMatches, setPotentialMatches] = useState<any[]>([]); // Menyimpan daftar lawan jenis
  const [isHypeMatchOpen, setIsHypeMatchOpen] = useState(false); // Mengatur overlay swipe kartu
  const [bioForm, setBioForm] = useState({ umur: '', gender: 'Pria', zodiak: '', pekerjaan: '', hobi: '' });
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [searchUserId, setSearchUserId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [typingStatus, setTypingStatus] = useState<Record<string, string>>({});
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isBlocking, setIsBlocking] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [mutedChats, setMutedChats] = useState<Set<string>>(new Set());
  const [privacySettings, setPrivacySettings] = useState({
    show_online: true,
    last_seen: 'public'
  });
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  // ========== LIFECYCLE & INIT ==========
  useEffect(() => {
    initUser();
  }, []);

  useEffect(() => {
    return () => {
      setIsSidebarOpen(false);
      setActiveModal(null);
    };
  }, []);

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
            if (lastMsg.user_id === userId) currentUnread = 0;
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
    } catch (err) { console.error(err); }
    finally { if (!isBackground) setIsLoading(false); }
  };

  const subscribeToInbox = (userId: string) => {
    const channelName = `inbox-lobby-user-${userId}-${Date.now()}`;
    supabase.channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => { loadAllChats(userId, true); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => { loadAllChats(userId, true); })
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

  // ========== HANDLER FUNCTIONS ==========
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
    } catch (err) { showNotif("Gagal menyimpan privasi.", "error"); }
    finally { setIsSavingPrivacy(false); }
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

  // --- LOGIK BARU HYPE MATCH ---
  const handleHypeMatch = async () => {
    if (!currentUser?.gender) return openModal('bio');
    
    setIsSidebarOpen(false);
    setIsSearchingDoi(true); // Memunculkan Radar Animasi bawaanmu
    const lawanJenis = currentUser.gender === "Pria" ? "Wanita" : "Pria";

    // Beri jeda 3 detik biar efek radar berputar dulu, lalu ambil data dari Supabase
    setTimeout(async () => {
      try {
        const { data: users } = await supabase
          .from("profiles")
          .select("*")
          .neq("id", currentUser.id)
          .eq("gender", lawanJenis);

        setIsSearchingDoi(false); // Matikan radar

        if (!users || users.length === 0) {
          return showNotif("Belum ada pasangan yang cocok saat ini.", "info");
        }

        // Acak urutan daftar user agar seru saat di-swipe
        const shuffledUsers = users.sort(() => Math.random() - 0.5);
        setPotentialMatches(shuffledUsers);
        setIsHypeMatchOpen(true); // Buka halaman tumpukan kartu swipe
      } catch (err) { 
        setIsSearchingDoi(false); 
        showNotif("Gagal mencari data.", "error");
      }
    }, 3000);
  };

  // Fungsi saat user swipe KIRI (Tertarik)
  const handleLikeUser = async (targetId: string): Promise<boolean> => {
    try {
      // Cek apakah target sudah memfollow kita duluan di tabel followers (Simulasi Mutual Match)
      const { data: isMutual } = await supabase
        .from('followers')
        .select('*')
        .eq('follower_id', targetId)
        .eq('following_id', currentUser.id)
        .maybeSingle();

      // Tambahkan kita memfollow target ke tabel database
      await supabase.from('followers').insert([{ follower_id: currentUser.id, following_id: targetId }]);
      
      return !!isMutual; // Mengembalikan true jika match mutual terjadi
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Fungsi saat user swipe KANAN (Tidak tertarik)
  const handlePassUser = (targetId: string) => {
    console.log(`User ${targetId} dilewati`);
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
    } catch (err) { showNotif("Gagal mengambil data profil", "error"); }
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
    } catch (err) { showNotif("Gagal memblokir user", "error"); }
    finally { setIsBlocking(false); }
  };

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

  const filteredChats = chats.filter(c => (c.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()));

  // ========== RENDER ==========
  return (
    <div className={`telegram-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <style>{`
        .tg-modal-overlay { background: rgba(0,0,0,0.85) !important; backdrop-filter: blur(5px) !important; }
        .wa-profile-card { width: 100%; max-width: 280px; background: var(--bg-card); border-radius: 16px; overflow: hidden; box-shadow: none; animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .wa-profile-img-container { width: 100%; padding-top: 100%; position: relative; background: var(--bg-secondary); }
        .wa-profile-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
        .wa-profile-name-bar { position: absolute; bottom: 0; left: 0; width: 100%; padding: 24px 16px 12px; background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.8)); }
        .wa-profile-actions { display: flex; justify-content: space-around; padding: 16px 10px; background: var(--bg-card); border-top: 1px solid var(--border-card); }
        .wa-action-btn { background: none; border: none; display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: transform 0.2s; }
        .wa-action-btn:active { transform: scale(0.9); }
        .doi-search-overlay { position: fixed; inset: 0; background: rgba(10,15,20,0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100000; overflow: hidden; backdrop-filter: blur(10px); }
        .radar-wrapper { position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; margin-bottom: 40px; }
        .radar-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid #1DA1F2; opacity: 0; animation: radarPulse 2s linear infinite; }
        .radar-ring.delay-1 { animation-delay: 0.6s; }
        .radar-ring.delay-2 { animation-delay: 1.2s; }
        @keyframes radarPulse { 0% { transform: scale(0.6); opacity: 1; border-width: 3px; } 100% { transform: scale(2.5); opacity: 0; border-width: 1px; } }
        .radar-center-icon { font-size: 50px; color: white; z-index: 2; background: linear-gradient(135deg, #1DA1F2, #1f3cff); border-radius: 50%; padding: 18px; box-shadow: 0 0 25px rgba(29, 161, 242, 0.6); }
        .plane-container { position: absolute; inset: -40px; animation: spinOrbit 3s linear infinite; pointer-events: none; }
        .plane-container.reverse { inset: -70px; animation: spinOrbit 4.5s linear infinite reverse; }
        @keyframes spinOrbit { 100% { transform: rotate(360deg); } }
        .plane-svg { position: absolute; top: 0; left: 50%; transform: translateX(-50%) rotate(45deg); width: 24px; height: 24px; fill: #1DA1F2; filter: drop-shadow(0 0 5px rgba(29,161,242,0.8)); }
        .search-title-glow { position: relative; z-index: 10; font-size: 18px; font-weight: bold; color: white; text-shadow: 0 0 15px rgba(29,161,242,0.8); letter-spacing: 1px; }
        .message-request-banner { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-secondary); margin: 0 16px 10px 16px; border-radius: 12px; cursor: pointer; transition: transform 0.2s; }
        .message-request-banner:active { transform: scale(0.98); }
        .req-left { display: flex; align-items: center; gap: 12px; }
        .req-left .material-icons { color: var(--primary); background: var(--primary-soft); padding: 8px; border-radius: 50%; }
        .req-text h4 { margin: 0; font-size: 14px; color: var(--text-main); font-weight: 700; }
        .req-text p { margin: 0; font-size: 12px; color: var(--text-muted); }
        .message-request-banner .arrow { color: var(--text-muted); }
        @keyframes skeletonPulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }
        .skeleton-box { background-color: var(--border-card, #2a2d31); border-radius: 4px; animation: skeletonPulse 1.5s infinite ease-in-out; }
        .ios-toggle { position: relative; width: 44px; height: 24px; appearance: none; background: #444; outline: none; border-radius: 20px; transition: 0.4s; cursor: pointer; }
        .ios-toggle:checked { background: #2ecc71; }
        .ios-toggle::before { content: ''; position: absolute; width: 20px; height: 20px; border-radius: 50%; top: 2px; left: 2px; background: white; transition: 0.4s; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .ios-toggle:checked::before { transform: translateX(20px); }
        .settings-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-card); }
        .settings-row:last-child { border-bottom: none; }
      `}</style>

      <HypetalkHeader
        onMenuClick={() => setIsSidebarOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <ChatList
        isLoading={isLoading}
        filteredChats={filteredChats}
        requestChats={requestChats}
        searchQuery={searchQuery}
        typingStatus={typingStatus}
        mutedChats={mutedChats}
        onlineUsers={onlineUsers}
        currentUser={currentUser}
        handleOpenChat={handleOpenChat}
        handleAvatarClick={handleAvatarClick}
        renderReadReceipt={renderReadReceipt}
      />

      {!activeModal && !isSearchingDoi && !isHypeMatchOpen && (
        <button className="tg-fab" onClick={() => openModal('search')}><span className="material-icons">chat</span></button>
      )}

      <div className={`tg-sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      
      {/* SINKRONISASI PEMANGGILAN SIDEBAR */}
      <HypetalkSidebar
        isOpen={isSidebarOpen}
        currentUser={currentUser}
        onOpenModal={openModal}
        onHypeMatch={handleHypeMatch} // Properti sudah diarahkan dengan benar ke fungsi baru
      />

      {activeModal === 'user-profile' && selectedProfile && (
        <UserProfileModal
          profile={selectedProfile}
          isBlocking={isBlocking}
          onClose={closeModal}
          onChat={() => { closeModal(); router.push(`/hypetalk/room?from=${selectedProfile.id}`); }}
          onShowInfo={() => setActiveModal('chat-info')}
          onBlock={() => handleBlockUser(selectedProfile.id)}
        />
      )}

      {activeModal === 'chat-info' && selectedProfile && (
        <ChatInfoModal
          profile={selectedProfile}
          mutedChats={mutedChats}
          onToggleMute={handleToggleMute}
          onBack={() => setActiveModal('user-profile')}
          onClose={closeModal}
        />
      )}

      {activeModal === 'privacy-settings' && (
        <PrivacySettingsModal
          privacySettings={privacySettings}
          setPrivacySettings={setPrivacySettings}
          isSaving={isSavingPrivacy}
          onSave={handleSavePrivacy}
          onClose={closeModal}
        />
      )}

      {/* TAMPILKAN OVERLAY SWIPE KARTU HYPE MATCH */}
      {isHypeMatchOpen && (
        <HypeMatchOverlay
          currentUser={currentUser}
          potentialMatches={potentialMatches}
          onLike={handleLikeUser}
          onPass={handlePassUser}
          onClose={() => setIsHypeMatchOpen(false)}
        />
      )}

      {activeModal === 'search' && (
        <SearchModal
          searchId={searchUserId}
          setSearchId={setSearchUserId}
          onSearch={handleSearchAndChat}
          onClose={closeModal}
        />
      )}

      {activeModal === 'group' && (
        <GroupModal
          groupName={groupName}
          setGroupName={setGroupName}
          onCreate={handleCreateGroup}
          onClose={closeModal}
        />
      )}

      {activeModal === 'bio' && (
        <BioModal
          bioForm={bioForm}
          setBioForm={setBioForm}
          isSaving={isSavingBio}
          onSave={handleSaveBio}
          onClose={closeModal}
        />
      )}

      {isSearchingDoi && <DoiSearchingOverlay />}
    </div>
  );
}
