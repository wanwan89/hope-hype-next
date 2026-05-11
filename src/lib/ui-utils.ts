// =======================
// DYNAMIC BADGE SYSTEM
// =======================
// =======================
// DYNAMIC BADGE SYSTEM
// =======================
export function getUserBadge(role: string): string {
  if (!role) return "";
  let badge = "";
  const roleLower = role.toLowerCase();

  // 🔥 FIX: BADGE DEVELOPER PAKAI SVG PREMIUM 🔥
  if (roleLower === "admin") {
    badge += `
      <span class="admin-badge" style="
        background: linear-gradient(135deg, #1f3cff, #bc13fe); 
        color: white; 
        padding: 2px 6px; 
        border-radius: 6px; 
        font-size: 10px; 
        margin-left: 5px; 
        display: inline-flex; 
        align-items: center; 
        vertical-align: middle; 
        line-height: 1; 
        font-weight: 800; 
        box-shadow: 0 2px 5px rgba(31, 60, 255, 0.4);
        border: 1px solid rgba(255,255,255,0.2);
        letter-spacing: 0.5px;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <polyline points="8 12 10 14 16 8"></polyline>
        </svg>
        DEV
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
// AUTH PROTECTOR (FIX)
// =======================
// Fungsi ini yang tadi bikin build Vercel gagal karena belum ada
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
// TOAST MODERN
// =======================
let toastTimer: NodeJS.Timeout;

function getToastIcon(type: string): string {
  switch (type) { 
    case "success": return "✓"; 
    case "warning": return "⚠"; 
    case "error": return "✕"; 
    default: return "i"; 
  }
}

export function hideToast() {
  if (typeof window === 'undefined') return;

  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.classList.remove("show");
  setTimeout(() => { 
    if (toast) {
        toast.className = ""; 
        toast.innerHTML = ""; 
    }
  }, 260);
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
  toast.className = "";
  
  // 🔥 FIX: Tombol close sekarang bersih dari outline/border bawaan browser
  toast.innerHTML = `
    <div class="toast-icon-wrap ${type}"><div class="toast-icon">${getToastIcon(type)}</div></div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-subtitle">${message}</div>` : ""}
    </div>
    <button class="toast-close" aria-label="Close" style="background: transparent; border: none; outline: none; box-shadow: none; cursor: pointer; padding: 5px; -webkit-tap-highlight-color: transparent;">✕</button>
  `;
  
  toast.classList.add("toast-card", type);
  
  requestAnimationFrame(() => toast!.classList.add("show"));
  
  const closeBtn = toast.querySelector(".toast-close") as HTMLButtonElement;
  if (closeBtn) closeBtn.onclick = () => hideToast();
  
  toastTimer = setTimeout(() => hideToast(), 3200);
}

export const showNotif = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  showToast(type === 'error' ? 'Gagal' : type === 'success' ? 'Berhasil' : 'Info', msg, type);
};

// =======================
// MIDTRANS INIT
// =======================
let isMidtransLoading = false;
export function loadMidtrans() {
  if (typeof window === 'undefined') return;
  if ((window as any).snap || isMidtransLoading) return;
  
  isMidtransLoading = true;
  const script = document.createElement("script");
  script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
  script.setAttribute("data-client-key", "SB-Mid-client-G2wOVrrTwcffYhkC");
  script.async = true;
  script.onload = () => { isMidtransLoading = false; };
  script.onerror = () => { isMidtransLoading = false; };
  document.head.appendChild(script);
}

// ==========================================
// PARTICLES
// ==========================================
export function createParticles(x: number, y: number) {
  if (typeof window === 'undefined') return;

  const colors = ["#f09f33", "#00d2ff", "#4ade80", "#ff758c", "#ffffff"];
  for (let i = 0; i < 15; i++) {
    const p = document.createElement("div"); 
    p.className = "particle";
    
    const size = Math.random() * 8 + 4;
    p.style.width = `${size}px`; 
    p.style.height = `${size}px`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = `${x}px`; 
    p.style.top = `${y}px`;
    p.style.position = "fixed"; 
    p.style.pointerEvents = "none"; 
    p.style.borderRadius = "50%"; 
    p.style.zIndex = "100000"; 
    
    document.body.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 100 + 50;
    const destinationX = Math.cos(angle) * velocity; 
    const destinationY = Math.sin(angle) * velocity;

    p.animate([ 
      { transform: "translate(0, 0) scale(1)", opacity: 1 }, 
      { transform: `translate(${destinationX}px, ${destinationY}px) scale(0)`, opacity: 0 } 
    ], { 
      duration: 600 + Math.random() * 400, 
      easing: "cubic-bezier(0, .9, .57, 1)", 
      fill: "forwards" 
    });
    
    setTimeout(() => p.remove(), 1000);
  }
}
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

  if (!ctx) {
    throw new Error("Gagal membuat context canvas");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas kosong"));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.95); 
  });
};
