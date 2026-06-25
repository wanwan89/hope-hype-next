'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import './HypeMatchOverlay.css'; 

type MatchUser = {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
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
  // --- Kolom Baru ---
  role?: string;
};

// ==========================================
// KOMPONEN SVG ICON KHUSUS BIODATA
// ==========================================
const SvgIcon = ({ name, className = "" }: { name: string, className?: string }) => {
  const size = 18;
  const stroke = "currentColor";
  const fill = "none";
  const strokeWidth = "2";

  const icons: Record<string, React.ReactNode> = {
    location: <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" />,
    gender: <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v6m-3-3h6M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />,
    job: <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />,
    education: <path strokeLinecap="round" strokeLinejoin="round" d="M4 19l4-2m0 0l8 4 4-2M12 3L2 8l10 5 10-5-10-5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M22 13v4m-10 5v-5" />,
    height: <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v18M16 3v18M8 6h8M8 12h8M8 18h8" />,
    religion: <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M8 6h8" />, // Simple cross/star concept
    zodiac: <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v4l3 3" />,
    target: <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />,
    hobby: <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
    sport: <path strokeLinecap="round" strokeLinejoin="round" d="M6 5v14M18 5v14M4 7h4M16 7h4M4 17h4M16 17h4M6 12h12" />,
    smoke: <path strokeLinecap="round" strokeLinejoin="round" d="M4 16h16M4 20h16M9 4v4M15 2v6" />,
    alcohol: <path strokeLinecap="round" strokeLinejoin="round" d="M8 22h8M12 15v7M5 3l7 12 7-12H5z" />,
  };

  return (
    <svg 
      width={size} height={size} viewBox="0 0 24 24" 
      fill={fill} stroke={stroke} strokeWidth={strokeWidth} 
      className={className} style={{ marginRight: '6px', opacity: 0.8 }}
    >
      {icons[name] || icons.location}
    </svg>
  );
};


