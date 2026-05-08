'use client'; 

import '@/lib/i18n'; 
import i18n from '@/lib/i18n';
import { I18nextProvider } from 'react-i18next';

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect } from 'react'; 
import "./globals.css";
import Sidebar from "@/components/layout/Sidebarpost";
import SearchWrapper from "@/components/layout/SearchWrapperpost";
import Overlays from "@/components/ui/Overlayspost";
import LoginPopup from "@/components/auth/LoginPopuppost";
import Navbar from "@/components/layout/Navbar"; 
import { ThemeProvider } from '@/components/ThemeProvider';
import GlobalShareModal from '@/components/GlobalShareModal';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isVoicePage = pathname?.includes('/voice');
  const isHomePage = pathname === '/' || pathname === '/home';
  const isDataPage = pathname?.includes('/data');
  const isNotifPage = pathname?.includes('/notifications');
  const isDailyCekPage = pathname?.includes('/dailycek');
  const isSettingsPage = pathname?.includes('/settings');
  const isVipPage = pathname?.includes('/vip');
  const isContactPage = pathname?.includes('/contact');
  const isStoryPage = pathname?.includes('/story');
  
  const isStandaloneApp = isVoicePage || isDailyCekPage || isStoryPage;
  const isFullscreenPage = isStandaloneApp || isDataPage || isNotifPage || isSettingsPage || isVipPage || isContactPage;

  const hideSidebar = isStandaloneApp || isDataPage || isSettingsPage || isVipPage || isContactPage; 
  const hideNavbar = isStandaloneApp || isSettingsPage || isVipPage || isContactPage;
  const hideOverlays = isVoicePage || isStoryPage;

  // --- 1. 🔥 SISTEM ANTI-DOWNLOAD FOTO 🔥 ---
  useEffect(() => {
    const preventSave = (e: MouseEvent | TouchEvent) => {
      // Cek apakah yang ditekan adalah elemen gambar (IMG)
      if ((e.target as HTMLElement).tagName === 'IMG') {
        // Matikan menu klik kanan / menu tekan lama
        e.preventDefault();
        return false;
      }
    };

    // Matikan Klik Kanan / Long Press Konteks Menu
    document.addEventListener('contextmenu', preventSave);
    
    // Matikan Drag & Drop (biar foto ga bisa ditarik ke tab baru)
    const preventDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') e.preventDefault();
    };
    document.addEventListener('dragstart', preventDrag);

    return () => {
      document.removeEventListener('contextmenu', preventSave);
      document.removeEventListener('dragstart', preventDrag);
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isStandaloneApp) {
      root.style.height = '100dvh';
      root.style.overflow = 'hidden';
      body.style.height = '100dvh';
      body.style.overflow = 'hidden';
      body.style.position = 'fixed'; 
      body.style.width = '100%';
      body.style.top = '0';
      body.style.left = '0';
      body.style.overscrollBehaviorY = 'none'; 
    } else {
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

    window.scrollTo(0, 0);

    return () => {
      root.style.height = 'auto';
      body.style.position = 'static';
      body.style.height = 'auto';
      body.style.overflow = 'auto';
    };
  }, [pathname, isStandaloneApp]); 

  return (
    <html lang="id" style={{ overflowX: 'hidden' }} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1f3cff" />
        <link rel="apple-touch-icon" href="/asets/png/book.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Hope Hype" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        
        {/* --- 2. 🔥 CSS INJECT KHUSUS ANTI-LONGPRESS IOS 🔥 --- */}
        <style>{`
          img {
            -webkit-touch-callout: none !important; /* Matikan menu simpan gambar di iOS */
            -webkit-user-select: none !important;
            -khtml-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
            -webkit-user-drag: none !important; /* Matikan drag foto */
          }
        `}</style>
      </head>
      
      <body 
        className={`antialiased ${isVoicePage ? 'in-voice-room' : 'in-home-app'}`}
        style={{ margin: 0, padding: 0, fontFamily: "'Poppins', sans-serif" }}
      >
        <I18nextProvider i18n={i18n}>
          <ThemeProvider>
            <GlobalShareModal />
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
                position: 'relative'
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
                  flex: '1 1 auto', 
                  display: isStandaloneApp ? 'flex' : 'block',
                  flexDirection: 'column',
                  overflow: isStandaloneApp ? 'hidden' : 'visible',
                  height: isStandaloneApp ? '100%' : 'auto',
                  width: '100%',
                  marginBottom: isStandaloneApp ? '0' : '-1px', 
                }}
              >
                {children}
              </main>
            </div>

            {!hideNavbar && <Navbar />}
            <LoginPopup />
            {!hideOverlays && <Overlays />}
          </ThemeProvider>
        </I18nextProvider>
      </body>
    </html>
  );
}
