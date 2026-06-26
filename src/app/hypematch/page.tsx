'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import HypeMatchOpening from '@/components/HypeMatch/HypeMatchOpening';
import MatchSuccessOverlay from '@/components/HypeMatch/MatchSuccessOverlay';
import './HypeMatchOverlay.css';

export type MatchUser = {
  id: string;
  username: string;
  avatar_url: string;
  bio_hype: string;
  gender: string;
  umur?: number | string;
  pekerjaan?: string;
  hobi?: string;
  zodiak?: string;
  lokasi?: string;
  foto_tambahan?: string[];
  pendidikan?: string;
  minat?: string[];
  preferensi?: string;
  tinggi_badan?: number;
  bahasa?: string[];
  agama?: string;
  merokok?: string;
  alkohol?: string;
  olahraga?: string;
  tujuan?: string;
  ig_username?: string;
  spotify_url?: string;
  tiktok_username?: string;
  role?: string;
};

// ==========================================
// KOMPONEN SVG ICON
// ==========================================
const SvgIcon = ({ name, className = "" }: { name: string, className?: string }) => {
  const size = 22;
  const stroke = "currentColor";
  const fill = "none";
  const strokeWidth = "2";

  const icons: Record<string, React.ReactNode> = {
    arrowLeft: <><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></>,
    filter: <><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></>,
    x: <><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></>,
    heart: <><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></>,
    fire: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 2c0 0-4 3-4 7s2 5 2 5-3-3-3-6c0-2 2-4 2-4s-3 3-3 7c0 4.418 3.582 8 8 8s8-3.582 8-8c0-4-3-7-3-7s2 2 2 4c0 3-3 6-3 6s2-1 2-5c0-4-4-7-4-7z" /></>,
    location: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></>,
    gender: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v6m-3-3h6M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" /></>,
    job: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
    education: <><path strokeLinecap="round" strokeLinejoin="round" d="M4 19l4-2m0 0l8 4 4-2M12 3L2 8l10 5 10-5-10-5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M22 13v4m-10 5v-5" /></>,
    height: <><path strokeLinecap="round" strokeLinejoin="round" d="M8 3v18M16 3v18M8 6h8M8 12h8M8 18h8" /></>,
    religion: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M8 6h8" /></>,
    zodiac: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v4l3 3" /></>,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
    hobby: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></>,
    sport: <><path strokeLinecap="round" strokeLinejoin="round" d="M6 5v14M18 5v14M4 7h4M16 7h4M4 17h4M16 17h4M6 12h12" /></>,
    smoke: <><path strokeLinecap="round" strokeLinejoin="round" d="M4 16h16M4 20h16M9 4v4M15 2v6" /></>,
    alcohol: <><path strokeLinecap="round" strokeLinejoin="round" d="M8 22h8M12 15v7M5 3l7 12 7-12H5z" /></>,
  };

  return (
    <svg 
      width={size} height={size} viewBox="0 0 24 24" 
      fill={fill} stroke={stroke} strokeWidth={strokeWidth} 
      className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {icons[name] || icons.location}
    </svg>
  );
};

