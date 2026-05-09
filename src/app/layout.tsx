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
  // 🔥 FIX 1: Ref untuk simpan path sebelumnya biar gak ganggu koneksi telpon
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

  // App yang dikunci (Tidak bisa scroll body)
  const isStandaloneApp = isVoicePage || isStoryPage || isDailyCekPage;
  
  // Halaman yang butuh Navbar Bawah (Agar konten tidak tertutup)
  const hasNavbar = isHomePage || isNotifPage || isPostPage;

  // Halaman Fullscreen (Tanpa Sidebar/Navbar)
  const isFullscreenPage = isStandaloneApp || isDataPage || isSettingsPage || isVipPage || isContactPage;

  const hideSidebar = isStandaloneApp || isDataPage || isSettingsPage || isVipPage || isContactPage; 
  const hideNavbar = isStandaloneApp || isSettingsPage || isVipPage || isContactPage;
  const hideOverlays = isVoicePage || isStoryPage;

  // --- 1. 🔥 SISTEM ANTI-DOWNLOAD FOTO (UTUH) 🔥 ---
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

  // --- 2. 🔥 SISTEM LAYOUT FIX (FULL FIX) 🔥 ---
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // 🔥 FIX 2: Cek apakah pindah halaman beneran atau cuma ganti Query (biar telpon gak putus)
    const currentBaseChat = pathname?.split('?')[0];
    const prevBasePath = prevPathnameRef.current?.split('?')[0];

    if (currentBaseChat !== prevBasePath) {
      window.scrollTo(0, 0); // Hanya scroll jika ganti halaman, bukan ganti ID chat/telpon
      prevPathnameRef.current = pathname;
    }

    if (isStandaloneApp) {
      // Lock layar untuk Voice/Story/DailyCek
      root.style.height = '100dvh';
      root.style.overflow = 'hidden';
      body.style.height = '100dvh';
      body.style.overflow = 'hidden';
      body.style.position = 'fixed'; 
      body.style.width = '100%';
      body.style.overscrollBehaviorY = 'none'; 
    } else {
      // Bebaskan scroll untuk halaman biasa
      root.style.height = 'auto';
      root.style.overflow = 'visible';
      
      // Kembalikan ke posisi static hanya jika sebelumnya fixed (biar gak flicker)
      if (body.style.position !== 'static') {
        body.style.position = 'static';
        body.style.overflow = 'auto';
        body.style.height = 'auto';
        body.style.width = 'auto';
      }
      
      // 🔥 FIX 3: Ubah ke 'auto' agar halaman bisa PULL-TO-REFRESH 🔥
      body.style.overscrollBehaviorY = 'auto'; 
      
      // Bersihkan sampah Voice jika keluar room
      const voiceTrash = [
        'room-gift-drawer', 'room-drawer-overlay', 'gift-anim-overlay', 
        'vip-entrance-overlay', 'vip-anim-styles-clean'
      ];
      voiceTrash.forEach(id => document.getElementById(id)?.remove());
    }

    return () => {
      // Cleanup minimalis
    };
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
        
        {/* --- 3. 🔥 ANTI-LONGPRESS IOS (UTUH) 🔥 --- */}
        <style>{`
          img {
            -webkit-touch-callout: none !important;
            user-select: none !important;
            -webkit-user-drag: none !important;
          }
          /* Fix Gap Warna Body agar tidak belang saat scroll */
          body { background-color: var(--bg-main); }
        `}</style>
      </head>
      
      <body className={`antialiased ${isVoicePage ? 'in-voice-room' : 'in-home-app'}`}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider>
            <GlobalShareModal />
            
            {/* Sidebar Muncul jika tidak di-hide */}
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

            {/* Navbar Muncul hanya jika diperlukan */}
            {!hideNavbar && <Navbar />}
            
            <LoginPopup />
            {!hideOverlays && <Overlays />}
          </ThemeProvider>
        </I18nextProvider>
      </body>
    </html>
  );
}
