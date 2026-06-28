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
      color: "#ff0844",
      icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M2 19h20v2H2v-2zm.82-10.74l3.05 6.1H18.1l3.08-6.1-4.94 2.82L12 3l-4.24 8.08-4.94-2.82zM12 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>`
    };
  }
  if (level >= 30) {
    return {
      color: "#00f2fe",
      icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5L2.5 8 12 22l9.5-14L12 1.5zm0 3.1l5.5 4.4H6.5L12 4.6zM4.6 9h4.8l2.6 9.8L4.6 9zm10 0h4.8l-7.4 9.8L14.6 9z"/></svg>`
    };
  }
  if (level >= 20) {
    return {
      color: "#f59e0b",
      icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8.66 15H3.34L12 2zm0 3.5L6.3 14h11.4L12 5.5zM12 9l2.89 5H9.11L12 9z"/></svg>`
    };
  }
  if (level >= 10) {
    return {
      color: "#e2e8f0",
      icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.5l5 2.5v4.5c0 4-2.5 8-5 9.5-2.5-1.5-5-5.5-5-9.5V6l5-2.5z"/></svg>`
    };
  }
  return {
    color: "#93c5fd",
    icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.5 8.5L23 11.5l-8.5 2.5L12 23l-2.5-8.5L1 11.5l8.5-2.5L12 0z"/></svg>`
  };
}

// 3. FUNGSI BARU: Badge Level pakai SVG HATI dengan warna berbeda per tier
export function getLevelBadgeHTML(levelVal: string | number) {
  const lvl = typeof levelVal === 'string' ? parseInt(levelVal) : (levelVal || 1);
  
  // Tentukan warna hati berdasarkan level
  let fillColor: string;
  if (lvl >= 40) fillColor = '#ff0844';        // Merah ruby
  else if (lvl >= 30) fillColor = '#00f2fe';   // Cyan
  else if (lvl >= 20) fillColor = '#f59e0b';   // Amber emas
  else if (lvl >= 10) fillColor = '#e2e8f0';   // Silver
  else fillColor = '#93c5fd';                  // Biru muda

  // SVG hati tanpa bayangan, siap digunakan
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
      <path fill="${fillColor}" stroke="#000" stroke-linejoin="round" stroke-width="4" d="M24 44C32.2347 44 38.9998 37.4742 38.9998 29.0981C38.9998 27.0418 38.8953 24.8375 37.7555 21.4116C36.6157 17.9858 36.3861 17.5436 35.1809 15.4279C34.666 19.7454 31.911 21.5448 31.2111 22.0826C31.2111 21.5231 29.5445 15.3359 27.0176 11.6339C24.537 8 21.1634 5.61592 19.1853 4C19.1853 7.06977 18.3219 11.6339 17.0854 13.9594C15.8489 16.2849 15.6167 16.3696 14.0722 18.1002C12.5278 19.8308 11.8189 20.3653 10.5274 22.4651C9.23596 24.565 9 27.3618 9 29.4181C9 37.7942 15.7653 44 24 44Z"/>
    </svg>
  `;
}