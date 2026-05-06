'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils'; 
import './Notifications.css';

export default function NotificationsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- REFS UNTUK SLIDER ---
  const sliderRef = useRef<HTMLDivElement>(null);
  const autoSlideTimer = useRef<NodeJS.Timeout | null>(null);

  // --- INIT DATA ---
  useEffect(() => {
    initUserAndNotifs();
    startAutoSlide(); // Jalankan slider saat halaman dimuat

    // Cleanup interval saat pindah halaman biar gak memory leak
    return () => stopAutoSlide();
  }, []);

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
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifs(data || []);
    } catch (err) {
      console.error("Gagal load notif:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtime = (userId: string) => {
    supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifs(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();
  };

  // --- LOGIKA SLIDER IKLAN ---
  const startAutoSlide = () => {
    if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
    autoSlideTimer.current = setInterval(() => {
      if (sliderRef.current) {
        const slider = sliderRef.current;
        // Cek jika sudah mentok di ujung kanan
        if (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 5) {
          slider.scrollLeft = 0; // Balik ke awal
        } else {
          slider.scrollLeft += slider.clientWidth; // Geser 1 frame
        }
      }
    }, 5000); // Ganti tiap 5 detik
  };

  const stopAutoSlide = () => {
    if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
  };

  // --- LOGIKA PWA INSTALL ---
  const handlePwaInstall = async () => {
    const promptEvent = (window as any).pwaPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') console.log('User menginstal HopeHype!');
      (window as any).pwaPrompt = null;
    } else {
      showNotif("PWA sudah terinstal atau browser tidak mendukung.", "info");
    }
  };

  // --- LOGIKA SUNTIK MIDTRANS ---
  const loadMidtransForce = () => {
    return new Promise((resolve) => {
      if ((window as any).snap) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js"; // GANTI KE PRODUCTION KALO UDAH LIVE
      script.setAttribute("data-client-key", "SB-Mid-client-0T6dD0H1HkQvBf8G"); // GANTI PAKE CLIENT KEY LU
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const handleNotifClick = async (notif: any) => {
    // 1. Tandai terbaca di database & local state (BIAR BADGE ILANG)
    if (!notif.is_read) {
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }

    // 2. Eksekusi Aksi berdasarkan tipe Notif
    if (notif.type === "payment_pending" && notif.token) {
      // BAGIAN MIDTRANS
      try {
        showNotif("Menyiapkan pembayaran...", "info");
        const isLoaded = await loadMidtransForce();
        
        if (isLoaded && (window as any).snap) {
          (window as any).snap.pay(notif.token, {
            onSuccess: () => { showNotif("Pembayaran Sukses!", "success"); loadNotifications(currentUser.id); },
            onPending: () => { showNotif("Menunggu pembayaran", "warning"); },
            onError: () => { showNotif("Pembayaran gagal", "error"); },
            onClose: () => { showNotif("Popup ditutup", "info"); }
          });
        } else {
          showNotif("Sistem pembayaran gagal dimuat.", "error");
        }
      } catch (err) {
        console.error("Midtrans Error:", err);
      }
    } else if (notif.post_id) {
      // 🔥 FIX: Arahkan ke Home (/) dengan tambahan hash (#) ID postingan 🔥
      // Jadi nanti jadinya kayak gini: domain.com/#post-123
      router.push(`/#post-${notif.post_id}`);
    }
  };

  // --- HELPER UNTUK IKON & WARNA ---
  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'like': return { icon: 'favorite', color: '#ff2e63' };
      case 'comment': return { icon: 'chat_bubble', color: '#10b981' };
      case 'repost': return { icon: 'repeat', color: '#1DA1F2' };
      case 'gift': return { icon: 'card_giftcard', color: '#f59e0b' };
      case 'payment_pending': return { icon: 'credit_card', color: '#8b5cf6' };
      default: return { icon: 'notifications', color: '#3b82f6' };
    }
  };

  const formatDate = (dateString: string) => {
    const dateObj = new Date(dateString);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    return isToday 
      ? `Hari ini, ${dateObj.toLocaleTimeString("id-ID", {hour: "2-digit", minute:"2-digit"})}` 
      : dateObj.toLocaleDateString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute:"2-digit" });
  };

  return (
    <div className="notif-page-container">
      {/* HEADER DENGAN IKLAN */}
      <header className="notif-header">
        
        <div className="notif-top-bar">
          <button className="back-btn" onClick={() => router.back()}>
            <span className="material-icons">arrow_back</span>
          </button>
          <h2>Notifikasi</h2>
        </div>

        {/* SLIDER IKLAN */}
        <div 
          className="ad-banner-container"
          onMouseEnter={stopAutoSlide}
          onMouseLeave={startAutoSlide}
          onTouchStart={stopAutoSlide}
          onTouchEnd={startAutoSlide}
        >
          <div className="ad-slider" ref={sliderRef}>
            <video autoPlay loop muted playsInline className="ad-slide">
              <source src="/asets/gif/iklan1.webm" type="video/webm" />
            </video>
            <video autoPlay loop muted playsInline className="ad-slide">
              <source src="/asets/gif/iklan2.webm" type="video/webm" />
            </video>
            <video autoPlay loop muted playsInline className="ad-slide">
              <source src="/asets/gif/iklan3.webm" type="video/webm" />
            </video>
            {/* IKLAN KE-4 (INSTALL PWA) */}
            <video 
              autoPlay loop muted playsInline 
              className="ad-slide" 
              onClick={handlePwaInstall} 
              style={{ cursor: 'pointer' }}
            >
              <source src="/asets/gif/iklan4.webm" type="video/webm" />
            </video>
          </div>
        </div>

      </header>

      {/* DAFTAR NOTIFIKASI */}
      <main className="notif-list">
        {isLoading ? (
          <div className="empty-notif">
            <span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>autorenew</span>
            <p>Memuat notifikasi...</p>
          </div>
        ) : notifs.length === 0 ? (
          <div className="empty-notif">
            <span className="material-icons">notifications_none</span>
            <p>Belum ada notifikasi nih.</p>
          </div>
        ) : (
          notifs.map(notif => {
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
                  <div className="notif-message" dangerouslySetInnerHTML={{ __html: notif.message }}></div>
                  <span className="notif-date">{formatDate(notif.created_at)}</span>
                </div>

                {!notif.is_read && <div className="unread-dot"></div>}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
