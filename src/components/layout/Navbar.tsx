'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Home,
  Bell,
  MessageCircle,
  User,
  Mic,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

function CircularChase() {
  return (
    <motion.div
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: '3px solid rgba(128,128,128,0.3)',
        borderTopColor: '#1f3cff',
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

  // Scroll hanya di Home
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

  const isLoginPage = pathname === '/login' || pathname?.startsWith('/login/');
  const isDailyCekPage = pathname?.includes('/dailycek');
  const isSettingsPage = pathname?.includes('/settings');
  const isVipPage = pathname?.includes('/vip');
  const isContactPage = pathname?.includes('/contact');
  const isCreatePage = pathname?.startsWith('/create');
  const isSearchPage = pathname?.startsWith('/search');
  const isRoomPage = pathname?.startsWith('/hypetalk/room');
  const isInsideVoiceRoom = pathname === '/voice' && searchParams?.get('id') !== null;
  const isSaldoPage = pathname?.includes('/saldo');
  const isStoryPage = pathname?.includes('/story');
  const isPendingPage = pathname?.includes('/pending');
  const isHistoryCoinPage = pathname?.includes('/historycoin');
  const isWithdrawPage = pathname?.includes('/withdraw');

  const isHiddenPage =
    isLoginPage ||
    isDailyCekPage ||
    isSettingsPage ||
    isVipPage ||
    isContactPage ||
    isCreatePage ||
    isSearchPage ||
    isRoomPage ||
    isInsideVoiceRoom ||
    isSaldoPage ||
    isStoryPage ||
    isPendingPage ||
    isHistoryCoinPage ||
    isWithdrawPage;

  // --- DATA & REALTIME ---
  useEffect(() => {
    let isMounted = true;
    let badgeChannel: any;

    const fetchBadgesAndUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (isMounted && profile?.avatar_url) {
        let url = profile.avatar_url;
        if (url.includes('res.cloudinary.com') && !url.includes('f_auto')) {
          url = url.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
        }
        setAvatarUrl(url);
      }

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

      // Bersihkan channel lama dan buat baru
      if (badgeChannel) {
        supabase.removeChannel(badgeChannel);
      }
      const uniqueChannelName = `navbar-badges-${userId}-${Date.now()}`;
      badgeChannel = supabase
        .channel(uniqueChannelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new.room_id.includes(userId) && payload.new.user_id !== userId) {
            setUnreadChatCount((prev) => prev + 1);
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new.status === 'read' && payload.old.status !== 'read') {
            setUnreadChatCount((prev) => Math.max(0, prev - 1));
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
          if (payload.new.user_id === userId) {
            setUnreadNotifCount((prev) => prev + 1);
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, async (payload) => {
          if (payload.new.user_id === userId) {
            // Hitung ulang total unread setiap kali ada update
            const { count } = await supabase
              .from('notifications')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
              .eq('is_read', false);
            if (isMounted && count !== null) setUnreadNotifCount(count);
          }
        })
        .subscribe();
    };

    fetchBadgesAndUser();

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
    // Reset badge notifikasi saat ikon Notif diklik
    if (item.name === 'Notif') {
      setUnreadNotifCount(0);
    }
    if (isActive) {
      e.preventDefault();
      setAnimatingIcon(item.name);
      setTimeout(() => window.location.reload(), 800);
    }
    setClickedItem(item.name);
    setTimeout(() => setClickedItem(null), 300);
  };

  return (
    <>
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
          transform: showNavbar ? 'translateY(0)' : 'translateY(150%)',
          opacity: showNavbar ? 1 : 0,
          pointerEvents: showNavbar ? 'auto' : 'none',
        }}
      >
        <nav
          style={{
            width: '100%',
            height: `calc(55px + env(safe-area-inset-bottom))`,
            paddingBottom: 'env(safe-area-inset-bottom)',
            backgroundColor: 'var(--bg-main)',
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
            const isActive = pathname === item.path || (item.path === '/voice-room' && pathname === '/voice' && !isInsideVoiceRoom);
            const Icon = item.icon;
            const isClicked = clickedItem === item.name;
            const isAnimating = animatingIcon === item.name;

            const normalColor = isActive ? '#1f3cff' : 'var(--text-main)';

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
                  padding: '4px',
                  touchAction: 'manipulation',
                  width: '50px',
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
                      ? 'scale(1.1)'
                      : 'scale(1)',
                    transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
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
                        style={{
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
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
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          padding: '1px',
                          border: isActive ? `1.5px solid ${normalColor}` : '1.5px solid transparent',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <img
                          src={avatarUrl}
                          alt="Profil"
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        key="icon"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon
                          size={22}
                          color={normalColor}
                          fill={isActive && item.name !== 'Profil' ? normalColor : 'none'}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {item.badgeCount !== undefined &&
                    item.badgeCount > 0 &&
                    !isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          backgroundColor: '#ff4757',
                          color: 'white',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '1px 3px',
                          minWidth: '14px',
                          height: '14px',
                          borderRadius: '10px',
                          border: '2px solid var(--bg-main)',
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