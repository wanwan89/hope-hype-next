import React from 'react';

const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 9.137C2 14 6.02 16.591 8.962 18.911C10 19.729 11 20.5 12 20.5s2-.77 3.038-1.59C17.981 16.592 22 14 22 9.138S16.5.825 12 5.501C7.5.825 2 4.274 2 9.137"/>
  </svg>
);

const CommentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 22a1 1 0 0 1-1-1v-3H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6.1l-3.7 3.71c-.2.19-.45.29-.7.29z"/>
  </svg>
);

const FollowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 472 384" fill="currentColor">
    <path d="M298.5 192q-35.5 0-60.5-25t-25-60.5T238 46t60.5-25T359 46t25 60.5t-25 60.5t-60.5 25M107 149h64v43h-64v64H64v-64H0v-43h64V85h43zm191.5 86q31.5 0 69.5 9t69.5 29.5T469 320v43H128v-43q0-26 31.5-46.5T229 244t69.5-9"/>
  </svg>
);

const SystemIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 2v6h20V2zm2 2h2.004v2.004H4zm-2 6v12h20V10zm3 3h14v2H5zm0 4h6v2H5z"/>
  </svg>
);

type Props = {
  unreadCounts: { like: number; comment: number; follow: number; other: number };
  latestNotifs: { like: any; comment: any; follow: any; other: any };
  onSelectCategory: (cat: 'like' | 'comment' | 'follow' | 'other') => void;
};

const getLatestSnippet = (notif: any) => {
  if (!notif) return 'Tidak ada';
  const name = notif.actor?.username || 'Seseorang';
  const others = notif.otherCount > 0 ? ` & ${notif.otherCount} lainnya` : '';
  
  if (notif.type.includes('like')) return `${name}${others} menyukai postingan Anda`;
  if (notif.type.includes('repost')) return `${name}${others} membagikan ulang postingan Anda`;
  if (notif.type.includes('save')) return `${name}${others} menyimpan postingan Anda`;
  if (notif.type.includes('comment')) return `${name} mengomentari postingan Anda`;
  if (notif.type === 'follow') return `${name} mulai mengikuti Anda`;
  
  if (notif.type === 'coin_receive') return `Menerima koin: ${notif.amount}`;
  if (notif.type === 'payment_status') return `Status pembayaran Anda diperbarui`;
  if (notif.type === 'withdraw_request') return `Permintaan penarikan diperbarui`;
  if (notif.type === 'coin_history') return `Riwayat Koin: ${notif.amount}`;
  
  if (notif.message) {
    return notif.message.length > 35 ? notif.message.substring(0, 35) + '...' : notif.message;
  }
  return 'Pemberitahuan baru';
};

const CategoryMenu: React.FC<Props> = ({ unreadCounts, latestNotifs, onSelectCategory }) => {
  const items = [
    { key: 'like', label: 'Suka & Simpan', icon: HeartIcon, count: unreadCounts.like, latest: latestNotifs.like, color: '#ff2e63' },
    { key: 'comment', label: 'Komentar', icon: CommentIcon, count: unreadCounts.comment, latest: latestNotifs.comment, color: '#10b981' },
    { key: 'follow', label: 'Pengikut Baru', icon: FollowIcon, count: unreadCounts.follow, latest: latestNotifs.follow, color: '#8b5cf6' },
    { key: 'other', label: 'Sistem & Lainnya', icon: SystemIcon, count: unreadCounts.other, latest: latestNotifs.other, color: '#3b82f6' },
  ];

  return (
    <div className="category-menu-list">
      {items.map((item) => (
        <div
          key={item.key}
          className="category-menu-item"
          onClick={() => onSelectCategory(item.key as any)}
        >
          <div
            className="category-icon-box"
            style={{
              background: item.color,
              color: 'white',
            }}
          >
            <item.icon />
          </div>
          <div className="category-text">
            <span className="category-title">{item.label}</span>
            <span className="category-desc" style={{ color: item.count === 0 ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
              {item.count > 0 ? `${item.count} pemberitahuan baru` : getLatestSnippet(item.latest)}
            </span>
          </div>
          {item.count > 0 && <span className="category-badge">{item.count}</span>}
          <span className="chevron">›</span>
        </div>
      ))}
    </div>
  );
};

export default CategoryMenu;
