import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hopecreative.app',
  appName: 'Hypecreative', 
  webDir: 'out',       
  bundledWebRuntime: false,
  // 🔥 TAMBAHKAN BLOK PLUGINS DI BAWAH INI 🔥
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1a1a1a",
      androidSplashResourceName: "splash", // Nama file splash screen lu
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_hope", // Nama file ikon notif lu (tanpa .png)
      iconColor: "#1f3cff",      // Warna biru khas Hope Hype
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
