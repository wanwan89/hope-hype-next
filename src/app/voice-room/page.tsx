'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import RefreshableWrapper from '@/components/RefreshableWrapper';

// Import komponen Lottie dan animasi JSON
import Lottie from 'lottie-react';
import emptyAnimation from '@/assets/lottie/empty.json';

// Import komponen modular yang sudah dipisah
import CreateRoomModal from '@/components/VoiceLobby/CreateRoomModal';
import CoinSheet from '@/components/VoiceLobby/CoinSheet';

import './VoiceLobby.css';

// Kategori diubah ke bahasa baku untuk tampilan, ID tetap sama untuk query DB
const KATEGORI_MAP = [
  { id: 'Populer', label: 'Populer' },
  { id: 'Nyanyi', label: 'Bernyanyi' },
  { id: 'Ngobrol', label: 'Mengobrol' },
  { id: 'Mabar', label: 'Bermain Gim' }
];

export default function VoiceLobbyPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('Populer');
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCoinSheetOpen, setIsCoinSheetOpen] = useState(false);

  // Bersihkan class body yang nyangkut dari Voice Room
  useEffect(() => {
    document.body.classList.remove('in-voice-room');
    document.body.classList.add('in-home-app');
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setCurrentUser(profile);
      } else {
        setCurrentUser({ id: user.id, email: user.email, username: 'Bree', coins: 0 });
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchUser(); }, [router]);

  const fetchRooms = useCallback(async (category: string) => {
    setIsLoadingRooms(true);
    try {
      let query = supabase.from('rooms').select('id, name, description').eq('is_active', true);
      if (category !== 'Populer') {
        query = query.eq('category', category);
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
      const { data: occupiedSlots } = await supabase.from('room_slots').select('room_id').in('room_id', roomIds).not('profile_id', 'is', null);
      const onlineCounts: Record<string, number> = {};
      
      if (occupiedSlots) {
        occupiedSlots.forEach(slot => { onlineCounts[slot.room_id] = (onlineCounts[slot.room_id] || 0) + 1; });
      }
      
      setRooms(fetchedRooms.map(room => ({ ...room, onlineCount: onlineCounts[room.id] || 0 })));
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsLoadingRooms(false); 
    }
  }, []);

  useEffect(() => {
    fetchRooms(activeCategory);
  }, [activeCategory, fetchRooms]);

  const handleRefresh = async () => {
    await fetchUser();
    await fetchRooms(activeCategory);
    await new Promise(resolve => setTimeout(resolve, 800));
  };

  const handleStartSinging = async () => {
    if (!currentUser) return showNotif('Harap masuk terlebih dahulu.', "warning");
    try {
      const { data: existingRoom } = await supabase.from('rooms').select('id, name').eq('owner_id', currentUser.id).eq('is_active', true).maybeSingle();
      if (existingRoom) {
        router.push(`/voice?id=${existingRoom.id}&name=${encodeURIComponent(existingRoom.name)}`);
      } else {
        setIsModalOpen(true);
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="voice-lobby-container" style={{ position: 'relative' }}>
      
      {/* Header: Teks Hyperoom diperkecil menjadi 20px */}
      <header 
        className="lobby-header" 
        style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg-main)',
          padding: '16px 20px', borderBottom: '1px solid var(--border-card)'
        }}
      >
        <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '20px', letterSpacing: '0.5px' }}>
          Hyperoom
        </div>
        <div className="coin-badge" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setIsCoinSheetOpen(true)}>
          {currentUser ? (currentUser.coins || 0).toLocaleString() : 0}
          <span className="material-icons" style={{fontSize: '14px', marginLeft: '4px'}}>add_circle</span>
        </div>
      </header>

      <RefreshableWrapper onRefresh={handleRefresh}>
        <div style={{ paddingBottom: '80px' }}>
          
          <section className="hero-banner">
            <h2>Ruang Suara Interaktif</h2>
            <p>Bergabunglah dengan komunitas atau mulai percakapan suara Anda sendiri.</p>
            <button className="btn-start-singing" onClick={handleStartSinging} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* SVG Plus (+) sebagai icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Buat Ruang Suara
            </button>
          </section>

          <div className="tabs-container">
            {KATEGORI_MAP.map(kat => (
              <span
                key={kat.id}
                className={`voice-tab-item ${activeCategory === kat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(kat.id)}
              >
                {kat.label}
              </span>
            ))}
          </div>

          <main className="room-list">
            {isLoadingRooms ? (
              [1,2,3].map(i => <div key={i} className="skeleton-card" style={{height:'60px', borderRadius:'18px', background:'var(--bg-card)', marginBottom:'10px'}} />)
            ) : rooms.length === 0 ? (
              <div className="no-rooms-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
                {/* Animasi Lottie saat ruangan kosong */}
                <Lottie 
                  animationData={emptyAnimation} 
                  loop={true} 
                  style={{ width: 250, height: 250 }} 
                />
                <p style={{ color: 'var(--text-muted)', marginTop: '15px', fontWeight: '500' }}>
                  Belum ada ruang suara di kategori ini.
                </p>
              </div>
            ) : (
              rooms.map(room => (
                <div key={room.id} className="room-card" onClick={() => router.push(`/voice?id=${room.id}&name=${encodeURIComponent(room.name)}`)}>
                  <div className="room-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* SVG Suara Global */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391S21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12Z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-3-6v4m-3-3v2m9-3v4m3-3v2"/>
                      </g>
                    </svg>
                  </div>
                  <div className="room-info">
                    <h4>{room.name.toUpperCase()}</h4>
                    <p>{room.description}</p>
                  </div>
                  <div className="room-status">
                    <div className="online-pill">
                      <div className="dot-green" style={{width:'6px', height:'6px', borderRadius:'50%', background:'currentColor'}}></div>
                      {room.onlineCount} Daring
                    </div>
                  </div>
                </div>
              ))
            )}
          </main>

        </div>
      </RefreshableWrapper>

      {/* Komponen Modular */}
      <CreateRoomModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        currentUser={currentUser} 
      />

      <CoinSheet 
        isOpen={isCoinSheetOpen} 
        onClose={() => setIsCoinSheetOpen(false)} 
        currentUser={currentUser} 
        onSuccess={fetchUser} 
      />
      
    </div>
  );
}