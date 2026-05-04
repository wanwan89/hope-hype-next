import "./globals.css";
import Sidebar from "@/components/layout/Sidebarpost";
import SearchWrapper from "@/components/layout/SearchWrapperpost";
import Overlays from "@/components/ui/Overlayspost";
import LoginPopup from "@/components/auth/LoginPopuppost";
import Navbar from "@/components/layout/Navbar"; 

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        {/* Font & Icons */}
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-black text-white antialiased overflow-x-hidden" style={{ margin: 0, padding: 0, fontFamily: "'Poppins', sans-serif" }}>
        
        {/* 1. SIDEBAR (Fixed Overlay) */}
        <Sidebar />
        
        {/* 2. WRAPPER UTAMA */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {/* 3. HEADER / SEARCH (Nempel di Atas) */}
          <header style={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 1000, 
            backgroundColor: 'rgba(0,0,0,0.8)', 
            backdropFilter: 'blur(10px)',
            width: '100%' 
          }}>
            <SearchWrapper />
          </header>

          {/* 4. AREA KONTEN UTAMA */}
          {/* pb-32 (sekitar 128px) supaya scroll mentok gak ketutup Navbar */}
          <main style={{ 
            flex: 1, 
            width: '100%', 
            maxWidth: '600px', // Standar lebar feed mobile
            margin: '0 auto', 
            paddingBottom: '120px' 
          }}>
            {children}
          </main>

          {/* 5. NAVBAR BOTTOM (Nempel di Bawah) */}
          {/* Komponen Navbar ini sudah punya 'fixed bottom' di dalamnya */}
          <Navbar />
        </div>

        {/* 6. MODAL & NOTIFIKASI */}
        <LoginPopup />
        <Overlays />
        
      </body>
    </html>
  );
}
