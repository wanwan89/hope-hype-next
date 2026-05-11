// src/lib/level-utils.ts

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
  // TIER MAX (Level 40 - 50) - Mahkota Ruby
  if (level >= 40) {
    return {
      color: "#ff4757", // Merah Ruby
      icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`
    };
  }
  // TIER 4 (Level 30 - 39) - Berlian
  if (level >= 30) {
    return {
      color: "#00f2fe", // Diamond Cyan
      icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 9l10 13 10-13L12 2zm0 3.3l6.5 4.7-6.5 8.3-6.5-8.3L12 5.3z"/></svg>`
    };
  }
  // TIER 3 (Level 20 - 29) - Api Gold
  if (level >= 20) {
    return {
      color: "#f59e0b", // Emas/Gold
      icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c0 0-4 4.5-4 9.5a4 4 0 0 0 8 0C16 6.5 12 2 12 2zm1 12.5a2.5 2.5 0 0 1-5 0c0-2 2-4.5 2-4.5s2 2.5 2 4.5z"/></svg>`
    };
  }
  // TIER 2 (Level 10 - 19) - Perisai Silver
  if (level >= 10) {
    return {
      color: "#e2e8f0", // Perak/Silver
      icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>`
    };
  }
  // TIER 1 (Level 1 - 9) - Bintang Default
  return {
    color: "#93c5fd", // Biru Muda/Bronze
    icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
  };
}

// 3. Fungsi Bikin HTML Badge Level Premium (Box Biru HypeTalk)
export function getLevelBadgeHTML(levelVal: string | number) {
  const lvl = typeof levelVal === 'string' ? parseInt(levelVal) : (levelVal || 1);
  const tier = getTierInfo(lvl);
  
  return `
    <span style="
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      gap: 4px;
      background: linear-gradient(135deg, #1e3a8a, #1f3cff); /* Box Gradasi Biru */
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff !important; 
      font-size: 10px; 
      font-weight: 800; 
      padding: 3px 8px; 
      border-radius: 6px; /* Dibikin agak kotak (rounded-box) */
      margin-left: 4px;
      box-shadow: 0 3px 8px rgba(31, 60, 255, 0.5);
      vertical-align: middle;
      line-height: 1;
    ">
      <span style="
        color: ${tier.color}; 
        display: flex; 
        align-items: center; 
        filter: drop-shadow(0 0 4px ${tier.color}); /* Ikonnya menyala sesuai tier */
      ">
        ${tier.icon}
      </span>
      Lv.${lvl}
    </span>
  `;
}
