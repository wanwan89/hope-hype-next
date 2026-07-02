'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { useGlobalRefresh } from '@/hooks/useGlobalRefresh';
import './Notifications.css';

import FriendStoriesTray from '@/components/notifications/FriendStoriesTray';
import CategoryMenu from '@/components/notifications/CategoryMenu';
import RecommendedFriends from '@/components/notifications/RecommendedFriends';
import RefreshableWrapper from '@/components/RefreshableWrapper';

// --- SVG Coin Custom ---
const CoinSVG = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#F59E0B"/>
    <circle cx="12" cy="12" r="7" fill="#FCD34D"/>
    <path d="M12 7V17M10 10H14M10 14H14" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const getReadNotifs = (userId: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(`read_notifs_${userId}`) || '[]');
  } catch {
    return [];
  }
};

const saveReadNotifs = async (ids: string[], userId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const readList = new Set(getReadNotifs(userId));
    ids.forEach((id) => readList.add(id));
    const finalArray = Array.from(readList).slice(-500); // Batasi 500 data terakhir
    
    // Simpan ke local storage
    localStorage.setItem(`read_notifs_${userId}`, JSON.stringify(finalArray));
    
    // Backup ke DB (Tabel profiles) agar tidak hilang saat clear data atau relogin
    await supabase
      .from('profiles')
      .update({ read_notifs: finalArray })
      .eq('id', userId)
      .select()
      .single();
  } catch (err) {
    console.warn('Fallback save local only, DB column might missing', err);
  }
};

const UNKNOWN_ACTOR = {
  username: 'Unknown',
  avatar_url: '',
  role: 'user',
};

const LIKE_TYPES = ['like', 'like_group', 'repost', 'repost_group', 'save', 'save_group', 'comment_likes', 'story_likes'];
const COMMENT_TYPES = ['comment', 'reply'];
const FOLLOW_TYPES = ['follow'];
const ALL_HANDLED_TYPES = [...LIKE_TYPES, ...COMMENT_TYPES, ...FOLLOW_TYPES];

const formatMessage = (msg: string | undefined | null) => {
  if (!msg) return '';
  if (msg.includes('GIFT||')) return msg.replace(/GIFT\|\|.*?\|\|.*/, 'mengirimkan sebuah Gift ');
  if (msg.includes('STICKER||')) return msg.replace(/STICKER\|\|.*/, 'mengirimkan sebuah Stiker ');
  return msg;
};

