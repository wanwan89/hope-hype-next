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

  // 👇 FIX 1: Daftarin '/voice' biar DIKECUALIKAN dari layout global 👇
  const isVoicePage = pathname?.includes('/voice');
  const isChatPage = pathname?.includes('/hypetalk') || pathname?.includes('/chat') || isVoicePage;

  // 2. LOGIKA UNTUK SEARCH: Tampil HANYA di halaman utama (Home: "/")
  const showSearch = pathname === '/';

  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-black text-white antialiased" style={{ margin: 0, padding: 0, fontFamily: "'Poppins', sans-serif" }}>
        
        {/* SIDEBAR: Sekarang otomatis SEMBUNYI di halaman /voice juga! */}
        {!isChatPage && <Sidebar />}
        
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {/* SEARCH: Hanya di Home */}
          {showSearch && <SearchWrapper />}

          <main style={{ 
            flex: 1, 
            width: '100%', 
            maxWidth: '600px',
            margin: '0 auto', 
            // 👇 FIX 2: Hapus gap 20px di atas KUSUS buat halaman Voice biar mepet atas 👇
            paddingTop: (showSearch || isVoicePage) ? '0' : '20px', 
            // 👇 FIX 3: Hapus padding 120px di bawah KUSUS buat Voice biar tinggi layarnya pas 👇
            paddingBottom: isVoicePage ? '0' : '120px',
            position: 'relative'
          }}>
            {children}
          </main>

          {/* 👇 FIX 4: Sembunyikan Navbar bawah KUSUS di halaman Voice 👇 */}
          {!isVoicePage && <Navbar />}
          
        </div>

        {/* MODAL & NOTIFIKASI */}
        <LoginPopup />
        <Overlays />
      </body>
    </html>
  );
}
