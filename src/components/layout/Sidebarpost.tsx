'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation'; 
import './Sidebar.css'; // Pastikan CSS yang tadi lu save namanya bener ini

export default function Sidebarpost() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCat, setActiveCat] = useState('all');
  const pathname = usePathname();

  // Efek untuk dengerin tombol hamburger diklik (Event Global)
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      document.body.style.overflow = 'hidden'; 
    };
    window.addEventListener('openSidebar', handleOpen);
    
    // Cleanup event listener
    return () => window.removeEventListener('openSidebar', handleOpen);
  }, []);

  // Auto-close tiap kali URL berubah
  useEffect(() => {
    setIsOpen(false);
    document.body.style.overflow = 'auto'; // Balikin scroll body
  }, [pathname]);

  const handleCategoryClick = (cat: string) => {
    setActiveCat(cat);
    window.dispatchEvent(new CustomEvent('changeCategory', { 
      detail: { category: cat } 
    }));
    setIsOpen(false);
    document.body.style.overflow = 'auto'; 
  };

  // Fungsi khusus buat nutup pas klik layar (Overlay)
  const closeSidebar = () => {
    setIsOpen(false);
    document.body.style.overflow = 'auto';
  };

  return (
    <>
      {/* 1. OVERLAY (Klik area ini buat nutup) */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={closeSidebar} 
      />

      {/* 2. SIDEBAR PANEL */}
      <aside className={`sidebar ${isOpen ? 'active' : ''}`}>
        
        <nav className="sidebar-nav">
          {['all', 'karya', 'prestasi', 'photography', 'mountain', 'thread'].map((item) => (
            <button 
              key={item} 
              className={activeCat === item ? 'active' : ''}
              onClick={() => handleCategoryClick(item)}
              style={{
                // Kita sisain inline style cuma buat nanganin warna dinamis pas diklik
                fontWeight: activeCat === item ? '800' : '600',
                color: activeCat === item ? '#00a2ff' : 'var(--text-main, #333)',
              }}
            >
              {item}
              {activeCat === item && <span>●</span>}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
