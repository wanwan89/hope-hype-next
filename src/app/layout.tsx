'use client'; 

import '@/lib/i18n'; 
import i18n from '@/lib/i18n';
import { I18nextProvider } from 'react-i18next';

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef } from 'react'; 
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
  const prevPathnameRef = useRef(pathname);

  // --- DETEKSI HALAMAN ---
  const isVoicePage = pathname?.includes('/voice');
  const isHomePage = pathname === '/' || pathname === '/home';
  const isDataPage = pathname?.includes('/data');
  const isNotifPage = pathname?.includes('/notifications');
  const isDailyCekPage = pathname?.includes('/dailycek');
  const isSettingsPage = pathname?.includes('/settings');
  const isVipPage = pathname?.includes('/vip');
  const isContactPage = pathname?.includes('/contact');
  const isStoryPage = pathname?.includes('/story');
  const isPostPage = pathname?.includes('/post');

  const isStandaloneApp = isVoicePage || isStoryPage || isDailyCekPage;
  const hasNavbar = isHomePage || isNotifPage || isPostPage;
  const isFullscreenPage = isStandaloneApp || isDataPage || isSettingsPage || isVipPage || isContactPage;
  const hideSidebar = isStandaloneApp || isDataPage || isSettingsPage || isVipPage || isContactPage; 
  const hideNavbar = isStandaloneApp || isSettingsPage || isVipPage || isContactPage;
  const hideOverlays = isVoicePage || isStoryPage;

  // 🔥 INISIALISASI ERUDA (PASTI MUNCUL)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadEruda = () => {
      // Jika eruda sudah ada, init saja
      if ((window as any).eruda) {
        (window as any).eruda.init();
        console.log('Eruda sudah ada');
        return;
      }

      // Tambahkan script tag
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/eruda';
      script.onload = () => {
        (window as any).eruda.init();
        console.log('Eruda dimuat dan diinisialisasi');
        // (Opsional) tampilkan langsung
        // (window as any).eruda.show();
      };
      script.onerror = () => console.error('Gagal memuat Eruda');
      document.body.appendChild(script);
    };

    // Eksekusi setelah DOM siap
    loadEruda();
  }, []);

  // --- 1. SISTEM ANTI-DOWNLOAD FOTO ---
  useEffect(() => {
    const preventSave = (e: MouseEvent | TouchEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener('contextmenu', preventSave);
    const preventDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') e.preventDefault();
    };
    document.addEventListener('dragstart', preventDrag);
    return () => {
      document.removeEventListener('contextmenu', preventSave);
      document.removeEventListener('dragstart', preventDrag);
    };
  }, []);

  // --- 2. SISTEM LAYOUT FIX ---
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const currentBaseChat = pathname?.split('?')[0];
    const prevBasePath = prevPathnameRef.current?.split('?')[0];

    if (currentBaseChat !== prevBasePath) {
      window.scrollTo(0, 0);
      prevPathnameRef.current = pathname;
    }

    if (isStandaloneApp) {
      root.style.height = '100dvh';
      root.style.overflow = 'hidden';
      body.style.height = '100dvh';
      body.style.overflow = 'hidden';
      body.style.position = 'fixed'; 
      body.style.width = '100%';
      body.style.overscrollBehaviorY = 'none'; 
    } else {
      root.style.height = 'auto';
      root.style.overflow = 'visible';
      if (body.style.position !== 'static') {
        body.style.position = 'static';
        body.style.overflow = 'auto';
        body.style.height = 'auto';
        body.style.width = 'auto';
      }
      body.style.overscrollBehaviorY = 'auto'; 
      const voiceTrash = [
        'room-gift-drawer', 'room-drawer-overlay', 'gift-anim-overlay', 
        'vip-entrance-overlay', 'vip-anim-styles-clean'
      ];
      voiceTrash.forEach(id => document.getElementById(id)?.remove());
    }
  }, [pathname, isStandaloneApp]); 

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1f3cff" />
        <link rel="apple-touch-icon" href="/asets/png/book.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HypeTalk" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        
        <style>{`
          img {
            -webkit-touch-callout: none !important;
            user-select: none !important;
            -webkit-user-drag: none !important;
          }
          body { background-color: var(--bg-main); }
        `}</style>
      </head>
      
      <body className={`antialiased ${isVoicePage ? 'in-voice-room' : 'in-home-app'}`}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider>
            <GlobalShareModal />
            
            {!hideSidebar && <Sidebar />}
            
            <div className={`layout-wrapper ${isStandaloneApp ? 'fixed-layout' : ''}`}>
              
              {isHomePage && (
                <div className="search-container" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', zIndex: 10 }}>
                  <SearchWrapper />
                </div>
              )}

              <main 
                className={`main-content ${hasNavbar ? 'with-bottom-nav' : ''} ${isFullscreenPage ? 'is-fullscreen' : ''}`}
                style={{ 
                  display: isStandaloneApp ? 'flex' : 'block',
                  minHeight: isStandaloneApp ? '100%' : '100dvh'
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

