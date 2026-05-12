import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hopecreative.app',
  appName: 'Hypecreative', // 🔥 FIX: Ganti jadi nama asli aplikasi lu
  webDir: 'out',       // 🔥 FIX: Wajib 'out' karena Next.js naruh hasil build di sini
  bundledWebRuntime: false
};

export default config;
