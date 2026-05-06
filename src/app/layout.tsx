'use client'; 

import { usePathname } from 'next/navigation';
import { useEffect } from 'react'; // 🔥 Import useEffect untuk cleanup
import "./globals.css";
import Sidebar from "@/components/layout/Sidebarpost";
import SearchWrapper from "@/components/layout/SearchWrapperpost";
import Overlays from "@/components/ui/Overlayspost";
import LoginPopup from "@/components/auth/LoginPopuppost";
import Navbar from "@/components/layout/Navbar"; 

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 1. Deteksi Halaman
  const isHomePage = pathname === '/' || pathname === '';
  const isVoicePage = pathname?.includes('/voice');
  
  // Logika Sembunyi
  const hideSidebar = isVoicePage; 
  const hideNavbar = isVoicePage;
  const hideOverlays = isVoicePage;

  // 🔥 FIX: Safety Reset pas pindah halaman (Sapu Jagat) 🔥
  useEffect(() => {
    // 1. Reset paksa style body biar gak ada overflow:hidden yang nyangkut
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
    document.body.style.height = 'auto';
    
    // 2. Hapus paksa elemen manual Voice Room kalau masih nempel di DOM
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

    console.log("Layout reset for path:", pathname);
  }, [pathname]); // Akan jalan setiap kali lu pindah link/halaman

  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-black text-white antialiased" style={{ margin: 0, padding: 0, fontFamily: "'Poppins', sans-serif" }}>
        
        {/* SIDEBAR: Muncul di Home & HypeTalk, Hilang hanya di Voice */}
        {!hideSidebar && <Sidebar />}
        
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {/* SEARCH WRAPPER: Khusus di Home saja */}
          {isHomePage && (
            <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
              <SearchWrapper />
            </div>
          )}

          <main 
            key={pathname} // 🔥 Penting: Memaksa React render ulang total konten saat pindah halaman
            style={{ 
              flex: 1, 
              width: '100%', 
              maxWidth: '600px',
              margin: '0 auto', 
              paddingTop: isVoicePage ? '0' : (isHomePage ? '10px' : '20px'), 
              paddingBottom: isVoicePage ? '0' : '100px',
              position: 'relative'
            }}
          >
            {children}
          </main>

          {/* NAVBAR BAWAH: Muncul kecuali di Voice */}
          {!hideNavbar && <Navbar />}
          
        </div>

        {/* MODAL & NOTIFIKASI */}
        <LoginPopup />

        {/* 🔥 FIX: Overlays (Kado Home) HANYA muncul di luar Voice 🔥 */}
        {!hideOverlays && <Overlays />}

      </body>
    </html>
  );
}
