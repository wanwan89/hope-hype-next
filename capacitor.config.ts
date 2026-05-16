import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hopecreative.app',
  appName: 'Hypeco', 
  webDir: 'out',       
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // 🔥 Ubah jadi 0 biar splash bawaan mati, diganti splash kodingan
      backgroundColor: "#1a1a1a",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_onesignal_default", // 🔥 Nama icon putih transparan
      iconColor: "#ffffff",                   // 🔥 Warna icon putih
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
