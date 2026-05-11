'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; 
import { supabase } from '@/lib/supabase';
// 🔥 FIX 1: Import i18n hook
import { useTranslation } from 'react-i18next';
import './SearchWrapper.css';

export default function SearchWrapperpost() {
  const router = useRouter();
  const pathname = usePathname(); 
  // 🔥 FIX 2: Inisialisasi translate
  const { t } = useTranslation();

  const [mounted, setMounted] = useState(false); 
  const [stories, setStories] = useState<any[]>([]);
  const [clickedStoryId, setClickedStoryId] = useState<string | null>(null);
  const [isStoriesVisible, setIsStoriesVisible] = useState(true);
  
  const [animatingStoryId, setAnimatingStoryId] = useState<string | null>(null);

  // --- CEK HALAMAN YANG HEADERNYA HARUS ILANG ---
  const isHidden = pathname?.includes('hypetalk') || pathname?.includes('chat') || pathname?.includes('/story/');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isHidden) fetchStories();
  }, [mounted, isHidden]);

  // --- LOGIKA SCROLL STORY ---
  useEffect(() => {
    if (!mounted || isHidden) return; 

    const handleScroll = () => {
      if (window.scrollY <= 10) {
        setIsStoriesVisible(true);
      } else {
        setIsStoriesVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mounted, isHidden]);

  const fetchStories = async () => {
    try {
      const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("stories")
        .select("*, profiles(username, avatar_url)")
        .gte("created_at", timeLimit)
        .order("created_at", { ascending: false });

      const seenUsers = new Set();
      const uniqueStories = (data || []).filter(story => {
        if (seenUsers.has(story.creator_id)) return false;
        seenUsers.add(story.creator_id);
        return true;
      });
      setStories(uniqueStories);
    } catch (err) {
      console.error("Story Error:", err);
    }
  };

  const handleStoryClick = (sId: string) => {
    setAnimatingStoryId(sId);
    setClickedStoryId(sId); 
    
    // 🔥 Waktu tunggu ditambah sedikit (500ms) biar animasi muternya keliatan mulus dulu
    setTimeout(() => {
      router.push(`/story/${sId}`);
      setTimeout(() => setAnimatingStoryId(null), 100);
    }, 500); 
  };

  if (!mounted || isHidden) return null;

  return (
    <div 
      className="header-sticky-wrapper" 
      style={{ 
        backgroundColor: 'transparent',
        width: '100%',
        position: 'sticky', 
        top: 0,
        zIndex: 999999, // 🔥 UBAH INI JADI 999999
        transition: 'all 0.3s ease'
      }}
    >

      {/* 🔥 INJEKSI CSS ANIMASI MUTAR ALA IG 🔥 */}
      <style>{`
        @keyframes igSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* SEARCH BAR AREA */}
      <div 
        className="search-wrapper glass-effect" 
        style={{ 
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)', // 🔥 (Opsional) Naikin blur ke 20px
          WebkitBackdropFilter: 'blur(20px)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          borderBottom: isStoriesVisible ? 'none' : '1px solid var(--border-color)',
          position: 'relative' // 🔥 TAMBAHIN INI
        }}
      >

        {/* TOMBOL SIDEBAR */}
        <button 
          id="mobileMenuBtn"
          type="button"
          aria-label="Buka Menu" /* 🔥 INI OBATNYA BREE! 🔥 */
          onClick={() => window.dispatchEvent(new CustomEvent('openSidebar'))}
          style={{ 
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '5px', display: 'flex', flexDirection: 'column', gap: '5px',
            width: '24px', flexShrink: 0, outline: 'none'
          }}
        >

          {[1,2,3].map(i => (
            <span key={i} style={{ display: 'block', width: '100%', height: '2px', backgroundColor: 'var(--text-main)', borderRadius: '2px' }}></span>
          ))}
        </button>

        {/* INPUT PENCARIAN */}
        <div className="brutal-input-container" style={{ flex: 1 }}>
          <input
            type="text"
            // 🔥 FIX 3: Placeholder i18n
            placeholder={t('search_placeholder')}
            className="brutal-input"
            style={{
              width: '100%', height: '40px', padding: '8px 18px',
              borderRadius: '20px', border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)', 
              color: 'var(--text-main)', outline: 'none', fontSize: '14px'
            }}
            onChange={(e) => {
              const val = e.target.value.toLowerCase();
              document.querySelectorAll(".card").forEach((card: any) => {
                card.style.display = card.innerText.toLowerCase().includes(val) ? "flex" : "none";
              });
            }}
          />
        </div>

        {/* TOMBOL ADD POST */}
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push('/create');
          }}
          style={{ 
            background: 'var(--text-main)', 
            color: 'var(--bg-card)', 
            width: '40px', height: '40px', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow)',
            transition: 'transform 0.1s ease', outline: 'none'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span className="material-icons" style={{ fontSize: '24px' }}>add</span>
        </button>
      </div>

      {/* STORY SECTION */}
      {stories.length > 0 && (
        <div 
          className="stories-container"
          style={{
            maxHeight: isStoriesVisible ? '125px' : '0px',
            opacity: isStoriesVisible ? 1 : 0,
            padding: isStoriesVisible ? '10px 15px 15px 15px' : '0',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-main)', 
            display: 'flex', gap: '15px', overflowX: 'auto',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: isStoriesVisible ? 'auto' : 'none',
            borderBottom: isStoriesVisible ? '1px solid var(--border-color)' : 'none',
            position: 'relative' // 🔥 TAMBAHIN INI JUGA
          }}
        >

          {stories.map((story) => (
            <div 
              key={story.id} 
              className="story-item" 
              onClick={() => handleStoryClick(story.id)} 
              style={{ 
                flexShrink: 0, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer',
                transform: animatingStoryId === story.id ? 'scale(0.92)' : 'scale(1)',
                transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
              }}
            >
              {/* 🔥 BUNGKUSAN AVATAR + RING 🔥 */}
              <div 
                style={{
                  position: 'relative',
                  width: '66px', height: '66px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  overflow: 'hidden'
                }}
              >
                {/* RING GRADIENT (Cuma ini yang muter) */}
                <div 
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: clickedStoryId === story.id && animatingStoryId !== story.id 
                      ? 'var(--border-color)' 
                      : 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                    animation: animatingStoryId === story.id ? 'igSpin 1s linear infinite' : 'none',
                    zIndex: 1
                  }}
                />
                
                {/* GAMBAR PROFIL (Tengah, tetep diem gak ikut muter) */}
                <img 
                  src={story.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${story.profiles?.username}`} 
                  alt="avatar"
                  style={{ 
                    width: '61px', height: '61px', 
                    borderRadius: '50%', 
                    objectFit: 'cover', 
                    border: '2.5px solid var(--bg-main)', 
                    position: 'relative',
                    zIndex: 2 
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: '600', maxWidth: '65px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {story.profiles?.username}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
