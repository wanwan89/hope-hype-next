'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation'; 
// 🔥 FIX 1: Import i18n hook
import { useTranslation } from 'react-i18next';
import './Sidebar.css'; 

export default function Sidebarpost() {
  // 🔥 FIX 2: Inisialisasi translate
  const { t } = useTranslation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeCat, setActiveCat] = useState('all');
  const pathname = usePathname();

  // 🔥 FIX 3: Mapping Kategori (ID untuk logic, Label untuk UI)
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
    // Dispatch event tetep kirim ID asli (misal: 'karya') biar Gallery ga bingung query-nya
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
      {/* 1. OVERLAY */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={closeSidebar} 
      />

      {/* 2. SIDEBAR PANEL */}
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
              {/* 🔥 FIX 4: Tampilkan label hasil translasi */}
              {t(item.label)}
              {activeCat === item.id && <span style={{ marginLeft: '8px' }}>●</span>}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
