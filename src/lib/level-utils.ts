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
  // TIER MAX (Level 40 - 50) - EMPEROR CROWN (Ruby)
  if (level >= 40) {
    return {
      color: "#ff0844", 
      icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M2 19h20v2H2v-2zm.82-10.74l3.05 6.1H18.1l3.08-6.1-4.94 2.82L12 3l-4.24 8.08-4.94-2.82zM12 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>`
    };
  }
  // TIER 4 (Level 30 - 39) - 3D FACETED DIAMOND (Cyan)
  if (level >= 30) {
    return {
      color: "#00f2fe", 
      icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5L2.5 8 12 22l9.5-14L12 1.5zm0 3.1l5.5 4.4H6.5L12 4.6zM4.6 9h4.8l2.6 9.8L4.6 9zm10 0h4.8l-7.4 9.8L14.6 9z"/></svg>`
    };
  }
  // TIER 3 (Level 20 - 29) - ENERGY CORE (Gold)
  if (level >= 20) {
    return {
      color: "#f59e0b", 
      icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8.66 15H3.34L12 2zm0 3.5L6.3 14h11.4L12 5.5zM12 9l2.89 5H9.11L12 9z"/></svg>`
    };
  }
  // TIER 2 (Level 10 - 19) - SCI-FI CREST (Silver)
  if (level >= 10) {
    return {
      color: "#e2e8f0", 
      icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.5l5 2.5v4.5c0 4-2.5 8-5 9.5-2.5-1.5-5-5.5-5-9.5V6l5-2.5z"/></svg>`
    };
  }
  // TIER 1 (Level 1 - 9) - STAR SPARK (Bronze/Blue)
  return {
    color: "#93c5fd", 
    icon: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.5 8.5L23 11.5l-8.5 2.5L12 23l-2.5-8.5L1 11.5l8.5-2.5L12 0z"/></svg>`
  };
}

// 3. Fungsi Bikin HTML Badge Level Premium (Box Biru Ramping)
export function getLevelBadgeHTML(levelVal: string | number) {
  const lvl = typeof levelVal === 'string' ? parseInt(levelVal) : (levelVal || 1);
  const tier = getTierInfo(lvl);
  
  return `
    <span style="
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      gap: 2px;
      background: linear-gradient(135deg, rgba(30, 58, 138, 0.8), rgba(31, 60, 255, 0.95)); 
      border: 0.5px solid rgba(255, 255, 255, 0.25);
      color: #ffffff !important; 
      font-size: 8px; 
      font-weight: 800; 
      padding: 1px 4px; 
      border-radius: 3px; 
      margin-left: 4px;
      box-shadow: 0 2px 4px rgba(31, 60, 255, 0.3);
      vertical-align: middle;
      line-height: 1;
      letter-spacing: 0.2px;
    ">
      <span style="
        color: ${tier.color}; 
        display: flex; 
        align-items: center; 
        filter: drop-shadow(0 0 2px ${tier.color});
      ">
        ${tier.icon}
      </span>
      Lv.${lvl}
    </span>
  `;
}
