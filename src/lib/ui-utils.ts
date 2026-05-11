// src/lib/ui-utils.ts

import { supabase } from '@/lib/supabase';

// =======================
// DYNAMIC BADGE SYSTEM
// =======================
export function getUserBadge(role: string): string {
  if (!role) return "";
  let badge = "";
  const roleLower = role.toLowerCase();

  // 🛡️ 1. ADMIN / DEV BADGE (SVG)
  if (roleLower === "admin") {
    badge += `
      <span class="admin-badge" style="
        background: linear-gradient(135deg, #1f3cff, #bc13fe); 
        color: white; padding: 2px 6px; border-radius: 6px; font-size: 10px; margin-left: 5px; 
        display: inline-flex; align-items: center; vertical-align: middle; line-height: 1; font-weight: 800; 
        box-shadow: 0 2px 5px rgba(31, 60, 255, 0.4); border: 1px solid rgba(255,255,255,0.2); letter-spacing: 0.5px;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <polyline points="8 12 10 14 16 8"></polyline>
        </svg>
        DEV
      </span>`;
  }
  
  // ✅ 2. VERIFIED BADGE (SVG - Tetap dipertahankan)
  if (roleLower === "verified") {
    badge += `<span class="verified-badge" style="margin-left:5px;"><svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle;"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }

  // 👑 3. CROWN SYSTEM (SEMUA GANTI KE SVG PREMIUM)
  
  // Style dasar buat semua mahkota agar sejajar
  const crownBaseStyle = "width:16px; height:16px; margin-left:5px; vertical-align:middle; display:inline-block;";

  // CROWN 1: BRONZE SULTAN
  if (roleLower === "crown1") {
    badge += `
      <svg style="${crownBaseStyle} color: #cd7f32; filter: drop-shadow(0 0 2px rgba(205, 127, 50, 0.6));" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
      </svg>`;
  }

  // CROWN 2: SILVER SULTAN
  if (roleLower === "crown2") {
    badge += `
      <svg style="${crownBaseStyle} color: #e2e8f0; filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.5));" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2zm0 6l-1.5 3h3L12 8z"/>
      </svg>`;
  }

  // CROWN 3: GOLD SULTAN (King)
  if (roleLower === "crown3") {
    badge += `
      <svg style="${crownBaseStyle} color: #ffd700; filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.8));" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 15l-1.39-1.39a3 3 0 0 0-4.22 0L12 15l-1.39-1.39a3 3 0 0 0-4.22 0L5 15V6l3.5 3L12 2l3.5 7L19 6v9zm1 3H4v2h16v-2z"/>
        <circle cx="12" cy="11" r="1.5" fill="#fff" />
      </svg>`;
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
  
  // 🔥 FIX TypeScript: Casting ke HTMLElement biar onclick diizinkan 🔥
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
