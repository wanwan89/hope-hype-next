'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; 
import { supabase } from '@/lib/supabase';
import './SearchWrapper.css';

export default function SearchWrapperpost() {
  const router = useRouter();
  const pathname = usePathname(); 

  const [mounted, setMounted] = useState(false); 
  const [stories, setStories] = useState<any[]>([]);
  const [clickedStoryId, setClickedStoryId] = useState<string | null>(null);
  const [isStoriesVisible, setIsStoriesVisible] = useState(true);

  // --- CEK HALAMAN CHAT ---
  const isHidden = pathname?.includes('hypetalk') || pathname?.includes('chat');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isHidden) fetchStories();
  }, [mounted, isHidden]);

  // --- LOGIKA STORY: CUMA MUNCUL DI PALING ATAS (Y=0) ---
  useEffect(() => {
    if (!mounted || isHidden) return; 

    const handleScroll = () => {
      // Story muncul hanya jika posisi scroll benar-benar di atas
      if (window.scrollY <= 5) {
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

  if (!mounted || isHidden) return null;

  return (
    <div 
      className="header-sticky-wrapper" 
      style={{ 
        backgroundColor: 'transparent',
        width: '100%',
        position: 'sticky', 
        top: 0,
        zIndex: 15000, 
        transition: 'all 0.3s ease'
      }}
    >
      
      {/* SEARCH BAR AREA */}
      <div 
        className="search-wrapper" 
        style={{ 
          backgroundColor: 'rgba(255,255,255,0.96)', 
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          borderBottom: isStoriesVisible ? 'none' : '1px solid rgba(0,0,0,0.05)'
        }}
      >
        {/* TOMBOL SIDEBAR (HAMBURGER) */}
        <button 
          id="mobileMenuBtn"
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('openSidebar'))}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer',
            padding: '5px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '5px',
            width: '24px',
            height: '24px',
            flexShrink: 0,
            outline: 'none'
          }}
        >
          <span style={{ display: 'block', width: '100%', height: '2px', backgroundColor: '#1a1a1a', borderRadius: '2px' }}></span>
          <span style={{ display: 'block', width: '100%', height: '2px', backgroundColor: '#1a1a1a', borderRadius: '2px' }}></span>
          <span style={{ display: 'block', width: '100%', height: '2px', backgroundColor: '#1a1a1a', borderRadius: '2px' }}></span>
        </button>

        {/* INPUT PENCARIAN */}
        <div className="brutal-input-container" style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Cari kreator..."
            className="brutal-input"
            style={{
              width: '100%',
              height: '38px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: '#f0f2f5',
              color: '#1a1a1a',
              outline: 'none',
              fontSize: '14px'
            }}
            onChange={(e) => {
              const val = e.target.value.toLowerCase();
              document.querySelectorAll(".card").forEach((card: any) => {
                card.style.display = card.innerText.toLowerCase().includes(val) ? "flex" : "none";
              });
            }}
          />
        </div>

        {/* TOMBOL ADD POST (FIXED) */}
        <button 
          type="button"
          id="addPostBtn"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('openPostModal'));
          }}
          style={{ 
            background: '#1a1a1a', 
            border: 'none', 
            color: '#fff', 
            width: '38px', 
            height: '38px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            zIndex: 16000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'transform 0.1s ease',
            outline: 'none'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span className="material-icons" style={{ fontSize: '22px', pointerEvents: 'none' }}>add</span>
        </button>
      </div>

      {/* STORY SECTION */}
      {stories.length > 0 && (
        <div 
          className="stories-container"
          style={{
            maxHeight: isStoriesVisible ? '120px' : '0px',
            opacity: isStoriesVisible ? 1 : 0,
            padding: isStoriesVisible ? '8px 15px 15px 15px' : '0',
            overflow: 'hidden',
            backgroundColor: 'transparent',
            display: 'flex',
            gap: '15px',
            overflowX: 'auto',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: isStoriesVisible ? 'auto' : 'none'
          }}
        >
          {stories.map((story) => (
            <div 
              key={story.id} 
              className="story-item" 
              onClick={() => router.push(`/story/${story.id}`)} 
              style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <div 
                className={`story-circle ${clickedStoryId === story.id ? 'seen' : 'unseen'}`}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  padding: '2.5px',
                  background: clickedStoryId === story.id ? '#e4e6eb' : 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                  transition: 'all 0.2s ease'
                }}
              >
                <img 
                  src={story.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${story.profiles?.username}`} 
                  alt="avatar"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff' }}
                />
              </div>
              <span style={{ fontSize: '11px', color: '#1a1a1a', fontWeight: '500', maxWidth: '65px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {story.profiles?.username}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
