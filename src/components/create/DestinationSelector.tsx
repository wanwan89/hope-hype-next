type Props = {
  destination: 'feed' | 'story';
  setDestination: (v: 'feed' | 'story') => void;
  visibility: 'public' | 'followers';
  setVisibility: (v: 'public' | 'followers') => void;
  t: (key: string) => string;
};

export default function DestinationSelector({ destination, setDestination, visibility, setVisibility, t }: Props) {
  return (
    <div className="destination-container">
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
        {t('send_to')}
      </p>
      
      <div className="dest-toggle-group">
        {[
          { id: 'feed', title: t('feed_title'), desc: t('feed_desc') },
          { id: 'story', title: t('story_title'), desc: t('story_desc') },
        ].map(dest => (
          <label key={dest.id} className="dest-option">
            <input 
              type="radio" 
              name="postDestination" 
              value={dest.id} 
              checked={destination === dest.id} 
              onChange={() => setDestination(dest.id as any)} 
            />
            <div className="dest-content">
              <div className="dest-icon-box">
                {dest.id === 'feed' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                )}
              </div>
              <div className="dest-text">
                <div className="dest-title">{dest.title}</div>
                <div className="dest-desc">{dest.desc}</div>
              </div>
              <div className="dest-check" />
            </div>
          </label>
        ))}
      </div>

      {destination === 'story' && (
        <div className="visibility-toggle" style={{ marginTop: '15px' }}>
          <button 
            type="button" 
            className={`type-btn ${visibility === 'public' ? 'active' : ''}`}
            onClick={() => setVisibility('public')}
          >
            Publik
          </button>
          <button 
            type="button" 
            className={`type-btn ${visibility === 'followers' ? 'active' : ''}`}
            onClick={() => setVisibility('followers')}
          >
            Hanya Followers
          </button>
        </div>
      )}
    </div>
  );
}
