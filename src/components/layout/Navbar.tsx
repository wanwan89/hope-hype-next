'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Bell, MessageCircle, User, Mic2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';

function NavbarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [isVisible, setIsVisible] = useState(true);
  const [isManualHidden, setIsManualHidden] = useState(false);
  
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);
  
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const lastScrollY = useRef(0);

  const isChatRoom = pathname?.startsWith('/hypetalk/') && pathname !== '/hypetalk';
  const isVoiceRoom = pathname?.includes('/voice-room'); 

  useEffect(() => {
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
  }, []);

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

      if (isMounted && notifCount && notifCount > 0) setHasUnreadNotif(true);

      // 🔥 FIX SUPABASE REALTIME: Unik per render 🔥
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
            setHasUnreadNotif(true);
          }
        })
        .subscribe();
    };

    fetchBadges();
    
    return () => {
      isMounted = false;
      if (badgeChannel) supabase.removeChannel(badgeChannel);
    };
  }, [pathname]); 

  // Navbar disembunyikan jika di dalam chat room atau voice room
  if (isChatRoom || isVoiceRoom) {
    return null;
  }

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Chat', path: '/hypetalk', icon: MessageCircle, badgeCount: unreadChatCount },
    { name: 'Voice', path: '/voice-room', icon: Mic2 }, // Icon Mic keren
    { name: 'Notif', path: '/notifications', icon: Bell, hasDot: hasUnreadNotif },
    { name: 'Profil', path: '/profile', icon: User },
  ];

  const showNavbar = isVisible && !isManualHidden;

  return (
    <>
      <button
        onClick={() => setIsManualHidden(!isManualHidden)}
        style={{
          position: 'fixed',
          bottom: isManualHidden ? '20px' : '95px', 
          right: '20px',
          zIndex: 9001,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          color: '#333',
          transform: isVisible ? 'translateY(0)' : 'translateY(150px)',
          transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          outline: 'none'
        }}
      >
        {isManualHidden ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      <div style={{
        position: 'fixed', bottom: '20px', left: '0', right: '0',
        zIndex: 9000, display: 'flex', justifyContent: 'center', padding: '0 20px',
        willChange: 'transform, opacity',
        transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease',
        transform: showNavbar ? 'translateY(0)' : 'translateY(150%)',
        opacity: showNavbar ? 1 : 0, 
        pointerEvents: showNavbar ? 'auto' : 'none'
      }}>
        <nav style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)', border: '1px solid rgba(0, 0, 0, 0.05)',
          borderRadius: '25px', width: '100%', maxWidth: '400px', height: '65px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
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
                  // 🔥 FIX 3: Tambahin try-catch buat ngakalin error releasePointerCapture di HP 🔥
                  try {
                    if (target.hasPointerCapture(e.pointerId)) {
                      target.releasePointerCapture(e.pointerId);
                    }
                  } catch (err) {
                    // Cuekin aja error-nya, aman!
                  }
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
                  width: '60px' 
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
                    boxShadow: isActive ? '0 0 20px rgba(188, 19, 254, 0.6)' : '0 8px 15px rgba(0, 162, 255, 0.3)',
                    marginTop: '-35px', 
                    border: '4px solid white', 
                    transform: isClicked ? 'scale(0.7) rotate(-15deg)' : isActive ? 'scale(1.05) translateY(-5px)' : 'scale(1)',
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                  } : {
                    transform: isClicked ? 'scale(0.8)' : isActive ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  })
                }}>
                  <Icon 
                    size={isVoice ? 26 : 24} 
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

                  {item.hasDot && !isActive && (
                    <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', backgroundColor: '#ff4757', border: '2px solid #ffffff', borderRadius: '50%', boxShadow: '0 0 5px rgba(255, 71, 87, 0.5)' }} />
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
