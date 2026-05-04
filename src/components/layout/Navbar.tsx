'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bell, MessageCircle, User, Mic } from 'lucide-react';
import { useState, useEffect, useRef } from 'react'; // Tambah useRef

export default function Navbar() {
  const pathname = usePathname();
  
  // State HANYA untuk kontrol muncul/hilang
  const [isVisible, setIsVisible] = useState(true);
  
  // FIX UTAMA: Pakai useRef untuk mencatat scroll biar gak bikin lag/glitch
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Jika scroll ke bawah dan sudah melewati 50px, sembunyikan
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      } 
      // Jika scroll ke atas, munculkan kembali
      else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      }

      // Update nilai ref tanpa memicu render ulang komponen
      lastScrollY.current = currentScrollY;
    };

    // Tambahkan passive: true untuk performa scroll yang lebih baik
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []); // Dependency array kosong karena useRef tidak butuh masuk ke sini

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Chat', path: '/chat', icon: MessageCircle },
    { name: 'Voice', path: '/voice-room', icon: Mic },
    { name: 'Notif', path: '/notifications', icon: Bell },
    { name: 'Profil', path: '/profile', icon: User },
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '0',
      right: '0',
      zIndex: 9000,
      display: 'flex',
      justifyContent: 'center',
      padding: '0 20px',
      // Tambahan willChange biar browser memprioritaskan render animasi ini
      willChange: 'transform, opacity',
      // Animasi transisi yang lebih mulus (cubic-bezier)
      transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease',
      transform: isVisible ? 'translateY(0)' : 'translateY(150%)',
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      <nav style={{
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '25px',
        width: '100%',
        maxWidth: '400px',
        height: '65px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
      }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link 
              key={item.name} 
              href={item.path} 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textDecoration: 'none',
                position: 'relative',
                transition: 'all 0.3s'
              }}
            >
              <Icon 
                size={24} 
                color={isActive ? '#00a2ff' : '#666666'} 
                strokeWidth={isActive ? 2.5 : 2}
                style={{
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  filter: isActive ? 'drop-shadow(0 0 8px rgba(0, 162, 255, 0.4))' : 'none'
                }}
              />
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: '-10px',
                  width: '5px',
                  height: '5px',
                  backgroundColor: '#00a2ff',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px #00a2ff'
                }} />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
