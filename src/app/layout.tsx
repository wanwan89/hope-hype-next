'use client';

import '@/lib/i18n';
import i18n from '@/lib/i18n';
import { I18nextProvider } from 'react-i18next';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Script from 'next/script';

// 🔥 IMPORT CAPACITOR PUSH NOTIFICATIONS & NATIVE 🔥
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';

import "./globals.css";
import SearchWrapper from "@/components/layout/SearchWrapperpost";
import Overlays from "@/components/ui/Overlayspost";
import LoginPopup from "@/components/auth/LoginPopuppost";
import Navbar from "@/components/layout/Navbar";
import { ThemeProvider } from '@/components/ThemeProvider';
import GlobalShareModal from '@/components/GlobalShareModal';

import CustomSplash from '@/components/CustomSplash';
import Providers from '@/components/Providers';
import { ConfirmProvider } from '@/components/ConfirmProvider'; 

// 🔥 BARU: Import Lottie dan file JSON animasi offline
import Lottie from 'lottie-react';
import lostConnectionData from '@/assets/lottie/lost-conection.json'; 

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // --- STATE ---
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
          const splashModule = await import('@capacitor/splash-screen').catch(() => null);
          if (splashModule?.SplashScreen) {
            await splashModule.SplashScreen.hide();
          }
        }
      } catch (e) {
        // Abaikan error
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
  const hideNavbar = isStoryPage || isDailyCekPage || isSettingsPage || isVipPage || isContactPage;
  const hideOverlays = isVoicePage || isStoryPage;

  // 🔥 FUNGSI UPDATE TOKEN KE DATABASE 🔥
  const updatePushToken = async (userId: string, token: string) => {
    try {
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

  // ==========================================================
  // 🔥 🔥 🔥 FINAL FIX: PWA & NATIVE THEME SYNC 🔥 🔥 🔥
  // ==========================================================
  const syncStatusBar = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const platform = Capacitor.getPlatform();

    try {
      const htmlEl = document.documentElement;
      const isDark = htmlEl.classList.contains('dark') || htmlEl.getAttribute('data-theme') === 'dark';

      // Update meta color-scheme
      let metaColorScheme = document.querySelector('meta[name="color-scheme"]');
      if (!metaColorScheme) {
        metaColorScheme = document.createElement('meta');
        metaColorScheme.setAttribute('name', 'color-scheme');
        document.head.appendChild(metaColorScheme);
      }
      metaColorScheme.setAttribute('content', isDark ? 'dark' : 'light');

      // 🔥 FIX 1: Update theme-color browser/PWA agar sesuai dengan CSS (--bg-main: #0a0a0a)
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.setAttribute('name', 'theme-color');
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute('content', isDark ? '#0a0a0a' : '#ffffff');

      // Capacitor StatusBar (hanya untuk native)
      if (platform === 'android' || platform === 'ios') {
        if (isDark) {
          await StatusBar.setStyle({ style: Style.Dark });
        } else {
          await StatusBar.setStyle({ style: Style.Light });
        }

        if (platform === 'android') {
          // 🔥 FIX 2: Set status bar Android agar warnanya #0a0a0a (tidak hitam pekat)
          await StatusBar.setBackgroundColor({ color: isDark ? '#0a0a0a' : '#ffffff' });
        }
      }
    } catch (e) {
      console.warn("⚠️ StatusBar sync error:", e);
    }
  }, []);

  // --- OBSERVER PERUBAHAN TEMA ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    syncStatusBar();

    const htmlEl = document.documentElement;
    const observer = new MutationObserver(() => {
      syncStatusBar();
    });
    observer.observe(htmlEl, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    return () => {
      observer.disconnect();
    };
  }, [syncStatusBar]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      document.documentElement.classList.add('theme-ready');
    }, 50);
    return () => clearTimeout(timeout);
  }, []);

  // --- SETUP PUSH NOTIFICATION & NATIVE FEATURES ---
  useEffect(() => {
    const initNativeFeatures = async () => {
      if (typeof window === 'undefined') return;

      try {
        const platform = Capacitor.getPlatform();

        if (platform === 'android' || platform === 'ios') {
          let permPush = await PushNotifications.checkPermissions();
          if (permPush.receive === 'prompt') permPush = await PushNotifications.requestPermissions();

          if (platform === 'android') {
            await PushNotifications.createChannel({
              id: 'hype_high_channel',
              name: 'Panggilan & Chat HypeTalk',
              description: 'Channel penting untuk notifikasi chat dan panggilan masuk',
              importance: 5,
              visibility: 1,
              sound: 'suara_panggilan',
              vibration: true,
            });
          }

          if (permPush.receive === 'granted') {
            await PushNotifications.register();
          }

          PushNotifications.addListener('registration', (token) => {
            fcmTokenRef.current = token.value;
            if (myProfile?.id) updatePushToken(myProfile.id, token.value);
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            const data = action.notification.data;
            if (data && data.roomId) {
              const targetUserId = data.senderId;
              if (data.type === 'call') {
                router.push(`/hypetalk/room?from=${targetUserId}&incomingCall=true`);
              } else {
                router.push(`/hypetalk/room?from=${targetUserId}`);
              }
            }
          });

          App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) {
              window.history.back();
            } else {
              App.exitApp();
            }
          });
        }
      } catch (error) {
        console.warn("⚠️ Firebase/Native API error:", error);
      }
    };
    initNativeFeatures();

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

  // --- PREVENT SAVE & ANTI ZOOM ---
  useEffect(() => {
    const preventSave = (e: any) => { if (e.target.tagName === 'IMG') e.preventDefault(); };
    document.addEventListener('contextmenu', preventSave);
    document.addEventListener('dragstart', preventSave);
    
    const handleGestureStart = (e: Event) => e.preventDefault();
    const handleTouchMove = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };

    document.addEventListener('gesturestart', handleGestureStart);
    document.addEventListener('gesturechange', handleGestureStart);
    document.addEventListener('gestureend', handleGestureStart);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('contextmenu', preventSave);
      document.removeEventListener('dragstart', preventSave);
      document.removeEventListener('gesturestart', handleGestureStart);
      document.removeEventListener('gesturechange', handleGestureStart);
      document.removeEventListener('gestureend', handleGestureStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // --- DOM MANIPULATION ---
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isStandaloneApp) {
      root.classList.add('fixed-layout');
      body.classList.add('fixed-layout');
    } else {
      root.classList.remove('fixed-layout');
      body.classList.remove('fixed-layout');
    }
  }, [isStandaloneApp]);

  // --- RENDER CONTENT HELPER ---
  const renderUI = () => (
    <>
      <GlobalShareModal />
      
      {!isOnline && (
        <div className="offline-global-overlay" style={{ position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999999 }}>
          <div className="offline-card" style={{ textAlign: 'center', padding: '2rem', borderRadius: '1.5rem', background: 'transparent', border: 'none', maxWidth: '320px', width: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '150px', height: '150px', marginBottom: '10px' }}>
              <Lottie animationData={lostConnectionData} loop={true} autoplay={true} />
            </div>
            <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: '800', margin: '0.5rem 0 0.25rem' }}>Koneksi Terputus</h3>
            <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Kamu sedang offline, aktifkan internet.</p>
          </div>
        </div>
      )}

      {globalMessageNotif && !globalIncomingCall && (
        <div className="global-msg-popup" onClick={handleMessageClick} style={{ top: 'calc(var(--safe-area-top) + 12px)' }}>
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
        <div className="global-call-ui" style={{ 
          position: 'fixed', 
          top: 'calc(var(--safe-area-top) + 12px)', 
          left: '50%', transform: 'translateX(-50%)', background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(46, 204, 113, 0.4)', borderRadius: '24px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 9999999, width: '90%', maxWidth: '360px', animation: 'slideDownGlobal 0.4s' 
        }}>
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

      <div className={`layout-wrapper ${isStandaloneApp ? 'fixed-layout' : ''}`} 
           style={{ paddingTop: 'var(--safe-area-top)' }}>
        
        {isHomePage && (
          <div className="search-container" style={{ 
            width: '100%', 
            maxWidth: '600px', 
            margin: '0 auto', 
            zIndex: 10,
            paddingTop: '10px' 
          }}>
            <SearchWrapper />
          </div>
        )}
        
        <main className={`main-content ${hasNavbar ? 'with-bottom-nav' : ''} ${isFullscreenPage ? 'is-fullscreen' : ''}`}>
          {children}
        </main>
        
      </div>

      {!hideNavbar && <Navbar />}
    </>
  );

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <title>HypeTalk - Creative Community</title>
        <link rel="manifest" href="/manifest.json" />
        
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        
        <link rel="icon" type="image/png" sizes="192x192" href="/logohypeco.png" />
        <link rel="apple-touch-icon" href="/logohypeco.png" />
        
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons&display=block" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
        
        <style>{`
          :root {
            --safe-area-top: env(safe-area-inset-top, 0px);
          }
          body {
            margin: 0;
            padding: 0;
          }
          .layout-wrapper {
            min-height: 100dvh;
          }

          /* 🔥 FIX 3: Hapus garis pembatas / border bawah pada semua elemen header secara global */
          header, .tg-header, .top-header, .navbar-top {
            border-bottom: none !important;
            box-shadow: none !important;
          }

          @keyframes slideDownGlobal { from { transform: translate(-50%, -120%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
          .global-call-avatar { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #2ecc71; animation: pulseCallGlobal 1.5s infinite; }
          @keyframes pulseCallGlobal { 0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.6); } 70% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); } 100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); } }
          .global-call-btn { border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; }
          .global-msg-popup { position: fixed; left: 50%; transform: translateX(-50%); background: rgba(20, 20, 25, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(31, 60, 255, 0.3); border-radius: 20px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; zIndex: 9999998; width: 90%; max-width: 380px; animation: slideDownGlobal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
          .global-msg-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
        `}</style>
      </head>

      <body className={`antialiased ${isVoicePage ? 'in-voice-room' : 'in-home-app'} ${isStandaloneApp ? 'fixed-layout' : ''}`}>
        <CustomSplash />
        
        <Script
          src="https://cdn.jsdelivr.net/npm/eruda"
          strategy="lazyOnload"
          onLoad={() => {
            if (typeof window !== 'undefined' && (window as any).eruda) {
              (window as any).eruda.init();
            }
          }}
        />
        <Providers>
          <I18nextProvider i18n={i18n}>
            <ThemeProvider>
              <ConfirmProvider>
                {renderUI()}
                <LoginPopup />
                {!hideOverlays && <Overlays />}
              </ConfirmProvider>
            </ThemeProvider>
          </I18nextProvider>
        </Providers>
      </body>
    </html>
  );
}
