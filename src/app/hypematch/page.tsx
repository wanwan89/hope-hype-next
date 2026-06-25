'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Pastikan path ini sesuai dengan file supabase kamu
import './HypeMatchOverlay.css'; // Import file CSS khusus di sini

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
};

export default function HypeMatch() {
  const router = useRouter();

  // State untuk Data Supabase
  const [users, setUsers] = useState<MatchUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // State Bawaan UI Kamu
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0); 
  const [matchedUser, setMatchedUser] = useState<MatchUser | null>(null);
  const [isShowingProfile, setIsShowingProfile] = useState(false); 
  
  const dragRef = useRef({ startX: 0, startY: 0, isDragging: false });

  // Ambil user yang aktif berdasarkan index
  const activeUser = users?.[currentIndex];

  // ==========================================
  // LOGIC AMBIL DATA DARI SUPABASE
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 1. Ambil session user kamu sendiri (Opsional)
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          setCurrentUser({
            id: authData.user.id,
            avatar_url: 'https://via.placeholder.com/150', // Bisa disesuaikan dengan avatar asli
          });
        }

        // 2. Tarik data dari tabel profiles (FIXED: Menggunakan 'username' bukan 'user')
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, gender, umur, pekerjaan, hobi, zodiak')
          .limit(10); // Ambil 10 data

        if (error) throw error;

        if (data) {
          // Berikan fallback nama jika username kebetulan kosong di database
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

  // ==========================================
  // LOGIC SWIPE & ANIMASI (TIDAK DIUBAH)
  // ==========================================
  const handleDragStart = (clientX: number, clientY: number) => {
    dragRef.current = { startX: clientX, startY: clientY, isDragging: true };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragRef.current.isDragging) return;
    const currentDragX = clientX - dragRef.current.startX;
    const currentDragY = clientY - dragRef.current.startY;
    
    if (isShowingProfile) {
      if (currentDragY > 0) setDragY(currentDragY);
      return;
    }

    setDragX(currentDragX);
    setDragY(currentDragY);
  };

  const handleDragEnd = async () => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;

    const threshold = 100; 

    if (isShowingProfile) {
      if (dragY > threshold) {
        setIsShowingProfile(false); 
      }
      setDragY(0);
      return;
    }

    if (Math.abs(dragX) > Math.abs(dragY)) {
      if (dragX < -threshold) {
        handleAction('like');
      } else if (dragX > threshold) {
        handleAction('pass');
      } else {
        setDragX(0);
        setDragY(0);
      }
    } else {
      if (dragY < -threshold) {
        setIsShowingProfile(true);
        setDragX(0);
        setDragY(0);
      } else {
        setDragX(0);
        setDragY(0);
      }
    }
  };

  const handleAction = async (action: 'like' | 'pass') => {
    if (!activeUser) return;
    
    setDragX(action === 'like' ? -500 : 500); 

    setTimeout(async () => {
      setIsShowingProfile(false); 
      if (action === 'like') {
        console.log('Menyukai user:', activeUser.id);
        
        const isMatch = false; // Ubah jadi true kalau kamu mau ngetest layar MATCH!
        
        if (isMatch) {
          setMatchedUser(activeUser);
        } else {
          nextCard();
        }
      } else {
        console.log('Melewati user:', activeUser.id);
        nextCard();
      }
    }, 300); 
  };

  const nextCard = () => {
    setDragX(0);
    setDragY(0);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleStartChat = () => {
    if (!matchedUser) return;
    router.push(`/hypetalk/room?from=${matchedUser.id}`); 
  };

  const handleClose = () => {
    router.back(); 
  };

  // Tampilan Loading sebelum data siap
  if (isLoading) {
    return (
      <div className="hype-match-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="overlay-backdrop"></div>
        <h2 style={{ color: 'white', zIndex: 10 }}>Mencari Hype di sekitarmu...</h2>
      </div>
    );
  }

  // Tampilan saat MATCH terjadi
  if (matchedUser) {
    return (
      <div className="hype-match-overlay match-success-bg glass-clean">
        <div className="match-content">
          <h2 className="match-title">HYPE MATCH!</h2>
          <p>Kamu dan <strong>{matchedUser.username}</strong> saling tertarik!</p>
          <div className="match-avatars">
            <img src={currentUser?.avatar_url || 'https://via.placeholder.com/150'} alt="You" className="avatar-circle" />
            <span className="material-icons favorite-icon">favorite</span>
            <img src={matchedUser.avatar_url || 'https://via.placeholder.com/150'} alt="Them" className="avatar-circle" />
          </div>
          <button className="btn-chat-now glass-clean" onClick={handleStartChat}>
            Mulai Obrolan
          </button>
          <button className="btn-keep-swiping" onClick={() => { setMatchedUser(null); nextCard(); }}>
            Lanjut Mencari
          </button>
        </div>
      </div>
    );
  }

  // Tampilan Overlay Utama
  return (
    <div className="hype-match-overlay">
      <div className="overlay-backdrop" onClick={handleClose}></div>
      
      <button className="btn-close-overlay" onClick={handleClose}>
        <span className="material-icons">close</span>
      </button>

      <div className="card-container">
        {activeUser ? (
          <div 
            className={`match-card glass-clean ${isShowingProfile ? 'profile-open' : ''}`}
            style={{
              transform: isShowingProfile 
                ? `translateY(${dragY}px)` 
                : `translate(${dragX}px, ${dragY}px) rotate(${dragX * 0.05}deg)`,
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
            <div className="card-image-wrapper">
              <img src={activeUser.avatar_url || 'https://via.placeholder.com/400x600'} alt="avatar" draggable="false" />
              {!isShowingProfile && dragX < -50 && <div className="swipe-indicator like">TERTARIK</div>}
              {!isShowingProfile && dragX > 50 && <div className="swipe-indicator pass">LEWAT</div>}
            </div>

            {!isShowingProfile && dragY === 0 && dragX === 0 && (
              <div className="swipe-up-hint">
                <span className="material-icons">keyboard_double_arrow_up</span>
                <p>Geser ke atas untuk profil</p>
              </div>
            )}

            <div className={`card-info ${isShowingProfile ? 'expanded' : ''}`}>
              {isShowingProfile && (
                <div className="swipe-down-hint">
                  <span className="material-icons">keyboard_arrow_down</span>
                </div>
              )}
              
              <div className="info-header">
                <h2>
                  {activeUser.username} 
                  {activeUser.umur ? <span className="user-age">{activeUser.umur}</span> : ''}
                </h2>
                {isShowingProfile && <span className="gender-badge">{activeUser.gender}</span>}
              </div>
              
              <p className={`bio-text ${isShowingProfile ? 'full' : ''}`}>
                {activeUser.bio || "Belum ada bio."}
              </p>

              {isShowingProfile && (
                <div className="extra-info">
                  {activeUser.zodiak && (
                    <div className="info-tag">
                      <span className="material-icons">stars</span> {activeUser.zodiak}
                    </div>
                  )}
                  {activeUser.pekerjaan && (
                    <div className="info-tag">
                      <span className="material-icons">work</span> {activeUser.pekerjaan}
                    </div>
                  )}
                  {activeUser.hobi && (
                    <div className="info-tag">
                      <span className="material-icons">sports_esports</span> {activeUser.hobi}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state glass-clean">
            <span className="material-icons empty-icon">sentiment_dissatisfied</span>
            <p>Tidak ada lagi pengguna di sekitarmu.</p>
          </div>
        )}
      </div>

      {activeUser && !isShowingProfile && (
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
