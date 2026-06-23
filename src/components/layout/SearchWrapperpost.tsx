'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; 
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import './SearchWrapper.css';

export default function SearchWrapperpost() {
  const router = useRouter();
  const pathname = usePathname(); 
  const { t } = useTranslation();

  const [mounted, setMounted] = useState(false); 
  const [stories, setStories] = useState<any[]>([]);
  const [clickedStoryId, setClickedStoryId] = useState<string | null>(null);
  const [animatingStoryId, setAnimatingStoryId] = useState<string | null>(null);

  // 🔥 State untuk Loading Bar di Background
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isHidden = pathname?.includes('hypetalk') || pathname?.includes('chat') || pathname?.includes('/story/view');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listener untuk Background Upload
  useEffect(() => {
    // Cek jika saat mount ada proses upload sebelumnya yang belum selesai
    if (localStorage.getItem('isUploading') === 'true') {
      setIsUploading(true);
      setUploadProgress(Number(localStorage.getItem('uploadProgress')) || 0);
    }

    const handleUploadStart = () => {
      setIsUploading(true);
      setUploadProgress(0);
    };

    const handleUploadProgress = (e: any) => {
      setIsUploading(true);
      setUploadProgress(e.detail);
    };

    const handleUploadSuccess = () => {
      setUploadProgress(100);
      // Hilangkan bar setelah jeda agar animasi penuh terlihat sempurna
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000); 
    };

    const handleUploadError = () => {
      setIsUploading(false);
      setUploadProgress(0);
    };

    window.addEventListener('postUploadStart', handleUploadStart);
    window.addEventListener('postUploadProgress', handleUploadProgress);
    window.addEventListener('postUploadSuccess', handleUploadSuccess);
    window.addEventListener('postUploadError', handleUploadError);

    return () => {
      window.removeEventListener('postUploadStart', handleUploadStart);
      window.removeEventListener('postUploadProgress', handleUploadProgress);
      window.removeEventListener('postUploadSuccess', handleUploadSuccess);
      window.removeEventListener('postUploadError', handleUploadError);
    };
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
      <div className="search-wrapper glass-effect" style={{ position: 'relative', overflow: 'hidden' }}>
        
        <div className="brutal-input-container">
          <input
            type="text"
            placeholder={t('search_placeholder')}
            className="brutal-input"
            readOnly
            onClick={() => router.push('/search')}
            style={{ cursor: 'pointer' }}
          />
        </div>

        <button 
          type="button"
          className="add-post-btn"
          onClick={(e) => { e.stopPropagation(); router.push('/create'); }}
        >
          <span className="material-icons" style={{ fontSize: '24px' }}>add</span>
        </button>

        {/* 🔥 Animasi Loading Bar dari Bawah Area Search */}
        {isUploading && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '3px',
            background: 'var(--border-card)',
            zIndex: 10
          }}>
            <div style={{
              height: '100%',
              width: `${uploadProgress}%`,
              background: '#1f3cff', // Warna biru khas theme Anda
              transition: 'width 0.3s ease-out',
              borderRadius: '0 2px 2px 0'
            }} />
          </div>
        )}
      </div>

      {stories.length > 0 && (
        <div className="stories-container">
          {stories.map((story) => (
            <div 
              key={story.id} 
              className="story-item" 
              onClick={() => handleStoryClick(story.id)} 
              style={{
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
