'use client';
import React from 'react';

// SvgIcon Standalone dengan Penambahan Warna & Bentuk Spesifik
const SvgIcon = ({ name, className = "", size = 18, style }: { name: string, className?: string, size?: number, style?: React.CSSProperties }) => {
  const strokeWidth = "2";

  // Konfigurasi path dan warna masing-masing icon
  const icons: Record<string, React.ReactNode> = {
    arrowDown: (
      <path stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
    ),
    heart: (
      <path fill="#ec4899" stroke="#ec4899" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    ),
    gender: (
      <>
        <circle cx="12" cy="10" r="4" stroke="#3b82f6" fill="none" strokeWidth={strokeWidth} />
        <path stroke="#3b82f6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 14v7M9 18h6M15.5 8.5 21 3M17 3h4v4" />
      </>
    ),
    education: (
      <>
        <path stroke="#f59e0b" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path stroke="#f59e0b" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M6 12v5c3 3 9 3 12 0v-5" />
      </>
    ),
    height: (
      <path stroke="#10b981" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M22 12h-4M22 4h-4M22 20h-4M14 4l-4-4-4 4M14 20l-4 4-4-4M10 0v24" />
    ),
    religion: (
      <path stroke="#8b5cf6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 2v20M8 6h8M8 18h8" />
    ),
    zodiac: (
      <>
        <circle cx="12" cy="12" r="10" stroke="#6366f1" fill="none" strokeWidth={strokeWidth} />
        <path stroke="#6366f1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 2a10 10 0 0 1 10 10" />
        <circle cx="12" cy="12" r="3" fill="#6366f1" stroke="none" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="10" stroke="#ef4444" fill="none" strokeWidth={strokeWidth} />
        <circle cx="12" cy="12" r="6" stroke="#ef4444" fill="none" strokeWidth={strokeWidth} />
        <circle cx="12" cy="12" r="2" fill="#ef4444" stroke="none" />
      </>
    ),
    hobby: (
      <path stroke="#f43f5e" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 22a10 10 0 1 1 10-10c0 2-2.5 3-4 3s-1.5-2-3-2-2 2-4 2-2-2-4-2-2.5-1-2.5 1 2 5 2 5z" />
    ),
    sport: (
      <path stroke="#f97316" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M14.4 14.4 9.6 9.6M18.65 21.35a2 2 0 0 1-2.83 0l-5.66-5.66a2 2 0 0 1 0-2.83l.71-.71a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83l-.71.71ZM7.15 2.65a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83l-.71.71a2 2 0 0 1-2.83 0L7 6.19a2 2 0 0 1 0-2.83l.15-.71Z" />
    ),
    smoke: (
      <path stroke="#78716c" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M18 20H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2ZM12 6V2M8 6V4M16 6V4" />
    ),
    alcohol: (
      <path stroke="#eab308" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M8 22h8M12 15v7M12 15a7.5 7.5 0 0 0 7.5-7.5c0-4.14-3.36-7.5-7.5-7.5s-7.5 3.36-7.5 7.5A7.5 7.5 0 0 0 12 15z" />
    ),
    language: (
      <>
        <circle cx="12" cy="12" r="10" stroke="#0ea5e9" fill="none" strokeWidth={strokeWidth} />
        <path stroke="#0ea5e9" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </>
    ),
    fire: (
      <path fill="#ff5722" stroke="#ff5722" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17.657 18.585A8 8 0 1112 4.5c.35 0 .695.028 1.03.082C11.96 5.83 11 7.55 11 9.5c0 3 2.5 4.5 4.5 5a5 5 0 014.157 4.085z" />
    ),
    // Brand Icons
    ig: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="#E1306C" fill="none" strokeWidth={strokeWidth} />
        <path stroke="#E1306C" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="#E1306C" strokeWidth={strokeWidth} strokeLinecap="round" />
      </>
    ),
    tiktok: (
      <path stroke="#FE2C55" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5v3a3 3 0 0 1-3-3v8a7 7 0 1 1-7-7v3a4 4 0 0 0 3 3z" />
    ),
    spotify: (
      <path fill="#1DB954" stroke="none" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.47-.077-.334.132-.67.47-.745 3.808-.87 7.076-.496 9.712 1.115.293.18.386.563.207.856zm1.266-2.82c-.226.367-.706.482-1.072.257-2.687-1.652-6.785-2.13-9.965-1.166-.413.127-.848-.106-.973-.517-.125-.413.108-.848.52-.973 3.632-1.102 8.147-.568 11.234 1.328.366.226.48.707.256 1.072zm.1-2.955C14.7 8.877 8.536 8.65 4.974 9.73c-.5.152-1.015-.13-1.167-.63-.152-.5.13-1.014.63-1.166 4.072-1.232 10.87-1.002 14.72 1.282.433.256.577.818.32 1.25-.257.434-.82.578-1.254.32z" />
    )
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {icons[name] || <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" strokeWidth={strokeWidth} />}
    </svg>
  );
};

