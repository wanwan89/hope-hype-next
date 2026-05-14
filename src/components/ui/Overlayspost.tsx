'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion'; // 🔥 IMPORT ANIMASI

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
  }
}

export default function Overlayspost() {
  const [bigImgSrc, setBigImgSrc] = useState<string | null>(null);

  // 🔥 STATE BARU BUAT MODAL HAPUS KARYA 🔥
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    // --- 1. SENSOR SINYAL BUKA MODAL POST (DIBIARKAN KOSONG DEMI KEAMANAN) ---
    const handleOpenPost = () => {
      console.log("Sinyal Open Post diterima! Arahkan ke /create lewat router di tempat lain.");
    };
    window.addEventListener('openPostModal', handleOpenPost);

    // --- 2. TOAST NOTIFIKASI (GLOBAL UTILS) ---
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

    // 🔥 FIX: BUKA MODAL CUSTOM KITA, JANGAN PAKE WINDOW.CONFIRM LAGI 🔥
    window.confirmDeletePost = (postId: string) => {
      if (window.closePostOptions) window.closePostOptions();
      setDeleteTargetId(postId);
      setIsDeleteModalOpen(true);
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

  // 🔥 FUNGSI EKSEKUSI HAPUS KE SUPABASE 🔥
  const executeDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const { error } = await supabase.from("posts").delete().eq("id", deleteTargetId);
      if (error) throw error;
      
      if (window.showNotif) window.showNotif("Berhasil dihapus!", "success");
      
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
      
      setTimeout(() => location.reload(), 1000);
    } catch (err: any) {
      if (window.showNotif) window.showNotif(err.message, "error");
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
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

      {/* 🔥 UI MODAL HAPUS PERMANEN (CUSTOM) 🔥 */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div 
            style={{
              position: 'fixed', inset: 0, zIndex: 999999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)'
            }}
            onClick={() => setIsDeleteModalOpen(false)} 
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()} 
              style={{
                background: 'var(--tg-bg, #1a1d21)',
                border: '1px solid var(--tg-border, #2a2d31)',
                borderRadius: '20px',
                padding: '24px',
                width: '90%',
                maxWidth: '320px',
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
              }}
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <span className="material-icons" style={{ fontSize: '28px' }}>delete_forever</span>
              </div>
              
              <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
                Hapus Permanen?
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
                Karya ini bakal hilang selamanya dari profil lu dan gak bisa dibalikin lagi.
              </p>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                    background: 'var(--tg-bg-secondary, #2a2d31)', color: 'white',
                    fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button 
                  onClick={executeDelete}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                    background: '#ff4757', color: 'white',
                    fontWeight: '600', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(255, 71, 87, 0.3)'
                  }}
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
