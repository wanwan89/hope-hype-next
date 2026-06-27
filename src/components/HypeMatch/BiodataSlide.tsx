'use client';
import React from 'react';

// SvgIcon Standalone dengan Penambahan Warna & Bentuk Spesifik yang mirip Screenshot
const SvgIcon = ({ name, value = "", className = "", size = 18, style }: { name: string, value?: string, className?: string, size?: number, style?: React.CSSProperties }) => {
  const strokeWidth = "2";

  // Fungsi pembantu untuk ikon Gender dinamis
  const getGenderIcon = (val: string) => {
    const isMale = val.toLowerCase().includes('pria') || val.toLowerCase().includes('laki');
    const color = isMale ? '#3b82f6' : '#f43f5e'; // Biru untuk pria, Pink/Merah Muda untuk wanita

    if (isMale) {
      // Ikon Mars (Pria)
      return (
        <>
          <circle cx="10" cy="14" r="5" stroke={color} fill="none" strokeWidth={strokeWidth} />
          <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M13.5 10.5 21 3m0 0h-5.5M21 3v5.5" />
        </>
      );
    }
    // Ikon Venus (Wanita)
    return (
      <>
        <circle cx="12" cy="10" r="5" stroke={color} fill="none" strokeWidth={strokeWidth} />
        <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 15v7M9 19h6" />
      </>
    );
  };

  // Fungsi pembantu untuk ikon Zodiak dinamis
  const getZodiacIcon = (val: string) => {
    const z = val.toLowerCase();
    const color = "#6366f1"; // Warna Nila/Indigo standar

    if (z.includes('aries')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M4 9a5 5 0 1 1 10 0v8M20 9a5 5 0 1 0-10 0v8" />;
    if (z.includes('taurus')) return <><circle cx="12" cy="14" r="5" stroke={color} fill="none" strokeWidth={strokeWidth} /><path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M5 8a7 7 0 0 1 14 0" /></>;
    if (z.includes('gemini')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M6 4h12M6 20h12M9 4v16M15 4v16" />;
    if (z.includes('cancer')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M15 9a3 3 0 1 0-6 0c0 2 3 3 5 4a3 3 0 1 1 0 6M9 15a3 3 0 1 0 6 0c0-2-3-3-5-4a3 3 0 1 1 0-6" />;
    if (z.includes('leo')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M16 8a3 3 0 1 0-6 0c0 4 6 5 6 9a4 4 0 1 1-8 0" />;
    if (z.includes('virgo') || z.includes('scorpio')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M5 10v10m5-10v10m5-10v10c0 4 5 4 5 0v-4" />;
    if (z.includes('libra')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M4 12h16M7 12a5 5 0 0 1 10 0M4 16h16" />;
    if (z.includes('sagittarius')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M19 5l-14 14M19 5h-7M19 5v7M15 15l-6-6" />;
    if (z.includes('capricorn')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M4 8l4 8 4-8 4 8c2 0 4-2 4-4" />;
    if (z.includes('aquarius')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M3 10l3-3 3 3 3-3 3 3 3-3 3 3M3 16l3-3 3 3 3-3 3 3 3-3 3 3" />;
    if (z.includes('pisces')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M6 4c3 3 3 13 0 16M18 4c-3 3-3 13 0 16M4 12h16" />;
    
    // Default Zodiak
    return (
      <>
        <circle cx="12" cy="12" r="9" stroke={color} fill="none" strokeWidth={strokeWidth} />
        <circle cx="12" cy="12" r="2.5" fill={color} stroke="none" />
      </>
    );
  };

  // Fungsi pembantu untuk ikon Agama dinamis
  const getReligionIcon = (val: string) => {
    const r = val.toLowerCase();
    const color = "#8b5cf6"; // Ungu

    if (r.includes('islam')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />; // Bulan Sabit
    if (r.includes('kristen') || r.includes('katolik')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 3v18M8 8h8" />; // Salib
    if (r.includes('hindu')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.07-7.07l-1.41 1.41M6.34 17.66l-1.41 1.41M19.07 19.07l-1.41-1.41M6.34 6.34L4.93 4.93" />; // Matahari Terbit/Om Stylized
    if (r.includes('buddha')) return <><circle cx="12" cy="12" r="9" stroke={color} fill="none" strokeWidth={strokeWidth} /><path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" /></>; // Roda Dharma
    if (r.includes('konghucu')) return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 18c0-5 3.5-9 9-9-5.5 0-9-4-9-9 0 5-3.5 9-9 9 5.5 0 9 4 9 9z" />; // Yin Yang / Simbol

    // Default Agama (Minimalis)
    return <path stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 4v16M8 10h8M9 15h6" />;
  };

  // Konfigurasi path static/icon dasar
  const icons: Record<string, React.ReactNode> = {
    arrowDown: (
      <path stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
    ),
    heart: (
      <path fill="none" stroke="#ec4899" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    ),
    education: (
      <>
        <path stroke="#f59e0b" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path stroke="#f59e0b" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M6 12v5c3 3 9 3 12 0v-5" />
      </>
    ),
    height: (
      <>
        <path stroke="#10b981" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 3v18M8 6l4-3 4 3M8 18l4 3 4-3" />
        <path stroke="#10b981" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M4 12h4M4 7h4M4 17h4" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" stroke="#ef4444" fill="none" strokeWidth={strokeWidth} />
        <circle cx="12" cy="12" r="5" stroke="#ef4444" fill="none" strokeWidth={strokeWidth} />
        <circle cx="12" cy="12" r="1.5" fill="#ef4444" stroke="none" />
      </>
    ),
    hobby: (
      <path stroke="#f43f5e" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 22a10 10 0 1 1 10-10c0 2-2.5 3-4 3s-1.5-2-3-2-2 2-4 2-2-2-4-2-2.5-1-2.5 1 2 5 2 5z" />
    ),
    // Olahraga (Berubah jadi Barbel sesuai permintaan)
    sport: (
      <path stroke="#f97316" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M4 8v8M20 8v8M4 12h16M2 10v4M22 10v4" />
    ),
    smoke: (
      <>
        <rect x="2" y="12" width="20" height="4" rx="1" stroke="#78716c" fill="none" strokeWidth={strokeWidth} />
        <path stroke="#78716c" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M17 12v4M5 8c0-1.5 1-2 1-3.5M9 8c0-1.5 1-2.5 1-4" />
      </>
    ),
    alcohol: (
      <path stroke="#eab308" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M8 22h8M12 15v7M16.7 3 12 15 7.3 3z" />
    ),
    language: (
      <>
        <circle cx="12" cy="12" r="10" stroke="#0ea5e9" fill="none" strokeWidth={strokeWidth} />
        <path stroke="#0ea5e9" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </>
    ),
    fire: (
      <path fill="none" stroke="#ff5722" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2c0 0-5 4.5-5 11a5 5 0 0 0 10 0c0-6.5-5-11-5-11z" />
    ),
    ig: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="#E1306C" fill="none" strokeWidth={strokeWidth} />
        <path stroke="#E1306C" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="#E1306C" strokeWidth={strokeWidth} strokeLinecap="round" />
      </>
    ),
    // TikTok diperbaiki menggunakan logo solid shape standar
    tiktok: (
      <path fill="#FE2C55" stroke="none" d="M12.53.02c1.31 0 2.61.01 3.91 0 .08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.96-.5 3.89-1.5 5.58-1.01 1.7-2.61 3.03-4.5 3.73-1.89.7-3.92.8-5.85.3-1.93-.5-3.67-1.5-5-2.9-1.33-1.4-2.13-3.2-2.33-5.1-.2-1.9.1-3.83.9-5.61.8-1.78 2.2-3.23 3.9-4.13 1.7-.9 3.6-1.3 5.5-.9v4.03c-1.33-.25-2.73.15-3.83 1.05-1.1.9-1.8 2.2-2 3.6-.2 1.4.1 2.8.9 4 1.1 1.5 2.9 2.4 4.8 2.4 1.9 0 3.7-.9 4.8-2.4 1-1.5 1.5-3.3 1.5-5.2V.02z" transform="scale(0.9) translate(1, 1)" />
    ),
    spotify: (
      <path fill="#1DB954" stroke="none" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.47-.077-.334.132-.67.47-.745 3.808-.87 7.076-.496 9.712 1.115.293.18.386.563.207.856zm1.266-2.82c-.226.367-.706.482-1.072.257-2.687-1.652-6.785-2.13-9.965-1.166-.413.127-.848-.106-.973-.517-.125-.413.108-.848.52-.973 3.632-1.102 8.147-.568 11.234 1.328.366.226.48.707.256 1.072zm.1-2.955C14.7 8.877 8.536 8.65 4.974 9.73c-.5.152-1.015-.13-1.167-.63-.152-.5.13-1.014.63-1.166 4.072-1.232 10.87-1.002 14.72 1.282.433.256.577.818.32 1.25-.257.434-.82.578-1.254.32z" />
    )
  };

  // Rendering berdasarkan name prop
  let iconContent;
  if (name === "gender") {
    iconContent = getGenderIcon(value);
  } else if (name === "zodiac") {
    iconContent = getZodiacIcon(value);
  } else if (name === "religion") {
    iconContent = getReligionIcon(value);
  } else {
    iconContent = icons[name] || <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" strokeWidth={strokeWidth} />;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
      {iconContent}
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
    border: '1px solid var(--border-color, #e2e8f0)', // Outline persis gambar
    padding: '4px 10px', 
    borderRadius: '20px', 
    fontSize: '14px' 
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
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                Tentang Saya
              </h4>
              <p style={{ lineHeight: '1.6', fontSize: '15px', margin: 0, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                {activeUser.bio_hype}
              </p>
            </div>
          )}

          {hasDetails && (
            <div className="hm-biodata-section" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                Info & Gaya Hidup
              </h4>
              <div className="hm-chips-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {/* Pastikan `value` dioper agar perubahannya dinamis */}
                {activeUser.gender && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="gender" value={activeUser.gender} /> <span>{activeUser.gender}</span></div>}
                {activeUser.pendidikan && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="education" /> <span>{activeUser.pendidikan}</span></div>}
                {activeUser.tinggi_badan && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="height" /> <span>{activeUser.tinggi_badan} cm</span></div>}
                {activeUser.zodiak && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="zodiac" value={activeUser.zodiak} /> <span>{activeUser.zodiak}</span></div>}
                {activeUser.agama && <div className="hm-info-chip" style={chipBaseStyle}><SvgIcon name="religion" value={activeUser.agama} /> <span>{activeUser.agama}</span></div>}
                
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
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                Sosial Media
              </h4>
              <div className="hm-chips-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
