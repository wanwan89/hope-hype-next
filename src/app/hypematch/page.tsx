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
// KOMPONEN SVG ICON KEKINIAN
// ==========================================
const SvgIcon = ({ name, className = "", size = 20, style }: { name: string, className?: string, size?: number, style?: React.CSSProperties }) => {
  const stroke = "currentColor";
  const fill = "none";
  const strokeWidth = "2";

  const icons: Record<string, React.ReactNode> = {
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
    arrowUp: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />,
    arrowDown: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />,
    filter: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18 6L6 18M6 6l12 12" />,
    heart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
    location: <><path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
    gender: <><circle cx="12" cy="10" r="4"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6"/></>,
    job: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
    education: <><path strokeLinecap="round" strokeLinejoin="round" d="M22 10v6M2 10l10-5 10 5-10 5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M6 12v5c3 3 9 3 12 0v-5"/></>,
    height: <><path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4M22 4h-4M22 20h-4M14 4l-4-4-4 4M14 20l-4 4-4-4M10 0v24"/></>,
    religion: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M8 6h8" /></>,
    zodiac: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path strokeLinecap="round" strokeLinejoin="round" d="M8 12a4 4 0 0 1 8 0"/></>,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
    hobby: <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
    sport: <path strokeLinecap="round" strokeLinejoin="round" d="M14.4 14.4 9.6 9.6M18.65 21.35a2 2 0 0 1-2.83 0l-5.66-5.66a2 2 0 0 1 0-2.83l.71-.71a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83l-.71.71ZM7.15 2.65a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83l-.71.71a2 2 0 0 1-2.83 0L7 6.19a2 2 0 0 1 0-2.83l.15-.71Z"/>,
    smoke: <path strokeLinecap="round" strokeLinejoin="round" d="M18 20H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2ZM12 6V2M8 6V4M16 6V4"/>,
    alcohol: <path strokeLinecap="round" strokeLinejoin="round" d="M8 22h8M12 15v7M12 15a7.5 7.5 0 0 0 7.5-7.5c0-4.14-3.36-7.5-7.5-7.5s-7.5 3.36-7.5 7.5A7.5 7.5 0 0 0 12 15z"/>,
    language: <><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    social: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path strokeLinecap="round" strokeLinejoin="round" d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>
  };

  return (
    <svg 
      width={size} height={size} viewBox="0 0 24 24" 
      fill={fill} stroke={stroke} strokeWidth={strokeWidth} 
      className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
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

  const dragRef = useRef({ startX: 0, startY: 0, isDragging: false });
  const activeUser = users?.[currentIndex];

  useEffect(() => {
    // [KODE FETCH DATA SAMA SEPERTI SEBELUMNYA]
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

  const likeBtnScale = 1 + (dragX > 0 ? Math.min(dragX / 300, 0.3) : 0);
  const passBtnScale = 1 + (dragX < 0 ? Math.min(Math.abs(dragX) / 300, 0.3) : 0);

  return (
    <div className="hm-overlay">
      <div className="hm-header">
        <h1 className="hm-logo-text">HypeMatch</h1>
        <button className="hm-icon-btn-transparent" onClick={() => router.push('/hypematch/filter')}>
          <SvgIcon name="filter" size={26} />
        </button>
      </div>

      <div className="hm-stack-container">
        {stackedUsers.length > 0 ? (
          stackedUsers.map((user, idx) => {
            const isTop = idx === 0;
            const bgColors = ['var(--bg-card)', 'var(--bg-secondary)', 'var(--border-card)'];
            
            return (
              <div 
                key={user.id}
                className="hm-card-item"
                style={{
                  backgroundColor: bgColors[idx % bgColors.length],
                  zIndex: 10 - idx,
                  transform: isTop 
                    ? `translateX(${dragX}px) rotate(${dragX * 0.05}deg)` 
                    : `scale(${1 - idx * 0.04}) translateY(${idx * 15}px)`,
                  opacity: 1 - (idx * 0.1),
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
                <img src={user.avatar_url || 'https://via.placeholder.com/400x600'} alt="avatar" className="hm-card-img" draggable="false" />
                
                {isTop && (
                  <>
                    <div className="swipe-stamp stamp-like" style={{ opacity: dragX > 50 ? (dragX / 100) : 0 }}>LIKE</div>
                    <div className="swipe-stamp stamp-pass" style={{ opacity: dragX < -50 ? (Math.abs(dragX) / 100) : 0 }}>NOPE</div>
                  </>
                )}

                <div className="hm-card-info-overlay">
                  <h2 className="hm-card-title">
                    {user.username} {user.umur && <span>{user.umur}</span>}
                    {user.role && <div className="hm-role-badge-wrapper" dangerouslySetInnerHTML={{ __html: getUserBadge(user.role) as string }} />}
                  </h2>
                  <div className="hm-card-pills">
                    <div className="hm-pill"><SvgIcon name="location" size={14} style={{marginRight: 4}} /> {user.lokasi || "Lokasi disembunyikan"}</div>
                    {user.tujuan && <div className="hm-pill"><SvgIcon name="target" size={14} style={{marginRight: 4}} />{user.tujuan}</div>}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="hm-empty-state">
            <SvgIcon name="x" className="hm-empty-icon hm-no-margin" size={60} />
            <p>Tidak ada lagi pengguna di sekitarmu.</p>
          </div>
        )}

        {/* ACTION BUTTONS */}
        {activeUser && (
          <div className="hm-fixed-action-bar">
            <button className="hm-action-btn btn-pass" onClick={(e) => { e.stopPropagation(); handleAction('pass'); }} style={{ transform: `scale(${passBtnScale})` }}>
              <SvgIcon name="x" className="hm-no-margin" size={28} />
            </button>
            
            {/* GANTI ICON KE ARROW UP */}
            <button className="hm-action-btn btn-fire" onClick={(e) => { e.stopPropagation(); setShowBiodata(true); }}>
              <SvgIcon name="arrowUp" className="hm-no-margin" size={24} />
            </button>

            <button className="hm-action-btn btn-like" onClick={(e) => { e.stopPropagation(); handleAction('like'); }} style={{ transform: `scale(${likeBtnScale})` }}>
              <SvgIcon name="heart" className="hm-no-margin" size={28} />
            </button>
          </div>
        )}
      </div>

      {/* SLIDE-UP BIODATA (Lebih Clean & Lengkap) */}
      <div 
        className={`hm-biodata-slide ${showBiodata ? 'open' : ''}`}
        style={{
          transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
          transform: showBiodata ? 'translateY(0)' : 'translateY(100%)'
        }}
      >
        <div 
          className="hm-biodata-header" 
          onClick={() => setShowBiodata(false)}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', padding: '10px 0' }}
        >
          {/* SVG PANAH KE BAWAH DI TENGAH ATAS */}
          <SvgIcon name="arrowDown" size={28} style={{ color: '#ccc' }} />
        </div>
        
        {activeUser && (
          <div className="hm-biodata-content">
            <h2 className="hm-biodata-title">{activeUser.username} {activeUser.umur && `, ${activeUser.umur}`}</h2>
            <p className="hm-biodata-subtitle">{activeUser.pekerjaan || "Belum ada pekerjaan"}</p>
            
            <div className="hm-biodata-section">
              <h4>Tentang Saya</h4>
              <p>{activeUser.bio_hype || "Belum ada bio yang ditulis."}</p>
            </div>

            <div className="hm-biodata-section">
              <h4>Informasi Dasar</h4>
              <div className="hm-chips-wrapper">
                {activeUser.gender && <div className="hm-info-chip"><SvgIcon name="gender" size={16} /> {activeUser.gender}</div>}
                {activeUser.pendidikan && <div className="hm-info-chip"><SvgIcon name="education" size={16} /> {activeUser.pendidikan}</div>}
                {activeUser.tinggi_badan && <div className="hm-info-chip"><SvgIcon name="height" size={16} /> {activeUser.tinggi_badan} cm</div>}
                {activeUser.zodiak && <div className="hm-info-chip"><SvgIcon name="zodiac" size={16} /> {activeUser.zodiak}</div>}
                {activeUser.agama && <div className="hm-info-chip"><SvgIcon name="religion" size={16} /> {activeUser.agama}</div>}
                {activeUser.bahasa && activeUser.bahasa.length > 0 && <div className="hm-info-chip"><SvgIcon name="language" size={16} /> {activeUser.bahasa.join(', ')}</div>}
              </div>
            </div>

            <div className="hm-biodata-section">
              <h4>Gaya Hidup & Minat</h4>
              <div className="hm-chips-wrapper">
                {activeUser.tujuan && <div className="hm-info-chip"><SvgIcon name="target" size={16} /> {activeUser.tujuan}</div>}
                {activeUser.preferensi && <div className="hm-info-chip"><SvgIcon name="heart" size={16} /> {activeUser.preferensi}</div>}
                {activeUser.hobi && <div className="hm-info-chip"><SvgIcon name="hobby" size={16} /> {activeUser.hobi}</div>}
                {activeUser.minat && activeUser.minat.length > 0 && <div className="hm-info-chip"><SvgIcon name="fire" size={16} /> {activeUser.minat.join(', ')}</div>}
                {activeUser.olahraga && <div className="hm-info-chip"><SvgIcon name="sport" size={16} /> {activeUser.olahraga}</div>}
                {activeUser.merokok && <div className="hm-info-chip"><SvgIcon name="smoke" size={16} /> {activeUser.merokok}</div>}
                {activeUser.alkohol && <div className="hm-info-chip"><SvgIcon name="alcohol" size={16} /> {activeUser.alkohol}</div>}
              </div>
            </div>

            {(activeUser.ig_username || activeUser.tiktok_username || activeUser.spotify_url) && (
              <div className="hm-biodata-section">
                <h4>Sosial Media</h4>
                <div className="hm-chips-wrapper">
                  {activeUser.ig_username && <div className="hm-info-chip"><SvgIcon name="social" size={16} /> @{activeUser.ig_username}</div>}
                  {activeUser.tiktok_username && <div className="hm-info-chip"><SvgIcon name="social" size={16} /> @{activeUser.tiktok_username}</div>}
                  {activeUser.spotify_url && <div className="hm-info-chip"><SvgIcon name="social" size={16} /> Spotify Connected</div>}
                </div>
              </div>
            )}

            <div style={{ height: '80px' }}></div>
          </div>
        )}
      </div>

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
