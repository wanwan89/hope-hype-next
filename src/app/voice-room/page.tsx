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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles')
        .select('username, avatar_url, coins, id')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setCurrentUser(profile);
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
          return;
        }

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

  // --- LOGIKA BUKA ROOM ---
  const handleStartSinging = async () => {
    if (!currentUser) return showNotif("Login dulu Bree!", "warning");

    try {
      const { data: existingRoom } = await supabase.from('rooms')
        .select('id, name')
        .eq('owner_id', currentUser.id)
        .eq('is_active', true)
        .maybeSingle(); 

      if (existingRoom) {
        router.push(`/voice?id=${existingRoom.id}&name=${encodeURIComponent(existingRoom.name)}`);
      } else {
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmCreateRoom = async () => {
    const { name, desc, category } = newRoomForm;
    if (!name.trim()) return showNotif("Kasih nama panggung dulu dong!", "warning");
    if (!currentUser) return showNotif("Sesi hilang, login ulang ya.", "error");

    setIsCreating(true);
    try {
      const { data: oldRooms } = await supabase.from('rooms').select('id').eq('owner_id', currentUser.id);
      if (oldRooms && oldRooms.length > 0) {
        const oldRoomIds = oldRooms.map(r => r.id);
        await supabase.from('room_slots').delete().in('room_id', oldRoomIds);
        await supabase.from('rooms').delete().in('id', oldRoomIds);
      }

      const { data: newRoom, error: roomError } = await supabase.from('rooms').insert([{
        name: name.trim(),
        description: desc.trim() || 'Ayo nyanyi bareng!',
        category: category,
        owner_id: currentUser.id,
        is_active: true
      }]).select().single();

      if (roomError) throw roomError;

      const slots = Array.from({ length: 6 }, (_, i) => ({
        room_id: newRoom.id,
        slot_index: i,
        profile_id: null
      }));
      
      await supabase.from('room_slots').insert(slots);
      showNotif("Panggung siap!", "success");
      setIsModalOpen(false);
      router.push(`/voice?id=${newRoom.id}&name=${encodeURIComponent(newRoom.name)}`);
    } catch (e) {
      showNotif("Gagal buat panggung.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="voice-lobby-container">
      {/* HEADER (Sticky Fix) */}
      <header className="lobby-header">
        <div className="header-profile">
          <img src={currentUser?.avatar_url || '/asets/png/profile.webp'} alt="Av" />
          <div className="header-info">
            <h3>{currentUser?.username || 'Hi, Bree!'}</h3>
            <div className="coin-badge">
              <span className="material-icons" style={{fontSize: '14px'}}>monetization_on</span>
              {currentUser ? (currentUser.coins || 0).toLocaleString() : 0}
            </div>
          </div>
        </div>
        <button className="icon-btn" onClick={() => router.push('/settings')}>
           <span className="material-icons">settings</span>
        </button>
      </header>

      {/* HERO BANNER */}
      <section className="hero-banner">
        <h2>Panggung Lo, Aturan Lo!</h2>
        <p>Bikin panggung suara lo sendiri, nyanyi bareng, atau sekadar ngobrol santai.</p>
        <button className="btn-start-singing" onClick={handleStartSinging}>
          <span className="material-icons">mic</span>
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
          [1,2,3].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-thumb"></div>
              <div style={{flex: 1}}><div className="skeleton" style={{height:'15px', width:'60%', marginBottom:'8px'}}></div><div className="skeleton" style={{height:'10px', width:'80%'}}></div></div>
            </div>
          ))
        ) : rooms.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px'}}>
            Belum ada panggung di kategori ini.
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
                   <div style={{width:'6px', height:'6px', background:'#16a34a', borderRadius:'50%'}}></div>
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
              <input type="text" placeholder="Cth: Nongkrong Santai" maxLength={25} value={newRoomForm.name} onChange={e => setNewRoomForm({...newRoomForm, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Kategori</label>
              <select value={newRoomForm.category} onChange={e => setNewRoomForm({...newRoomForm, category: e.target.value})}>
                <option value="Nyanyi">Nyanyi</option>
                <option value="Ngobrol">Ngobrol</option>
                <option value="Mabar">Mabar</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="modal-btn btn-cancel" onClick={() => setIsModalOpen(false)}>Batal</button>
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
