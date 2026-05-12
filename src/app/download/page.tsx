'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function DownloadApp() {
  return (
    <div className="bg-[#050505] text-white font-sans min-h-[100dvh] flex flex-col justify-between relative overflow-hidden selection:bg-[#1f3cff]">
      
      {/* --- BACKGROUND GLOW --- */}
      <div className="absolute top-0 right-0 w-[70vw] h-[70vw] bg-[#1f3cff] blur-[120px] opacity-20 translate-x-1/3 -translate-y-1/3 rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/2 left-0 w-[50vw] h-[50vw] bg-[#00d2ff] blur-[100px] opacity-10 -translate-x-1/2 rounded-full pointer-events-none"></div>

      {/* --- TOP SECTION: HERO & BRANDING --- */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 mt-8">
        
        {/* LOGO: Dikunci ukurannya pakai style inline agar tidak meledak */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="relative w-[90px] h-[90px] mb-8"
          style={{ width: '90px', height: '90px', minWidth: '90px', minHeight: '90px' }}
        >
          <div className="absolute inset-0 bg-[#1f3cff] rounded-3xl blur-lg opacity-50 animate-pulse"></div>
          <div className="relative w-full h-full bg-gradient-to-tr from-[#1f3cff] to-[#4facfe] rounded-[1.5rem] p-[2px] shadow-2xl">
            <div className="w-full h-full bg-[#0b0c10] rounded-[1.4rem] flex items-center justify-center">
              <span className="material-icons text-white" style={{ fontSize: '42px' }}>public</span>
            </div>
          </div>
        </motion.div>

        {/* TYPOGRAPHY */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            HypeTalk <span className="text-[#1f3cff]">Globe</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">
            Satu aplikasi untuk obrolan suara, musik, dan komunitas tanpa batas.
          </p>
        </motion.div>

        {/* FEATURE PILLS */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-2 mt-8"
        >
          <span className="px-4 py-1.5 bg-white/5 rounded-full text-xs font-semibold border border-white/10 text-gray-300 backdrop-blur-sm">🎵 Live Music</span>
          <span className="px-4 py-1.5 bg-white/5 rounded-full text-xs font-semibold border border-white/10 text-gray-300 backdrop-blur-sm">🎙️ Voice Room</span>
          <span className="px-4 py-1.5 bg-white/5 rounded-full text-xs font-semibold border border-white/10 text-gray-300 backdrop-blur-sm">💬 Global Chat</span>
        </motion.div>
      </div>

      {/* --- BOTTOM SECTION: ACTION SHEET --- */}
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
        className="relative z-20 bg-[#111111] border-t border-white/10 rounded-t-[2.5rem] p-8 pb-12 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] w-full max-w-md mx-auto"
      >
        {/* Grip Handle */}
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-8"></div>

        {/* INFO GRID */}
        <div className="flex justify-between items-center bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 mb-6">
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Versi</span>
            <span className="text-sm font-semibold text-white">1.0.4</span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Ukuran</span>
            <span className="text-sm font-semibold text-white">24.8 MB</span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Sistem</span>
            <span className="text-sm font-semibold text-[#2ecc71]">Android 11+</span>
          </div>
        </div>

        {/* MAIN BUTTON */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            alert("Aplikasi sedang dikompilasi ke APK. Harap tunggu rilis resminya!");
          }}
          className="group relative w-full flex items-center justify-center gap-3 bg-[#1f3cff] text-white font-bold py-4 rounded-2xl overflow-hidden transition-transform active:scale-95"
        >
          {/* Button Shine Effect */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
          
          <span className="material-icons" style={{ fontSize: '20px' }}>download</span>
          Unduh APK Sekarang
        </button>

        {/* SECURITY TOAST */}
        <div className="mt-6 flex items-start gap-3 p-3 bg-blue-900/10 border border-blue-500/20 rounded-xl">
          <span className="material-icons text-blue-400 mt-0.5" style={{ fontSize: '16px' }}>verified_user</span>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Diverifikasi aman oleh HypeTalk. Pastikan Anda mengizinkan <strong className="text-gray-300 font-medium">"Instal dari Sumber Tidak Dikenal"</strong> di pengaturan ponsel Anda.
          </p>
        </div>

      </motion.div>
      
      {/* Custom Keyframe for Button Shine */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
