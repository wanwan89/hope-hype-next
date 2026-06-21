'use client';

import React, { useState, useEffect } from 'react'; // 🔥 FIX: Tambahkan 'React' di sini
import { usePathname } from 'next/navigation'; 
import { useTranslation } from 'react-i18next';
import './Sidebar.css'; 

export default function Sidebarpost() {
  const { t } = useTranslation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeCat, setActiveCat] = useState('all');
  const pathname = usePathname();

  const CATEGORIES = [
    { id: 'all', label: 'cat_all' },
    { id: 'karya', label: 'cat_karya' },
    { id: 'prestasi', label: 'cat_prestasi' },
    { id: 'photography', label: 'cat_photo' },
    { id: 'mountain', label: 'cat_mountain' },
    { id: 'thread', label: 'cat_thread' },
  ];

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      document.body.style.overflow = 'hidden'; 
    };
    window.addEventListener('openSidebar', handleOpen);
    return () => window.removeEventListener('openSidebar', handleOpen);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    document.body.style.overflow = 'auto'; 
  }, [pathname]);

  const handleCategoryClick = (cat: string) => {
    setActiveCat(cat);
    window.dispatchEvent(new CustomEvent('changeCategory', { 
      detail: { category: cat } 
    }));
    setIsOpen(false);
    document.body.style.overflow = 'auto'; 
  };

  const closeSidebar = () => {
    setIsOpen(false);
    document.body.style.overflow = 'auto';
  };

  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={closeSidebar} 
      />

      <aside className={`sidebar ${isOpen ? 'active' : ''}`}>
        
        <nav className="sidebar-nav">
          {CATEGORIES.map((item) => (
            <button 
              key={item.id} 
              className={activeCat === item.id ? 'active' : ''}
              onClick={() => handleCategoryClick(item.id)}
              style={{
                fontWeight: activeCat === item.id ? '800' : '600',
                color: activeCat === item.id ? '#00a2ff' : 'var(--text-main, #333)',
                textTransform: 'capitalize'
              }}
            >
              {t(item.label)}
              {activeCat === item.id && <span style={{ marginLeft: '8px' }}>●</span>}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
