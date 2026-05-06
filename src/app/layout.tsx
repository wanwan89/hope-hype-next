'use client'; 

import { usePathname } from 'next/navigation';
import { useEffect } from 'react'; 
import "./globals.css";
import Sidebar from "@/components/layout/Sidebarpost";
import SearchWrapper from "@/components/layout/SearchWrapperpost";
import Overlays from "@/components/ui/Overlayspost";
import LoginPopup from "@/components/auth/LoginPopuppost";
import Navbar from "@/components/layout/Navbar"; 

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 1. Identifikasi Halaman
  const isVoicePage = pathname?.includes('/voice');
  const isHomePage = pathname === '/' || pathname === '/home';
  
  // 2. Tentukan Siapa yang Harus Sembunyi
  const hideSidebar = isVoicePage; 
  const hideNavbar = isVoicePage;
  const hideOverlays = isVoicePage;

  // 🔥 JURUS SEKAT TOTAL (Diperbaiki) 🔥
  useEffect(() => {
    // Sapu Jagat HANYA BOLEH jalan kalau kita KELUAR dari Voice Room (masuk ke Home/Chat)
    if (!isVoicePage) {
      // A. Bersihkan Style Body dari sisa-sisa Voice Room
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
      document.body.style.height = 'auto';
      
      // B. Trash Collector: Hapus elemen Voice Room biar gak bocor ke Home
      const voiceTrash = [
        'room-gift-drawer', 
        'room-drawer-overlay', 
        'gift-anim-overlay', 
        'vip-entrance-overlay',
        'vip-anim-styles-clean'
      ];
      
      voiceTrash.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
    }
  }, [pathname, isVoicePage]); 

  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet" />
      </head>
      {/* 🔥 FIX SIDEBAR MACET: Class langsung dipasang di body sejak awal render (No Delay!) 🔥 */}
      <body 
        className={`bg-black text-white antialiased ${isVoicePage ? 'in-voice-room' : 'in-home-app'}`}
        style={{ margin: 0, padding: 0, fontFamily: "'Poppins', sans-serif" }}
      >
        
        {/* SIDEBAR: Muncul kecuali di Voice */}
        {!hideSidebar && <Sidebar />}
        
        <div className="layout-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {/* SEARCH: Khusus Home */}
          {isHomePage && (
            <div className="search-container" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
              <SearchWrapper />
            </div>
          )}

          {/* MAIN CONTENT */}
          <main 
            key={pathname} 
            className="main-content"
            style={{ 
              flex: 1, 
              width: '100%', 
              maxWidth: '600px',
              margin: '0 auto', 
              paddingTop: isVoicePage ? '0' : '10px', 
              paddingBottom: isVoicePage ? '0' : '100px',
              position: 'relative'
            }}
          >
            {children}
          </main>

          {/* NAVBAR: Hilangkan di Voice */}
          {!hideNavbar && <Navbar />}
          
        </div>

        {/* MODAL GLOBAL */}
        <LoginPopup />

        {/* OVERLAYS HOME: Hancur di Voice */}
        {!hideOverlays && <Overlays />}

      </body>
    </html>
  );
}