export default function HypeMatch() {
  const router = useRouter();

  const [users, setUsers] = useState<MatchUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [matchedUser, setMatchedUser] = useState<MatchUser | null>(null);
  
  const dragRef = useRef({ startX: 0, startY: 0, isDragging: false, isScrolling: false });

  const activeUser = users?.[currentIndex];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          setCurrentUser({
            id: authData.user.id,
            avatar_url: 'https://via.placeholder.com/150',
          });
        }

        // Ambil data termasuk role
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id, username, avatar_url, bio, gender, umur, pekerjaan, hobi, zodiak,
            lokasi, foto_tambahan, pendidikan, minat, preferensi, tinggi_badan, 
            bahasa, agama, merokok, alkohol, olahraga, tujuan, ig_username, spotify_url, tiktok_username, role
          `)
          .limit(10);

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
    dragRef.current = { startX: clientX, startY: clientY, isDragging: true, isScrolling: false };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragRef.current.isDragging) return;
    const currentDragX = clientX - dragRef.current.startX;
    const currentDragY = clientY - dragRef.current.startY;
    
    if (!dragRef.current.isScrolling && Math.abs(currentDragY) > Math.abs(currentDragX) + 5) {
      dragRef.current.isScrolling = true;
    }

    if (dragRef.current.isScrolling) return;

    setDragX(currentDragX);
  };

  const handleDragEnd = () => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;

    if (dragRef.current.isScrolling) {
      dragRef.current.isScrolling = false;
      return;
    }

    const threshold = 100; 

    if (dragX < -threshold) {
      handleAction('like');
    } else if (dragX > threshold) {
      handleAction('pass');
    } else {
      setDragX(0);
    }
  };

  const handleAction = async (action: 'like' | 'pass') => {
    if (!activeUser) return;
    setDragX(action === 'like' ? -500 : 500); 

    setTimeout(() => {
      if (action === 'like') {
        const isMatch = false; 
        if (isMatch) setMatchedUser(activeUser);
        else nextCard();
      } else {
        nextCard();
      }
    }, 300); 
  };

  const nextCard = () => {
    setDragX(0);
    setCurrentIndex((prev) => prev + 1);
    
    const scrollContainer = document.querySelector('.card-scroll-area');
    if (scrollContainer) scrollContainer.scrollTop = 0;
  };

  if (isLoading) {
    return (
      <div className="hype-match-overlay flex-center">
        <div className="overlay-backdrop"></div>
        <h2 style={{ color: 'var(--text-main)', zIndex: 10 }} className="animate-pulse">
          Mencari Hype di sekitarmu...
        </h2>
      </div>
    );
  }

  if (matchedUser) {
    return (
      <div className="hype-match-overlay match-success-bg glass-clean">
        <div className="match-content">
          <h2 className="match-title">HYPE MATCH!</h2>
          <p>Kamu dan <strong>{matchedUser.username}</strong> saling tertarik!</p>
          <div className="match-avatars">
            <img src={currentUser?.avatar_url} alt="You" className="avatar-circle" />
            <span className="material-icons favorite-icon">favorite</span>
            <img src={matchedUser.avatar_url} alt="Them" className="avatar-circle" />
          </div>
          <button className="btn-chat-now glass-clean" onClick={() => router.push(`/hypetalk/room?from=${matchedUser.id}`)}>
            Mulai Obrolan
          </button>
          <button className="btn-keep-swiping" onClick={() => { setMatchedUser(null); nextCard(); }}>
            Lanjut Mencari
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hype-match-overlay">
      <div className="overlay-backdrop" onClick={router.back}></div>
      <button className="btn-close-overlay" onClick={router.back}>
        <span className="material-icons">close</span>
      </button>

      <div className="card-container">
        {activeUser ? (
          <div 
            className="match-card glass-clean"
            style={{
              overflow: 'hidden', // Pastikan border radius kartu membungkus scroll area
              transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
              transition: dragRef.current.isDragging ? 'none' : 'transform 0.3s ease-out',
            }}
            onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleDragEnd}
          >
            {/* AREA BISA DI SCROLL - Tinggi 100% dari kartu */}
            <div className="card-scroll-area" style={{ height: '100%', overflowY: 'auto', position: 'relative' }}>
              
              {/* === BOX 1: PROFIL UTAMA (Full Height) === */}
              <div style={{ position: 'relative', height: '100%', width: '100%', flexShrink: 0 }}>
                <img 
                  src={activeUser.avatar_url || 'https://via.placeholder.com/400x600'} 
                  alt="avatar" 
                  draggable="false" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                
                {/* Indikator Swipe */}
                {dragX < -50 && <div className="swipe-indicator like" style={{ position: 'absolute', top: 40, right: 20 }}>TERTARIK</div>}
                {dragX > 50 && <div className="swipe-indicator pass" style={{ position: 'absolute', top: 40, left: 20 }}>LEWAT</div>}
                
                {/* Overlay Nama, Umur, Role, Lokasi */}
                <div style={{ 
                  position: 'absolute', bottom: 0, left: 0, right: 0, 
                  padding: '40px 20px 20px 20px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)',
                  color: 'white',
                  pointerEvents: 'none'
                }}>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '2rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    {activeUser.username} {activeUser.umur && <span>, {activeUser.umur}</span>}
                    {/* Badge Role */}
                    {activeUser.role && (
                      <span style={{
                        background: 'linear-gradient(45deg, #FF3366, #FF9933)',
                        color: 'white', fontSize: '0.85rem', fontWeight: 'bold',
                        padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.5px'
                      }}>
                        {activeUser.role}
                      </span>
                    )}
                  </h2>
                  <p style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', opacity: 0.9 }}>
                    <SvgIcon name="location" />
                    {activeUser.lokasi || "Lokasi disembunyikan"}
                  </p>
                  
                  {/* Panah Scroll */}
                  <div style={{ textAlign: 'center', marginTop: '16px', opacity: 0.7 }} className="animate-bounce">
                    <span className="material-icons">keyboard_arrow_down</span>
                  </div>
                </div>
              </div>

              {/* === BOX 2: BIODATA LENGKAP TERPISAH === */}
              <div style={{ 
                position: 'relative', 
                background: 'var(--bg-main, #ffffff)', // Sesuai tema
                zIndex: 10,
                marginTop: '-24px', // Membuat efek menimpa gambar sedikit
                borderRadius: '24px 24px 0 0',
                padding: '24px',
                minHeight: '50%',
                color: 'var(--text-main, #333)'
              }}>
                
                {/* Bio Section */}
                <div className="detail-section" style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', fontWeight: 'bold' }}>Tentang Diri</h3>
                  <p style={{ lineHeight: '1.5', opacity: 0.8 }}>{activeUser.bio || "Belum ada bio yang ditulis."}</p>
                </div>

                {/* Grid Informasi Umum */}
                <div className="detail-section" style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', fontWeight: 'bold' }}>Informasi Umum</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {activeUser.gender && <div className="info-chip"><SvgIcon name="gender" /> {activeUser.gender}</div>}
                    {activeUser.pekerjaan && <div className="info-chip"><SvgIcon name="job" /> {activeUser.pekerjaan}</div>}
                    {activeUser.pendidikan && <div className="info-chip"><SvgIcon name="education" /> {activeUser.pendidikan}</div>}
                    {activeUser.tinggi_badan && <div className="info-chip"><SvgIcon name="height" /> {activeUser.tinggi_badan} cm</div>}
                    {activeUser.agama && <div className="info-chip"><SvgIcon name="religion" /> {activeUser.agama}</div>}
                    {activeUser.zodiak && <div className="info-chip"><SvgIcon name="zodiac" /> {activeUser.zodiac}</div>}
                  </div>
                </div>

                {/* Lifestyle & Preferensi */}
                <div className="detail-section" style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', fontWeight: 'bold' }}>Gaya Hidup & Minat</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {activeUser.tujuan && <div className="info-chip outline"><SvgIcon name="target" /> {activeUser.tujuan}</div>}
                    {activeUser.hobi && <div className="info-chip outline"><SvgIcon name="hobby" /> {activeUser.hobi}</div>}
                    {activeUser.olahraga && <div className="info-chip outline"><SvgIcon name="sport" /> {activeUser.olahraga}</div>}
                    {activeUser.merokok && <div className="info-chip outline"><SvgIcon name="smoke" /> {activeUser.merokok}</div>}
                    {activeUser.alkohol && <div className="info-chip outline"><SvgIcon name="alcohol" /> {activeUser.alkohol}</div>}
                  </div>
                </div>

                {/* Media Sosial Section */}
                {(activeUser.ig_username || activeUser.tiktok_username || activeUser.spotify_url) && (
                  <div className="detail-section" style={{ marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', fontWeight: 'bold' }}>Media Sosial</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {activeUser.ig_username && <div className="social-chip" style={{ display: 'flex', alignItems: 'center', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                        <span style={{ fontWeight: 'bold', marginRight: '8px' }}>IG</span> @{activeUser.ig_username}
                      </div>}
                      {activeUser.tiktok_username && <div className="social-chip" style={{ display: 'flex', alignItems: 'center', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                        <span style={{ fontWeight: 'bold', marginRight: '8px' }}>TikTok</span> @{activeUser.tiktok_username}
                      </div>}
                      {activeUser.spotify_url && <a href={activeUser.spotify_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="social-chip" style={{ display: 'flex', alignItems: 'center', padding: '10px', background: '#1DB954', color: 'white', borderRadius: '12px' }}>
                          <span style={{ fontWeight: 'bold', marginRight: '8px' }}>Spotify</span> Buka Playlist
                        </div>
                      </a>}
                    </div>
                  </div>
                )}
                
                {/* Spacer agar tidak tertutup tombol di bawah */}
                <div style={{ height: '80px' }}></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state glass-clean">
            <span className="material-icons empty-icon">sentiment_dissatisfied</span>
            <p>Tidak ada lagi pengguna di sekitarmu.</p>
          </div>
        )}
      </div>

      {activeUser && (
        <div className="action-buttons" style={{ zIndex: 100 }}>
          <button className="btn-action btn-pass glass-clean" onClick={() => handleAction('pass')}>
            <span className="material-icons">close</span>
          </button>
          <button className="btn-action btn-like glass-clean" onClick={() => handleAction('like')}>
            <span className="material-icons">favorite</span>
          </button>
        </div>
      )}
    </div>
  );
}
