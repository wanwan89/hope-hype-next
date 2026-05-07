'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import './Story.css';

// Interface biar TypeScript gak rewel
interface Story {
  id: string;
  creator_id: string;
  image_url?: string;
  content?: string;
  audio_src?: string;
  title?: string;
  artist?: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

export default function StoryViewerPage() {
  const params = useParams();
  const router = useRouter();
  
  // 🔥 FIX 1: TypeScript safe params access (Cegah Error Vercel)
  const storyId = params?.id as string;

  const [allUserStories, setAllUserStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const STORY_DURATION = 7000;

  // Initial Load
  useEffect(() => {
    if (storyId) {
      initMultiStory();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storyId]);

  // Logic pindah story: Handle like, audio, dan timer tiap ganti index
  useEffect(() => {
    if (allUserStories.length > 0) {
      const currentStory = allUserStories[currentIndex];
      checkIfLiked(currentStory.id);
      handleAudio(currentStory);
      resetTimer();
    }
  }, [currentIndex, allUserStories]);

  async function initMultiStory() {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id || null);

    // Cari tahu siapa pemilik story ini
    const { data: initStory } = await supabase
      .from('stories')
      .select('creator_id')
      .eq('id', storyId)
      .single();

    if (!initStory) return router.back();

    // Ambil SEMUA story user tersebut dalam 24 jam terakhir
    const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*, profiles(username, avatar_url)')
      .eq('creator_id', initStory.creator_id)
      .gte('created_at', timeLimit)
      .order('created_at', { ascending: true });

    if (error || !stories || stories.length === 0) return router.back();

    setAllUserStories(stories as any);
    
    // Set index ke story yang diklik user tadi
    const startIdx = stories.findIndex((s) => s.id === storyId);
    setCurrentIndex(startIdx === -1 ? 0 : startIdx);
    setLoading(false);
  }

  const handleAudio = (story: Story) => {
    if (audioRef.current) {
      if (story.audio_src) {
        audioRef.current.src = story.audio_src;
        audioRef.current.load();
        audioRef.current.play().catch(() => {
          console.log("Autoplay blocked - user must interact");
        });
      } else {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    }
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(nextStory, STORY_DURATION);
  };

  const nextStory = () => {
    if (currentIndex < allUserStories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      router.back(); // Story habis, balik ke Home
    }
  };

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(0); // Restart story pertama
    }
  };

  async function checkIfLiked(sId: string) {
    if (!currentUserId) return;
    const { data } = await supabase
      .from('story_likes')
      .select('id')
      .match({ story_id: sId, user_id: currentUserId })
      .single();
    setIsLiked(!!data);
  }

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return alert("Login dulu bro!");
    
    const sId = allUserStories[currentIndex].id;
    const newLikeStatus = !isLiked;
    setIsLiked(newLikeStatus);

    if (newLikeStatus) {
      if (navigator.vibrate) navigator.vibrate(50);
      await supabase.from('story_likes').insert({ story_id: sId, user_id: currentUserId });
    } else {
      await supabase.from('story_likes').delete().match({ story_id: sId, user_id: currentUserId });
    }
  };

  if (loading) return <div className="story-full-viewer dark-bg"></div>;

  const currentStory = allUserStories[currentIndex];

  return (
    <div className="story-full-viewer">
      {/* Area Tap buat Skip/Back */}
      <div className="tap-area">
        <div className="tap-left" onClick={prevStory}></div>
        <div className="tap-right" onClick={nextStory}></div>
      </div>

      {/* Progress Bars (Gaya IG) */}
      <div className="story-progress-container">
        {allUserStories.map((_, idx) => (
          <div key={idx} className="bar-wrap">
            <div 
              className={`bar-inner ${idx === currentIndex ? 'active-anim' : ''}`}
              style={{ 
                transform: idx < currentIndex ? 'scaleX(1)' : 'scaleX(0)',
                animationDuration: idx === currentIndex ? `${STORY_DURATION}ms` : '0ms'
              }}
            ></div>
          </div>
        ))}
      </div>

      {/* Info User (Top) */}
      <div className="story-top-info">
        <div className="story-user">
          <img 
            src={currentStory.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${currentStory.profiles?.username}`} 
            className="s-avatar" 
            alt="profile"
          />
          <div className="user-meta">
            <div className="user-meta-top">
              <span id="storyUser">{currentStory.profiles?.username}</span>
              <span className="story-time">
                {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {currentStory.audio_src && (
              <div className="music-tag">
                <span className="material-icons" style={{ fontSize: '12px', color: 'white' }}>music_note</span>
                <marquee scrollamount="3" className="marquee-text">
                  {currentStory.title || 'Musik Hype'} - {currentStory.artist || 'Unknown'}
                </marquee>
              </div>
            )}
          </div>
        </div>
        <button className="close-story" onClick={() => router.back()}>✕</button>
      </div>

      {/* Konten Utama (Gambar atau Teks) */}
      <div className="story-display">
        {currentStory.image_url ? (
          <img src={currentStory.image_url} className="s-img" alt="Story content" />
        ) : (
          <div className="s-text">{currentStory.content}</div>
        )}
      </div>

      {/* Caption & Like (Bottom) */}
      <div className="story-bottom-info">
        <div className="footer-layout">
          <div className="caption-container">
            <p className="story-caption">{currentStory.content}</p>
          </div>
          <div className="story-actions-right">
            <button className="story-like-btn" onClick={toggleLike}>
              <svg viewBox="0 0 24 24" className={`heart-svg ${isLiked ? 'liked' : ''}`}>
                <path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <audio ref={audioRef} preload="auto" />
    </div>
  );
}
