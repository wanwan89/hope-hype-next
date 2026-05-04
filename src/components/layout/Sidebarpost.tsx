'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation'; 
import './Sidebar.css';

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
    return () => window.removeEventListener('openSidebar', handleOpen);
  }, []);

  // Auto-close tiap kali URL berubah
  useEffect(() => {
    setIsOpen(false);
    document.body.style.overflow = ''; 
  }, [pathname]);

  const handleCategoryClick = (cat: string) => {
    setActiveCat(cat);
    window.dispatchEvent(new CustomEvent('changeCategory', { 
      detail: { category: cat } 
    }));
    setIsOpen(false);
    document.body.style.overflow = ''; 
  };

  // Fungsi khusus buat nutup pas klik layar (Overlay)
  const closeSidebar = () => {
    setIsOpen(false);
    document.body.style.overflow = '';
  };

  return (
    <>
      {/* 1. OVERLAY (Klik area ini buat nutup) */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={closeSidebar} // Ini kuncinya biar diklik layar langsung nutup
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', 
          zIndex: 20000, 
          display: isOpen ? 'block' : 'none',
          backdropFilter: 'blur(4px)',
          transition: 'all 0.3s ease'
        }}
      />

      {/* 2. SIDEBAR PANEL */}
      <aside 
        className={`sidebar ${isOpen ? 'active' : ''}`} 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '280px',
          height: '100vh',
          zIndex: 20001, 
          backgroundColor: '#ffffff',
          boxShadow: '10px 0 30px rgba(0,0,0,0.2)',
          padding: '40px 30px', // Tetep ada padding biar menu gak nempel ke atas banget
          transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          display: 'block' 
        }}
      >
        {/* HEADER (MENU & X) DIHAPUS TOTAL DI SINI */}

        <nav className="sidebar-nav">
          {['all', 'karya', 'prestasi', 'photography', 'mountain', 'thread'].map((item) => (
            <button 
              key={item} 
              onClick={() => handleCategoryClick(item)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                padding: '18px 0',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '15px',
                fontWeight: activeCat === item ? '700' : '500',
                color: activeCat === item ? '#00a2ff' : '#333333',
                borderBottom: '1px solid #f5f5f5',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.2s ease'
              }}
            >
              {item}
              {activeCat === item && <span style={{ color: '#00a2ff' }}>●</span>}
            </button>
          ))}
        </nav>
      </aside>

      <style jsx global>{`
        body.sidebar-open {
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
