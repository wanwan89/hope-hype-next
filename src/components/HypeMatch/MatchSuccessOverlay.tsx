import React from 'react';

// Tipe data disamakan dengan yang ada di main file
type MatchUser = {
  id: string;
  username: string;
  avatar_url: string;
  [key: string]: any; 
};

type MatchSuccessOverlayProps = {
  matchedUser: MatchUser | null;
  currentUser: any;
  onChatNow: () => void; 
  nextCard: () => void;
  setMatchedUser: (user: MatchUser | null) => void;
};

export default function MatchSuccessOverlay({
  matchedUser,
  currentUser,
  onChatNow,
  nextCard,
  setMatchedUser
}: MatchSuccessOverlayProps) {
  return (
    <div className={`hm-match-overlay-container hm-match-success-bg ${matchedUser ? 'show' : ''}`}>
      {matchedUser && (
        <div className="hm-match-content">
          <h2 className="hm-match-title">HYPE MATCH!</h2>
          <p>Kamu dan <strong>{matchedUser.username}</strong> saling tertarik!</p>
          
          <div className="hm-match-avatars">
            <img 
              src={currentUser?.avatar_url || 'https://via.placeholder.com/150'} 
              alt="You" 
              className="hm-avatar-circle" 
            />
            
            {/* Kalau ikon ini tidak muncul, pastikan font Material Icons sudah terload. 
                Jika belum, ganti <span> ini dengan SvgIcon love kamu */}
            <span className="material-icons hm-favorite-icon">favorite</span>
            
            <img 
              src={matchedUser.avatar_url || 'https://via.placeholder.com/150'} 
              alt="Them" 
              className="hm-avatar-circle" 
            />
          </div>

          <button className="hm-btn-chat-now hm-glass-clean" onClick={onChatNow}>
            Sapa Dia!
          </button>
          
          <button className="hm-btn-keep-swiping" onClick={() => { 
            setMatchedUser(null); 
            nextCard(); 
          }}>
            Lanjut Mencari
          </button>
        </div>
      )}
    </div>
  );
}
