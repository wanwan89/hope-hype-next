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
  // 🔥 TAMBAHKAN: Identifikasi halaman profil (data) 🔥
  const isDataPage = pathname?.includes('/data');
  
  // Halaman yang harus mentok ke atas (tanpa gap padding)
  const isFullscreenPage = isVoicePage || isDataPage || pathname?.includes('/notifications');

  // 2. Tentukan Siapa yang Harus Sembunyi
  // 🔥 FIX: Sidebar Home WAJIB sembunyi di Voice dan di halaman Profil (Data) 🔥
  const hideSidebar = isVoicePage || isDataPage; 
  const hideNavbar = isVoicePage;
  const hideOverlays = isVoicePage;

  // JURUS SEKAT TOTAL (Cleanup sisa-sisa Voice Room)
  useEffect(() => {
    if (!isVoicePage) {
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
      document.body.style.height = 'auto';
      
      const voiceTrash = [
        'room-gift-drawer', 'room-drawer-overlay', 'gift-anim-overlay', 
        'vip-entrance-overlay', 'vip-anim-styles-clean'
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
      <body 
        className={`bg-black text-white antialiased ${isVoicePage ? 'in-voice-room' : 'in-home-app'}`}
        style={{ margin: 0, padding: 0, fontFamily: "'Poppins', sans-serif" }}
      >
        
        {/* 🔥 Sidebar Home sekarang tidak akan bocor ke halaman Profil 🔥 */}
        {!hideSidebar && <Sidebar />}
        
        <div className="layout-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {isHomePage && (
            <div className="search-container" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
              <SearchWrapper />
            </div>
          )}

          {/* Main content tanpa key={pathname} biar gak kedip/glitch */}
          <main className={`main-content ${isFullscreenPage ? 'is-fullscreen' : ''}`}>
            {children}
          </main>

          {!hideNavbar && <Navbar />}
          
        </div>

        <LoginPopup />
        {!hideOverlays && <Overlays />}

      </body>
    </html>
  );
}
