type Props = {
  selectedMusic: any;
  onOpenSheet: () => void;
  onRemove: () => void;
};

export default function MusicPicker({ selectedMusic, onOpenSheet, onRemove }: Props) {
  return (
    <div className="music-picker-btn" onClick={onOpenSheet} style={{ marginTop: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', padding: '15px', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: '#1f3cff', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-icons" style={{ color: '#fff', fontSize: '24px' }}>music_note</span>
        </div>
        <div>
          <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '15px' }}>{selectedMusic ? selectedMusic.trackName : 'Tambahkan Musik'}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{selectedMusic ? selectedMusic.artistName : 'Opsional (Pilih lagu favoritmu)'}</div>
        </div>
      </div>
      {selectedMusic ? (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ background: 'rgba(255,71,87,0.1)', color: '#ff4757', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
          Hapus
        </button>
      ) : (
        <span className="material-icons" style={{ color: 'var(--text-muted)' }}>chevron_right</span>
      )}
    </div>
  );
}