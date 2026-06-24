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
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // ✅ Tandai semua notifikasi di subkategori sebagai terbaca saat subkategori dibuka
  useEffect(() => {
    if (activeView !== 'main') {
      markCategoryAsRead(activeView);
    }
  }, [activeView]);

  const initUserAndData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    const userData = { ...session.user, ...profile };
    setCurrentUser(userData);
    if (profile?.status_text) { setMyStatusText(profile.status_text); }

    const { data: fData } = await supabase.from('followers').select('following_id').eq('follower_id', session.user.id);
    const followingIds = new Set(fData ? fData.map((f) => String(f.following_id)) : []);
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
      const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url, status_text').in('id', arrIds);
      if (!profiles) return;

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: stories } = await supabase.from('stories').select('id, creator_id').in('creator_id', arrIds).gte('created_at', twentyFourHoursAgo);

      const storyMap = new Map();
      (stories || []).forEach((s) => { storyMap.set(s.creator_id, s.id); });

      const mappedFriends = profiles.map((p) => ({
        ...p,
        hasStory: storyMap.has(p.id),
        storyId: storyMap.get(p.id) || null,
      }));

      mappedFriends.sort((a, b) => (b.hasStory ? 1 : 0) - (a.hasStory ? 1 : 0));
      setFriendStories(mappedFriends);
    } catch (err) { console.error('Gagal load story teman:', err); }
  };

  const loadRecommendedFriends = async (myId: string, followingIds: Set<string>) => {
    try {
      const arrAvoid = [myId, ...Array.from(followingIds)];
      const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url').not('id', 'in', `(${arrAvoid.join(',')})`).limit(10);
      if (data) setRecommendedFriends(data);
    } catch (err) { console.error('Gagal load saran teman', err); }
  };

  const loadNotifications = async (userId: string) => {
    setIsLoading(true);
    try {
      const { count: pendingPosts } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('creator_id', userId).eq('status', 'pending');
      setPendingCount(pendingPosts || 0);

      const { data: dbNotifs } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);

      const synthesizeTypes = ['like', 'comment', 'repost', 'save', 'comment_like'];
      const filteredDbNotifs = (dbNotifs || []).filter((n) => !synthesizeTypes.includes(n.type));

      const myPostsRes = await supabase.from('posts').select('id, image_url, video_url').eq('creator_id', userId);
      const myPosts = myPostsRes.data || [];
      const postIds = myPosts.map((p) => p.id);

      const myCommentsRes = await supabase.from('comments').select('id, post_id').eq('user_id', userId);
      const myComments = myCommentsRes.data || [];
      const commentIds = myComments.map((c) => c.id);

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
      filteredDbNotifs.forEach((n) => { if (n.actor_id) allActorIds.add(n.actor_id); });
      likesData.forEach((l) => allActorIds.add(l.user_id)); commentsData.forEach((c) => allActorIds.add(c.user_id));
      repostsData.forEach((r) => allActorIds.add(r.user_id)); savesData.forEach((s) => allActorIds.add(s.user_id));
      commentLikesData.forEach((cl) => allActorIds.add(cl.user_id));

      let profilesMap: Record<string, any> = {};
      if (allActorIds.size > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, username, avatar_url, role').in('id', Array.from(allActorIds));
        if (profs) { profs.forEach((p) => { profilesMap[p.id] = p; }); }
      }

      // 🔥 LOGIKA BARU UNTUK GROUPING LIKES (2 orang + Lainnya)
      const likesByPostId: Record<string, any[]> = {};
      likesData.forEach((l: any) => {
        if (!likesByPostId[l.post_id]) likesByPostId[l.post_id] = [];
        likesByPostId[l.post_id].push(l);
      });

      let finalLikesNotifs: any[] = [];

      Object.entries(likesByPostId).forEach(([postId, likes]) => {
        const uniqueLikersMap = new Map(likes.map(l => [l.user_id, l]));
        const uniqueLikers = Array.from(uniqueLikersMap.values()).filter(l => profilesMap[l.user_id]); 

        if (uniqueLikers.length === 0) return;

        if (uniqueLikers.length === 1) {
          const l = uniqueLikers[0];
          finalLikesNotifs.push({
            id: `like-${l.id}`,
            type: 'like',
            post_id: postId,
            actor_id: l.user_id,
            created_at: l.created_at,
            is_read: true,
            actor: profilesMap[l.user_id],
            postData: myPosts.find((p) => p.id === postId),
          });
        } else {
          const firstTwoIds = uniqueLikers.slice(0, 2).map(l => l.user_id);
          const otherCount = uniqueLikers.length - 2 > 0 ? uniqueLikers.length - 2 : 0;
          finalLikesNotifs.push({
            id: `like-group-${postId}`,
            type: 'like_group',
            post_id: postId,
            actor_ids: firstTwoIds,
            otherCount,
            created_at: uniqueLikers[0].created_at,
            is_read: true,
            actors: firstTwoIds.map(id => profilesMap[id]),
            postData: myPosts.find((p) => p.id === postId),
          });
        }
      });

      // Hilangkan fallback "Pengguna", jika Profil tidak ditemukan, lewati.
      const formattedComments = commentsData.filter(c => profilesMap[c.user_id]).map((c: any) => ({
        id: `comment-${c.id}`, type: 'comment', post_id: c.post_id, actor_id: c.user_id, message: c.content, created_at: c.created_at, is_read: true, actor: profilesMap[c.user_id], postData: myPosts.find((p) => p.id === c.post_id),
      }));
      const formattedReposts = repostsData.filter(r => profilesMap[r.user_id]).map((r: any) => ({
        id: `repost-${r.id}`, type: 'repost', post_id: r.post_id, actor_id: r.user_id, created_at: r.created_at, is_read: true, actor: profilesMap[r.user_id], postData: myPosts.find((p) => p.id === r.post_id),
      }));
      const formattedSaves = savesData.filter(s => profilesMap[s.user_id]).map((s: any) => ({
        id: `save-${s.id}`, type: 'save', post_id: s.post_id, actor_id: s.user_id, created_at: s.created_at, is_read: true, actor: profilesMap[s.user_id], postData: myPosts.find((p) => p.id === s.post_id),
      }));
      const formattedCommentLikes = commentLikesData.filter(cl => profilesMap[cl.user_id]).map((cl: any) => {
        const relatedComment = myComments.find((c) => c.id === cl.comment_id);
        return { id: `comment_like-${cl.id}`, type: 'comment_like', post_id: relatedComment?.post_id, actor_id: cl.user_id, created_at: cl.created_at, is_read: true, actor: profilesMap[cl.user_id], postData: myPosts.find((p) => p.id === relatedComment?.post_id) };
      });
      const formattedCoins = coinTransData.map((ct: any) => ({
        id: `coin-${ct.id}`, type: 'coin_receive', amount: ct.amount, description: ct.description, created_at: ct.created_at, is_read: true, actor: { username: 'HypeSystem', avatar_url: '/asets/png/logo.png' },
      }));
      const formattedPayments = paymentsData.map((py: any) => ({
        id: `pay-${py.id}`, type: 'payment_status', status: py.status, amount: py.amount, created_at: py.created_at, is_read: true, actor: { username: 'HypeFinance', avatar_url: '/asets/png/logo.png' },
      }));

      // 🔥 FIX BADGE TIDAK HILANG: Tambahkan is_db agar sistem tahu ini ID asli dari database 🔥
      const normalizedDbNotifs = filteredDbNotifs.map((n) => {
        const isFollow = n.message?.toLowerCase().includes('mengikuti') || n.type === 'follow';
        if (!n.actor_id || !profilesMap[n.actor_id]) return null;
        return { 
          ...n, 
          type: isFollow ? 'follow' : n.type || 'other', 
          actor: profilesMap[n.actor_id],
          is_db: true // Digunakan untuk menandai update UUID ke Database
        };
      }).filter(Boolean);

      const allRaw = [ ...normalizedDbNotifs, ...finalLikesNotifs, ...formattedComments, ...formattedReposts, ...formattedSaves, ...formattedCommentLikes, ...formattedCoins, ...formattedPayments ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const uniqueNotifs = Array.from(new Map(allRaw.map((item) => [item.id, item])).values());
      setRawNotifs(uniqueNotifs);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const setupRealtime = (userId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase.channel(`notif-realtime-${userId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => { loadNotifications(userId); }).subscribe();
  };

  // ✅ PERBAIKAN BUG BADGE LAMA HILANG: Cek menggunakan `n.is_db`
  const markCategoryAsRead = (category: string) => {
    let updated = [...rawNotifs];
    let idsToUpdate: string[] = [];

    updated = updated.map((n) => {
      let match = false;
      if (category === 'like' && ['like', 'repost', 'save', 'comment_like', 'like_group'].includes(n.type)) match = true;
      if (category === 'comment' && ['comment', 'reply'].includes(n.type)) match = true;
      if (category === 'follow' && n.type === 'follow') match = true;
      if (category === 'other' && !['like', 'repost', 'save', 'comment_like', 'like_group', 'comment', 'reply', 'follow'].includes(n.type)) match = true;

      if (match && !n.is_read) {
        if (n.is_db) {
          idsToUpdate.push(n.id);
        }
        return { ...n, is_read: true };
      }
      return n;
    });

    setRawNotifs(updated);

    if (idsToUpdate.length > 0) {
      supabase.from('notifications').update({ is_read: true }).in('id', idsToUpdate).then(({ error }) => {
        if (error) console.error('Gagal update notifikasi terbaca:', error);
      });
    }
  };

  const handleNotifClick = async (notif: any) => {
    if (!notif.is_read && notif.is_db) {
      setRawNotifs((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }

    if (notif.type === 'follow' && notif.actor_id) { router.push(`/data?id=${notif.actor_id}`);
    } else if ((notif.type === 'comment' || notif.type === 'comment_like') && notif.post_id) { router.push(`/post?id=${notif.post_id}&openComment=true`);
    } else if (notif.type === 'story_like' && notif.story_id) { router.push(`/story/${notif.story_id}`);
    } else if (notif.type === 'payment_status' || notif.type === 'coin_receive') { router.push(`/settings/wallet`);
    } else if (notif.post_id) { router.push(`/post?id=${notif.post_id}`); }
  };

  const handleFollowAction = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    const isFollowing = myFollowings.has(targetId);
    if (isFollowing) {
      await supabase.from('followers').delete().eq('follower_id', currentUser.id).eq('following_id', targetId);
      setMyFollowings((prev) => { const n = new Set(prev); n.delete(targetId); return n; });
    } else {
      const { error } = await supabase.from('followers').insert({ follower_id: currentUser.id, following_id: targetId });
      if (!error) {
        setMyFollowings((prev) => new Set(prev).add(targetId));
        showNotif('Berhasil mengikuti!', 'success');
        await supabase.from('notifications').insert({ user_id: targetId, actor_id: currentUser.id, type: 'follow', message: `mulai mengikuti Anda.` });
      }
    }
  };

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'like': case 'like_group': case 'comment_like': case 'story_like': return { icon: 'favorite', color: '#ff2e63' };
      case 'comment': case 'reply': return { icon: 'chat_bubble', color: '#10b981' };
      case 'repost': return { icon: 'repeat', color: '#1DA1F2' };
      case 'save': return { icon: 'bookmark', color: '#f59e0b' };
      case 'gift': case 'coin_receive': return { icon: 'monetization_on', color: '#f59e0b' };
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
    return isToday ? `${t('today', 'Hari ini')}, ${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', })}` : dateObj.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', });
  };

  const unreadCounts = {
    like: rawNotifs.filter((n) => !n.is_read && ['like', 'repost', 'save', 'comment_like', 'like_group'].includes(n.type)).length,
    comment: rawNotifs.filter((n) => !n.is_read && ['comment', 'reply'].includes(n.type)).length,
    follow: rawNotifs.filter((n) => !n.is_read && n.type === 'follow').length,
    other: rawNotifs.filter((n) => !n.is_read && ['coin_receive', 'payment_status', 'other'].includes(n.type)).length,
  };

  const filteredNotifs = rawNotifs.filter((n) => {
    if (activeView === 'like') return ['like', 'repost', 'save', 'comment_like', 'like_group'].includes(n.type);
    if (activeView === 'comment') return ['comment', 'reply'].includes(n.type);
    if (activeView === 'follow') return n.type === 'follow';
    if (activeView === 'other') return !['like', 'repost', 'save', 'comment_like', 'like_group', 'comment', 'reply', 'follow'].includes(n.type);
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

  return (
    // 🔥 Menggunakan var(--bg-card) agar murni putih (#ffffff) di light mode dan otomatis gelap di dark mode 🔥
    <div className="notif-page-container" style={{ background: 'var(--bg-card, #ffffff)' }}>
      {activeView === 'main' ? (
        <div className="notif-main-view" style={{ background: 'var(--bg-card, #ffffff)' }}>
          
          <header className="notif-header" style={{ padding: '20px 15px 15px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', background: 'var(--bg-card, #ffffff)', position: 'relative', zIndex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, textAlign: 'left', color: 'var(--text-main)' }}>
              {t('notifications', 'Notifikasi')}
            </h2>
          </header>

          <FriendStoriesTray friends={friendStories} currentUser={currentUser} myStatusText={myStatusText} onAddStatus={() => setShowStatusInput(true)} router={router} onFriendNoteClick={(id) => router.push(`/data?id=${id}`)} />

          {showStatusInput && (
            <div className="status-input-container" style={{ background: 'var(--bg-card, #ffffff)', borderBottom: '1px solid var(--border-card)' }}>
              <input type="text" placeholder="Tulis note (Maks. 50 Karakter)" maxLength={50} defaultValue={myStatusText} autoFocus className="status-input" style={{ background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-card)' }} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateStatus(e.currentTarget.value); }} />
              <button onClick={() => setShowStatusInput(false)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                <span className="material-icons">close</span>
              </button>
            </div>
          )}

          {pendingCount > 0 && (
            <div className="pending-alert-box" style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-card)' }} onClick={() => router.push('/pending')}>
              <div className="pending-alert-left">
                <div className="pending-icon-wrap"><span className="material-icons" style={{ fontSize: '20px' }}>pending_actions</span></div>
                <div className="pending-text">
                  <span className="pending-title" style={{ color: 'var(--text-main)' }}>Menunggu Review <span style={{ color: '#f59e0b' }}>({pendingCount})</span></span>
                  <span className="pending-desc" style={{ color: 'var(--text-muted)' }}>Karyamu sedang dalam antrean pengecekan.</span>
                </div>
              </div>
              <span className="material-icons pending-chevron" style={{ color: 'var(--text-muted)' }}>chevron_right</span>
            </div>
          )}

          <CategoryMenu unreadCounts={unreadCounts} onSelectCategory={setActiveView} />
          <RecommendedFriends recommended={recommendedFriends} onFollow={handleFollowAction} myFollowings={myFollowings} />
        </div>
      ) : (
        <NotificationListView title={getTitleByView()} notifs={filteredNotifs} onBack={() => setActiveView('main')} handleNotifClick={handleNotifClick} handleFollowBack={handleFollowAction} myFollowings={myFollowings} router={router} formatDate={formatDate} getIconAndColor={getIconAndColor} />
      )}
    </div>
  );
}
