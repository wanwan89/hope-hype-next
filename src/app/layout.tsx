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

  // 1. Identifikasi Halaman (Logic asli lu tetap terjaga)
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

  // 2. 🔥 JURUS PAMUNGKAS: ANTI GARIS HITAM, KEDIP MODAL, & CLEANUP 🔥
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // 🔥 FIX UTAMA: Warna dasar aplikasi lu. Ganti ke #ffffff biar garis hitam ilang.
    const primaryBg = '#ffffff'; 

    if (isStandaloneApp) {
      // Mode Aplikasi: Kunci tinggi layar secara dinamis (dvh)
      root.style.height = '100dvh';
      root.style.overflow = 'hidden';
      root.style.backgroundColor = primaryBg; 
      
      body.style.height = '100dvh';
      body.style.overflow = 'hidden';
      body.style.position = 'fixed'; 
      body.style.width = '100%';
      body.style.top = '0';
      body.style.left = '0';
      body.style.backgroundColor = primaryBg;
      body.style.overscrollBehaviorY = 'none'; // Kunci biar gak bisa ditarik nembus background
    } else {
      // Mode Web Normal: Reset semua gaya biar scroll lancar
      root.style.height = 'auto';
      root.style.overflow = 'visible';
      root.style.backgroundColor = primaryBg;
      
      body.style.overflow = 'auto';
      body.style.height = 'auto';
      body.style.position = 'static';
      body.style.width = 'auto';
      body.style.backgroundColor = primaryBg;
      body.style.overscrollBehaviorY = 'auto';
      
      // Cleanup sampah Voice Room biar gak memory leak
      const voiceTrash = [
        'room-gift-drawer', 'room-drawer-overlay', 'gift-anim-overlay', 
        'vip-entrance-overlay', 'vip-anim-styles-clean'
      ];
      voiceTrash.forEach(id => document.getElementById(id)?.remove());
    }

    // 🔥 FIX KEDIP MODAL: Paksa scroll ke paling atas tiap ganti rute
    window.scrollTo(0, 0);

    return () => {
      root.style.height = 'auto';
      body.style.position = 'static';
      body.style.height = 'auto';
      body.style.overflow = 'auto';
    };
  }, [pathname, isStandaloneApp]); 

  return (
    <html lang="id" style={{ overflowX: 'hidden', backgroundColor: '#ffffff' }}>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet" />
        {/* 🔥 FIX VIEWPORT: Maksa konten isi seluruh layar aman HP 🔥 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body 
        // 🔥 Ganti bg-black jadi bg-white biar transisi render gak nampilin item 🔥
        className={`bg-white text-slate-900 antialiased ${isVoicePage ? 'in-voice-room' : 'in-home-app'}`}
        style={{ margin: 0, padding: 0, fontFamily: "'Poppins', sans-serif" }}
      >
        
        {!hideSidebar && <Sidebar />}
        
        <div 
          className={`layout-wrapper ${isStandaloneApp ? 'fixed-layout' : ''}`}
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: isStandaloneApp ? '100dvh' : 'auto',
            minHeight: '100dvh',
            width: '100%',
            overflow: isStandaloneApp ? 'hidden' : 'visible',
            position: 'relative',
            backgroundColor: 'inherit' // Rantai warna dari body
          }}
        >
          
          {isHomePage && (
            <div className="search-container" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', zIndex: 10 }}>
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
              height: isStandaloneApp ? '100%' : 'auto',
              width: '100%',
              backgroundColor: 'inherit'
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
