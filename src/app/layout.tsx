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
  const isVoicePage = pathname === '/voice' || pathname?.startsWith('/voice/');
  const isHomePage = pathname === '/';
  // Kecualikan sidebar di chat dan voice
  const isChatPage = pathname?.includes('/hypetalk') || pathname?.includes('/chat') || isVoicePage;

  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-black text-white antialiased" style={{ margin: 0, padding: 0, fontFamily: "'Poppins', sans-serif" }}>
        
        {/* SIDEBAR */}
        {!isChatPage && <Sidebar />}
        
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {/* 👇 FIX SEARCH: Muncul HANYA di Home (/) 👇 */}
          {isHomePage && <SearchWrapper />}

          <main style={{ 
            flex: 1, 
            width: '100%', 
            maxWidth: '600px',
            margin: '0 auto', 
            // Kalau voice, rapetin ke atas (0). Kalau home, karena udah ada SearchWrapper, kasih gap dikit.
            paddingTop: isVoicePage ? '0' : '10px', 
            paddingBottom: isVoicePage ? '0' : '120px',
            position: 'relative'
          }}>
            {children}
          </main>

          {/* NAVBAR */}
          {!isVoicePage && <Navbar />}
          
        </div>

        {/* MODAL & NOTIFIKASI */}
        <LoginPopup />
        <Overlays />
      </body>
    </html>
  );
}
