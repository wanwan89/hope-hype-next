'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
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
        let myId = null;
        let myGender = null;

        if (authData?.user) {
          myId = authData.user.id;
          setCurrentUser({
            id: myId,
            avatar_url: authData.user.user_metadata?.avatar_url || 'https://via.placeholder.com/150',
          });

          // Ambil profil diri sendiri untuk mengecek gender
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('gender')
            .eq('id', myId)
            .single();
          
          if (myProfile) myGender = myProfile.gender;
        }

        // Susun Query pencarian user
        let query = supabase
          .from('profiles')
          .select(`
            id, username, avatar_url, bio, gender, umur, pekerjaan, hobi, zodiak,
            lokasi, foto_tambahan, pendidikan, minat, preferensi, tinggi_badan, 
            bahasa, agama, merokok, alkohol, olahraga, tujuan, ig_username, spotify_url, tiktok_username, role
          `)
          .limit(10);

        // Filter: Jangan tampilkan diri sendiri
        if (myId) {
          query = query.neq('id', myId);
        }

        // Filter: Tampilkan hanya gender yang berlawanan
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
    if (!activeUser || !currentUser) return;
    setDragX(action === 'like' ? -500 : 500); 

    if (action === 'like') {
      try {
        // 1. Catat like kita di database (Asumsi nama tabel 'user_likes')
        await supabase.from('user_likes').upsert({
          user_id: currentUser.id,
          liked_user_id: activeUser.id,
        });

        // 2. Cek apakah user yang kita like sudah pernah me-like kita sebelumnya
        const { data: matchData } = await supabase
          .from('user_likes')
          .select('id')
          .eq('user_id', activeUser.id)
          .eq('liked_user_id', currentUser.id)
          .maybeSingle();

        // 3. Jika ketemu, maka statusnya saling suka (MATCH)
        if (matchData) {
          showNotif('Kamu mendapatkan Match baru!', 'success');
          setTimeout(() => {
            setMatchedUser(activeUser);
          }, 300);
          return; // Hentikan eksekusi nextCard untuk memunculkan layar Match
        }
      } catch (err) {
        console.error("Gagal memproses like:", err);
      }
    }

    // Jika bukan match atau memilih pass, lanjut ke kartu berikutnya
    setTimeout(() => {
      nextCard();
    }, 300); 
  };

  const nextCard = () => {
    setDragX(0);
    setCurrentIndex((prev) => prev + 1);
    
    const scrollContainer = document.querySelector('.hm-card-scroll-area');
    if (scrollContainer) scrollContainer.scrollTop = 0;
  };

  if (isLoading) {
    return (
      <div className="hm-overlay hm-flex-center">
        <div className="hm-backdrop"></div>
        <h2 style={{ color: 'var(--text-main)', zIndex: 10 }} className="hm-animate-pulse">
          Mencari Hype di sekitarmu...
        </h2>
      </div>
    );
  }

  if (matchedUser) {
    return (
      <div className="hm-overlay hm-match-success-bg hm-glass-clean">
        <div className="hm-match-content">
          <h2 className="hm-match-title">HYPE MATCH!</h2>
          <p>Kamu dan <strong>{matchedUser.username}</strong> saling tertarik!</p>
          <div className="hm-match-avatars">
            <img src={currentUser?.avatar_url} alt="You" className="hm-avatar-circle" />
            <span className="material-icons hm-favorite-icon">favorite</span>
            <img src={matchedUser.avatar_url} alt="Them" className="hm-avatar-circle" />
          </div>
          <button className="hm-btn-chat-now hm-glass-clean" onClick={() => router.push(`/hypetalk/room?from=${matchedUser.id}`)}>
            Mulai Obrolan
          </button>
          <button className="hm-btn-keep-swiping" onClick={() => { setMatchedUser(null); nextCard(); }}>
            Lanjut Mencari
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hm-overlay">
      <div className="hm-backdrop" onClick={router.back}></div>
      {/* Posisi tombol X sekarang fixed di luar kartu penampung */}
      <button className="hm-btn-close" onClick={router.back}>
        <span className="material-icons">close</span>
      </button>

      <div className="hm-card-container">
        {activeUser ? (
          <div 
            className="hm-match-card hm-glass-clean"
            style={{
              overflow: 'hidden', 
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
            <div className="hm-card-scroll-area">
              
              <div className="hm-card-image-wrapper">
                <img 
                  src={activeUser.avatar_url || 'https://via.placeholder.com/400x600'} 
                  alt="avatar" 
                  draggable="false" 
                />
                
                {dragX < -50 && <div className="hm-swipe-indicator hm-like">TERTARIK</div>}
                {dragX > 50 && <div className="hm-swipe-indicator hm-pass">LEWAT</div>}
                
                <div className="hm-card-image-overlay">
                  <h2 style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    {activeUser.username} {activeUser.umur && <span>{activeUser.umur}</span>}
                    
                    {/* BAGIAN YANG DIPERBAIKI: Menggunakan dangerouslySetInnerHTML */}
                    {activeUser.role && (
                      <div 
                        className="hm-role-badge"
                        dangerouslySetInnerHTML={{ __html: getUserBadge(activeUser.role) as string }}
                      />
                    )}
                  </h2>
                  <p>
                    <SvgIcon name="location" />
                    {activeUser.lokasi || "Lokasi disembunyikan"}
                  </p>
                  
                  <div className="hm-scroll-hint hm-animate-bounce">
                    <span className="material-icons">keyboard_arrow_down</span>
                  </div>
                </div>
              </div>

              <div className="hm-card-details">
                <div className="hm-detail-section">
                  <h3>Tentang Diri</h3>
                  <p className="hm-bio-text">{activeUser.bio || "Belum ada bio yang ditulis."}</p>
                </div>

                <div className="hm-detail-section">
                  <h3>Informasi Umum</h3>
                  <div className="hm-info-grid">
                    {activeUser.gender && <div className="hm-info-chip"><SvgIcon name="gender" /> {activeUser.gender}</div>}
                    {activeUser.pekerjaan && <div className="hm-info-chip"><SvgIcon name="job" /> {activeUser.pekerjaan}</div>}
                    {activeUser.pendidikan && <div className="hm-info-chip"><SvgIcon name="education" /> {activeUser.pendidikan}</div>}
                    {activeUser.tinggi_badan && <div className="hm-info-chip"><SvgIcon name="height" /> {activeUser.tinggi_badan} cm</div>}
                    {activeUser.agama && <div className="hm-info-chip"><SvgIcon name="religion" /> {activeUser.agama}</div>}
                    {activeUser.zodiak && <div className="hm-info-chip"><SvgIcon name="zodiac" /> {activeUser.zodiak}</div>}
                  </div>
                </div>

                <div className="hm-detail-section">
                  <h3>Gaya Hidup & Minat</h3>
                  <div className="hm-info-grid">
                    {activeUser.tujuan && <div className="hm-info-chip hm-outline"><SvgIcon name="target" /> {activeUser.tujuan}</div>}
                    {activeUser.hobi && <div className="hm-info-chip hm-outline"><SvgIcon name="hobby" /> {activeUser.hobi}</div>}
                    {activeUser.olahraga && <div className="hm-info-chip hm-outline"><SvgIcon name="sport" /> {activeUser.olahraga}</div>}
                    {activeUser.merokok && <div className="hm-info-chip hm-outline"><SvgIcon name="smoke" /> {activeUser.merokok}</div>}
                    {activeUser.alkohol && <div className="hm-info-chip hm-outline"><SvgIcon name="alcohol" /> {activeUser.alkohol}</div>}
                  </div>
                </div>

                {(activeUser.ig_username || activeUser.tiktok_username || activeUser.spotify_url) && (
                  <div className="hm-detail-section" style={{ marginBottom: '40px' }}>
                    <h3>Media Sosial</h3>
                    <div className="hm-social-links">
                      {activeUser.ig_username && <div className="hm-social-chip">
                        <span style={{ fontWeight: 'bold' }}>IG</span> @{activeUser.ig_username}
                      </div>}
                      {activeUser.tiktok_username && <div className="hm-social-chip">
                        <span style={{ fontWeight: 'bold' }}>TikTok</span> @{activeUser.tiktok_username}
                      </div>}
                      {activeUser.spotify_url && <a href={activeUser.spotify_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <div className="hm-social-chip" style={{ background: '#1DB954', color: 'white' }}>
                          <span style={{ fontWeight: 'bold' }}>Spotify</span> Buka Playlist
                        </div>
                      </a>}
                    </div>
                  </div>
                )}
                
                <div style={{ height: '80px' }}></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="hm-empty-state hm-glass-clean">
            <span className="material-icons hm-empty-icon">sentiment_dissatisfied</span>
            <p>Tidak ada lagi pengguna di sekitarmu.</p>
          </div>
        )}
      </div>

      {activeUser && (
        <div className="hm-action-buttons">
          <button className="hm-btn-action hm-btn-pass hm-glass-clean" onClick={() => handleAction('pass')}>
            <span className="material-icons">close</span>
          </button>
          <button className="hm-btn-action hm-btn-like hm-glass-clean" onClick={() => handleAction('like')}>
            <span className="material-icons">favorite</span>
          </button>
        </div>
      )}
    </div>
  );
}
