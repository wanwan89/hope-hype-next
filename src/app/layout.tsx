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

  // 1. Deteksi Halaman lebih akurat
  const isHomePage = pathname === '/' || pathname === '';
  const isVoicePage = pathname?.includes('/voice');
  const isChatPage = pathname?.includes('/hypetalk') || pathname?.includes('/chat') || isVoicePage;

  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-black text-white antialiased" style={{ margin: 0, padding: 0, fontFamily: "'Poppins', sans-serif" }}>
        
        {/* SIDEBAR: Muncul kecuali di Chat & Voice */}
        {!isChatPage && <Sidebar />}
        
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {/* SEARCH WRAPPER: Pakai logika ini biar pasti nongol di Home */}
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
            // Kalau voice 0, kalau home 10, selain itu 20
            paddingTop: isVoicePage ? '0' : (isHomePage ? '10px' : '20px'), 
            paddingBottom: isVoicePage ? '0' : '120px',
            position: 'relative'
          }}>
            {children}
          </main>

          {/* NAVBAR: Hilangkan hanya di Voice */}
          {!isVoicePage && <Navbar />}
          
        </div>

        {/* MODAL & NOTIFIKASI */}
        <LoginPopup />
        
        {/* 🔥 FIX: Overlays (Kado Home) JANGAN dimunculkan kalau lagi di Voice Room 🔥 */}
        {!isVoicePage && <Overlays />}

      </body>
    </html>
  );
}
