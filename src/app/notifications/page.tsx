'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import './Notifications.css';

import FriendStoriesTray from '@/components/notifications/FriendStoriesTray';
import CategoryMenu from '@/components/notifications/CategoryMenu';
import RecommendedFriends from '@/components/notifications/RecommendedFriends';
import NotificationListView from '@/components/notifications/NotificationListView';

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

// Fallback profil jika data actor tidak ditemukan
const UNKNOWN_ACTOR = {
  username: 'Unknown',
  avatar_url: '',
  role: 'user',
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

    // PEMBERSIHAN OTOMATIS: hanya menandai notifikasi sintesis yang sudah tidak relevan,
    // JANGAN hapus follow, bookmark, dll.
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false)
      .in('type', ['like', 'comment', 'repost', 'save', 'comment_like']);

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

      // 1. Ambil SEMUA notifikasi follow (tanpa limit)
      const { data: followNotifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'follow')
        .order('created_at', { ascending: false });

      // 2. Ambil notifikasi lain (bukan synthesized & bukan follow) dengan limit
      const synthesizeTypes = [
        'like',
        'comment',
        'repost',
        'save',
        'comment_like',
      ];
      const { data: dbNotifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const filteredDbNotifs = (dbNotifs || []).filter(
        (n) => !synthesizeTypes.includes(n.type) && n.type !== 'follow'
      );

      // 3. Gabungkan semua notifikasi dari DB yang akan ditampilkan
      const allFilteredDbNotifs = [
        ...(followNotifs || []),
        ...filteredDbNotifs,
      ];

      // 4. Data postingan & komentar sendiri (untuk synthesized)
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

      let likesData: any[] = [],
        commentsData: any[] = [],
        repostsData: any[] = [],
        savesData: any[] = [];
      let coinTransData: any[] = [],
        commentLikesData: any[] = [],
        paymentsData: any[] = [];

      if (postIds.length > 0) {
        const [likesRes, commentsRes, repostsRes, savesRes] =
          await Promise.all([
            supabase
              .from('likes')
              .select('id, post_id, created_at, user_id')
              .in('post_id', postIds)
              .neq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(30),
            supabase
              .from('comments')
              .select('id, post_id, content, created_at, user_id')
              .in('post_id', postIds)
              .neq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(30),
            supabase
              .from('reposts')
              .select('id, post_id, created_at, user_id')
              .in('post_id', postIds)
              .neq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(20),
            supabase
              .from('bookmarks')
              .select('id, post_id, created_at, user_id')
              .in('post_id', postIds)
              .neq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(20),
          ]);
        likesData = likesRes.data || [];
        commentsData = commentsRes.data || [];
        repostsData = repostsRes.data || [];
        savesData = savesRes.data || [];
      }

      const promisesExtra = [];
      promisesExtra.push(
        supabase
          .from('coin_transactions')
          .select('*')
          .eq('user_id', userId)
          .gt('amount', 0)
          .order('created_at', { ascending: false })
          .limit(20)
      );
      if (commentIds.length > 0)
        promisesExtra.push(
          supabase
            .from('comment_likes')
            .select('id, comment_id, created_at, user_id')
            .in('comment_id', commentIds)
            .neq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20)
        );
      else promisesExtra.push(Promise.resolve({ data: [] }));
      promisesExtra.push(
        supabase
          .from('payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
      );

      const [coinRes, commentLikesRes, paymentsRes] = await Promise.all(
        promisesExtra
      );
      coinTransData = coinRes.data || [];
      commentLikesData = commentLikesRes.data || [];
      paymentsData = paymentsRes.data || [];

      // Kumpulkan semua actor_id
      const allActorIds = new Set<string>();
      allFilteredDbNotifs.forEach((n) => {
        if (n.actor_id) allActorIds.add(n.actor_id);
      });
      likesData.forEach((l) => allActorIds.add(l.user_id));
      commentsData.forEach((c) => allActorIds.add(c.user_id));
      repostsData.forEach((r) => allActorIds.add(r.user_id));
      savesData.forEach((s) => allActorIds.add(s.user_id));
      commentLikesData.forEach((cl) => allActorIds.add(cl.user_id));

      // Ambil profil aktor
      let profilesMap: Record<string, any> = {};
      if (allActorIds.size > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, role')
          .in('id', Array.from(allActorIds));
        if (profs) profs.forEach((p) => (profilesMap[p.id] = p));
      }

      // Helper untuk mendapatkan data actor (fallback jika tidak ditemukan)
      const getActor = (actorId: string) =>
        profilesMap[actorId] || { id: actorId, ...UNKNOWN_ACTOR };

      // Proses likes
      const likesByPostId: Record<string, any[]> = {};
      likesData.forEach((l: any) => {
        if (!likesByPostId[l.post_id]) likesByPostId[l.post_id] = [];
        likesByPostId[l.post_id].push(l);
      });

      const readList = new Set(getReadNotifs());
      let finalLikesNotifs: any[] = [];

      Object.entries(likesByPostId).forEach(([postId, likes]) => {
        const uniqueLikersMap = new Map(likes.map((l) => [l.user_id, l]));
        const uniqueLikers = Array.from(uniqueLikersMap.values());
        if (uniqueLikers.length === 0) return;
        if (uniqueLikers.length === 1) {
          const l = uniqueLikers[0];
          const nId = `like-${l.id}`;
          finalLikesNotifs.push({
            id: nId,
            type: 'like',
            post_id: postId,
            actor_id: l.user_id,
            created_at: l.created_at,
            is_read: readList.has(nId),
            actor: getActor(l.user_id),
            postData: myPosts.find((p) => p.id === postId),
          });
        } else {
          const firstTwoIds = uniqueLikers.slice(0, 2).map((l) => l.user_id);
          const otherCount =
            uniqueLikers.length - 2 > 0 ? uniqueLikers.length - 2 : 0;
          const nId = `like-group-${postId}`;
          finalLikesNotifs.push({
            id: nId,
            type: 'like_group',
            post_id: postId,
            actor_ids: firstTwoIds,
            otherCount,
            created_at: uniqueLikers[0].created_at,
            is_read: readList.has(nId),
            actors: firstTwoIds.map((id) => getActor(id)),
            postData: myPosts.find((p) => p.id === postId),
          });
        }
      });

      const formattedComments = commentsData.map((c: any) => ({
        id: `comment-${c.id}`,
        type: 'comment',
        post_id: c.post_id,
        actor_id: c.user_id,
        message: c.content,
        created_at: c.created_at,
        is_read: readList.has(`comment-${c.id}`),
        actor: getActor(c.user_id),
        postData: myPosts.find((p) => p.id === c.post_id),
      }));

      const formattedReposts = repostsData.map((r: any) => ({
        id: `repost-${r.id}`,
        type: 'repost',
        post_id: r.post_id,
        actor_id: r.user_id,
        created_at: r.created_at,
        is_read: readList.has(`repost-${r.id}`),
        actor: getActor(r.user_id),
        postData: myPosts.find((p) => p.id === r.post_id),
      }));

      // Bookmark / save
      const formattedSaves = savesData.map((s: any) => ({
        id: `save-${s.id}`,
        type: 'save',
        post_id: s.post_id,
        actor_id: s.user_id,
        created_at: s.created_at,
        is_read: readList.has(`save-${s.id}`),
        actor: getActor(s.user_id),
        postData: myPosts.find((p) => p.id === s.post_id),
      }));

      const formattedCommentLikes = commentLikesData.map((cl: any) => {
        const relatedComment = myComments.find(
          (c) => c.id === cl.comment_id
        );
        const nId = `comment_like-${cl.id}`;
        return {
          id: nId,
          type: 'comment_like',
          post_id: relatedComment?.post_id,
          actor_id: cl.user_id,
          created_at: cl.created_at,
          is_read: readList.has(nId),
          actor: getActor(cl.user_id),
          postData: myPosts.find((p) => p.id === relatedComment?.post_id),
        };
      });

      const formattedCoins = coinTransData.map((ct: any) => ({
        id: `coin-${ct.id}`,
        type: 'coin_receive',
        amount: ct.amount,
        description: ct.description,
        created_at: ct.created_at,
        is_read: readList.has(`coin-${ct.id}`),
        actor: {
          username: 'HypeSystem',
          avatar_url: '/asets/png/logo.png',
        },
      }));

      const formattedPayments = paymentsData.map((py: any) => ({
        id: `pay-${py.id}`,
        type: 'payment_status',
        status: py.status,
        amount: py.amount,
        created_at: py.created_at,
        is_read: readList.has(`pay-${py.id}`),
        actor: {
          username: 'HypeFinance',
          avatar_url: '/asets/png/logo.png',
        },
      }));

      // Normalisasi DB notifs (follow & lainnya) – jangan filter actor
      const normalizedDbNotifs = allFilteredDbNotifs
        .map((n) => {
          const isFollow = n.type === 'follow';
          if (!n.actor_id) {
            // jika tidak ada actor_id, mungkin notifikasi sistem, tetap tampilkan
            return {
              ...n,
              type: isFollow ? 'follow' : n.type || 'other',
              actor: null,
              is_db: true,
            };
          }
          return {
            ...n,
            type: isFollow ? 'follow' : n.type || 'other',
            actor: getActor(n.actor_id),
            is_db: true,
          };
        })
        .filter(Boolean);

      const allRaw = [
        ...normalizedDbNotifs,
        ...finalLikesNotifs,
        ...formattedComments,
        ...formattedReposts,
        ...formattedSaves,
        ...formattedCommentLikes,
        ...formattedCoins,
        ...formattedPayments,
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const uniqueNotifs = Array.from(
        new Map(allRaw.map((item) => [item.id, item])).values()
      );
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
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadNotifications(userId);
        }
      )
      .subscribe();
  };

  const markCategoryAsRead = async (category: string) => {
    let updated = [...rawNotifs];
    let dbIdsToUpdate: string[] = [];
    let localIdsToUpdate: string[] = [];

    updated = updated.map((n) => {
      let match = false;
      if (
        category === 'like' &&
        ['like', 'repost', 'save', 'comment_like', 'like_group'].includes(
          n.type
        )
      )
        match = true;
      if (category === 'comment' && ['comment', 'reply'].includes(n.type))
        match = true;
      if (category === 'follow' && n.type === 'follow') match = true;
      if (
        category === 'other' &&
        ![
          'like',
          'repost',
          'save',
          'comment_like',
          'like_group',
          'comment',
          'reply',
          'follow',
        ].includes(n.type)
      )
        match = true;

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
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', dbIdsToUpdate);
    }

    window.dispatchEvent(new Event('notif-count-changed'));
  };

  const handleNotifClick = async (notif: any) => {
    if (!notif.is_read) {
      setRawNotifs((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );

      if (notif.is_db) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notif.id);
      } else {
        saveReadNotifs([notif.id]);
      }

      window.dispatchEvent(new Event('notif-count-changed'));
    }

    if (notif.type === 'follow' && notif.actor_id) {
      router.push(`/data?id=${notif.actor_id}`);
    } else if (
      (notif.type === 'comment' || notif.type === 'comment_like') &&
      notif.post_id
    ) {
      router.push(`/post?id=${notif.post_id}&openComment=true`);
    } else if (notif.type === 'story_like' && notif.story_id) {
      router.push(`/story/${notif.story_id}`);
    } else if (
      notif.type === 'payment_status' ||
      notif.type === 'coin_receive'
    ) {
      router.push(`/settings/wallet`);
    } else if (notif.post_id) {
      router.push(`/post?id=${notif.post_id}`);
    }
  };

  const handleFollowAction = async (
    e: React.MouseEvent,
    targetId: string
  ) => {
    e.stopPropagation();
    if (!currentUser) return;
    const isFollowing = myFollowings.has(targetId);
    if (isFollowing) {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetId);
      setMyFollowings((prev) => {
        const n = new Set(prev);
        n.delete(targetId);
        return n;
      });
    } else {
      const { error } = await supabase
        .from('followers')
        .insert({ follower_id: currentUser.id, following_id: targetId });
      if (!error) {
        setMyFollowings((prev) => new Set(prev).add(targetId));
        showNotif('Berhasil mengikuti!', 'success');
        await supabase.from('notifications').insert({
          user_id: targetId,
          actor_id: currentUser.id,
          type: 'follow',
          message: `mulai mengikuti Anda.`,
        });
      }
    }
  };

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'like':
      case 'like_group':
      case 'comment_like':
      case 'story_like':
        return { icon: 'favorite', color: '#ff2e63' };
      case 'comment':
      case 'reply':
        return { icon: 'chat_bubble', color: '#10b981' };
      case 'repost':
        return { icon: 'repeat', color: '#1DA1F2' };
      case 'save':
        return { icon: 'bookmark', color: '#f59e0b' };
      case 'gift':
      case 'coin_receive':
        return { icon: 'monetization_on', color: '#f59e0b' };
      case 'follow':
        return { icon: 'person_add', color: '#8b5cf6' };
      case 'mention':
        return { icon: 'alternate_email', color: '#1DA1F2' };
      case 'post_approved':
        return { icon: 'verified', color: '#10b981' };
      case 'payment_status':
        return { icon: 'account_balance_wallet', color: '#8b5cf6' };
      default:
        return { icon: 'notifications', color: '#3b82f6' };
    }
  };

  const formatDate = (dateString: string) => {
    const dateObj = new Date(dateString);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    return isToday
      ? `${t('today', 'Hari ini')}, ${dateObj.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : dateObj.toLocaleDateString('id-ID', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const unreadCounts = {
    like: rawNotifs.filter(
      (n) =>
        !n.is_read &&
        ['like', 'repost', 'save', 'comment_like', 'like_group'].includes(
          n.type
        )
    ).length,
    comment: rawNotifs.filter(
      (n) => !n.is_read && ['comment', 'reply'].includes(n.type)
    ).length,
    follow: rawNotifs.filter(
      (n) => !n.is_read && n.type === 'follow'
    ).length,
    other: rawNotifs.filter(
      (n) =>
        !n.is_read &&
        ['coin_receive', 'payment_status', 'other'].includes(n.type)
    ).length,
  };

  const filteredNotifs = rawNotifs.filter((n) => {
    if (activeView === 'like')
      return ['like', 'repost', 'save', 'comment_like', 'like_group'].includes(
        n.type
      );
    if (activeView === 'comment')
      return ['comment', 'reply'].includes(n.type);
    if (activeView === 'follow') return n.type === 'follow';
    if (activeView === 'other')
      return ![
        'like',
        'repost',
        'save',
        'comment_like',
        'like_group',
        'comment',
        'reply',
        'follow',
      ].includes(n.type);
    return true;
  });

  const getTitleByView = () => {
    switch (activeView) {
      case 'like':
        return 'Suka & Simpan';
      case 'comment':
        return 'Komentar';
      case 'follow':
        return 'Pengikut Baru';
      case 'other':
        return 'Sistem & Lainnya';
      default:
        return 'Notifikasi';
    }
  };

  return (
    <div className="notif-page-container">
      {activeView === 'main' ? (
        <div className="notif-main-view">
          <header className="notif-header">
            <h2>{t('notifications', 'Notifikasi')}</h2>
          </header>

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
                  if (e.key === 'Enter')
                    handleUpdateStatus(e.currentTarget.value);
                }}
              />
              <button
                onClick={() => setShowStatusInput(false)}
                className="back-btn"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
          )}

          {pendingCount > 0 && (
            <div
              className="pending-alert-box"
              onClick={() => router.push('/pending')}
            >
              <div className="pending-alert-left">
                <div className="pending-icon-wrap">
                  <span
                    className="material-icons"
                    style={{ fontSize: '20px' }}
                  >
                    pending_actions
                  </span>
                </div>
                <div className="pending-text">
                  <span className="pending-title">
                    Menunggu Review <span>({pendingCount})</span>
                  </span>
                  <span className="pending-desc">
                    Karyamu sedang dalam antrean pengecekan.
                  </span>
                </div>
              </div>
              <span className="material-icons pending-chevron">
                chevron_right
              </span>
            </div>
          )}

          <CategoryMenu
            unreadCounts={unreadCounts}
            onSelectCategory={setActiveView}
          />
          <RecommendedFriends
            recommended={recommendedFriends}
            onFollow={handleFollowAction}
            myFollowings={myFollowings}
          />
        </div>
      ) : (
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
      )}
    </div>
  );
}