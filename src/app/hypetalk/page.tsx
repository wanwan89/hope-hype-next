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

    await loadAllChats(user.id, false);
    subscribeToInbox(user.id);
  };

  // Semua fungsi loadAllChats, subscribeToInbox, dsb. sama seperti sebelumnya – tidak diubah.
  // ... (kode asli loadAllChats, subscribeToInbox, dll - biarkan seperti di atas)

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
    } catch (err) {
      showNotif("Gagal simpan.", "error");
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
    const lawanJenis = currentUser.gender === "Pria" ? "Wanita" : "Pria";

    setTimeout(async () => {
      try {
        const { data: users } = await supabase.from("profiles")
          .select("*")
          .neq("id", currentUser.id)
          .eq("gender", lawanJenis);
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
    if (target) {
      router.push(`/hypetalk/room?from=${target.id}`);
      closeModal();
    } else {
      showNotif("ID tidak ditemukan", "error");
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return showNotif("Nama grup tidak boleh kosong", "error");
    try {
      const { data: newGroup, error } = await supabase.from('groups')
        .insert([{ name: groupName, created_by: currentUser.id }])
        .select()
        .single();
      if (error) throw error;
      await supabase.from('group_members').insert([{ group_id: newGroup.id, user_id: currentUser.id }]);
      showNotif("Grup berhasil dibuat!", "success");
      closeModal();
      router.push(`/hypetalk/room?group=${newGroup.id}&gname=${encodeURIComponent(newGroup.name)}`);
    } catch (err) {
      showNotif("Gagal membuat grup", "error");
    }
  };

  // ... fungsi handleOpenChat, handleAvatarClick, startCallFromLobby tidak berubah

  return (
    <div className="telegram-wrapper">
      {/* HEADER & LIST SAMA PERSIS, TIDAK DIUBAH */}
      {/* ... header, main chat list, fab, sidebar ... */}

      {/* ========= MODAL USER PROFILE (FIX) ========= */}
      {activeModal === 'user-profile' && selectedProfile && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content profile-card" onClick={e => e.stopPropagation()}>
            <div className="profile-image-section">
              <img
                src={selectedProfile.avatar_url || "/asets/png/profile.webp"}
                alt="profile"
                className="profile-img"
              />
              <div className="profile-name-overlay">
                <h2>{selectedProfile.username}{selectedProfile.umur ? `, ${selectedProfile.umur}` : ''}</h2>
              </div>
            </div>
            <div className="profile-actions">
              <button onClick={() => { closeModal(); router.push(`/hypetalk/room?from=${selectedProfile.id}`); }}>
                <span className="material-icons">chat</span> Chat
              </button>
              <button onClick={() => { closeModal(); startCallFromLobby(selectedProfile); }}>
                <span className="material-icons">call</span> Telpon
              </button>
              <button onClick={() => {
                if (confirm("Blokir user ini?")) {
                  supabase.from('blocked_users').insert({ blocker_id: currentUser.id, blocked_id: selectedProfile.id });
                  closeModal();
                }
              }}>
                <span className="material-icons">block</span> Blokir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========= MODAL EDIT BIODATA (FIX + SLIDE UP) ========= */}
      {activeModal === 'bio' && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Biodata</h3>
              <button onClick={closeModal}><span className="material-icons">close</span></button>
            </div>
            <div className="bio-form">
              <input type="number" placeholder="Umur" value={bioForm.umur} onChange={e => setBioForm({ ...bioForm, umur: e.target.value })} />
              <select value={bioForm.gender} onChange={e => setBioForm({ ...bioForm, gender: e.target.value })}>
                <option>Pria</option>
                <option>Wanita</option>
              </select>
              <input placeholder="Zodiak" value={bioForm.zodiak} onChange={e => setBioForm({ ...bioForm, zodiak: e.target.value })} />
              <input placeholder="Pekerjaan" value={bioForm.pekerjaan} onChange={e => setBioForm({ ...bioForm, pekerjaan: e.target.value })} />
              <input placeholder="Hobi" value={bioForm.hobi} onChange={e => setBioForm({ ...bioForm, hobi: e.target.value })} />
              <button className="save-btn" onClick={handleSaveBio} disabled={isSavingBio}>
                {isSavingBio ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========= MODAL BUAT GRUP (FIX + SLIDE UP) ========= */}
      {activeModal === 'group' && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Buat Grup Baru</h3>
              <button onClick={closeModal}><span className="material-icons">close</span></button>
            </div>
            <div className="input-group">
              <span className="material-icons">group</span>
              <input
                type="text"
                placeholder="Nama grup"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
              />
            </div>
            <button className="action-btn" onClick={handleCreateGroup}>Buat Grup</button>
          </div>
        </div>
      )}

      {/* ========= MODAL SEARCH ID (TETAP) ========= */}
      {activeModal === 'search' && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mulai Chat Baru</h3>
              <button onClick={closeModal}><span className="material-icons">close</span></button>
            </div>
            <div className="input-group">
              <span className="material-icons">tag</span>
              <input type="text" placeholder="ID teman (ABCD)" value={searchUserId} onChange={e => setSearchUserId(e.target.value)} />
            </div>
            <button className="action-btn" onClick={handleSearchAndChat}>Cari dan Chat</button>
          </div>
        </div>
      )}

      {/* ========= MODAL DOI CARD (FIX) ========= */}
      {activeModal === 'doi-card' && foundDoi && (
        <div className="tg-modal-overlay active" onClick={closeModal}>
          <div className="tg-modal-content doi-card" onClick={e => e.stopPropagation()}>
            <div className="doi-image-section">
              <img
                src={foundDoi.avatar_url || "/asets/png/profile.webp"}
                alt="doi"
                className="doi-avatar"
              />
              <h2 className="doi-name">{foundDoi.username}, {foundDoi.umur || '??'}</h2>
            </div>
            <div className="doi-bio">
              {foundDoi.pekerjaan && <span className="tag">{foundDoi.pekerjaan}</span>}
              {foundDoi.hobi && <span className="tag">{foundDoi.hobi}</span>}
            </div>
            <button className="chat-now-btn" onClick={() => {
              closeModal();
              router.push(`/hypetalk/room?from=${foundDoi.id}`);
            }}>
              Chat Sekarang
            </button>
          </div>
        </div>
      )}

      {/* ========= ANIMASI RADAR CARI DOI (FIX) ========= */}
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
