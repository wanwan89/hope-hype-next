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

  // 1. Logika untuk Navbar & Sidebar (Sembunyi di halaman chat)
  const isChatPage = pathname?.includes('/hypetalk') || pathname?.includes('/chat');

  // 2. LOGIKA BARU UNTUK SEARCH: Tampil HANYA di halaman tertentu
  // Saat ini gue set cuma muncul di halaman utama (Home: "/")
  // Kalau mau ditambah, misal: pathname === '/' || pathname === '/explore'
  const showSearch = pathname === '/';

  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-black text-white antialiased" style={{ margin: 0, padding: 0, fontFamily: "'Poppins', sans-serif" }}>
        
        {/* SIDEBAR: Tetap sembunyi di chat */}
        {!isChatPage && <Sidebar />}
        
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {/* SEARCH BUKAN PAKAI !isChatPage LAGI, TAPI PAKAI showSearch */}
          {showSearch && <SearchWrapper />}

          <main style={{ 
            flex: 1, 
            width: '100%', 
            maxWidth: '600px',
            margin: '0 auto', 
            // Kalau ada search, padding atas sesuaikan, kalau nggak ada biarin mepet
            paddingTop: showSearch ? '0' : '20px', 
            paddingBottom: isChatPage ? '0' : '120px',
            position: 'relative'
          }}>
            {children}
          </main>

          {/* NAVBAR: Tetap sembunyi di chat */}
          {!isChatPage && <Navbar />}
        </div>

        {/* MODAL & NOTIFIKASI */}
        <LoginPopup />
        <Overlays />
      </body>
    </html>
  );
}
