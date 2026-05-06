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
  
  // 🔥 JURUS ANTI GAP: Halaman yang headernya harus nempel mentok ke atas 🔥
  const isFullscreenPage = isVoicePage || pathname?.includes('/data') || pathname?.includes('/notifications');

  // 2. Tentukan Siapa yang Harus Sembunyi
  const hideSidebar = isVoicePage; 
  const hideNavbar = isVoicePage;
  const hideOverlays = isVoicePage;

  // 🔥 JURUS SEKAT TOTAL 🔥
  useEffect(() => {
    if (!isVoicePage) {
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
      document.body.style.height = 'auto';
      
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
      <body 
        className={`bg-black text-white antialiased ${isVoicePage ? 'in-voice-room' : 'in-home-app'}`}
        style={{ margin: 0, padding: 0, fontFamily: "'Poppins', sans-serif" }}
      >
        
        {!hideSidebar && <Sidebar />}
        
        <div className="layout-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {isHomePage && (
            <div className="search-container" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
              <SearchWrapper />
            </div>
          )}

          <main 
            key={pathname} 
            className="main-content"
            style={{ 
              flex: 1, 
              width: '100%', 
              maxWidth: '600px',
              margin: '0 auto', 
              // 🔥 FIX GAP: Kalau halaman fullscreen, paddingTop & paddingBottom jadi 0 🔥
              paddingTop: isFullscreenPage ? '0' : '10px', 
              paddingBottom: isFullscreenPage ? '0' : '100px',
              position: 'relative'
            }}
          >
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
