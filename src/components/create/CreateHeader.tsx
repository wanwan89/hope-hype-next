type Props = {
  draftId: string | null;
  onClose: () => void;
};

export default function CreateHeader({ draftId, onClose }: Props) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
      <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <span className="material-icons">arrow_back</span>
      </button>
      <h2 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, margin: 0 }}>
        {draftId ? 'Lanjutkan Draf' : 'Buat Postingan'}
      </h2>
      <div style={{ width: 28 }} />
    </div>
  );
}