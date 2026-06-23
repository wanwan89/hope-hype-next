type Props = {
  isAd: boolean;
  setIsAd: (v: boolean) => void;
};

export default function AdToggle({ isAd, setIsAd }: Props) {
  return (
    <div style={{ marginTop: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', padding: '15px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: '600' }}>Tandai sebagai Iklan</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>Beri tahu audiens bahwa ini adalah konten promosi / bersponsor</div>
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
        <input type="checkbox" checked={isAd} onChange={(e) => setIsAd(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isAd ? '#1f3cff' : 'var(--border-card)', transition: '.3s ease', borderRadius: '34px' }}>
          <span style={{ position: 'absolute', height: '18px', width: '18px', left: isAd ? '23px' : '3px', bottom: '3px', backgroundColor: '#ffffff', transition: '.3s ease', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
        </span>
      </label>
    </div>
  );
}