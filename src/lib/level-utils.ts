// 1. Fungsi Ngitung Level (Maksimal 50, per kelipatan 200 exp)
export function calculateLevel(giftSent: number) {
  let exp = giftSent || 0;
  let level = 1;
  let expNeeded = 200;
  
  while (exp >= expNeeded) {
    exp -= expNeeded;
    level++;
    expNeeded = level * 200;
  }
  
  return level > 50 ? 50 : level;
}

// 2. Fungsi Ambil Ikon & Warna Berdasarkan Tingkat (Tier) Level
export function getTierInfo(level: number) {
  if (level >= 40) {
    return {
      color: "#ff0055", // Merah Crimson / Pink Tua
      icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M2 19h20v2H2v-2zm.82-10.74l3.05 6.1H18.1l3.08-6.1-4.94 2.82L12 3l-4.24 8.08-4.94-2.82zM12 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>`
    };
  }
  if (level >= 30) {
    return {
      color: "#9d00ff", // Ungu
      icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5L2.5 8 12 22l9.5-14L12 1.5zm0 3.1l5.5 4.4H6.5L12 4.6zM4.6 9h4.8l2.6 9.8L4.6 9zm10 0h4.8l-7.4 9.8L14.6 9z"/></svg>`
    };
  }
  if (level >= 20) {
    return {
      color: "#ffaa00", // Orange Emas
      icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8.66 15H3.34L12 2zm0 3.5L6.3 14h11.4L12 5.5zM12 9l2.89 5H9.11L12 9z"/></svg>`
    };
  }
  if (level >= 10) {
    return {
      color: "#00e676", // Hijau Neon
      icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.5l5 2.5v4.5c0 4-2.5 8-5 9.5-2.5-1.5-5-5.5-5-9.5V6l5-2.5z"/></svg>`
    };
  }
  return {
    color: "#00bfff", // Biru Muda / Cyan
    icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.5 8.5L23 11.5l-8.5 2.5L12 23l-2.5-8.5L1 11.5l8.5-2.5L12 0z"/></svg>`
  };
}

// 3. FUNGSI BADGE LEVEL LENGKAP (BOX BIRU PERSEGI, SVG DI DALAM TAPI KELUAR)
export function getLevelBadgeHTML(levelVal: string | number) {
  const lvl = typeof levelVal === 'string' ? parseInt(levelVal) : (levelVal || 1);
  
  // Tentukan warna HANYA untuk SVG berdasarkan level
  let fillColor: string;
  if (lvl >= 40) fillColor = '#ff0055'; 
  else if (lvl >= 30) fillColor = '#9d00ff'; 
  else if (lvl >= 20) fillColor = '#ffaa00'; 
  else if (lvl >= 10) fillColor = '#00e676'; 
  else fillColor = '#00bfff'; 

  return `
    <span style="
      position: relative;
      display: inline-flex;
      align-items: center;
      background: #1d4ed8; /* Box warna biru */
      border: 1px solid rgba(255, 255, 255, 0.2); 
      border-radius: 2px; /* Bentuk persegi (sudut hampir lancip) */
      padding: 0 6px 0 2px; 
      height: 14px; /* Tinggi box dibuat kecil agar SVG bisa tumpah keluar */
      margin-top: 4px; /* Memberi ruang di atas agar efek SVG tidak terpotong */
      margin-bottom: 4px; /* Memberi ruang di bawah */
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      font-family: sans-serif;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 48 48"
        style="
          margin-top: -8px; /* Menarik SVG tumpah ke atas */
          margin-bottom: -8px; /* Menarik SVG tumpah ke bawah */
          margin-left: -2px; /* Sedikit keluar di area kiri */
          margin-right: 4px; /* Jarak antara ikon dan angka */
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4));
          z-index: 2;
        "
      >
        <path fill="${fillColor}" stroke="#ffffff" stroke-linejoin="round" stroke-width="2" d="M24 44C32.2347 44 38.9998 37.4742 38.9998 29.0981C38.9998 27.0418 38.8953 24.8375 37.7555 21.4116C36.6157 17.9858 36.3861 17.5436 35.1809 15.4279C34.666 19.7454 31.911 21.5448 31.2111 22.0826C31.2111 21.5231 29.5445 15.3359 27.0176 11.6339C24.537 8 21.1634 5.61592 19.1853 4C19.1853 7.06977 18.3219 11.6339 17.0854 13.9594C15.8489 16.2849 15.6167 16.3696 14.0722 18.1002C12.5278 19.8308 11.8189 20.3653 10.5274 22.4651C9.23596 24.565 9 27.3618 9 29.4181C9 37.7942 15.7653 44 24 44Z"/>
      </svg>
      
      <span style="
        font-size: 10px; /* Angka lebih kecil */
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.5px;
        line-height: 1;
        z-index: 1;
      ">
        ${lvl}
      </span>
    </span>
  `;
}
