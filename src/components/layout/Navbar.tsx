'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Home, Bell, MessageCircle, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// Komponen Custom SVG untuk Voice
const CustomVoiceIcon = ({ size = 24, color = '#000000', style }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 512 512"
    style={style}
  >
    <path
      fill={color}
      d="M192 32c0 17.7 14.3 32 32 32c123.7 0 224 100.3 224 224c0 17.7 14.3 32 32 32s32-14.3 32-32C512 128.9 383.1 0 224 0c-17.7 0-32 14.3-32 32m0 96c0 17.7 14.3 32 32 32c70.7 0 128 57.3 128 128c0 17.7 14.3 32 32 32s32-14.3 32-32c0-106-86-192-192-192c-17.7 0-32 14.3-32 32m-96 16c0-26.5-21.5-48-48-48S0 117.5 0 144v224c0 79.5 64.5 144 144 144s144-64.5 144-144s-64.5-144-144-144h-16v96h16c26.5 0 48 21.5 48 48s-21.5 48-48 48s-48-21.5-48-48z"
    />
  </svg>
);

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
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const [animatingIcon, setAnimatingIcon] = useState<string | null>(null);

  // 1. Cek status login secara real-time
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const hasVoiceId = searchParams ? searchParams.get('id') !== null : false;

  // [PERBAIKAN] Logika untuk pengecekan rute agar voice-room tidak ikut tersembunyi
  const isHiddenPage = [
    '/login', '/dailycek', '/settings', '/vip', '/contact', 
    '/create', '/search', '/saldo', '/story', 
    '/pending', '/historycoin', '/withdraw',
    '/hypetalk/room' 
  ].some(path => pathname?.startsWith(path)) || 
  (pathname?.startsWith('/voice') && !pathname?.startsWith('/voice-room'));

  // Menggunakan useCallback agar fungsi ini stabil dan bisa dipanggil di berbagai useEffect
  const fetchBadgesAndUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    const [profileRes, chatRes, dbNotifRes] = await Promise.all([
      supabase.from('profiles').select('avatar_url').eq('id', userId).single(),
      supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .ilike('room_id', `%${userId}%`)
        .neq('user_id', userId)
        .or('status.neq.read,status.is.null'),
      supabase.from('notifications')
        .select('type')
        .eq('user_id', userId)
        .eq('is_read', false)
    ]);

    if (profileRes.data?.avatar_url) {
      let url = profileRes.data.avatar_url;
      if (url.includes('res.cloudinary.com') && !url.includes('f_auto')) {
        url = url.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
      }
      setAvatarUrl(url);
    }
    
    if (chatRes.error) {
      console.error("Error mengambil unread chat:", chatRes.error.message);
    } else if (chatRes.count !== null) {
      setUnreadChatCount(chatRes.count);
    }

    const synthesizeTypes = ['like', 'comment', 'repost', 'save', 'comment_like', 'follow'];
    let unreadNotifs = (dbNotifRes.data || []).filter(n => !synthesizeTypes.includes(n.type)).length;

    let readSet = new Set<string>();
    if (typeof window !== 'undefined') {
      try { readSet = new Set(JSON.parse(localStorage.getItem('read_notifs_local') || '[]')); } catch (e) {}
    }

    const { data: myPosts } = await supabase.from('posts').select('id').eq('creator_id', userId);
    const postIds = myPosts?.map((p: any) => p.id) || [];
    
    const { data: myComments } = await supabase.from('comments').select('id').eq('user_id', userId);
    const commentIds = myComments?.map((c: any) => c.id) || [];

    const promises: Promise<any>[] = [
      supabase.from('followers').select('follower_id').eq('following_id', userId),
      supabase.from('coin_transactions').select('id').eq('user_id', userId).gt('amount', 0).limit(20),
      supabase.from('payments').select('id').eq('user_id', userId).limit(20)
    ];

    if (postIds.length > 0) {
      promises.push(
        supabase.from('likes').select('id, post_id, user_id, created_at').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30),
        supabase.from('comments').select('id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30),
        supabase.from('reposts').select('id, post_id, user_id, created_at').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30),
        supabase.from('bookmarks').select('id, post_id, user_id, created_at').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30)
      );
    } else {
      promises.push(Promise.resolve({data:[]}), Promise.resolve({data:[]}), Promise.resolve({data:[]}), Promise.resolve({data:[]}));
    }

    if (commentIds.length > 0) {
      promises.push(supabase.from('comment_likes').select('id').in('comment_id', commentIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(20));
    } else {
      promises.push(Promise.resolve({data:[]}));
    }

    const [fRes, coinRes, payRes, likesRes, commentsRes, repostsRes, savesRes, cLikesRes] = await Promise.all(promises);

    (fRes.data || []).forEach((f: any) => { if (!readSet.has(`follow-${f.follower_id}`)) unreadNotifs++; });
    (coinRes.data || []).forEach((c: any) => { if (!readSet.has(`coin-${c.id}`)) unreadNotifs++; });
    (payRes.data || []).forEach((p: any) => { if (!readSet.has(`pay-${p.id}`)) unreadNotifs++; });
    (commentsRes.data || []).forEach((c: any) => { if (!readSet.has(`comment-${c.id}`)) unreadNotifs++; });
    (cLikesRes.data || []).forEach((cl: any) => { if (!readSet.has(`comment_like-${cl.id}`)) unreadNotifs++; });

    const countGrouped = (data: any[], type: string) => {
      const byPost: Record<string, any[]> = {};
      data.forEach((item: any) => {
        if (!byPost[item.post_id]) byPost[item.post_id] = [];
        byPost[item.post_id].push(item);
      });
      let count = 0;
      Object.entries(byPost).forEach(([postId, items]) => {
        const uniqueMap = new Map(items.map((i: any) => [i.user_id, i]));
        const uniqueUsers = Array.from(uniqueMap.values());
        if (uniqueUsers.length === 1) {
          if (!readSet.has(`${type}-${(uniqueUsers[0] as any).id}`)) count++;
        } else if (uniqueUsers.length > 1) {
          if (!readSet.has(`${type}_group-${postId}`)) count++;
        }
      });
      return count;
    };

    unreadNotifs += countGrouped(likesRes.data || [], 'like');
    unreadNotifs += countGrouped(repostsRes.data || [], 'repost');
    unreadNotifs += countGrouped(savesRes.data || [], 'save');

    setUnreadNotifCount(unreadNotifs);
  }, []);

  // Listener untuk menangani WebView Android (APK)
  useEffect(() => {
    if (isLoggedIn) {
      fetchBadgesAndUser();
    }
    
    const handleRefresh = () => {
      if (isLoggedIn) fetchBadgesAndUser();
    };

    // Deteksi ketika aplikasi di HP dibuka kembali dari background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isLoggedIn) {
        fetchBadgesAndUser();
      }
    };

    window.addEventListener('notif-count-changed', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Fallback Polling untuk Android jika WebSocket terputus
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && isLoggedIn) {
        fetchBadgesAndUser();
      }
    }, 15000); // Sinkronisasi paksa tiap 15 detik

    return () => {
      window.removeEventListener('notif-count-changed', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [pathname, isLoggedIn, fetchBadgesAndUser]);

  // Penambahan Realtime untuk Tabel Notifications
  useEffect(() => {
    let msgChannel: any;
    let notifChannel: any;

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      // Realtime Chat
      msgChannel = supabase.channel('navbar-messages-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new;
            if (newMsg.room_id && newMsg.room_id.includes(userId) && newMsg.user_id !== userId) {
              setUnreadChatCount((prev) => prev + 1);
            }
          }
        )
        .subscribe();

      // Realtime Notifikasi (Listen ke Insert dan Update)
      notifChannel = supabase.channel('navbar-notifs-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          () => {
            // Panggil ulang semua badge saat ada notif baru atau saat notif ditandai dibaca
            fetchBadgesAndUser();
          }
        )
        .subscribe();
    };

    if (isLoggedIn) {
      setupRealtime();
    }

    return () => {
      if (msgChannel) supabase.removeChannel(msgChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
    };
  }, [isLoggedIn, fetchBadgesAndUser]);

  if (isHiddenPage) return null;

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Chat', path: '/hypetalk', icon: MessageCircle, badgeCount: unreadChatCount },
    { name: 'Voice', path: '/voice-room', icon: CustomVoiceIcon }, 
    { name: 'Notif', path: '/notifications', icon: Bell, badgeCount: unreadNotifCount },
    { name: 'Profil', path: '/data', icon: User },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, item: (typeof navItems)[0], isActive: boolean) => {
    const requiresLogin = ['Chat', 'Voice', 'Notif'].includes(item.name);

    if (requiresLogin && !isLoggedIn) {
      e.preventDefault();
      router.push('/login');
      return;
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
    <div
      style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 9000,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <style>{`
        :root {
          --nav-icon-color: #ffffff; /* Ikon default putih karena background biru */
        }
        html.dark, [data-theme='dark'] {
          --nav-icon-color: #ffffff; /* Tetap putih di dark mode */
        }
      `}</style>
      
      <nav
        style={{
          width: '100%',
          height: `calc(60px + env(safe-area-inset-bottom))`,
          paddingBottom: 'env(safe-area-inset-bottom)',
          backgroundColor: '#1f3cff', /* 🟦 LATAR BIRU SOLID */
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: 'none',
          boxShadow: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          boxSizing: 'border-box',
          color: '#ffffff', /* Teks/ikon default putih */
        }}
      >
        {navItems.map((item) => {
          const isInsideVoiceRoom = pathname === '/voice' && hasVoiceId;
          const isActive = pathname === item.path || (item.path === '/voice-room' && pathname === '/voice' && !isInsideVoiceRoom);
          const Icon = item.icon;
          const isClicked = clickedItem === item.name;
          const isAnimating = animatingIcon === item.name;

          return (
            <Link
              key={item.name}
              href={item.path}
              aria-label={item.name}
              onClick={(e) => handleNavClick(e, item, isActive)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', textDecoration: 'none',
                position: 'relative', padding: '6px',
                touchAction: 'manipulation', width: '55px',
                WebkitTapHighlightColor: 'transparent',
                color: '#ffffff', /* Pastikan teks/link putih */
              }}
            >
              <div
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: isClicked ? 'scale(0.8)' : isActive ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
              >
                <AnimatePresence mode="wait">
                  {isAnimating ? (
                    <motion.div
                      key="spinner"
                      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.25 }} style={{ position: 'absolute', display: 'flex' }}
                    >
                      <CircularChase />
                    </motion.div>
                  ) : item.name === 'Profil' && avatarUrl ? (
                    <div
                      key="avatar"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '26px', height: '26px', borderRadius: '50%', padding: '2px',
                        border: isActive ? `2px solid #ffffff` : '2px solid transparent', /* border putih saat aktif */
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <img src={avatarUrl} alt="Profil" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div key="icon" style={{ display: 'flex' }}>
                      <Icon
                        size={24}
                        color={isActive ? '#ffffff' : 'var(--nav-icon-color)'} 
                        fill={isActive && item.name !== 'Profil' ? '#ffffff' : 'none'} /* Isi putih saat aktif */
                        strokeWidth={isActive ? 2.5 : 2}
                        style={{ transition: 'color 0.3s ease' }} 
                      />
                    </div>
                  )}
                </AnimatePresence>

                {/* Logika badge dinamis */}
                {item.badgeCount !== undefined && item.badgeCount > 0 && !isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: 'absolute', top: '-5px', right: '-8px',
                      backgroundColor: '#FF3B30', color: 'white', fontSize: '10px',
                      fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '2px 5px', minWidth: '16px', height: '16px', borderRadius: '12px',
                      border: '2px solid #1f3cff', /* Border badge menyatu dengan latar biru */
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