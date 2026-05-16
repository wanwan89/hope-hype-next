'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * IMPORT SEMUA MODAL SECARA GLOBAL
 * Pastikan nama file sesuai (Case Sensitive)
 */
import CommentModal from '@/components/post/CommentModalpost';
import GiftSheet from '@/components/post/GiftSheetpost';
import './Overlays.css';

declare global {
  interface Window {
    openGlobalShare?: (url?: string, title?: string, text?: string, name?: string) => void;
    showNotif?: (msg: string, type?: string) => void;
    openBigImage?: (src: string) => void;
    openPostOptions?: (postId: string, isOwner: boolean, creatorId: string) => void;
    closePostOptions?: () => void;
    sharePost?: (postId: string) => void;
    confirmDeletePost?: (postId: string) => void;
    // 🔥 FUNGSI BARU: BISA DIPANGGIL DARI MANA AJA BUAT GANTIIN confirm() BAWAAN ANDROID 🔥
    showConfirm?: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void;
  }
}

export default function Overlayspost() {
  const [bigImgSrc, setBigImgSrc] = useState<string | null>(null);

  // 🔥 STATE UNIVERSAL CUSTOM CONFIRM MODAL 🔥
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDanger: boolean;
    onConfirm: (() => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDanger: true,
    onConfirm: null
  });

  useEffect(() => {
    // --- 1. SENSOR SINYAL BUKA MODAL POST ---
    const handleOpenPost = () => {
      console.log("Sinyal Open Post diterima! Arahkan ke /create lewat router di tempat lain.");
    };
    window.addEventListener('openPostModal', handleOpenPost);

    // --- 2. TOAST NOTIFIKASI ---
    window.showNotif = (msg: string, type: string = "info") => {
      const container = document.getElementById("toast");
      if (!container) return;

      const config: any = {
        success: { title: "Berhasil", icon: "✓" },
        error: { title: "Gagal", icon: "✕" },
        warning: { title: "Peringatan", icon: "!" },
        info: { title: "Info", icon: "i" }
      };
      const { title, icon } = config[type] || config.info;

      const toastCard = document.createElement("div");
      toastCard.className = `toast-card ${type}`;
      toastCard.innerHTML = `
        <div class="toast-icon-wrap"><span>${icon}</span></div>
        <div class="toast-content">
          <div class="toast-title">${title}</div>
          <div class="toast-subtitle">${msg}</div>
        </div>
      `;

      container.appendChild(toastCard);
      setTimeout(() => toastCard.classList.add("show"), 10);
      setTimeout(() => {
        toastCard.classList.remove("show");
        setTimeout(() => toastCard.remove(), 300);
      }, 3500);
    };

    // --- 3. ZOOM IMAGE (BIG IMAGE) ---
    window.openBigImage = (src: string) => {
      setBigImgSrc(src);
      const container = document.getElementById("bigImageContainer");
      if (container) {
        container.style.display = "flex";
        setTimeout(() => {
          const img = document.getElementById("bigImage");
          if (img) img.style.transform = "scale(1)";
        }, 50);
      }
    };

    // --- 4. ACTION SHEET (POST OPTIONS) ---
    window.openPostOptions = (postId: string, isOwner: boolean, creatorId: string) => {
      const sheet = document.getElementById('postOptionsSheet');
      const content = document.getElementById('sheetOptionsContent');
      if (!sheet || !content) return;

      content.innerHTML = `
        <button class="sheet-btn" id="shareBtn">Bagikan Karya</button>
        <button class="sheet-btn" id="profileBtn">Lihat Profil</button>
        ${isOwner ? `<button class="sheet-btn danger" id="deleteBtn">Hapus Karya</button>` : `<button class="sheet-btn" id="reportBtn">Laporkan</button>`}
      `;

      content.querySelector('#shareBtn')?.addEventListener('click', () => window.sharePost && window.sharePost(postId));
      content.querySelector('#profileBtn')?.addEventListener('click', () => window.location.href = `/data?id=${creatorId}`); 
      content.querySelector('#deleteBtn')?.addEventListener('click', () => window.confirmDeletePost && window.confirmDeletePost(postId));
      content.querySelector('#reportBtn')?.addEventListener('click', () => {
        if (window.showNotif) window.showNotif('Karya telah dilaporkan.', 'info');
        if (window.closePostOptions) window.closePostOptions();
      });

      sheet.classList.add('active');
    };

    window.closePostOptions = () => {
      document.getElementById('postOptionsSheet')?.classList.remove('active');
    };

    // --- 5. HUBUNGKAN KE GLOBAL SHARE MODAL ---
    window.sharePost = (postId: string) => {
      const url = window.location.origin + '/post?id=' + postId;
      if (window.closePostOptions) window.closePostOptions();

      if (window.openGlobalShare) {
        window.openGlobalShare(
          url,
          'Karya di HypeTalk',
          'Cek karya keren ini di HypeTalk!',
          undefined 
        );
      } else {
        navigator.clipboard.writeText(url);
        if (window.showNotif) window.showNotif('Link disalin!', 'success');
      }
    };

    // 🔥 6. DAFTARIN FUNGSI CUSTOM CONFIRM UNIVERSAL 🔥
    window.showConfirm = (title, message, onConfirm, isDanger = true) => {
      setConfirmConfig({ isOpen: true, title, message, onConfirm, isDanger });
    };

    // 🔥 7. UBAH LOGIKA DELETE POST PAKAI CUSTOM CONFIRM 🔥
    window.confirmDeletePost = (postId: string) => {
      if (window.closePostOptions) window.closePostOptions();
      
      window.showConfirm(
        "Hapus Permanen?", 
        "Karya ini bakal hilang selamanya dari profil lu dan gak bisa dibalikin lagi.",
        async () => {
          try {
            const { error } = await supabase.from("posts").delete().eq("id", postId);
            if (error) throw error;
            
            if (window.showNotif) window.showNotif("Berhasil dihapus!", "success");
            setTimeout(() => location.reload(), 1000);
          } catch (err: any) {
            if (window.showNotif) window.showNotif(err.message, "error");
          }
        },
        true // True karena ini aksi berbahaya (merah)
      );
    };

    return () => {
      window.removeEventListener('openPostModal', handleOpenPost);
    };
  }, []);

  const handleCloseBigImage = () => {
    const img = document.getElementById("bigImage");
    if (img) img.style.transform = "scale(0.9)";
    setTimeout(() => {
      const container = document.getElementById("bigImageContainer");
      if (container) container.style.display = "none";
      setBigImgSrc(null);
    }, 300);
  };

  const executeConfirmAction = () => {
    if (confirmConfig.onConfirm) {
      confirmConfig.onConfirm();
    }
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <>
      <CommentModal />
      <GiftSheet />

      <div id="toast" style={{ zIndex: 30000 }}></div>

      <div id="bigImageContainer" className="overlay-container" style={{ zIndex: 25000 }}>
        <div className="overlay-bg" onClick={handleCloseBigImage}></div>
        {bigImgSrc && (
          <img 
            id="bigImage" 
            src={bigImgSrc} 
            className="preview-img" 
            alt="Preview" 
            style={{ 
              transition: 'transform 0.3s ease', 
              transform: 'scale(0.9)',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
          />
        )}
      </div>

      <div 
        id="postOptionsSheet" 
        className="action-sheet-overlay" 
        style={{ zIndex: 20000 }}
        onClick={(e) => {
          if ((e.target as HTMLElement).id === "postOptionsSheet" && window.closePostOptions) window.closePostOptions();
        }}
      >
        <div className="action-sheet">
          <div className="sheet-handle"></div>
          <div className="sheet-content" id="sheetOptionsContent"></div>
          <button className="sheet-cancel" onClick={() => window.closePostOptions && window.closePostOptions()}>Batal</button>
        </div>
      </div>

      {/* 🔥 UI MODAL KONFIRMASI CUSTOM UNIVERSAL 🔥 */}
      <AnimatePresence>
        {confirmConfig.isOpen && (
          <div 
            style={{
              position: 'fixed', inset: 0, zIndex: 999999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)'
            }}
            onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()} 
              style={{
                background: 'var(--bg-secondary, #1a1d21)',
                border: '1px solid var(--border-card, #2a2d31)',
                borderRadius: '24px',
                padding: '24px',
                width: '85%',
                maxWidth: '320px',
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
              }}
            >
              {/* Ikon Dinamis (Merah kalo danger, Biru kalo info) */}
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: confirmConfig.isDanger ? 'rgba(255, 71, 87, 0.1)' : 'rgba(31, 60, 255, 0.1)', 
                color: confirmConfig.isDanger ? '#ff4757' : '#1f3cff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <span className="material-icons" style={{ fontSize: '32px' }}>
                  {confirmConfig.isDanger ? 'delete_forever' : 'help_outline'}
                </span>
              </div>
              
              <h3 style={{ color: 'var(--text-main, white)', margin: '0 0 10px 0', fontSize: '18px', fontWeight: '800' }}>
                {confirmConfig.title}
              </h3>
              <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '13.5px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
                {confirmConfig.message}
              </p>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                    background: 'var(--bg-input, #2a2d31)', color: 'var(--text-main, white)',
                    fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: '0.2s'
                  }}
                  onActive={(e: any) => e.target.style.transform = 'scale(0.95)'}
                >
                  Batal
                </button>
                <button 
                  onClick={executeConfirmAction}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                    background: confirmConfig.isDanger ? '#ff4757' : '#1f3cff', 
                    color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                    boxShadow: confirmConfig.isDanger ? '0 4px 15px rgba(255, 71, 87, 0.3)' : '0 4px 15px rgba(31, 60, 255, 0.3)',
                    transition: '0.2s'
                  }}
                  onActive={(e: any) => e.target.style.transform = 'scale(0.95)'}
                >
                  Ya, Lanjutkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
