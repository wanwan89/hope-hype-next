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
  potentialMatches: MatchUser[]; // Pastikan data yang dikirim ke sini sudah difilter lawan jenis dari backend
  onLike: (userId: string) => Promise<boolean>; // Mengembalikan 'true' jika mutual match
  onPass: (userId: string) => void;
  onClose: () => void;
};

const HypeMatchOverlay: React.FC<Props> = ({ currentUser, potentialMatches, onLike, onPass, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [matchedUser, setMatchedUser] = useState<MatchUser | null>(null);
  
  const dragRef = useRef({ startX: 0, isDragging: false });

  const activeUser = potentialMatches[currentIndex];

  // Logic untuk layar sentuh (HP) & Mouse
  const handleDragStart = (clientX: number) => {
    dragRef.current = { startX: clientX, isDragging: true };
  };

  const handleDragMove = (clientX: number) => {
    if (!dragRef.current.isDragging) return;
    const currentDragX = clientX - dragRef.current.startX;
    setDragX(currentDragX);
  };

  const handleDragEnd = async () => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;

    const threshold = 100; // Jarak swipe minimum

    if (dragX < -threshold) {
      // Swipe Kiri: Tertarik
      handleAction('like');
    } else if (dragX > threshold) {
      // Swipe Kanan: Tidak Tertarik
      handleAction('pass');
    } else {
      // Kembali ke tengah jika swipe kurang jauh
      setDragX(0);
    }
  };

  const handleAction = async (action: 'like' | 'pass') => {
    if (!activeUser) return;
    
    // Animasi membuang kartu
    setDragX(action === 'like' ? -500 : 500); 

    setTimeout(async () => {
      if (action === 'like') {
        const isMatch = await onLike(activeUser.id);
        if (isMatch) {
          setMatchedUser(activeUser); // Tampilkan Pop-up Match
        } else {
          nextCard();
        }
      } else {
        onPass(activeUser.id);
        nextCard();
      }
    }, 300); // Waktu yang sama dengan CSS transition
  };

  const nextCard = () => {
    setDragX(0);
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
          <button className="btn-chat-now glass-btn" onClick={() => {/* Lanjut ke HopeTalk */}}>
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
            className="match-card glass-clean"
            style={{
              transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
              transition: dragRef.current.isDragging ? 'none' : 'transform 0.3s ease-out',
            }}
            onMouseDown={(e) => handleDragStart(e.clientX)}
            onMouseMove={(e) => handleDragMove(e.clientX)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
            onTouchEnd={handleDragEnd}
          >
            <div className="card-image-wrapper">
              <img src={activeUser.avatar_url} alt="avatar" draggable="false" />
              {/* Indikator swipe transparan */}
              {dragX < -50 && <div className="swipe-indicator like">TERTARIK</div>}
              {dragX > 50 && <div className="swipe-indicator pass">LEWAT</div>}
            </div>
            <div className="card-info">
              <h2>{activeUser.username}</h2>
              <p className="bio-text">{activeUser.bio}</p>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <span className="material-icons">sentiment_dissatisfied</span>
            <p>Tidak ada lagi pengguna di sekitarmu.</p>
          </div>
        )}
      </div>

      {/* Tombol Manual di Bawah Kartu */}
      {activeUser && (
        <div className="action-buttons">
          {/* Sesuai instruksi: Kiri = Tertarik, Kanan = Tidak Tertarik */}
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
