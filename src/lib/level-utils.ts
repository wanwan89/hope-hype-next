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

// 2. Fungsi Ambil Warna Berdasarkan Level
export function getLevelColor(level: number) {
  if (level >= 40) return ["#ff0844", "#ffb199"]; // Merah/Ruby
  if (level >= 30) return ["#00c6ff", "#0072ff"]; // Biru Terang/Diamond
  if (level >= 20) return ["#f6d365", "#fda085"]; // Emas/Gold
  if (level >= 10) return ["#89f7fe", "#66a6ff"]; // Perak/Silver
  return ["#1f3cff", "#89f7fe"]; // Warna default Biru HypeTalk
}

// 3. Fungsi Bikin HTML Badge Level
export function getLevelBadgeHTML(levelVal: string | number) {
  const lvl = typeof levelVal === 'string' ? parseInt(levelVal) : (levelVal || 1);
  const [c1, c2] = getLevelColor(lvl);
  
  return `
    <span style="
      display: inline-flex; align-items: center; justify-content: center; gap: 2px;
      background: linear-gradient(135deg, ${c1}, ${c2});
      color: #fff !important; font-size: 9px; font-weight: 900; 
      padding: 2px 6px; border-radius: 12px; margin-left: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3); vertical-align: middle;
    ">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
      </svg>
      ${lvl}
    </span>
  `;
}
