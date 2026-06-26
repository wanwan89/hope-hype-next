'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
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
  const router = useRouter();

  const [isVisible, setIsVisible] = useState(true);
  const prevScrollY = useRef(0);

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

  useEffect(() => {
    // pathname bisa null di beberapa edge case SSR
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

  // Safe fallback untuk searchParams karena bisa null saat build _not-found
  const hasVoiceId = searchParams ? searchParams.get('id') !== null : false;

  const isHiddenPage = [
    '/login', '/dailycek', '/settings', '/vip', '/contact', 
    '/create', '/search', '/hypetalk/room', '/saldo', 
    '/story', '/pending', '/historycoin', '/withdraw'
  ].some(path => pathname?.includes(path)) || 
  (pathname === '/voice' && hasVoiceId);

  const fetchBadgesAndUser = async () => {
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
    
    // 🔥 PERBAIKAN CHAT BADGE: Log error jika query gagal, dan set default ke 0
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
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchBadgesAndUser();
    }
    const handleRefresh = () => {
      if (isLoggedIn) fetchBadgesAndUser();
    };
    window.addEventListener('notif-count-changed', handleRefresh);
    return () => window.removeEventListener('notif-count-changed', handleRefresh);
  }, [pathname, isLoggedIn]);

  // 🔥 PERBAIKAN CHAT BADGE: Realtime Listener agar badge bertambah otomatis saat pesan baru masuk
  useEffect(() => {
    let channel: any;

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      channel = supabase.channel('navbar-messages-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new;
            // Jika pesan masuk berada di room kita dan BUKAN pesan yang kita kirim sendiri
            if (newMsg.room_id && newMsg.room_id.includes(userId) && newMsg.user_id !== userId) {
              setUnreadChatCount((prev) => prev + 1);
            }
          }
        )
        .subscribe();
    };

    if (isLoggedIn) {
      setupRealtime();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [isLoggedIn]);

  if (isHiddenPage) return null;

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Chat', path: '/hypetalk', icon: MessageCircle, badgeCount: unreadChatCount },
    { name: 'Voice', path: '/voice-room', icon: Mic },
    { name: 'Notif', path: '/notifications', icon: Bell, badgeCount: unreadNotifCount },
    { name: 'Profil', path: '/data', icon: User },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, item: (typeof navItems)[0], isActive: boolean) => {
    // 2. Cek apakah tab yang diklik membutuhkan login
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
          backgroundColor: 'var(--bg-main, rgba(255, 255, 255, 0.75))',
          backdropFilter: 'blur(24px)', 
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: 'none', // 🔥 PERUBAHAN: Menghapus border garis atas
          boxShadow: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          boxSizing: 'border-box',
          color: 'inherit' 
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
                color: 'inherit',
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
                        border: isActive ? `2px solid #1f3cff` : '2px solid transparent',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <img src={avatarUrl} alt="Profil" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div key="icon" style={{ display: 'flex' }}>
                      <Icon
                        size={24}
                        color={isActive ? '#1f3cff' : 'currentColor'}
                        fill={isActive && item.name !== 'Profil' ? '#1f3cff' : 'none'}
                        strokeWidth={isActive ? 2.5 : 2}
                        style={{ opacity: isActive ? 1 : 0.6 }} 
                      />
                    </div>
                  )}
                </AnimatePresence>

                {item.badgeCount !== undefined && item.badgeCount > 0 && !isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: 'absolute', top: '-5px', right: '-8px',
                      backgroundColor: '#FF3B30', color: 'white', fontSize: '10px',
                      fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '2px 5px', minWidth: '16px', height: '16px', borderRadius: '12px',
                      border: '2px solid var(--bg-main, #ffffff)', 
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