interface BiodataSlideProps {
  activeUser: any;
  showBiodata: boolean;
  setShowBiodata: (show: boolean) => void;
}

export default function BiodataSlide({ activeUser, showBiodata, setShowBiodata }: BiodataSlideProps) {
  
  const hasDetails = activeUser && (
    activeUser.gender || activeUser.pendidikan || activeUser.tinggi_badan || 
    activeUser.zodiak || activeUser.agama || activeUser.tujuan || 
    activeUser.preferensi || activeUser.hobi || activeUser.olahraga || 
    activeUser.merokok || activeUser.alkohol || (activeUser.bahasa && activeUser.bahasa.length > 0) ||
    (activeUser.minat && activeUser.minat.length > 0)
  );

  const chipBaseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-main)',
  };

  return (
    <div 
      className={`hm-biodata-slide ${showBiodata ? 'open' : ''}`}
      style={{
        transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transform: showBiodata ? 'translateY(0)' : 'translateY(100%)',
        backgroundColor: 'var(--bg-modal)', 
        color: 'var(--text-main)', 
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)' 
      }}
    >
      <div 
        className="hm-biodata-header" 
        onClick={() => setShowBiodata(false)}
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', padding: '12px 0' }}
      >
        <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--text-muted)', opacity: 0.5, borderRadius: '10px' }}></div>
      </div>
      
      {activeUser && (
        <div className="hm-biodata-content" style={{ padding: '0 20px 40px 20px' }}>
          
          <div style={{ marginBottom: '24px' }}>
            <h2 className="hm-biodata-title" style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: 'var(--text-main)' }}>
              {activeUser.username}{activeUser.umur && `, ${activeUser.umur}`}
            </h2>
            <p className="hm-biodata-subtitle" style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted)' }}>
              {activeUser.pekerjaan || "Belum mengisi pekerjaan"}
            </p>
          </div>
          
          {activeUser.bio_hype && (
            <div className="hm-biodata-section" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                Tentang Saya
              </h4>
              <p style={{ lineHeight: '1.6', fontSize: '15px', margin: 0, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                {activeUser.bio_hype}
              </p>
            </div>
          )}

          {hasDetails && (
            <div className="hm-biodata-section" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                Info & Gaya Hidup
              </h4>
              <div className="hm-chips-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeUser.gender && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="gender" /> <span>{activeUser.gender}</span></div>}
                {activeUser.pendidikan && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="education" /> <span>{activeUser.pendidikan}</span></div>}
                {activeUser.tinggi_badan && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="height" /> <span>{activeUser.tinggi_badan} cm</span></div>}
                {activeUser.zodiak && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="zodiac" /> <span>{activeUser.zodiak}</span></div>}
                {activeUser.agama && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="religion" /> <span>{activeUser.agama}</span></div>}
                {activeUser.tujuan && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="target" /> <span>{activeUser.tujuan}</span></div>}
                {activeUser.preferensi && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="heart" /> <span>{activeUser.preferensi}</span></div>}
                {activeUser.hobi && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="hobby" /> <span>{activeUser.hobi}</span></div>}
                {activeUser.olahraga && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="sport" /> <span>{activeUser.olahraga}</span></div>}
                {activeUser.merokok && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="smoke" /> <span>{activeUser.merokok}</span></div>}
                {activeUser.alkohol && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="alcohol" /> <span>{activeUser.alkohol}</span></div>}
                
                {activeUser.bahasa && activeUser.bahasa.length > 0 && (
                  <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="language" /> <span>{activeUser.bahasa.join(', ')}</span></div>
                )}
                {activeUser.minat && activeUser.minat.length > 0 && (
                  <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="fire" /> <span>{activeUser.minat.join(', ')}</span></div>
                )}
              </div>
            </div>
          )}

          {(activeUser.ig_username || activeUser.tiktok_username || activeUser.spotify_url) && (
            <div className="hm-biodata-section" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                Sosial Media
              </h4>
              <div className="hm-chips-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {/* Menggunakan kunci icon khusus "ig", "tiktok", dan "spotify" yang sudah dilengkapi style brand-nya */}
                {activeUser.ig_username && <div className="hm-info-chip" style={{ ...chipBaseStyle, borderColor: 'rgba(225, 48, 108, 0.3)' }}><SvgIcon name="ig" /> <span>@{activeUser.ig_username}</span></div>}
                {activeUser.tiktok_username && <div className="hm-info-chip" style={{ ...chipBaseStyle, borderColor: 'rgba(254, 44, 85, 0.3)' }}><SvgIcon name="tiktok" /> <span>@{activeUser.tiktok_username}</span></div>}
                {activeUser.spotify_url && <div className="hm-info-chip" style={{ ...chipBaseStyle, borderColor: 'rgba(30, 215, 96, 0.3)' }}><SvgIcon name="spotify" /> <span>Spotify</span></div>}
              </div>
            </div>
          )}

          <div style={{ height: '60px' }}></div>
        </div>
      )}
    </div>
  );
}
