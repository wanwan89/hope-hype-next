'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Bell, MessageCircle, User, AudioLines, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

function NavbarContent() {
  const pathname = usePathname();
  
  const [isVisible, setIsVisible] = useState(true);
  const [isManualHidden, setIsManualHidden] = useState(false);
  
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const [animatingIcon, setAnimatingIcon] = useState<string | null>(null);

  const lastScrollY = useRef(0);

  const isLoginPage = pathname === '/login' || pathname?.startsWith('/login/');
  const isHypetalkPage = pathname === '/hypetalk' || pathname?.startsWith('/hypetalk/');
  const isVoiceRoom = pathname?.includes('/voice-room') && pathname !== '/voice-room'; 
  const isDailyCekPage = pathname?.includes('/dailycek');
  const isSettingsPage = pathname?.includes('/settings');
  const isVipPage = pathname?.includes('/vip');
  const isContactPage = pathname?.includes('/contact');

  const isHiddenPage = isLoginPage || isHypetalkPage || isVoiceRoom || isDailyCekPage || isSettingsPage || isVipPage || isContactPage;

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

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Chat', path: '/hypetalk', icon: MessageCircle, badgeCount: unreadChatCount },
    { name: 'Voice', path: '/voice-room', icon: AudioLines }, 
    { name: 'Notif', path: '/notifications', icon: Bell, badgeCount: unreadNotifCount },
    { name: 'Profil', path: '/data', icon: User },
  ];

  const showNavbar = isVisible && !isManualHidden;

  // Posisi tombol toggle disesuaikan dengan navbar yang menempel di bawah
  const toggleButtonBottom = showNavbar
    ? `calc(65px + env(safe-area-inset-bottom) + 10px)`
    : `max(20px, env(safe-area-inset-bottom))`;

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, item: typeof navItems[0], isActive: boolean) => {
    if (isActive) {
      e.preventDefault(); 
      setAnimatingIcon(item.name);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
    
    setClickedItem(item.name);
    setTimeout(() => setClickedItem(null), 300);
  };

  return (
    <>
      {/* Tombol toggle sembunyi/tampilkan navbar */}
      <button
        onClick={() => setIsManualHidden(!isManualHidden)}
        aria-label={isManualHidden ? "Tampilkan Menu Navigasi" : "Sembunyikan Menu Navigasi"}
        style={{
          position: 'fixed',
          bottom: toggleButtonBottom,
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
          transition: 'bottom 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          outline: 'none'
        }}
      >
        {isManualHidden ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {/* Navbar menempel penuh di bawah */}
      <div style={{
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        zIndex: 9000,
        display: 'flex',
        justifyContent: 'center',
        transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease',
        transform: showNavbar ? 'translateY(0)' : 'translateY(150%)',
        opacity: showNavbar ? 1 : 0, 
        pointerEvents: showNavbar ? 'auto' : 'none'
      }}>
        <nav style={{
          width: '100%',
          height: `calc(65px + env(safe-area-inset-bottom))`,
          paddingBottom: 'env(safe-area-inset-bottom)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-around',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
          boxSizing: 'border-box'
        }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const isVoice = item.name === 'Voice'; 
            const Icon = item.icon;
            const isClicked = clickedItem === item.name;
            const isAnimating = animatingIcon === item.name;

            const normalColor = isVoice ? '#ffffff' : (isActive ? '#00a2ff' : '#666666');

            return (
              <Link 
                key={item.name} 
                href={item.path}
                aria-label={item.name}
                onClick={(e) => handleNavClick(e, item, isActive)} 
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
                  ...(isVoice ? {
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00a2ff, #bc13fe)', 
                    border: '4px solid white', 
                    marginTop: '-35px', 
                    boxShadow: isActive ? '0 0 20px rgba(188, 19, 254, 0.6)' : '0 8px 15px rgba(0, 162, 255, 0.3)',
                    transform: isClicked 
                      ? 'scale(0.85) translateY(10px)' 
                      : isActive 
                      ? 'scale(1.1) translateY(-8px)' 
                      : 'scale(1)', 
                    ...(isClicked ? { boxShadow: '0 2px 5px rgba(0,0,0,0.2)' } : {}),
                    transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)' 
                  } : {
                    transform: isClicked ? 'scale(0.8)' : isActive ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  })
                }}>
                  
                  <AnimatePresence mode="wait">
                    {isAnimating ? (
                      <motion.div
                        key="animating"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'absolute' }}
                      >
                        <motion.svg
                           width={isVoice ? 28 : 24} 
                           height={isVoice ? 28 : 24}
                           viewBox="0 0 24 24"
                           fill="none"
                           stroke={normalColor}
                           strokeWidth={isActive || isVoice ? 2.5 : 2}
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           style={{
                             filter: isActive && !isVoice ? 'drop-shadow(0 0 8px rgba(0, 162, 255, 0.4))' : 'none',
                           }}
                        >
                          <motion.g
                             initial={{ pathLength: 0, opacity: 0 }}
                             animate={{ pathLength: 1, opacity: 1 }}
                             transition={{ duration: 0.6, ease: "easeInOut" }}
                          >
                             <Icon />
                          </motion.g>
                        </motion.svg>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="static"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Icon 
                          size={isVoice ? 28 : 24} 
                          color={normalColor} 
                          strokeWidth={isActive || isVoice ? 2.5 : 2}
                          style={{ 
                            filter: isActive && !isVoice ? 'drop-shadow(0 0 8px rgba(0, 162, 255, 0.4))' : 'none',
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
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