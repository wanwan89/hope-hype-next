'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Bell, MessageCircle, User, Mic } from 'lucide-react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';

function NavbarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [isVisible, setIsVisible] = useState(true);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);
  
  const lastScrollY = useRef(0);

  const isInsideChatRoom = pathname === '/chat'; 

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

  // Reset visibilitas saat pindah halaman (biar gak nyangkut sembunyi)
  useEffect(() => {
    setIsVisible(true);
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

  if (isInsideChatRoom) return null;

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Chat', path: '/hypetalk', icon: MessageCircle, hasBadge: hasUnreadChat },
    { name: 'Voice', path: '/voice-room', icon: Mic },
    { name: 'Notif', path: '/notifications', icon: Bell, hasBadge: hasUnreadNotif },
    { name: 'Profil', path: '/profile', icon: User },
  ];

  return (
    <div style={{
      position: 'fixed', bottom: '20px', left: '0', right: '0',
      zIndex: 9000, display: 'flex', justifyContent: 'center', padding: '0 20px',
      willChange: 'transform, opacity',
      transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease',
      transform: isVisible ? 'translateY(0)' : 'translateY(150%)',
      opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none'
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

          return (
            <Link 
              key={item.name} 
              href={item.path}
              // FIX: Lepas pointer capture sebelum navigasi
              onPointerDown={(e) => {
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
                transition: 'all 0.3s', 
                padding: '10px',
                touchAction: 'manipulation' // FIX: Mencegah delay sentuhan
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon 
                  size={24} color={isActive ? '#00a2ff' : '#666666'} strokeWidth={isActive ? 2.5 : 2}
                  style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)', filter: isActive ? 'drop-shadow(0 0 8px rgba(0, 162, 255, 0.4))' : 'none', transition: 'all 0.3s' }}
                />
                {item.hasBadge && !isActive && (
                  <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', backgroundColor: '#ff4757', border: '2px solid #ffffff', borderRadius: '50%', boxShadow: '0 0 5px rgba(255, 71, 87, 0.5)' }} />
                )}
              </div>
              {isActive && (
                <div style={{ position: 'absolute', bottom: '-2px', width: '5px', height: '5px', backgroundColor: '#00a2ff', borderRadius: '50%', boxShadow: '0 0 10px #00a2ff' }} />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={null}>
      <NavbarContent />
    </Suspense>
  );
}
