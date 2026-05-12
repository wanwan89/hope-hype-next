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
        /* Animasi Menggambar Garis */
        @keyframes drawAdminPath {
          0% { stroke-dashoffset: 100; opacity: 0; }
          10% { opacity: 1; }
          100% { stroke-dashoffset: 0; }
        }

        /* Animasi Munculnya Warna Isi (Fill) */
        @keyframes fillAdminText {
          0% { fill: rgba(255, 255, 255, 0); }
          100% { fill: rgba(255, 255, 255, 1); }
        }

        /* Efek Berdenyut / Glowing Premium */
        @keyframes adminGlowPulse {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(255,255,255,0.4)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 8px rgba(255,255,255,0.8)); transform: scale(1.02); }
        }

        .admin-badge-container {
          background: linear-gradient(135deg, #1f3cff, #bc13fe);
          color: white;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 10px;
          margin-left: 5px;
          display: inline-flex;
          align-items: center;
          vertical-align: middle;
          font-weight: 900;
          box-shadow: 0 4px 12px rgba(31, 60, 255, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.2);
          animation: adminGlowPulse 3s infinite ease-in-out;
        }

        .scribble-path-admin {
          stroke: white;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: 
            drawAdminPath 1.5s cubic-bezier(0.45, 0, 0.55, 1) forwards,
            fillAdminText 0.8s ease-in forwards 1.8s;
        }
      </style>

      <span class="admin-badge-container">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <polyline points="8 12 10 14 16 8"></polyline>
        </svg>
        
        <svg width="30" height="12" viewBox="0 0 60 20" style="overflow: visible;">
          <path class="scribble-path-admin" d="M10 4v12 M10 4c10 0 12 4 12 6s-2 6-12 6" style="animation-delay: 0.2s;" />
          <path class="scribble-path-admin" d="M28 4v12 M28 4h10 M28 10h8 M28 16h10" style="animation-delay: 0.7s;" />
          <path class="scribble-path-admin" d="M45 4l5 12 5-12" style="animation-delay: 1.2s;" />
        </svg>
      </span>`;
  }

  if (roleLower === "verified") {
    badge += `<span class="verified-badge" style="margin-left:5px;"><svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle;"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }
  
  const crowBadges: Record<string, string> = { 
    crown1: "/asets/png/crown1.png", 
    crown2: "/asets/png/crown2.png", 
    crown3: "/asets/png/crown3.png" 
  };
  
  if (crowBadges[roleLower]) {
    badge += `<img src="${crowBadges[roleLower]}" style="width:18px;height:18px;margin-left:5px;vertical-align:middle;object-fit:contain;display:inline-block;" alt="${role}">`;
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

  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  
  clearTimeout(toastTimer);
  toast.className = "toast-card " + type;
  
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
  
  requestAnimationFrame(() => toast!.classList.add("show"));
  
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
