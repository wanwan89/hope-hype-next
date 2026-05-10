'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils'; 
import { useTranslation } from 'react-i18next';
import './Notifications.css';

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [rawNotifs, setRawNotifs] = useState<any[]>([]);
  const [groupedNotifs, setGroupedNotifs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- REFS UNTUK SLIDER ---
  const sliderRef = useRef<HTMLDivElement>(null);
  const autoSlideTimer = useRef<NodeJS.Timeout | null>(null);

  // --- REF UNTUK REALTIME CHANNEL ---
  const channelRef = useRef<any>(null);

  // --- INIT DATA ---
  useEffect(() => {
    initUserAndNotifs();
    startAutoSlide();

    return () => {
      stopAutoSlide();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Efek ini jalan otomatis buat nge-grup notif setiap kali rawNotifs berubah
  useEffect(() => {
    setGroupedNotifs(applyGrouping(rawNotifs));
  }, [rawNotifs]);

  const initUserAndNotifs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setCurrentUser(session.user);
    await loadNotifications(session.user.id);
    setupRealtime(session.user.id);
  };

  const loadNotifications = async (userId: string) => {
    try {
      // 1. Ambil Notifikasi Standar (Termasuk Mention & Post Approved)
      const { data: dbNotifs, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Siapin array penampung buat data external
      let formattedReposts: any[] = [];
      let formattedSaves: any[] = [];
      let formattedStoryLikes: any[] = [];

      // 2. Ambil data dari postingan (Repost & Save)
      const { data: myPosts } = await supabase.from('posts').select('id').eq('creator_id', userId);
      
      if (myPosts && myPosts.length > 0) {
        const postIds = myPosts.map(p => p.id);
        
        // --- AMBIL REPOSTS ---
        const { data: repostsData } = await supabase.from('reposts')
          .select('id, post_id, created_at, profiles(username)')
          .in('post_id', postIds)
          .order('created_at', { ascending: false })
          .limit(30);
        
        if (repostsData) {
          formattedReposts = repostsData.map((r: any) => ({
            id: `repost-${r.id}`, 
            type: 'repost',
            post_id: r.post_id,
            user_id: userId,
            message: `<b>${r.profiles?.username || 'Seseorang'}</b> membagikan ulang karyamu.`,
            created_at: r.created_at,
            is_read: true, 
            username: r.profiles?.username || 'Seseorang'
          }));
        }

        // --- AMBIL BOOKMARKS (SAVES) ---
        const { data: savesData } = await supabase.from('bookmarks')
          .select('id, post_id, created_at, profiles(username)')
          .in('post_id', postIds)
          .order('created_at', { ascending: false })
          .limit(30);
        
        if (savesData) {
          formattedSaves = savesData.map((s: any) => ({
            id: `save-${s.id}`, 
            type: 'save',
            post_id: s.post_id,
            user_id: userId,
            message: `<b>${s.profiles?.username || 'Seseorang'}</b> menyimpan karyamu.`,
            created_at: s.created_at,
            is_read: true, 
            username: s.profiles?.username || 'Seseorang'
          }));
        }
      }

      // 3. Ambil data dari Story (Story Likes)
      const { data: myStories } = await supabase.from('stories').select('id').eq('creator_id', userId);
      
      if (myStories && myStories.length > 0) {
        const storyIds = myStories.map(s => s.id);
        
        const { data: storyLikesData } = await supabase.from('story_likes')
          .select('id, story_id, created_at, profiles(username)')
          .in('story_id', storyIds)
          .order('created_at', { ascending: false })
          .limit(30);
        
        if (storyLikesData) {
          formattedStoryLikes = storyLikesData.map((sl: any) => ({
            id: `storylike-${sl.id}`, 
            type: 'story_like',
            story_id: sl.story_id, // Simpan ID story buat di-klik
            user_id: userId,
            message: `<b>${sl.profiles?.username || 'Seseorang'}</b> menyukai ceritamu.`,
            created_at: sl.created_at,
            is_read: true, 
            username: sl.profiles?.username || 'Seseorang'
          }));
        }
      }

      // Gabungkan semua dan urutkan berdasarkan waktu terbaru
      const allRaw = [
        ...(dbNotifs || []), 
        ...formattedReposts, 
        ...formattedSaves, 
        ...formattedStoryLikes
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRawNotifs(allRaw);
    } catch (err) {
      console.error("Gagal load notif:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 🔥 FUNGSI PENGELOMPOKAN (SMART GROUPING) 🔥 ---
  const applyGrouping = (notifs: any[]) => {
    const grouped: any[] = [];
    const seenLikes = new Set();
    const seenReposts = new Set();
    const seenSaves = new Set();
    const seenStoryLikes = new Set();
    let followGroup: any = null;

    for (const n of notifs) {
      // Ekstrak nama pelaku dari pesan kalau nggak ada
      let actorName = n.username;
      if (!actorName && n.message) {
        // Cek format bold HTML <b>nama</b>
        const match = n.message.match(/<b>(.*?)<\/b>/);
        if (match) {
          actorName = match[1];
        } else {
          // Kalau format teks biasa (biasanya untuk mention) -> "nama menyebut Anda..."
          const spaceIndex = n.message.indexOf(' ');
          if (spaceIndex > 0) actorName = n.message.substring(0, spaceIndex);
        }
      }
      if (!actorName) actorName = "Seseorang";
      
      // Pastikan tipe terdeteksi
      const type = n.type || (n.message?.toLowerCase().includes('mengikuti') ? 'follow' : 'other');
      const notifObj = { ...n, type, actorName, groupedCount: 0 };

      // Logika Grup Like (Berdasarkan Postingan yang sama)
      if (type === 'like' && n.post_id) {
        if (seenLikes.has(n.post_id)) {
           const parent = grouped.find(g => g.type === 'like' && g.post_id === n.post_id);
           if (parent) parent.groupedCount += 1;
           continue;
        }
        seenLikes.add(n.post_id);
        grouped.push(notifObj);
      } 
      // Logika Grup Repost
      else if (type === 'repost' && n.post_id) {
        if (seenReposts.has(n.post_id)) {
           const parent = grouped.find(g => g.type === 'repost' && g.post_id === n.post_id);
           if (parent) parent.groupedCount += 1;
           continue;
        }
        seenReposts.add(n.post_id);
        grouped.push(notifObj);
      }
      // Logika Grup Simpan (Bookmark)
      else if (type === 'save' && n.post_id) {
        if (seenSaves.has(n.post_id)) {
           const parent = grouped.find(g => g.type === 'save' && g.post_id === n.post_id);
           if (parent) parent.groupedCount += 1;
           continue;
        }
        seenSaves.add(n.post_id);
        grouped.push(notifObj);
      }
      // Logika Grup Suka Story
      else if (type === 'story_like' && n.story_id) {
        if (seenStoryLikes.has(n.story_id)) {
           const parent = grouped.find(g => g.type === 'story_like' && g.story_id === n.story_id);
           if (parent) parent.groupedCount += 1;
           continue;
        }
        seenStoryLikes.add(n.story_id);
        grouped.push(notifObj);
      }
      // Logika Grup Followers Baru (Berdasarkan rentang waktu berdekatan)
      else if (type === 'follow') {
        if (followGroup) {
           followGroup.groupedCount += 1;
           continue;
        }
        followGroup = notifObj;
        grouped.push(notifObj);
      } 
      // Logika lain (Komentar, Mention, Gift, Post Approved, Sistem, dll) tidak di-grup
      else {
        grouped.push(notifObj);
      }
    }
    return grouped;
  };

  const setupRealtime = (userId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`notif-realtime-${userId}`) 
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setRawNotifs(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const startAutoSlide = () => {
    if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
    autoSlideTimer.current = setInterval(() => {
      if (sliderRef.current) {
        const slider = sliderRef.current;
        if (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 5) {
          slider.scrollLeft = 0;
        } else {
          slider.scrollLeft += slider.clientWidth;
        }
      }
    }, 5000);
  };

  const stopAutoSlide = () => {
    if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
  };

  const handlePwaInstall = async () => {
    const promptEvent = (window as any).pwaPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') console.log('User menginstal HopeHype!');
      (window as any).pwaPrompt = null;
    } else {
      showNotif(t('pwa_installed', 'PWA sudah terinstal atau browser tidak mendukung.'), "info");
    }
  };

  const loadMidtransForce = () => {
    return new Promise((resolve) => {
      if ((window as any).snap) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js"; 
      script.setAttribute("data-client-key", "SB-Mid-client-0T6dD0H1HkQvBf8G"); 
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const handleNotifClick = async (notif: any) => {
    // Kalau ID nya manual yang kita buat (repost-, save-, storylike-), gak usah update table
    const isManualFormat = notif.id.toString().startsWith('repost-') || 
                           notif.id.toString().startsWith('save-') || 
                           notif.id.toString().startsWith('storylike-');

    if (!notif.is_read && !isManualFormat) {
      setRawNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }

    if (notif.type === "payment_pending" && notif.token) {
      try {
        showNotif(t('preparing_pay', 'Menyiapkan pembayaran...'), "info");
        const isLoaded = await loadMidtransForce();
        if (isLoaded && (window as any).snap) {
          (window as any).snap.pay(notif.token, {
            onSuccess: () => { showNotif(t('pay_success', "Pembayaran Sukses!"), "success"); loadNotifications(currentUser.id); },
            onPending: () => { showNotif(t('pay_pending', "Menunggu pembayaran"), "warning"); },
            onError: () => { showNotif(t('pay_failed', "Pembayaran gagal"), "error"); },
            onClose: () => { showNotif(t('pay_closed', "Popup ditutup"), "info"); }
          });
        }
      } catch (err) { console.error(err); }
    } else if (notif.type === 'story_like' && notif.story_id) {
      router.push(`/story/${notif.story_id}`);
    } else if (notif.post_id) {
      // Pindah ke postingan (baik itu like, komentar, mention, repost, dsb)
      router.push(`/#post-${notif.post_id}`);
    } else if (notif.type === 'follow') {
      router.push(`/data`); 
    }
  };

  // 🔥 TENTUKAN ICON & WARNA BERDASARKAN TIPE NOTIFIKASI 🔥
  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'like': return { icon: 'favorite', color: '#ff2e63' };
      case 'comment': return { icon: 'chat_bubble', color: '#10b981' };
      case 'repost': return { icon: 'repeat', color: '#1DA1F2' }; 
      case 'save': return { icon: 'bookmark', color: '#f59e0b' }; 
      case 'story_like': return { icon: 'favorite', color: '#ff2e63' }; 
      case 'gift': return { icon: 'card_giftcard', color: '#f59e0b' };
      case 'follow': return { icon: 'person_add', color: '#8b5cf6' };
      case 'mention': return { icon: 'alternate_email', color: '#1DA1F2' }; // 🔥 MENTION ICON
      case 'post_approved': return { icon: 'verified', color: '#10b981' }; // 🔥 APPROVED ICON
      case 'payment_pending': return { icon: 'credit_card', color: '#8b5cf6' };
      default: return { icon: 'notifications', color: '#3b82f6' };
    }
  };

  const formatDate = (dateString: string) => {
    const dateObj = new Date(dateString);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    return isToday 
      ? `${t('today', 'Hari ini')}, ${dateObj.toLocaleTimeString("id-ID", {hour: "2-digit", minute:"2-digit"})}` 
      : dateObj.toLocaleDateString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute:"2-digit" });
  };

  // 🔥 FUNGSI FORMAT TEKS SMART GROUPING & REGULER 🔥
  const getDisplayText = (notif: any) => {
    if (notif.groupedCount > 0) {
      if (notif.type === 'like') {
        return t('notif_grouped_like', `<b>{{name}}</b> dan {{count}} lainnya menyukai postinganmu.`, { name: notif.actorName, count: notif.groupedCount });
      }
      if (notif.type === 'repost') {
        return t('notif_grouped_repost', `<b>{{name}}</b> dan {{count}} lainnya membagikan ulang karyamu.`, { name: notif.actorName, count: notif.groupedCount });
      }
      if (notif.type === 'save') {
        return t('notif_grouped_save', `<b>{{name}}</b> dan {{count}} lainnya menyimpan postinganmu.`, { name: notif.actorName, count: notif.groupedCount });
      }
      if (notif.type === 'story_like') {
        return t('notif_grouped_story_like', `<b>{{name}}</b> dan {{count}} lainnya menyukai ceritamu.`, { name: notif.actorName, count: notif.groupedCount });
      }
      if (notif.type === 'follow') {
        return t('notif_grouped_follow', `<b>{{name}}</b> dan {{count}} lainnya mulai mengikuti kamu.`, { name: notif.actorName, count: notif.groupedCount });
      }
    }
    
    // Fallback buat tipe spesifik
    if (notif.type === 'repost') return `<b>${notif.actorName}</b> membagikan ulang karyamu.`;
    if (notif.type === 'save') return `<b>${notif.actorName}</b> menyimpan karyamu.`;
    if (notif.type === 'story_like') return `<b>${notif.actorName}</b> menyukai ceritamu.`;
    if (notif.type === 'mention') {
       // Buat teks mention jadi bold namanya
       let msg = notif.message || `${notif.actorName} menyebut Anda.`;
       if (!msg.includes('<b>')) msg = `<b>${notif.actorName}</b> ${msg.replace(notif.actorName, '').trim()}`;
       return msg;
    }
    if (notif.type === 'post_approved') {
       return `Selamat! Postinganmu telah <b>disetujui</b> dan sekarang tampil di publik.`;
    }
    
    return notif.message; // Bawaan dari DB
  };

  return (
    <div className="notif-page-container">
      <header className="notif-header">
        
        <div className="notif-top-bar">
          <h2 style={{ marginLeft: '10px' }}>{t('notifications', 'Notifikasi')}</h2>
        </div>

        <div className="notif-ad-banner-container" onMouseEnter={stopAutoSlide} onMouseLeave={startAutoSlide}>
          <div className="notif-ad-slider" ref={sliderRef}>
            <video autoPlay loop muted playsInline className="ad-slide"><source src="/asets/gif/iklan1.webm" type="video/webm" /></video>
            <video autoPlay loop muted playsInline className="ad-slide"><source src="/asets/gif/iklan2.webm" type="video/webm" /></video>
            <video autoPlay loop muted playsInline className="ad-slide"><source src="/asets/gif/iklan3.webm" type="video/webm" /></video>
            <video autoPlay loop muted playsInline className="ad-slide" onClick={handlePwaInstall} style={{ cursor: 'pointer' }}><source src="/asets/gif/iklan4.webm" type="video/webm" /></video>
          </div>
        </div>

      </header>

      <main className="notif-list">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="notif-item notif-skeleton-item">
              <div className="notif-item-icon notif-skeleton-shimmer"></div>
              <div className="notif-content">
                <div className="notif-skeleton-line notif-skeleton-shimmer" style={{ width: '80%', height: '14px', marginBottom: '8px' }}></div>
                <div className="notif-skeleton-line notif-skeleton-shimmer" style={{ width: '40%', height: '10px' }}></div>
              </div>
            </div>
          ))
        ) : groupedNotifs.length === 0 ? (
          <div className="notif-empty-state">
            <span className="material-icons">notifications_none</span>
            <p>{t('empty_notifications', 'Belum ada notifikasi nih.')}</p>
          </div>
        ) : (
          groupedNotifs.map(notif => {
            const { icon, color } = getIconAndColor(notif.type);
            return (
              <div 
                key={notif.id} 
                className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                onClick={() => handleNotifClick(notif)}
              >
                <div className="notif-item-icon" style={{ background: color }}>
                  <span className="material-icons" style={{ fontSize: '20px' }}>{icon}</span>
                </div>
                
                <div className="notif-content">
                  {/* Tampilkan teks hasil smart grouping */}
                  <div className="notif-message" dangerouslySetInnerHTML={{ __html: getDisplayText(notif) }}></div>
                  <span className="notif-date">{formatDate(notif.created_at)}</span>
                </div>

                {!notif.is_read && <div className="notif-unread-dot"></div>}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
