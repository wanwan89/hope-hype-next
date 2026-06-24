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
      }, 2000);
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
    <div className="header-main-wrapper" style={{ background: '#ffffff' }}>
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
          background: '#ffffff', // Background diubah jadi putih
          borderBottom: '1px solid var(--border-card)',
        }}
      >
        <div className="brutal-input-container">
          <input
            type="text"
            placeholder={t('search_placeholder')}
            className="brutal-input"
            readOnly
            onClick={() => router.push('/search')}
            style={{ cursor: 'pointer' }} /* 🔥 Dikembalikan persis seperti semula tanpa background inline */
          />
        </div>

        <button
          type="button"
          className="add-post-btn"
          onClick={(e) => {
            e.stopPropagation();
            router.push('/create');
          }}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            border: 'none'
          }}
        >
          <span className="material-icons" style={{ fontSize: '24px' }}>add</span>
        </button>
      </div>

      {/* 🔥 LOADING POSTINGAN DENGAN GAYA KEKINIAN */}
      {isUploading && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            marginTop: '6px',
            marginBottom: '2px',
            padding: '0 16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--primary-soft)', // Menggunakan variabel global
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '24px',
              padding: '8px 16px',
              width: '100%',
              maxWidth: '500px',
              border: '1px solid rgba(31, 60, 255, 0.15)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Ikon status */}
            {uploadProgress < 100 ? (
              <span
                className="material-icons"
                style={{
                  fontSize: '18px',
                  color: 'var(--primary)',
                  animation: 'spin 1.5s linear infinite',
                }}
              >
                autorenew
              </span>
            ) : (
              <span
                className="material-icons"
                style={{
                  fontSize: '18px',
                  color: '#00c853',
                }}
              >
                check_circle
              </span>
            )}

            {/* Progress bar mini */}
            <div
              style={{
                flex: 1,
                height: '4px',
                background: 'var(--border-card)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background:
                    uploadProgress < 100
                      ? 'var(--primary)'
                      : '#00c853',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            {/* Teks persentase */}
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--primary)',
                minWidth: '40px',
                textAlign: 'right',
              }}
            >
              {uploadProgress}%
            </span>
          </div>
        </div>
      )}

      {/* Story dengan latar mengikuti tema */}
      {stories.length > 0 && (
        <div
          className="stories-container"
          style={{
            background: '#ffffff', // Background diubah jadi putih
            borderBottom: 'none',
            padding: '10px 0',
          }}
        >
          {stories.map((story) => (
            <div
              key={story.id}
              className="story-item"
              onClick={() => handleStoryClick(story.id)}
              style={{
                transform: animatingStoryId === story.id ? 'scale(0.92)' : 'scale(1)',
                transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                background: 'transparent',
              }}
            >
              <div
                className={`story-circle unseen ${animatingStoryId === story.id ? 'animating' : ''}`}
                style={{
                  background: '#ffffff', // Cincin putih/gelap tergantung tema
                }}
              >
                <img
                  src={
                    story.profiles?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${story.profiles?.username}`
                  }
                  alt="avatar"
                  style={{ border: '2px solid #ffffff' }} // Border image mengikuti background putih
                />
              </div>
              <span className="story-name" style={{ color: 'var(--text-main)' }}>
                {story.profiles?.username}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
