'use client'; 

import '@/lib/i18n'; 
import i18n from '@/lib/i18n';
import { I18nextProvider } from 'react-i18next';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react'; 
import { supabase } from '@/lib/supabase';
import Script from 'next/script'; 

// 🔥 IMPORT CAPACITOR & FIREBASE PUSH NOTIFICATIONS 🔥
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app'; 
import { PushNotifications } from '@capacitor/push-notifications';

// 🔥 IMPORT TOP LOADER 🔥
import NextTopLoader from 'nextjs-toploader';

import "./globals.css";
import Sidebar from "@/components/layout/Sidebarpost";
import SearchWrapper from "@/components/layout/SearchWrapperpost";
import Overlays from "@/components/ui/Overlayspost";
import LoginPopup from "@/components/auth/LoginPopuppost";
import Navbar from "@/components/layout/Navbar"; 
import { ThemeProvider } from '@/components/ThemeProvider';
import GlobalShareModal from '@/components/GlobalShareModal';

// 🔥 PATH IMPORT SESUAI LOKASI src/Components (Pake 'C' Gede) 🔥
import CustomSplash from '@/components/CustomSplash';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter(); 
  const prevPathnameRef = useRef(pathname);

  // --- STATE LAMA ---
  const [globalIncomingCall, setGlobalIncomingCall] = useState<any>(null);
  const [globalMessageNotif, setGlobalMessageNotif] = useState<any>(null); 
  const [isOnline, setIsOnline] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);

  // 🔥 FONDASI TOKEN
  const fcmTokenRef = useRef<string | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const msgNotifTimerRef = useRef<any>(null); 

  // --- 🔥 TENDANG SPLASH SCREEN BAWAAN HP 🔥 ---
  useEffect(() => {
    const hideNativeSplash = async () => {
      try {
        const platform = Capacitor.getPlatform();
        if (platform === 'android' || platform === 'ios') {
          const { SplashScreen } = await import('@capacitor/splash-screen');
          await SplashScreen.hide();
        }
      } catch (e) {
        // console.warn("Splash screen native tidak aktif", e);
      }
    };

    hideNativeSplash();
  }, []);

  // --- DETEKSI HALAMAN ---
  const isVoicePage = pathname?.includes('/voice');
  const isHomePage = pathname === '/' || pathname === '/home';
  const isDataPage = pathname?.includes('/data');
  const isNotifPage = pathname?.includes('/notifications');
  const isDailyCekPage = pathname?.includes('/dailycek');
  const isSettingsPage = pathname?.includes('/settings');
  const isVipPage = pathname?.includes('/vip');
  const isContactPage = pathname?.includes('/contact');
  const isStoryPage = pathname?.includes('/story');
  const isPostPage = pathname?.includes('/post');

  const isStandaloneApp = isVoicePage || isStoryPage || isDailyCekPage;
  
  const hasNavbar = isHomePage || isNotifPage || isPostPage || isVoicePage;
  
  const isFullscreenPage = isStandaloneApp || isDataPage || isSettingsPage || isVipPage || isContactPage;
  const hideSidebar = isStandaloneApp || isDataPage || isSettingsPage || isVipPage || isContactPage; 
  
  const hideNavbar = isStoryPage || isDailyCekPage || isSettingsPage || isVipPage || isContactPage;
  
  const hideOverlays = isVoicePage || isStoryPage;

  // 🔥 FUNGSI UPDATE TOKEN KE DATABASE 🔥
  const updatePushToken = async (userId: string, token: string) => {
    try {
      // Kita tetap pakai kolom 'push_token' di database biar ga usah ganti schema
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
        
      if (error) throw error;
      console.log("✅ FCM Token berhasil disimpen ke Database!");
    } catch (err: any) {
      console.error("❌ Gagal simpan FCM Token ke DB:", err.message);
    }
  };

  // --- FETCH PROFILE ---
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (data) {
          setMyProfile(data);
          if (fcmTokenRef.current) {
            updatePushToken(session.user.id, fcmTokenRef.current);
          }
        }
      }
    };
    fetchProfile();
  }, []);

  // --- EFEK UNTUK DETEKSI INTERNET ---
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- 🔥 SETUP FIREBASE CLOUD MESSAGING (FCM) 🔥 ---
  useEffect(() => {
    const initNativeFeatures = async () => {
      if (typeof window === 'undefined') return;

      try {
        const platform = Capacitor.getPlatform();

        if (platform === 'android' || platform === 'ios') {
          console.log("📱 Native Detected: Menghubungkan Firebase Push Notifications...");

          // 1. Minta Izin Kirim Notif ke User
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }

          // 2. Kalau diizinkan, daftarkan HP ke Firebase FCM
          if (permStatus.receive === 'granted') {
            await PushNotifications.register();
          } else {
            console.warn("User tidak memberikan izin push notification.");
          }

          // 3. Tangkap Token FCM dan simpan
          PushNotifications.addListener('registration', (token) => {
            console.log("🔥 FCM Token didapat:", token.value);
            fcmTokenRef.current = token.value; 
            if (myProfile?.id) {
              updatePushToken(myProfile.id, token.value);
            }
          });

          PushNotifications.addListener('registrationError', (error: any) => {
            console.error("❌ Gagal mendaftar FCM:", JSON.stringify(error));
          });

          // 4. Deteksi Notifikasi Masuk Saat App Terbuka (Foreground)
          PushNotifications.addListener('pushNotificationReceived', (notification) => {
             console.log('Notifikasi masuk saat app terbuka:', notification);
             // Karena ada notif in-app khusus chat/call, kita bisa abaikan notif sistem ini
          });

          // 5. Deteksi Kalau Notifikasi di-Klik sama User (Buka App dari Notif)
          PushNotifications.addListener('pushNotificationActionPerformed', async (notification) => {
            console.log('Notifikasi diklik:', notification);
            
            // Payload data dari Firebase ada di dalam notification.notification.data
            const data = notification.notification.data;
            const actionId = notification.actionId; // Kalau user klik tombol aksi (tergantung plugin action yg dipakai)

            if (data && data.roomId) {
              const targetUserId = data.senderId || data.callerId;

              if (actionId === "reject") {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                  await supabase.from('messages').insert([{ 
                    room_id: data.roomId, 
                    user_id: session.user.id, 
                    message: `Panggilan Ditolak`, 
                    is_system: true 
                  }]);
                }
              } else if (actionId === "answer") {
                router.push(`/hypetalk/room?from=${targetUserId}&answerCall=true`);
              } else {
                router.push(`/hypetalk/room?from=${targetUserId}&incomingCall=true`); 
              }
            }
          });

          // Handle Back Button Hardware Android
          App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) {
              window.history.back();
            } else {
              App.exitApp();
            }
          });

        }
      } catch (error) {
        console.warn("⚠️ Firebase Native API error:", error);
      }
    };

    initNativeFeatures();

    // Cleanup: Cabut listener kalau komponen dibongkar
    return () => {
      if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
         PushNotifications.removeAllListeners();
      }
    };
  }, [router, myProfile]); 

  // --- LOGIKA HALAMAN & RINGTONE ---
  useEffect(() => {
    if (pathname?.includes('/hypetalk')) {
      setGlobalIncomingCall(null);
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio("/asets/sound/call.wav");
        ringtoneRef.current.loop = true;
      }
      if (globalIncomingCall) {
        ringtoneRef.current.play().catch(() => {});
      } else {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0; 
      }
    }
  }, [globalIncomingCall]);

  // --- REALTIME CHAT / CALL GLOBAL LISTENER ---
  useEffect(() => {
    let channel: any;
    const initGlobalListener = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const myUserId = session.user.id;

      channel = supabase.channel(`global-root-${myUserId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload: any) => {
          const newMsg = payload.new;
          if (newMsg && newMsg.room_id?.includes(myUserId) && newMsg.user_id !== myUserId) {
            if (newMsg.is_system && newMsg.message.includes("Memanggil")) {
              if (window.location.href.includes('/hypetalk')) return; 
              const { data: p } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', newMsg.user_id).single();
              setGlobalIncomingCall({ callerId: p?.id, callerName: p?.username, callerAvatar: p?.avatar_url, roomId: newMsg.room_id });
            }
            const msgLower = String(newMsg.message).toLowerCase();
            if (newMsg.is_system && (msgLower.includes("panggilan berakhir") || msgLower.includes("ditolak") || msgLower.includes("tak terjawab") || msgLower.includes("dibatalkan"))) {
              setGlobalIncomingCall(null);
            }
            if (!newMsg.is_system) {
              if (!window.location.href.includes('/hypetalk')) {
                const { data: p } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', newMsg.user_id).single();
                let previewText = newMsg.message;
                if (newMsg.sticker_url) previewText = "Mengirim Stiker";
                if (newMsg.audio_url) previewText = "Mengirim Voice Note";
                setGlobalMessageNotif({ senderId: p?.id, senderName: p?.username || 'User', senderAvatar: p?.avatar_url || '/asets/png/profile.webp', message: previewText, roomId: newMsg.room_id });
                clearTimeout(msgNotifTimerRef.current);
                msgNotifTimerRef.current = setTimeout(() => { setGlobalMessageNotif(null); }, 4000);
              }
            }
          }
        }).subscribe();
    };
    initGlobalListener();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const handleTolakGlobal = async () => {
    if (!globalIncomingCall) return;
    const currentRoomId = globalIncomingCall.roomId;
    setGlobalIncomingCall(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('messages').insert([{ 
        room_id: currentRoomId, 
        user_id: session.user.id, 
        message: `Panggilan Ditolak`, 
        is_system: true 
      }]);
    }
  };

  const handleAngkatGlobal = async () => {
    if (!globalIncomingCall) return;
    const callerId = globalIncomingCall.callerId;
    setGlobalIncomingCall(null);
    router.push(`/hypetalk/room?from=${callerId}&answerCall=true`);
  };

  const handleMessageClick = () => {
    if (!globalMessageNotif) return;
    const cid = globalMessageNotif.senderId;
    setGlobalMessageNotif(null);
    router.push(`/hypetalk/room?from=${cid}`);
  };

  useEffect(() => {
    const preventSave = (e: any) => { if (e.target.tagName === 'IMG') e.preventDefault(); };
    document.addEventListener('contextmenu', preventSave);
    document.addEventListener('dragstart', preventSave);
    return () => {
      document.removeEventListener('contextmenu', preventSave);
      document.removeEventListener('dragstart', preventSave);
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isStandaloneApp) {
      root.style.height = body.style.height = '100dvh';
      root.style.overflow = body.style.overflow = 'hidden';
      body.style.position = 'fixed'; body.style.width = '100%';
    } else {
      root.style.height = body.style.height = 'auto';
      root.style.overflow = body.style.overflow = 'visible';
      body.style.position = 'static';
    }
  }, [pathname, isStandaloneApp]); 

  // --- RENDER CONTENT HELPER ---
  const renderUI = () => (
    <>
      <GlobalShareModal />
      {!isOnline && (
        <div className="offline-global-overlay">
          <div className="offline-card">
            <div className="offline-icon-ring"><span className="material-icons" style={{ fontSize: '32px' }}>wifi_off</span></div>
            <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: '800' }}>Koneksi Terputus</h3>
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>Sinyal lu ngilang Bree! HypeTalk butuh internet.</p>
          </div>
        </div>
      )}

      {globalMessageNotif && !globalIncomingCall && (
        <div className="global-msg-popup" onClick={handleMessageClick}>
          <img src={globalMessageNotif.senderAvatar} className="global-msg-avatar" alt="sender" />
          <div className="global-msg-content">
            <div className="global-msg-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-icons" style={{ fontSize: '14px', color: '#1f3cff' }}>mark_chat_unread</span>
                <span className="global-msg-title">{globalMessageNotif.senderName}</span>
              </div>
              <span className="global-msg-badge">Baru</span>
            </div>
            <div className="global-msg-text">{globalMessageNotif.message}</div>
          </div>
        </div>
      )}

      {globalIncomingCall && (
        <div className="global-call-ui" style={{ position: 'fixed', top: 'max(env(safe-area-inset-top, 20px), 20px)', left: '50%', transform: 'translateX(-50%)', background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(46, 204, 113, 0.4)', borderRadius: '24px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 9999999, width: '90%', maxWidth: '360px', animation: 'slideDownGlobal 0.4s' }}>
          <img src={globalIncomingCall.callerAvatar || '/asets/png/profile.webp'} className="global-call-avatar" alt="caller" />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ color: 'white', fontWeight: 'bold' }}>{globalIncomingCall.callerName}</div>
            <div style={{ color: '#2ecc71', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-icons" style={{ fontSize: '14px' }}>phone_in_talk</span> Panggilan Masuk...
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleTolakGlobal} className="global-call-btn" style={{ background: '#ff4757' }}><span className="material-icons">call_end</span></button>
            <button onClick={handleAngkatGlobal} className="global-call-btn" style={{ background: '#2ecc71' }}><span className="material-icons">call</span></button>
          </div>
        </div>
      )}
      
      {!hideSidebar && <Sidebar />}
      <div className={`layout-wrapper ${isStandaloneApp ? 'fixed-layout' : ''}`}>
        {isHomePage && <div className="search-container" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', zIndex: 10 }}><SearchWrapper /></div>}
        <main className={`main-content ${hasNavbar ? 'with-bottom-nav' : ''} ${isFullscreenPage ? 'is-fullscreen' : ''}`} style={{ display: isStandaloneApp ? 'flex' : 'block', minHeight: isStandaloneApp ? '100%' : '100dvh' }}>
          {children}
        </main>
      </div>
      
      {!hideNavbar && <Navbar />}
    </>
  );

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />

        <title>HypeTalk - Creative Community</title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1f3cff" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons&display=block" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          body { background-color: var(--bg-main); }
          @keyframes slideDownGlobal { from { transform: translate(-50%, -120%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
          .global-call-avatar { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #2ecc71; animation: pulseCallGlobal 1.5s infinite; }
          @keyframes pulseCallGlobal { 0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.6); } 70% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); } 100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); } }
          .global-call-btn { border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; }
          .global-msg-popup { position: fixed; top: max(env(safe-area-inset-top, 20px), 20px); left: 50%; transform: translateX(-50%); background: rgba(20, 20, 25, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(31, 60, 255, 0.3); border-radius: 20px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; z-index: 9999998; width: 90%; max-width: 380px; animation: slideDownGlobal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
          .global-msg-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
        `}</style>
      </head>

      <body className={`antialiased ${isVoicePage ? 'in-voice-room' : 'in-home-app'}`}>
        
        <CustomSplash />

        <NextTopLoader 
          color="#1f3cff"
          showSpinner={false}
          shadow="0 0 10px #1f3cff,0 0 5px #1f3cff"
          zIndex={99999999}
        />

        <Script src="https://cdn.jsdelivr.net/npm/eruda" strategy="lazyOnload" onLoad={() => { if (typeof window !== 'undefined' && (window as any).eruda) (window as any).eruda.init(); }} />

        <I18nextProvider i18n={i18n}>
          <ThemeProvider>
            {renderUI()}
            <LoginPopup />
            {!hideOverlays && <Overlays />}
          </ThemeProvider>
        </I18nextProvider>
      </body>
    </html>
  );
}
