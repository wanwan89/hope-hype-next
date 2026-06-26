'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import './Hypetalk.css';

// Import komponen anak
import HypetalkHeader from './_components/HypetalkHeader';
import ChatList from './_components/ChatList';
import HypetalkSidebar from './_components/HypetalkSidebar';
import UserProfileModal from './_components/UserProfileModal';
import ChatInfoModal from './_components/ChatInfoModal';
import PrivacySettingsModal from './_components/PrivacySettingsModal';
import SearchModal from './_components/SearchModal';
import GroupModal from './_components/GroupModal';
import BioModal from './_components/BioModal';

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

  // --- STATES FITUR HAPUS ROOM (LONG PRESS) ---
  const [longPressChatId, setLongPressChatId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  
  const timer2sRef = useRef<NodeJS.Timeout | null>(null);
  const timer4sRef = useRef<NodeJS.Timeout | null>(null);

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
              unread: grpUnread,
              isMember: true // Status bahwa user masih menjadi anggota grup ini
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


  // ========== LONG PRESS & DELETE HANDLERS ==========
  
  const clearPressTimers = () => {
    if (timer2sRef.current) clearTimeout(timer2sRef.current);
    if (timer4sRef.current) clearTimeout(timer4sRef.current);
  };

  const handlePressStart = (chat: any) => {
    // Abaikan jika global atau masih dalam grup
    if (chat.type === 'global') return;
    if (chat.type === 'group' && chat.isMember) return;

    timer2sRef.current = setTimeout(() => {
      if (!isSelectionMode) setLongPressChatId(chat.id);
    }, 2000);

    timer4sRef.current = setTimeout(() => {
      setLongPressChatId(null);
      setIsSelectionMode(true);
      setSelectedChats(new Set([chat.id]));
      if (typeof navigator !== 'undefined' && "vibrate" in navigator) {
        navigator.vibrate(50);
      }
    }, 4000);
  };

  const handlePressEnd = () => clearPressTimers();

  const toggleSelection = (chatId: string) => {
    setSelectedChats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) newSet.delete(chatId);
      else newSet.add(chatId);
      return newSet;
    });
  };

  const selectAllChats = () => {
    const deletable = chats
      .filter(c => c.type === 'private' || (c.type === 'group' && !c.isMember))
      .map(c => c.id);
    setSelectedChats(new Set(deletable));
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedChats(new Set());
    setLongPressChatId(null);
  };

  const executeDeleteRooms = async (chatIdsToDel: string[]) => {
    if (!confirm(`Hapus ${chatIdsToDel.length} obrolan secara permanen?`)) return;
    
    try {
      for (const cId of chatIdsToDel) {
        const chat = chats.find(c => c.id === cId) || requestChats.find(c => c.id === cId);
        if (!chat) continue;
        
        let roomId = '';
        if (chat.type === 'private') {
          const ids = [currentUser.id, chat.id].sort();
          roomId = `pv_${ids[0]}_${ids[1]}`;
        } else if (chat.type === 'group') {
          roomId = `group_${chat.id}`;
        }

        if (roomId) {
          await supabase.from('messages').delete().eq('room_id', roomId);
        }
      }
      
      setChats(prev => prev.filter(c => !chatIdsToDel.includes(c.id)));
      setRequestChats(prev => prev.filter(c => !chatIdsToDel.includes(c.id)));
      cancelSelection();
      showNotif("Obrolan berhasil dihapus", "success");
    } catch (err) {
      showNotif("Gagal menghapus obrolan", "error");
    }
  };


  // ========== HANDLER FUNCTIONS STANDAR ==========
  const openModal = (modalName: string) => { setActiveModal(modalName); setIsSidebarOpen(false); };
  const closeModal = () => { setActiveModal(null); setLongPressChatId(null); };

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

  const handleHypeMatch = async () => {
    if (!currentUser?.gender) return openModal('bio');
    setIsSidebarOpen(false);
    router.push('/hypematch');
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
    if (isSelectionMode) {
      if (chat.type !== 'global' && !(chat.type === 'group' && chat.isMember)) {
        toggleSelection(chat.id);
      } else if (chat.type === 'group' && chat.isMember) {
        showNotif("Harus keluar dari grup untuk menghapus chat ini", "info");
      }
      return;
    }

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

    if (chat.type === 'global') router.push('/hypetalk/room?global=true'); 
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
      <HypetalkHeader
        onMenuClick={() => setIsSidebarOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* ACTION BAR SELEKSI */}
      {isSelectionMode && (
        <div className="selection-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
           <button onClick={cancelSelection} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>Batal</button>
           <span style={{ fontWeight: '600' }}>{selectedChats.size} Terpilih</span>
           <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={selectAllChats} style={{ background: 'none', border: 'none', color: '#00a2ff', fontSize: '14px', cursor: 'pointer' }}>Tandai Semua</button>
              <button onClick={() => executeDeleteRooms(Array.from(selectedChats))} disabled={selectedChats.size === 0} style={{ background: 'none', border: 'none', color: selectedChats.size === 0 ? 'var(--text-muted)' : 'red', fontWeight: 'bold', fontSize: '14px', cursor: selectedChats.size === 0 ? 'not-allowed' : 'pointer' }}>Hapus</button>
           </div>
        </div>
      )}

      {/* MODAL HAPUS SATUAN (2 DETIK) */}
      {longPressChatId && !isSelectionMode && (
        <div className="single-delete-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', minWidth: '250px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: '16px' }}>Hapus Obrolan?</h3>
            <button onClick={() => executeDeleteRooms([longPressChatId])} style={{ display: 'block', width: '100%', padding: '12px', background: 'red', color: 'white', border: 'none', borderRadius: '8px', marginBottom: '8px', fontSize: '16px', cursor: 'pointer' }}>Hapus Room</button>
            <button onClick={() => setLongPressChatId(null)} style={{ display: 'block', width: '100%', padding: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>Batal</button>
          </div>
        </div>
      )}

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
        // PROPS BARU UNTUK HAPUS DAN SELEKSI
        isSelectionMode={isSelectionMode}
        selectedChats={selectedChats}
        onPressStart={handlePressStart}
        onPressEnd={handlePressEnd}
      />

      {!activeModal && !isSelectionMode && (
        <button className="tg-fab" onClick={() => openModal('search')}><span className="material-icons">chat</span></button>
      )}

      <div className={`tg-sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      
      <HypetalkSidebar
        isOpen={isSidebarOpen}
        currentUser={currentUser}
        onOpenModal={openModal}
        onHypeMatch={handleHypeMatch} 
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
    </div>
  );
}
