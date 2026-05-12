'use client';

import { useState, useEffect, useRef } from 'react'; 
import { useRouter } from 'next/navigation'; 
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import './Hypetalk.css';

export default function HypetalkPage() {
  const router = useRouter();
  
  // --- STATES (TIDAK BERUBAH) ---
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

  // --- REFS (HANYA UNTUK LOGIKA NON-CALL) ---
  const refs = {
    callTimeout: useRef<any>(null)
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLimit = localStorage.getItem('doi_limit');
      if (savedLimit) setSisaLimitDoi(parseInt(savedLimit));
    }
    initUser();
    return () => {
      setIsSidebarOpen(false);
      setActiveModal(null);
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
        id: 'room-1', type: 'global', name: 'HopeTalk Globe', preview: globalPreview,
        time: lastGlobalMsg ? new Date(lastGlobalMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Always',
        sortTime: lastGlobalMsg ? new Date(lastGlobalMsg.created_at).getTime() : Date.now() + 10000,
        unread: globalUnread
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
            let currentUnread = unreadMap.get(p.id) || 0;
            if (lastMsg.user_id === userId) { msgPreview = `Anda: ${msgPreview}`; currentUnread = 0; }

            const chatItem = {
              id: p.id, type: 'private', name: p.username, avatar: p.avatar_url, role: p.role, preview: msgPreview,
              lastMsgUserId: lastMsg.user_id, lastMsgStatus: lastMsg.status,
              time: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              sortTime: new Date(lastMsg.created_at).getTime(), unread: currentUnread
            };

            const ids = [userId, p.id].sort();
            const roomIdStr = `pv_${ids[0]}_${ids[1]}`;
            const roomMsgs = allMsgs.filter(m => m.room_id === roomIdStr);
            const iHaveReplied = roomMsgs.some(m => m.user_id === userId);
            const isFollower = followerIds.has(p.id);

            if (!isFollower && !iHaveReplied) reqChats.push(chatItem); else mainChats.push(chatItem);
          });
        }
      }

      const { data: myGroups } = await supabase.from('group_members').select('group_id, groups(name, photo_url)').eq('user_id', userId);
      if (myGroups) {
        myGroups.forEach((g: any) => {
          if (g.groups) {
            const groupMsgs = allMsgs?.filter(m => m.room_id === `group_${g.group_id}`);
            const lastGroupMsg = groupMsgs && groupMsgs.length > 0 ? groupMsgs[0] : null;
            let grpPreview = 'Grup Chat'; let grpUnread = unreadMap.get(g.group_id) || 0;
            if (lastGroupMsg) {
              grpPreview = lastGroupMsg.sticker_url ? "Mengirim Stiker" : (lastGroupMsg.audio_url ? "Mengirim Voice Note" : lastGroupMsg.message);
              if (lastGroupMsg.user_id === userId) { grpPreview = `Anda: ${grpPreview}`; grpUnread = 0; }
            }
            mainChats.push({
              id: g.group_id, type: 'group', name: g.groups.name, avatar: g.groups.photo_url || '/asets/png/profile.webp',
              preview: grpPreview, time: lastGroupMsg ? new Date(lastGroupMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              sortTime: lastGroupMsg ? new Date(lastGroupMsg.created_at).getTime() : Date.now() - 1000, unread: grpUnread
            });
          }
        });
      }
      setChats(mainChats.sort((a, b) => b.sortTime - a.sortTime));
      setRequestChats(reqChats.sort((a, b) => b.sortTime - a.sortTime)); 
    } catch (err) { console.error(err); } finally { if (!isBackground) setIsLoading(false); }
  };

  const subscribeToInbox = (userId: string) => {
    supabase.channel(`inbox-lobby-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => loadAllChats(userId, true))
      .subscribe();
  };

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

    setTimeout(async () => {
      try {
        const { data: users } = await supabase.from("profiles").select("*").neq("id", currentUser.id).eq("gender", lawanJenis);
        setIsSearchingDoi(false);
        if (!users || users.length === 0) return showNotif("Belum ada kecocokan saat ini.", "info");
        setFoundDoi(users[Math.floor(Math.random() * users.length)]);
        openModal('doi-card');
      } catch (err) { setIsSearchingDoi(false); }
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
    if (chat.type === 'global') router.push('/hypetalk/room?id=room-1');
    else if (chat.type === 'group') router.push(`/hypetalk/room?group=${chat.id}&gname=${encodeURIComponent(chat.name)}`);
    else router.push(`/hypetalk/room?from=${chat.id}`);
  };

  const handleAvatarClick = async (e: React.MouseEvent, chatId: string, chatType: string) => {
    e.stopPropagation();
    if (chatType !== 'private') return;
    const { data } = await supabase.from('profiles').select('*').eq('id', chatId).single();
    if (data) { setSelectedProfile(data); openModal('user-profile'); }
  };

  // 🔥 UPDATE: TRIGGER CALL VIA GLOBAL PONDASI 🔥
  const startCallFromLobby = async (targetProfile: any) => {
    if (!currentUser) return;
    const ids = [currentUser.id, targetProfile.id].sort();
    const callRoomId = `pv_${ids[0]}_${ids[1]}`;
    
    // Kirim sinyal ke layout.tsx
    window.dispatchEvent(new CustomEvent('init-global-call', { 
      detail: { 
        roomId: callRoomId, 
        targetId: targetProfile.id, 
        partnerName: targetProfile.username, 
        partnerAvatar: targetProfile.avatar_url 
      } 
    }));
  };

  const filteredChats = chats.filter(c => (c.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()));

  return (
    <div className="telegram-wrapper">
      <header className="tg-header">
        <div className="tg-header-top">
          <div className="tg-header-left">
            <button className="icon-btn" onClick={() => setIsSidebarOpen(true)}><span className="material-icons">menu</span></button>
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
            <div className="req-left"><span className="material-icons">mark_email_unread</span><div className="req-text"><h4>Permintaan Pesan</h4><p>{requestChats.length} pesan belum dibalas</p></div></div>
            <span className="material-icons arrow">chevron_right</span>
          </div>
        )}

        {isLoading ? Array(8).fill(0).map((_, i) => (
          <div key={i} className="tg-chat-item skeleton-chat">
             <div className="tg-avatar skeleton-shimmer"></div>
             <div className="tg-chat-info" style={{ flex: 1 }}>
               <div className="tg-chat-top"><div className="skeleton-line skeleton-shimmer" style={{ width: '40%' }}></div></div>
               <div className="skeleton-line skeleton-shimmer" style={{ width: '70%', marginTop: '8px' }}></div>
             </div>
          </div>
        )) : filteredChats.map(chat => (
          <div key={chat.id} className="tg-chat-item" onClick={() => handleOpenChat(chat)}>
            <div className="tg-avatar global-avatar" onClick={(e) => handleAvatarClick(e, chat.id, chat.type)}>
              {chat.type === 'global' ? <span className="material-icons">public</span> : <img src={chat.avatar || "/asets/png/profile.webp"} className="tg-avatar" alt="av" />}
            </div>
            <div className="tg-chat-info" style={{ flex: 1, minWidth: 0 }}>
              <div className="tg-chat-top">
                <h4 className="tg-name">{chat.name} {chat.type === 'group' && <span className="material-icons text-sm text-blue-400 ml-1">groups</span>} {chat.type === 'private' && <span dangerouslySetInnerHTML={{ __html: getUserBadge(chat.role || 'user') }} />}</h4>
                <span className="tg-time" style={{ color: chat.unread > 0 ? '#1DA1F2' : '' }}>{chat.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <p className="tg-preview">{typingStatus[chat.id] ? `${typingStatus[chat.id]} sedang mengetik...` : chat.preview}</p>
                {chat.unread > 0 && <div className="unread-badge">{chat.unread}</div>}
              </div>
            </div>
          </div>
        ))}
      </main>

      <button className="tg-fab" onClick={() => openModal('search')}><span className="material-icons">chat</span></button>

      <div className={`tg-sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <aside className={`tg-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img className="side-avatar" src={currentUser?.avatar_url || "/asets/png/profile.webp"} alt="me" />
          <div className="sidebar-user-info"><h3 className="side-username">{currentUser?.username || "User"}</h3><p className="side-id">#{currentUser?.short_id || "0000"}</p></div>
          <button className="btn-edit-bio" onClick={() => openModal('bio')}>Edit Biodata</button>
        </div>
        <div className="sidebar-menu">
          <button className="menu-item" onClick={() => openModal('group')}><span className="material-icons">group_add</span> Buat Grup Baru</button>
          <button className="menu-item btn-cari-doi" onClick={handleCariDoi}><span className="material-icons">favorite</span> Cari Doi <span className="limit-badge">{sisaLimitDoi}/10</span></button>
        </div>
      </aside>

      {/* MODAL USER PROFILE (WA STYLE) */}
      {activeModal === 'user-profile' && selectedProfile && (
        <div className="tg-modal-overlay flex items-center justify-center" onClick={closeModal}>
          <div className="wa-profile-card" onClick={e => e.stopPropagation()}>
            <div className="wa-profile-img-container">
              <img src={selectedProfile.avatar_url || "/asets/png/profile.webp"} className="wa-profile-img" alt="p" />
              <div className="wa-profile-name-bar"><h2 className="text-white text-lg font-bold">{selectedProfile.username}{selectedProfile.umur ? `, ${selectedProfile.umur}` : ''}</h2></div>
            </div>
            <div className="wa-profile-actions">
              <button onClick={() => { closeModal(); router.push(`/hypetalk/room?from=${selectedProfile.id}`); }} className="wa-action-btn text-blue-400"><span className="material-icons">chat</span>Chat</button>
              <button onClick={() => { closeModal(); startCallFromLobby(selectedProfile); }} className="wa-action-btn text-green-400"><span className="material-icons">call</span>Telpon</button>
              <button onClick={() => { if(confirm("Blokir user?")) supabase.from('blocked_users').insert({ blocker_id: currentUser.id, blocked_id: selectedProfile.id }).then(()=>closeModal()); }} className="wa-action-btn text-red-400"><span className="material-icons">block</span>Blokir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DOI CARD */}
      {activeModal === 'doi-card' && foundDoi && (
        <div className="tg-modal-overlay flex" onClick={closeModal}>
          <div className="tg-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Kecocokan Ditemukan!</h3><button onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="text-center p-4">
              <img src={foundDoi.avatar_url || "/asets/png/profile.webp"} className="w-24 h-24 rounded-full mx-auto border-4 border-blue-500 shadow-lg" alt="d" />
              <h2 className="text-xl font-bold mt-4">{foundDoi.username}, {foundDoi.umur || '??'}</h2>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {foundDoi.pekerjaan && <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold">{foundDoi.pekerjaan}</span>}
                {foundDoi.hobi && <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold">{foundDoi.hobi}</span>}
              </div>
            </div>
            <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4" onClick={() => router.push(`/hypetalk/room?from=${foundDoi.id}`)}>Chat Sekarang</button>
          </div>
        </div>
      )}

      {/* MODAL SEARCH */}
      {activeModal === 'search' && (
        <div className="tg-modal-overlay flex" onClick={closeModal}>
          <div className="tg-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Mulai Chat Baru</h3><button onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="input-group"><span className="material-icons">tag</span><input type="text" placeholder="ID teman (ABCD)" value={searchUserId} onChange={e => setSearchUserId(e.target.value)} /></div>
            <button className="action-btn" onClick={handleSearchAndChat}>Cari dan Chat</button>
          </div>
        </div>
      )}

      {/* ANIMASI DOI (RADAR) */}
      {isSearchingDoi && (
        <div className="doi-search-overlay">
          <div className="radar-wrapper">
            <div className="radar-ring"></div><div className="radar-ring delay-1"></div>
            <span className="material-icons radar-center-icon">person_search</span>
            <div className="plane-container"><svg className="plane-svg" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></div>
          </div>
          <h3 className="search-title-glow">Mencari kecocokan..</h3>
        </div>
      )}
    </div>
  );
}
