import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  searchMusic: string;
  setSearchMusic: (v: string) => void;
  isSearching: boolean;
  musicResults: any[];
  playingUrl: string | null;
  onTogglePreview: (url: string, e?: React.MouseEvent) => void;
  onSelect: (song: any) => void;
  t: (key: string) => string;
};

export default function MusicSheet({
  isOpen,
  onClose,
  searchMusic,
  setSearchMusic,
  isSearching,
  musicResults,
  playingUrl,
  onTogglePreview,
  onSelect,
  t,
}: Props) {
  // State untuk trending dari Apple Music (hasil pencarian otomatis)
  const [trendingResults, setTrendingResults] = useState<any[]>([]);
  const [isTrendLoading, setIsTrendLoading] = useState(false);

  // 🔥 Ambil rekomendasi dari Apple Music saat sheet dibuka
  useEffect(() => {
    if (isOpen && trendingResults.length === 0) {
      fetchTrendingFromApple();
    }
  }, [isOpen]);

  const fetchTrendingFromApple = async () => {
    setIsTrendLoading(true);
    try {
      // Gunakan keyword yang sesuai target pengguna, misal "Indonesia pop", "trending", atau "popular"
      const term = encodeURIComponent('popular music 2025');
      const res = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&limit=10`);
      const data = await res.json();
      setTrendingResults(data.results || []);
    } catch (err) {
      console.error('Gagal ambil trending:', err);
      setTrendingResults([]);
    } finally {
      setIsTrendLoading(false);
    }
  };

  if (!isOpen) return null;

  // Komponen item lagu (digunakan oleh trending & hasil pencarian)
  const renderMusicItem = (song: any, index: number) => (
    <div
      key={index}
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-main)',
        padding: '12px',
        borderRadius: '16px',
        border: '1px solid var(--border-card)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 60,
          height: 60,
          marginRight: 15,
          flexShrink: 0,
        }}
      >
        <img
          src={song.artworkUrl100 || '/asets/png/music_placeholder.png'}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 12,
            objectFit: 'cover',
          }}
        />
        {song.previewUrl && (
          <div
            onClick={() => onTogglePreview(song.previewUrl)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <span className="material-icons" style={{ color: '#fff', fontSize: '30px' }}>
              {playingUrl === song.previewUrl ? 'pause' : 'play_arrow'}
            </span>
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-main)',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        >
          {song.trackName}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            marginTop: '4px',
          }}
        >
          {song.artistName}
        </div>
      </div>
      <button
        onClick={() => onSelect(song)}
        style={{
          background: '#1f3cff',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '12px',
          fontWeight: 800,
          fontSize: '13px',
          cursor: 'pointer',
          marginLeft: '10px',
        }}
      >
        Pilih
      </button>
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999 }}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '75dvh',
          background: 'var(--bg-secondary)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '5px',
            background: 'var(--border-card)',
            borderRadius: '10px',
            margin: '15px auto 10px',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 20px 15px',
            borderBottom: '1px solid var(--border-card)',
          }}
        >
          <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '18px' }}>
            Tambahkan Musik
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: '15px 20px' }}>
          <div style={{ position: 'relative' }}>
            <span
              className="material-icons"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            >
              search
            </span>
            <input
              autoFocus
              type="text"
              placeholder={t('search_music')}
              value={searchMusic}
              onChange={(e) => setSearchMusic(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 15px 14px 45px',
                borderRadius: '14px',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                fontSize: '15px',
                outline: 'none',
                fontWeight: 'bold',
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {/* 🔥 Rekomendasi dari Apple Music (muncul saat tidak ada pencarian manual) */}
          {!searchMusic && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '12px',
                }}
              >
                <span className="material-icons" style={{ color: '#ff2e63', fontSize: '18px' }}>
                  local_fire_department
                </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '15px' }}>
                  Rekomendasi tranding
                </span>
              </div>

              {isTrendLoading ? (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <span className="material-icons" style={{ fontSize: '40px', animation: 'spin 1s linear infinite' }}>
                    autorenew
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {trendingResults.map(renderMusicItem)}
                </div>
              )}

              <div
                style={{
                  textAlign: 'center',
                  marginTop: '20px',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                — atau cari musik di atas —
              </div>
            </>
          )}

          {/* Hasil pencarian manual */}
          {searchMusic && (
            <>
              {isSearching ? (
                <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>
                  <span className="material-icons" style={{ fontSize: '40px', animation: 'spin 1s linear infinite' }}>
                    autorenew
                  </span>
                  <p style={{ fontWeight: 600, marginTop: '10px' }}>Mencari lagu...</p>
                </div>
              ) : musicResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {musicResults.map(renderMusicItem)}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '40px',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  Tidak ada hasil untuk "{searchMusic}"
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}