import React from 'react';
import { motion } from 'framer-motion';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  searchMusic: string;
  setSearchMusic: (v: string) => void;
  isSearching: boolean;
  musicResults: any[];
  selectedMusic: any;
  playingUrl: string | null;
  onTogglePreview: (url: string, e?: React.MouseEvent) => void;
  onSelect: (music: any) => void;
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
  if (!isOpen) return null;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999 }} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: '75dvh',
          background: 'var(--bg-secondary)', borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px', zIndex: 10000, display: 'flex', flexDirection: 'column',
        }}>
        <div style={{ width: '40px', height: '5px', background: 'var(--border-card)', borderRadius: '10px', margin: '15px auto 10px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 15px', borderBottom: '1px solid var(--border-card)' }}>
          <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '18px' }}>Tambahkan Musik</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div style={{ padding: '15px 20px' }}>
          <div style={{ position: 'relative' }}>
            <span className="material-icons" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>search</span>
            <input autoFocus type="text" placeholder={t('search_music')} value={searchMusic}
              onChange={(e) => setSearchMusic(e.target.value)}
              style={{ width: '100%', padding: '14px 15px 14px 45px', borderRadius: '14px', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '15px', outline: 'none', fontWeight: 'bold' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {isSearching ? (
            <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>
              <span className="material-icons" style={{ fontSize: '40px', animation: 'spin 1s linear infinite' }}>autorenew</span>
              <p>Mencari lagu...</p>
            </div>
          ) : musicResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {musicResults.map((song: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', padding: '12px', borderRadius: '16px', border: '1px solid var(--border-card)' }}>
                  <div style={{ position: 'relative', width: 60, height: 60, marginRight: 15, flexShrink: 0 }}>
                    <img src={song.artworkUrl100} style={{ width: '100%', height: '100%', borderRadius: 12, objectFit: 'cover' }} />
                    <div onClick={() => onTogglePreview(song.previewUrl)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <span className="material-icons" style={{ color: '#fff', fontSize: '30px' }}>{playingUrl === song.previewUrl ? 'pause' : 'play_arrow'}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.trackName}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: '4px' }}>{song.artistName}</div>
                  </div>
                  <button onClick={() => onSelect(song)} style={{ background: '#1f3cff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', marginLeft: '10px' }}>Pilih</button>
                </div>
              ))}
            </div>
          ) : searchMusic ? (
            <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)', fontWeight: 600 }}>Tidak ada hasil untuk "{searchMusic}"</div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ketik judul lagu atau nama artis di atas...</div>
          )}
        </div>
      </motion.div>
    </>
  );
}