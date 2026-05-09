'use client'; 

import '@/lib/i18n'; 
import i18n from '@/lib/i18n';
import { I18nextProvider } from 'react-i18next';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react'; 
import { supabase } from '@/lib/supabase';
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

  // --- 🔥 STATE UNTUK PANGGILAN & PESAN GLOBAL 🔥 ---
  const [globalIncomingCall, setGlobalIncomingCall] = useState<any>(null);
  const [globalMessageNotif, setGlobalMessageNotif] = useState<any>(null); 
  
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

  // --- NADA DERING OTOMATIS SINKRON SAMA FLOATING CALL ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio("/asets/sound/call.wav");
        ringtoneRef.current.loop = true;
      }

      if (globalIncomingCall) {
        const playPromise = ringtoneRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => console.log("Audio diblokir browser"));
        }
      } else {
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0; 
        }
      }
    }
  }, [globalIncomingCall]);

  // --- 🔥 SISTEM PANGGILAN & PESAN GLOBAL 🔥 ---
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
            
            // 📞 JIKA ITU TELPON
            if (newMsg.is_system && newMsg.message.includes("Memanggil")) {
              if (window.location.href.includes('/hypetalk')) return; 

              const { data: p } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', newMsg.user_id).single();
              setGlobalIncomingCall({
                callerId: p?.id,
                callerName: p?.username,
                callerAvatar: p?.avatar_url,
                roomId: newMsg.room_id
              });
            }

            const msgLower = String(newMsg.message).toLowerCase();
            if (newMsg.is_system && (
              msgLower.includes("panggilan berakhir") || 
              msgLower.includes("ditolak") || 
              msgLower.includes("tak terjawab") ||
              msgLower.includes("dibatalkan") 
            )) {
              setGlobalIncomingCall(null);
              if (ringtoneRef.current) {
                ringtoneRef.current.pause();
                ringtoneRef.current.currentTime = 0;
              }
            }

            // 💬 JIKA ITU PESAN CHAT BIASA (Bukan Sistem)
            if (!newMsg.is_system) {
              // Abaikan kalau user lagi di dalam menu Hypetalk/Chat
              if (!window.location.href.includes('/hypetalk')) {
                const { data: p } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', newMsg.user_id).single();
                
                // Ambil info text (kalau stiker/VN ubah labelnya)
                let previewText = newMsg.message;
                if (newMsg.sticker_url) previewText = "Mengirim Stiker";
                if (newMsg.audio_url) previewText = "Mengirim Voice Note";

                setGlobalMessageNotif({
                  senderId: p?.id,
                  senderName: p?.username || 'User',
                  senderAvatar: p?.avatar_url || '/asets/png/profile.webp',
                  message: previewText,
                  roomId: newMsg.room_id
                });

                // Auto tutup notif dalam 4 detik
                clearTimeout(msgNotifTimerRef.current);
                msgNotifTimerRef.current = setTimeout(() => {
                  setGlobalMessageNotif(null);
                }, 4000);
              }
            }

          }
        })
        .subscribe();
    };
    
    initGlobalListener();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (ringtoneRef.current) ringtoneRef.current.pause();
      clearTimeout(msgNotifTimerRef.current);
    };
  }, []);

  const handleTolakGlobal = async () => {
    if (!globalIncomingCall) return;
    const currentRoomId = globalIncomingCall.roomId;
    
    setGlobalIncomingCall(null);
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    
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

  const handleAngkatGlobal = () => {
    if (!globalIncomingCall) return;
    const cid = globalIncomingCall.callerId;
    
    setGlobalIncomingCall(null);
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    router.push(`/hypetalk/chat?from=${cid}`);
  };

  const handleMessageClick = () => {
    if (!globalMessageNotif) return;
    const cid = globalMessageNotif.senderId;
    setGlobalMessageNotif(null);
    router.push(`/hypetalk/chat?from=${cid}`);
  };

  // --- 1. SISTEM ANTI-DOWNLOAD FOTO ---
  useEffect(() => {
    const preventSave = (e: MouseEvent | TouchEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener('contextmenu', preventSave);
    const preventDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') e.preventDefault();
    };
    document.addEventListener('dragstart', preventDrag);
    return () => {
      document.removeEventListener('contextmenu', preventSave);
      document.removeEventListener('dragstart', preventDrag);
    };
  }, []);

  // --- 2. SISTEM LAYOUT FIX ---
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const currentBaseChat = pathname?.split('?')[0];
    const prevBasePath = prevPathnameRef.current?.split('?')[0];

    if (currentBaseChat !== prevBasePath) {
      window.scrollTo(0, 0);
      prevPathnameRef.current = pathname;
    }

    if (isStandaloneApp) {
      root.style.height = '100dvh';
      root.style.overflow = 'hidden';
      body.style.height = '100dvh';
      body.style.overflow = 'hidden';
      body.style.position = 'fixed'; 
      body.style.width = '100%';
      body.style.overscrollBehaviorY = 'none'; 
    } else {
      root.style.height = 'auto';
      root.style.overflow = 'visible';
      if (body.style.position !== 'static') {
        body.style.position = 'static';
        body.style.overflow = 'auto';
        body.style.height = 'auto';
        body.style.width = 'auto';
      }
      body.style.overscrollBehaviorY = 'auto'; 
      const voiceTrash = [
        'room-gift-drawer', 'room-drawer-overlay', 'gift-anim-overlay', 
        'vip-entrance-overlay', 'vip-anim-styles-clean'
      ];
      voiceTrash.forEach(id => document.getElementById(id)?.remove());
    }
  }, [pathname, isStandaloneApp]); 

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1f3cff" />
        <link rel="apple-touch-icon" href="/asets/png/book.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HypeTalk" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        
        <style>{`
          img {
            -webkit-touch-callout: none !important;
            user-select: none !important;
            -webkit-user-drag: none !important;
          }
          body { background-color: var(--bg-main); }
          
          /* Animasi & CSS Popup Call */
          @keyframes slideDownGlobal {
            from { transform: translate(-50%, -120%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
          .global-call-avatar {
            width: 45px; height: 45px; border-radius: 50%; object-fit: cover;
            border: 2px solid #2ecc71; animation: pulseCallGlobal 1.5s infinite;
          }
          @keyframes pulseCallGlobal {
            0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.6); }
            70% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
            100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
          }
          .global-call-btn {
            border: none; border-radius: 50%; width: 40px; height: 40px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; color: white; transition: transform 0.2s;
          }
          .global-call-btn:active { transform: scale(0.9); }

          /* 🔥 Animasi & CSS Popup Pesan Baru (DI RAPIHKAN) 🔥 */
          .global-msg-popup {
            position: fixed;
            top: max(env(safe-area-inset-top, 20px), 20px);
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 20, 25, 0.95);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(31, 60, 255, 0.3);
            border-radius: 20px;
            padding: 14px 16px;
            display: flex;
            align-items: center;
            gap: 14px;
            z-index: 9999998; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.4);
            width: 90%;
            max-width: 380px;
            cursor: pointer;
            animation: slideDownGlobal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            transition: transform 0.2s;
          }
          .global-msg-popup:active {
            transform: translateX(-50%) scale(0.96);
          }
          .global-msg-avatar {
            width: 44px; height: 44px; border-radius: 50%; object-fit: cover;
            border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;
          }
          .global-msg-content {
            flex: 1; 
            min-width: 0; 
            display: flex; 
            flex-direction: column;
            justify-content: center;
          }
          .global-msg-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
            width: 100%;
          }
          .global-msg-title {
            color: white; 
            font-weight: 700; 
            font-size: 15px; 
            white-space: nowrap; 
            text-overflow: ellipsis; 
            overflow: hidden;
          }
          .global-msg-badge {
            font-size: 10px;
            background: #1f3cff;
            color: white;
            padding: 3px 8px;
            border-radius: 10px;
            font-weight: 800;
            flex-shrink: 0;
            margin-left: 10px;
          }
          .global-msg-text {
            color: #9ca3af; 
            font-size: 13px; 
            white-space: nowrap; 
            text-overflow: ellipsis; 
            overflow: hidden;
          }
        `}</style>
      </head>
      
      <body className={`antialiased ${isVoicePage ? 'in-voice-room' : 'in-home-app'}`}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider>
            <GlobalShareModal />

            {/* 🔥 POPUP PESAN MASUK GLOBAL (RAPIH) 🔥 */}
            {globalMessageNotif && !globalIncomingCall && (
              <div className="global-msg-popup" onClick={handleMessageClick}>
                <img src={globalMessageNotif.senderAvatar} className="global-msg-avatar" alt="sender" />
                <div className="global-msg-content">
                  <div className="global-msg-header">
                    <span className="global-msg-title">{globalMessageNotif.senderName}</span>
                    <span className="global-msg-badge">Baru</span>
                  </div>
                  <div className="global-msg-text">
                    {globalMessageNotif.message}
                  </div>
                </div>
              </div>
            )}

            {/* 🔥 POPUP PANGGILAN GLOBAL 🔥 */}
            {globalIncomingCall && (
              <div style={{
                position: 'fixed', top: 'max(env(safe-area-inset-top, 20px), 20px)', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(46, 204, 113, 0.4)', borderRadius: '24px', padding: '12px 20px',
                display: 'flex', alignItems: 'center', gap: '15px', zIndex: 9999999,
                boxShadow: '0 15px 35px rgba(0,0,0,0.5)', width: '90%', maxWidth: '360px',
                animation: 'slideDownGlobal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}>
                <img src={globalIncomingCall.callerAvatar || '/asets/png/profile.webp'} className="global-call-avatar" alt="caller" />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {globalIncomingCall.callerName}
                  </div>
                  <div style={{ color: '#2ecc71', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-icons" style={{ fontSize: '12px' }}>ring_volume</span> Memanggil...
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleTolakGlobal} className="global-call-btn" style={{ background: '#ff4757', boxShadow: '0 4px 10px rgba(255, 71, 87, 0.4)' }}>
                    <span className="material-icons" style={{ fontSize: '20px' }}>call_end</span>
                  </button>
                  <button onClick={handleAngkatGlobal} className="global-call-btn" style={{ background: '#2ecc71', boxShadow: '0 4px 10px rgba(46, 204, 113, 0.4)' }}>
                    <span className="material-icons" style={{ fontSize: '20px' }}>call</span>
                  </button>
                </div>
              </div>
            )}
            
            {!hideSidebar && <Sidebar />}
            
            <div className={`layout-wrapper ${isStandaloneApp ? 'fixed-layout' : ''}`}>
              
              {isHomePage && (
                <div className="search-container" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', zIndex: 10 }}>
                  <SearchWrapper />
                </div>
              )}

              <main 
                className={`main-content ${hasNavbar ? 'with-bottom-nav' : ''} ${isFullscreenPage ? 'is-fullscreen' : ''}`}
                style={{ 
                  display: isStandaloneApp ? 'flex' : 'block',
                  minHeight: isStandaloneApp ? '100%' : '100dvh'
                }}
              >
                {children}
              </main>
            </div>

            {!hideNavbar && <Navbar />}
            
            <LoginPopup />
            {!hideOverlays && <Overlays />}
          </ThemeProvider>
        </I18nextProvider>
      </body>
    </html>
  );
}
