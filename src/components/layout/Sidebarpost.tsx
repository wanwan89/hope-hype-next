'use client';

import { useState, useEffect } from 'react';
import './Sidebar.css';

export default function Sidebarpost() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCat, setActiveCat] = useState('all');

  useEffect(() => {
    // FIX UTAMA: Sidebar sekarang "mendengarkan" event global 'openSidebar'
    const handleOpen = () => {
      console.log("Sinyal diterima: Membuka Sidebar...");
      setIsOpen(true);
    };

    window.addEventListener('openSidebar', handleOpen);

    return () => {
      window.removeEventListener('openSidebar', handleOpen);
    };
  }, []);

  const handleCategoryClick = (cat: string) => {
    setActiveCat(cat);
    window.dispatchEvent(new CustomEvent('changeCategory', { 
      detail: { category: cat } 
    }));
    setIsOpen(false);
  };

  return (
    <>
      {/* 1. OVERLAY */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', // Gelapkan dikit biar fokus
          zIndex: 20000, // Z-index super tinggi
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
          zIndex: 20001, // Di atas overlay
          backgroundColor: '#ffffff',
          boxShadow: '10px 0 30px rgba(0,0,0,0.2)',
          padding: '40px 30px',
          transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          display: 'block' // Pastikan tidak hidden
        }}
      >
        <div className="sidebar-header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="sidebar-logo" style={{ color: '#000', margin: 0, fontWeight: '800', fontSize: '24px' }}>MENU</h2>
          <button 
            onClick={() => setIsOpen(false)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#000', 
              fontSize: '32px', 
              cursor: 'pointer',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>

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

      {/* Global CSS Fallback */}
      <style jsx global>{`
        body.sidebar-open {
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
