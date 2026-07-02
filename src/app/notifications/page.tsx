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
import NotificationListView from '@/components/notifications/NotificationListView';
import RefreshableWrapper from '@/components/RefreshableWrapper';

const getReadNotifs = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('read_notifs_local') || '[]');
  } catch {
    return [];
  }
};

const saveReadNotifs = (ids: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    const readList = new Set(getReadNotifs());
    ids.forEach((id) => readList.add(id));
    localStorage.setItem(
      'read_notifs_local',
      JSON.stringify(Array.from(readList).slice(-500))
    );
  } catch {}
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
  if (msg.includes('GIFT||')) {
    return msg.replace(/GIFT\|\|.*?\|\|.*/, 'mengirimkan sebuah Gift ');
  }
  if (msg.includes('STICKER||')) {
    return msg.replace(/STICKER\|\|.*/, 'mengirimkan sebuah Stiker ');
  }
  return msg;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myFollowings, setMyFollowings] = useState<Set<string>>(new Set());
  const [rawNotifs, setRawNotifs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<
    'main' | 'like' | 'comment' | 'follow' | 'other'
  >('main');
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
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
    const followingIds = new Set(
      fData ? fData.map((f) => String(f.following_id)) : []
    );
    setMyFollowings(followingIds);

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
      await supabase
        .from('user_notes')
        .insert({ user_id: currentUser.id, content: newText });
      await supabase
        .from('profiles')
        .update({ status_text: newText })
        .eq('id', currentUser.id);
      setMyStatusText(newText);
      setShowStatusInput(false);
      showNotif('Status berhasil diperbarui!', 'success');
    } catch (err) {
      console.error(err);
      showNotif('Gagal menyimpan status', 'error');
    }
  };

  const loadFriendStories = async (followingIds: Set<string>) => {
    if (followingIds.size === 0) return;
    try {
      const arrIds = Array.from(followingIds);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, status_text')
        .in('id', arrIds);
      if (!profiles) return;
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      const { data: stories } = await supabase
        .from('stories')
        .select('id, creator_id')
        .in('creator_id', arrIds)
        .gte('created_at', twentyFourHoursAgo);
      const storyMap = new Map();
      (stories || []).forEach((s) => storyMap.set(s.creator_id, s.id));
      const mappedFriends = profiles.map((p) => ({
        ...p,
        hasStory: storyMap.has(p.id),
        storyId: storyMap.get(p.id) || null,
      }));
      mappedFriends.sort((a, b) => (b.hasStory ? 1 : 0) - (a.hasStory ? 1 : 0));
      setFriendStories(mappedFriends);
    } catch (err) {
      console.error('Gagal load story teman:', err);
    }
  };

  const loadRecommendedFriends = async (
    myId: string,
    followingIds: Set<string>
  ) => {
    try {
      const arrAvoid = [myId, ...Array.from(followingIds)];
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .not('id', 'in', `(${arrAvoid.join(',')})`)
        .limit(10);
      if (data) setRecommendedFriends(data);
    } catch (err) {
      console.error('Gagal load saran teman', err);
    }
  };

  const loadNotifications = async (userId: string) => {
    setIsLoading(true);
    try {
      const { count: pendingPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId)
        .eq('status', 'pending');
      setPendingCount(pendingPosts || 0);

      const { data: activeFollowersData } = await supabase
        .from('followers')
        .select('follower_id, created_at')
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

      const synthesizeTypes = ['like', 'comment', 'repost', 'save', 'comment_likes', 'follow', 'story_likes'];
      const { data: dbNotifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const filteredDbNotifs = (dbNotifs || []).filter(
        (n) => !synthesizeTypes.includes(n.type)
      );

      const myPostsRes = await supabase
        .from('posts')
        .select('id, image_url, video_url')
        .eq('creator_id', userId);
      const myPosts = myPostsRes.data || [];
      const postIds = myPosts.map((p) => p.id);

      const myCommentsRes = await supabase
        .from('comments')
        .select('id, post_id')
        .eq('user_id', userId);
      const myComments = myCommentsRes.data || [];
      const commentIds = myComments.map((c) => c.id);

      const myStoriesRes = await supabase
        .from('stories')
        .select('id')
        .eq('creator_id', userId);
      const myStories = myStoriesRes.data || [];
      const storyIds = myStories.map((s) => s.id);

      let likesData: any[] = [],
        commentsData: any[] = [],
        repostsData: any[] = [],
        savesData: any[] = [];

      let coinTransData: any[] = [],
        commentLikesData: any[] = [],
        paymentsData: any[] = [],
        storyLikesData: any[] = [],
        withdrawData: any[] = [],
        coinHistoryData: any[] = [];

      if (postIds.length > 0) {
        const [likesRes, commentsRes, repostsRes, savesRes] = await Promise.all([
          supabase.from('likes').select('id, post_id, created_at, user_id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30),
          supabase.from('comments').select('id, post_id, content, created_at, user_id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30),
          supabase.from('reposts').select('id, post_id, created_at, user_id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30),
          supabase.from('bookmarks').select('id, post_id, created_at, user_id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30),
        ]);
        likesData = likesRes.data || [];
        commentsData = commentsRes.data || [];
        repostsData = repostsRes.data || [];
        savesData = savesRes.data || [];
      }

      const promisesExtra = [];
      promisesExtra.push(supabase.from('coin_transactions').select('*').eq('user_id', userId).gt('amount', 0).order('created_at', { ascending: false }).limit(20));
      if (commentIds.length > 0) promisesExtra.push(supabase.from('comment_likes').select('id, comment_id, created_at, user_id').in('comment_id', commentIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(20));
      else promisesExtra.push(Promise.resolve({ data: [] }));
      promisesExtra.push(supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20));
      if (storyIds.length > 0) promisesExtra.push(supabase.from('story_likes').select('id, story_id, created_at, user_id').in('story_id', storyIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30));
      else promisesExtra.push(Promise.resolve({ data: [] }));
      promisesExtra.push(supabase.from('withdraw_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20));
      promisesExtra.push(supabase.from('coin_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20));

      const [coinRes, commentLikesRes, paymentsRes, storyLikesRes, withdrawRes, coinHistRes] = await Promise.all(promisesExtra);
      coinTransData = coinRes.data || [];
      commentLikesData = commentLikesRes.data || [];
      paymentsData = paymentsRes.data || [];
      storyLikesData = storyLikesRes.data || [];
      withdrawData = withdrawRes.data || [];
      coinHistoryData = coinHistRes.data || [];

      const allActorIds = new Set<string>();
      filteredDbNotifs.forEach((n) => { if (n.actor_id) allActorIds.add(n.actor_id); if (n.sender_id) allActorIds.add(n.sender_id); });
      (activeFollowersData || []).forEach((f) => allActorIds.add(f.follower_id));
      likesData.forEach((l) => allActorIds.add(l.user_id));
      commentsData.forEach((c) => allActorIds.add(c.user_id));
      repostsData.forEach((r) => allActorIds.add(r.user_id));
      savesData.forEach((s) => allActorIds.add(s.user_id));
      commentLikesData.forEach((cl) => allActorIds.add(cl.user_id));
      storyLikesData.forEach((sl) => allActorIds.add(sl.user_id));

      let profilesMap: Record<string, any> = {};
      if (allActorIds.size > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, role')
          .in('id', Array.from(allActorIds));
        if (profs) profs.forEach((p) => (profilesMap[p.id] = p));
      }

      const getActor = (actorId: string) => profilesMap[actorId] || { id: actorId, ...UNKNOWN_ACTOR };
      const readList = new Set(getReadNotifs());

      const formattedFollowers = (activeFollowersData || []).map((f: any) => {
        const nId = `follow-${f.follower_id}`;
        return {
          id: nId,
          type: 'follow',
          actor_id: f.follower_id,
          created_at: f.created_at || new Date().toISOString(),
          is_read: readList.has(nId),
          actor: getActor(f.follower_id),
          totalCount: 1,
          is_db: false
        };
      });

      const groupActions = (dataArr: any[], baseType: string) => {
        const byPostId: Record<string, any[]> = {};
        dataArr.forEach((item: any) => {
          if (!byPostId[item.post_id]) byPostId[item.post_id] = [];
          byPostId[item.post_id].push(item);
        });

        const result: any[] = [];
        Object.entries(byPostId).forEach(([postId, items]) => {
          const uniqueUsersMap = new Map(items.map((i) => [i.user_id, i]));
          const uniqueUsers = Array.from(uniqueUsersMap.values());
          if (uniqueUsers.length === 0) return;

          uniqueUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          const firstActor = uniqueUsers[0];

          if (uniqueUsers.length === 1) {
            const nId = `${baseType}-${firstActor.id}`;
            result.push({
              id: nId,
              type: baseType,
              post_id: postId,
              actor_id: firstActor.user_id,
              created_at: firstActor.created_at,
              is_read: readList.has(nId),
              actor: getActor(firstActor.user_id),
              postData: myPosts.find((p) => p.id === postId),
              totalCount: 1,
            });
          } else {
            const otherCount = uniqueUsers.length - 1;
            const nId = `${baseType}_group-${postId}`;
            result.push({
              id: nId,
              type: `${baseType}_group`,
              post_id: postId,
              actor_id: firstActor.user_id, 
              otherCount,
              totalCount: uniqueUsers.length,
              created_at: firstActor.created_at,
              is_read: readList.has(nId),
              actor: getActor(firstActor.user_id),
              postData: myPosts.find((p) => p.id === postId),
            });
          }
        });
        return result;
      };

      const finalLikesNotifs = groupActions(likesData, 'like');
      const finalRepostsNotifs = groupActions(repostsData, 'repost');
      const finalSavesNotifs = groupActions(savesData, 'save');

      const formattedComments = commentsData.map((c: any) => ({
        id: `comment-${c.id}`,
        type: 'comment',
        post_id: c.post_id,
        actor_id: c.user_id,
        message: formatMessage(c.content),
        created_at: c.created_at,
        is_read: readList.has(`comment-${c.id}`),
        actor: getActor(c.user_id),
        postData: myPosts.find((p) => p.id === c.post_id),
        totalCount: 1,
      }));

      const formattedCommentLikes = commentLikesData.map((cl: any) => {
        const relatedComment = myComments.find((c) => c.id === cl.comment_id);
        const nId = `comment_likes-${cl.id}`;
        return {
          id: nId,
          type: 'comment_likes',
          post_id: relatedComment?.post_id,
          actor_id: cl.user_id,
          created_at: cl.created_at,
          is_read: readList.has(nId),
          actor: getActor(cl.user_id),
          postData: myPosts.find((p) => p.id === relatedComment?.post_id),
          totalCount: 1,
        };
      });

      const formattedStoryLikes = storyLikesData.map((sl: any) => {
        const nId = `story_likes-${sl.id}`;
        return {
          id: nId,
          type: 'story_likes',
          story_id: sl.story_id,
          actor_id: sl.user_id,
          created_at: sl.created_at,
          is_read: readList.has(nId),
          actor: getActor(sl.user_id),
          message: 'menyukai cerita Anda',
          totalCount: 1,
        };
      });

      const formattedCoins = coinTransData.map((ct: any) => ({
        id: `coin-${ct.id}`,
        type: 'coin_receive',
        amount: ct.amount,
        description: ct.description,
        created_at: ct.created_at,
        is_read: readList.has(`coin-${ct.id}`),
        actor: { username: 'HypeSystem', avatar_url: '/asets/png/logo.png' },
        totalCount: 1,
      }));

      const formattedPayments = paymentsData.map((py: any) => ({
        id: `pay-${py.id}`,
        type: 'payment_status',
        status: py.status,
        amount: py.amount,
        created_at: py.created_at,
        is_read: readList.has(`pay-${py.id}`),
        actor: { username: 'HypeFinance', avatar_url: '/asets/png/logo.png' },
        totalCount: 1,
      }));

      const formattedWithdraws = withdrawData.map((wr: any) => ({
        id: `withdraw-${wr.id}`,
        type: 'withdraw_request',
        status: wr.status,
        amount: wr.amount,
        created_at: wr.created_at,
        is_read: readList.has(`withdraw-${wr.id}`),
        actor: { username: 'HypeFinance', avatar_url: '/asets/png/logo.png' },
        totalCount: 1,
      }));

      const formattedCoinHistory = coinHistoryData.map((ch: any) => ({
        id: `coin_hist-${ch.id}`,
        type: 'coin_history',
        amount: ch.amount,
        description: ch.description,
        created_at: ch.created_at,
        is_read: readList.has(`coin_hist-${ch.id}`),
        actor: { username: 'HypeSystem', avatar_url: '/asets/png/logo.png' },
        totalCount: 1,
      }));

      const normalizedDbNotifs = filteredDbNotifs
        .map((n) => {
          let msg = formatMessage(n.message);
          return {
            ...n,
            message: msg,
            type: n.type || 'other',
            actor: (n.actor_id || n.sender_id) ? getActor(n.actor_id || n.sender_id) : null,
            story_id: n.reference_id || n.story_id,
            is_db: true,
            totalCount: 1,
          }
        })
        .filter(Boolean);

      const allRaw = [
        ...normalizedDbNotifs,
        ...finalLikesNotifs,
        ...finalRepostsNotifs,
        ...finalSavesNotifs,
        ...formattedComments,
        ...formattedCommentLikes,
        ...formattedStoryLikes,
        ...formattedFollowers,
        ...formattedCoins,
        ...formattedPayments,
        ...formattedWithdraws,
        ...formattedCoinHistory,
      ].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const uniqueNotifs = Array.from(new Map(allRaw.map((item) => [item.id, item])).values());
      setRawNotifs(uniqueNotifs);
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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { loadNotifications(userId); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'followers', filter: `following_id=eq.${userId}` },
        () => { loadNotifications(userId); }
      )
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

    if (localIdsToUpdate.length > 0) saveReadNotifs(localIdsToUpdate);
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
      } else {
        saveReadNotifs([notif.id]);
      }

      window.dispatchEvent(new Event('notif-count-changed'));
    }

    if (notif.type === 'follow' && notif.actor_id) {
      router.push(`/data?id=${notif.actor_id}`);
    } 
    else if ((notif.type === 'comment' || notif.type === 'comment_likes' || notif.type === 'reply') && notif.post_id) {
      router.push(`/post?id=${notif.post_id}&openComment=true`);
    } 
    else if (notif.type === 'story_likes' && notif.story_id) {
      router.push(`/story?id=${notif.story_id}`); 
    } 
    else if (['payment_status', 'coin_receive', 'withdraw_request', 'coin_history'].includes(notif.type)) {
      router.push(`/settings/wallet`);
    } 
    else if (notif.post_id) {
      router.push(`/post?id=${notif.post_id}`);
    }
  }, [router]);

  const handleFollowAction = useCallback(async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    const isFollowing = myFollowings.has(targetId);
    if (isFollowing) {
      await supabase.from('followers').delete().eq('follower_id', currentUser.id).eq('following_id', targetId);
      setMyFollowings((prev) => {
        const n = new Set(prev);
        n.delete(targetId);
        return n;
      });
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

  const getIconAndColor = useCallback((type: string) => {
    switch (type) {
      case 'like':
      case 'like_group':
      case 'comment_likes':
      case 'story_likes':
        return { icon: 'favorite', color: '#ff2e63' };
      case 'comment':
      case 'reply':
        return { icon: 'chat_bubble', color: '#10b981' };
      case 'repost':
      case 'repost_group':
        return { icon: 'repeat', color: '#1DA1F2' };
      case 'save':
      case 'save_group':
        return { icon: 'bookmark', color: '#f59e0b' };
      case 'coin_receive':
      case 'coin_history':
      case 'gift':
        return { icon: 'monetization_on', color: '#f59e0b' };
      case 'follow':
        return { icon: 'person_add', color: '#8b5cf6' };
      case 'mention':
        return { icon: 'alternate_email', color: '#1DA1F2' };
      case 'post_approved':
        return { icon: 'verified', color: '#10b981' };
      case 'payment_status':
      case 'withdraw_request':
        return { icon: 'account_balance_wallet', color: '#8b5cf6' };
      default:
        return { icon: 'notifications', color: '#3b82f6' };
    }
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const dateObj = new Date(dateString);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    return isToday
      ? `${t('today', 'Hari ini')}, ${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
      : dateObj.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [t]);

  const unreadCounts = useMemo(() => {
    const calculateBadges = (types: string[]) => {
      return rawNotifs
        .filter((n) => !n.is_read && types.includes(n.type))
        .reduce((sum, n) => sum + (n.totalCount || 1), 0);
    };

    return {
      like: calculateBadges(LIKE_TYPES),
      comment: calculateBadges(COMMENT_TYPES),
      follow: calculateBadges(FOLLOW_TYPES),
      other: rawNotifs
        .filter((n) => !n.is_read && !ALL_HANDLED_TYPES.includes(n.type))
        .reduce((sum, n) => sum + (n.totalCount || 1), 0),
    };
  }, [rawNotifs]);

  const latestNotifs = useMemo(() => {
    const getLatest = (types: string[], isOther = false) => {
      const filtered = rawNotifs.filter(n => isOther ? !ALL_HANDLED_TYPES.includes(n.type) : types.includes(n.type));
      return filtered.length > 0 ? filtered[0] : null;
    };
    return {
      like: getLatest(LIKE_TYPES),
      comment: getLatest(COMMENT_TYPES),
      follow: getLatest(FOLLOW_TYPES),
      other: getLatest([], true)
    };
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

  const getTitleByView = () => {
    switch (activeView) {
      case 'like': return 'Suka & Simpan';
      case 'comment': return 'Komentar';
      case 'follow': return 'Pengikut Baru';
      case 'other': return 'Sistem & Lainnya';
      default: return 'Notifikasi';
    }
  };

  return (
    <div 
      className="notif-page-container" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100%',
        overflow: 'visible',
        background: 'var(--bg-main)' 
      }}
    >
      {activeView === 'main' ? (
        <>
          <header 
            className="notif-header" 
            style={{ 
              position: 'sticky', 
              top: 0, 
              zIndex: 10, 
              flexShrink: 0, 
              background: 'var(--bg-main, #fff)',
              borderBottom: '1px solid var(--border-card)'
            }}
          >
            <h2 style={{ margin: 0, padding: '16px 20px', fontSize: '20px', fontWeight: 'bold' }}>
              {t('notifications', 'Notifikasi')}
            </h2>
          </header>

          <div style={{ flex: 1 }}>
            <RefreshableWrapper onRefresh={handleRefresh}>
              <div className="notif-main-view" style={{ minHeight: '100%', paddingBottom: '20px' }}>
                
                <FriendStoriesTray
                  friends={friendStories}
                  currentUser={currentUser}
                  myStatusText={myStatusText}
                  onAddStatus={() => setShowStatusInput(true)}
                  router={router}
                  onFriendNoteClick={(id) => router.push(`/data?id=${id}`)}
                />

                {showStatusInput && (
                  <div className="status-input-container">
                    <input
                      type="text"
                      placeholder="Tulis note (Maks. 60 Karakter)"
                      maxLength={60}
                      defaultValue={myStatusText}
                      autoFocus
                      className="status-input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateStatus(e.currentTarget.value);
                      }}
                    />
                    <button onClick={() => setShowStatusInput(false)} className="back-btn">
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                )}

                {pendingCount > 0 && (
                  <div className="pending-alert-box" onClick={() => router.push('/pending')}>
                    <div className="pending-alert-left">
                      <div className="pending-icon-wrap">
                        <span className="material-icons" style={{ fontSize: '20px' }}>pending_actions</span>
                      </div>
                      <div className="pending-text">
                        <span className="pending-title">Menunggu Review <span>({pendingCount})</span></span>
                        <span className="pending-desc">Karyamu sedang dalam antrean pengecekan.</span>
                      </div>
                    </div>
                    <span className="material-icons pending-chevron">chevron_right</span>
                  </div>
                )}

                <CategoryMenu unreadCounts={unreadCounts} latestNotifs={latestNotifs} onSelectCategory={setActiveView} />
                <RecommendedFriends 
                  recommended={recommendedFriends} 
                  onFollow={handleFollowAction} 
                  myFollowings={myFollowings} 
                />
              </div>
            </RefreshableWrapper>
          </div>
        </>
      ) : (
        <div style={{ flex: 1 }}>
          <RefreshableWrapper onRefresh={handleRefresh}>
            <NotificationListView
              title={getTitleByView()}
              notifs={filteredNotifs}
              onBack={() => setActiveView('main')}
              handleNotifClick={handleNotifClick}
              handleFollowBack={handleFollowAction}
              myFollowings={myFollowings}
              router={router}
              formatDate={formatDate}
              getIconAndColor={getIconAndColor}
            />
          </RefreshableWrapper>
        </div>
      )}
    </div>
  );
}
