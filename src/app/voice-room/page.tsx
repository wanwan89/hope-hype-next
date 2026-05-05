'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils'; 
import './VoiceLobby.css';

const KATEGORI_LIST = ['Populer', 'Nyanyi', 'Ngobrol', 'Mabar'];

export default function VoiceLobbyPage() {
  const router = useRouter();

  // --- STATES ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('Populer');
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  // Modal Create Room States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    name: '',
    desc: '',
    category: 'Nyanyi'
  });

  // --- INIT USER ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles')
        .select('username, avatar_url, coins')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCurrentUser({ ...user, ...profile });
      }
    };

    fetchUser();
  }, [router]);

  // --- LOAD ROOMS ---
  useEffect(() => {
    const loadRooms = async () => {
      setIsLoadingRooms(true);
      
      try {
        let query = supabase.from('rooms').select('id, name, description').eq('is_active', true);

        if (activeCategory !== 'Populer') {
          query = query.eq('category', activeCategory);
        } else {
          query = query.order('created_at', { ascending: false });
        }

        const { data: fetchedRooms, error } = await query;
        if (error) throw error;

        if (!fetchedRooms || fetchedRooms.length === 0) {
          setRooms([]);
          setIsLoadingRooms(false);
          return;
        }

        // Ambil data user yang lagi nongkrong (occupied slots)
        const roomIds = fetchedRooms.map(r => r.id);
        const { data: occupiedSlots } = await supabase.from('room_slots')
          .select('room_id')
          .in('room_id', roomIds)
          .not('profile_id', 'is', null);

        const onlineCounts: Record<string, number> = {};
        if (occupiedSlots) {
          occupiedSlots.forEach(slot => {
            onlineCounts[slot.room_id] = (onlineCounts[slot.room_id] || 0) + 1;
          });
        }

        const finalRooms = fetchedRooms.map(room => ({
          ...room,
          onlineCount: onlineCounts[room.id] || 0
        }));

        setRooms(finalRooms);
      } catch (err) {
        console.error("Gagal memuat room:", err);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    loadRooms();
  }, [activeCategory]);

  // --- CREATE ROOM LOGIC ---
  const handleStartSinging = async () => {
    // FIX ARGUMEN SHOW NOTIF
    if (!currentUser) return showNotif("Login dulu Bree!", "warning");

    try {
      // Cek apakah user udah punya room yang aktif
      const { data: existingRoom } = await supabase.from('rooms')
        .select('id, name')
        .eq('owner_id', currentUser.id)
        .eq('is_active', true)
        .maybeSingle(); 

      if (existingRoom) {
        // Langsung lompat ke room lamanya
        router.push(`/voice?id=${existingRoom.id}&name=${encodeURIComponent(existingRoom.name)}`);
      } else {
        // Buka modal buat bikin room baru
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmCreateRoom = async () => {
    const { name, desc, category } = newRoomForm;

    // FIX ARGUMEN SHOW NOTIF
    if (!name.trim()) return showNotif("Kasih nama panggung dulu dong!", "warning");
    if (!currentUser) return showNotif("Sesi login hilang, coba refresh/login ulang.", "error");

    setIsCreating(true);

    try {
      // 1. Bersihin room lama milik user ini (Sesuai logika Vanilla JS lu)
      const { data: oldRooms } = await supabase.from('rooms').select('id').eq('owner_id', currentUser.id);
      if (oldRooms && oldRooms.length > 0) {
        const oldRoomIds = oldRooms.map(r => r.id);
        await supabase.from('room_slots').delete().in('room_id', oldRoomIds);
        await supabase.from('rooms').delete().in('id', oldRoomIds);
      }

      // 2. Insert Room Baru
      const { data: newRoom, error: roomError } = await supabase.from('rooms').insert([{
        name: name.trim(),
        description: desc.trim() || 'Ayo nyanyi bareng di panggung ini!',
        category: category,
        owner_id: currentUser.id,
        is_active: true
      }]).select().single();

      if (roomError) throw roomError;

      // 3. Siapin 6 Slot Kosong (sebagai kursi buat penyanyi/speaker)
      const slots = Array.from({ length: 6 }, (_, i) => ({
        room_id: newRoom.id,
        slot_index: i,
        profile_id: null
      }));
      
      const { error: slotError } = await supabase.from('room_slots').insert(slots);
      if (slotError) throw slotError;

      // FIX ARGUMEN SHOW NOTIF
      showNotif("Panggung lo udah siap!", "success");
      setIsModalOpen(false);

      // 4. Pindah ke room voice
      router.push(`/voice?id=${newRoom.id}&name=${encodeURIComponent(newRoom.name)}`);

    } catch (e) {
      console.error("Gagal bikin panggung:", e);
      // FIX ARGUMEN SHOW NOTIF
      showNotif("Gagal bikin panggung nih.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="voice-lobby-container">
      {/* HEADER */}
      <header className="lobby-header">
        <div className="header-profile">
          <img src={currentUser?.avatar_url || '/asets/png/profile.webp'} alt="Avatar" />
          <div className="header-info">
            <h3>{currentUser?.username || 'Loading...'}</h3>
            <div className="coin-badge">
              <span className="material-icons" style={{fontSize: '16px'}}>monetization_on</span>
              {currentUser ? (currentUser.coins || 0).toLocaleString() : 0}
            </div>
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="hero-banner">
        <h2>Panggung Lo, Aturan Lo!</h2>
        <p>Bikin panggung suara lo sendiri, nyanyi bareng, atau sekadar ngobrol santai sama yang lain.</p>
        <button className="btn-start-singing" onClick={handleStartSinging}>
          <span className="material-icons" style={{verticalAlign: 'middle', marginRight: '5px', fontSize: '18px'}}>mic</span>
          Mulai Bikin Panggung
        </button>
      </section>

      {/* TABS KATEGORI */}
      <div className="tabs-container">
        {KATEGORI_LIST.map(kategori => (
          <span 
            key={kategori}
            className={`tab-item ${activeCategory === kategori ? 'active' : ''}`}
            onClick={() => setActiveCategory(kategori)}
          >
            {kategori}
          </span>
        ))}
      </div>

      {/* ROOM LIST */}
      <main className="room-list">
        {isLoadingRooms ? (
          <>
            <div className="skeleton-card"><div className="skeleton skeleton-thumb"></div><div style={{flex: 1}}><div className="skeleton skeleton-title"></div><div className="skeleton skeleton-desc" style={{width: '70%'}}></div></div></div>
            <div className="skeleton-card"><div className="skeleton skeleton-thumb"></div><div style={{flex: 1}}><div className="skeleton skeleton-title"></div><div className="skeleton skeleton-desc" style={{width: '40%'}}></div></div></div>
          </>
        ) : rooms.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px'}}>
            Belum ada panggung di kategori {activeCategory}. <br/> Jadilah yang pertama buat panggung!
          </div>
        ) : (
          rooms.map(room => (
            <div 
              key={room.id} 
              className="room-card" 
              onClick={() => router.push(`/voice?id=${room.id}&name=${encodeURIComponent(room.name)}`)}
            >
              <div className="room-thumb">
                <span className="material-icons">graphic_eq</span>
              </div>
              <div className="room-info">
                <h4>{room.name.toUpperCase()}</h4>
                <p>{room.description}</p>
              </div>
              <div className="room-status">
                <div className="online-pill">
                  <span style={{width: '6px', height: '6px', background: '#2ecc71', borderRadius: '50%', display: 'inline-block'}}></span>
                  {room.onlineCount} Online
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {/* MODAL BIKIN ROOM */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Siapin Panggung Lo</h3>
            
            <div className="form-group">
              <label>Nama Panggung</label>
              <input 
                type="text" 
                placeholder="Cth: Nongkrong Santai" 
                maxLength={25}
                value={newRoomForm.name}
                onChange={e => setNewRoomForm({...newRoomForm, name: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Deskripsi (Opsional)</label>
              <input 
                type="text" 
                placeholder="Ayo mabar ml sini..." 
                maxLength={50}
                value={newRoomForm.desc}
                onChange={e => setNewRoomForm({...newRoomForm, desc: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Kategori</label>
              <select 
                value={newRoomForm.category}
                onChange={e => setNewRoomForm({...newRoomForm, category: e.target.value})}
              >
                <option value="Nyanyi">Nyanyi</option>
                <option value="Ngobrol">Ngobrol</option>
                <option value="Mabar">Mabar</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="modal-btn btn-cancel" onClick={() => setIsModalOpen(false)} disabled={isCreating}>
                Batal
              </button>
              <button className="modal-btn btn-confirm" onClick={confirmCreateRoom} disabled={isCreating}>
                {isCreating ? 'Membangun...' : 'Buat Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
