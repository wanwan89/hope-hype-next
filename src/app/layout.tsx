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
  const isDataPage = pathname?.includes('/data');
  const isNotifPage = pathname?.includes('/notifications');
  const isDailyCekPage = pathname?.includes('/dailycek');
  
  // Halaman bergaya Aplikasi (Full Screen & Kunci Scroll Body)
  const isStandaloneApp = isVoicePage || isDailyCekPage;
  const isFullscreenPage = isStandaloneApp || isDataPage || isNotifPage;

  const hideSidebar = isStandaloneApp || isDataPage; 
  const hideNavbar = isStandaloneApp;
  const hideOverlays = isVoicePage;

  // 2. 🔥 JURUS ANTI GARIS HITAM & CLEANUP TOTAL 🔥
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isStandaloneApp) {
      // Paksa html & body setinggi layar HP murni (dvh)
      root.style.height = '100dvh';
      root.style.overflow = 'hidden';
      
      body.style.height = '100dvh';
      body.style.overflow = 'hidden';
      body.style.position = 'fixed'; 
      body.style.width = '100%';
      body.style.top = '0';
      body.style.left = '0';
      // Matikan efek tarik-tarikan layar (overscroll)
      body.style.overscrollBehaviorY = 'none';
    } else {
      // Reset total pas pindah ke halaman lain
      root.style.height = 'auto';
      root.style.overflow = 'visible';
      
      body.style.overflow = 'auto';
      body.style.height = 'auto';
      body.style.position = 'static';
      body.style.width = 'auto';
      body.style.overscrollBehaviorY = 'auto';
      
      const voiceTrash = [
        'room-gift-drawer', 'room-drawer-overlay', 'gift-anim-overlay', 
        'vip-entrance-overlay', 'vip-anim-styles-clean'
      ];
      
      voiceTrash.forEach(id => document.getElementById(id)?.remove());
    }

    // CLEANUP SAAT PINDAH HALAMAN
    return () => {
      root.style.height = 'auto';
      body.style.position = 'static';
      body.style.height = 'auto';
      body.style.overflow = 'auto';
    };
  }, [pathname, isStandaloneApp]); 

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
        
        <div 
          className="layout-wrapper" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            // 🔥 Gunakan dvh agar tinggi wrapper presisi biarpun address bar muncul/hilang
            height: isStandaloneApp ? '100dvh' : 'auto',
            minHeight: '100dvh',
            width: '100%',
            overflow: isStandaloneApp ? 'hidden' : 'visible',
            position: 'relative'
          }}
        >
          
          {isHomePage && (
            <div className="search-container" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
              <SearchWrapper />
            </div>
          )}

          <main 
            className={`main-content ${isFullscreenPage ? 'is-fullscreen' : ''}`}
            style={{ 
              flex: 1, 
              display: isStandaloneApp ? 'flex' : 'block',
              flexDirection: 'column',
              overflow: isStandaloneApp ? 'hidden' : 'visible',
              height: isStandaloneApp ? '100%' : 'auto'
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
