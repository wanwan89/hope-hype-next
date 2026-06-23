'use client';
import React from 'react';

interface CategoryItem {
  id: string;
  icon: string;
  color: string;
  title: string;
  desc: string;
}

interface Props {
  unreadCounts: {
    like: number;
    comment: number;
    follow: number;
    other: number;
  };
  onSelectCategory: (cat: string) => void;
}

export default function CategoryMenu({ unreadCounts, onSelectCategory }: Props) {
  const menus: CategoryItem[] = [
    { 
      id: 'like', 
      icon: 'favorite', 
      color: '#ff2e63', 
      title: 'Suka & Simpan', 
      desc: 'Interaksi pada postingan Anda' 
    },
    { 
      id: 'comment', 
      icon: 'chat_bubble', 
      color: '#10b981', 
      title: 'Komentar', 
      desc: 'Balasan dan komentar baru' 
    },
    { 
      id: 'follow', 
      icon: 'person_add', 
      color: '#8b5cf6', 
      title: 'Pengikut Baru', 
      desc: 'Orang yang mulai mengikuti Anda' 
    },
    { 
      id: 'other', 
      icon: 'notifications', 
      color: '#3b82f6', 
      title: 'Sistem & Lainnya', 
      desc: 'Transaksi, koin, dan info sistem' 
    },
  ];

  return (
    <div className="category-menu-list">
      {menus.map((menu) => {
        const count = unreadCounts?.[menu.id as keyof typeof unreadCounts] || 0;
        
        return (
          <div
            key={menu.id}
            className="category-menu-item btn-press"
            onClick={() => onSelectCategory(menu.id)}
            style={{
              transition: 'background 0.2s ease, transform 0.1s ease',
            }}
          >
            {/* Ikon dengan background */}
            <div
              className="category-icon-box"
              style={{
                background: `${menu.color}15`,
                color: menu.color,
              }}
            >
              <span className="material-icons">{menu.icon}</span>
            </div>

            {/* Teks */}
            <div className="category-text">
              <span className="category-title">{menu.title}</span>
              <span className="category-desc">{menu.desc}</span>
            </div>

            {/* Badge (hanya jika count > 0) */}
            {count > 0 && (
              <div className="category-badge">
                {count > 99 ? '99+' : count}
              </div>
            )}

            {/* Chevron */}
            <span className="material-icons chevron">chevron_right</span>
          </div>
        );
      })}
    </div>
  );
}