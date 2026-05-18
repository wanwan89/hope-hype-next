'use client';

import React from 'react';

type MusicMarqueeProps = {
  post: any;
  isOverlay?: boolean;
};

const MusicMarquee: React.FC<MusicMarqueeProps> = ({ post, isOverlay = true }) => {
  if (!post.audio_src) return null;
  let cleanAudio = (post.audio_src || "").trim();
  if (cleanAudio.includes('res.cloudinary.com') && cleanAudio.includes('/video/upload/')) {
    cleanAudio = cleanAudio.replace('/video/upload/', '/video/upload/f_mp3/');
  }
  const finalAudio = cleanAudio.startsWith("http") ? cleanAudio : `/songs/${cleanAudio}`;

  return (
    <div className="music-marquee-container"
      style={{
        position: isOverlay ? 'absolute' : 'relative',
        top: isOverlay ? '12px' : 'auto',
        left: isOverlay ? '12px' : 'auto',
        maxWidth: isOverlay ? '130px' : '220px',
        width: isOverlay ? 'auto' : 'fit-content',
        zIndex: 2,
        background: isOverlay ? 'rgba(0,0,0,0.5)' : 'var(--bg-secondary)',
        backdropFilter: isOverlay ? 'blur(8px)' : 'none',
        borderRadius: '16px',
        padding: '4px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        overflow: 'hidden',
        border: isOverlay ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-card)'
      }}
    >
      <span className="material-icons" style={{ fontSize: '12px', color: isOverlay ? '#fff' : 'var(--text-main)' }}>music_note</span>
      <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', position: 'relative' }}>
        <div className="marquee-text"
          style={{
            display: 'inline-block',
            color: isOverlay ? '#fff' : 'var(--text-main)',
            fontSize: '10px',
            fontWeight: 'bold',
            animation: 'marqueeMusic 6s linear infinite',
            paddingLeft: '100%'
          }}
        >
          {post.title || 'Untitled'} — {post.artist || 'Unknown Artist'}
        </div>
      </div>
      <audio className="post-audio-element" loop preload="none" playsInline style={{ display: 'none' }}>
        <source src={finalAudio} type="audio/mpeg" />
      </audio>
    </div>
  );
};

export default React.memo(MusicMarquee);