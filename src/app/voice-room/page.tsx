'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import RefreshableWrapper from '@/components/RefreshableWrapper';

// Import komponen modular yang sudah dipisah
import CreateRoomModal from '@/components/VoiceLobby/CreateRoomModal';
import CoinSheet from '@/components/VoiceLobby/CoinSheet';

import './VoiceLobby.css';

const KATEGORI_MAP = [
  { id: 'Populer', label: 'category_popular' },
  { id: 'Nyanyi', label: 'category_singing' },
  { id: 'Ngobrol', label: 'category_chatting' },
  { id: 'Mabar', label: 'category_gaming' }
];

export default function VoiceLobbyPage() {
  const router = useRouter();
  const { t } = useTranslation();

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
    if (!currentUser) return showNotif(t('login_warning'), "warning");
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
      
      {/* Header Baru: Hanya berisi tombol top up koin */}
      <header 
        className="lobby-header" 
        style={{ 
          display: 'flex', justifyContent: 'flex-start', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg-main)',
          padding: '16px 20px', borderBottom: '1px solid var(--border-card)'
        }}
      >
        <div className="coin-badge" style={{ cursor: 'pointer' }} onClick={() => setIsCoinSheetOpen(true)}>
          {currentUser ? (currentUser.coins || 0).toLocaleString() : 0}
          <span className="material-icons" style={{fontSize: '14px', marginLeft: '4px'}}>add_circle</span>
        </div>
      </header>

      <RefreshableWrapper onRefresh={handleRefresh}>
        <div style={{ paddingBottom: '80px' }}>
          
          <section className="hero-banner">
            <h2>{t('hero_title')}</h2>
            <p>{t('hero_desc')}</p>
            <button className="btn-start-singing" onClick={handleStartSinging}>
              <span className="material-icons">mic</span>
              {t('hero_btn')}
            </button>
          </section>

          <div className="tabs-container">
            {KATEGORI_MAP.map(kat => (
              <span
                key={kat.id}
                className={`voice-tab-item ${activeCategory === kat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(kat.id)}
              >
                {t(kat.label)}
              </span>
            ))}
          </div>

          <main className="room-list">
            {isLoadingRooms ? (
              [1,2,3].map(i => <div key={i} className="skeleton-card" style={{height:'60px', borderRadius:'18px', background:'var(--bg-card)', marginBottom:'10px'}} />)
            ) : rooms.length === 0 ? (
              <div className="no-rooms-info" style={{textAlign:'center', color:'var(--text-muted)', marginTop:'40px'}}>
                {t('no_rooms')}
              </div>
            ) : (
              rooms.map(room => (
                <div key={room.id} className="room-card" onClick={() => router.push(`/voice?id=${room.id}&name=${encodeURIComponent(room.name)}`)}>
                  <div className="room-thumb"><span className="material-icons">graphic_eq</span></div>
                  <div className="room-info">
                    <h4>{room.name.toUpperCase()}</h4>
                    <p>{room.description}</p>
                  </div>
                  <div className="room-status">
                    <div className="online-pill">
                      <div className="dot-green" style={{width:'6px', height:'6px', borderRadius:'50%', background:'currentColor'}}></div>
                      {room.onlineCount} Online
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
