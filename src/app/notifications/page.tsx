'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif, getUserBadge } from '@/lib/ui-utils'; 
import { useTranslation } from 'react-i18next';
import './Notifications.css';

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myFollowings, setMyFollowings] = useState<Set<string>>(new Set()); // Buat ngecek "Ikuti Balik"
  
  const [rawNotifs, setRawNotifs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'like' | 'comment' | 'follow'>('all');
  
  const [pendingCount, setPendingCount] = useState(0);

  const sliderRef = useRef<HTMLDivElement>(null);
  const autoSlideTimer = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    initUserAndNotifs();
    startAutoSlide();

    return () => {
      stopAutoSlide();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const initUserAndNotifs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setCurrentUser(session.user);
    
    // Tarik data followings buat tombol "Ikuti Balik"
    const { data: fData } = await supabase.from('followers').select('following_id').eq('follower_id', session.user.id);
    if (fData) {
      setMyFollowings(new Set(fData.map(f => String(f.following_id))));
    }

    await loadNotifications(session.user.id);
    setupRealtime(session.user.id);
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

      // 1. Fetch Notifikasi Umum (Follow, Mention, Post Approved, dll)
      const { data: dbNotifs } = await supabase
        .from('notifications')
        .select('*, profiles!actor_id(id, username, avatar_url, role)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const myPostsRes = await supabase.from('posts').select('id, image_url, video_url').eq('creator_id', userId);
      const myPosts = myPostsRes.data || [];
      const postIds = myPosts.map(p => p.id);

      let formattedLikes: any[] = [];
      let formattedComments: any[] = [];
      let formattedReposts: any[] = [];
      let formattedSaves: any[] = [];

      if (postIds.length > 0) {
        // 2. Fetch Likes
        const { data: likesData } = await supabase.from('likes')
          .select('id, post_id, created_at, user_id, profiles!user_id(id, username, avatar_url, role)')
          .in('post_id', postIds)
          .neq('user_id', userId)
          .order('created_at', { ascending: false }).limit(30);
        
        if (likesData) {
          formattedLikes = likesData.map((l: any) => ({
            id: `like-${l.id}`, type: 'like', post_id: l.post_id, user_id: userId, actor_id: l.user_id,
            created_at: l.created_at, is_read: true, actor: l.profiles,
            postData: myPosts.find(p => p.id === l.post_id)
          }));
        }

        // 3. Fetch Comments
        const { data: commentsData } = await supabase.from('comments')
          .select('id, post_id, comment, created_at, user_id, profiles!user_id(id, username, avatar_url, role)')
          .in('post_id', postIds)
          .neq('user_id', userId)
          .order('created_at', { ascending: false }).limit(30);

        if (commentsData) {
          formattedComments = commentsData.map((c: any) => ({
            id: `comment-${c.id}`, type: 'comment', post_id: c.post_id, user_id: userId, actor_id: c.user_id,
            message: c.comment, created_at: c.created_at, is_read: true, actor: c.profiles,
            postData: myPosts.find(p => p.id === c.post_id)
          }));
        }

        // 4. Fetch Reposts & Saves
        const { data: repostsData } = await supabase.from('reposts').select('id, post_id, created_at, user_id, profiles!user_id(id, username, avatar_url, role)').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(20);
        const { data: savesData } = await supabase.from('bookmarks').select('id, post_id, created_at, user_id, profiles!user_id(id, username, avatar_url, role)').in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(20);

        if (repostsData) {
          formattedReposts = repostsData.map((r: any) => ({
            id: `repost-${r.id}`, type: 'repost', post_id: r.post_id, actor_id: r.user_id,
            created_at: r.created_at, is_read: true, actor: r.profiles, postData: myPosts.find(p => p.id === r.post_id)
          }));
        }
        if (savesData) {
          formattedSaves = savesData.map((s: any) => ({
            id: `save-${s.id}`, type: 'save', post_id: s.post_id, actor_id: s.user_id,
            created_at: s.created_at, is_read: true, actor: s.profiles, postData: myPosts.find(p => p.id === s.post_id)
          }));
        }
      }

      // Normalisasi Notif Umum (Follow/Lainnya) biar format objectnya sama
      const normalizedDbNotifs = (dbNotifs || []).map(n => {
        const isFollow = n.message?.toLowerCase().includes('mengikuti') || n.type === 'follow';
        return {
          ...n, 
          type: isFollow ? 'follow' : n.type || 'other',
          actor: n.profiles || { username: 'Seseorang', avatar_url: '/asets/png/profile.webp' }
        };
      });

      const allRaw = [
        ...normalizedDbNotifs, 
        ...formattedLikes, 
        ...formattedComments,
        ...formattedReposts, 
        ...formattedSaves, 
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRawNotifs(allRaw);
    } catch (err) {
      console.error("Gagal load notif:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtime = (userId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`notif-realtime-${userId}`) 
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => { 
          // Re-fetch biar dapet avatar profile
          loadNotifications(userId); 
        }
      ).subscribe();
    channelRef.current = channel;
  };

  const startAutoSlide = () => {
    if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
    autoSlideTimer.current = setInterval(() => {
      if (sliderRef.current) {
        const slider = sliderRef.current;
        if (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 5) slider.scrollLeft = 0;
        else slider.scrollLeft += slider.clientWidth;
      }
    }, 5000);
  };

  const stopAutoSlide = () => {
    if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
  };

  const handleNotifClick = async (notif: any) => {
    if (!notif.is_read && notif.id && !String(notif.id).includes('-')) {
      setRawNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }

    if (notif.post_id) {
      router.push(`/?search=${notif.post_id}#post-${notif.post_id}`); // Ngarah langsung ke post
    } else if (notif.type === 'follow' && notif.actor_id) {
      router.push(`/data?id=${notif.actor_id}`); // Arahin ke profilnya
    }
  };

  const handleFollowBack = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (!currentUser) return;

    try {
      const { error } = await supabase.from('followers').insert({ follower_id: currentUser.id, following_id: targetId });
      if (!error) {
        setMyFollowings(prev => new Set(prev).add(targetId));
        showNotif("Berhasil mengikuti balik!", "success");
        // Kirim notif follow balik
        await supabase.from('notifications').insert({
          user_id: targetId, actor_id: currentUser.id, type: 'follow', message: `mulai mengikuti Anda kembali.`
        });
      }
    } catch (err) { console.error("Gagal follow back:", err); }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    setRawNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).eq('is_read', false);
      showNotif("Semua notifikasi ditandai sudah dibaca", "success");
    } catch (err) { console.error(err); }
  };

  const formatDate = (dateString: string) => {
    const dateObj = new Date(dateString);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    return isToday 
      ? `${t('today', 'Hari ini')}, ${dateObj.toLocaleTimeString("id-ID", {hour: "2-digit", minute:"2-digit"})}` 
      : dateObj.toLocaleDateString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute:"2-digit" });
  };

  // 🔥 FILTER DATA BERDASARKAN TAB 🔥
  const filteredNotifs = rawNotifs.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'like') return n.type === 'like' || n.type === 'repost' || n.type === 'save';
    if (activeTab === 'comment') return n.type === 'comment' || n.type === 'reply';
    if (activeTab === 'follow') return n.type === 'follow';
    return true;
  });

  const hasUnread = rawNotifs.some(n => !n.is_read && !String(n.id).includes('-'));

  return (
    <div className="notif-page-container">
      
      <style>{`
        .notif-category-tabs {
          display: flex; gap: 8px; overflow-x: auto; padding: 0 15px 15px; 
          scrollbar-width: none; border-bottom: 1px solid var(--border-card);
        }
        .notif-category-tabs::-webkit-scrollbar { display: none; }
        .notif-tab-btn {
          padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 700;
          background: var(--bg-secondary); color: var(--text-muted); border: 1px solid transparent;
          white-space: nowrap; cursor: pointer; transition: 0.2s;
        }
        .notif-tab-btn.active {
          background: rgba(31, 60, 255, 0.1); color: #1f3cff; border-color: rgba(31, 60, 255, 0.3);
        }
        .notif-avatar {
          width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-card);
        }
        .notif-post-thumb {
          width: 44px; height: 44px; border-radius: 8px; object-fit: cover;
        }
        .notif-follow-btn {
          background: #1f3cff; color: white; border: none; padding: 6px 12px; border-radius: 12px;
          font-size: 12px; font-weight: 700; cursor: pointer;
        }
        .notif-follow-btn.followed {
          background: var(--bg-secondary); color: var(--text-main); border: 1px solid var(--border-card);
        }
      `}</style>

      <header className="notif-header">
        <div className="notif-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '15px' }}>
          <h2 style={{ marginLeft: '10px', margin: 0 }}>{t('notifications', 'Notifikasi')}</h2>
          {hasUnread && (
            <button onClick={handleMarkAllAsRead} style={{ background: 'rgba(31, 60, 255, 0.1)', border: 'none', color: '#1f3cff', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              <span className="material-icons" style={{ fontSize: '16px' }}>done_all</span> Tandai Dibaca
            </button>
          )}
        </div>

        <div className="notif-ad-banner-container" onMouseEnter={stopAutoSlide} onMouseLeave={startAutoSlide}>
          <div className="notif-ad-slider" ref={sliderRef}>
            <video autoPlay loop muted playsInline className="ad-slide"><source src="/asets/gif/iklan1.webm" type="video/webm" /></video>
            <video autoPlay loop muted playsInline className="ad-slide"><source src="/asets/gif/iklan2.webm" type="video/webm" /></video>
            <video autoPlay loop muted playsInline className="ad-slide"><source src="/asets/gif/iklan3.webm" type="video/webm" /></video>
            <video autoPlay loop muted playsInline className="ad-slide" onClick={() => router.push('/download')} style={{ cursor: 'pointer' }}><source src="/asets/gif/iklan4.webm" type="video/webm" /></video>
          </div>
        </div>

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

        {/* 🔥 TABS KATEGORI 🔥 */}
        <div className="notif-category-tabs">
          <button className={`notif-tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Semua</button>
          <button className={`notif-tab-btn ${activeTab === 'like' ? 'active' : ''}`} onClick={() => setActiveTab('like')}>Suka & Simpan</button>
          <button className={`notif-tab-btn ${activeTab === 'comment' ? 'active' : ''}`} onClick={() => setActiveTab('comment')}>Komentar</button>
          <button className={`notif-tab-btn ${activeTab === 'follow' ? 'active' : ''}`} onClick={() => setActiveTab('follow')}>Pengikut Baru</button>
        </div>
      </header>

      <main className="notif-list">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="notif-item notif-skeleton-item">
              <div className="notif-item-icon notif-skeleton-shimmer" style={{ borderRadius: '50%' }}></div>
              <div className="notif-content">
                <div className="notif-skeleton-line notif-skeleton-shimmer" style={{ width: '80%', height: '14px', marginBottom: '8px' }}></div>
                <div className="notif-skeleton-line notif-skeleton-shimmer" style={{ width: '40%', height: '10px' }}></div>
              </div>
            </div>
          ))
        ) : filteredNotifs.length === 0 ? (
          <div className="notif-empty-state">
            <span className="material-icons">notifications_none</span>
            <p>Belum ada notifikasi di kategori ini.</p>
          </div>
        ) : (
          filteredNotifs.map(notif => {
            const actorName = notif.actor?.username || "Seseorang";
            const actorAvatar = notif.actor?.avatar_url || "/asets/png/profile.webp";
            const isFollowing = myFollowings.has(notif.actor_id);
            
            let messageHtml = "";
            let actionIcon = "";
            let thumbUrl = null;

            // Thumbnail Postingan (Jika ada)
            if (notif.postData) {
               const imgs = notif.postData.image_url ? notif.postData.image_url.split(',') : [];
               thumbUrl = imgs.length > 0 ? imgs[0] : notif.postData.video_url;
            }

            if (notif.type === 'like') {
              messageHtml = `menyukai postinganmu.`; actionIcon = 'favorite';
            } else if (notif.type === 'comment') {
              messageHtml = `berkomentar: <span style="color:var(--text-muted)">"${notif.message}"</span>`; actionIcon = 'chat_bubble';
            } else if (notif.type === 'repost') {
              messageHtml = `membagikan ulang karyamu.`; actionIcon = 'repeat';
            } else if (notif.type === 'save') {
              messageHtml = `menyimpan karyamu.`; actionIcon = 'bookmark';
            } else if (notif.type === 'follow') {
              messageHtml = `mulai mengikuti Anda.`; actionIcon = 'person_add';
            } else {
              messageHtml = notif.message?.replace(/<b>(.*?)<\/b>/g, '') || "Ada notifikasi baru untukmu.";
              actionIcon = 'notifications';
            }

            return (
              <div 
                key={notif.id} 
                className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                onClick={() => handleNotifClick(notif)}
                style={{ padding: '12px 15px', display: 'flex', alignItems: 'flex-start', gap: '12px', borderBottom: '1px solid var(--border-card)', cursor: 'pointer', position: 'relative' }}
              >
                {/* 1. Avatar Actor */}
                <div style={{ position: 'relative' }}>
                  <img src={actorAvatar} alt={actorName} className="notif-avatar" onClick={(e) => { e.stopPropagation(); router.push(`/data?id=${notif.actor_id}`); }} />
                  <div style={{ position: 'absolute', bottom: -4, right: -4, background: notif.type === 'like' ? '#ff2e63' : notif.type === 'comment' ? '#10b981' : notif.type === 'follow' ? '#8b5cf6' : '#3b82f6', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-main)' }}>
                    <span className="material-icons" style={{ fontSize: '11px', color: 'white' }}>{actionIcon}</span>
                  </div>
                </div>
                
                {/* 2. Konten Teks */}
                <div className="notif-content" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.4' }}>
                    <strong style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); router.push(`/data?id=${notif.actor_id}`); }}>{actorName}</strong> {messageHtml && <span dangerouslySetInnerHTML={{ __html: messageHtml }} />}
                  </div>
                  <span className="notif-date" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>{formatDate(notif.created_at)}</span>
                </div>

                {/* 3. Action Kanan (Tombol Ikuti / Thumbnail Post) */}
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', height: '100%', marginLeft: '8px' }}>
                  {notif.type === 'follow' && notif.actor_id ? (
                     <button 
                       className={`notif-follow-btn ${isFollowing ? 'followed' : ''}`}
                       onClick={(e) => isFollowing ? null : handleFollowBack(e, notif.actor_id)}
                     >
                       {isFollowing ? 'Mengikuti' : 'Ikuti Balik'}
                     </button>
                  ) : thumbUrl ? (
                     <img src={thumbUrl} className="notif-post-thumb" alt="post" />
                  ) : null}
                </div>

                {!notif.is_read && <div className="notif-unread-dot" style={{ position: 'absolute', top: '15px', right: '15px', width: '8px', height: '8px', background: '#1f3cff', borderRadius: '50%' }}></div>}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
