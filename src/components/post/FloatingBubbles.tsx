'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  
  // 🔥 State untuk ngatur muncul/hilangnya bubble
  const [isVisible, setIsVisible] = useState(true);

  // Ambil maksimal 2 liker & 1 reposter biar layar gak ketutupan penuh
  const displayLikers = likers?.slice(0, 2) || [];
  const displayReposters = reposters?.slice(0, 1) || [];

  useEffect(() => {
    // Kalau gak ada yang like/repost, gak usah jalanin timer
    if (displayLikers.length === 0 && displayReposters.length === 0) return;

    // Pastikan bubble muncul kalau ada data baru
    setIsVisible(true);

    // Set timer 3 detik (3000 ms) buat ngilangin bubble
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    // Bersihin timer kalau komponennya di-unmount atau datanya berubah
    return () => clearTimeout(timer);
  }, [likers, reposters]); // <-- Trigger ulang kalau ada liker/reposter baru

  // Kalau isVisible false ATAU gak ada datanya, render kosong (hilang)
  if (!isVisible || (displayLikers.length === 0 && displayReposters.length === 0)) return null;

  return (
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
  );
}
