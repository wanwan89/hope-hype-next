'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Bell,
  MessageCircle,
  User,
  Mic,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
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

  // Hapus efek scroll hide: navbar selalu tampil (kecuali manual)
  useEffect(() => {
    setIsVisible(true);
    setIsManualHidden(false);
  }, [pathname]);

  // Halaman yang tidak menampilkan navbar
  const isLoginPage = pathname === '/login' || pathname?.startsWith('/login/');
  const isVoiceRoom =
    pathname?.includes('/voice-room') && pathname !== '/voice-room';
  const isDailyCekPage = pathname?.includes('/dailycek');
  const isSettingsPage = pathname?.includes('/settings');
  const isVipPage = pathname?.includes('/vip');
  const isContactPage = pathname?.includes('/contact');

  const isHiddenPage =
    isLoginPage ||
    isVoiceRoom ||
    isDailyCekPage ||
    isSettingsPage ||
    isVipPage ||
    isContactPage;

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

  const showNavbar = isVisible && !isManualHidden;

  const toggleButtonBottom = showNavbar
    ? `calc(65px + env(safe-area-inset-bottom) + 10px)`
    : `max(20px, env(safe-area-inset-bottom))`;

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

  // Varian animasi unik per ikon
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
      {/* Tombol toggle */}
      <button
        onClick={() => setIsManualHidden(!isManualHidden)}
        aria-label={
          isManualHidden ? 'Tampilkan Menu Navigasi' : 'Sembunyikan Menu Navigasi'
        }
        style={{
          position: 'fixed',
          bottom: toggleButtonBottom,
          right: '20px',
          zIndex: 9001,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-card)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid var(--border-card)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          color: 'var(--text-main)',
          transition: 'bottom 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          outline: 'none',
        }}
      >
        {isManualHidden ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

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

                <div
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    width: '5px',
                    height: '5px',
                    backgroundColor: '#00a2ff',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease',
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'scale(1)' : 'scale(0)',
                  }}
                />
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