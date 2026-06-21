'use client';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion'; // 🔥 Tambahan untuk animasi Play/Pause
import FollowButton from './FollowButton';
import EngagementButtons from './EngagementButtons';
import MusicMarquee from './MusicMarquee';
import FloatingBubbles from './FloatingBubbles';
import { getUserBadge } from '@/lib/ui-utils';
import { formatRelativeTime, getOptimizedImage } from '@/lib/helpers';

type PostCardProps = {
  post: any;
  currentUser: any;
  counts: Record<string, { likes: number; comments: number; reposts: number; saves: number }>;
  myLikedPosts: Set<string>;
  myRepostedPosts: Set<string>;
  mySavedPosts: Set<string>;
  followedUsers: Set<string>;
  mutualUsers: Set<string>;
  animatingFollows: Set<string>;
  animatingReposts: Set<string>;
  isGloballyMuted: boolean;
  poppingHeart: string | null;
  activePreviewImage: string | null;
  likersMap: Record<string, any[]>;
  repostersMap: Record<string, any[]>;
  handleLike: (postId: string, creatorId: string) => void;
  handleSave: (postId: string) => void;
  openRepostModal: (postId: string, creatorId: string) => void;
  handleMediaClick: (e: React.MouseEvent, postId: string, creatorId: string, imageUrl?: string) => void;
  toggleMute: (e: React.MouseEvent) => void;
  openShareOptions: (post: any, isOwner: boolean) => void;
  handleFollowToggle: (e: any, creatorId: string) => void;
  setActivePreviewImage: (url: string | null) => void;
  router: ReturnType<typeof useRouter>;
  t: any;
  isExpanded?: boolean;
  onToggleExpand?: (postId: string) => void;
};

