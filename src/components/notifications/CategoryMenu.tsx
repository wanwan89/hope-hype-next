'use client';
import React from 'react';

export default function CategoryMenu({ unreadCounts, onSelectCategory }: { unreadCounts: any, onSelectCategory: (cat: string) => void }) {
  const menus = [
    { id: 'like', icon: 'favorite', color: '#ff2e63', title: 'Suka & Simpan', desc: 'Interaksi pada postingan Anda' },
    { id: 'comment', icon: 'chat_bubble', color: '#10b981', title: 'Komentar', desc: 'Balasan dan komentar baru' },
    { id: 'follow', icon: 'person_add', color: '#8b5cf6', title: 'Pengikut Baru', desc: 'Orang yang mulai mengikuti Anda' },
    { id: 'other', icon: 'notifications', color: '#3b82f6', title: 'Sistem & Lainnya', desc: 'Transaksi, koin, dan info sistem' }
  ];

  return (
    <div className="category-menu-list">
      {menus.map(menu => (
        <div key={menu.id} className="category-menu-item btn-press" onClick={() => onSelectCategory(menu.id)}>
          <div className="category-icon-box" style={{ background: `${menu.color}15`, color: menu.color }}>
            <span className="material-icons">{menu.icon}</span>
          </div>
          <div className="category-text">
            <span className="category-title">{menu.title}</span>
            <span className="category-desc">{menu.desc}</span>
          </div>
          {unreadCounts[menu.id] > 0 && (
            <div className="category-badge">{unreadCounts[menu.id]}</div>
          )}
          <span className="material-icons chevron">chevron_right</span>
        </div>
      ))}
    </div>
  );
}
