'use client'; 

import { usePathname } from 'next/navigation';
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
  
  // 🔥 FIX: HypeTalk sekarang dibolehkan muncul Sidebar & Navbar
  // Kita cuma sembunyikan Sidebar di Voice Page aja biar gak berantakan
  const hideSidebar = isVoicePage; 
  const hideNavbar = isVoicePage;
  const hideOverlays = isVoicePage;

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

          <main style={{ 
            flex: 1, 
            width: '100%', 
            maxWidth: '600px',
            margin: '0 auto', 
            // Atur padding biar gak nabrak Navbar/Sidebar
            paddingTop: isVoicePage ? '0' : (isHomePage ? '10px' : '20px'), 
            paddingBottom: isVoicePage ? '0' : '100px', // Kasih ruang buat Navbar bawah
            position: 'relative'
          }}>
            {children}
          </main>

          {/* NAVBAR BAWAH: Muncul kecuali di Voice */}
          {!hideNavbar && <Navbar />}
          
        </div>

        {/* MODAL & NOTIFIKASI */}
        <LoginPopup />

        {/* 🔥 FIX: Overlays (Kado Home) muncul di mana-mana KECUALI di Voice 🔥 */}
        {!hideOverlays && <Overlays />}

      </body>
    </html>
  );
}
