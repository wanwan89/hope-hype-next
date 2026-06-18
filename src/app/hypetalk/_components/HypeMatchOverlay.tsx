'use client';
import React, { useState, useRef } from 'react';

type MatchUser = {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  gender: string;
};

type Props = {
  currentUser: any;
  potentialMatches: MatchUser[]; 
  onLike: (userId: string) => Promise<boolean>; 
  onPass: (userId: string) => void;
  onClose: () => void;
};

const HypeMatchOverlay: React.FC<Props> = ({ currentUser, potentialMatches, onLike, onPass, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0); // Tambahan untuk deteksi vertikal
  const [matchedUser, setMatchedUser] = useState<MatchUser | null>(null);
  const [isShowingProfile, setIsShowingProfile] = useState(false); // State profil lengkap
  
  const dragRef = useRef({ startX: 0, startY: 0, isDragging: false });

  const activeUser = potentialMatches[currentIndex];

  // Logic untuk layar sentuh (HP) & Mouse dengan X dan Y
  const handleDragStart = (clientX: number, clientY: number) => {
    dragRef.current = { startX: clientX, startY: clientY, isDragging: true };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragRef.current.isDragging) return;
    const currentDragX = clientX - dragRef.current.startX;
    const currentDragY = clientY - dragRef.current.startY;
    
    // Jika profil sedang terbuka, kita hanya peduli swipe ke bawah untuk menutup
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

    const threshold = 100; // Jarak swipe minimum

    // Jika sedang mode profil
    if (isShowingProfile) {
      if (dragY > threshold) {
        setIsShowingProfile(false); // Tutup profil jika diswipe ke bawah
      }
      setDragY(0);
      return;
    }

    // Deteksi arah dominan (Horizontal vs Vertikal)
    if (Math.abs(dragX) > Math.abs(dragY)) {
      // Dominan Horizontal
      if (dragX < -threshold) {
        handleAction('like');
      } else if (dragX > threshold) {
        handleAction('pass');
      } else {
        setDragX(0);
        setDragY(0);
      }
    } else {
      // Dominan Vertikal
      if (dragY < -threshold) {
        // Swipe Ke Atas: Buka Profil
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
    
    // Animasi membuang kartu ke samping
    setDragX(action === 'like' ? -500 : 500); 

    setTimeout(async () => {
      setIsShowingProfile(false); // Reset status profil
      if (action === 'like') {
        const isMatch = await onLike(activeUser.id);
        if (isMatch) {
          setMatchedUser(activeUser);
        } else {
          nextCard();
        }
      } else {
        onPass(activeUser.id);
        nextCard();
      }
    }, 300); 
  };

  const nextCard = () => {
    setDragX(0);
    setDragY(0);
    setCurrentIndex((prev) => prev + 1);
  };

  // Jika Pop-up Match aktif
  if (matchedUser) {
    return (
      <div className="match-popup-overlay glass-clean">
        <div className="match-content">
          <h2 className="match-title">HYPE MATCH!</h2>
          <p>Kamu dan <strong>{matchedUser.username}</strong> saling tertarik!</p>
          <div className="match-avatars">
            <img src={currentUser?.avatar_url} alt="You" className="avatar-circle" />
            <span className="material-icons favorite-icon">favorite</span>
            <img src={matchedUser.avatar_url} alt="Them" className="avatar-circle" />
          </div>
          <button className="btn-chat-now glass-clean" onClick={() => {/* Lanjut ke HopeTalk */}}>
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
      <button className="btn-close-overlay" onClick={onClose}>
        <span className="material-icons">close</span>
      </button>

      <div className="card-container">
        {activeUser ? (
          <div 
            className={`match-card glass-clean ${isShowingProfile ? 'profile-open' : ''}`}
            style={{
              // Hentikan pergerakan X jika profil sedang terbuka
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
              {/* Indikator swipe transparan */}
              {!isShowingProfile && dragX < -50 && <div className="swipe-indicator like">TERTARIK</div>}
              {!isShowingProfile && dragX > 50 && <div className="swipe-indicator pass">LEWAT</div>}
            </div>

            {/* Hint Swipe Up */}
            {!isShowingProfile && dragY === 0 && dragX === 0 && (
              <div className="swipe-up-hint">
                <span className="material-icons">keyboard_double_arrow_up</span>
                <p>Geser ke atas untuk profil</p>
              </div>
            )}

            {/* Info Basic & Panel Detail Profil */}
            <div className={`card-info ${isShowingProfile ? 'expanded' : ''}`}>
              {isShowingProfile && (
                <div className="swipe-down-hint">
                  <span className="material-icons">keyboard_arrow_down</span>
                </div>
              )}
              
              <div className="info-header">
                <h2>{activeUser.username}</h2>
                {isShowingProfile && <span className="gender-badge">{activeUser.gender}</span>}
              </div>
              
              <p className={`bio-text ${isShowingProfile ? 'full' : ''}`}>
                {activeUser.bio || "Belum ada bio."}
              </p>

              {isShowingProfile && (
                <div className="extra-info">
                  {/* Tambahkan info lain kalau ada di database nantinya, contoh: Hobi, Zodiak */}
                  <div className="info-tag">Mencari Teman Ngobrol</div>
                  <div className="info-tag">Aktif Baru Saja</div>
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

      {/* Tombol Manual disembunyikan saat profil penuh terbuka biar lebih fokus */}
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
    </div>
  );
};

export default React.memo(HypeMatchOverlay);
