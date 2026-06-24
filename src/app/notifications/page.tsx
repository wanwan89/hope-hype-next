'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import './Notifications.css';

// Komponen
import FriendStoriesTray from '@/components/notifications/FriendStoriesTray';
import CategoryMenu from '@/components/notifications/CategoryMenu';
import RecommendedFriends from '@/components/notifications/RecommendedFriends';
import NotificationListView from '@/components/notifications/NotificationListView';

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
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const initUserAndData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    const userData = { ...session.user, ...profile };
    setCurrentUser(userData);
    if (profile?.status_text) {
      setMyStatusText(profile.status_text);
    }

    const { data: fData } = await supabase.from('followers').select('following_id').eq('follower_id', session.user.id);
    const followingIds = new Set(fData ? fData.map(f => String(f.following_id)) : []);
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
      await supabase.from('user_notes').insert({ user_id: currentUser.id, content: newText });
      await supabase.from('profiles').update({ status_text: newText }).eq('id', currentUser.id);
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

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: stories } = await supabase
        .from('stories')
        .select('id, creator_id')
        .in('creator_id', arrIds)
        .gte('created_at', twentyFourHoursAgo);

      const storyMap = new Map();
      (stories || []).forEach(s => { storyMap.set(s.creator_id, s.id); });

      const mappedFriends = profiles.map(p => ({
        ...p,
        hasStory: storyMap.has(p.id),
        storyId: storyMap.get(p.id) || null,
      }));

      mappedFriends.sort((a, b) => (b.hasStory ? 1 : 0) - (a.hasStory ? 1 : 0));
      setFriendStories(mappedFriends);
    } catch (err) { console.error("Gagal load story teman:", err); }
  };

  const loadRecommendedFriends = async (myId: string, followingIds: Set<string>) => {
    try {
      const arrAvoid = [myId, ...Array.from(followingIds)];
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .not('id', 'in', `(${arrAvoid.join(',')})`)
        .limit(10);
      if (data) setRecommendedFriends(data);
    } catch (err) { console.error("Gagal load saran teman", err); }
  };

  const loadNotifications = async (userId: string) => {
    setIsLoading(true);
    try {
      const { count: pendingPosts } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('creator_id', userId).eq('status', 'pending');
      setPendingCount(pendingPosts || 0);

      const { data: dbNotifs } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      const myPostsRes = await supabase.from('posts').select('id, image_url, video_url').eq('creator_id', userId);
      const myPosts = myPostsRes.data || [];
      const postIds = myPosts.map(p => p.id);

      const myCommentsRes = await supabase.from('comments').select('id, post_id').eq('user_id', userId);
      const myComments = myCommentsRes.data || [];
      const commentIds = myComments.map(c => c.id);

      let likesData: any[] = []; let commentsData: any[] = []; let repostsData: any[] = []; let savesData: any[] = [];
      let coinTransData: any[] = []; let commentLikesData: any[] = []; let paymentsData: any[] = [];

      if (postIds.length > 0) {
        const [likesRes, commentsRes, repostsRes, savesRes] = await Promise.all([
          supabase.from('likes').select('id, post_id, created_at, user_id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30),
          supabase.from('comments').select('id, post_id, content, created_at, user_id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(30),
          supabase.from('reposts').select('id, post_id, created_at, user_id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(20),
          supabase.from('bookmarks').select('id, post_id, created_at, user_id').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        ]);
        likesData = likesRes.data || []; commentsData = commentsRes.data || []; repostsData = repostsRes.data || []; savesData = savesRes.data || [];
      }

      const promisesExtra = [];
      promisesExtra.push(supabase.from('coin_transactions').select('*').eq('user_id', userId).gt('amount', 0).order('created_at', { ascending: false }).limit(20));
      if (commentIds.length > 0) promisesExtra.push(supabase.from('comment_likes').select('id, comment_id, created_at, user_id').in('comment_id', commentIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(20));
      else promisesExtra.push(Promise.resolve({ data: [] }));
      promisesExtra.push(supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20));

      const [coinRes, commentLikesRes, paymentsRes] = await Promise.all(promisesExtra);
      coinTransData = coinRes.data || []; commentLikesData = commentLikesRes.data || []; paymentsData = paymentsRes.data || [];

      const allActorIds = new Set<string>();
      (dbNotifs || []).forEach(n => { if (n.actor_id) allActorIds.add(n.actor_id); });
      likesData.forEach(l => allActorIds.add(l.user_id)); commentsData.forEach(c => allActorIds.add(c.user_id));
      repostsData.forEach(r => allActorIds.add(r.user_id)); savesData.forEach(s => allActorIds.add(s.user_id));
      commentLikesData.forEach(cl => allActorIds.add(cl.user_id));

      let profilesMap: Record<string, any> = {};
      if (allActorIds.size > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, username, avatar_url, role').in('id', Array.from(allActorIds));
        if (profs) profs.forEach(p => { profilesMap[p.id] = p; });
      }

      const likesByPostId: Record<string, any[]> = {};
      likesData.forEach((l: any) => {
        const key = l.post_id;
        if (!likesByPostId[key]) likesByPostId[key] = [];
        likesByPostId[key].push(l);
      });

      let finalLikesNotifs: any[] = [];

      Object.entries(likesByPostId).forEach(([postId, likes]) => {
        if (likes.length <= 10) {
          finalLikesNotifs.push(
            ...likes.map((l: any) => ({
              id: `like-${l.id}`,
              type: 'like',
              post_id: l.post_id,
              actor_id: l.user_id,
              created_at: l.created_at,
              is_read: true,
              actor: profilesMap[l.user_id],
              postData: myPosts.find(p => p.id === l.post_id),
            }))
          );
        } else {
          const firstTwo = likes.slice(0, 2);
          const otherCount = likes.length - 2;
          finalLikesNotifs.push({
            id: `like-group-${postId}`,
            type: 'like_group',
            post_id: postId,
            actor_ids: firstTwo.map(l => l.user_id),
            otherCount,
            created_at: likes[0].created_at,
            is_read: true,
            actors: firstTwo.map(l => profilesMap[l.user_id]),
            postData: myPosts.find(p => p.id === postId),
          });
        }
      });

      const formattedComments = commentsData.map((c: any) => ({ id: `comment-${c.id}`, type: 'comment', post_id: c.post_id, actor_id: c.user_id, message: c.content, created_at: c.created_at, is_read: true, actor: profilesMap[c.user_id], postData: myPosts.find(p => p.id === c.post_id) }));
      const formattedReposts = repostsData.map((r: any) => ({ id: `repost-${r.id}`, type: 'repost', post_id: r.post_id, actor_id: r.user_id, created_at: r.created_at, is_read: true, actor: profilesMap[r.user_id], postData: myPosts.find(p => p.id === r.post_id) }));
      const formattedSaves = savesData.map((s: any) => ({ id: `save-${s.id}`, type: 'save', post_id: s.post_id, actor_id: s.user_id, created_at: s.created_at, is_read: true, actor: profilesMap[s.user_id], postData: myPosts.find(p => p.id === s.post_id) }));
      const formattedCommentLikes = commentLikesData.map((cl: any) => { const relatedComment = myComments.find(c => c.id === cl.comment_id); return { id: `comment_like-${cl.id}`, type: 'comment_like', post_id: relatedComment?.post_id, actor_id: cl.user_id, created_at: cl.created_at, is_read: true, actor: profilesMap[cl.user_id], postData: myPosts.find(p => p.id === relatedComment?.post_id) }; });
      const formattedCoins = coinTransData.map((ct: any) => ({ id: `coin-${ct.id}`, type: 'coin_receive', amount: ct.amount, description: ct.description, created_at: ct.created_at, is_read: true, actor: { username: 'HypeSystem', avatar_url: '/asets/png/logo.png' } }));
      const formattedPayments = paymentsData.map((py: any) => ({ id: `pay-${py.id}`, type: 'payment_status', status: py.status, amount: py.amount, created_at: py.created_at, is_read: true, actor: { username: 'HypeFinance', avatar_url: '/asets/png/logo.png' } }));

      const normalizedDbNotifs = (dbNotifs || []).map(n => {
        const isFollow = n.message?.toLowerCase().includes('mengikuti') || n.type === 'follow';
        return { ...n, type: isFollow ? 'follow' : n.type || 'other', actor: profilesMap[n.actor_id] || { username: 'Seseorang', avatar_url: '/asets/png/profile.webp' } };
      });

      const allRaw = [...normalizedDbNotifs, ...finalLikesNotifs, ...formattedComments, ...formattedReposts, ...formattedSaves, ...formattedCommentLikes, ...formattedCoins, ...formattedPayments]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const uniqueNotifs = Array.from(new Map(allRaw.map(item => [item.id, item])).values());
      setRawNotifs(uniqueNotifs);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const setupRealtime = (userId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase
      .channel(`notif-realtime-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        loadNotifications(userId);
      })
      .subscribe();
  };

  const handleNotifClick = async (notif: any) => {
    if (!notif.is_read && notif.id && !String(notif.id).includes('-')) {
      setRawNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }

    if (notif.type === 'follow' && notif.actor_id) {
      router.push(`/data?id=${notif.actor_id}`);
    } else if ((notif.type === 'comment' || notif.type === 'comment_like') && notif.post_id) {
      router.push(`/post?id=${notif.post_id}&openComment=true`);
    } else if (notif.type === 'story_like' && notif.story_id) {
      router.push(`/story/${notif.story_id}`);
    } else if (notif.type === 'payment_status' || notif.type === 'coin_receive') {
      router.push(`/settings/wallet`);
    } else if (notif.post_id) {
      router.push(`/post?id=${notif.post_id}`);
    }
  };

  const handleFollowAction = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (!currentUser) return;

    const isFollowing = myFollowings.has(targetId);
    if (isFollowing) {
      await supabase.from('followers').delete().eq('follower_id', currentUser.id).eq('following_id', targetId);
      setMyFollowings(prev => { const n = new Set(prev); n.delete(targetId); return n; });
    } else {
      const { error } = await supabase.from('followers').insert({ follower_id: currentUser.id, following_id: targetId });
      if (!error) {
        setMyFollowings(prev => new Set(prev).add(targetId));
        showNotif("Berhasil mengikuti!", "success");
        await supabase.from('notifications').insert({ user_id: targetId, actor_id: currentUser.id, type: 'follow', message: `mulai mengikuti Anda.` });
      }
    }
  };

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'like': return { icon: 'favorite', color: '#ff2e63' };
      case 'comment': return { icon: 'chat_bubble', color: '#10b981' };
      case 'reply': return { icon: 'reply', color: '#10b981' };
      case 'comment_like': return { icon: 'favorite', color: '#ff2e63' };
      case 'repost': return { icon: 'repeat', color: '#1DA1F2' };
      case 'save': return { icon: 'bookmark', color: '#f59e0b' };
      case 'story_like': return { icon: 'favorite', color: '#ff2e63' };
      case 'gift':
      case 'coin_receive': return { icon: 'monetization_on', color: '#f59e0b' };
      case 'follow': return { icon: 'person_add', color: '#8b5cf6' };
      case 'mention': return { icon: 'alternate_email', color: '#1DA1F2' };
      case 'post_approved': return { icon: 'verified', color: '#10b981' };
      case 'payment_status': return { icon: 'account_balance_wallet', color: '#8b5cf6' };
      default: return { icon: 'notifications', color: '#3b82f6' };
    }
  };

  const formatDate = (dateString: string) => {
    const dateObj = new Date(dateString);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    return isToday
      ? `${t('today', 'Hari ini')}, ${dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
      : dateObj.toLocaleDateString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const unreadCounts = {
    like: rawNotifs.filter(n => !n.is_read && ['like', 'repost', 'save', 'comment_like'].includes(n.type)).length,
    comment: rawNotifs.filter(n => !n.is_read && ['comment', 'reply'].includes(n.type)).length,
    follow: rawNotifs.filter(n => !n.is_read && n.type === 'follow').length,
    other: rawNotifs.filter(n => !n.is_read && ['coin_receive', 'payment_status', 'other'].includes(n.type)).length,
  };

  const filteredNotifs = rawNotifs.filter(n => {
    if (activeView === 'like') return ['like', 'repost', 'save', 'comment_like'].includes(n.type);
    if (activeView === 'comment') return ['comment', 'reply'].includes(n.type);
    if (activeView === 'follow') return n.type === 'follow';
    if (activeView === 'other') return !['like', 'repost', 'save', 'comment_like', 'comment', 'reply', 'follow'].includes(n.type);
    return true;
  });

  const getTitleByView = () => {
    switch (activeView) {
      case 'like': return 'Suka & Simpan';
      case 'comment': return 'Komentar';
      case 'follow': return 'Pengikut Baru';
      case 'other': return 'Sistem & Lainnya';
      default: return 'Notifikasi';
    }
  };

  const handleFriendNoteClick = (friendId: string) => {
    router.push(`/data?id=${friendId}`);
  };

  return (
    <div className="notif-page-container" style={{ background: 'var(--bg-main)' }}>
      <style>{`
        .notif-page-container {
          height: 100dvh;
          overflow-y: auto;
          overflow-x: hidden;
          background: var(--bg-main);
          padding-bottom: 80px;
          -webkit-overflow-scrolling: touch;
        }
        .friend-stories-tray {
          display: flex; gap: 16px; padding: 15px; overflow-x: auto; scrollbar-width: none;
          border-bottom: 1px solid var(--border-card); background: var(--bg-main);
        }
        .friend-stories-tray::-webkit-scrollbar { display: none; }
        .story-avatar-container {
          display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; flex-shrink: 0; width: 68px;
        }
        .story-ring {
          width: 64px; height: 64px; border-radius: 50%; padding: 3px; display: flex; align-items: center; justify-content: center;
        }
        .story-ring.active-story {
          background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
        }
        .story-ring.no-story {
          background: var(--border-card);
        }
        .story-ring img {
          width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--bg-main);
        }
        .story-ring .default-avatar {
          width: 100%; height: 100%; border-radius: 50%; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center;
        }
        .story-username {
          font-size: 11px; color: var(--text-main); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; text-align: center;
        }
        .story-status-text {
          font-size: 9px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 64px; text-align: center; cursor: pointer;
        }
        .add-status-btn {
          position: absolute; bottom: 2px; right: 2px; background: #1f3cff; border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .status-input-container {
          display: flex; gap: 8px; padding: 10px 15px; background: var(--bg-main); border-bottom: 1px solid var(--border-card);
        }
        .status-input {
          flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-card); background: var(--bg-input); color: var(--text-main); font-size: 14px;
        }
        .pending-alert-box {
          display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); border: 1px solid var(--border-card); padding: 14px 16px; border-radius: 16px; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.02); transition: all 0.2s ease; margin: 10px 15px;
        }
        .pending-alert-box:active { transform: scale(0.98); background: var(--bg-secondary); }
        .pending-alert-left { display: flex; align-items: center; gap: 14px; }
        .pending-icon-wrap { width: 40px; height: 40px; border-radius: 12px; background: rgba(245, 158, 11, 0.1); display: flex; align-items: center; justify-content: center; color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
        .pending-text { display: flex; flex-direction: column; gap: 2px; }
        .pending-title { font-size: 14px; font-weight: 800; color: var(--text-main); }
        .pending-title span { color: #f59e0b; }
        .pending-desc { font-size: 12px; color: var(--text-muted); font-weight: 500; }
        .pending-chevron { color: var(--text-muted); font-size: 20px; opacity: 0.5; }
        .category-menu-list { padding: 10px 15px; border-bottom: 1px solid var(--border-card); }
        .category-menu-item { display: flex; align-items: center; gap: 15px; padding: 12px 0; border-bottom: 1px solid rgba(128,128,128,0.08); cursor: pointer; }
        .category-menu-item:last-child { border-bottom: none; }
        .category-icon-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .category-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .category-title { font-size: 15px; font-weight: 700; color: var(--text-main); }
        .category-desc { font-size: 12px; color: var(--text-muted); }
        .category-badge { background: #ff4757; color: white; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 10px; }
        .chevron { color: var(--text-muted); }
        .recommended-section { padding: 20px 15px; }
        .section-title { font-size: 16px; font-weight: 800; color: var(--text-main); margin-bottom: 15px; margin-top: 0; }
        .recommended-list { display: flex; flex-direction: column; gap: 15px; }
        .recommended-card { display: flex; align-items: center; gap: 12px; }
        .recommended-card img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; cursor: pointer; border: 1px solid var(--border-card); }
        .rec-info { flex: 1; cursor: pointer; }
        .rec-name { font-size: 14px; font-weight: 700; color: var(--text-main); }
        .rec-user { font-size: 12px; color: var(--text-muted); }
        .rec-follow-btn { background: #1f3cff; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
        .rec-follow-btn.followed { background: var(--bg-secondary); color: var(--text-main); border: 1px solid var(--border-card); }
        .notif-detail-view { background: var(--bg-main); animation: slideIn 0.3s cubic-bezier(0.25, 1, 0.5, 1); min-height: 100%; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .notif-detail-header { display: flex; align-items: center; gap: 15px; padding: 15px; border-bottom: 1px solid var(--border-card); position: sticky; top: 0; background: var(--bg-main); z-index: 10; }
        .back-btn { background: none; border: none; color: var(--text-main); cursor: pointer; display: flex; align-items: center; padding: 0; }
        .notif-detail-header h2 { margin: 0; font-size: 18px; font-weight: 800; color: var(--text-main); }
        .notif-item { padding: 12px 15px; display: flex; align-items: flex-start; gap: 12px; border-bottom: 1px solid var(--border-card); cursor: pointer; position: relative; }
        .notif-item.unread { background: rgba(29, 161, 242, 0.03); }
        .notif-avatar-wrapper { position: relative; flex-shrink: 0; }
        .notif-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-card); }
        .notif-avatar.default-avatar { background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .notif-icon-badge { position: absolute; bottom: -4px; right: -4px; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--bg-main); }
        .notif-icon-badge .material-icons { font-size: 12px; color: white; }
        .notif-content { flex: 1; min-width: 0; }
        .notif-text { font-size: 14px; color: var(--text-main); line-height: 1.4; }
        .notif-date { font-size: 12px; color: var(--text-muted); margin-top: 4px; display: block; }
        .notif-action-area { flex-shrink: 0; display: flex; align-items: center; margin-left: 8px; }
        .notif-follow-btn { background: #1f3cff; color: white; border: none; padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .notif-follow-btn.followed { background: var(--bg-secondary); color: var(--text-main); border: 1px solid var(--border-card); }
        .notif-post-thumb { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; }
        .notif-unread-dot { position: absolute; top: 15px; right: 15px; width: 8px; height: 8px; background: #1f3cff; border-radius: 50%; }
        .btn-press { transition: transform 0.1s ease; }
        .btn-press:active { transform: scale(0.95); }
      `}</style>

      {activeView === 'main' ? (
        <div className="notif-main-view" style={{ background: 'var(--bg-main)' }}>
          <header className="notif-header" style={{ padding: '20px 15px 15px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', background: 'var(--bg-main)' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, textAlign: 'left', color: 'var(--text-main)' }}>
              {t('notifications', 'Notifikasi')}
            </h2>
          </header>

          <FriendStoriesTray
            friends={friendStories}
            currentUser={currentUser}
            myStatusText={myStatusText}
            onAddStatus={() => setShowStatusInput(true)}
            router={router}
            onFriendNoteClick={handleFriendNoteClick}
          />

          {showStatusInput && (
            <div className="status-input-container">
              <input
                type="text"
                placeholder="Tulis note atau status..."
                maxLength={100}
                defaultValue={myStatusText}
                autoFocus
                className="status-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateStatus(e.currentTarget.value);
                  }
                }}
              />
              <button
                onClick={() => setShowStatusInput(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
          )}

          {pendingCount > 0 && (
            <div className="pending-alert-box" onClick={() => router.push('/pending')}>
              <div className="pending-alert-left">
                <div className="pending-icon-wrap"><span className="material-icons" style={{ fontSize: '20px' }}>pending_actions</span></div>
                <div className="pending-text">
                  <span className="pending-title">Menunggu Review <span>({pendingCount})</span></span>
                  <span className="pending-desc">Karyamu sedang dalam antrean pengecekan.</span>
                </div>
              </div>
              <span className="material-icons pending-chevron">chevron_right</span>
            </div>
          )}

          <CategoryMenu unreadCounts={unreadCounts} onSelectCategory={setActiveView} />
          <RecommendedFriends recommended={recommendedFriends} onFollow={handleFollowAction} myFollowings={myFollowings} />
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
