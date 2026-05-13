'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import './Hypetalk.css';

export default function HypetalkPage() {
  const router = useRouter();

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
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const refs = {
    inboxChannel: useRef<any>(null),
  };

  // ----------------------------------------------
  //  LOAD CHATS (GLOBAL, GRUP, PRIVATE)
  // ----------------------------------------------
  const loadAllChats = async (userId: string, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // 1. Ambil Chat Private & Global dari tabel messages
      const { data: msgs, error: msgError } = await supabase
        .from('messages')
        .select('id, user_id, room_id, message, created_at')
        .or(`user_id.eq.${userId},room_id.ilike.%${userId}%,room_id.eq.room-1`)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      const chatMap = new Map<string, any>();

      // 2. Ambil Daftar Grup User
      const { data: myGroups } = await supabase
        .from('group_members')
        .select('group_id, groups(id, name, photo_url)')
        .eq('user_id', userId);

      (msgs || []).forEach((msg) => {
        let chatKey = '';
        let chatType = '';
        let partnerId = '';

        if (msg.room_id === 'room-1') {
          chatKey = 'room-1';
          chatType = 'global';
        } else if (msg.room_id.startsWith('pv_')) {
          partnerId = msg.room_id.replace('pv_', '').split('_').find((p) => p !== userId) || '';
          chatKey = partnerId;
          chatType = 'private';
        } else if (msg.room_id.startsWith('group_')) {
          chatKey = msg.room_id;
          chatType = 'group';
        }

        if (chatKey && (!chatMap.has(chatKey) || new Date(msg.created_at) > new Date(chatMap.get(chatKey).sortTime))) {
          chatMap.set(chatKey, {
            id: msg.id,
            type: chatType,
            roomId: msg.room_id,
            partnerId: partnerId,
            lastMsg: msg.message || 'Media',
            sortTime: msg.created_at,
          });
        }
      });

      // 3. Gabungkan Data Profile (Private) & Data Grup
      const chatList = Array.from(chatMap.values());
      const privatePartnerIds = chatList.filter(c => c.type === 'private').map(c => c.partnerId);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, role, umur')
        .in('id', privatePartnerIds);

      const finalChats = chatList.map(chat => {
        if (chat.type === 'global') {
          return { ...chat, name: 'HopeTalk Globe', avatar: '/asets/png/profile.webp' };
        }
        if (chat.type === 'private') {
          const p = profiles?.find(p => p.id === chat.partnerId);
          return { ...chat, name: p?.username || 'User', avatar: p?.avatar_url, role: p?.role, umur: p?.umur };
        }
        if (chat.type === 'group') {
          const gid = chat.roomId.replace('group_', '');
          const gInfo = myGroups?.find(g => g.group_id === gid)?.groups;
          return { ...chat, name: (gInfo as any)?.name || 'Grup Chat', avatar: (gInfo as any)?.photo_url };
        }
        return chat;
      }).sort((a, b) => new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime());

      setChats(finalChats);
    } catch (err) {
      console.error('Load chat failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToInbox = (userId: string) => {
    if (refs.inboxChannel.current) supabase.removeChannel(refs.inboxChannel.current);
    refs.inboxChannel.current = supabase
      .channel(`lobby-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadAllChats(userId, true))
      .subscribe();
  };

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
        hobi: profile.hobi || '',
      });
    }
    await loadAllChats(user.id);
    subscribeToInbox(user.id);
  };

  useEffect(() => {
    initUser();
    return () => { if (refs.inboxChannel.current) supabase.removeChannel(refs.inboxChannel.current); };
  }, []);

  // ----------------------------------------------
  //  HANDLERS
  // ----------------------------------------------
  const openModal = (name: string) => { setActiveModal(name); setIsSidebarOpen(false); };
  const closeModal = () => setActiveModal(null);

  const handleOpenChat = (chat: any) => {
    if (chat.type === 'global') router.push('/hypetalk/room?id=room-1');
    else if (chat.type === 'group') {
      const gid = chat.roomId.replace('group_', '');
      router.push(`/hypetalk/room?group=${gid}&gname=${encodeURIComponent(chat.name)}`);
    } else {
      router.push(`/hypetalk/room?from=${chat.partnerId}`);
    }
  };

  const handleAvatarClick = (e: React.MouseEvent, chat: any) => {
    e.stopPropagation();
    if (chat.type !== 'private') return;
    setSelectedProfile({ id: chat.partnerId, username: chat.name, avatar_url: chat.avatar, role: chat.role, umur: chat.umur });
    openModal('user-profile');
  };

  const handleCariDoi = async () => {
    if (sisaLimitDoi <= 0) return openModal('limit-doi');
    if (!currentUser?.gender) return openModal('bio');
    setIsSidebarOpen(false);
    setIsSearchingDoi(true);
    const targetGender = currentUser.gender === 'Pria' ? 'Wanita' : 'Pria';

    setTimeout(async () => {
      try {
        const { data: users } = await supabase.from('profiles').select('*').neq('id', currentUser.id).eq('gender', targetGender);
        setIsSearchingDoi(false);
        if (!users?.length) return showNotif('Belum ada kecocokan.', 'info');
        setFoundDoi(users[Math.floor(Math.random() * users.length)]);
        openModal('doi-card');
        const newLimit = sisaLimitDoi - 1;
        setSisaLimitDoi(newLimit);
        localStorage.setItem('doi_limit', String(newLimit));
      } catch (err) { setIsSearchingDoi(false); }
    }, 3000);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    const { data: g, error } = await supabase.from('groups').insert([{ name: groupName, created_by: currentUser.id }]).select().single();
    if (!error) {
      await supabase.from('group_members').insert([{ group_id: g.id, user_id: currentUser.id }]);
      router.push(`/hypetalk/room?group=${g.id}&gname=${encodeURIComponent(g.name)}`);
    }
  };

  const handleSearchAndChat = async () => {
    const cleanId = searchUserId.replace('#', '').toUpperCase();
    const { data: target } = await supabase.from('profiles').select('id').eq('short_id', cleanId).maybeSingle();
    if (target) { router.push(`/hypetalk/room?from=${target.id}`); closeModal(); }
    else showNotif('ID tidak ditemukan', 'error');
  };

  if (isLoading || !currentUser) return null; // Lu mau pake file loading khusus kan, jadi di sini return null/kosong aja

  return (
    <div className="telegram-wrapper">
      {/* HEADER */}
      <header className="tg-header">
        <div className="header-left">
          <button className="icon-btn" onClick={() => setIsSidebarOpen(true)}>
            <span className="material-icons">menu</span>
          </button>
          <h2>Hypetalk</h2>
        </div>
      </header>

      {/* SEARCH BAR */}
      <div className="tg-search-bar">
        <div className="search-inner">
          <span className="material-icons">search</span>
          <input 
            type="text" 
            placeholder="Cari obrolan..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {/* CHAT LIST */}
      <main className="tg-chat-list">
        {chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((chat) => (
          <div key={chat.id || chat.roomId} className="tg-chat-item" onClick={() => handleOpenChat(chat)}>
            <div className="tg-avatar-wrapper" onClick={(e) => handleAvatarClick(e, chat)}>
              {chat.type === 'global' ? (
                <div className="global-icon-circle"><span className="material-icons">public</span></div>
              ) : (
                <img src={chat.avatar || '/asets/png/profile.webp'} alt="av" />
              )}
            </div>
            <div className="tg-chat-info">
              <div className="tg-chat-top">
                <h4 className="tg-name">
                  {chat.name}
                  {chat.type === 'group' && <span className="material-icons grup-tag">groups</span>}
                  {chat.role && <span dangerouslySetInnerHTML={{ __html: getUserBadge(chat.role) }} />}
                </h4>
                <span className="tg-time">
                  {new Date(chat.sortTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="tg-last-msg">{chat.lastMsg}</p>
            </div>
          </div>
        ))}
      </main>

      {/* FAB */}
      <button className="tg-fab" onClick={() => openModal('search')}>
        <span className="material-icons">chat</span>
      </button>

      {/* SIDEBAR */}
      <div className={`tg-sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <aside className={`tg-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src={currentUser.avatar_url || '/asets/png/profile.webp'} className="side-avatar" alt="me" />
          <h3>{currentUser.username}</h3>
          <p>#{currentUser.short_id}</p>
        </div>
        <nav className="sidebar-menu">
          <div className="menu-item" onClick={() => openModal('search')}><span className="material-icons">person_add</span> Chat by ID</div>
          <div className="menu-item" onClick={handleCariDoi}><span className="material-icons">favorite</span> Cari Doi ({sisaLimitDoi}/10)</div>
          <div className="menu-item" onClick={() => openModal('group')}><span className="material-icons">group_add</span> Buat Grup</div>
          <div className="menu-item" onClick={() => openModal('bio')}><span className="material-icons">settings</span> Edit Bio</div>
          <div className="menu-item" onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}><span className="material-icons">logout</span> Keluar</div>
        </nav>
      </aside>

      {/* MODALS (PRIVATE PROFILE, SEARCH, GROUP, ETC.) */}
      {activeModal === 'user-profile' && selectedProfile && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="wa-profile-card" onClick={e => e.stopPropagation()}>
            <div className="wa-profile-img">
              <img src={selectedProfile.avatar_url || '/asets/png/profile.webp'} alt="p" />
              <div className="wa-profile-name">
                <h2>{selectedProfile.username}{selectedProfile.umur ? `, ${selectedProfile.umur}` : ''}</h2>
              </div>
            </div>
            <div className="wa-profile-actions">
              <button onClick={() => { closeModal(); router.push(`/hypetalk/room?from=${selectedProfile.id}`); }}><span className="material-icons">chat</span><p>Chat</p></button>
              <button onClick={() => { closeModal(); router.push(`/hypetalk/room?from=${selectedProfile.id}&call=true`); }}><span className="material-icons">call</span><p>Call</p></button>
              <button className="red" onClick={() => closeModal()}><span className="material-icons">block</span><p>Block</p></button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'search' && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Mulai Chat Baru</h3><button onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="input-group"><span className="material-icons">tag</span><input type="text" placeholder="ID teman (ABCD)" value={searchUserId} onChange={e => setSearchUserId(e.target.value)} /></div>
            <button className="action-btn" onClick={handleSearchAndChat}>Cari & Chat</button>
          </div>
        </div>
      )}

      {activeModal === 'group' && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Buat Grup</h3><button onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="input-group"><span className="material-icons">groups</span><input type="text" placeholder="Nama grup" value={groupName} onChange={e => setGroupName(e.target.value)} /></div>
            <button className="action-btn" onClick={handleCreateGroup}>Buat Sekarang</button>
          </div>
        </div>
      )}

      {isSearchingDoi && (
        <div className="doi-search-overlay">
          <div className="radar-wrapper"><div className="radar-ring"></div><div className="radar-ring delay-1"></div><span className="material-icons">person_search</span></div>
          <h3>Mencari kecocokan...</h3>
        </div>
      )}
    </div>
  );
}
