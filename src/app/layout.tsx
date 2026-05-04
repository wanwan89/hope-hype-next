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

  // 1. Logika untuk Sidebar (Tetap kita biarkan sembunyi di halaman chat biar nggak sempit)
  const isChatPage = pathname?.includes('/hypetalk') || pathname?.includes('/chat');

  // 2. LOGIKA UNTUK SEARCH: Tampil HANYA di halaman utama (Home: "/")
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
          
          {/* SEARCH: Hanya di Home */}
          {showSearch && <SearchWrapper />}

          <main style={{ 
            flex: 1, 
            width: '100%', 
            maxWidth: '600px',
            margin: '0 auto', 
            paddingTop: showSearch ? '0' : '20px', 
            // FIX: Padding bawah kita set fix 120px di semua halaman 
            // biar konten paling bawah (termasuk chat) gak ketutup Navbar
            paddingBottom: '120px',
            position: 'relative'
          }}>
            {children}
          </main>

          {/* FIX UTAMA: Hapus gembok "!isChatPage &&" di sini */}
          {/* Sekarang Navbar merdeka muncul di semua halaman! */}
          <Navbar />
          
        </div>

        {/* MODAL & NOTIFIKASI */}
        <LoginPopup />
        <Overlays />
      </body>
    </html>
  );
}
