 'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 1. Tipe Data
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

export default function HypeMatchPage() {
  const router = useRouter();

  // ---------------------------------------------------------
  // 💡 STATE DATA (Ganti dengan Fetch/API Hooks milikmu)
  // ---------------------------------------------------------
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [potentialMatches, setPotentialMatches] = useState<MatchUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulasi fetch data saat halaman dimuat
  useEffect(() => {
    // TODO: Ganti dengan pemanggilan API aslimu
    setTimeout(() => {
      setCurrentUser({ id: 'me', avatar_url: '/my-avatar.png', username: 'Aku' });
      setPotentialMatches([
        { id: '1', username: 'Anya', avatar_url: '/anya.jpg', bio: 'Suka kopi', gender: 'Female', umur: 22, zodiak: 'Leo', pekerjaan: 'Designer' },
        { id: '2', username: 'Budi', avatar_url: '/budi.jpg', bio: 'Gamer', gender: 'Male', umur: 24, hobi: 'Main Valorant' }
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  // ---------------------------------------------------------
  // 💡 LOGIKA SWIPE & MATCH
  // ---------------------------------------------------------
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0); 
  const [matchedUser, setMatchedUser] = useState<MatchUser | null>(null);
  const [isShowingProfile, setIsShowingProfile] = useState(false); 
  
  const dragRef = useRef({ startX: 0, startY: 0, isDragging: false });
  const activeUser = potentialMatches[currentIndex];

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
      if (dragY > threshold) setIsShowingProfile(false); 
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
        // TODO: Ganti dengan API 'Like' aslimu
        const isMatch = Math.random() > 0.5; // Simulasi logic match (50% chance)
        if (isMatch) {
          setMatchedUser(activeUser);
        } else {
          nextCard();
        }
      } else {
        // TODO: Ganti dengan API 'Pass' aslimu
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

  // ---------------------------------------------------------
  // 💡 RENDER KOMPONEN HALAMAN
  // ---------------------------------------------------------
  
  if (isLoading) {
    return <div className="page-loading">Memuat profil di sekitarmu...</div>;
  }

  // Tampilan jika MATCH
  if (matchedUser) {
    return (
      <div className="page-layout match-success-bg glass-clean">
        <div className="match-content">
          <h2 className="match-title">HYPE MATCH!</h2>
          <p>Kamu dan <strong>{matchedUser.username}</strong> saling tertarik!</p>
          <div className="match-avatars">
            <img src={currentUser?.avatar_url} alt="You" className="avatar-circle" />
            <span className="material-icons favorite-icon">favorite</span>
            <img src={matchedUser.avatar_url} alt="Them" className="avatar-circle" />
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

  return (
    <div className="page-layout hype-match-page">
      
      {/* 🧩 TEMPAT UNTUK KOMPONEN LAIN (Navbar, Header, dll) */}
      <header className="page-header">
        <button className="btn-back" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h1>Hype Match</h1>
        {/* Bisa tambahkan icon filter atau setting di sini */}
      </header>

      {/* 🧩 KONTEN UTAMA SWIPE CARD */}
      <main className="swipe-main-container">
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
                <img src={activeUser.avatar_url} alt="avatar" draggable="false" />
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
                  <h2>{activeUser.username} {activeUser.umur ? <span style={{fontSize: '18px', fontWeight: 'normal'}}>{activeUser.umur}</span> : ''}</h2>
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
            <div className="empty-state">
              <span className="material-icons">sentiment_dissatisfied</span>
              <p>Tidak ada lagi pengguna di sekitarmu.</p>
            </div>
          )}
        </div>

        {/* Action Buttons: Dipindahkan ke dalam main container agar posisinya pas di bawah card */}
        {activeUser && !isShowingProfile && (
          <div className="action-buttons">
            <button className="btn-action btn-like glass-clean" onClick={() => handleAction('like')}>
              <span className="material-icons">favorite</span>
            </button>
            <button className="btn-action btn-pass glass-clean" onClick={() => handleAction('pass')}>
              <span className="material-icons">close</span>
            </button>
          </div>
        )}
      </main>

      {/* 🧩 TEMPAT UNTUK FOOTER ATAU BOTTOM NAV */}
      {/* <BottomNavigation /> */}

    </div>
  );
}
