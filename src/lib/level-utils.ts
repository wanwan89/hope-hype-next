// ============================================================
// Fungsi Level & Badge (Full Fix) – Sistem Level 1–50
// ============================================================

/**
 * Hitung level berdasarkan total giftSent.
 * Setiap 200 exp naik 1 level, maksimum level 50.
 */
export function calculateLevel(giftSent: number): number {
  let exp = giftSent || 0;
  let level = 1;
  let expNeeded = 200;

  while (exp >= expNeeded && level < 50) {
    exp -= expNeeded;
    level++;
    expNeeded = level * 200;       // tetap naik 200/level agar tidak terlalu cepat
  }

  return level > 50 ? 50 : level;
}

/**
 * Warna isian bintang (SVG) berdasarkan level.
 * Berganti setiap 10 level.
 */
function getLevelColor(level: number): string {
  if (level >= 40) return '#ff0055'; // Merah
  if (level >= 30) return '#9d00ff'; // Ungu
  if (level >= 20) return '#ffaa00'; // Oranye
  if (level >= 10) return '#00e676'; // Hijau
  return '#00bfff';                  // Cyan (level 1–9)
}

/**
 * Menghasilkan HTML badge level:
 * - Kotak persegi solid (biru tua)
 * - SVG bintang dengan centang (warna sesuai level)
 * - Angka level di sebelah kanan
 */
export function getLevelBadgeHTML(levelVal: string | number): string {
  const lvl = typeof levelVal === 'string' ? parseInt(levelVal) : (levelVal || 1);
  const fillColor = getLevelColor(lvl);

  // Hindari nilai negatif / nol
  const safeLevel = lvl < 1 ? 1 : lvl;

  return `
    <span style="
      display: inline-flex;
      align-items: center;
      background: #1d4ed8;                /* biru solid, bukan glass */
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 4px;                 /* persegi dengan sudut sedikit melengkung */
      padding: 2px 6px 2px 2px;
      height: 20px;
      box-sizing: border-box;
      font-family: sans-serif;
      line-height: 1;
      vertical-align: middle;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48"
        style="margin-right: 4px; flex-shrink: 0; display: block;"
      >
        <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
          <path fill="${fillColor}" stroke="#000" d="M24 42L4 18.5L9.69488 6L38.3051 6L44 18.5L24 42Z"/>
          <path stroke="#fff" d="M32 18L24 27L16 18"/>
        </g>
      </svg>

      <span style="
        font-size: 11px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.3px;
        line-height: 1;
      ">
        ${safeLevel}
      </span>
    </span>
  `;
}

/**
 * Dapatkan objek berisi warna dan SVG kecil untuk keperluan lain.
 * (misal: tampilan tier di profil)
 */
export function getTierInfo(level: number): { color: string; icon: string } {
  const color = getLevelColor(level);
  const icon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" fill="none">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
        <path fill="${color}" stroke="#000" d="M24 42L4 18.5L9.69488 6L38.3051 6L44 18.5L24 42Z"/>
        <path stroke="#fff" d="M32 18L24 27L16 18"/>
      </g>
    </svg>
  `;
  return { color, icon };
}