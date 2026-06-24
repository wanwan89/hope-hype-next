'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Bell, MessageCircle, User, Mic } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

function CircularChase() {
  return (
    <motion.div
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: '3px solid rgba(128,128,128,0.2)',
        borderTopColor: '#1f3cff', // Premium Fintech Blue
      }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
    />
  );
}

function NavbarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isVisible, setIsVisible] = useState(true);
  const prevScrollY = useRef(0);

  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const [animatingIcon, setAnimatingIcon] = useState<string | null>(null);

  // Scroll Behavior
  useEffect(() => {
    if (pathname !== '/') {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > prevScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      } else if (currentScrollY < prevScrollY.current) {
        setIsVisible(true);
      }
      prevScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  const isHiddenPage = [
    '/login', '/dailycek', '/settings', '/vip', '/contact', 
    '/create', '/search', '/hypetalk/room', '/saldo', 
    '/story', '/pending', '/historycoin', '/withdraw'
  ].some(path => pathname?.includes(path)) || 
  (pathname === '/voice' && searchParams?.get('id') !== null);

  // ✅ FUNGSI FETCH UTAMA (Parallel & Optimized)
  const fetchBadgesAndUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    // 🔥 Parallel Fetching untuk performa 3x lipat lebih cepat
    const [profileRes, chatRes, notifRes] = await Promise.all([
      supabase.from('profiles').select('avatar_url').eq('id', userId).single(),
      
      // Fix Chat Query: Lebih dinamis membaca room_id & handle null status
      supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .ilike('room_id', `%${userId}%`)
        .neq('user_id', userId)
        .or('status.neq.read,status.is.null'), // Antisipasi status belum di-set
        
      // Fix Notif Query: Mengabaikan "Ghost Notifications" agar count akurat (Sama dengan UI)
      supabase.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .not('type', 'in', '("like","comment","repost","save","comment_like")') 
    ]);

    // Set Avatar
    if (profileRes.data?.avatar_url) {
      let url = profileRes.data.avatar_url;
      if (url.includes('res.cloudinary.com') && !url.includes('f_auto')) {
        url = url.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
      }
      setAvatarUrl(url);
    }

    // Set Badges
    if (chatRes.count !== null) setUnreadChatCount(chatRes.count);
    if (notifRes.count !== null) setUnreadNotifCount(notifRes.count);
  };

  useEffect(() => {
    fetchBadgesAndUser();

    const handleRefresh = () => fetchBadgesAndUser();
    window.addEventListener('notif-count-changed', handleRefresh);
    
    return () => window.removeEventListener('notif-count-changed', handleRefresh);
  }, [pathname]);

  if (isHiddenPage) return null;

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Chat', path: '/hypetalk', icon: MessageCircle, badgeCount: unreadChatCount },
    { name: 'Voice', path: '/voice-room', icon: Mic },
    { name: 'Notif', path: '/notifications', icon: Bell, badgeCount: unreadNotifCount },
    { name: 'Profil', path: '/data', icon: User },
  ];

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: (typeof navItems)[0],
    isActive: boolean
  ) => {
    // Optimistic UI update agar instan
    if (item.name === 'Notif') setUnreadNotifCount(0);
    if (item.name === 'Chat') setUnreadChatCount(0);

    if (isActive) {
      e.preventDefault();
      setAnimatingIcon(item.name);
      setTimeout(() => window.location.reload(), 800);
    }
    setClickedItem(item.name);
    setTimeout(() => setClickedItem(null), 300);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        display: 'flex',
        justifyContent: 'center',
        transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease',
        transform: isVisible ? 'translateY(0)' : 'translateY(150%)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <nav
        style={{
          width: '100%',
          height: `calc(60px + env(safe-area-inset-bottom))`,
          paddingBottom: 'env(safe-area-inset-bottom)',
          backgroundColor: 'var(--bg-main, rgba(255, 255, 255, 0.85))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)', // Glassmorphism
          borderTop: '1px solid rgba(128, 128, 128, 0.15)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.03)', // Soft Claymorphism shadow
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          boxSizing: 'border-box',
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path === '/voice-room' && pathname === '/voice' && !isInsideVoiceRoom);
          const Icon = item.icon;
          const isClicked = clickedItem === item.name;
          const isAnimating = animatingIcon === item.name;

          const normalColor = isActive ? '#1f3cff' : '#737373';

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
                padding: '6px',
                touchAction: 'manipulation',
                width: '55px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: isClicked ? 'scale(0.8)' : isActive ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
              >
                <AnimatePresence mode="wait">
                  {isAnimating ? (
                    <motion.div
                      key="spinner"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ position: 'absolute', display: 'flex' }}
                    >
                      <CircularChase />
                    </motion.div>
                  ) : item.name === 'Profil' && avatarUrl ? (
                    <div
                      key="avatar"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        padding: '2px',
                        border: isActive ? `2px solid ${normalColor}` : '2px solid transparent',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <img
                        src={avatarUrl}
                        alt="Profil"
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div key="icon" style={{ display: 'flex' }}>
                      <Icon
                        size={24}
                        color={normalColor}
                        fill={isActive && item.name !== 'Profil' ? normalColor : 'none'}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                    </div>
                  )}
                </AnimatePresence>

                {/* Premium Animated Badge */}
                {item.badgeCount !== undefined && item.badgeCount > 0 && !isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-8px',
                      backgroundColor: '#FF3B30',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px 5px',
                      minWidth: '16px',
                      height: '16px',
                      borderRadius: '12px',
                      border: '2px solid var(--bg-main, #ffffff)',
                      boxShadow: '0 2px 6px rgba(255, 59, 48, 0.4)',
                      zIndex: 10,
                    }}
                  >
                    {item.badgeCount > 99 ? '99+' : item.badgeCount}
                  </motion.div>
                )}
              </div>
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
