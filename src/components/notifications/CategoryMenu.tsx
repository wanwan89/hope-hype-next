// components/notifications/CategoryMenu.tsx
import React from 'react';

// SVG Icons
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
  onSelectCategory: (cat: 'like' | 'comment' | 'follow' | 'other') => void;
};

const CategoryMenu: React.FC<Props> = ({ unreadCounts, onSelectCategory }) => {
  const items = [
    { key: 'like', label: 'Suka & Simpan', icon: HeartIcon, count: unreadCounts.like },
    { key: 'comment', label: 'Komentar', icon: CommentIcon, count: unreadCounts.comment },
    { key: 'follow', label: 'Pengikut Baru', icon: FollowIcon, count: unreadCounts.follow },
    { key: 'other', label: 'Sistem & Lainnya', icon: SystemIcon, count: unreadCounts.other },
  ];

  return (
    <div className="category-menu-list">
      {items.map((item) => (
        <div
          key={item.key}
          className="category-menu-item"
          onClick={() => onSelectCategory(item.key as any)}
        >
          <div className="category-icon-box" style={{ background: 'var(--bg-secondary)' }}>
            <item.icon />
          </div>
          <div className="category-text">
            <span className="category-title">{item.label}</span>
            <span className="category-desc">
              {item.count > 0 ? `${item.count} baru` : 'Tidak ada'}
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