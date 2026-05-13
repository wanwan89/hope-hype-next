'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

    window.confirmDeletePost = async (postId: string) => {
      if (window.closePostOptions) window.closePostOptions();
      if (!confirm("Hapus permanen?")) return;
      try {
        const { error } = await supabase.from("posts").delete().eq("id", postId);
        if (error) throw error;
        if (window.showNotif) window.showNotif("Berhasil dihapus!", "success");
        setTimeout(() => location.reload(), 1000);
      } catch (err: any) {
        if (window.showNotif) window.showNotif(err.message, "error");
      }
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
    </>
  );
}
