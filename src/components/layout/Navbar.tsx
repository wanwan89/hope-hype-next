'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
// Ganti Mic jadi Mic2 (lebih khas Voice Room)
import { Home, Bell, MessageCircle, User, Mic2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';

function NavbarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [isVisible, setIsVisible] = useState(true);
  const [isManualHidden, setIsManualHidden] = useState(false);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);
  
  // FIX 1: State untuk trigger animasi klik
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  
  const lastScrollY = useRef(0);

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
        .eq('status', 'sent'); 

      if (isMounted && chatCount && chatCount > 0) setHasUnreadChat(true);

      const { count: notifCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false); 

      if (isMounted && notifCount && notifCount > 0) setHasUnreadNotif(true);

      badgeChannel = supabase.channel('navbar-badges')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new.room_id.includes(userId) && payload.new.user_id !== userId) {
            setHasUnreadChat(true);
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

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Chat', path: '/hypetalk', icon: MessageCircle, hasBadge: hasUnreadChat },
    // Ikon diganti jadi Mic2
    { name: 'Voice', path: '/voice-room', icon: Mic2 },
    { name: 'Notif', path: '/notifications', icon: Bell, hasBadge: hasUnreadNotif },
    { name: 'Profil', path: '/profile', icon: User },
  ];

  const showNavbar = isVisible && !isManualHidden;

  return (
    <>
      {/* Tombol Toggle */}
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

      {/* NAVBAR UTAMA */}
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
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
        }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            // FIX 2: Cek apakah item ini sedang diklik untuk animasi
            const isClicked = clickedItem === item.name;

            return (
              <Link 
                key={item.name} 
                href={item.path}
                onPointerDown={(e) => {
                  // Trigger animasi klik
                  setClickedItem(item.name);
                  setTimeout(() => setClickedItem(null), 200);

                  const target = e.currentTarget;
                  if (target.hasPointerCapture(e.pointerId)) {
                    target.releasePointerCapture(e.pointerId);
                  }
                }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  textDecoration: 'none', 
                  position: 'relative', 
                  padding: '10px',
                  touchAction: 'manipulation' 
                }}
              >
                <div style={{ 
                  position: 'relative',
                  // Animasi Pop (Scale up pas aktif, scale down dikit pas diklik)
                  transform: isClicked ? 'scale(0.8)' : isActive ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                  <Icon 
                    size={24} 
                    color={isActive ? '#00a2ff' : '#666666'} 
                    strokeWidth={isActive ? 2.5 : 2}
                    style={{ 
                      filter: isActive ? 'drop-shadow(0 0 8px rgba(0, 162, 255, 0.4))' : 'none',
                    }}
                  />
                  {item.hasBadge && !isActive && (
                    <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', backgroundColor: '#ff4757', border: '2px solid #ffffff', borderRadius: '50%', boxShadow: '0 0 5px rgba(255, 71, 87, 0.5)' }} />
                  )}
                </div>
                {/* Indikator titik di bawah */}
                <div style={{ 
                  position: 'absolute', 
                  bottom: '6px', 
                  width: '5px', 
                  height: '5px', 
                  backgroundColor: '#00a2ff', 
                  borderRadius: '50%', 
                  boxShadow: '0 0 10px #00a2ff',
                  transition: 'all 0.3s ease',
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? 'scale(1)' : 'scale(0)'
                }} />
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
