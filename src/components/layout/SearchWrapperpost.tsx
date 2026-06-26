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
        .from('stories')
        .select('*, profiles(username, avatar_url)')
        .gte('created_at', timeLimit)
        .order('created_at', { ascending: false });

      const seenUsers = new Set();
      const uniqueStories = (data || []).filter((story) => {
        if (seenUsers.has(story.creator_id)) return false;
        seenUsers.add(story.creator_id);
        return true;
      });
      setStories(uniqueStories);
    } catch (err) {
      console.error('Story Error:', err);
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
    <div className="header-main-wrapper" style={{ background: 'var(--bg-main)' }}>
      {/* Kotak pencarian + tombol */}
      <div className="search-wrapper glass-effect" style={{ background: 'var(--bg-main)' }}>
        <div className="brutal-input-container">
          <input
            type="text"
            placeholder={t('search_placeholder')}
            className="brutal-input"
            readOnly
            onClick={() => router.push('/search')}
            style={{ 
              cursor: 'pointer',
              background: 'var(--bg-input)', // Mengikuti warna input di global CSS
              color: 'var(--text-main)'
            }}
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
            border: 'none',
          }}
        >
          <span className="material-icons" style={{ fontSize: '24px' }}>add</span>
        </button>
      </div>

      {/* 🔥 Loading Progress Bar 🔥 */}
      {isUploading && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            marginTop: '12px',
            marginBottom: '4px',
            padding: '0 16px',
            boxSizing: 'border-box',
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: 'var(--bg-card)', // DIUBAH: Menyesuaikan warna card di dark/light mode
              borderRadius: '16px',
              padding: '14px 18px',
              width: '100%',
              maxWidth: '450px',
              border: '1px solid var(--border-card)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              animation: 'slideDown 0.3s ease-out',
            }}
          >
            {/* Header Toast: Ikon + Teks + Persentase */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {uploadProgress < 100 ? (
                  /* Animasi Spinner Bulat */
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2.5px solid var(--bg-input)', // DIUBAH: Lingkaran dasar menyesuaikan background input
                      borderTopColor: 'var(--primary)',      
                      animation: 'spin 1s linear infinite',  
                    }}
                  />
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
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {uploadProgress < 100 ? 'Mengunggah postingan...' : 'Postingan berhasil diunggah'}
                </span>
              </div>
              <span 
                style={{ 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  color: uploadProgress < 100 ? 'var(--primary)' : '#00c853',
                  transition: 'color 0.3s ease'
                }}
              >
                {uploadProgress}%
              </span>
            </div>

            {/* Progress Bar Line */}
            <div
              style={{
                width: '100%',
                height: '4px',
                background: 'var(--bg-input)', // DIUBAH: Latar belakang bar line menggunakan bg-input agar tidak bertabrakan dengan bg-main
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: uploadProgress < 100 ? 'var(--primary)' : '#00c853',
                  borderRadius: '4px',
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Story */}
      {stories.length > 0 && (
        <div className="stories-container" style={{ background: 'var(--bg-main)' }}>
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
                style={{
                  background: 'var(--bg-main)', // Tetap menggunakan bg-main agar menyatu dengan background belakang
                }}
              >
                <img
                  src={
                    story.profiles?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${story.profiles?.username}`
                  }
                  alt="avatar"
                  style={{
                    border: '2px solid var(--bg-main)', // Border mengikuti warna background agar terlihat "terpotong" (cut-out effect)
                  }}
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
