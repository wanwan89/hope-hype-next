'use client';
import React from 'react';

// SvgIcon Standalone
const SvgIcon = ({ name, className = "", size = 18, style }: { name: string, className?: string, size?: number, style?: React.CSSProperties }) => {
  const stroke = "currentColor";
  const fill = "none";
  const strokeWidth = "2";

  const icons: Record<string, React.ReactNode> = {
    arrowDown: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />,
    heart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
    gender: <><circle cx="12" cy="10" r="4"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6"/></>,
    education: <><path strokeLinecap="round" strokeLinejoin="round" d="M22 10v6M2 10l10-5 10 5-10 5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M6 12v5c3 3 9 3 12 0v-5"/></>,
    height: <><path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4M22 4h-4M22 20h-4M14 4l-4-4-4 4M14 20l-4 4-4-4M10 0v24"/></>,
    religion: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M8 6h8" /></>,
    zodiac: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path strokeLinecap="round" strokeLinejoin="round" d="M8 12a4 4 0 0 1 8 0"/></>,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
    hobby: <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
    sport: <path strokeLinecap="round" strokeLinejoin="round" d="M14.4 14.4 9.6 9.6M18.65 21.35a2 2 0 0 1-2.83 0l-5.66-5.66a2 2 0 0 1 0-2.83l.71-.71a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83l-.71.71ZM7.15 2.65a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83l-.71.71a2 2 0 0 1-2.83 0L7 6.19a2 2 0 0 1 0-2.83l.15-.71Z"/>,
    smoke: <path strokeLinecap="round" strokeLinejoin="round" d="M18 20H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2ZM12 6V2M8 6V4M16 6V4"/>,
    alcohol: <path strokeLinecap="round" strokeLinejoin="round" d="M8 22h8M12 15v7M12 15a7.5 7.5 0 0 0 7.5-7.5c0-4.14-3.36-7.5-7.5-7.5s-7.5 3.36-7.5 7.5A7.5 7.5 0 0 0 12 15z"/>,
    language: <><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    social: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path strokeLinecap="round" strokeLinejoin="round" d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>,
    fire: <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.585A8 8 0 1112 4.5c.35 0 .695.028 1.03.082C11.96 5.83 11 7.55 11 9.5c0 3 2.5 4.5 4.5 5a5 5 0 014.157 4.085z" />
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {icons[name] || <circle cx="12" cy="12" r="10"/>}
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

  // Style untuk chip agar icon dan teks sejajar rapi, serta menggunakan var(--text-main)
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
        backgroundColor: 'var(--bg-modal)', // Mengikuti warna modal global
        color: 'var(--text-main)', // Mengikuti warna text utama
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)' // Opsional: Tambah shadow agar terlihat melayang dari card
      }}
    >
      {/* Handle Penutup Slide */}
      <div 
        className="hm-biodata-header" 
        onClick={() => setShowBiodata(false)}
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', padding: '12px 0' }}
      >
        <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--text-muted)', opacity: 0.5, borderRadius: '10px' }}></div>
      </div>
      
      {activeUser && (
        <div className="hm-biodata-content" style={{ padding: '0 20px 40px 20px' }}>
          
          {/* Main Header Utama */}
          <div style={{ marginBottom: '24px' }}>
            <h2 className="hm-biodata-title" style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: 'var(--text-main)' }}>
              {activeUser.username}{activeUser.umur && `, ${activeUser.umur}`}
            </h2>
            <p className="hm-biodata-subtitle" style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted)' }}>
              {activeUser.pekerjaan || "Belum mengisi pekerjaan"}
            </p>
          </div>
          
          {/* Section: Tentang Saya */}
          {activeUser.bio_hype && (
            <div className="hm-biodata-section" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>Tentang Saya</h4>
              <p style={{ lineHeight: '1.5', fontSize: '15px', margin: 0, color: 'var(--text-main)' }}>{activeUser.bio_hype}</p>
            </div>
          )}

          {/* Section Informasi & Gaya Hidup */}
          {hasDetails && (
            <div className="hm-biodata-section" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px' }}>Info & Gaya Hidup</h4>
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

          {/* Section: Sosial Media */}
          {(activeUser.ig_username || activeUser.tiktok_username || activeUser.spotify_url) && (
            <div className="hm-biodata-section" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px' }}>Hubungkan</h4>
              <div className="hm-chips-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeUser.ig_username && <div className="hm-info-chip" style={{ ...chipBaseStyle, borderColor: 'rgba(225, 48, 108, 0.5)' }}><SvgIcon name="social" /> <span>@{activeUser.ig_username}</span></div>}
                {activeUser.tiktok_username && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="social" /> <span>@{activeUser.tiktok_username}</span></div>}
                {activeUser.spotify_url && <div className="hm-info-chip" style={{ ...chipBaseStyle, borderColor: 'rgba(30, 215, 96, 0.5)' }}><SvgIcon name="social" /> <span>Spotify</span></div>}
              </div>
            </div>
          )}

          {/* Spacer bawah agar tidak terpotong action bar */}
          <div style={{ height: '60px' }}></div>
        </div>
      )}
    </div>
  );
}
