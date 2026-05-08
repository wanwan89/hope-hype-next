'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils'; 
import { useTranslation } from 'react-i18next'; // 🔥 FIX 1: Import terjemahan
import './Notifications.css';

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // 🔥 FIX 3: Pisahin state raw (mentah) dan state yang udah digrup 🔥
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
      // 1. Ambil Notifikasi Standar
      const { data: dbNotifs, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // 2. 🔥 FIX 2: Ambil Data Repost Langsung dari Tabel Repost 🔥
      let formattedReposts: any[] = [];
      const { data: myPosts } = await supabase.from('posts').select('id').eq('creator_id', userId);
      
      if (myPosts && myPosts.length > 0) {
        const postIds = myPosts.map(p => p.id);
        const { data: repostsData } = await supabase.from('reposts')
          .select('id, post_id, created_at, profiles(username)')
          .in('post_id', postIds)
          .order('created_at', { ascending: false })
          .limit(30);
        
        if (repostsData) {
          formattedReposts = repostsData.map((r: any) => ({
            id: `repost-${r.id}`, // ID unik buatan
            type: 'repost',
            post_id: r.post_id,
            user_id: userId,
            message: `<b>${r.profiles?.username || 'Seseorang'}</b> membagikan ulang karyamu.`,
            created_at: r.created_at,
            is_read: true, // Asumsikan repost tidak ditandai unread merah
            username: r.profiles?.username || 'Seseorang'
          }));
        }
      }

      // Gabungkan dan urutkan berdasarkan waktu terbaru
      const allRaw = [...(dbNotifs || []), ...formattedReposts].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRawNotifs(allRaw);
    } catch (err) {
      console.error("Gagal load notif:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 🔥 FIX 3: FUNGSI PENGELOMPOKAN (SMART GROUPING) 🔥 ---
  const applyGrouping = (notifs: any[]) => {
    const grouped: any[] = [];
    const seenLikes = new Set();
    const seenReposts = new Set();
    let followGroup: any = null;

    for (const n of notifs) {
      // Ekstrak nama pelaku dari pesan kalau nggak ada
      let actorName = n.username;
      if (!actorName && n.message) {
        const match = n.message.match(/<b>(.*?)<\/b>/);
        if (match) actorName = match[1];
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
      // Logika Grup Repost (Berdasarkan Postingan yang sama)
      else if (type === 'repost' && n.post_id) {
        if (seenReposts.has(n.post_id)) {
           const parent = grouped.find(g => g.type === 'repost' && g.post_id === n.post_id);
           if (parent) parent.groupedCount += 1;
           continue;
        }
        seenReposts.add(n.post_id);
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
      // Logika lain (Komentar, Gift, Sistem, dll) tidak di-grup
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
          // Tambahkan ke raw notif, useEffect akan meng-grup otomatis
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
    // Kalau ID nya berawalan repost- berarti itu dari tabel reposts, ga ada di tabel notifications
    if (!notif.is_read && !notif.id.toString().startsWith('repost-')) {
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
    } else if (notif.post_id) {
      router.push(`/#post-${notif.post_id}`);
    } else if (notif.type === 'follow') {
      router.push(`/data`); // Ke profil jika follow
    }
  };

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'like': return { icon: 'favorite', color: '#ff2e63' };
      case 'comment': return { icon: 'chat_bubble', color: '#10b981' };
      case 'repost': return { icon: 'repeat', color: '#1DA1F2' }; 
      case 'gift': return { icon: 'card_giftcard', color: '#f59e0b' };
      case 'follow': return { icon: 'person_add', color: '#8b5cf6' };
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

  // 🔥 FUNGSI FORMAT TEKS SMART GROUPING 🔥
  const getDisplayText = (notif: any) => {
    if (notif.groupedCount > 0) {
      if (notif.type === 'like') {
        return t('notif_grouped_like', `<b>{{name}}</b> dan {{count}} lainnya menyukai postinganmu.`, { name: notif.actorName, count: notif.groupedCount });
      }
      if (notif.type === 'repost') {
        return t('notif_grouped_repost', `<b>{{name}}</b> dan {{count}} lainnya membagikan ulang karyamu.`, { name: notif.actorName, count: notif.groupedCount });
      }
      if (notif.type === 'follow') {
        return t('notif_grouped_follow', `<b>{{name}}</b> dan {{count}} lainnya mulai mengikuti kamu.`, { name: notif.actorName, count: notif.groupedCount });
      }
    }
    
    // Kalau nggak di-grup tapi kita mau nampilin pesan kustom
    if (notif.type === 'repost') {
       return t('notif_single_repost', `<b>{{name}}</b> membagikan ulang karyamu.`, { name: notif.actorName });
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
