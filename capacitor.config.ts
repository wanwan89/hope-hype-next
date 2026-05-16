import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hopecreative.app',
  appName: 'Hypeco', 
  webDir: 'out',       
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // Sudah benar 0 biar langsung masuk ke tsx
      backgroundColor: "#ffffff", // Diubah jadi putih sesuai maumu
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_onesignal_default", 
      iconColor: "#ffffff",                   
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
