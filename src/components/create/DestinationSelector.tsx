import React from 'react';

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
      <p className="section-label" style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
        {t('send_to')}
      </p>
      <div className="dest-toggle-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { id: 'feed', title: t('feed_title'), desc: t('feed_desc') },
          { id: 'story', title: t('story_title'), desc: t('story_desc') },
        ].map((dest) => (
          <label
            key={dest.id}
            className="dest-option"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-secondary)',
              padding: '15px',
              borderRadius: '12px',
              border: destination === dest.id ? '2px solid #1f3cff' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="radio"
              name="postDestination"
              value={dest.id}
              checked={destination === dest.id}
              onChange={() => setDestination(dest.id as 'feed' | 'story')}
              style={{ display: 'none' }}
            />
            <div className="dest-content" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '15px', padding: 0, background: 'transparent', border: 'none' }}>
              <div
                className="dest-icon-box"
                style={{
                  width: '40px',
                  height: '40px',
                  background: destination === dest.id ? '#1f3cff' : 'var(--bg-card)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: destination === dest.id ? '#fff' : 'var(--text-muted)',
                }}
              >
                {dest.id === 'feed' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
              </div>
              <div className="dest-text" style={{ flex: 1 }}>
                <div className="dest-title" style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 700 }}>
                  {dest.title}
                </div>
                <div className="dest-desc" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  {dest.desc}
                </div>
              </div>
              <div
                className="dest-check"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: destination === dest.id ? '6px solid #1f3cff' : '2px solid var(--border-card)',
                }}
              />
            </div>
          </label>
        ))}
      </div>
      {destination === 'story' && (
        <div
          className="visibility-toggle"
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '15px',
            background: 'var(--bg-secondary)',
            padding: '6px',
            borderRadius: '14px',
          }}
        >
          <button type="button" onClick={() => setVisibility('public')} style={visBtnStyle(visibility === 'public')}>
            <span className="material-icons" style={{ fontSize: '16px' }}>public</span> Publik
          </button>
          <button type="button" onClick={() => setVisibility('followers')} style={visBtnStyle(visibility === 'followers')}>
            <span className="material-icons" style={{ fontSize: '16px' }}>group</span> Hanya Followers
          </button>
        </div>
      )}
    </div>
  );
}

function visBtnStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '10px',
    borderRadius: '10px',
    border: 'none',
    background: active ? 'var(--bg-input)' : 'transparent',
    color: active ? 'var(--text-main)' : 'var(--text-muted)',
    fontWeight: 700,
    cursor: 'pointer',
    transition: '0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  };
}