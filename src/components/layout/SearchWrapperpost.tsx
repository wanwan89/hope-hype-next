'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; 
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion'; // 🔥 IMPORT FRAMER MOTION 🔥
import './SearchWrapper.css';

export default function SearchWrapperpost() {
  const router = useRouter();
  const pathname = usePathname(); 
  const { t } = useTranslation();

  const [mounted, setMounted] = useState(false); 
  const [stories, setStories] = useState<any[]>([]);
  const [clickedStoryId, setClickedStoryId] = useState<string | null>(null);
  const [animatingStoryId, setAnimatingStoryId] = useState<string | null>(null);

  const isHidden = pathname?.includes('hypetalk') || pathname?.includes('chat') || pathname?.includes('/story/view');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isHidden) fetchStories();
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
    setTimeout(() => {
      router.push(`/story/view?id=${sId}`);
      setTimeout(() => setAnimatingStoryId(null), 100);
    }, 500); 
  };

  if (!mounted || isHidden) return null;

  return (
    <div 
      className="header-sticky-wrapper" 
      style={{ 
        width: '100%',
        position: 'relative', 
        zIndex: 999999 
      }}
    >
      <div 
        className="search-wrapper glass-effect" 
        style={{ 
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '600px', 
          zIndex: 1000000, 
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          borderBottom: '1px solid var(--border-color)'
        }}
      >
        <button 
          id="mobileMenuBtn"
          type="button"
          aria-label="Buka Menu"
          onClick={() => window.dispatchEvent(new CustomEvent('openSidebar'))}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', display: 'flex', flexDirection: 'column', gap: '5px', width: '24px', flexShrink: 0, outline: 'none' }}
        >
          {[1,2,3].map(i => <span key={i} style={{ display: 'block', width: '100%', height: '2px', backgroundColor: 'var(--text-main)', borderRadius: '2px' }}></span>)}
        </button>

        <div className="brutal-input-container" style={{ flex: 1 }}>
          <input
            type="text"
            placeholder={t('search_placeholder')}
            className="brutal-input"
            style={{ width: '100%', height: '40px', padding: '8px 18px', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', fontSize: '14px' }}
            onChange={(e) => {
              const val = e.target.value.toLowerCase();
              document.querySelectorAll(".card").forEach((card: any) => {
                card.style.display = card.innerText.toLowerCase().includes(val) ? "flex" : "none";
              });
            }}
          />
        </div>

        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); router.push('/create'); }}
          style={{ background: 'var(--text-main)', color: 'var(--bg-card)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow)', transition: 'transform 0.1s ease', outline: 'none' }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span className="material-icons" style={{ fontSize: '24px' }}>add</span>
        </button>
      </div>

      {stories.length > 0 && (
        <div 
          className="stories-container"
          style={{
            padding: '70px 15px 15px 15px', 
            backgroundColor: 'var(--bg-main)', 
            display: 'flex', gap: '15px', overflowX: 'auto',
            borderBottom: '1px solid var(--border-color)',
            position: 'relative'
          }}
        >
          {stories.map((story) => (
            <motion.div 
              key={story.id} 
              className="story-item" 
              onClick={() => handleStoryClick(story.id)} 
              animate={{ scale: animatingStoryId === story.id ? 0.9 : 1 }} // 🔥 Animasi Klik Memantul 🔥
              transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 20 }}
              style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <div style={{ position: 'relative', width: '66px', height: '66px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', overflow: 'hidden' }}>
                
                {/* 🔥 Cincin Animasi Framer Motion 🔥 */}
                <motion.div 
                  animate={{ rotate: animatingStoryId === story.id ? 360 : 0 }}
                  transition={{ 
                    repeat: animatingStoryId === story.id ? Infinity : 0, 
                    duration: 0.8, 
                    ease: "linear" 
                  }}
                  style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    borderRadius: '50%', 
                    background: clickedStoryId === story.id && animatingStoryId !== story.id 
                      ? 'var(--border-color)' 
                      : 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', 
                    zIndex: 1 
                  }} 
                />
                
                <img src={story.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${story.profiles?.username}`} alt="avatar" style={{ width: '61px', height: '61px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid var(--bg-main)', position: 'relative', zIndex: 2 }} />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: '600', maxWidth: '65px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {story.profiles?.username}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
