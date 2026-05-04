'use client'; // Tambahkan ini karena kita butuh usePathname

import { usePathname } from 'next/navigation';
import "./globals.css";
import Sidebar from "@/components/layout/Sidebarpost";
import SearchWrapper from "@/components/layout/SearchWrapperpost";
import Overlays from "@/components/ui/Overlayspost";
import LoginPopup from "@/components/auth/LoginPopuppost";
import Navbar from "@/components/layout/Navbar"; 

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Tentukan rute mana saja yang ingin tampilan BERSIH (tanpa sidebar/search/navbar)
  const isChatPage = pathname?.includes('/hypetalk') || pathname?.includes('/chat');

  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-black text-white antialiased" style={{ margin: 0, padding: 0, fontFamily: "'Poppins', sans-serif" }}>
        
        {/* HANYA TAMPIL JIKA BUKAN HALAMAN CHAT */}
        {!isChatPage && <Sidebar />}
        
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {/* HANYA TAMPIL JIKA BUKAN HALAMAN CHAT */}
          {!isChatPage && <SearchWrapper />}

          <main style={{ 
            flex: 1, 
            width: '100%', 
            maxWidth: '600px',
            margin: '0 auto', 
            paddingBottom: isChatPage ? '0' : '120px',
            position: 'relative'
          }}>
            {children}
          </main>

          {/* HANYA TAMPIL JIKA BUKAN HALAMAN CHAT */}
          {!isChatPage && <Navbar />}
        </div>

        {/* MODAL & NOTIFIKASI TETAP GLOBAL (Selalu Ada) */}
        <LoginPopup />
        <Overlays />
      </body>
    </html>
  );
}
