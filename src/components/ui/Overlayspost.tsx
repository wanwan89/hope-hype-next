'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
// FIX 1: Pastikan lo import PostModal-nya di sini!
// Sesuaikan path-nya kalau folder lo beda (misal: @/components/post/PostModal)
import PostModal from '../post/PostModalpost'; 
import './Overlays.css';

export default function Overlayspost() {
  const [bigImgSrc, setBigImgSrc] = useState<string | null>(null);
  
  // FIX 2: State untuk kontrol buka/tutup Modal Post
  const [isPostOpen, setIsPostOpen] = useState(false);

  useEffect(() => {
    // --- FIX 3: SENSOR UNTUK MODAL POST ---
    const handleOpenPost = () => {
      console.log("Sinyal Open Post diterima di Overlays!");
      setIsPostOpen(true);
    };

    window.addEventListener('openPostModal', handleOpenPost);

    // --- 1. TOAST NOTIFIKASI ---
    (window as any).showNotif = (msg: string, type: string = "info") => {
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

    // --- 2. ZOOM IMAGE ---
    (window as any).openBigImage = (src: string) => {
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

    // --- 3. ANIMASI GIFT ---
    (window as any).showBigImage = (imagePath: string) => {
      const container = document.getElementById("giftAnimationContainer");
      if (container) {
        container.innerHTML = `<img src="${imagePath}" class="gift-main-img">`;
        setTimeout(() => { container.innerHTML = ""; }, 2000);
      }
    };

    // --- 4. ACTION SHEET ---
    (window as any).openPostOptions = (postId: string, isOwner: boolean, creatorId: string) => {
      const sheet = document.getElementById('postOptionsSheet');
      const content = document.getElementById('sheetOptionsContent');
      if (!sheet || !content) return;

      content.innerHTML = `
        <button class="sheet-btn" id="shareBtn">Bagikan Karya</button>
        <button class="sheet-btn" id="profileBtn">Lihat Profil</button>
        ${isOwner ? `<button class="sheet-btn danger" id="deleteBtn">Hapus Karya</button>` : `<button class="sheet-btn" id="reportBtn">Laporkan</button>`}
      `;

      content.querySelector('#shareBtn')?.addEventListener('click', () => (window as any).sharePost(postId));
      content.querySelector('#profileBtn')?.addEventListener('click', () => window.location.href = `/profile?id=${creatorId}`);
      content.querySelector('#deleteBtn')?.addEventListener('click', () => (window as any).confirmDeletePost(postId));
      content.querySelector('#reportBtn')?.addEventListener('click', () => {
        (window as any).showNotif('Karya telah dilaporkan.', 'info');
        (window as any).closePostOptions();
      });

      sheet.classList.add('active');
    };

    (window as any).closePostOptions = () => {
      document.getElementById('postOptionsSheet')?.classList.remove('active');
    };

    (window as any).sharePost = (postId: string) => {
      const url = window.location.origin + '/post?id=' + postId;
      if (navigator.share) {
        navigator.share({ title: 'Hope Hype', text: 'Cek karya ini!', url });
      } else {
        navigator.clipboard.writeText(url);
        (window as any).showNotif('Link disalin!', 'success');
      }
      (window as any).closePostOptions();
    };

    (window as any).confirmDeletePost = async (postId: string) => {
      (window as any).closePostOptions();
      if (!confirm("Hapus permanen?")) return;
      try {
        const { error } = await supabase.from("posts").delete().eq("id", postId);
        if (error) throw error;
        (window as any).showNotif("Berhasil dihapus!", "success");
        setTimeout(() => location.reload(), 1000);
      } catch (err: any) {
        (window as any).showNotif(err.message, "error");
      }
    };

    // Clean up listener
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
      {/* FIX 4: RENDER MODAL POST DI SINI */}
      {isPostOpen && (
        <PostModal onClose={() => setIsPostOpen(false)} />
      )}

      {/* Container untuk notifikasi melayang */}
      <div id="toast" style={{ zIndex: 30000 }}></div>

      {/* Container Zoom Foto */}
      <div id="bigImageContainer" className="overlay-container" style={{ zIndex: 25000 }}>
        <div className="overlay-bg" onClick={handleCloseBigImage}></div>
        {bigImgSrc && (
          <img 
            id="bigImage" 
            src={bigImgSrc} 
            className="preview-img" 
            alt="Preview" 
            style={{ transition: 'transform 0.3s ease', transform: 'scale(0.9)' }}
          />
        )}
      </div>

      {/* Animasi Kado/Gift */}
      <div id="giftAnimationContainer" style={{ zIndex: 26000 }}></div>

      {/* Action Sheet */}
      <div 
        id="postOptionsSheet" 
        className="action-sheet-overlay" 
        style={{ zIndex: 20000 }}
        onClick={(e) => {
          if ((e.target as HTMLElement).id === "postOptionsSheet") (window as any).closePostOptions();
        }}
      >
        <div className="action-sheet">
          <div className="sheet-handle"></div>
          <div className="sheet-content" id="sheetOptionsContent"></div>
          <button className="sheet-cancel" onClick={() => (window as any).closePostOptions()}>Batal</button>
        </div>
      </div>
    </>
  );
}
