'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Bell,
  MessageCircle,
  User,
  Mic,
} from 'lucide-react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

function NavbarContent() {
  const pathname = usePathname();

  const [isVisible, setIsVisible] = useState(true);
  const prevScrollY = useRef(0);

  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const [animatingIcon, setAnimatingIcon] = useState<string | null>(null);

  // Scroll otomatis hanya di Home
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

  // Halaman yang tidak menampilkan navbar
  const isLoginPage = pathname === '/login' || pathname?.startsWith('/login/');
  const isDailyCekPage = pathname?.includes('/dailycek');
  const isSettingsPage = pathname?.includes('/settings');
  const isVipPage = pathname?.includes('/vip');
  const isContactPage = pathname?.includes('/contact');
  const isCreatePage = pathname?.startsWith('/create');
  const isSearchPage = pathname?.startsWith('/search');

  const isHiddenPage =
    isLoginPage ||
    isDailyCekPage ||
    isSettingsPage ||
    isVipPage ||
    isContactPage ||
    isCreatePage ||
    isSearchPage;

  // --- LOGIKA BADGE PESAN & NOTIFIKASI ---
  useEffect(() => {
    let isMounted = true;
    let badgeChannel: any;

    const fetchBadges = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      const { count: chatCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .ilike('room_id', `pv_%${userId}%`)
        .neq('user_id', userId)
        .neq('status', 'read');

      if (isMounted && chatCount !== null) setUnreadChatCount(chatCount);

      const { count: notifCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (isMounted && notifCount !== null) setUnreadNotifCount(notifCount);

      const uniqueChannelName = `navbar-badges-${userId}-${Date.now()}`;
      badgeChannel = supabase
        .channel(uniqueChannelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            if (
              payload.new.room_id.includes(userId) &&
              payload.new.user_id !== userId
            ) {
              setUnreadChatCount((prev) => prev + 1);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          (payload) => {
            if (
              payload.new.status === 'read' &&
              payload.old.status !== 'read'
            ) {
              setUnreadChatCount((prev) => Math.max(0, prev - 1));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            if (payload.new.user_id === userId)
              setUnreadNotifCount((prev) => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications' },
          (payload) => {
            if (payload.new.is_read === true && payload.new.user_id === userId)
              checkRemainingNotifs(userId);
          }
        )
        .subscribe();
    };

    const checkRemainingNotifs = async (userId: string) => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (isMounted && count !== null) setUnreadNotifCount(count);
    };

    fetchBadges();

    return () => {
      isMounted = false;
      if (badgeChannel) supabase.removeChannel(badgeChannel);
    };
  }, [pathname]);

  if (isHiddenPage) return null;

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Chat', path: '/hypetalk', icon: MessageCircle, badgeCount: unreadChatCount },
    { name: 'Voice', path: '/voice-room', icon: Mic },
    { name: 'Notif', path: '/notifications', icon: Bell, badgeCount: unreadNotifCount },
    { name: 'Profil', path: '/data', icon: User },
  ];

  const showNavbar = isVisible;

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: (typeof navItems)[0],
    isActive: boolean
  ) => {
    if (isActive) {
      e.preventDefault();
      setAnimatingIcon(item.name);
      setTimeout(() => window.location.reload(), 800);
    }
    setClickedItem(item.name);
    setTimeout(() => setClickedItem(null), 300);
  };

  const getIconVariants = (name: string) => {
    switch (name) {
      case 'Home':
        return {
          hidden: { rotate: -180, opacity: 0, scale: 0.5 },
          visible: { rotate: 0, opacity: 1, scale: 1 },
        };
      case 'Chat':
        return {
          hidden: { x: -20, opacity: 0 },
          visible: { x: 0, opacity: 1 },
        };
      case 'Voice':
        return {
          hidden: { scale: 0, opacity: 0 },
          visible: { scale: 1, opacity: 1 },
        };
      case 'Notif':
        return {
          hidden: { rotate: 20, opacity: 0, scale: 0.8 },
          visible: { rotate: 0, opacity: 1, scale: 1 },
        };
      case 'Profil':
        return {
          hidden: { y: 20, opacity: 0 },
          visible: { y: 0, opacity: 1 },
        };
      default:
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        };
    }
  };

  return (
    <>
      {/* Navbar full width bottom */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9000,
          display: 'flex',
          justifyContent: 'center',
          transition:
            'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease',
          transform: showNavbar ? 'translateY(0)' : 'translateY(150%)',
          opacity: showNavbar ? 1 : 0,
          pointerEvents: showNavbar ? 'auto' : 'none',
        }}
      >
        <nav
          style={{
            width: '100%',
            height: `calc(65px + env(safe-area-inset-bottom))`,
            paddingBottom: 'env(safe-area-inset-bottom)',
            backgroundColor: 'var(--bg-card)',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
            borderTop: '1px solid var(--border-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            boxSizing: 'border-box',
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            const isClicked = clickedItem === item.name;
            const isAnimating = animatingIcon === item.name;

            const normalColor = isActive ? '#00a2ff' : 'var(--text-muted)';

            const iconVariant = getIconVariants(item.name);

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
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isClicked
                      ? 'scale(0.8)'
                      : isActive
                      ? 'scale(1.15)'
                      : 'scale(1)',
                    transition:
                      'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  }}
                >
                  <AnimatePresence mode="wait">
                    {isAnimating ? (
                      <motion.div
                        key="animating"
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={iconVariant}
                        transition={{ duration: 0.4 }}
                        style={{ position: 'absolute' }}
                      >
                        <Icon
                          size={24}
                          color={normalColor}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="static"
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={iconVariant}
                        transition={{ duration: 0.4 }}
                      >
                        <Icon
                          size={24}
                          color={normalColor}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {item.badgeCount !== undefined &&
                    item.badgeCount > 0 &&
                    !isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-8px',
                          backgroundColor: '#ff4757',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2px 5px',
                          minWidth: '18px',
                          height: '18px',
                          borderRadius: '10px',
                          border: '2px solid var(--bg-card)',
                          zIndex: 10,
                        }}
                      >
                        {item.badgeCount > 99 ? '99+' : item.badgeCount}
                      </div>
                    )}
                </div>
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