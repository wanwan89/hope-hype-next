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
  const [typingStatus, setTypingStatus] = useState<Record<string, string>>({});
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const refs = {
    callTimeout: useRef<any>(null),
    inboxChannel: useRef<any>(null),
  };

  // ----------------------------------------------
  //  LOAD CHATS DARI TABEL messages (ROOM-BASED)
  // ----------------------------------------------
  const loadAllChats = async (userId: string, showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      // Ambil pesan pribadi ATAU pesan global (room-1)
      const { data: privateMessages, error } = await supabase
        .from('messages')
        .select('id, user_id, room_id, message, created_at')
        .is('group_id', null)
        .or(`user_id.eq.${userId},room_id.ilike.%${userId}%,room_id.eq.room-1`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const partnerMap = new Map<string, any>();

      (privateMessages || []).forEach((msg) => {
        if (!msg.room_id) return;

        // 🔥 FIX 1: Handle Room Global
        if (msg.room_id === 'room-1') {
           if (!partnerMap.has('room-1') || new Date(msg.created_at) > new Date(partnerMap.get('room-1').last_message_at)) {
             partnerMap.set('room-1', {
                id: msg.id,
                room_id: 'room-1',
                partnerId: 'room-1',
                last_message: msg.message || 'Mengirim media',
                last_message_at: msg.created_at,
                from: msg.user_id,
                to: 'room-1',
                partnerProfile: { username: 'HopeTalk Globe', avatar_url: '/asets/png/profile.webp', role: 'system' }
             });
           }
        } 
        // 🔥 FIX 2: Parse "pv_userA_userB" dengan benar (Hilangkan kata 'pv')
        else if (msg.room_id.startsWith('pv_')) {
           const partnerId = msg.room_id.replace('pv_', '').split('_').find((p) => p !== userId);
           
           if (partnerId) {
             if (!partnerMap.has(partnerId) || new Date(msg.created_at) > new Date(partnerMap.get(partnerId).last_message_at)) {
               partnerMap.set(partnerId, {
                 id: msg.id,
                 room_id: msg.room_id,
                 partnerId,
                 last_message: msg.message || 'Mengirim media',
                 last_message_at: msg.created_at,
                 from: msg.user_id,
                 to: partnerId,
               });
             }
           }
        }
      });

      // Ambil profil hanya untuk user (ID yang formatnya UUID / panjang > 20)
      const partnerIds = Array.from(partnerMap.keys()).filter(id => id.length > 20);
      
      if (partnerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, umur, role')
          .in('id', partnerIds);

        if (profilesData) {
          profilesData.forEach((profile) => {
            if (partnerMap.has(profile.id)) {
              partnerMap.get(profile.id).partnerProfile = profile;
            }
          });
        }
      }

      // Convert ke array & sorting dari yang paling baru
      const finalChats = Array.from(partnerMap.values()).sort((a, b) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      setChats(finalChats);
      setRequestChats([]);
    } catch (err) {
      console.error('Gagal load chat:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // ----------------------------------------------
  //  REALTIME SUBSCRIPTION
  // ----------------------------------------------
  const subscribeToInbox = (userId: string) => {
    if (refs.inboxChannel.current) {
       supabase.removeChannel(refs.inboxChannel.current);
    }

    const channel = supabase
      .channel(`inbox-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new;
          if (
            msg.user_id === userId ||
            (msg.room_id && msg.room_id.includes(userId)) ||
            msg.room_id === 'room-1'
          ) {
            loadAllChats(userId, false);
          }
        }
      )
      .subscribe();

    refs.inboxChannel.current = channel;
  };

  // ----------------------------------------------
  //  INIT
  // ----------------------------------------------
  const initUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const fullUser = { ...user, ...profile };
    setCurrentUser(fullUser);

    if (profile) {
      setBioForm({
        umur: profile.umur || '',
        gender: profile.gender || 'Pria',
        zodiak: profile.zodiak || '',
        pekerjaan: profile.pekerjaan || '',
        hobi: profile.hobi || '',
      });
    }

    await loadAllChats(user.id, false);
    subscribeToInbox(user.id);
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
      if (refs.inboxChannel.current) {
        supabase.removeChannel(refs.inboxChannel.current);
      }
    };
  }, []);

  // ----------------------------------------------
  //  HANDLERS
  // ----------------------------------------------
  const openModal = (modalName: string) => {
    setActiveModal(modalName);
    setIsSidebarOpen(false);
  };
  const closeModal = () => setActiveModal(null);

  const handleSaveBio = async () => {
    setIsSavingBio(true);
    try {
      const updateData = { ...bioForm, umur: Number(bioForm.umur) || null };
      await supabase.from('profiles').update(updateData).eq('id', currentUser.id);
      showNotif('Profil tersimpan!', 'success');
      setCurrentUser((prev: any) => ({ ...prev, ...updateData }));
      closeModal();
    } catch (err) {
      showNotif('Gagal simpan.', 'error');
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleCariDoi = async () => {
    if (sisaLimitDoi <= 0) return openModal('limit-doi');
    if (!currentUser?.gender) return openModal('bio');
    const newLimit = sisaLimitDoi - 1;
    setSisaLimitDoi(newLimit);
    localStorage.setItem('doi_limit', String(newLimit));
    setIsSidebarOpen(false);
    setIsSearchingDoi(true);
    const lawanJenis = currentUser.gender === 'Pria' ? 'Wanita' : 'Pria';

    setTimeout(async () => {
      try {
        const { data: users } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', currentUser.id)
          .eq('gender', lawanJenis);
        setIsSearchingDoi(false);
        if (!users || users.length === 0) return showNotif('Belum ada kecocokan saat ini.', 'info');
        setFoundDoi(users[Math.floor(Math.random() * users.length)]);
        openModal('doi-card');
      } catch (err) {
        setIsSearchingDoi(false);
        showNotif('Gagal mencari, coba lagi.', 'error');
      }
    }, 4000);
  };

  const handleSearchAndChat = async () => {
    if (!searchUserId) return;
    const cleanId = searchUserId.replace('#', '').toUpperCase();
    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('short_id', cleanId)
      .maybeSingle();
    if (target) {
      router.push(`/hypetalk/room?from=${target.id}`);
      closeModal();
    } else {
      showNotif('ID tidak ditemukan', 'error');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return showNotif('Nama grup tidak boleh kosong', 'error');
    try {
      const { data: newGroup, error } = await supabase
        .from('groups')
        .insert([{ name: groupName, created_by: currentUser.id }])
        .select()
        .single();
      if (error) throw error;
      await supabase.from('group_members').insert([{ group_id: newGroup.id, user_id: currentUser.id }]);
      showNotif('Grup berhasil dibuat!', 'success');
      closeModal();
      router.push(`/hypetalk/room?group=${newGroup.id}&gname=${encodeURIComponent(newGroup.name)}`);
    } catch (err) {
      showNotif('Gagal membuat grup', 'error');
    }
  };

  const handleOpenChat = (chat: any) => {
    if (chat.room_id === 'room-1') {
      router.push('/hypetalk/room?id=room-1');
    } else {
      const partnerId = chat.from === currentUser.id ? chat.to : chat.from;
      router.push(`/hypetalk/room?from=${partnerId}`);
    }
  };

  const handleAvatarClick = (chat: any) => {
    if (chat.room_id === 'room-1') return; // Jangan buka profil kalau ini grup global
    if (chat.partnerProfile) {
      setSelectedProfile(chat.partnerProfile);
      openModal('user-profile');
    } else {
      setSelectedProfile({ id: chat.partnerId, username: chat.partnerId });
      openModal('user-profile');
    }
  };

  const startCallFromLobby = (target: any) => {
    router.push(`/hypetalk/room?from=${target.id}&call=true`);
  };

  // ----------------------------------------------
  //  FILTER
  // ----------------------------------------------
  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;
    const name = chat.partnerProfile?.username || chat.partnerId || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ----------------------------------------------
  //  LOADING / EMPTY STATE
  // ----------------------------------------------
  if (isLoading || !currentUser) {
    return (
      <div className="telegram-wrapper loading-screen">
        <div className="spinner"></div>
        <p>Memuat Hypetalk...</p>
      </div>
    );
  }

  // ==============================================
  //  RENDER
  // ==============================================
  return (
    <div className="telegram-wrapper">
      {/* HEADER */}
      <div className="header">
        <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
          <span className="material-icons">menu</span>
        </button>
        <div className="header-title">
          <h2>Hypetalk</h2>
          {requestChats.length > 0 && <span className="badge">{requestChats.length}</span>}
        </div>
        <div className="header-actions">
          <button onClick={() => openModal('search')}>
            <span className="material-icons">search</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="search-bar">
        <span className="material-icons">search</span>
        <input
          type="text"
          placeholder="Cari obrolan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* CHAT LIST */}
      <div className="chat-list">
        {filteredChats.length === 0 ? (
          <div className="empty-chat">Belum ada obrolan. Cari teman baru!</div>
        ) : (
          filteredChats.map((chat) => (
            <div key={chat.id} className="chat-item" onClick={() => handleOpenChat(chat)}>
              <div
                className="avatar"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAvatarClick(chat);
                }}
              >
                {chat.room_id === 'room-1' ? (
                   <span className="material-icons" style={{ fontSize: '32px', color: '#1da1f2' }}>public</span>
                ) : (
                  <img
                    src={chat.partnerProfile?.avatar_url || '/asets/png/profile.webp'}
                    alt="avatar"
                    onError={(e) => (e.currentTarget.src = '/asets/png/profile.webp')}
                  />
                )}
              </div>
              <div className="chat-info">
                <div className="name flex items-center gap-1">
                   {chat.partnerProfile?.username || chat.partnerId} 
                   {chat.partnerProfile?.role && <span dangerouslySetInnerHTML={{ __html: getUserBadge(chat.partnerProfile.role) }} />}
                </div>
                <div className="last-msg">{chat.last_message || 'Klik untuk mulai chat'}</div>
              </div>
              <div className="chat-meta">
                <span className="time">
                  {chat.last_message_at
                    ? new Date(chat.last_message_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => openModal('search')}>
        <span className="material-icons">edit</span>
      </button>

      {/* SIDEBAR */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}>
          <div className="sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-header">
              <h3>Menu</h3>
              <button onClick={() => setIsSidebarOpen(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <ul>
              <li onClick={() => openModal('search')}>
                <span className="material-icons">person_add</span> Chat by ID
              </li>
              <li onClick={() => handleCariDoi()}>
                <span className="material-icons">whatshot</span> Cari Doi ({sisaLimitDoi})
              </li>
              <li onClick={() => openModal('bio')}>
                <span className="material-icons">edit</span> Edit Bio
              </li>
              <li onClick={() => openModal('group')}>
                <span className="material-icons">group_add</span> Buat Grup
              </li>
              <li onClick={() => router.push('/profile')}>
                <span className="material-icons">person</span> Profil Saya
              </li>
              <li onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}>
                <span className="material-icons">logout</span> Keluar
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ========= MODALS ========= */}
      {/* USER PROFILE */}
      {activeModal === 'user-profile' && selectedProfile && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content profile-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-image-section">
              <img
                src={selectedProfile.avatar_url || '/asets/png/profile.webp'}
                alt="profile"
                className="profile-img"
              />
              <div className="profile-name-overlay">
                <h2>
                  {selectedProfile.username}
                  {selectedProfile.umur ? `, ${selectedProfile.umur}` : ''}
                </h2>
              </div>
            </div>
            <div className="profile-actions">
              <button
                onClick={() => {
                  closeModal();
                  router.push(`/hypetalk/room?from=${selectedProfile.id}`);
                }}
              >
                <span className="material-icons">chat</span> Chat
              </button>
              <button
                onClick={() => {
                  closeModal();
                  startCallFromLobby(selectedProfile);
                }}
              >
                <span className="material-icons">call</span> Telpon
              </button>
              <button
                onClick={() => {
                  if (confirm('Blokir user ini?')) {
                    supabase
                      .from('blocked_users')
                      .insert({ blocker_id: currentUser.id, blocked_id: selectedProfile.id })
                      .then(() => closeModal());
                  }
                }}
              >
                <span className="material-icons">block</span> Blokir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BIO */}
      {activeModal === 'bio' && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Biodata</h3>
              <button onClick={closeModal}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="bio-form">
              <input
                type="number"
                placeholder="Umur"
                value={bioForm.umur}
                onChange={(e) => setBioForm({ ...bioForm, umur: e.target.value })}
              />
              <select
                value={bioForm.gender}
                onChange={(e) => setBioForm({ ...bioForm, gender: e.target.value })}
              >
                <option>Pria</option>
                <option>Wanita</option>
              </select>
              <input
                placeholder="Zodiak"
                value={bioForm.zodiak}
                onChange={(e) => setBioForm({ ...bioForm, zodiak: e.target.value })}
              />
              <input
                placeholder="Pekerjaan"
                value={bioForm.pekerjaan}
                onChange={(e) => setBioForm({ ...bioForm, pekerjaan: e.target.value })}
              />
              <input
                placeholder="Hobi"
                value={bioForm.hobi}
                onChange={(e) => setBioForm({ ...bioForm, hobi: e.target.value })}
              />
              <button className="save-btn" onClick={handleSaveBio} disabled={isSavingBio}>
                {isSavingBio ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BUAT GRUP */}
      {activeModal === 'group' && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Buat Grup Baru</h3>
              <button onClick={closeModal}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="input-group">
              <span className="material-icons">group</span>
              <input
                type="text"
                placeholder="Nama grup"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <button className="action-btn" onClick={handleCreateGroup}>
              Buat Grup
            </button>
          </div>
        </div>
      )}

      {/* SEARCH ID */}
      {activeModal === 'search' && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mulai Chat Baru</h3>
              <button onClick={closeModal}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="input-group">
              <span className="material-icons">tag</span>
              <input
                type="text"
                placeholder="ID teman (ABCD)"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
              />
            </div>
            <button className="action-btn" onClick={handleSearchAndChat}>
              Cari dan Chat
            </button>
          </div>
        </div>
      )}

      {/* DOI CARD */}
      {activeModal === 'doi-card' && foundDoi && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content doi-card" onClick={(e) => e.stopPropagation()}>
            <div className="doi-image-section">
              <img
                src={foundDoi.avatar_url || '/asets/png/profile.webp'}
                alt="doi"
                className="doi-avatar"
              />
              <h2 className="doi-name">
                {foundDoi.username}, {foundDoi.umur || '??'}
              </h2>
            </div>
            <div className="doi-bio">
              {foundDoi.pekerjaan && <span className="tag">{foundDoi.pekerjaan}</span>}
              {foundDoi.hobi && <span className="tag">{foundDoi.hobi}</span>}
            </div>
            <button
              className="chat-now-btn"
              onClick={() => {
                closeModal();
                router.push(`/hypetalk/room?from=${foundDoi.id}`);
              }}
            >
              Chat Sekarang
            </button>
          </div>
        </div>
      )}

      {/* LIMIT DOI */}
      {activeModal === 'limit-doi' && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Limit Harian Habis</h3>
            <p>Kamu sudah mencapai batas pencarian hari ini. Tunggu besok ya!</p>
            <button onClick={closeModal}>OK</button>
          </div>
        </div>
      )}

      {/* RADAR SEARCHING OVERLAY */}
      {isSearchingDoi && (
        <div className="doi-search-overlay">
          <div className="radar-container">
            <div className="radar-ring"></div>
            <div className="radar-ring delay-1"></div>
            <div className="radar-center">
              <span className="material-icons">person_search</span>
            </div>
          </div>
          <h3 className="search-title">Mencari kecocokan...</h3>
        </div>
      )}
    </div>
  );
}
