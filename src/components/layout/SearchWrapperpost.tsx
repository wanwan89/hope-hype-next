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

  // State untuk background upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isHidden =
    pathname?.includes('hypetalk') ||
    pathname?.includes('chat') ||
    pathname?.includes('/story/view');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listener upload
  useEffect(() => {
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
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1500);
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
    // ... sama seperti sebelumnya, tidak diubah ...
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
    <div className="header-main-wrapper">
      {/* Kotak pencarian + tombol */}
      <div
        className="search-wrapper glass-effect"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 99,
          width: '100vw',
          maxWidth: '100%',
          margin: 0,
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          overflow: 'hidden',
        }}
      >
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
          onClick={(e) => {
            e.stopPropagation();
            router.push('/create');
          }}
        >
          <span className="material-icons" style={{ fontSize: '24px' }}>add</span>
        </button>
      </div>

      {/* 🔥 Progress bar di luar kotak pencarian – tidak mengganggu input / tombol */}
      {isUploading && (
        <div
          style={{
            background: 'var(--bg-main)',
            borderBottom: '1px solid var(--border-card)',
            padding: '0',
            overflow: 'hidden',
          }}
        >
          {/* Bar progres */}
          <div style={{ height: '3px', background: 'var(--border-card)' }}>
            <div
              style={{
                width: `${uploadProgress}%`,
                height: '100%',
                background: '#1f3cff',
                transition: 'width 0.3s ease',
                borderRadius: '0 2px 2px 0',
              }}
            />
          </div>
          {/* Teks status */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '6px 0',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#1f3cff',
                letterSpacing: '0.5px',
                background: 'rgba(31,60,255,0.08)',
                padding: '2px 12px',
                borderRadius: '10px',
              }}
            >
              {uploadProgress < 100
                ? `Sedang Memposting... ${uploadProgress}%`
                : 'Berhasil Memposting!'}
            </span>
          </div>
        </div>
      )}

      {/* Story */}
      {stories.length > 0 && (
        <div className="stories-container">
          {stories.map((story) => (
            <div
              key={story.id}
              className="story-item"
              onClick={() => handleStoryClick(story.id)}
              style={{
                transform: animatingStoryId === story.id ? 'scale(0.92)' : 'scale(1)',
                transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              <div
                className={`story-circle unseen ${animatingStoryId === story.id ? 'animating' : ''}`}
              >
                <img
                  src={
                    story.profiles?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${story.profiles?.username}`
                  }
                  alt="avatar"
                />
              </div>
              <span className="story-name">{story.profiles?.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}