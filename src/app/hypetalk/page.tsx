'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import './Hypetalk.css';

export default function HypetalkPage() {
  const router = useRouter();
  const pathname = usePathname();
  
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

  const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLimit = localStorage.getItem('doi_limit');
      if (savedLimit) setSisaLimitDoi(parseInt(savedLimit));
    }
    initUser();
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

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
    
    await loadAllChats(user.id);
    subscribeToInbox(user.id);
  };

  const loadAllChats = async (userId: string) => {
    setIsLoading(true);
    try {
      const waktu24JamLalu = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: pvMsgs } = await supabase.from("messages")
        .select("*")
        .ilike("room_id", "pv_%")
        .ilike("room_id", `%${userId}%`)
        .gte("created_at", waktu24JamLalu)
        .order("created_at", { ascending: false });
      
      let finalChats: any[] = [{ 
        id: 'room-1', 
        type: 'global', 
        name: 'HopeTalk Globe', 
        preview: 'Obrolan umum komunitas', 
        time: 'Always', 
        sortTime: Date.now() + 10000,
        unread: 0
      }];

      if (pvMsgs) {
        const lastPvMap = new Map();
        const unreadMap = new Map(); 

        pvMsgs.forEach(msg => {
          const pId = msg.room_id.replace("pv_", "").split("_").find((id: string) => id !== userId);
          if (pId) {
            if (!lastPvMap.has(pId)) lastPvMap.set(pId, msg);
            // Hitung pesan unread dari lawan bicara
            if (msg.status !== 'read' && msg.user_id !== userId) {
              unreadMap.set(pId, (unreadMap.get(pId) || 0) + 1);
            }
          }
        });

        const partnerIds = Array.from(lastPvMap.keys());
        if (partnerIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, role").in("id", partnerIds);
          profiles?.forEach(p => {
            const lastMsg = lastPvMap.get(p.id);
            let msgPreview = lastMsg.message;
            if (lastMsg.sticker_url) msgPreview = "🖼 Mengirim Stiker";
            if (lastMsg.audio_url) msgPreview = "🎤 Mengirim Voice Note";

            finalChats.push({
              id: p.id, 
              type: 'private', 
              name: p.username, 
              avatar: p.avatar_url, 
              role: p.role, 
              preview: msgPreview,
              time: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
              sortTime: new Date(lastMsg.created_at).getTime(),
              unread: unreadMap.get(p.id) || 0 
            });
          });
        }
      }

      // Opsional: Load Group Chats
      const { data: myGroups } = await supabase.from('group_members').select('group_id, groups(name, photo_url)').eq('user_id', userId);
      if (myGroups) {
        myGroups.forEach((g: any) => {
          if (g.groups) {
            finalChats.push({
              id: g.group_id, type: 'group', name: g.groups.name, avatar: g.groups.photo_url || '/asets/png/profile.webp',
              preview: 'Grup Chat', time: '', sortTime: Date.now() - 1000, unread: 0
            });
          }
        });
      }

      setChats(finalChats.sort((a, b) => b.sortTime - a.sortTime));
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  // FIX 1: Perbaikan Realtime Subscribe
  const subscribeToInbox = (userId: string) => {
    // Pastikan channel name-nya sangat unik dan spesifik untuk menghindari tabrakan
    const channelName = `inbox-lobby-user-${userId}-${Date.now()}`;
    
    supabase.channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload: any) => {
        // Cek kalau pesan baru berkaitan dengan user ini
        const isRelated = payload.new?.room_id?.includes(userId) || payload.old?.room_id?.includes(userId);
        if (isRelated) {
          loadAllChats(userId);
        }
      })
      .subscribe();
  };

  useEffect(() => {
    if (!currentUser || chats.length === 0) return;
    
    const channels = chats.map(chat => {
      if (chat.type !== 'private') return null;
      const ids = [currentUser.id, chat.id].sort();
      const roomId = `pv_${ids[0]}_${ids[1]}`;
      
      return supabase.channel(`presence-typing-${roomId}`)
        .on('broadcast', { event: 'typing' }, () => {
          setTypingStatus(prev => ({ ...prev, [chat.id]: true }));
          setTimeout(() => setTypingStatus(prev => ({ ...prev, [chat.id]: false })), 3000);
        })
        .subscribe();
    });

    return () => { channels.forEach(c => c && supabase.removeChannel(c)); };
  }, [chats, currentUser]);

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
    if(!searchUserId) return;
    const cleanId = searchUserId.replace('#', '').toUpperCase();
    const { data: target } = await supabase.from('profiles').select('id').eq('short_id', cleanId).maybeSingle();
    if (target) {
      router.push(`/hypetalk/chat?from=${target.id}`);
    } else {
      showNotif("ID tidak ditemukan", "error");
    }
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
    } catch (err) {
      showNotif("Gagal membuat grup", "error");
    }
  };

  const handleOpenChat = (chat: any) => {
    // 1. Optimistic Update 
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));

    // 2. Tandai pesan jadi 'read' di DB
    if (chat.type === 'private') {
      const ids = [currentUser.id, chat.id].sort();
      const roomId = `pv_${ids[0]}_${ids[1]}`;
      supabase.from('messages')
        .update({ status: 'read' })
        .eq('room_id', roomId)
        .neq('user_id', currentUser.id) 
        .neq('status', 'read')
        .then();
    }

    // 3. Navigasi
    if (chat.type === 'global') {
      router.push('/hypetalk/room-1');
    } else if (chat.type === 'group') {
      router.push(`/hypetalk/chat?group=${chat.id}&gname=${encodeURIComponent(chat.name)}`);
    } else {
      router.push(`/hypetalk/chat?from=${chat.id}`);
    }
  };

  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className={`telegram-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <header className="tg-header">
        <div className="tg-header-top">
          <div className="tg-header-left">
            <button className="icon-btn" onClick={() => setIsSidebarOpen(true)}>
              <span className="material-icons">menu</span>
            </button>
            <h2>Hypetalk</h2>
          </div>
          <button className="icon-btn" onClick={() => router.push('/settings')}>
            <span className="material-icons">settings</span>
          </button>
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
          <div className="loading-state"><span className="material-icons loading-spinner">sync</span><p>Memuat...</p></div>
        ) : (
          filteredChats.map(chat => (
            <div key={chat.id} className="tg-chat-item" onClick={() => handleOpenChat(chat)}>
              
              <div className="tg-avatar global-avatar">
                {chat.type === 'global' ? <span className="material-icons">public</span> : <img src={chat.avatar || "/asets/png/profile.webp"} className="tg-avatar" alt="av" />}
              </div>
              
              <div className="tg-chat-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                
                <div className="tg-chat-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h4 className="tg-name" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {chat.name} <span dangerouslySetInnerHTML={{ __html: getUserBadge(chat.role || 'user') }} />
                  </h4>
                  {/* FIX 2: Waktu (Time) */}
                  <span className="tg-time" style={{ fontSize: '11px', color: chat.unread > 0 ? '#3a7bd5' : 'var(--text-muted)', fontWeight: chat.unread > 0 ? 'bold' : 'normal', flexShrink: 0, marginLeft: '8px' }}>
                    {chat.time}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {typingStatus[chat.id] ? (
                    <p className="tg-preview" style={{ color: '#3a7bd5', fontStyle: 'italic', fontWeight: 600, margin: 0, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      sedang mengetik...
                    </p>
                  ) : (
                    <p className="tg-preview" style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      {chat.preview}
                    </p>
                  )}

                  {/* FIX 2: Badge Angka Warna Biru (Primary Blue) */}
                  {chat.unread > 0 && (
                    <div style={{ background: '#3a7bd5', color: 'white', borderRadius: '10px', padding: '0 6px', fontSize: '11px', fontWeight: 'bold', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px', flexShrink: 0 }}>
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

      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />
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

      {/* MODAL SEARCH ID */}
      {activeModal === 'search' && (
        <div className="custom-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Mulai Chat Baru</h3><button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="input-group">
              <span className="material-icons">tag</span>
              <input type="text" placeholder="ID teman (Contoh: ABCD)" value={searchUserId} onChange={e => setSearchUserId(e.target.value)} />
            </div>
            <button className="action-btn" onClick={handleSearchAndChat}>Cari & Chat</button>
          </div>
        </div>
      )}

      {/* MODAL BUAT GRUP */}
      {activeModal === 'group' && (
        <div className="custom-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Buat Grup Baru</h3><button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="input-group">
              <span className="material-icons">groups</span>
              <input type="text" placeholder="Nama Grup (Max 20 Karakter)..." maxLength={20} value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
            <button className="action-btn" onClick={handleCreateGroup}>Buat & Mulai Obrolan</button>
          </div>
        </div>
      )}

      {/* MODAL BIO */}
      {activeModal === 'bio' && (
        <div className="custom-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Edit Biodata</h3><button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="form-grid">
              <div className="input-group"><input type="number" placeholder="Umur" value={bioForm.umur} onChange={e => setBioForm({...bioForm, umur: e.target.value})} /></div>
              <div className="input-group"><select value={bioForm.gender} onChange={e => setBioForm({...bioForm, gender: e.target.value})}><option value="Pria">Pria</option><option value="Wanita">Wanita</option></select></div>
              <input type="text" className="input-group" placeholder="Pekerjaan" value={bioForm.pekerjaan} onChange={e => setBioForm({...bioForm, pekerjaan: e.target.value})} />
              <input type="text" className="input-group" placeholder="Hobi (Contoh: Main Game)" value={bioForm.hobi} onChange={e => setBioForm({...bioForm, hobi: e.target.value})} />
              <input type="text" className="input-group" placeholder="Zodiak" value={bioForm.zodiak} onChange={e => setBioForm({...bioForm, zodiak: e.target.value})} />
            </div>
            <button className="action-btn" onClick={handleSaveBio} disabled={isSavingBio}>Simpan</button>
          </div>
        </div>
      )}

      {/* MODAL DOI CARD DENGAN FULL BIO */}
      {activeModal === 'doi-card' && foundDoi && (
        <div className="custom-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="custom-modal-content doi-result-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Kecocokan Ditemukan!</h3><button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="doi-profile-box" style={{ padding: '20px', background: 'var(--label-bg)', borderRadius: '16px', marginBottom: '20px' }}>
              <img src={foundDoi.avatar_url || "/asets/png/profile.webp"} alt="Doi" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #ff4757', marginBottom: '10px' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{foundDoi.username}, {foundDoi.umur}</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', textAlign: 'center' }}>
                {foundDoi.pekerjaan && <div>💼 {foundDoi.pekerjaan}</div>}
                {foundDoi.hobi && <div>🎨 {foundDoi.hobi}</div>}
                {foundDoi.zodiak && <div>✨ {foundDoi.zodiak}</div>}
                {!foundDoi.pekerjaan && !foundDoi.hobi && !foundDoi.zodiak && <div><i>Belum mengisi bio lengkap</i></div>}
              </div>
            </div>
            <button className="action-btn love-btn" onClick={() => router.push(`/hypetalk/chat?from=${foundDoi.id}`)} style={{ width: '100%', background: 'linear-gradient(135deg, #ff4757, #ff7755)' }}>Gas Chat 🚀</button>
          </div>
        </div>
      )}

      {isSearchingDoi && (
        <div className="doi-search-overlay" style={{ display: 'flex' }}>
          <div className="paper-plane-container"><span className="material-icons paper-plane-icon">send</span></div>
          <h3 className="search-title-glow">Mencari kecocokan..</h3>
        </div>
      )}
    </div>
  );
}
