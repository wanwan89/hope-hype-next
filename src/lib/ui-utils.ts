// src/lib/ui-utils.ts

import { supabase } from '@/lib/supabase';

// =======================
// DYNAMIC BADGE SYSTEM
// =======================
export function getUserBadge(role: string): string {
  if (!role) return "";
  let badge = "";
  const roleLower = role.toLowerCase();

  if (roleLower === "admin") {
    badge += `
      <style>
        @keyframes drawLeftToRight {
          0%   { stroke-dashoffset: 1; opacity: 0; }
          15%  { opacity: 1; }
          50%  { stroke-dashoffset: 0; opacity: 1; }
          70%  { opacity: 0; }
          100% { stroke-dashoffset: 1; opacity: 0; }
        }

        .admin-badge-container {
          background: linear-gradient(135deg, #1f3cff, #bc13fe);
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          margin-left: 5px;
          display: inline-flex;
          align-items: center;
          vertical-align: middle;
          font-weight: 500;
          box-shadow: none;
          border: none;
        }

        .scribble-path-admin {
          stroke: white;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: drawLeftToRight 2.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
      </style>

      <span class="admin-badge-container">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        
        <svg width="26" height="12" viewBox="0 0 60 20" style="overflow: visible;">
          <path class="scribble-path-admin" d="M10 4v12 M10 4c10 0 12 4 12 6s-2 6-12 6" pathLength="1" />
          <path class="scribble-path-admin" d="M28 4v12 M28 4h8 M28 10h6 M28 16h8" pathLength="1" />
          <path class="scribble-path-admin" d="M45 4l5 12 5-12" pathLength="1" />
        </svg>
      </span>`;
  }

  if (roleLower === "verified") {
    badge += `<span class="verified-badge" style="margin-left:5px;"><svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle;"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }

  // -- CROWN BADGES (tanpa teks animasi, ukuran 14px) --
  if (roleLower === "crown1" || roleLower === "crown2" || roleLower === "crown3") {
    let fillColor = "";
    if (roleLower === "crown1") {
      fillColor = "#EF4444";  // merah
    } else if (roleLower === "crown2") {
      fillColor = "#EAB308";  // kuning
    } else {
      fillColor = "#3B82F6";  // biru
    }

    badge += `
      <span style="display:inline-flex; align-items:center; margin-left:5px; vertical-align:middle; width:14px; height:14px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fillColor}" width="14" height="14">
          <g fill="${fillColor}">
            <path d="m14.092 10.75l-.75 2.5H9.908l.75-2.5h3.434Z"/>
            <path fill-rule="evenodd" d="M3.464 3.464C2 4.93 2 7.286 2 12c0 4.714 0 7.071 1.464 8.535C4.93 22 7.286 22 12 22c4.714 0 7.071 0 8.535-1.465C22 19.072 22 16.714 22 12s0-7.071-1.465-8.536C19.072 2 16.714 2 12 2S4.929 2 3.464 3.464Zm7.752 2.818a.75.75 0 0 1 .502.934l-.61 2.034h3.434l.74-2.465a.75.75 0 0 1 1.436.43l-.61 2.035H18a.75.75 0 0 1 0 1.5h-2.342l-.75 2.5H17a.75.75 0 0 1 0 1.5h-2.542l-.74 2.465a.75.75 0 0 1-1.436-.43l.61-2.035H9.458l-.74 2.465a.75.75 0 1 1-1.436-.43l.61-2.035H6a.75.75 0 0 1 0-1.5h2.342l.75-2.5H7a.75.75 0 0 1 0-1.5h2.542l.74-2.465a.75.75 0 0 1 .934-.503Z" clip-rule="evenodd"/>
          </g>
        </svg>
      </span>`;
  }

  return badge;
}

// =======================
// AUTH PROTECTOR
// =======================
export const requireLogin = (currentUser: any) => {
  if (!currentUser) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openLoginPopup'));
    }
    return false;
  }
  return true;
};

// =======================
// TOAST & NOTIFICATION
// =======================
let toastTimer: NodeJS.Timeout;

export function hideToast() {
  if (typeof window === 'undefined') return;
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.classList.remove("show");
}

export function showToast(title: string, message: string = "", type: "info" | "success" | "warning" | "error" = "info") {
  if (typeof window === 'undefined') return;

  // 1. Injeksi Style untuk desain Slide Down & Fit Content
  if (!document.getElementById("toast-dynamic-styles")) {
    const style = document.createElement("style");
    style.id = "toast-dynamic-styles";
    style.innerHTML = `
      #toast {
        position: fixed;
        top: 30px; /* Posisi di atas */
        left: 50%;
        transform: translate(-50%, -40px); /* Mulai agak ke atas untuk animasi slide down */
        opacity: 0;
        visibility: hidden;
        z-index: 9999999;
        
        /* Box menyesuaikan konten */
        width: max-content;
        max-width: 90vw;
        
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease, visibility 0.3s ease;
        
        /* Desain Glass Hitam / Gelap */
        background: rgba(25, 25, 25, 0.95);
        color: #ffffff;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      }
      
      #toast.show {
        transform: translate(-50%, 0); /* Meluncur turun ke posisi aslinya */
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      /* Dark mode override */
      @media (prefers-color-scheme: dark) {
        #toast {
          background: rgba(255, 255, 255, 0.95);
          color: #111111;
          border-color: rgba(0, 0, 0, 0.1);
        }
      }

      /* Style bawaan class yang digenerate script ini */
      .toast-icon-wrap {
        display: flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; border-radius: 50%; font-weight: bold; font-size: 12px; color: white; flex-shrink: 0;
      }
      .toast-icon-wrap.success { background: #10B981; }
      .toast-icon-wrap.error { background: #EF4444; }
      .toast-icon-wrap.warning { background: #F59E0B; }
      .toast-icon-wrap.info { background: #3B82F6; }

      .toast-content {
        display: flex; flex-direction: column; text-align: left;
      }
      .toast-title { font-weight: 600; font-size: 14px; line-height: 1.2; }
      .toast-subtitle { font-size: 12px; opacity: 0.8; margin-top: 4px; line-height: 1.3; }
      
      .toast-close {
        margin-left: 8px; font-size: 16px; opacity: 0.6; transition: opacity 0.2s; padding: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .toast-close:hover { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  
  clearTimeout(toastTimer);
  toast.classList.remove("show"); // Reset biar bisa dianimasikan ulang jika diklik cepat
  toast.className = "toast-card " + type; // Set class sesuai parameter
  
  const getIcon = (t: string) => {
    switch (t) { 
      case "success": return "✓"; 
      case "warning": return "⚠"; 
      case "error": return "✕"; 
      default: return "i"; 
    }
  };

  toast.innerHTML = `
    <div class="toast-icon-wrap ${type}"><div class="toast-icon">${getIcon(type)}</div></div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-subtitle">${message}</div>` : ""}
    </div>
    <button class="toast-close" style="background:transparent;border:none;color:inherit;cursor:pointer;">✕</button>
  `;
  
  // Double rAF untuk memancing browser me-restart animasi CSS Transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast!.classList.add("show");
    });
  });
  
  const closeBtn = toast.querySelector(".toast-close") as HTMLElement;
  if (closeBtn) closeBtn.onclick = () => hideToast();
  
  toastTimer = setTimeout(() => hideToast(), 3200);
}

export const showNotif = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  showToast(type === 'error' ? 'Gagal' : type === 'success' ? 'Berhasil' : 'Info', msg, type);
};

// =======================
// IMAGE UTILS (CROPPING)
// =======================
export const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
  const image = new Image();
  image.src = imageSrc;
  image.setAttribute('crossOrigin', 'anonymous'); 
  
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Gagal membuat context canvas");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Canvas kosong")); return; }
      resolve(blob);
    }, 'image/jpeg', 0.95); 
  });
};

// =======================
// OTHERS
// =======================
export function loadMidtrans() {
  if (typeof window === 'undefined' || (window as any).snap) return;
  const script = document.createElement("script");
  script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
  script.setAttribute("data-client-key", "SB-Mid-client-G2wOVrrTwcffYhkC");
  script.async = true;
  document.head.appendChild(script);
}

export function createParticles(x: number, y: number) {
  if (typeof window === 'undefined') return;
  const colors = ["#f09f33", "#00d2ff", "#4ade80", "#ff758c", "#ffffff"];
  for (let i = 0; i < 10; i++) {
    const p = document.createElement("div");
    p.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:6px;height:6px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:50%;z-index:999999;pointer-events:none;`;
    document.body.appendChild(p);
    const destX = (Math.random() - 0.5) * 200;
    const destY = (Math.random() - 0.5) * 200;
    p.animate([
      { transform: 'translate(0,0)', opacity: 1 },
      { transform: `translate(${destX}px,${destY}px)`, opacity: 0 }
    ], { duration: 1000, easing: 'cubic-bezier(0,1,1,1)' }).onfinish = () => p.remove();
  }
}
