'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  isOwner: boolean; // 🔥 PROPS BARU: Untuk mengecek apakah yang melihat adalah pemilik postingan
};

export default function FloatingBubbles({ likers, reposters, isOwner }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isVisible, setIsVisible] = useState(false);

  // 1. Logika Like: HANYA tampil jika user yang sedang login adalah pemilik postingan
  const displayLikers = isOwner ? (likers?.slice(0, 3) || []) : [];
  
  // 2. Logika Repost: Menampilkan maksimal 3 user 
  // (Catatan: Filter "hanya teman" idealnya sudah dilakukan di backend/parent component sebelum masuk ke sini)
  const displayReposters = reposters?.slice(0, 3) || [];

  useEffect(() => {
    if ((displayLikers.length === 0 && displayReposters.length === 0) || pathname !== '/post') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            
            if (timerRef.current) clearTimeout(timerRef.current);
            
            // Set timer 6 detik (karena animasi terbang ke atas lebih lambat dan natural)
            timerRef.current = setTimeout(() => {
              setIsVisible(false);
            }, 6000);
          } else {
            setIsVisible(false);
            if (timerRef.current) clearTimeout(timerRef.current);
          }
        });
      },
      { threshold: 0.5 } 
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [displayLikers.length, displayReposters.length, pathname]);

  if (pathname !== '/post') return null;
  if (displayLikers.length === 0 && displayReposters.length === 0) return null;

  return (
    <div ref={containerRef} className="floating-bubbles-sensor" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      
      {/* 🔥 CSS ANIMASI TERBANG KE ATAS YANG DINAMIS 🔥 */}
      <style>{`
        .liker-bubble-wrapper { position: absolute; bottom: 40px; right: 15px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; pointer-events: none; }
        .nonowner-bubble-wrapper { position: absolute; bottom: 40px; left: 15px; display: flex; flex-direction: column; align-items: flex-start; gap: 12px; pointer-events: none; }
        
        /* Animasi dasar elemen terbang */
        .bubble-element { 
          position: relative; 
          opacity: 0; 
          cursor: pointer; 
          pointer-events: auto; 
          animation-name: flyUpAndFade;
          animation-fill-mode: forwards;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .nonowner-bubble { display: flex; align-items: center; gap: 8px; }
        
        /* Styling Image */
        .bubble-element img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.4); }
        .liker-border { border: 2px solid #ff2e63; }
        .reposter-border { border: 2px solid #1f3cff; }
        
        .note-bubble { background: rgba(0,0,0,0.75); backdrop-filter: blur(5px); color: white; padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); }
        
        .liker-mini-icon { position: absolute; bottom: -2px; right: -2px; color: white; border-radius: 50%; padding: 2px; font-size: 10px; border: 1px solid white; display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; }
        .liker-mini-icon.heart { background: #ff2e63; }
        .liker-mini-icon.repeat { background: #1f3cff; }
        
        /* Keyframes untuk terbang dari bawah ke atas sambil bergoyang sedikit (sway) */
        @keyframes flyUpAndFade { 
          0% { transform: translateY(60px) scale(0.5); opacity: 0; } 
          15% { transform: translateY(0px) scale(1.1); opacity: 1; } 
          30% { transform: translateY(-10px) scale(1); opacity: 1; }
          75% { transform: translateY(-80px) scale(1); opacity: 0.9; } 
          100% { transform: translateY(-120px) scale(0.8); opacity: 0; pointer-events: none; } 
        }
      `}</style>

      {isVisible && (
        <>
          {/* 🔥 LIKERS - HANYA PEMILIK POSTINGAN YANG BISA LIHAT 🔥 */}
          {displayLikers.length > 0 && (
            <div className="liker-bubble-wrapper">
              {displayLikers.map((liker, idx) => (
                <div 
                  key={`liker-${idx}`} 
                  className="bubble-element" 
                  style={{
                    // Delay dan Durasi dibikin beda-beda per index biar animasinya ga kaku/bersamaan
                    animationDuration: `${4 + (idx * 0.5)}s`, 
                    animationDelay: `${idx * 0.2}s`
                  }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    router.push(`/data?id=${liker.id}`); 
                  }}
                >
                  <img src={getOptimizedImage(liker.avatar_url)} alt="liker" className="liker-border" />
                  <div className="liker-mini-icon heart">
                    <span className="material-icons" style={{ fontSize: '10px' }}>favorite</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 🔥 REPOSTERS - TAMPIL MAKSIMAL 3 🔥 */}
          {displayReposters.length > 0 && (
            <div className="nonowner-bubble-wrapper">
              {displayReposters.map((reposter, idx) => (
                <div 
                  key={`reposter-${idx}`} 
                  className="bubble-element nonowner-bubble" 
                  style={{
                    animationDuration: `${4.5 + (idx * 0.6)}s`, 
                    animationDelay: `${idx * 0.3}s`
                  }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    router.push(`/data?id=${reposter.id}`); 
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <img src={getOptimizedImage(reposter.avatar_url)} alt="reposter" className="reposter-border" />
                    <div className="liker-mini-icon repeat">
                      <span className="material-icons" style={{ fontSize: '10px' }}>repeat</span>
                    </div>
                  </div>
                  
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
