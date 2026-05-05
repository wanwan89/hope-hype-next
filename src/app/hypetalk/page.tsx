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
  const [searchUserId, setSearchUserId] = useState(''); // State buat nyari ID teman

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
        sortTime: Date.now() + 10000 
      }];

      if (pvMsgs) {
        const lastPvMap = new Map();
        pvMsgs.forEach(msg => {
          const pId = msg.room_id.replace("pv_", "").split("_").find((id: string) => id !== userId);
          if (pId && !lastPvMap.has(pId)) lastPvMap.set(pId, msg);
        });

        const partnerIds = Array.from(lastPvMap.keys());
        if (partnerIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, role").in("id", partnerIds);
          profiles?.forEach(p => {
            const lastMsg = lastPvMap.get(p.id);
            finalChats.push({
              id: p.id, 
              type: 'private', 
              name: p.username, 
              avatar: p.avatar_url, 
              role: p.role, 
              preview: lastMsg.message,
              time: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
              sortTime: new Date(lastMsg.created_at).getTime()
            });
          });
        }
      }
      setChats(finalChats.sort((a, b) => b.sortTime - a.sortTime));
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const subscribeToInbox = (userId: string) => {
    supabase.channel(`inbox-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => loadAllChats(userId))
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
        if (!users || users.length === 0) return showNotif("Belum ada doi.", "info");
        setFoundDoi(users[Math.floor(Math.random() * users.length)]);
        openModal('doi-card');
      } catch (err) { setIsSearchingDoi(false); }
    }, 4000);
  };

  // FIX: Navigasi ke chat personal berdasarkan ID hasil pencarian
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
            /* FIX JALUR NAVIGASI: Arahkan ke /hypetalk/... */
            <div key={chat.id} className="tg-chat-item" onClick={() => router.push(chat.type === 'global' ? '/hypetalk/room-1' : `/hypetalk/chat?from=${chat.id}`)}>
              <div className="tg-avatar global-avatar">{chat.type === 'global' ? <span className="material-icons">public</span> : <img src={chat.avatar || "/asets/png/profile.webp"} className="tg-avatar" alt="av" />}</div>
              <div className="tg-chat-info">
                <div className="tg-chat-top">
                  <h4 className="tg-name">{chat.name} <span dangerouslySetInnerHTML={{ __html: getUserBadge(chat.role || 'user') }} /></h4>
                  <span className="tg-time">{chat.time}</span>
                </div>
                <p className="tg-preview">{chat.preview}</p>
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

      {/* MODAL SEARCH */}
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

      {/* MODAL BIO */}
      {activeModal === 'bio' && (
        <div className="custom-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Edit Biodata</h3><button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="form-grid">
              <div className="input-group"><input type="number" placeholder="Umur" value={bioForm.umur} onChange={e => setBioForm({...bioForm, umur: e.target.value})} /></div>
              <div className="input-group"><select value={bioForm.gender} onChange={e => setBioForm({...bioForm, gender: e.target.value})}><option value="Pria">Pria</option><option value="Wanita">Wanita</option></select></div>
              <input type="text" className="input-group" placeholder="Pekerjaan" value={bioForm.pekerjaan} onChange={e => setBioForm({...bioForm, pekerjaan: e.target.value})} />
            </div>
            <button className="action-btn" onClick={handleSaveBio} disabled={isSavingBio}>Simpan</button>
          </div>
        </div>
      )}

      {/* MODAL DOI CARD */}
      {activeModal === 'doi-card' && foundDoi && (
        <div className="custom-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="custom-modal-content doi-result-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Kecocokan Ditemukan!</h3><button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button></div>
            <div className="doi-profile-box">
              <img src={foundDoi.avatar_url || "/asets/png/profile.webp"} alt="Doi" />
              <h2>{foundDoi.username}, {foundDoi.umur}</h2>
            </div>
            {/* FIX JALUR NAVIGASI: /hypetalk/chat */}
            <button className="action-btn love-btn" onClick={() => router.push(`/hypetalk/chat?from=${foundDoi.id}`)}>Gas Chat</button>
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
