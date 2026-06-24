'use client';
import React, { useState, useEffect } from 'react';

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
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const menus: CategoryItem[] = [
    { id: 'like', icon: 'favorite', color: '#ff2e63', title: 'Suka & Simpan', desc: 'Interaksi pada postingan Anda' },
    { id: 'comment', icon: 'chat_bubble', color: '#10b981', title: 'Komentar', desc: 'Balasan dan komentar baru' },
    { id: 'follow', icon: 'person_add', color: '#8b5cf6', title: 'Pengikut Baru', desc: 'Orang yang mulai mengikuti Anda' },
    { id: 'other', icon: 'notifications', color: '#3b82f6', title: 'Sistem & Lainnya', desc: 'Transaksi, koin, dan info sistem' },
  ];

  return (
    <div
      className="category-menu-list"
      style={{
        background: isDark ? 'var(--bg-main)' : '#ffffff',
        borderBottom: `1px solid ${isDark ? 'var(--border-card)' : '#e0e0e0'}`,
        padding: '10px 15px',
      }}
    >
      {menus.map((menu) => {
        const count = unreadCounts?.[menu.id as keyof typeof unreadCounts] || 0;
        return (
          <div
            key={menu.id}
            className="category-menu-item btn-press"
            onClick={() => onSelectCategory(menu.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              padding: '12px 0',
              borderBottom: `1px solid ${isDark ? 'var(--border-card)' : '#e0e0e0'}`,
              cursor: 'pointer',
              transition: 'background 0.2s ease, transform 0.1s ease',
            }}
          >
            <div
              className="category-icon-box"
              style={{
                background: `${menu.color}15`,
                color: menu.color,
                width: 44,
                height: 44,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-icons">{menu.icon}</span>
            </div>
            <div
              className="category-text"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <span
                className="category-title"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: isDark ? 'var(--text-main)' : '#1a1a1a',
                }}
              >
                {menu.title}
              </span>
              <span
                className="category-desc"
                style={{ fontSize: 12, color: 'var(--text-muted)' }}
              >
                {menu.desc}
              </span>
            </div>
            {count > 0 && (
              <div
                className="category-badge"
                style={{
                  background: '#ff4757',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {count > 99 ? '99+' : count}
              </div>
            )}
            <span
              className="material-icons chevron"
              style={{ color: 'var(--text-muted)' }}
            >
              chevron_right
            </span>
          </div>
        );
      })}
    </div>
  );
}