// --- KOMPONEN UTAMA ---
export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myFollowings, setMyFollowings] = useState<Set<string>>(new Set());
  const [rawNotifs, setRawNotifs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'main' | 'like' | 'comment' | 'follow' | 'other'>('main');
  const [pendingCount, setPendingCount] = useState(0);
  const [friendStories, setFriendStories] = useState<any[]>([]);
  const [recommendedFriends, setRecommendedFriends] = useState<any[]>([]);
  const [myStatusText, setMyStatusText] = useState<string>('');
  const [showStatusInput, setShowStatusInput] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    initUserAndData();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeView !== 'main') {
      markCategoryAsRead(activeView);
    }
  }, [activeView]);

  const initUserAndData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
      
    const userData = { ...session.user, ...profile };
    setCurrentUser(userData);
    if (profile?.status_text) setMyStatusText(profile.status_text);

    // Sinkronisasi status baca dari DB ke Local jika data terhapus
    if (profile?.read_notifs && Array.isArray(profile.read_notifs)) {
      const local = getReadNotifs(session.user.id);
      const combined = Array.from(new Set([...local, ...profile.read_notifs]));
      localStorage.setItem(`read_notifs_${session.user.id}`, JSON.stringify(combined));
    }

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false)
      .in('type', ['like', 'comment', 'repost', 'save', 'comment_likes', 'story_likes']);

    const { data: fData } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', session.user.id);
    const followingIds = new Set(fData ? fData.map((f) => String(f.following_id)) : []);
    setMyFollowings(followingIds);

    // Paralel Request Cepat
    await Promise.all([
      loadNotifications(session.user.id),
      loadFriendStories(followingIds),
      loadRecommendedFriends(session.user.id, followingIds),
    ]);

    setupRealtime(session.user.id);
  };

  const handleUpdateStatus = async (newText: string) => {
    if (!currentUser) return;
    try {
      await Promise.all([
        supabase.from('user_notes').insert({ user_id: currentUser.id, content: newText }),
        supabase.from('profiles').update({ status_text: newText }).eq('id', currentUser.id)
      ]);
      setMyStatusText(newText);
      setShowStatusInput(false);
      showNotif('Status berhasil diperbarui!', 'success');
    } catch (err) {
      showNotif('Gagal menyimpan status', 'error');
    }
  };

  const loadFriendStories = async (followingIds: Set<string>) => {
    if (followingIds.size === 0) return;
    try {
      const arrIds = Array.from(followingIds);
      const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url, status_text').in('id', arrIds);
      if (!profiles) return;
      
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: stories } = await supabase.from('stories').select('id, creator_id').in('creator_id', arrIds).gte('created_at', twentyFourHoursAgo);
      
      const storyMap = new Map();
      (stories || []).forEach((s) => storyMap.set(s.creator_id, s.id));
      const mappedFriends = profiles.map((p) => ({ ...p, hasStory: storyMap.has(p.id), storyId: storyMap.get(p.id) || null }));
      mappedFriends.sort((a, b) => (b.hasStory ? 1 : 0) - (a.hasStory ? 1 : 0));
      setFriendStories(mappedFriends);
    } catch (err) {
      console.error('Gagal load story teman:', err);
    }
  };

  const loadRecommendedFriends = async (myId: string, followingIds: Set<string>) => {
    try {
      const arrAvoid = [myId, ...Array.from(followingIds)];
      const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url').not('id', 'in', `(${arrAvoid.join(',')})`).limit(10);
      if (data) setRecommendedFriends(data);
    } catch (err) {
      console.error('Gagal load saran teman', err);
    }
  };

  const loadNotifications = async (userId: string) => {
    setIsLoading(true);
    try {
      // 1. Ambil data primer secara paralel
      const [
        { count: pendingPosts },
        { data: activeFollowersData },
        { data: dbNotifs },
        { data: myPostsData },
        { data: myCommentsData },
        { data: myStoriesData }
      ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('creator_id', userId).eq('status', 'pending'),
        supabase.from('followers').select('follower_id, created_at').eq('following_id', userId).order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('posts').select('id, image_url, video_url').eq('creator_id', userId),
        supabase.from('comments').select('id, post_id').eq('user_id', userId),
        supabase.from('stories').select('id').eq('creator_id', userId)
      ]);

      setPendingCount(pendingPosts || 0);

      const synthesizeTypes = ['like', 'comment', 'repost', 'save', 'comment_likes', 'follow', 'story_likes'];
      const filteredDbNotifs = (dbNotifs || []).filter((n) => !synthesizeTypes.includes(n.type));

      const myPosts = myPostsData || [];
      const postIds = myPosts.map((p) => p.id);
      const myComments = myCommentsData || [];
      const commentIds = myComments.map((c) => c.id);
      const myStories = myStoriesData || [];
      const storyIds = myStories.map((s) => s.id);

      // 2. Ambil data interaksi sekunder secara paralel
      const promisesInteractions = [];
      
      // Data Interaksi Post (Likes, Comments, Reposts, Bookmarks)
      if (postIds.length > 0) {
        promisesInteractions.push(supabase.from('likes').select('id, post_id, created_at, user_id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30));
        promisesInteractions.push(supabase.from('comments').select('id, post_id, content, created_at, user_id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30));
        promisesInteractions.push(supabase.from('reposts').select('id, post_id, created_at, user_id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30));
        promisesInteractions.push(supabase.from('bookmarks').select('id, post_id, created_at, user_id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30));
      } else {
        promisesInteractions.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }), Promise.resolve({ data: [] }), Promise.resolve({ data: [] }));
      }

      // Data Finansial & Interaksi Lanjutan
      promisesInteractions.push(supabase.from('coin_transactions').select('*').eq('user_id', userId).gt('amount', 0).order('created_at', { ascending: false }).limit(20));
      if (commentIds.length > 0) promisesInteractions.push(supabase.from('comment_likes').select('id, comment_id, created_at, user_id').in('comment_id', commentIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(20));
      else promisesInteractions.push(Promise.resolve({ data: [] }));
      promisesInteractions.push(supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20));
      
      if (storyIds.length > 0) promisesInteractions.push(supabase.from('story_likes').select('id, story_id, created_at, user_id').in('story_id', storyIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30));
      else promisesInteractions.push(Promise.resolve({ data: [] }));
      
      promisesInteractions.push(supabase.from('withdraw_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20));
      promisesInteractions.push(supabase.from('coin_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20));

      const [
        likesRes, commentsRes, repostsRes, savesRes,
        coinRes, commentLikesRes, paymentsRes, storyLikesRes, withdrawRes, coinHistRes
      ] = await Promise.all(promisesInteractions);

      const likesData = likesRes.data || [];
      const commentsData = commentsRes.data || [];
      const repostsData = repostsRes.data || [];
      const savesData = savesRes.data || [];
      const coinTransData = coinRes.data || [];
      const commentLikesData = commentLikesRes.data || [];
      const paymentsData = paymentsRes.data || [];
      const storyLikesData = storyLikesRes.data || [];
      const withdrawData = withdrawRes.data || [];
      const coinHistoryData = coinHistRes.data || [];

      // 3. Mengumpulkan semua Actor ID untuk mengambil Profile sekaligus
      const allActorIds = new Set<string>();
      filteredDbNotifs.forEach((n) => { if (n.actor_id) allActorIds.add(n.actor_id); if (n.sender_id) allActorIds.add(n.sender_id); });
      (activeFollowersData || []).forEach((f) => allActorIds.add(f.follower_id));
      [...likesData, ...commentsData, ...repostsData, ...savesData, ...commentLikesData, ...storyLikesData].forEach((x) => allActorIds.add(x.user_id));

      let profilesMap: Record<string, any> = {};
      if (allActorIds.size > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, username, avatar_url, role').in('id', Array.from(allActorIds));
        if (profs) profs.forEach((p) => (profilesMap[p.id] = p));
      }

      const getActor = (actorId: string) => profilesMap[actorId] || { id: actorId, ...UNKNOWN_ACTOR };
      const readList = new Set(getReadNotifs(userId));

      const groupActions = (dataArr: any[], baseType: string) => {
        const byPostId: Record<string, any[]> = {};
        dataArr.forEach((item: any) => {
          if (!byPostId[item.post_id]) byPostId[item.post_id] = [];
          byPostId[item.post_id].push(item);
        });

        const result: any[] = [];
        Object.entries(byPostId).forEach(([postId, items]) => {
          const uniqueUsers = Array.from(new Map(items.map((i) => [i.user_id, i])).values());
          if (uniqueUsers.length === 0) return;
          uniqueUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const firstActor = uniqueUsers[0];

          if (uniqueUsers.length === 1) {
            const nId = `${baseType}-${firstActor.id}`;
            result.push({
              id: nId, type: baseType, post_id: postId, actor_id: firstActor.user_id,
              created_at: firstActor.created_at, is_read: readList.has(nId), actor: getActor(firstActor.user_id),
              postData: myPosts.find((p) => p.id === postId), totalCount: 1,
            });
          } else {
            const nId = `${baseType}_group-${postId}`;
            result.push({
              id: nId, type: `${baseType}_group`, post_id: postId, actor_id: firstActor.user_id,
              otherCount: uniqueUsers.length - 1, totalCount: uniqueUsers.length,
              created_at: firstActor.created_at, is_read: readList.has(nId), actor: getActor(firstActor.user_id),
              postData: myPosts.find((p) => p.id === postId),
            });
          }
        });
        return result;
      };

      const finalLikesNotifs = groupActions(likesData, 'like');
      const finalRepostsNotifs = groupActions(repostsData, 'repost');
      const finalSavesNotifs = groupActions(savesData, 'save');

      const formattedFollowers = (activeFollowersData || []).map((f: any) => {
        const nId = `follow-${f.follower_id}`;
        return {
          id: nId, type: 'follow', actor_id: f.follower_id, created_at: f.created_at || new Date().toISOString(),
          is_read: readList.has(nId), actor: getActor(f.follower_id), totalCount: 1, is_db: false
        };
      });

      const formattedComments = commentsData.map((c: any) => ({
        id: `comment-${c.id}`, type: 'comment', post_id: c.post_id, actor_id: c.user_id,
        message: formatMessage(c.content), created_at: c.created_at, is_read: readList.has(`comment-${c.id}`),
        actor: getActor(c.user_id), postData: myPosts.find((p) => p.id === c.post_id), totalCount: 1,
      }));

      const formattedCommentLikes = commentLikesData.map((cl: any) => {
        const relatedComment = myComments.find((c) => c.id === cl.comment_id);
        const nId = `comment_likes-${cl.id}`;
        return {
          id: nId, type: 'comment_likes', post_id: relatedComment?.post_id, actor_id: cl.user_id,
          created_at: cl.created_at, is_read: readList.has(nId), actor: getActor(cl.user_id),
          postData: myPosts.find((p) => p.id === relatedComment?.post_id), totalCount: 1,
        };
      });

      const formattedStoryLikes = storyLikesData.map((sl: any) => {
        const nId = `story_likes-${sl.id}`;
        return {
          id: nId, type: 'story_likes', story_id: sl.story_id, actor_id: sl.user_id,
          created_at: sl.created_at, is_read: readList.has(nId), actor: getActor(sl.user_id), message: 'menyukai cerita Anda', totalCount: 1,
        };
      });

      const systemActor = { username: 'HypeSystem', avatar_url: '/asets/png/logo.png' };
      const financeActor = { username: 'HypeFinance', avatar_url: '/asets/png/logo.png' };

      const formattedCoins = coinTransData.map((ct: any) => ({
        id: `coin-${ct.id}`, type: 'coin_receive', amount: ct.amount, description: ct.description,
        created_at: ct.created_at, is_read: readList.has(`coin-${ct.id}`), actor: systemActor, totalCount: 1,
      }));

      const formattedPayments = paymentsData.map((py: any) => ({
        id: `pay-${py.id}`, type: 'payment_status', status: py.status, amount: py.amount,
        created_at: py.created_at, is_read: readList.has(`pay-${py.id}`), actor: financeActor, totalCount: 1,
      }));

      const formattedWithdraws = withdrawData.map((wr: any) => ({
        id: `withdraw-${wr.id}`, type: 'withdraw_request', status: wr.status, amount: wr.amount,
        created_at: wr.created_at, is_read: readList.has(`withdraw-${wr.id}`), actor: financeActor, totalCount: 1,
      }));

      const formattedCoinHistory = coinHistoryData.map((ch: any) => ({
        id: `coin_hist-${ch.id}`, type: 'coin_history', amount: ch.amount, description: ch.description,
        created_at: ch.created_at, is_read: readList.has(`coin_hist-${ch.id}`), actor: systemActor, totalCount: 1,
      }));

      const normalizedDbNotifs = filteredDbNotifs.map((n) => ({
        ...n, message: formatMessage(n.message), type: n.type || 'other',
        actor: (n.actor_id || n.sender_id) ? getActor(n.actor_id || n.sender_id) : null,
        story_id: n.reference_id || n.story_id, is_db: true, totalCount: 1,
      })).filter(Boolean);

      const allRaw = [
        ...normalizedDbNotifs, ...finalLikesNotifs, ...finalRepostsNotifs, ...finalSavesNotifs,
        ...formattedComments, ...formattedCommentLikes, ...formattedStoryLikes, ...formattedFollowers,
        ...formattedCoins, ...formattedPayments, ...formattedWithdraws, ...formattedCoinHistory,
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRawNotifs(Array.from(new Map(allRaw.map((item) => [item.id, item])).values()));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtime = (userId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase
      .channel(`notif-realtime-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => { loadNotifications(userId); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'followers', filter: `following_id=eq.${userId}` }, () => { loadNotifications(userId); })
      .subscribe();
  };

  const markCategoryAsRead = async (category: string) => {
    let updated = [...rawNotifs];
    let dbIdsToUpdate: string[] = [];
    let localIdsToUpdate: string[] = [];

    updated = updated.map((n) => {
      let match = false;
      if (category === 'like' && LIKE_TYPES.includes(n.type)) match = true;
      if (category === 'comment' && COMMENT_TYPES.includes(n.type)) match = true;
      if (category === 'follow' && FOLLOW_TYPES.includes(n.type)) match = true;
      if (category === 'other' && !ALL_HANDLED_TYPES.includes(n.type)) match = true;

      if (match && !n.is_read) {
        if (n.is_db) dbIdsToUpdate.push(n.id);
        else localIdsToUpdate.push(n.id);
        return { ...n, is_read: true };
      }
      return n;
    });
    setRawNotifs(updated);

    if (localIdsToUpdate.length > 0 && currentUser?.id) {
      saveReadNotifs(localIdsToUpdate, currentUser.id);
    }
    if (dbIdsToUpdate.length > 0) {
      await supabase.from('notifications').update({ is_read: true }).in('id', dbIdsToUpdate);
    }

    window.dispatchEvent(new Event('notif-count-changed'));
  };

  const handleNotifClick = useCallback(async (notif: any) => {
    if (!notif.is_read) {
      setRawNotifs((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));

      if (notif.is_db) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      } else if (currentUser?.id) {
        saveReadNotifs([notif.id], currentUser.id);
      }
      window.dispatchEvent(new Event('notif-count-changed'));
    }

    if (notif.type === 'follow' && notif.actor_id) router.push(`/data?id=${notif.actor_id}`);
    else if ((notif.type === 'comment' || notif.type === 'comment_likes' || notif.type === 'reply') && notif.post_id) router.push(`/post?id=${notif.post_id}&openComment=true`);
    else if (notif.type === 'story_likes' && notif.story_id) router.push(`/story?id=${notif.story_id}`); 
    else if (['payment_status', 'coin_receive', 'withdraw_request', 'coin_history'].includes(notif.type)) router.push(`/settings/wallet`);
    else if (notif.post_id) router.push(`/post?id=${notif.post_id}`);
  }, [router, currentUser]);

  const handleFollowAction = useCallback(async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (myFollowings.has(targetId)) {
      await supabase.from('followers').delete().eq('follower_id', currentUser.id).eq('following_id', targetId);
      setMyFollowings((prev) => { const n = new Set(prev); n.delete(targetId); return n; });
    } else {
      const { error } = await supabase.from('followers').insert({ follower_id: currentUser.id, following_id: targetId });
      if (!error) {
        setMyFollowings((prev) => new Set(prev).add(targetId));
        showNotif('Berhasil mengikuti!', 'success');
      }
    }
  }, [currentUser, myFollowings]);

  const refetch = useCallback(async () => {
    if (currentUser?.id) {
      await Promise.all([
        loadNotifications(currentUser.id),
        loadFriendStories(myFollowings),
        loadRecommendedFriends(currentUser.id, myFollowings)
      ]);
    }
  }, [currentUser, myFollowings]);
  useGlobalRefresh(refetch);

  const handleRefresh = useCallback(async () => {
    await refetch();
    await new Promise(resolve => setTimeout(resolve, 800));
  }, [refetch]);

  const formatDate = useCallback((dateString: string) => {
    const dateObj = new Date(dateString);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    return isToday
      ? `${t('today', 'Hari ini')}, ${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
      : dateObj.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [t]);

  const unreadCounts = useMemo(() => {
    const calculateBadges = (types: string[]) => rawNotifs.filter((n) => !n.is_read && types.includes(n.type)).reduce((sum, n) => sum + (n.totalCount || 1), 0);
    return {
      like: calculateBadges(LIKE_TYPES),
      comment: calculateBadges(COMMENT_TYPES),
      follow: calculateBadges(FOLLOW_TYPES),
      other: rawNotifs.filter((n) => !n.is_read && !ALL_HANDLED_TYPES.includes(n.type)).reduce((sum, n) => sum + (n.totalCount || 1), 0),
    };
  }, [rawNotifs]);

  const latestNotifs = useMemo(() => {
    const getLatest = (types: string[], isOther = false) => {
      const filtered = rawNotifs.filter(n => isOther ? !ALL_HANDLED_TYPES.includes(n.type) : types.includes(n.type));
      return filtered.length > 0 ? filtered[0] : null;
    };
    return { like: getLatest(LIKE_TYPES), comment: getLatest(COMMENT_TYPES), follow: getLatest(FOLLOW_TYPES), other: getLatest([], true) };
  }, [rawNotifs]);

  const filteredNotifs = useMemo(() => {
    return rawNotifs.filter((n) => {
      if (activeView === 'like') return LIKE_TYPES.includes(n.type);
      if (activeView === 'comment') return COMMENT_TYPES.includes(n.type);
      if (activeView === 'follow') return n.type === 'follow';
      if (activeView === 'other') return !ALL_HANDLED_TYPES.includes(n.type);
      return true;
    });
  }, [rawNotifs, activeView]);

  return (
    <div className="notif-page-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', overflow: 'visible', background: 'var(--bg-main)' }}>
      {activeView === 'main' ? (
        <>
          <header className="notif-header" style={{ position: 'sticky', top: 0, zIndex: 10, flexShrink: 0, background: 'var(--bg-main, #fff)', borderBottom: '1px solid var(--border-card)' }}>
            <h2 style={{ margin: 0, padding: '16px 20px', fontSize: '20px', fontWeight: 'bold' }}>{t('notifications', 'Notifikasi')}</h2>
          </header>
          <div style={{ flex: 1 }}>
            <RefreshableWrapper onRefresh={handleRefresh}>
              <div className="notif-main-view" style={{ minHeight: '100%', paddingBottom: '20px' }}>
                <FriendStoriesTray friends={friendStories} currentUser={currentUser} myStatusText={myStatusText} onAddStatus={() => setShowStatusInput(true)} router={router} onFriendNoteClick={(id) => router.push(`/data?id=${id}`)} />
                {showStatusInput && (
                  <div className="status-input-container">
                    <input type="text" placeholder="Tulis note (Maks. 60 Karakter)" maxLength={60} defaultValue={myStatusText} autoFocus className="status-input" onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateStatus(e.currentTarget.value); }} />
                    <button onClick={() => setShowStatusInput(false)} className="back-btn"><span className="material-icons">close</span></button>
                  </div>
                )}
                {pendingCount > 0 && (
                  <div className="pending-alert-box" onClick={() => router.push('/pending')}>
                    <div className="pending-alert-left">
                      <div className="pending-icon-wrap"><span className="material-icons" style={{ fontSize: '20px' }}>pending_actions</span></div>
                      <div className="pending-text"><span className="pending-title">Menunggu Review <span>({pendingCount})</span></span><span className="pending-desc">Karyamu sedang dalam antrean pengecekan.</span></div>
                    </div>
                    <span className="material-icons pending-chevron">chevron_right</span>
                  </div>
                )}
                <CategoryMenu unreadCounts={unreadCounts} latestNotifs={latestNotifs} onSelectCategory={setActiveView} />
                <RecommendedFriends recommended={recommendedFriends} onFollow={handleFollowAction} myFollowings={myFollowings} />
              </div>
            </RefreshableWrapper>
          </div>
        </>
      ) : (
        <div style={{ flex: 1 }}>
          <RefreshableWrapper onRefresh={handleRefresh}>
            <NotificationListView
              title={activeView === 'like' ? 'Suka & Simpan' : activeView === 'comment' ? 'Komentar' : activeView === 'follow' ? 'Pengikut Baru' : 'Sistem & Lainnya'}
              notifs={filteredNotifs}
              onBack={() => setActiveView('main')}
              handleNotifClick={handleNotifClick}
              handleFollowBack={handleFollowAction}
              myFollowings={myFollowings}
              formatDate={formatDate}
            />
          </RefreshableWrapper>
        </div>
      )}
    </div>
  );
}

// --- KOMPONEN LIST VIEW NOTIFIKASI ---
type ListViewProps = {
  title: string;
  notifs: any[];
  onBack: () => void;
  handleNotifClick: (notif: any) => void;
  handleFollowBack: (e: React.MouseEvent, id: string) => void;
  myFollowings: Set<string>;
  formatDate: (date: string) => string;
};

const NotificationListView: React.FC<ListViewProps> = ({
  title, notifs, onBack, handleNotifClick, handleFollowBack, myFollowings, formatDate
}) => {
  const renderNotifText = (notif: any, actor: any) => {
    const name = actor?.username || 'Seseorang';
    const others = notif.otherCount > 0 ? (<span> dan <b>{notif.otherCount} lainnya</b></span>) : null;
    
    if (notif.type === 'follow') return <><b>{name}</b> mulai mengikuti Anda</>;
    if (notif.type === 'story_likes') return <><b>{name}</b> menyukai cerita Anda</>;
    
    if (notif.type.includes('like')) return <><b>{name}</b>{others} menyukai postingan Anda</>;
    if (notif.type.includes('repost')) return <><b>{name}</b>{others} membagikan ulang postingan Anda</>;
    if (notif.type.includes('save')) return <><b>{name}</b>{others} menyimpan postingan Anda</>;
    if (notif.type.includes('comment')) return <><b>{name}</b> mengomentari postingan Anda{notif.message ? `: "${notif.message}"` : ''}</>;
    
    if (notif.type === 'coin_receive') return <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>Anda menerima koin: <b>{notif.amount}</b> <CoinSVG/> {notif.description ? `(${notif.description})` : ''}</span>;
    if (notif.type === 'payment_status') return <>Status pembayaran Anda: <b>{notif.status}</b></>;
    if (notif.type === 'withdraw_request') return <>Permintaan penarikan <b>{notif.amount}</b>: {notif.status}</>;
    if (notif.type === 'coin_history') return <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>Riwayat Koin: <b>{notif.amount}</b> <CoinSVG/> {notif.description ? `(${notif.description})` : ''}</span>;
    
    if (notif.message) return <><b>{name}</b>: {notif.message}</>;
    
    return <><b>{name}</b> berinteraksi dengan Anda</>;
  };

  return (
    <div className="notif-detail-view">
      <div className="notif-detail-header">
        <button className="back-btn" onClick={onBack}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>{title}</h2>
      </div>

      {notifs.length === 0 ? (
        <div className="notif-empty-state">
          <span className="material-icons" style={{ fontSize: 48, opacity: 0.3 }}>notifications_none</span>
          <p>Belum ada notifikasi</p>
        </div>
      ) : (
        notifs.map((notif) => {
          const actor = notif.actor || notif.actors?.[0];
          const rawImageUrl = notif.postData?.image_url?.split(',')[0];
          const rawVideoUrl = notif.postData?.video_url;
          const isVideo = rawVideoUrl && rawVideoUrl.match(/\.(mp4|webm|ogg)$/i);
          const postThumb = rawImageUrl || rawVideoUrl || null;

          return (
            <div
              key={notif.id}
              className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
              onClick={() => handleNotifClick(notif)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: notif.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)' }}
            >
              {/* Badge Bulat Teres jika belum dibaca */}
              {!notif.is_read && (
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
              )}
              
              <div className="notif-avatar-wrapper" style={{ position: 'relative', flexShrink: 0 }}>
                {actor ? (
                  <img src={actor.avatar_url || '/asets/png/profile.webp'} alt="" className="notif-avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div className="notif-avatar default-avatar" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e5e7eb' }}>
                    <span className="material-icons">person</span>
                  </div>
                )}
              </div>

              <div className="notif-content" style={{ flex: 1, paddingRight: '8px', minWidth: 0 }}>
                <div className="notif-text" style={{ wordBreak: 'break-word', fontSize: '14px', lineHeight: '1.4' }}>
                  {renderNotifText(notif, actor)}
                </div>
                <span className="notif-date" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  {formatDate(notif.created_at)}
                </span>
              </div>

              {/* Menampilkan Thumbnail Postingan Di Sebelah Kanan */}
              {postThumb && (
                <div className="notif-post-thumb" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  {isVideo ? (
                    <video src={postThumb} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', display: 'block', backgroundColor: '#000' }} muted playsInline />
                  ) : (
                    <img src={postThumb} alt="post" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', display: 'block', backgroundColor: '#e5e7eb' }} />
                  )}
                </div>
              )}

              {/* Tombol Follow */}
              {notif.type === 'follow' && !myFollowings.has(notif.actor_id) && (
                <div className="notif-action-area" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  <button
                    className={`notif-follow-btn ${myFollowings.has(notif.actor_id) ? 'followed' : ''}`}
                    onClick={(e) => handleFollowBack(e, notif.actor_id)}
                    style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #3b82f6', background: 'transparent', color: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    {myFollowings.has(notif.actor_id) ? 'Mengikuti' : 'Ikuti'}
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
