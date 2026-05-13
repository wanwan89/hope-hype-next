'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; 
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
// 🔥 FIX: Framer Motion dihapus total biar Vercel nggak error 🔥
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
    <div className="header-sticky-wrapper">
      <div className="search-wrapper glass-effect">
        <button 
          id="mobileMenuBtn"
          type="button"
          aria-label="Buka Menu"
          onClick={() => window.dispatchEvent(new CustomEvent('openSidebar'))}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', display: 'flex', flexDirection: 'column', gap: '5px', width: '24px', flexShrink: 0, outline: 'none' }}
        >
          {[1,2,3].map(i => <span key={i} style={{ display: 'block', width: '100%', height: '2px', backgroundColor: 'var(--text-main)', borderRadius: '2px' }}></span>)}
        </button>

        <div className="brutal-input-container">
          <input
            type="text"
            placeholder={t('search_placeholder')}
            className="brutal-input"
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
          className="add-post-btn"
          onClick={(e) => { e.stopPropagation(); router.push('/create'); }}
        >
          <span className="material-icons" style={{ fontSize: '24px' }}>add</span>
        </button>
      </div>

      {stories.length > 0 && (
        <div className="stories-container">
          {stories.map((story) => (
            <div 
              key={story.id} 
              className="story-item" 
              onClick={() => handleStoryClick(story.id)} 
              style={{
                /* 🔥 FIX: Animasi "Spring" diganti jadi CSS Native (Super Ringan) 🔥 */
                transform: animatingStoryId === story.id ? 'scale(0.92)' : 'scale(1)',
                transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              <div className={`story-circle unseen ${animatingStoryId === story.id ? 'animating' : ''}`}>
                <img 
                  src={story.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${story.profiles?.username}`} 
                  alt="avatar" 
                />
              </div>
              <span className="story-name">
                {story.profiles?.username}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
