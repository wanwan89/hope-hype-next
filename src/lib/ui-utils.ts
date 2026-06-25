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
    // Tentukan warna mahkota
    let fillColor = "";
    if (roleLower === "crown1") {
      fillColor = "#EF4444";  // merah
    } else if (roleLower === "crown2") {
      fillColor = "#EAB308";  // kuning
    } else {
      fillColor = "#3B82F6";  // biru
    }

    // Ikon mahkota statis, ukuran 14x14
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

  let toast = document.getElementById("toast");
  
  // Buat elemen toast dan style-nya jika belum ada
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    
    const style = document.createElement("style");
    style.innerHTML = `
      #toast {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translate(-50%, 20px);
        opacity: 0;
        visibility: hidden;
        z-index: 999999;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        text-align: center;
        max-width: 90vw;
        width: max-content;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        
        /* Light Mode: Glass Hitam */
        background: rgba(20, 20, 20, 0.75);
        color: #ffffff;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      }
      
      #toast.show {
        transform: translate(-50%, 0);
        opacity: 1;
        visibility: visible;
      }

      /* Dark Mode: Glass Putih */
      @media (prefers-color-scheme: dark) {
        #toast {
          background: rgba(255, 255, 255, 0.8);
          color: #111111;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }
      }
      
      /* Dukungan untuk framework dengan class .dark (seperti Tailwind) */
      .dark #toast {
        background: rgba(255, 255, 255, 0.8);
        color: #111111;
        border: 1px solid rgba(0, 0, 0, 0.05);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);
  }
  
  clearTimeout(toastTimer);
  
  // Tampilkan hanya teks, gabungkan title dan message jika keduanya ada
  toast.textContent = message ? `${title} - ${message}` : title;
  
  // Animasi masuk
  requestAnimationFrame(() => toast!.classList.add("show"));
  
  // Animasi keluar otomatis
  toastTimer = setTimeout(() => hideToast(), 3000);
}

export const showNotif = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  // Karena desain minimalis, kita hilangkan icon type dan fokus pada pesan
  let prefix = "";
  if (type === 'error') prefix = "Gagal";
  else if (type === 'success') prefix = "Berhasil";
  else if (type === 'warning') prefix = "Peringatan";
  
  // Jika ada prefix, pisahkan dengan isi pesan. Jika tidak, jadikan pesan sebagai title langsung.
  if (prefix) {
    showToast(prefix, msg);
  } else {
    showToast(msg);
  }
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