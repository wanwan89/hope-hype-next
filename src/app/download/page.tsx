'use client';
export default function DownloadApp() {
  return (
    <div className="bg-[#0b0c10] text-white font-sans min-h-screen flex items-center justify-center relative overflow-hidden selection:bg-[#1f3cff] selection:text-white">
      
      {/* Efek Glow di Background */}
      <div className="absolute w-[350px] h-[350px] bg-[#1f3cff] blur-[150px] opacity-35 z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"></div>

      <main className="relative z-10 p-6 max-w-sm w-full text-center">
        {/* Glassmorphism Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl">
          
          {/* Logo / Judul */}
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight">
            Hype <span className="text-[#1f3cff]">Talk</span>
          </h1>
          <p className="text-gray-400 mb-8 text-sm">Komunitas, Musik, dan Obrolan Tanpa Batas.</p>
          
          {/* Ilustrasi Smartphone Sederhana */}
          <div className="w-20 h-20 mx-auto bg-[#15161c] rounded-2xl flex items-center justify-center mb-10 border border-gray-800 shadow-inner">
            <svg 
              className="w-10 h-10 text-[#1f3cff]" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="1.5" 
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              ></path>
            </svg>
          </div>

          {/* Tombol Download Dummy */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              alert("Sabar Bree! Aplikasi Hype Talk masih tahap penyempurnaan. Segera rilis!");
            }}
            className="block w-full bg-[#1f3cff] text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_25px_rgba(31,60,255,0.6)] active:scale-95"
          >
            Unduh APK Sekarang
          </button>
          
          {/* Info Panduan */}
          <div className="mt-8 text-[11px] text-gray-500 tracking-wide">
            <p>Ukuran: ~25MB • Android 11+</p>
            <p className="mt-2 text-gray-600">
              Buka pengaturan & izinkan pemasangan dari<br/>
              "Sumber Tidak Dikenal" sebelum instalasi.
            </p>
          </div>

        </div>
      </main>
      
    </div>
  );
}
