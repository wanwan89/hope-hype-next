'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function DownloadApp() {
  return (
    <div className="bg-[#050505] text-white font-sans min-h-screen flex items-center justify-center relative overflow-hidden selection:bg-[#1f3cff]">
      
      {/* Dynamic Background Blobs - Gaya iOS Wallpapers */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#1f3cff] blur-[120px] opacity-20 rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#4facfe] blur-[100px] opacity-10 rounded-full"></div>

      <main className="relative z-10 p-6 max-w-[400px] w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative bg-white/[0.03] backdrop-blur-[30px] border border-white/[0.08] rounded-[3rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          {/* Shine Effect Overlay */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none"></div>

          {/* App Icon - iOS Squircle Style */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-24 h-24 mx-auto mb-8 relative"
          >
            <div className="absolute inset-0 bg-[#1f3cff] rounded-[1.8rem] blur-xl opacity-40"></div>
            <div className="relative w-full h-full bg-gradient-to-br from-[#1f3cff] to-[#0018ff] rounded-[1.8rem] flex items-center justify-center shadow-inner border border-white/20">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </motion.div>

          {/* Typography */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              HypeTalk <span className="text-[#1f3cff]">Globe</span>
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed px-4">
              Komunitas kreatif, musik, dan obrolan tanpa batas dalam satu genggaman.
            </p>
          </div>

          {/* Action Area */}
          <div className="space-y-4">
            <motion.button 
              whileTap={{ scale: 0.96 }}
              onClick={() => alert("Sabar Bree! Lagi kita poles biar makin licin. Segera mendarat!")}
              className="relative group w-full overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#1f3cff] blur-md group-hover:blur-xl transition-all opacity-50"></div>
              <div className="relative bg-[#1f3cff] text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 border border-white/20">
                <span className="material-icons text-xl">get_app</span>
                Unduh APK (v1.0.4)
              </div>
            </motion.button>

            <div className="flex justify-between items-center px-2">
               <div className="flex flex-col items-start">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Ukuran</span>
                  <span className="text-xs font-semibold">24.8 MB</span>
               </div>
               <div className="w-px h-6 bg-white/10"></div>
               <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Sistem</span>
                  <span className="text-xs font-semibold">Android 11+</span>
               </div>
            </div>
          </div>

          {/* Security Notice - iOS Style Toast */}
          <div className="mt-10 p-4 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
            <div className="flex gap-3">
              <span className="material-icons text-amber-400 text-sm">verified_user</span>
              <p className="text-[10px] text-gray-400 leading-relaxed text-left">
                Aplikasi ini diverifikasi aman. Pastikan izin <span className="text-white font-medium">"Instal Aplikasi Tidak Dikenal"</span> aktif di pengaturan browser lu.
              </p>
            </div>
          </div>

        </motion.div>

        {/* Footer Info */}
        <p className="mt-8 text-center text-gray-600 text-[11px] font-medium tracking-wide uppercase">
          &copy; 2026 HypeTalk Globe Community
        </p>
      </main>
    </div>
  );
}
