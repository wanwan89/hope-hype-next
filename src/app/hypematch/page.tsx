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
  // --- Kolom Baru ---
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
};

export default function HypeMatch() {
  const router = useRouter();

  const [users, setUsers] = useState<MatchUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [matchedUser, setMatchedUser] = useState<MatchUser | null>(null);
  
  // Ref untuk deteksi swipe vs scroll
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

        // Ambil SEMUA kolom termasuk yang baru ditambahkan
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id, username, avatar_url, bio, gender, umur, pekerjaan, hobi, zodiak,
            lokasi, foto_tambahan, pendidikan, minat, preferensi, tinggi_badan, 
            bahasa, agama, merokok, alkohol, olahraga, tujuan, ig_username, spotify_url, tiktok_username
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
    
    // Deteksi apakah user sedang scroll ke bawah atau swipe ke samping
    if (!dragRef.current.isScrolling && Math.abs(currentDragY) > Math.abs(currentDragX) + 5) {
      dragRef.current.isScrolling = true;
    }

    // Jika sedang scroll vertikal, jangan geser kartu ke samping
    if (dragRef.current.isScrolling) return;

    setDragX(currentDragX);
  };

  const handleDragEnd = () => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;

    // Reset jika ini murni scroll
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
        const isMatch = false; // Set true jika mau testing layar MATCH
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
    
    // Reset scroll posisi ke atas saat ganti orang
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
        {/* Konten Match Tetap Sama */}
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
            {/* AREA BISA DI SCROLL */}
            <div className="card-scroll-area">
              
              {/* Gambar Utama (Full View) */}
              <div className="card-image-wrapper">
                <img src={activeUser.avatar_url || 'https://via.placeholder.com/400x600'} alt="avatar" draggable="false" />
                {dragX < -50 && <div className="swipe-indicator like">TERTARIK</div>}
                {dragX > 50 && <div className="swipe-indicator pass">LEWAT</div>}
                
                {/* Overlay Nama di Gambar */}
                <div className="card-image-overlay">
                  <h2>
                    {activeUser.username} {activeUser.umur && <span>, {activeUser.umur}</span>}
                  </h2>
                  <p><span className="material-icons">location_on</span> {activeUser.lokasi || "Lokasi disembunyikan"}</p>
                </div>
              </div>

              {/* Detail Profile Tambahan Di Bawah Gambar */}
              <div className="card-details">
                <div className="scroll-hint">
                  <span className="material-icons animate-bounce">keyboard_arrow_down</span>
                  <p>Scroll untuk info lengkap</p>
                </div>

                {/* Bio Section */}
                <div className="detail-section">
                  <h3>Tentang Diri</h3>
                  <p className="bio-text">{activeUser.bio || "Belum ada bio."}</p>
                </div>

                {/* Grid Informasi Umum */}
                <div className="detail-section">
                  <h3>Informasi Umum</h3>
                  <div className="info-grid">
                    {activeUser.gender && <div className="info-chip"><span className="material-icons">wc</span> {activeUser.gender}</div>}
                    {activeUser.pekerjaan && <div className="info-chip"><span className="material-icons">work</span> {activeUser.pekerjaan}</div>}
                    {activeUser.pendidikan && <div className="info-chip"><span className="material-icons">school</span> {activeUser.pendidikan}</div>}
                    {activeUser.tinggi_badan && <div className="info-chip"><span className="material-icons">height</span> {activeUser.tinggi_badan} cm</div>}
                    {activeUser.agama && <div className="info-chip"><span className="material-icons">mosque</span> {activeUser.agama}</div>}
                    {activeUser.zodiak && <div className="info-chip"><span className="material-icons">stars</span> {activeUser.zodiak}</div>}
                  </div>
                </div>

                {/* Lifestyle & Preferensi */}
                <div className="detail-section">
                  <h3>Gaya Hidup & Minat</h3>
                  <div className="info-grid">
                    {activeUser.tujuan && <div className="info-chip outline"><span className="material-icons">track_changes</span> Mencari: {activeUser.tujuan}</div>}
                    {activeUser.hobi && <div className="info-chip outline"><span className="material-icons">sports_esports</span> {activeUser.hobi}</div>}
                    {activeUser.olahraga && <div className="info-chip outline"><span className="material-icons">fitness_center</span> {activeUser.olahraga}</div>}
                    {activeUser.merokok && <div className="info-chip outline"><span className="material-icons">smoking_rooms</span> Merokok: {activeUser.merokok}</div>}
                    {activeUser.alkohol && <div className="info-chip outline"><span className="material-icons">wine_bar</span> Minum: {activeUser.alkohol}</div>}
                  </div>
                </div>

                {/* Media Sosial Section */}
                {(activeUser.ig_username || activeUser.tiktok_username || activeUser.spotify_url) && (
                  <div className="detail-section social-links">
                    <h3>Media Sosial</h3>
                    {activeUser.ig_username && <div className="social-chip"><img src="/ig-icon.png" alt="IG" /> @{activeUser.ig_username}</div>}
                    {activeUser.tiktok_username && <div className="social-chip"><img src="/tiktok-icon.png" alt="TikTok" /> @{activeUser.tiktok_username}</div>}
                    {activeUser.spotify_url && <a href={activeUser.spotify_url} target="_blank" className="social-chip"><img src="/spotify-icon.png" alt="Spotify" /> Spotify Profile</a>}
                  </div>
                )}
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
        <div className="action-buttons">
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
