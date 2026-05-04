'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import './SearchWrapper.css';

export default function SearchWrapperpost() {
  const router = useRouter();
  const [stories, setStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clickedStoryId, setClickedStoryId] = useState<string | null>(null);

  // --- STATE UNTUK SCROLL ANIMATION ---
  const [isStoriesVisible, setIsStoriesVisible] = useState(true);
  
  // FIX: Gunakan useRef agar tidak nge-glitch saat di-scroll
  const lastScrollY = useRef(0);

  useEffect(() => {
    fetchStories();
  }, []);

  // --- LOGIKA HILANG SAAT SCROLL (ANTI LAG) ---
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsStoriesVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsStoriesVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const fetchStories = async () => {
    try {
      const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("stories")
        .select("*, profiles(username, avatar_url)")
        .gte("created_at", timeLimit)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const seenUsers = new Set();
      const uniqueStories = (data || []).filter(story => {
        if (seenUsers.has(story.creator_id)) return false;
        seenUsers.add(story.creator_id);
        return true;
      });

      setStories(uniqueStories);
    } catch (err) {
      console.error("Story Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll(".card").forEach((card: any) => {
      card.style.display = card.innerText.toLowerCase().includes(val) ? "flex" : "none";
    });
  };

  const onStoryClick = (storyId: string) => {
    setClickedStoryId(storyId);
    setTimeout(() => {
      router.push(`/story/${storyId}`);
    }, 350);
  };

  return (
    <div className="header-sticky-wrapper" style={{ backgroundColor: '#ffffff', width: '100%' }}>
      
      {/* SEARCH BAR (SELALU KELIHATAN) */}
      <div className="search-wrapper">
        {/* FIX 1: Ubah jadi tag <button> dan kasih padding biar gampang diklik */}
        <button 
          className="menu-toggle" 
          id="mobileMenuBtn"
          style={{ 
            background: 'transparent', 
            border: 'none', 
            padding: '5px 10px 5px 0', // Padding ekstra di kanan biar sentuhan gak meleset
            cursor: 'pointer' 
          }}
          aria-label="Buka Menu"
        >
          <span></span><span></span><span></span>
        </button>

        <div className="brutal-input-container">
          <input
            type="text"
            placeholder="Cari kreator..."
            className="brutal-input"
            autoComplete="off"
            onChange={handleSearch}
          />
        </div>

        <button id="openPostModalBtn" className="add-post-btn" aria-label="Tambah Postingan">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      {/* FIX 2: STORY SECTION - HANYA MUNCUL JIKA ADA CERITA */}
      {stories.length > 0 && (
        <div 
          className="stories-container"
          style={{
            maxHeight: isStoriesVisible ? '120px' : '0px',
            opacity: isStoriesVisible ? 1 : 0,
            paddingTop: isStoriesVisible ? '5px' : '0px',
            paddingBottom: isStoriesVisible ? '15px' : '0px',
            overflow: 'hidden',
            willChange: 'max-height, opacity, padding',
            transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
            pointerEvents: isStoriesVisible ? 'auto' : 'none'
          }}
        >
          {stories.map((story) => (
            <div key={story.id} className="story-item" onClick={() => onStoryClick(story.id)}>
              <div className={`story-circle ${clickedStoryId === story.id ? 'seen clicked' : 'unseen'}`}>
                <img 
                  src={story.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${story.profiles?.username}`} 
                  alt="user" 
                  loading="lazy" 
                />
              </div>
              <span>{story.profiles?.username || 'User'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
