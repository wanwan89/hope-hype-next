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
  const [animatingStoryId, setAnimatingStoryId] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isHidden = pathname?.includes('hypetalk') || pathname?.includes('chat') || pathname?.includes('/story/view');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (localStorage.getItem('isUploading') === 'true') {
      setIsUploading(true);
      setUploadProgress(Number(localStorage.getItem('uploadProgress')) || 0);
    }

    const handleUploadStart = () => { setIsUploading(true); setUploadProgress(0); };
    const handleUploadProgress = (e: any) => { setIsUploading(true); setUploadProgress(e.detail); };
    const handleUploadSuccess = () => {
      setUploadProgress(100);
      setTimeout(() => { setIsUploading(false); setUploadProgress(0); }, 1500); 
    };
    const handleUploadError = () => { setIsUploading(false); setUploadProgress(0); };

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
    } catch (err) { console.error("Story Error:", err); }
  };

  const handleStoryClick = (sId: string) => {
    setAnimatingStoryId(sId);
    setTimeout(() => {
      router.push(`/story/view?id=${sId}`);
      setTimeout(() => setAnimatingStoryId(null), 100);
    }, 500); 
  };

  if (!mounted || isHidden) return null;

  return (
    <div className="header-main-wrapper"> 
      
      {/* 🔥 Sticky Header Utama dengan Flex Column */}
      <div className="search-wrapper glass-effect" style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 99, 
        width: '100%',
        margin: 0,
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column', // Kunci agar bar loading tersusun rapi di bawah search bar
        padding: 0
      }}>
        
        {/* Baris 1: Search & Add Button */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '12px 16px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div className="brutal-input-container" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder={t('search_placeholder')}
              className="brutal-input"
              readOnly
              onClick={() => router.push('/search')}
              style={{ cursor: 'pointer', width: '100%' }}
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

        {/* Baris 2: Loading Bar (Muncul mulus di bawah search bar) */}
        {isUploading && (
          <div style={{
            width: '100%',
            height: '24px',
            background: 'rgba(31, 60, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderTop: '1px solid rgba(31, 60, 255, 0.1)'
          }}>
            <div style={{
              position: 'absolute',
              left: 0,
              height: '100%',
              width: `${uploadProgress}%`,
              background: 'rgba(31, 60, 255, 0.08)',
              transition: 'width 0.3s ease-out',
            }} />
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#1f3cff',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {uploadProgress < 100 
                ? `Sedang memposting... ${uploadProgress}%` 
                : 'Berhasil memposting!'}
            </span>
          </div>
        )}
      </div>

      {/* Area Story: Tetap di bawah Sticky Header */}
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
