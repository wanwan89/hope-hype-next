'use client';

import { useState, useEffect } from 'react';
import './Sidebar.css';

export default function Sidebarpost() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCat, setActiveCat] = useState('all');

  useEffect(() => {
    const handleToggle = () => setIsOpen(true);
    const menuBtn = document.getElementById('mobileMenuBtn');
    if (menuBtn) menuBtn.addEventListener('click', handleToggle);

    return () => {
      if (menuBtn) menuBtn.removeEventListener('click', handleToggle);
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
      {/* 1. OVERLAY (Z-Index di bawah Sidebar) */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 10000, // Sangat tinggi
          display: isOpen ? 'block' : 'none',
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* 2. SIDEBAR PANEL */}
      <aside 
        className={`sidebar ${isOpen ? 'active' : ''}`} 
        style={{ 
          zIndex: 10001, // Paling tinggi, di atas Navbar & Overlay
          backgroundColor: '#ffffff', // Putih bersih
          boxShadow: '10px 0 30px rgba(0,0,0,0.1)' 
        }}
      >
        <div className="sidebar-header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="sidebar-logo" style={{ color: '#000', margin: 0, fontWeight: '700' }}>MENU</h2>
          <button 
            onClick={() => setIsOpen(false)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#000', 
              fontSize: '35px', 
              cursor: 'pointer' 
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
              className={`nav-item ${activeCat === item ? 'active' : ''}`}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                padding: '18px 0',
                cursor: 'pointer',
                display: 'block',
                fontSize: '16px',
                fontWeight: activeCat === item ? '700' : '400',
                // FIX UTAMA: Warna teks harus hitam biar kelihatan di bg putih
                color: activeCat === item ? '#00a2ff' : '#333333',
                borderBottom: '1px solid #f0f0f0',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              {item}
              {activeCat === item && <span style={{ float: 'right' }}>●</span>}
            </button>
          ))}
        </nav>
      </aside>

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 280px;
          height: 100vh;
          padding: 40px 30px;
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
          transform: translateX(-100%);
        }
        .sidebar.active {
          transform: translateX(0);
        }
        .nav-item {
          transition: all 0.3s ease;
        }
        .nav-item:active {
          background-color: #f9f9f9;
        }
      `}</style>
    </>
  );
}