export default function HypeMatch() {
  const router = useRouter();

  const [users, setUsers] = useState<MatchUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true); 
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [matchedUser, setMatchedUser] = useState<MatchUser | null>(null);

  const [showBiodata, setShowBiodata] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const dragRef = useRef({ startX: 0, startY: 0, isDragging: false });
  const activeUser = users?.[currentIndex];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data: authData } = await supabase.auth.getUser();
        let myId = null;
        let myGender = null;

        if (authData?.user) {
          myId = authData.user.id;
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('gender, avatar_url')
            .eq('id', myId)
            .single();
          
          setCurrentUser({
            id: myId,
            avatar_url: myProfile?.avatar_url || authData.user.user_metadata?.avatar_url || 'https://via.placeholder.com/150',
          });

          if (myProfile) myGender = myProfile.gender;
        }

        let query = supabase
          .from('profiles')
          .select(`
            id, username, avatar_url, bio_hype, gender, umur, pekerjaan, hobi, zodiak,
            lokasi, foto_tambahan, pendidikan, minat, preferensi, tinggi_badan, 
            bahasa, agama, merokok, alkohol, olahraga, tujuan, ig_username, spotify_url, tiktok_username, role
          `)
          .limit(10);

        if (myId) query = query.neq('id', myId);

        if (myGender) {
          const genderLower = myGender.toLowerCase();
          if (genderLower === 'laki-laki' || genderLower === 'pria') {
            query = query.in('gender', ['Perempuan', 'Wanita']);
          } else if (genderLower === 'perempuan' || genderLower === 'wanita') {
            query = query.in('gender', ['Laki-laki', 'Pria']);
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          const cleanUsers = data.map((profile: any) => ({
            ...profile,
            username: profile.username || 'Anonim',
          }));
          setUsers(cleanUsers);
        }
      } catch (error) {
        console.error('Gagal mengambil data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDragStart = (clientX: number, clientY: number) => {
    if (showBiodata) return; 
    dragRef.current = { startX: clientX, startY: clientY, isDragging: true };
  };

  const handleDragMove = (clientX: number) => {
    if (!dragRef.current.isDragging) return;
    const currentDragX = clientX - dragRef.current.startX;
    setDragX(currentDragX);
  };

  const handleDragEnd = () => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;

    const threshold = 100; 
    if (dragX < -threshold) {
      handleAction('pass');
    } else if (dragX > threshold) {
      handleAction('like');
    } else {
      setDragX(0);
    }
  };

  const handleAction = async (action: 'like' | 'pass') => {
    if (!activeUser || !currentUser) return;
    setDragX(action === 'like' ? 500 : -500); 

    if (action === 'like') {
      try {
        await supabase.from('user_likes').upsert({
          user_id: currentUser.id,
          liked_user_id: activeUser.id,
        }, { onConflict: 'user_id,liked_user_id' });

        const { data: matchData } = await supabase
          .from('user_likes')
          .select('id')
          .eq('user_id', activeUser.id)
          .eq('liked_user_id', currentUser.id)
          .maybeSingle();

        if (matchData) {
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]); 
          }
          showNotif('Kamu mendapatkan Match baru!', 'success');
          setTimeout(() => { setMatchedUser(activeUser); }, 300);
          return; 
        }
      } catch (err) {
        console.error("Gagal memproses like:", err);
      }
    }

    setTimeout(() => {
      nextCard();
    }, 300); 
  };

  const nextCard = () => {
    setDragX(0);
    setShowBiodata(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleChatNow = () => {
    if (matchedUser) {
      router.push(`/hypetalk/room?from=${matchedUser.id}`);
    }
  };

  if (showIntro) return <HypeMatchOpening onComplete={() => setShowIntro(false)} />;
  if (isLoading) return <div className="hm-loading"><h2>Memuat Data...</h2></div>;

  const stackedUsers = users.slice(currentIndex, currentIndex + 3);

  return (
    <div className="hm-overlay">
      {/* PENYESUAIAN CSS UNTUK LAYOUT YANG LEBIH SOLID */}
      <style dangerouslySetInnerHTML={{__html: `
        .hm-overlay { 
          position: fixed; inset: 0; 
          background: #111; color: white; 
          display: flex; flex-direction: column; 
          overflow: hidden; font-family: sans-serif; 
          width: 100vw; height: 100dvh;
        }

        /* HEADER DIPERBAIKI (Tombol di pojok) */
        .hm-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 15px 20px; 
          width: 100%; 
          box-sizing: border-box; /* Mencegah overflow */
          z-index: 50; 
        }
        .hm-icon-btn { 
          background: rgba(255,255,255,0.15); border: none; color: white; 
          border-radius: 50%; width: 45px; height: 45px; 
          display: flex; align-items: center; justify-content: center; 
          cursor: pointer; backdrop-filter: blur(10px); transition: 0.2s; 
        }
        .hm-icon-btn:active { transform: scale(0.9); }

        /* CONTAINER CARD DIPERBAIKI (Agar card tidak 0px / hilang) */
        .hm-stack-container { 
          flex: 1; 
          width: 100%; 
          position: relative; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
        }
        .hm-card-item { 
          position: absolute; 
          width: calc(100% - 40px); /* Margin 20px kiri kanan */
          max-width: 400px; 
          height: 65vh; 
          border-radius: 20px; 
          overflow: hidden; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.5); 
          will-change: transform; 
          background-color: #2a2a40; /* Warna fallback jika foto gagal muat */
        }
        .hm-card-img { 
          width: 100%; height: 100%; object-fit: cover; pointer-events: none; 
          position: absolute; top: 0; left: 0;
        }
        .hm-card-info-overlay { 
          position: absolute; bottom: 0; left: 0; right: 0; 
          padding: 60px 20px 20px; 
          background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, transparent 100%); 
          pointer-events: none; z-index: 2;
        }
        .hm-card-title { font-size: 26px; font-weight: bold; display: flex; align-items: center; gap: 8px; margin: 0 0 5px; text-shadow: 1px 1px 3px rgba(0,0,0,0.8); }
        .hm-card-subtitle { font-size: 15px; opacity: 0.9; margin: 0; display: flex; align-items: center; gap: 6px; }
        
        /* ACTION BAR */
        .hm-action-bar { 
          display: flex; justify-content: center; align-items: center; 
          gap: 25px; padding: 20px; z-index: 50; 
          margin-bottom: 10px;
        }
        .hm-action-btn { 
          border: none; border-radius: 50%; display: flex; 
          align-items: center; justify-content: center; cursor: pointer; 
          box-shadow: 0 5px 15px rgba(0,0,0,0.3); transition: 0.2s; 
        }
        .hm-action-btn:active { transform: scale(0.9); }
        .btn-pass { width: 60px; height: 60px; background: #fff; color: #fd5c63; }
        .btn-fire { width: 50px; height: 50px; background: #fff; color: #ff9800; }
        .btn-like { width: 60px; height: 60px; background: #fff; color: #00e676; }

        /* BIODATA SLIDE-UP */
        .hm-biodata-slide { 
          position: absolute; bottom: 0; left: 0; right: 0; background: #1a1a2e; 
          height: 75vh; border-radius: 30px 30px 0 0; z-index: 100; 
          transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); 
          transform: translateY(100%); display: flex; flex-direction: column; 
        }
        .hm-biodata-slide.open { transform: translateY(0); box-shadow: 0 -10px 40px rgba(0,0,0,0.7); }
        .hm-biodata-header { display: flex; justify-content: center; padding: 15px; }
        .hm-biodata-handle { width: 50px; height: 5px; background: rgba(255,255,255,0.3); border-radius: 10px; }
        .hm-biodata-content { padding: 20px; overflow-y: auto; flex: 1; }
        .hm-info-chip { background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 20px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; margin: 0 8px 8px 0; }
        
        /* MODAL FILTER */
        .hm-filter-modal { 
          position: absolute; top: 70px; right: 20px; background: #222; 
          padding: 20px; border-radius: 15px; z-index: 150; 
          box-shadow: 0 5px 20px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); display: none; 
        }
        .hm-filter-modal.open { display: block; }
        
        /* STAMP LIKE / NOPE */
        .swipe-stamp { 
          position: absolute; top: 40px; padding: 5px 15px; border: 4px solid; 
          border-radius: 10px; font-size: 30px; font-weight: bold; text-transform: uppercase; 
          z-index: 10; opacity: 0; 
        }
        .stamp-like { right: 30px; color: #00e676; border-color: #00e676; transform: rotate(15deg); }
        .stamp-pass { left: 30px; color: #fd5c63; border-color: #fd5c63; transform: rotate(-15deg); }
      `}}/>

      {/* HEADER: KEMBALI DI KIRI, FILTER DI KANAN */}
      <div className="hm-header">
        <button className="hm-icon-btn" onClick={() => router.back()}>
          <SvgIcon name="arrowLeft" />
        </button>
        <button className="hm-icon-btn" onClick={() => setShowFilter(!showFilter)}>
          <SvgIcon name="filter" />
        </button>
      </div>

      {/* FILTER MODAL */}
      <div className={`hm-filter-modal ${showFilter ? 'open' : ''}`}>
        <h4 style={{ margin: '0 0 10px' }}>Filter Pencarian</h4>
        <label style={{ fontSize: '13px', opacity: 0.8 }}>Rentang Usia (Cth: 18 - 30)</label>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <input type="number" placeholder="Min" style={{ width: '60px', padding: '5px', borderRadius: '5px', border: 'none' }}/>
          <input type="number" placeholder="Max" style={{ width: '60px', padding: '5px', borderRadius: '5px', border: 'none' }}/>
        </div>
        <button 
          onClick={() => setShowFilter(false)}
          style={{ width: '100%', padding: '8px', marginTop: '15px', background: 'white', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
        >
          Terapkan
        </button>
      </div>

      {/* STACKED CARDS */}
      <div className="hm-stack-container">
        {stackedUsers.length > 0 ? (
          stackedUsers.map((user, idx) => {
            const isTop = idx === 0;
            const bgColors = ['#1a1a2e', '#2a2a40', '#3b3b55'];
            
            return (
              <div 
                key={user.id}
                className="hm-card-item"
                style={{
                  backgroundColor: bgColors[idx % bgColors.length],
                  zIndex: 10 - idx,
                  transform: isTop 
                    ? `translateX(${dragX}px) rotate(${dragX * 0.05}deg)` 
                    : `scale(${1 - idx * 0.06}) translateY(${idx * 20}px)`,
                  opacity: 1 - (idx * 0.15),
                  transition: (isTop && dragRef.current.isDragging) ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease',
                }}
                onMouseDown={(e) => isTop && handleDragStart(e.clientX, e.clientY)}
                onMouseMove={(e) => isTop && handleDragMove(e.clientX)}
                onMouseUp={() => isTop && handleDragEnd()}
                onMouseLeave={() => isTop && handleDragEnd()}
                onTouchStart={(e) => isTop && handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => isTop && handleDragMove(e.touches[0].clientX)}
                onTouchEnd={() => isTop && handleDragEnd()}
              >
                <img 
                  src={user.avatar_url || 'https://via.placeholder.com/400x600'} 
                  alt="avatar" 
                  className="hm-card-img" 
                  draggable="false" 
                />
                
                {isTop && (
                  <>
                    <div className="swipe-stamp stamp-like" style={{ opacity: dragX > 50 ? (dragX / 100) : 0 }}>LIKE</div>
                    <div className="swipe-stamp stamp-pass" style={{ opacity: dragX < -50 ? (Math.abs(dragX) / 100) : 0 }}>NOPE</div>
                  </>
                )}

                <div className="hm-card-info-overlay">
                  <h2 className="hm-card-title">
                    {user.username} {user.umur && <span>{user.umur}</span>}
                    {user.role && <div dangerouslySetInnerHTML={{ __html: getUserBadge(user.role) as string }} style={{ zoom: 0.8 }}/>}
                  </h2>
                  <p className="hm-card-subtitle">
                    <SvgIcon name="location" /> {user.lokasi || "Lokasi disembunyikan"}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.5 }}>
            <SvgIcon name="x" className="hm-empty-icon" />
            <p>Tidak ada lagi pengguna di sekitarmu.</p>
          </div>
        )}
      </div>

      {/* ACTION BUTTONS (X, API, LOVE) */}
      {activeUser && (
        <div className="hm-action-bar">
          <button className="hm-action-btn btn-pass" onClick={() => handleAction('pass')}>
            <SvgIcon name="x" />
          </button>
          
          <button className="hm-action-btn btn-fire" onClick={() => setShowBiodata(true)}>
            <SvgIcon name="fire" />
          </button>

          <button className="hm-action-btn btn-like" onClick={() => handleAction('like')}>
            <SvgIcon name="heart" />
          </button>
        </div>
      )}

      {/* SLIDE-UP BIODATA */}
      <div className={`hm-biodata-slide ${showBiodata ? 'open' : ''}`}>
        <div className="hm-biodata-header" onClick={() => setShowBiodata(false)} style={{ cursor: 'pointer' }}>
          <div className="hm-biodata-handle"></div>
        </div>
        
        {activeUser && (
          <div className="hm-biodata-content">
            <h2 style={{ marginBottom: '5px' }}>{activeUser.username}</h2>
            <p style={{ opacity: 0.7, marginTop: 0, marginBottom: '20px' }}>{activeUser.pekerjaan || "Belum ada pekerjaan"}</p>
            
            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 10px', color: '#ff9800' }}>Tentang Saya</h4>
              <p style={{ lineHeight: 1.5, fontSize: '15px' }}>{activeUser.bio_hype || "Belum ada bio yang ditulis."}</p>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 10px', color: '#ff9800' }}>Informasi Dasar</h4>
              <div>
                {activeUser.gender && <div className="hm-info-chip"><SvgIcon name="gender" /> {activeUser.gender}</div>}
                {activeUser.pendidikan && <div className="hm-info-chip"><SvgIcon name="education" /> {activeUser.pendidikan}</div>}
                {activeUser.tinggi_badan && <div className="hm-info-chip"><SvgIcon name="height" /> {activeUser.tinggi_badan} cm</div>}
                {activeUser.zodiak && <div className="hm-info-chip"><SvgIcon name="zodiac" /> {activeUser.zodiak}</div>}
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 10px', color: '#ff9800' }}>Gaya Hidup & Minat</h4>
              <div>
                {activeUser.tujuan && <div className="hm-info-chip"><SvgIcon name="target" /> {activeUser.tujuan}</div>}
                {activeUser.hobi && <div className="hm-info-chip"><SvgIcon name="hobby" /> {activeUser.hobi}</div>}
                {activeUser.olahraga && <div className="hm-info-chip"><SvgIcon name="sport" /> {activeUser.olahraga}</div>}
                {activeUser.merokok && <div className="hm-info-chip"><SvgIcon name="smoke" /> {activeUser.merokok}</div>}
              </div>
            </div>

            <div style={{ height: '50px' }}></div>
          </div>
        )}
      </div>

      {/* OVERLAY MATCH */}
      <MatchSuccessOverlay
        matchedUser={matchedUser}
        currentUser={currentUser}
        onChatNow={handleChatNow} 
        nextCard={nextCard}
        setMatchedUser={setMatchedUser}
      />
    </div>
  );
}
