'use client'; 

import '@/lib/i18n'; 
import i18n from '@/lib/i18n';
import { I18nextProvider } from 'react-i18next';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react'; 
import { supabase } from '@/lib/supabase';
import Script from 'next/script'; 

// 🔥 IMPORT CAPACITOR & LIVEKIT 🔥
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { App } from '@capacitor/app'; 
import { LiveKitRoom } from '@livekit/components-react';

import "./globals.css";
import Sidebar from "@/components/layout/Sidebarpost";
import SearchWrapper from "@/components/layout/SearchWrapperpost";
import Overlays from "@/components/ui/Overlayspost";
import LoginPopup from "@/components/auth/LoginPopuppost";
import Navbar from "@/components/layout/Navbar"; 
import { ThemeProvider } from '@/components/ThemeProvider';
import GlobalShareModal from '@/components/GlobalShareModal';

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

  // --- STATE BARU UNTUK FONDASI TELPON ---
  const [lkToken, setLkToken] = useState<string | null>(null);
  const [lkRoom, setLkRoom] = useState<string | null>(null);

  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const msgNotifTimerRef = useRef<any>(null); 

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
  const hasNavbar = isHomePage || isNotifPage || isPostPage;
  const isFullscreenPage = isStandaloneApp || isDataPage || isSettingsPage || isVipPage || isContactPage;
  const hideSidebar = isStandaloneApp || isDataPage || isSettingsPage || isVipPage || isContactPage; 
  const hideNavbar = isStandaloneApp || isSettingsPage || isVipPage || isContactPage;
  const hideOverlays = isVoicePage || isStoryPage;

  // --- FETCH PROFILE ---
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (data) setMyProfile(data);
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

  // --- 🔥 SETUP NATIVE FEATURES & PUSH NOTIF (FULL FIX) 🔥 ---
  useEffect(() => {
    const initNativeFeatures = async () => {
      if (typeof window === 'undefined') return;

      try {
        const platform = Capacitor.getPlatform();

        if (platform === 'android') {
          console.log("📱 Android Detected: Menyiapkan Fondasi HypeTalk...");
          
          await PushNotifications.createChannel({
            id: 'high_importance_channel',
            name: 'Urgent Notifications',
            importance: 5,
            sound: 'default',
            visibility: 1,
            vibration: true
          });

          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }

          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
          } catch (err) {
            console.warn("⚠️ User menolak izin Mic");
          }

          // 🔥 DAFTARIN TOMBOL INTERAKTIF SEBELUM REGISTER 🔥
          await PushNotifications.registerActionTypes({
            types: [
              {
                id: 'chat_actions',
                actions: [
                  { 
                    id: 'reply', 
                    title: 'Balas Pesan', 
                    input: true, 
                    inputButtonTitle: 'Kirim', 
                    inputPlaceholder: 'Ketik balasan...' 
                  }
                ]
              },
              {
                id: 'call_actions',
                actions: [
                  { id: 'accept_call', title: '📞 Angkat', foreground: true },
                  { id: 'reject', title: '❌ Tolak', foreground: false, destructive: true }
                ]
              }
            ]
          });

          if (permStatus.receive === 'granted') {
            await PushNotifications.register();
          }

          // 🔥 TANGKAP TOKEN FIREBASE & SIMPAN KE DB 🔥
          PushNotifications.addListener('registration', async (token) => {
            console.log('✅ FCM Token HP ini:', token.value);
            
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { error } = await supabase
                .from('profiles')
                .update({ push_token: token.value })
                .eq('id', session.user.id);
                
              if (error) console.error("❌ Gagal simpan token ke DB:", error);
              else console.log("✅ Token FCM berhasil disimpen ke database!");
            }
          });

          PushNotifications.addListener('registrationError', (error) => {
            console.error('❌ Error registrasi push notif:', error);
          });

          // 🔥 LISTEN ACTION (TAP, BALAS & ANGKAT) 🔥
          PushNotifications.addListener('actionPerformed', async (action) => {
            const { actionId, notification, inputValue } = action; 
            const { data } = notification;

            // 🔥 FIX: LOGIKA TAP UNTUK LIKE & COMMENT 🔥
            // actionId 'tap' artinya user klik area notifikasi (bukan klik tombol)
            if (actionId === 'tap' && (data?.type === 'like' || data?.type === 'comment')) {
              if (data.postId) {
                // Arahin langsung ke halaman detail post
                router.push(`/post/${data.postId}`);
              }
              return; // Stop eksekusi di sini biar nggak nabrak bawahnya
            }

            if (actionId === 'reply' && inputValue) {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id && data?.roomId) {
                await supabase.from('messages').insert([{
                  room_id: data.roomId,
                  user_id: session.user.id,
                  message: inputValue,
                  is_system: false
                }]);
              }
            }

            if (actionId === 'accept' || actionId === 'accept_call') {
              if (data?.callerId && data?.roomId) {
                handleFetchLiveKitToken(data.roomId, data.callerId); 
                router.push(`/hypetalk/room?from=${data.callerId}`);
              }
            } else if (actionId === 'reject') {
              handleTolakGlobal();
            }
          });

          App.addListener('backButton', ({ canGoBack }) => {
            if (lkToken) {
              App.minimizeApp(); 
            } else if (canGoBack) {
              window.history.back();
            } else {
              App.exitApp();
            }
          });

        }
      } catch (error) {
        console.warn("⚠️ Capacitor Push API error:", error);
      }
    };

    initNativeFeatures();

    return () => {
      if (typeof window !== 'undefined' && Capacitor.getPlatform() === 'android') {
        PushNotifications.removeAllListeners();
      }
    };
  }, [router, lkToken, myProfile]); 

  // --- LIVEKIT TOKEN FETCH VIA SUPABASE EDGE FUNCTION ---
  const handleFetchLiveKitToken = async (roomName: string, userId: string) => {
    try {
      setLkRoom(roomName); 

      const { data, error } = await supabase.functions.invoke('get-livekit-token', {
        body: { 
          roomName: roomName, 
          identity: userId, 
          username: myProfile?.username || 'User HypeTalk' 
        }
      });

      if (error || !data) throw new Error("Gagal ambil token dari Supabase");

      setLkToken(data.token);
      console.log("✅ Token LiveKit didapat via Supabase Edge Function!");

    } catch (err) {
      console.error("❌ Error koneksi LiveKit:", err);
    }
  };

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
              setLkToken(null); 
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
      await supabase.from('messages').insert([{ room_id: currentRoomId, user_id: session.user.id, message: `Panggilan Ditolak`, is_system: true }]);
    }
  };

  const handleAngkatGlobal = () => {
    if (!globalIncomingCall) return;
    handleFetchLiveKitToken(globalIncomingCall.roomId, globalIncomingCall.callerId);
    setGlobalIncomingCall(null);
    router.push(`/hypetalk/room?from=${globalIncomingCall.callerId}`);
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
            <div className="global-msg-header"><span className="global-msg-title">{globalMessageNotif.senderName}</span><span className="global-msg-badge">Baru</span></div>
            <div className="global-msg-text">{globalMessageNotif.message}</div>
          </div>
        </div>
      )}

      {globalIncomingCall && (
        <div className="global-call-ui" style={{ position: 'fixed', top: 'max(env(safe-area-inset-top, 20px), 20px)', left: '50%', transform: 'translateX(-50%)', background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(46, 204, 113, 0.4)', borderRadius: '24px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 9999999, width: '90%', maxWidth: '360px', animation: 'slideDownGlobal 0.4s' }}>
          <img src={globalIncomingCall.callerAvatar || '/asets/png/profile.webp'} className="global-call-avatar" alt="caller" />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ color: 'white', fontWeight: 'bold' }}>{globalIncomingCall.callerName}</div>
            <div style={{ color: '#2ecc71', fontSize: '12px' }}><span className="material-icons" style={{ fontSize: '12px' }}>ring_volume</span> Memanggil...</div>
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
        <Script src="https://cdn.jsdelivr.net/npm/eruda" strategy="lazyOnload" onLoad={() => { if (typeof window !== 'undefined' && (window as any).eruda) (window as any).eruda.init(); }} />

        <I18nextProvider i18n={i18n}>
          <ThemeProvider>
            {/* 🔥 FONDASI LIVEKIT: WRAPPER GLOBAL 🔥 */}
            {lkToken ? (
              <LiveKitRoom
                token={lkToken}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                audio={true}
                video={false}
                onDisconnected={() => { setLkToken(null); setLkRoom(null); }}
              >
                {renderUI()}
              </LiveKitRoom>
            ) : (
              renderUI()
            )}
            
            <LoginPopup />
            {!hideOverlays && <Overlays />}
          </ThemeProvider>
        </I18nextProvider>
      </body>
    </html>
  );
}
