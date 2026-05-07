'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
// 🔥 GANTI: Mic2 dihapus, AudioLines ditambah (ini ikon bar suara)
import { Home, Bell, MessageCircle, User, AudioLines, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';

function NavbarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [isVisible, setIsVisible] = useState(true);
  const [isManualHidden, setIsManualHidden] = useState(false);
  
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const lastScrollY = useRef(0);

  // --- CEK HALAMAN YANG NAVBARNYA HARUS ILANG ---
  const isChatRoom = pathname?.startsWith('/hypetalk/') && pathname !== '/hypetalk';
  const isVoiceRoom = pathname?.includes('/voice-room') && pathname !== '/voice-room'; 
  const isDailyCekPage = pathname?.includes('/dailycek');
  const isSettingsPage = pathname?.includes('/settings');
  const isVipPage = pathname?.includes('/vip');
  const isContactPage = pathname?.includes('/contact');

  const isHiddenPage = isChatRoom || isVoiceRoom || isDailyCekPage || isSettingsPage || isVipPage || isContactPage;

  useEffect(() => {
    if (isHiddenPage) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname, isHiddenPage]);

  useEffect(() => {
    setIsVisible(true);
    setIsManualHidden(false); 
  }, [pathname]);

  // --- LOGIKA MENGHITUNG PESAN & NOTIFIKASI ---
  useEffect(() => {
    let isMounted = true;
    let badgeChannel: any;

    const fetchBadges = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      const { count: chatCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .ilike('room_id', `pv_%${userId}%`) 
        .neq('user_id', userId) 
        .neq('status', 'read'); 

      if (isMounted && chatCount !== null) {
        setUnreadChatCount(chatCount);
      }

      const { count: notifCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false); 

      if (isMounted && notifCount !== null) {
        setUnreadNotifCount(notifCount);
      }

      const uniqueChannelName = `navbar-badges-${userId}-${Date.now()}`;

      badgeChannel = supabase.channel(uniqueChannelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new.room_id.includes(userId) && payload.new.user_id !== userId) {
            setUnreadChatCount(prev => prev + 1);
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new.status === 'read' && payload.old.status !== 'read') {
             setUnreadChatCount(prev => Math.max(0, prev - 1));
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
          if (payload.new.user_id === userId) {
            setUnreadNotifCount(prev => prev + 1);
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (payload) => {
           if (payload.new.is_read === true && payload.new.user_id === userId) {
             checkRemainingNotifs(userId);
           }
        })
        .subscribe();
    };

    const checkRemainingNotifs = async (userId: string) => {
       const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false); 
       
       if (isMounted && count !== null) {
         setUnreadNotifCount(count);
       }
    };

    fetchBadges();
    
    return () => {
      isMounted = false;
      if (badgeChannel) supabase.removeChannel(badgeChannel);
    };
  }, [pathname]); 

  if (isHiddenPage) {
    return null;
  }

  // 🔥 FIX: Pakai AudioLines buat Voice 🔥
  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Chat', path: '/hypetalk', icon: MessageCircle, badgeCount: unreadChatCount },
    { name: 'Voice', path: '/voice-room', icon: AudioLines }, 
    { name: 'Notif', path: '/notifications', icon: Bell, badgeCount: unreadNotifCount },
    { name: 'Profil', path: '/data', icon: User },
  ];

  const showNavbar = isVisible && !isManualHidden;

  return (
    <>
      {/* Tombol Toggle Navbar dengan Safe Area */}
      <button
        onClick={() => setIsManualHidden(!isManualHidden)}
        style={{
          position: 'fixed',
          bottom: isManualHidden ? 'max(20px, env(safe-area-inset-bottom))' : 'max(95px, calc(95px + env(safe-area-inset-bottom)))', 
          right: '20px',
          zIndex: 9001,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          color: '#333',
          transform: isVisible ? 'translateY(0)' : 'translateY(150px)',
          transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          outline: 'none'
        }}
      >
        {isManualHidden ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {/* Container Navbar Utama dengan Safe Area */}
      <div style={{
        position: 'fixed', 
        bottom: 'max(20px, env(safe-area-inset-bottom))', 
        left: '0', 
        right: '0',
        zIndex: 9000, 
        display: 'flex', 
        justifyContent: 'center', 
        padding: '0 20px',
        transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease',
        transform: showNavbar ? 'translateY(0)' : 'translateY(150%)',
        opacity: showNavbar ? 1 : 0, 
        pointerEvents: showNavbar ? 'auto' : 'none'
      }}>
        <nav style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)', 
          border: '1px solid rgba(0, 0, 0, 0.05)',
          borderRadius: '25px', 
          width: '100%', 
          maxWidth: '400px', 
          height: '65px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-around',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
          padding: '0 5px'
        }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const isVoice = item.name === 'Voice'; 
            const Icon = item.icon;
            const isClicked = clickedItem === item.name;

            return (
              <Link 
                key={item.name} 
                href={item.path}
                onPointerDown={(e) => {
                  setClickedItem(item.name);
                  setTimeout(() => setClickedItem(null), 300); 
                  const target = e.currentTarget;
                  try {
                    if (target.hasPointerCapture(e.pointerId)) {
                      target.releasePointerCapture(e.pointerId);
                    }
                  } catch (err) {}
                }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  textDecoration: 'none', 
                  position: 'relative', 
                  padding: '10px',
                  touchAction: 'manipulation',
                  width: '60px',
                  WebkitTapHighlightColor: 'transparent' 
                }}
              >
                <div style={{ 
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // 🔥 FIX: Upgrade Tampilan & Animasi Voice 🔥
                  ...(isVoice ? {
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00a2ff, #bc13fe)', 
                    border: '4px solid white', 
                    marginTop: '-35px', 
                    // Base Shadow
                    boxShadow: isActive ? '0 0 20px rgba(188, 19, 254, 0.6)' : '0 8px 15px rgba(0, 162, 255, 0.3)',
                    
                    // 🔥 Animasi Ditekan: Sedikit Melesap ke bawah + Mengecil (Native Feel) 🔥
                    transform: isClicked 
                      ? 'scale(0.85) translateY(10px)' // Pressed state (lebih "dalam")
                      : isActive 
                      ? 'scale(1.1) translateY(-8px)' // Elevated active state
                      : 'scale(1)', 
                      
                    // Shadow berubah pas ditekan
                    ...(isClicked ? {
                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)' 
                    } : {}),

                    // Transisi lebih lambat dikit (0.5s) tapi kurva lebih "snap" ala iOS spring
                    transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)' 
                  } : {
                    // Item Standar Pas Ditekan
                    transform: isClicked ? 'scale(0.8)' : isActive ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  })
                }}>
                  <Icon 
                    // 🔥 FIX: Sedikit lebih besar ikonnya 🔥
                    size={isVoice ? 28 : 24} 
                    color={isVoice ? '#ffffff' : (isActive ? '#00a2ff' : '#666666')} 
                    strokeWidth={isActive || isVoice ? 2.5 : 2}
                    style={{ 
                      filter: isActive && !isVoice ? 'drop-shadow(0 0 8px rgba(0, 162, 255, 0.4))' : 'none',
                    }}
                  />
                  
                  {item.badgeCount !== undefined && item.badgeCount > 0 && !isActive && (
                    <div style={{ 
                      position: 'absolute', top: isVoice ? '0px' : '-4px', right: isVoice ? '0px' : '-8px', 
                      backgroundColor: '#ff4757', color: 'white', 
                      fontSize: '10px', fontWeight: 'bold', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '2px 5px', minWidth: '18px', height: '18px',
                      borderRadius: '10px', border: '2px solid #ffffff', 
                      boxShadow: '0 0 5px rgba(255, 71, 87, 0.5)',
                      zIndex: 10
                    }}>
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </div>
                  )}
                </div>
                
                {!isVoice && (
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '2px', 
                    width: '5px', 
                    height: '5px', 
                    backgroundColor: '#00a2ff', 
                    borderRadius: '50%', 
                    boxShadow: '0 0 10px #00a2ff',
                    transition: 'all 0.3s ease',
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'scale(1)' : 'scale(0)'
                  }} />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={null}>
      <NavbarContent />
    </Suspense>
  );
}
