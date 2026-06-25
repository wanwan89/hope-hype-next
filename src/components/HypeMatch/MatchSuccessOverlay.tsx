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
  showTemplates: boolean;
  setShowTemplates: (val: boolean) => void;
  templates: string[];
  customMessage: string;
  setCustomMessage: (val: string) => void;
  handleSendTemplate: (msg: string) => void;
  nextCard: () => void;
  setMatchedUser: (user: MatchUser | null) => void;
};

export default function MatchSuccessOverlay({
  matchedUser,
  currentUser,
  showTemplates,
  setShowTemplates,
  templates,
  customMessage,
  setCustomMessage,
  handleSendTemplate,
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
            <img src={currentUser?.avatar_url} alt="You" className="hm-avatar-circle" />
            <span className="material-icons hm-favorite-icon">favorite</span>
            <img src={matchedUser.avatar_url} alt="Them" className="hm-avatar-circle" />
          </div>

          {!showTemplates ? (
            <>
              <button className="hm-btn-chat-now hm-glass-clean" onClick={() => setShowTemplates(true)}>
                Sapa Dia!
              </button>
              <button className="hm-btn-keep-swiping" onClick={() => { 
                setMatchedUser(null); 
                setShowTemplates(false);
                nextCard(); 
              }}>
                Lanjut Mencari
              </button>
            </>
          ) : (
            <div className="hm-templates-container">
              <p style={{marginBottom: '15px', fontWeight: 'bold', fontSize: '1rem', color: '#fff'}}>Pilih pesan atau ketik sendiri:</p>
              
              {templates.map((txt, index) => (
                <button 
                  key={index} 
                  className="hm-btn-template" 
                  onClick={() => handleSendTemplate(txt)}
                  style={{ marginBottom: '8px' }}
                >
                  {txt}
                </button>
              ))}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', width: '100%', maxWidth: '300px' }}>
                <input 
                  type="text" 
                  placeholder="Ketik sapaan manis..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '20px', 
                    border: 'none', outline: 'none', backgroundColor: '#f1f5f9',
                    color: '#0f172a', fontSize: '0.9rem'
                  }}
                />
                <button 
                  onClick={() => handleSendTemplate(customMessage)}
                  style={{
                    padding: '0 16px', borderRadius: '20px', backgroundColor: '#ec4899', 
                    color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                    opacity: customMessage.trim() ? 1 : 0.5
                  }}
                  disabled={!customMessage.trim()}
                >
                  Kirim
                </button>
              </div>

              <button 
                className="hm-btn-keep-swiping" 
                style={{marginTop: '20px', padding: '10px'}} 
                onClick={() => setShowTemplates(false)}
              >
                Batal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
