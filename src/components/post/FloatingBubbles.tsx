'use client';

import React, { useEffect, useState, useRef } from 'react';
// 🔥 Tambahkan usePathname di sini
import { useRouter, usePathname } from 'next/navigation';

// Helper bawaan untuk optimasi gambar
const getOptimizedImage = (url: string) => {
  if (!url) return '/asets/png/profile.webp';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('res.cloudinary.com') && !cleanUrl.includes('f_auto')) {
    return cleanUrl.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
  }
  return cleanUrl;
};

type Props = {
  likers: any[];
  reposters: any[];
};

export default function FloatingBubbles({ likers, reposters }: Props) {
  const router = useRouter();
  // 🔥 Inisialisasi pengecek URL
  const pathname = usePathname();
  
  // 🔥 Ref buat sensor layar & timer
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // State untuk ngatur muncul/hilangnya bubble
  const [isVisible, setIsVisible] = useState(false); // Default mati, nunggu masuk layar

  // Ambil maksimal 2 liker & 1 reposter biar layar gak ketutupan penuh
  const displayLikers = likers?.slice(0, 2) || [];
  const displayReposters = reposters?.slice(0, 1) || [];

  useEffect(() => {
    // Kalau gak ada yang like/repost, atau BUKAN di halaman /post, batalkan observer
    if ((displayLikers.length === 0 && displayReposters.length === 0) || pathname !== '/post') return;

    // 🔥 Buat sensor yang mantau apakah postingan ini lagi diliatin di layar 🔥
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Postingan MASUK ke layar -> Munculin bubble!
            setIsVisible(true);
            
            // Bersihin timer lama biar gak tabrakan
            if (timerRef.current) clearTimeout(timerRef.current);
            
            // Set timer 5 DETIK (5000 ms) buat ngilangin bubble perlahan
            timerRef.current = setTimeout(() => {
              setIsVisible(false);
            }, 5000);
          } else {
            // Postingan KELUAR layar -> Reset state (biar kalau di-scroll balik, dia muncul lagi)
            setIsVisible(false);
            if (timerRef.current) clearTimeout(timerRef.current);
          }
        });
      },
      { threshold: 0.5 } // Trigger nyala kalau 50% badan postingan masuk ke layar
    );

    // Tempelkan sensor ke bungkus komponen ini
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Bersihin memori kalau pindah halaman
    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [displayLikers.length, displayReposters.length, pathname]); // 🔥 Masukkan pathname sebagai dependency

  // 🔥 VALIDASI UTAMA: Kalau bukan di halaman post/page.tsx, JANGAN RENDER APAPUN 🔥
  if (pathname !== '/post') return null;

  // Kalau gak ada data yang nge-like/repost sama sekali, render kosong aja
  if (displayLikers.length === 0 && displayReposters.length === 0) return null;

  return (
    // Wadah tak kasat mata buat ditempelin sensor (pointerEvents: none biar gak ganggu klik video/foto)
    <div ref={containerRef} className="floating-bubbles-sensor" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      
      {/* 🔥 CSS KHUSUS BUBBLE 🔥 */}
      <style>{`
        .liker-bubble-wrapper { position: absolute; bottom: 60px; right: 15px; display: flex; flex-direction: column-reverse; align-items: flex-end; gap: 8px; pointer-events: none; }
        .liker-bubble { position: relative; animation: floatBubble 4s ease-in-out infinite alternate, popIn 0.3s ease-out; opacity: 0.95; cursor: pointer; pointer-events: auto; }
        .liker-bubble img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); }
        
        .nonowner-bubble-wrapper { position: absolute; bottom: 60px; left: 15px; display: flex; flex-direction: column-reverse; align-items: flex-start; gap: 10px; pointer-events: none; }
        .nonowner-bubble { position: relative; animation: floatBubbleOpposite 4s ease-in-out infinite alternate, popIn 0.3s ease-out; opacity: 0.95; cursor: pointer; pointer-events: auto; display: flex; align-items: center; gap: 8px; }
        .nonowner-bubble img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #1f3cff; box-shadow: 0 2px 8px rgba(0,0,0,0.5); }
        
        .note-bubble { background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); }
        
        .liker-mini-icon { position: absolute; bottom: -2px; right: -2px; color: white; border-radius: 50%; padding: 2px; font-size: 10px; border: 1px solid white; display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; }
        .liker-mini-icon.heart { background: #ff2e63; }
        .liker-mini-icon.repeat { background: #1f3cff; }
        
        @keyframes floatBubble { 0% { transform: translateY(0) translateX(0); } 33% { transform: translateY(-8px) translateX(-4px); } 66% { transform: translateY(-4px) translateX(4px); } 100% { transform: translateY(-12px) translateX(0); } }
        @keyframes floatBubbleOpposite { 0% { transform: translateY(0) translateX(0); } 33% { transform: translateY(-8px) translateX(4px); } 66% { transform: translateY(-4px) translateX(-4px); } 100% { transform: translateY(-12px) translateX(0); } }
        @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 0.95; } }
      `}</style>

      {/* Baru render bubble benerannya kalau statusnya isVisible (Postingan lagi diliatin) */}
      {isVisible && (
        <>
          {/* 🔥 BUBBLE LIKERS (MELAYANG DI KANAN BAWAH) 🔥 */}
          {displayLikers.length > 0 && (
            <div className="liker-bubble-wrapper">
              {displayLikers.map((liker, idx) => (
                <div 
                  key={`liker-${idx}`} 
                  className="liker-bubble" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    router.push(`/data?id=${liker.id}`); 
                  }}
                >
                  <img src={getOptimizedImage(liker.avatar_url)} alt="liker" />
                  <div className="liker-mini-icon heart">
                    <span className="material-icons" style={{ fontSize: '10px' }}>favorite</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 🔥 BUBBLE REPOSTERS (MELAYANG DI KIRI BAWAH) 🔥 */}
          {displayReposters.length > 0 && (
            <div className="nonowner-bubble-wrapper">
              {displayReposters.map((reposter, idx) => (
                <div 
                  key={`reposter-${idx}`} 
                  className="nonowner-bubble" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    router.push(`/data?id=${reposter.id}`); 
                  }}
                >
                  <img src={getOptimizedImage(reposter.avatar_url)} alt="reposter" />
                  <div className="liker-mini-icon repeat">
                    <span className="material-icons" style={{ fontSize: '10px' }}>repeat</span>
                  </div>
                  
                  {/* Kalau pas repost dia ngasih caption/catatan */}
                  {reposter.note && (
                    <div className="note-bubble">
                      {reposter.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