const PostCard: React.FC<PostCardProps> = ({
  post, currentUser, counts, myLikedPosts, myRepostedPosts, mySavedPosts,
  followedUsers, mutualUsers, animatingFollows, animatingReposts,
  isGloballyMuted, poppingHeart, activePreviewImage, likersMap, repostersMap,
  handleLike, handleSave, openRepostModal, handleMediaClick,
  toggleMute, openShareOptions, handleFollowToggle,
  setActivePreviewImage, router, t,
  isExpanded = false,
  onToggleExpand = () => {},
}) => {
  const postIdStr = String(post.id);
  const creatorIdStr = String(post.creator_id);
  const isOwner = currentUser && currentUser.id === post.creator_id;

  // --- 1. Nilai turunan dari post (Memoized) ---
  const photoList = useMemo(() => (post.image_url ? post.image_url.split(',') : []), [post.image_url]);
  const isVideoPost = !!post.video_url;

  const badge = useMemo(() => getUserBadge(post.profiles?.role), [post.profiles?.role]);

  const rawAvatarUrl = post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.username}`;
  const optimizedAvatar = useMemo(() => {
    if (rawAvatarUrl.includes('res.cloudinary.com') && !rawAvatarUrl.includes('f_auto')) {
      return rawAvatarUrl.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
    }
    return rawAvatarUrl;
  }, [rawAvatarUrl]);

  const formattedDate = useMemo(() => formatRelativeTime(post.created_at), [post.created_at]);
  const optimizedPhotoUrls = useMemo(() => photoList.map((url) => getOptimizedImage(url)), [photoList]);

  const likers = likersMap[postIdStr] || [];
  const reposters = repostersMap[postIdStr] || [];
  const mutualLikers = useMemo(() => likers.filter((l: any) => mutualUsers.has(String(l.id))), [likers, mutualUsers]);
  const mutualReposters = useMemo(() => reposters.filter((r: any) => mutualUsers.has(String(r.id))), [reposters, mutualUsers]);

  // --- 2. Refs & State Lokal ---
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const captionRef = useRef<HTMLDivElement | HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [showMoreButton, setShowMoreButton] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [localExpanded, setLocalExpanded] = useState(false);
  const actuallyExpanded = isExpanded || localExpanded;

  // 🔥 State Baru untuk Sistem FYP / Reels
  const [isPlaying, setIsPlaying] = useState(false);
  const [playPauseIcon, setPlayPauseIcon] = useState<'play' | 'pause' | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);

  // --- 3. Observer Anti-Lag (requestIdleCallback) ---
  useEffect(() => {
    const media = mediaRef.current as HTMLVideoElement;
    const card = cardRef.current;
    if (!media || !card || (!isVideoPost && !post.audio_src)) return;

    media.muted = isGloballyMuted;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Play background process agar tidak ganggu scroll UI
          const playMedia = () => {
            media.muted = isGloballyMuted;
            media.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            
            // Auto pause video lain yang sedang jalan
            document.querySelectorAll('.post-video-element, .post-audio-element').forEach((el: any) => {
              if (el !== media && !el.paused) el.pause();
            });
          };

          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(playMedia);
          } else {
            setTimeout(playMedia, 100);
          }
        } else {
          media.pause();
          setIsPlaying(false);
        }
      });
    }, { threshold: 0.6 }); // Hanya muter kalau sudah 60% keliatan di layar

    observer.observe(card);
    return () => observer.disconnect();
  }, [isGloballyMuted, isVideoPost, post.audio_src]);

  // --- 4. Logic Single Tap (Play/Pause) & Double Tap (Like) ---
  const handleVideoTap = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const media = mediaRef.current as HTMLVideoElement;
    if (!media) return;

    if (now - lastTapRef.current < 300) {
      // Double Tap (Like)
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      lastTapRef.current = 0;
      if (!currentUser) return window.dispatchEvent(new CustomEvent("openLogin"));
      handleLike(postIdStr, creatorIdStr);
    } else {
      // Single Tap (Play/Pause)
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        if (media.paused) {
          media.play();
          setIsPlaying(true);
          setPlayPauseIcon('play');
        } else {
          media.pause();
          setIsPlaying(false);
          setPlayPauseIcon('pause');
        }
        // Sembunyikan icon setelah animasi beres
        setTimeout(() => setPlayPauseIcon(null), 800);
        lastTapRef.current = 0;
      }, 300);
    }
  }, [currentUser, handleLike, postIdStr, creatorIdStr]);

  // --- 5. Progress Bar Control ---
  const handleTimeUpdate = useCallback(() => {
    const media = mediaRef.current as HTMLVideoElement;
    if (!media || !media.duration) return;
    setVideoProgress((media.currentTime / media.duration) * 100);
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const media = mediaRef.current as HTMLVideoElement;
    if (!media || !media.duration) return;
    const newTime = (Number(e.target.value) / 100) * media.duration;
    media.currentTime = newTime;
    setVideoProgress(Number(e.target.value));
  }, []);

  // --- 6. Expand Bio Logic ---
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (captionRef.current) {
        const el = captionRef.current;
        const prevWebkit = el.style.webkitLineClamp;
        el.style.webkitLineClamp = 'unset';
        const fullHeight = el.scrollHeight;
        el.style.webkitLineClamp = prevWebkit;
        setShowMoreButton(fullHeight > 45);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [post.bio, actuallyExpanded]);

  const renderBioWithMentions = useCallback((text: string) => {
    if (!text) return null;
    return text.split(/(@\w+|#\w+)/g).map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} onClick={(e) => { e.stopPropagation(); router.push(`/data?id=${part.substring(1)}`); }} style={{ color: '#1f3cff', fontWeight: 700, cursor: 'pointer' }}>
            {part}
          </span>
        );
      } else if (part.startsWith('#')) {
        return (
          <span key={i} onClick={(e) => { e.stopPropagation(); router.push(`/search?q=${encodeURIComponent(part)}`); }} style={{ color: 'var(--text-muted)', fontWeight: 400, cursor: 'pointer' }}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }, [router]);

  const bioContent = useMemo(() => renderBioWithMentions(post.bio?.trim()), [post.bio, renderBioWithMentions]);

  const handleToggleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLocalExpanded((prev) => !prev);
    onToggleExpand(postIdStr);
  }, [onToggleExpand, postIdStr]);

  // --- 7. STYLE: EDGE-TO-EDGE (Full Width) ---
  const cardStyle: React.CSSProperties = useMemo(() => ({
    overflow: actuallyExpanded ? 'visible' : 'hidden',
    background: 'var(--bg-main)',
    width: '100%',
    margin: '0 0 12px 0',
    padding: 0,
    border: 'none', // Hilangkan pinggiran kiri-kanan
    borderTop: '1px solid var(--border-card)',
    borderBottom: '1px solid var(--border-card)',
    borderRadius: 0, // Hilangkan curve melengkung biar seperti IG/TikTok
    position: 'relative' as const,
    boxSizing: 'border-box' as const,
    display: 'block',
    textAlign: 'left' as const,
    zIndex: actuallyExpanded ? 50 : 1,
  }), [actuallyExpanded]);

  // ====================== RENDER ======================
  return (
    <div key={postIdStr} id={`post-${postIdStr}`} data-postid={postIdStr} className="card" ref={cardRef} style={cardStyle} onClick={(e) => { if (!photoList.length && !isVideoPost) handleMediaClick(e, postIdStr, creatorIdStr); }}>
      
      {(photoList.length > 0 || isVideoPost) ? (
        <>
          <div className="slider" style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
            <MusicMarquee post={post} isOverlay mediaRef={mediaRef} />

            {/* Animasi Hati (Like) */}
            {poppingHeart?.startsWith(postIdStr) && (
              <span key={poppingHeart} className="material-icons" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ff2e63', fontSize: '160px', animation: 'popHeartAnim 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))', zIndex: 9999, pointerEvents: 'none' }}>
                favorite
              </span>
            )}

            {/* Animasi Play/Pause Tappable Overlay */}
            <AnimatePresence>
              {playPauseIcon && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1.5 }}
                  exit={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, color: 'white', pointerEvents: 'none' }}
                >
                  <span className="material-icons" style={{ fontSize: '40px' }}>
                    {playPauseIcon === 'play' ? 'play_arrow' : 'pause'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top right badges */}
            <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 5, display: 'flex', gap: '6px' }}>
              {photoList.length > 1 && !isVideoPost && (
                <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white', padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  <span className="material-icons" style={{ fontSize: '12px' }}>collections</span>
                  <span>{currentSlide + 1}/{photoList.length}</span>
                </div>
              )}
            </div>

            {/* Carousel media / Video */}
            <div className="photo-carousel" onScroll={(e) => { const target = e.target as HTMLDivElement; const index = Math.round(target.scrollLeft / target.offsetWidth); if (index !== currentSlide) setCurrentSlide(index); }}>
              {isVideoPost ? (
                <div className="carousel-item" onClick={handleVideoTap} style={{ aspectRatio: '4/5', width: '100%', position: 'relative', background: '#000', cursor: 'pointer' }}>
                  {!videoLoaded && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                      <div className="loading-spinner" />
                    </div>
                  )}
                  <video
                    ref={mediaRef as React.RefObject<HTMLVideoElement>}
                    src={post.video_url}
                    className="post-video-element"
                    poster={getOptimizedImage(post.image_url)}
                    playsInline
                    webkit-playsinline="true" // Penting buat iOS
                    preload="metadata" // 🔥 ANTI LAG: Cuma load metadata, gak seluruh file
                    loop
                    muted={isGloballyMuted}
                    onLoadedData={() => setVideoLoaded(true)}
                    onTimeUpdate={handleTimeUpdate} // Update Progress Bar
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center',
                      willChange: 'transform', opacity: videoLoaded ? 1 : 0, transition: 'opacity 0.3s',
                    }}
                  />

                  {/* Progress Bar Video (Seekable) */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', zIndex: 5 }}>
                    <div style={{ width: `${videoProgress}%`, height: '100%', background: '#1f3cff', transition: 'width 0.1s linear' }} />
                    <input
                      type="range" min="0" max="100" value={videoProgress}
                      onChange={handleSeek}
                      onClick={(e) => e.stopPropagation()} // Supaya ga kepencet play/pause
                      style={{ position: 'absolute', top: '-10px', left: 0, width: '100%', height: '20px', opacity: 0, cursor: 'pointer' }}
                    />
                  </div>
                </div>
              ) : (
                photoList.map((url: string, i: number) => {
                  const [imgLoaded, setImgLoaded] = useState(false);
                  return (
                    <div key={i} className="carousel-item" style={{ aspectRatio: '4/5', width: '100%', position: 'relative', background: '#1a1a1a' }}>
                      {!imgLoaded && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}><div className="loading-spinner" /></div>
                      )}
                      <img
                        src={optimizedPhotoUrls[i]}
                        loading="lazy"
                        decoding="async"
                        alt={`Postingan Galeri ${i + 1}`}
                        onLoad={() => setImgLoaded(true)}
                        onClick={(e) => handleMediaClick(e, postIdStr, creatorIdStr, optimizedPhotoUrls[i])}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', cursor: 'pointer', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
                      />
                    </div>
                  );
                })
              )}
            </div>

            {/* Dots navigasi */}
            {photoList.length > 1 && !isVideoPost && (
              <div className={`carousel-dots dots-${postIdStr}`} style={{ zIndex: 2 }}>
                {photoList.map((_: any, i: number) => (
                  <div key={i} className={`dot ${i === currentSlide ? 'active' : ''}`} />
                ))}
              </div>
            )}
          </div>

          {/* Overlay informasi / Bottom Area */}
          <div className="overlay" style={{ padding: '12px 16px', pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={optimizedAvatar} alt="Avatar" onClick={() => router.push(`/data?id=${creatorIdStr}`)} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <h2 onClick={() => router.push(`/data?id=${creatorIdStr}`)} style={{ margin: 0, cursor: 'pointer', fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {post.profiles?.username || 'User'}
                    </h2>
                    <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formattedDate}</span>
                </div>
                <div style={{ marginLeft: '4px' }}>
                  <FollowButton creatorId={creatorIdStr} currentUser={currentUser} followedUsers={followedUsers} mutualUsers={mutualUsers} animatingFollows={animatingFollows} handleFollowToggle={handleFollowToggle} t={t} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {(isVideoPost || post.audio_src) && (
                  <button className="btn-press" onClick={(e) => { e.stopPropagation(); toggleMute(e); if (mediaRef.current && isGloballyMuted) { mediaRef.current.muted = false; mediaRef.current.play().catch(() => {}); } }} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <span className="material-icons">{isGloballyMuted ? 'volume_off' : 'volume_up'}</span>
                  </button>
                )}
                <button className="options-btn btn-press" onClick={(e) => { e.stopPropagation(); openShareOptions(post, isOwner); }} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <span className="material-icons">more_horiz</span>
                </button>
              </div>
            </div>

            {/* Engagement Buttons */}
            <div style={{ marginTop: '12px' }}>
              <EngagementButtons postId={postIdStr} creatorId={creatorIdStr} counts={counts} mySavedPosts={mySavedPosts} myRepostedPosts={myRepostedPosts} myLikedPosts={myLikedPosts} animatingReposts={animatingReposts} handleSave={handleSave} openRepostModal={openRepostModal} handleLike={handleLike} />
            </div>

            {/* Bio Edge-to-Edge Fix Z-Index */}
            <div style={{ position: 'relative', zIndex: actuallyExpanded ? 100 : 10, marginTop: '8px', textAlign: 'left' }}>
              <p ref={captionRef as React.RefObject<HTMLParagraphElement>} style={{ fontSize: '14.5px', color: 'var(--text-main)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', display: actuallyExpanded ? 'block' : '-webkit-box', WebkitLineClamp: actuallyExpanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                <span style={{ fontWeight: 800, marginRight: '6px' }}>{post.profiles?.username}</span>
                {bioContent}
              </p>

              <div style={{ position: 'relative', zIndex: 101 }}>
                {showMoreButton && !actuallyExpanded && (
                  <button onClick={handleToggleClick} style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer' }}>Lihat Selengkapnya</button>
                )}
                {actuallyExpanded && (
                  <button onClick={handleToggleClick} style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer' }}>Lebih Sedikit</button>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        // ==================== TAMPILAN POSTINGAN TEKS / AUDIO ====================
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '12px', cursor: 'pointer' }} onClick={() => router.push(`/data?id=${creatorIdStr}`)}>
              <img src={optimizedAvatar} alt="Avatar Profil" decoding="async" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
                  {post.profiles?.full_name || post.profiles?.username || 'User'}
                  <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                  <FollowButton creatorId={creatorIdStr} currentUser={currentUser} followedUsers={followedUsers} mutualUsers={mutualUsers} animatingFollows={animatingFollows} handleFollowToggle={handleFollowToggle} t={t} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {formattedDate}
                  {post.is_ad && (
                    <>
                      <span>•</span>
                      <span style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--text-main)' }}>
                        <span className="material-icons" style={{ fontSize: '12px', color: '#1f3cff' }}>campaign</span> Iklan
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>
            <button className="btn-press" onClick={(e) => { e.stopPropagation(); openShareOptions(post, isOwner); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <span className="material-icons">more_horiz</span>
            </button>
          </div>

          {poppingHeart?.startsWith(postIdStr) && (
            <span key={poppingHeart} className="material-icons" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ff2e63', fontSize: '160px', animation: 'popHeartAnim 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))', zIndex: 9999, pointerEvents: 'none' }}>
              favorite
            </span>
          )}

          <div ref={captionRef as React.RefObject<HTMLDivElement>} style={{ marginBottom: showMoreButton ? '4px' : '12px', fontSize: '14.5px', color: 'var(--text-main)', lineHeight: 1.5, wordBreak: 'break-word', display: actuallyExpanded ? 'block' : '-webkit-box', WebkitLineClamp: actuallyExpanded ? 'unset' : 4, WebkitBoxOrient: 'vertical', overflow: actuallyExpanded ? 'visible' : 'hidden', textAlign: 'left' }}>
            {bioContent}
          </div>

          <div style={{ position: 'relative', zIndex: 101 }}>
            {showMoreButton && !actuallyExpanded && (
              <button className="see-more-btn" onClick={handleToggleClick} style={{ display: 'block', textAlign: 'left', marginBottom: '12px', color: '#1f3cff', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: 'none', border: 'none', padding: 0 }}>Lihat Selengkapnya</button>
            )}
            {actuallyExpanded && (
              <button className="see-more-btn" onClick={handleToggleClick} style={{ display: 'block', textAlign: 'left', marginBottom: '12px', color: '#ff2e63', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: 'none', border: 'none', padding: 0 }}>Lebih Sedikit</button>
            )}
          </div>

          {post.audio_src && (
            <>
              <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={post.audio_src} className="post-audio-element" loop playsInline autoPlay muted={isGloballyMuted} style={{ width: '1px', height: '1px', position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', height: '40px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                <MusicMarquee post={post} isOverlay={false} mediaRef={mediaRef} />
                <button className="btn-press" onClick={(e) => { toggleMute(e); if (mediaRef.current && isGloballyMuted) { mediaRef.current.muted = false; mediaRef.current.play().catch(() => {}); } }} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', color: 'var(--text-main)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                  <span className="material-icons" style={{ fontSize: '18px' }}>{isGloballyMuted ? 'volume_off' : 'volume_up'}</span>
                </button>
              </div>
            </>
          )}

          <div className="actions" style={{ borderTop: '1px solid var(--border-card)', marginTop: '4px', paddingTop: '12px' }} onClick={(e) => e.stopPropagation()}>
            <EngagementButtons postId={postIdStr} creatorId={creatorIdStr} counts={counts} mySavedPosts={mySavedPosts} myRepostedPosts={myRepostedPosts} myLikedPosts={myLikedPosts} animatingReposts={animatingReposts} handleSave={handleSave} openRepostModal={openRepostModal} handleLike={handleLike} />
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(PostCard, (prev, next) => {
  const pid = prev.post.id;
  const cid = prev.post.creator_id;

  if (prev.post !== next.post) return false;
  if (prev.activePreviewImage !== next.activePreviewImage) return false;
  if (prev.isGloballyMuted !== next.isGloballyMuted) return false;

  const isPoppingPrev = prev.poppingHeart?.startsWith(pid);
  const isPoppingNext = next.poppingHeart?.startsWith(pid);
  if (prev.poppingHeart !== next.poppingHeart && (isPoppingPrev || isPoppingNext)) return false;

  const prevCount = prev.counts[pid] || {};
  const nextCount = next.counts[pid] || {};
  if (prevCount.likes !== nextCount.likes) return false;
  if (prevCount.comments !== nextCount.comments) return false;
  if (prevCount.reposts !== nextCount.reposts) return false;
  if (prevCount.saves !== nextCount.saves) return false;

  if (prev.myLikedPosts.has(pid) !== next.myLikedPosts.has(pid)) return false;
  if (prev.myRepostedPosts.has(pid) !== next.myRepostedPosts.has(pid)) return false;
  if (prev.mySavedPosts.has(pid) !== next.mySavedPosts.has(pid)) return false;
  if (prev.animatingReposts.has(pid) !== next.animatingReposts.has(pid)) return false;

  if (prev.followedUsers.has(cid) !== next.followedUsers.has(cid)) return false;
  if (prev.mutualUsers.has(cid) !== next.mutualUsers.has(cid)) return false;
  if (prev.animatingFollows.has(cid) !== next.animatingFollows.has(cid)) return false;

  if (prev.likersMap[pid]?.length !== next.likersMap[pid]?.length) return false;
  if (prev.repostersMap[pid]?.length !== next.repostersMap[pid]?.length) return false;

  if (prev.isExpanded !== next.isExpanded) return false;

  return true;
});
