'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import './Hypetalk.css';

let LivekitClient: any = null;
if (typeof window !== 'undefined') {
  import('livekit-client').then(mod => { LivekitClient = mod; });
}

export default function HypetalkPage() {
  const router = useRouter();
  
  // --- STATES UTAMA ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- UI STATES ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [sisaLimitDoi, setSisaLimitDoi] = useState(10);
  
  // --- CARI DOI STATES ---
  const [isSearchingDoi, setIsSearchingDoi] = useState(false);
  const [foundDoi, setFoundDoi] = useState<any>(null);

  // --- EDIT BIO STATES ---
  const [bioForm, setBioForm] = useState({ umur: '', gender: 'Pria', zodiak: '', pekerjaan: '', hobi: '' });
  const [isSavingBio, setIsSavingBio] = useState(false);

  // --- GROUP STATES ---
  const [groupName, setGroupName] = useState('');
  const [groupPhotoUrl, setGroupPhotoUrl] = useState('/asets/png/profile.webp');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // --- CALL STATES ---
  const [callStatus, setCallStatus] = useState<'idle' | 'incoming' | 'calling' | 'connected'>('idle');
  const [callData, setCallData] = useState<any>(null);
  const [callTimer, setCallTimer] = useState('00:00');
  
  // --- REFS ---
  const lastScrollY = useRef(0);
  const callRoomRef = useRef<any>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const inboxChannelRef = useRef<any>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLimit = localStorage.getItem('doi_limit');
      if (savedLimit) setSisaLimitDoi(parseInt(savedLimit));
      ringtoneRef.current = new Audio("/asets/sound/call.wav");
      if (ringtoneRef.current) ringtoneRef.current.loop = true;
    }
    
    initUser();

    return () => {
      if (inboxChannelRef.current) supabase.removeChannel(inboxChannelRef.current);
    };
  }, []);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setCurrentUser({ ...user, ...profile });
    
    // Set form bio bawaan
    setBioForm({
      umur: profile.umur || '',
      gender: profile.gender || 'Pria',
      zodiak: profile.zodiak || '',
      pekerjaan: profile.pekerjaan || '',
      hobi: profile.hobi || ''
    });

    await loadAllChats(user.id);
    subscribeToInbox(user.id);
  };

  // --- CHAT LOGIC ---
  const loadAllChats = async (userId: string) => {
    setIsLoading(true);
    try {
      const waktu24JamLalu = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: pvMsgs } = await supabase.from("messages").select("*").ilike("room_id", "pv_%").ilike("room_id", `%${userId}%`).gte("created_at", waktu24JamLalu).order("created_at", { ascending: false });
      const { data: groups } = await supabase.from('group_members').select(`group_id, groups(id, name, photo_url)`).eq('user_id', userId);

      let finalChats: any[] = [{ id: 'room-1', type: 'global', name: 'HopeTalk Globe', preview: 'Obrolan umum komunitas', time: 'Always', sortTime: Date.now() + 10000 }];

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
              id: p.id, type: 'private', name: p.username, avatar: p.avatar_url, role: p.role, preview: lastMsg.message,
              time: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), sortTime: new Date(lastMsg.created_at).getTime()
            });
          });
        }
      }
      setChats(finalChats.sort((a, b) => b.sortTime - a.sortTime));
    } catch (err) { showNotif("Gagal memuat chat", "error"); } finally { setIsLoading(false); }
  };

  const subscribeToInbox = (userId: string) => {
    if (inboxChannelRef.current) supabase.removeChannel(inboxChannelRef.current);
    const channel = supabase.channel(`inbox-monitor-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (payload.new.is_system && payload.new.message.includes("📞 Memanggil") && payload.new.user_id !== userId) handleIncomingCall(payload.new);
        loadAllChats(userId);
      }).subscribe();
    inboxChannelRef.current = channel;
  };

  // --- CALL LOGIC ---
  const handleIncomingCall = (msg: any) => { setCallData(msg); setCallStatus('incoming'); ringtoneRef.current?.play().catch(() => {}); };
  const answerCall = async () => { ringtoneRef.current?.pause(); setCallStatus('connected'); };
  const rejectCall = () => { ringtoneRef.current?.pause(); setCallStatus('idle'); };

  // --- UI & MODAL HANDLERS ---
  const openModal = (modalName: string) => {
    setActiveModal(modalName);
    setIsSidebarOpen(false); // Tutup sidebar otomatis pas modal kebuka
  };
  
  const closeModal = () => setActiveModal(null);

  // --- AKSI: SIMPAN BIO ---
  const handleSaveBio = async () => {
    setIsSavingBio(true);
    try {
      const updateData = { ...bioForm, umur: Number(bioForm.umur) || null };
      const { error } = await supabase.from("profiles").update(updateData).eq("id", currentUser.id);
      if (error) throw error;
      showNotif("Profil berhasil tersimpan!", "success");
      setCurrentUser((prev: any) => ({ ...prev, ...updateData })); // Update lokal
      closeModal();
    } catch (err) { showNotif("Gagal menyimpan profil.", "error"); }
    finally { setIsSavingBio(false); }
  };

  // --- AKSI: CARI DOI (RADAR) ---
  const handleCariDoi = async () => {
    if (sisaLimitDoi <= 0) return openModal('limit-doi');
    if (!currentUser?.gender) {
      showNotif("Setel Gender kamu dulu di Edit Biodata!", "warning");
      return openModal('bio');
    }

    // Kurangi limit
    const newLimit = sisaLimitDoi - 1;
    setSisaLimitDoi(newLimit);
    localStorage.setItem('doi_limit', String(newLimit));
    setIsSidebarOpen(false);
    setIsSearchingDoi(true);

    const lawanJenis = currentUser.gender === "Pria" ? "Wanita" : "Pria";
    
    // Efek radar nyala 4 detik
    setTimeout(async () => {
      try {
        const { data: users, error } = await supabase.from("profiles").select("*").neq("id", currentUser.id).eq("gender", lawanJenis);
        setIsSearchingDoi(false);
        
        if (error || !users || users.length === 0) {
          showNotif(`Belum ada ${lawanJenis} yang tersedia.`, "info");
          return;
        }

        // Random pick doi
        const doi = users[Math.floor(Math.random() * users.length)];
        setFoundDoi(doi);
        openModal('doi-card');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
      } catch (err) {
        setIsSearchingDoi(false);
        showNotif("Gangguan koneksi.", "error");
      }
    }, 4000);
  };

  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className={`telegram-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* HEADER */}
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

      {/* CHAT LIST */}
      <main className="tg-chat-list">
        {isLoading ? (
          <div className="loading-state">
            <span className="material-icons loading-spinner">sync</span>
            <p>Memuat obrolan...</p>
          </div>
        ) : (
          filteredChats.map(chat => (
            <div key={chat.id} className="tg-chat-item" onClick={() => router.push(chat.type === 'global' ? '/chat' : `/chat?from=${chat.id}`)}>
              {chat.type === 'global' ? (
                <div className="tg-avatar global-avatar"><span className="material-icons">public</span></div>
              ) : (
                <img src={chat.avatar || "/asets/png/profile.webp"} className="tg-avatar" alt="avatar" />
              )}
              <div className="tg-chat-info">
                <div className="tg-chat-top">
                  <h4 className="tg-name">
                    {chat.name} <span dangerouslySetInnerHTML={{ __html: getUserBadge(chat.role) }} />
                  </h4>
                  <span className="tg-time">{chat.time}</span>
                </div>
                <div className="tg-chat-bottom"><p className="tg-preview">{chat.preview}</p></div>
              </div>
            </div>
          ))
        )}
      </main>

      {/* FAB - CHAT BARU */}
      {!activeModal && !isSearchingDoi && (
        <button className="tg-fab" onClick={() => openModal('search')}>
          <span className="material-icons">chat</span>
        </button>
      )}

      {/* SIDEBAR & OVERLAY */}
      {isSidebarOpen && (
        <>
          <div 
            className="sidebar-overlay" 
            style={{ display: 'block' }} 
            onClick={() => setIsSidebarOpen(false)} 
          />
          <aside className="tg-sidebar open">
            <div className="sidebar-header">
              <img className="side-avatar" src={currentUser?.avatar_url || "/asets/png/profile.webp"} alt="me" />
              <div className="sidebar-user-info">
                <h3 className="side-username">{currentUser?.username || "User"}</h3>
                <p className="side-id">#{currentUser?.short_id || "0000"}</p>
              </div>
              <button className="btn-edit-bio" onClick={() => openModal('bio')}>Edit Biodata</button>
            </div>
            <div className="sidebar-menu">
              <button className="menu-item" onClick={() => openModal('group')}>
                <span className="material-icons">group_add</span> Buat Grup Baru
              </button>
              <button className="menu-item btn-cari-doi" onClick={handleCariDoi}>
                <span className="material-icons">favorite</span> Cari Doi Sekarang
                <span className="limit-badge">{sisaLimitDoi}/10</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* === SEMUA MODAL ADA DI SINI === */}
      
      {/* 1. Modal Search Chat */}
      {activeModal === 'search' && (
        <div className="custom-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mulai Chat Baru</h3>
              <button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button>
            </div>
            <p className="modal-desc">Masukkan ID unik temanmu (contoh: 0E870)</p>
            <div className="input-group">
              <span className="material-icons">tag</span>
              <input type="text" placeholder="Ketik ID teman..." id="input-new-id" />
            </div>
            <button className="action-btn">Cari & Chat</button>
          </div>
        </div>
      )}

      {/* 2. Modal Edit Biodata */}
      {activeModal === 'bio' && (
        <div className="custom-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Biodata</h3>
              <button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button>
            </div>
            <p className="modal-desc">Isi data agar bisa ditemukan di radar Cari Doi</p>
            <div className="form-grid">
              <div className="input-group"><input type="number" placeholder="Umur" value={bioForm.umur} onChange={e => setBioForm({...bioForm, umur: e.target.value})} /></div>
              <div className="input-group">
                <select value={bioForm.gender} onChange={e => setBioForm({...bioForm, gender: e.target.value})}>
                  <option value="Pria">Pria</option><option value="Wanita">Wanita</option>
                </select>
              </div>
              <div className="input-group"><input type="text" placeholder="Zodiak" value={bioForm.zodiak} onChange={e => setBioForm({...bioForm, zodiak: e.target.value})} /></div>
              <div className="input-group"><input type="text" placeholder="Pekerjaan" value={bioForm.pekerjaan} onChange={e => setBioForm({...bioForm, pekerjaan: e.target.value})} /></div>
              <div className="input-group" style={{ gridColumn: 'span 2' }}><input type="text" placeholder="Hobi" value={bioForm.hobi} onChange={e => setBioForm({...bioForm, hobi: e.target.value})} /></div>
            </div>
            <button className="action-btn" onClick={handleSaveBio} disabled={isSavingBio}>
              {isSavingBio ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal Buat Grup */}
      {activeModal === 'group' && (
        <div className="custom-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Buat Grup Baru</h3>
              <button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button>
            </div>
            <div className="group-photo-upload">
              <label>
                <img src={groupPhotoUrl} alt="Grup" />
                <div className="upload-badge"><span className="material-icons">camera_alt</span></div>
              </label>
            </div>
            <div className="input-group" style={{ marginBottom: 16 }}>
              <span className="material-icons">groups</span>
              <input type="text" placeholder="Nama Grup..." value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
            <button className="action-btn">Buat Sekarang</button>
          </div>
        </div>
      )}

      {/* 4. OVERLAY RADAR CARI DOI ANIMASI */}
      {isSearchingDoi && (
        <div className="doi-search-overlay" style={{ display: 'flex' }}>
          <div className="paper-plane-container">
            <span className="material-icons paper-plane-icon">send</span>
          </div>
          <div style={{ textAlign: 'center', zIndex: 10 }}>
            <h3 className="search-title-glow">Mencari kecocokan..</h3>
            <p className="search-subtitle-glow">Menjelajah database buat kamu</p>
          </div>
        </div>
      )}

      {/* 5. Modal Hasil Doi Ditemukan */}
      {activeModal === 'doi-card' && foundDoi && (
        <div className="custom-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="custom-modal-content doi-result-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Kecocokan Ditemukan! 🎉</h3>
              <button className="close-modal-btn" onClick={closeModal}><span className="material-icons">close</span></button>
            </div>
            <div className="doi-profile-box">
              <img src={foundDoi.avatar_url || `https://ui-avatars.com/api/?name=${foundDoi.username}`} alt="Doi" />
              <h2>{foundDoi.username}, {foundDoi.umur || "?"}</h2>
              <div className="doi-tags">
                <span className="d-tag"><span className="material-icons">work</span> <span>{foundDoi.pekerjaan || "Sibuk"}</span></span>
                <span className="d-tag"><span className="material-icons">auto_awesome</span> <span>{foundDoi.zodiak || "Rahasia"}</span></span>
                <span className="d-tag" style={{ width: '100%' }}><span className="material-icons">favorite</span> <span>{foundDoi.hobi || "Rebahan"}</span></span>
              </div>
            </div>
            <button className="action-btn love-btn" onClick={() => router.push(`/chat?from=${foundDoi.id}`)}>
              Gas Chat Sekarang
            </button>
          </div>
        </div>
      )}

      {/* 6. Modal Limit Doi */}
      {activeModal === 'limit-doi' && (
        <div className="custom-modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="custom-modal-content text-center" onClick={(e) => e.stopPropagation()}>
            <span className="material-icons" style={{ fontSize: 50, color: '#ef4444', marginBottom: 10 }}>hourglass_empty</span>
            <h3 style={{ marginBottom: 10, color: 'var(--tg-text)' }}>Kuota Habis Bro!</h3>
            <p style={{ fontSize: 14, color: 'var(--tg-text-muted)', marginBottom: 20 }}>Tonton iklan pendek buat dapetin 10 kuota pencarian lagi.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="action-btn outline close-modal-btn" onClick={closeModal} style={{ flex: 1 }}>Nanti Aja</button>
              <button className="action-btn" style={{ flex: 1 }} onClick={() => window.open("https://omg10.com/4/10901295", "_blank")}>Tonton Iklan</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
