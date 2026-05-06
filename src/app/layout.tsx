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

  // 1. Identifikasi Halaman secara Akurat
  const isVoicePage = pathname?.includes('/voice');
  const isHomePage = pathname === '/' || pathname === '/home';
  const isDataPage = pathname?.includes('/data');
  const isNotifPage = pathname?.includes('/notifications');
  // 🔥 TAMBAHKAN: Identifikasi halaman Pusat Misi (dailycek) 🔥
  const isDailyCekPage = pathname?.includes('/dailycek');
  
  // 🔥 FIX: Tambahkan isDailyCekPage agar mentok ke atas (tanpa gap padding)
  const isFullscreenPage = isVoicePage || isDataPage || isNotifPage || isDailyCekPage;

  // 2. Tentukan Visibilitas Komponen Global
  // Sidebar Home WAJIB sembunyi di Voice, Profile, dan Pusat Misi
  const hideSidebar = isVoicePage || isDataPage || isDailyCekPage; 
  
  // Navbar sembunyi hanya di Voice Room
  const hideNavbar = isVoicePage;
  
  // Overlays (global blur/popups) sembunyi di Voice
  const hideOverlays = isVoicePage;

  // 3. JURUS SEKAT TOTAL & CLEANUP
  useEffect(() => {
    // Jika bukan di Voice Room, paksa scroll normal & hapus sampah DOM
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
        
        {/* 🔥 FIX: Sidebar Home tidak akan muncul jika hideSidebar true 🔥 */}
        {!hideSidebar && <Sidebar />}
        
        <div className="layout-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {/* Search bar hanya muncul di Home Page asli */}
          {isHomePage && (
            <div className="search-container" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
              <SearchWrapper />
            </div>
          )}

          {/* 🔥 FIX: Main Content 🔥
              Gunakan class 'is-fullscreen' untuk Profile/Data/Notif/Misi agar nempel ke Header.
          */}
          <main className={`main-content ${isFullscreenPage ? 'is-fullscreen' : ''}`}>
            {children}
          </main>

          {/* Navbar bawah */}
          {!hideNavbar && <Navbar />}
          
        </div>

        {/* Popups & Overlays */}
        <LoginPopup />
        {!hideOverlays && <Overlays />}

      </body>
    </html>
  );
}
