'use client';
import React from 'react';

type MusicMarqueeProps = {
  post: any;
  isOverlay?: boolean;
};

const MusicMarquee: React.FC<MusicMarqueeProps> = ({ post, isOverlay = true }) => {
  // Pastikan nggak render kalau nggak ada file audio sama sekali
  if (!post.audio_src) return null;

  let cleanAudio = (post.audio_src || "").trim();
  if (cleanAudio.includes('res.cloudinary.com') && cleanAudio.includes('/video/upload/')) {
    cleanAudio = cleanAudio.replace('/video/upload/', '/video/upload/f_mp3/');
  }
  const finalAudio = cleanAudio.startsWith("http") ? cleanAudio : `/songs/${cleanAudio}`;

  // Ambil teks judul dan artis, kasih fallback biar gak kosong banget
  const songTitle = post.title || 'Untitled';
  const songArtist = post.artist || 'Unknown Artist';
  const fullText = `${songTitle} — ${songArtist}`;

  return (
    <div className="music-marquee-container"
      style={{
        position: isOverlay ? 'absolute' : 'relative',
        top: isOverlay ? '12px' : 'auto',
        left: isOverlay ? '12px' : 'auto',
        maxWidth: isOverlay ? '140px' : '220px',
        width: isOverlay ? 'auto' : 'fit-content',
        zIndex: 2,
        background: isOverlay ? 'rgba(0,0,0,0.5)' : 'var(--bg-secondary)',
        backdropFilter: isOverlay ? 'blur(8px)' : 'none',
        borderRadius: '16px',
        padding: '4px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflow: 'hidden',
        border: isOverlay ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-card)'
      }}
    >
      {/* 🔥 INJECT CSS ANIMASI LANGSUNG DI SINI BIAR GAK PERNAH HILANG 🔥 */}
      <style>{`
        @keyframes slideMusicText {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .marquee-track {
          display: inline-block;
          white-space: nowrap;
          animation: slideMusicText 6s linear infinite;
        }
      `}</style>

      <span className="material-icons" style={{ fontSize: '12px', color: isOverlay ? '#fff' : 'var(--text-main)' }}>
        music_note
      </span>
      
      <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', position: 'relative', flex: 1 }}>
        <div 
          className="marquee-track"
          style={{
            color: isOverlay ? '#fff' : 'var(--text-main)',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {fullText}
        </div>
      </div>

      <audio className="post-audio-element" loop preload="none" playsInline style={{ display: 'none' }}>
        <source src={finalAudio} type="audio/mpeg" />
      </audio>
    </div>
  );
};

export default React.memo(MusicMarquee);
