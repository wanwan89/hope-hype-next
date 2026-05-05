'use client'; 

import { usePathname } from 'next/navigation';
import "./globals.css";
import Sidebar from "@/components/layout/Sidebarpost";
import SearchWrapper from "@/components/layout/SearchWrapperpost"; // Opsional: hapus jika sudah tidak dipakai di sini
import Overlays from "@/components/ui/Overlayspost";
import LoginPopup from "@/components/auth/LoginPopuppost";
import Navbar from "@/components/layout/Navbar"; 

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // FIX 1: Deteksi halaman voice
  const isVoicePage = pathname?.includes('/voice');
  // Kecualikan sidebar di chat dan voice
  const isChatPage = pathname?.includes('/hypetalk') || pathname?.includes('/chat') || isVoicePage;

  // FIX 2: Hapus logika showSearch di sini karena bikin double render
  // Lebih baik SearchWrapper ditaruh langsung di file app/page.tsx lu sendiri

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
          
          {/* 🔥 FIX UTAMA: SearchWrapper gw hapus dari sini! 🔥
             Pastikan di file app/page.tsx (halaman home lu) sudah ada <SearchWrapper />.
             Kalau belum ada, lu tinggal pasang di sana aja biar nggak double.
          */}

          <main style={{ 
            flex: 1, 
            width: '100%', 
            maxWidth: '600px',
            margin: '0 auto', 
            paddingTop: isVoicePage ? '0' : '20px', 
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
