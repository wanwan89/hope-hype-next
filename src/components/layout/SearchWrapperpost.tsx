'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [uploadType, setUploadType] = useState('post');

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = ['kreator...', 'postingan...', 'trending...'];

  const isHidden =
    pathname?.includes('hypetalk') ||
    pathname?.includes('chat') ||
    pathname?.includes('/story/view');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isHidden) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 20000);
    return () => clearInterval(interval);
  }, [mounted, isHidden, placeholders.length]);

  useEffect(() => {
    if (localStorage.getItem('isUploading') === 'true') {
      setIsUploading(true);
      setUploadProgress(Number(localStorage.getItem('uploadProgress')) || 0);
      setUploadType(localStorage.getItem('uploadType') || 'post');
    }

    const handleUploadStart = (e: any) => {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadType(e.detail?.type || 'post');
    };

    const handleUploadProgress = (e: any) => {
      setIsUploading(true);
      const progressValue = e.detail?.progress !== undefined ? e.detail.progress : e.detail;
      setUploadProgress(progressValue);
      if (e.detail?.type) setUploadType(e.detail.type);
    };

    const handleUploadSuccess = (e: any) => {
      setUploadProgress(100);
      if (e.detail?.type) setUploadType(e.detail.type);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        localStorage.removeItem('isUploading');
        localStorage.removeItem('uploadProgress');
        localStorage.removeItem('uploadType');
      }, 2000);
    };

    const handleUploadError = () => {
      setIsUploading(false);
      setUploadProgress(0);
      localStorage.removeItem('isUploading');
      localStorage.removeItem('uploadProgress');
      localStorage.removeItem('uploadType');
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
        .select('*, profiles(username, avatar_url, full_name)')
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

  // ✅ Fungsi untuk membatalkan postingan
  const handleCancelUpload = () => {
    setIsUploading(false);
    setUploadProgress(0);
    
    // Hapus dari localStorage
    localStorage.removeItem('isUploading');
    localStorage.removeItem('uploadProgress');
    localStorage.removeItem('uploadType');

    // Trigger event agar komponen pengirim tau harus membatalkan (Abort)
    window.dispatchEvent(new CustomEvent('postUploadCancel', { detail: { type: uploadType } }));
  };

  if (!mounted || isHidden) return null;

  return (
    <div className="header-main-wrapper" style={{ background: 'var(--bg-main)' }}>
      <div className="search-wrapper glass-effect" style={{ background: 'var(--bg-main)' }}>
        <div
          className="brutal-input-container"
          style={{ position: 'relative', flex: 1, display: 'flex' }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '16px',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              overflow: 'hidden',
              gap: '4px',
              color: 'var(--text-muted)',
              fontSize: '14px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              zIndex: 2,
            }}
          >
            <span>Cari</span>

            <AnimatePresence mode="wait">
              <motion.span
                key={placeholderIndex}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -15, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ display: 'inline-block' }}
              >
                {placeholders[placeholderIndex]}
              </motion.span>
            </AnimatePresence>
          </div>

          <input
            type="text"
            className="brutal-input"
            readOnly
            onClick={() => router.push('/search')}
            style={{
              cursor: 'pointer',
              color: 'var(--text-main)',
              width: '100%',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
              caretColor: 'transparent',
              position: 'relative',
              zIndex: 1,
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
            background: 'var(--primary-bg)',
            color: '#fff',
            border: 'none',
            outline: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span className="material-icons" style={{ fontSize: '24px' }}>add</span>
        </button>
      </div>

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
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '14px 18px',
              width: '100%',
              maxWidth: '450px',
              border: '1px solid var(--border-card)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              animation: 'slideDown 0.3s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {uploadProgress < 100 ? (
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2.5px solid var(--bg-input)',
                      borderTopColor: 'var(--primary-bg)',
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
                {/* ✅ Teks Dinamis Berdasarkan Tipe Postingan (Story vs Post) */}
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {uploadProgress < 100
                    ? `Mengunggah ${uploadType === 'story' ? 'Cerita' : 'Postingan'}...`
                    : `${uploadType === 'story' ? 'Cerita' : 'Postingan'} berhasil diunggah!`}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: uploadProgress < 100 ? 'var(--primary)' : '#00c853',
                    transition: 'color 0.3s ease',
                  }}
                >
                  {uploadProgress}%
                </span>

                {/* ✅ Tombol X Batal Postingan */}
                {uploadProgress < 100 && (
                  <button
                    onClick={handleCancelUpload}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px',
                      color: 'var(--text-muted)',
                      outline: 'none',
                    }}
                    title={`Batalkan ${uploadType === 'story' ? 'Cerita' : 'Postingan'}`}
                  >
                    <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                width: '100%',
                height: '4px',
                background: 'var(--bg-input)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: uploadProgress < 100 ? 'var(--primary-bg)' : '#00c853',
                  borderRadius: '4px',
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {stories.length > 0 && (
        <div className="stories-container" style={{ background: 'var(--bg-main)' }}>
          {stories.map((story) => {
            const displayName = story.profiles?.full_name || story.profiles?.username || 'User';
            return (
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
                    padding: '2px',
                    background: 'var(--accent-story)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={
                      story.profiles?.avatar_url ||
                      `https://ui-avatars.com/api/?name=${story.profiles?.username}`
                    }
                    alt="avatar"
                    style={{
                      border: '2px solid var(--bg-main)',
                      borderRadius: '50%',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
                <span className="story-name" style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                  {displayName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
