import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hopecreative.app',
  appName: 'Hypeco', 
  webDir: 'out',       
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, 
      backgroundColor: "#ffffff", 
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_chat", // 🔥 Jejak OneSignal dihapus, ganti ke nama icon yang kita setting di Edge Function
      iconColor: "#1f3cff",      // 🔥 Disesuaikan sama warna tema HypeTalk lu             
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
