'use client';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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

  // --- 1. Nilai turunan dari post ---
  const photoList = useMemo(
    () => (post.image_url ? post.image_url.split(',') : []),
    [post.image_url]
  );
  const isVideoPost = !!post.video_url;

  const badge = useMemo(
    () => getUserBadge(post.profiles?.role),
    [post.profiles?.role]
  );

  const rawAvatarUrl =
    post.profiles?.avatar_url ||
    `https://ui-avatars.com/api/?name=${post.profiles?.username}`;
  const optimizedAvatar = useMemo(() => {
    if (rawAvatarUrl.includes('res.cloudinary.com') && !rawAvatarUrl.includes('f_auto')) {
      return rawAvatarUrl.replace(
        '/image/upload/',
        '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/'
      );
    }
    return rawAvatarUrl;
  }, [rawAvatarUrl]);

  const formattedDate = useMemo(
    () => formatRelativeTime(post.created_at),
    [post.created_at]
  );

  const optimizedPhotoUrls = useMemo(
    () => photoList.map((url) => getOptimizedImage(url)),
    [photoList]
  );

  const likers = likersMap[postIdStr] || [];
  const reposters = repostersMap[postIdStr] || [];
  const mutualLikers = useMemo(
    () => likers.filter((l: any) => mutualUsers.has(String(l.id))),
    [likers, mutualUsers]
  );
  const mutualReposters = useMemo(
    () => reposters.filter((r: any) => mutualUsers.has(String(r.id))),
    [reposters, mutualUsers]
  );

  // --- 2. Refs dan state lokal ---
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const captionRef = useRef<HTMLDivElement | HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [showMoreButton, setShowMoreButton] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const currentSlideRef = useRef(0);
  const [localExpanded, setLocalExpanded] = useState(false);
  const actuallyExpanded = isExpanded || localExpanded;

  // State kontrol video
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // State UI video
  const [showPlayPause, setShowPlayPause] = useState(false);
  const [isBarVisible, setIsBarVisible] = useState(false);
  const playPauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapVideoRef = useRef<number>(0);
  
  // Ref untuk menyimpan state video sebelum di-seek
  const wasPlayingRef = useRef(false);

  // --- 3. Observer video/audio ---
  useEffect(() => {
    const media = mediaRef.current;
    const card = cardRef.current;
    if (!media || !card) return;

    media.muted = isGloballyMuted;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            media.muted = isGloballyMuted;
            media.play().catch(() => {
              media.muted = true;
              media.play().catch(() => {});
            });

            document
              .querySelectorAll('.post-video-element, .post-audio-element')
              .forEach((el: any) => {
                if (el !== media && !el.paused) el.pause();
              });
          } else {
            media.pause();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, [isGloballyMuted]);

  // Sinkronisasi status video
  useEffect(() => {
    const video = mediaRef.current as HTMLVideoElement | null;
    if (!video || !isVideoPost) return;

    const onTimeUpdate = () => {
      if (!isSeeking) setVideoCurrentTime(video.currentTime);
    };
    const onLoadedMetadata = () => setVideoDuration(video.duration);
    const onPlay = () => setIsVideoPlaying(true);
    const onPause = () => setIsVideoPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [isVideoPost, isSeeking]);

  // Deteksi bio
  useEffect(() => {
    if (photoList.length > 0 || isVideoPost) {
      const raf = requestAnimationFrame(() => {
        if (captionRef.current) {
          const el = captionRef.current;
          const prev = el.style.webkitLineClamp;
          el.style.webkitLineClamp = 'unset';
          const fullHeight = el.scrollHeight;
          el.style.webkitLineClamp = prev;
          setShowMoreButton(fullHeight > 45);
        }
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setShowMoreButton(false);
    }
  }, [post.bio, actuallyExpanded, photoList.length, isVideoPost]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (playPauseTimerRef.current) clearTimeout(playPauseTimerRef.current);
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  // Render bio
  const renderBioWithMentions = useCallback(
    (text: string) => {
      if (!text) return null;
      return text.split(/(@\w+|#\w+)/g).map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/data?id=${part.substring(1)}`);
              }}
              style={{ color: '#1f3cff', fontWeight: 700, cursor: 'pointer' }}
            >
              {part}
            </span>
          );
        } else if (part.startsWith('#')) {
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/search?q=${encodeURIComponent(part)}`);
              }}
              style={{ color: 'var(--text-muted)', fontWeight: 400, cursor: 'pointer' }}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      });
    },
    [router]
  );

  const bioContent = useMemo(
    () => renderBioWithMentions(post.bio?.trim()),
    [post.bio, renderBioWithMentions]
  );

  const handleToggleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setLocalExpanded((prev) => !prev);
      onToggleExpand(postIdStr);
    },
    [onToggleExpand, postIdStr]
  );

  // 🔥 HANDLER VIDEO SCRUBBER / SEEKING YANG BARU & SMOOTH 🔥
  const handleVideoSeekStart = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
    setIsSeeking(true);
    setIsBarVisible(true);
    const video = mediaRef.current as HTMLVideoElement | null;
    if (video) {
      wasPlayingRef.current = !video.paused;
      video.pause();
    }
  }, []);

  const handleVideoSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const time = Number(e.target.value);
    setVideoCurrentTime(time);
    const video = mediaRef.current as HTMLVideoElement | null;
    if (video) {
      video.currentTime = time;
    }
  }, []);

  const handleVideoSeekCommit = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
    setIsSeeking(false);
    
    setTimeout(() => {
      if (!isSeeking) setIsBarVisible(false);
    }, 1500);

    const video = mediaRef.current as HTMLVideoElement | null;
    if (video) {
      video.currentTime = videoCurrentTime; 
      if (wasPlayingRef.current) {
        video.play().catch(() => {});
      }
    }
  }, [videoCurrentTime, isSeeking]);


  // Handler klik area video (single/double tap)
  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const lastTap = lastTapVideoRef.current;

    if (now - lastTap < 500) {
      lastTapVideoRef.current = 0;
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      setShowPlayPause(false);
      if (playPauseTimerRef.current) {
        clearTimeout(playPauseTimerRef.current);
        playPauseTimerRef.current = null;
      }
      handleMediaClick(e, postIdStr, creatorIdStr);
    } else {
      lastTapVideoRef.current = now;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        const video = mediaRef.current as HTMLVideoElement | null;
        if (video) {
          if (video.paused) video.play();
          else video.pause();
        }
        setShowPlayPause(true);
        if (playPauseTimerRef.current) clearTimeout(playPauseTimerRef.current);
        playPauseTimerRef.current = setTimeout(() => {
          setShowPlayPause(false);
          playPauseTimerRef.current = null;
        }, 1500);
        tapTimerRef.current = null;
      }, 500);
    }
  }, [handleMediaClick, postIdStr, creatorIdStr]);

  // Throttle scroll carousel
  const ticking = useRef(false);
  const handleCarouselScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        const target = e.target as HTMLDivElement;
        const index = Math.round(target.scrollLeft / target.offsetWidth);
        if (index !== currentSlideRef.current) {
          setCurrentSlide(index);
          currentSlideRef.current = index;
        }
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, []);

  // Style card – FULL WIDTH, NO BORDER RADIUS, GAP BAWAH
  const cardStyle: React.CSSProperties = useMemo(
    () => ({
      overflow: actuallyExpanded ? 'visible' : 'hidden',
      background: '#ffffff',
      borderRadius: '0px',                     // seamless ke pinggir layar
      padding: isVideoPost || photoList.length > 0 ? '0' : '16px 15px', // teks only: padding horizontal 15px
      border: '1px solid var(--border-card)',
      position: 'relative' as const,
      width: '100vw',                          // lebar penuh viewport
      marginLeft: 'calc(50% - 50vw)',          // tumpah ke kiri
      marginRight: 'calc(50% - 50vw)',         // tumpah ke kanan
      marginBottom: '12px',                    // gap antar postingan
      boxSizing: 'border-box' as const,
      boxShadow:
        isVideoPost || photoList.length > 0
          ? 'none'
          : '0 4px 12px rgba(0, 0, 0, 0.03)',
      textAlign: 'left' as const,
      zIndex: actuallyExpanded ? 50 : 1,
    }),
    [actuallyExpanded, isVideoPost, photoList.length]
  );

  // ====================== RENDER ======================
  return (
    <div
      key={postIdStr}
      id={`post-${postIdStr}`}
      data-postid={postIdStr}
      className="card"
      ref={cardRef}
      style={cardStyle}
      onClick={(e) => {
        if (!photoList.length && !isVideoPost)
          handleMediaClick(e, postIdStr, creatorIdStr);
      }}
    >
      {(photoList.length > 0 || isVideoPost) ? (
        <>
          <div className="slider" style={{ position: 'relative' }}>
            <MusicMarquee post={post} isOverlay mediaRef={mediaRef} />

            {poppingHeart?.startsWith(postIdStr) && (
              <span
                key={poppingHeart}
                className="material-icons"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#ff2e63',
                  fontSize: '160px',
                  animation:
                    'popHeartAnim 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                  filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))',
                  zIndex: 9999,
                  pointerEvents: 'none',
                }}
              >
                favorite
              </span>
            )}

            {/* Top right badges */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 2,
                display: 'flex',
                gap: '6px',
              }}
            >
              {isVideoPost && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '12px' }}>
                    videocam
                  </span>{' '}
                  Video
                </div>
              )}
              {photoList.length > 1 && !isVideoPost && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '12px' }}>
                    collections
                  </span>
                  <span>
                    {currentSlide + 1}/{photoList.length}
                  </span>
                </div>
              )}
            </div>

            {/* Tombol mute */}
            {(isVideoPost || post.audio_src) && (
              <button
                className="btn-press"
                onClick={(e) => {
                  toggleMute(e);
                  if (mediaRef.current && isGloballyMuted) {
                    mediaRef.current.muted = false;
                    mediaRef.current.play().catch(() => {});
                  }
                }}
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  zIndex: 2,
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span className="material-icons" style={{ fontSize: '18px' }}>
                  {isGloballyMuted ? 'volume_off' : 'volume_up'}
                </span>
              </button>
            )}

            {/* Floating bubbles */}
            <FloatingBubbles
              likers={isOwner ? mutualLikers : []}
              reposters={!isOwner ? mutualReposters : []}
            />

            {/* Carousel media */}
            <div
              className="photo-carousel"
              onScroll={handleCarouselScroll}
            >
              {isVideoPost ? (
                <div
                  className="carousel-item"
                  style={{
                    aspectRatio: '2 / 3',
                    width: '100%',
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#000',
                    cursor: 'default',
                    transform: 'translateZ(0)',
                  }}
                >
                  {/* Area klik video */}
                  <div
                    style={{ position: 'absolute', inset: 0, zIndex: 1, cursor: 'pointer' }}
                    onClick={handleVideoClick}
                  />

                  {!videoLoaded && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3,
                      }}
                    >
                      <div className="loading-spinner" />
                    </div>
                  )}

                  <video
                    ref={mediaRef as React.RefObject<HTMLVideoElement>}
                    src={post.video_url}
                    className="post-video-element"
                    poster={getOptimizedImage(post.image_url)}
                    playsInline
                    autoPlay
                    loop
                    muted={isGloballyMuted}
                    preload="metadata"
                    onLoadedData={() => setVideoLoaded(true)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'top center',
                      pointerEvents: 'none',
                      opacity: videoLoaded ? 1 : 0,
                      transition: 'opacity 0.3s',
                    }}
                  />

                  {/* Indikator play/pause */}
                  {videoLoaded && showPlayPause && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 5,
                        pointerEvents: 'none',
                      }}
                    >
                      <span
                        className="material-icons"
                        style={{
                          fontSize: '48px',
                          color: 'white',
                          textShadow: '0 0 10px rgba(0,0,0,0.5)',
                        }}
                      >
                        {isVideoPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </div>
                  )}

                  {/* Progress Bar yang Interaktif dan Halus */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '24px',
                      zIndex: 4,
                      display: 'flex',
                      alignItems: 'flex-end'
                    }}
                    onPointerEnter={() => setIsBarVisible(true)}
                    onPointerLeave={() => { if (!isSeeking) setIsBarVisible(false); }}
                  >
                    {/* Visual Bar */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      height: isBarVisible || isSeeking ? '6px' : '2px',
                      background: 'rgba(255,255,255,0.3)',
                      transition: 'height 0.2s',
                      pointerEvents: 'none'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(videoCurrentTime / (videoDuration || 1)) * 100}%`,
                        background: '#1f3cff',
                        transition: isSeeking ? 'none' : 'width 0.1s linear'
                      }} />
                    </div>

                    {/* Input range transparan */}
                    {videoLoaded && (
                      <input
                        type="range"
                        min={0}
                        max={videoDuration || 1}
                        step="0.001"
                        value={videoCurrentTime}
                        onMouseDown={handleVideoSeekStart}
                        onTouchStart={handleVideoSeekStart}
                        onChange={handleVideoSeekChange}
                        onMouseUp={handleVideoSeekCommit}
                        onTouchEnd={handleVideoSeekCommit}
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          width: '100%',
                          height: '24px',
                          margin: 0,
                          opacity: 0,
                          cursor: 'pointer',
                          zIndex: 5
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : (
                photoList.map((url: string, i: number) => {
                  const [imgLoaded, setImgLoaded] = useState(false);
                  return (
                    <div
                      key={i}
                      className="carousel-item"
                      style={{
                        aspectRatio: '3 / 4',
                        width: '100%',
                        overflow: 'hidden',
                        position: 'relative',
                        background: '#1a1a1a',
                        transform: 'translateZ(0)',
                      }}
                    >
                      {!imgLoaded && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3,
                          }}
                        >
                          <div className="loading-spinner" />
                        </div>
                      )}
                      <img
                        src={optimizedPhotoUrls[i]}
                        decoding="async"
                        alt={`Postingan Galeri ${i + 1}`}
                        onLoad={() => setImgLoaded(true)}
                        onClick={(e) =>
                          handleMediaClick(
                            e,
                            postIdStr,
                            creatorIdStr,
                            optimizedPhotoUrls[i]
                          )
                        }
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'top center',
                          cursor: 'pointer',
                          opacity: imgLoaded ? 1 : 0,
                          transition: 'opacity 0.3s',
                        }}
                      />
                    </div>
                  );
                })
              )}
            </div>

            {/* Dots navigasi */}
            {photoList.length > 1 && !isVideoPost && (
              <div
                className={`carousel-dots dots-${postIdStr}`}
                style={{ zIndex: 2 }}
              >
                {photoList.map((_: any, i: number) => (
                  <div
                    key={i}
                    className={`dot ${i === currentSlide ? 'active' : ''}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Overlay informasi – dengan padding horizontal agar teks tidak menempel */}
          <div className="overlay" style={{ pointerEvents: 'auto', padding: '0 15px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <h2
                  className="name"
                  onClick={() => router.push(`/data?id=${creatorIdStr}`)}
                  style={{
                    margin: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {post.profiles?.full_name || post.profiles?.username || 'User'}
                  <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                </h2>
                <FollowButton
                  creatorId={creatorIdStr}
                  currentUser={currentUser}
                  followedUsers={followedUsers}
                  mutualUsers={mutualUsers}
                  animatingFollows={animatingFollows}
                  handleFollowToggle={handleFollowToggle}
                  t={t}
                />
              </div>
              <button
                className="options-btn btn-press"
                aria-label="Opsi Postingan"
                onClick={(e) => {
                  e.stopPropagation();
                  openShareOptions(post, isOwner);
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
            </div>

            {/* Bio dengan expand/collapse */}
            <div
              style={{
                maxHeight: actuallyExpanded ? 'none' : 'auto',
                overflowY: 'visible',
                background: actuallyExpanded
                  ? 'rgba(0,0,0,0.65)'
                  : 'transparent',
                backdropFilter: actuallyExpanded ? 'blur(10px)' : 'none',
                padding: actuallyExpanded ? '12px' : '0',
                borderRadius: '12px',
                marginTop: '8px',
                transition: 'all 0.3s ease-in-out',
                pointerEvents: 'auto',
                zIndex: 100,
                textAlign: 'left',
                position: 'relative'
              }}
              onWheel={(e) => actuallyExpanded && e.stopPropagation()}
              onTouchMove={(e) => actuallyExpanded && e.stopPropagation()}
            >
              <p
                ref={captionRef as React.RefObject<HTMLParagraphElement>}
                style={{
                  fontSize: '14.5px',
                  color: 'var(--text-main)',
                  lineHeight: 1.5,
                  margin: '4px 0 0 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  display: actuallyExpanded ? 'block' : '-webkit-box',
                  WebkitLineClamp: actuallyExpanded ? 'unset' : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: actuallyExpanded ? 'visible' : 'hidden',
                  transition: 'all 0.3s ease',
                }}
              >
                {bioContent}
              </p>

              {showMoreButton && !actuallyExpanded && (
                <button
                  className="see-more-btn"
                  onClick={handleToggleClick}
                  style={{
                    display: 'block',
                    textAlign: 'left',
                    margin: '4px 0 0 0',
                    color: '#1f3cff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    position: 'relative',
                    zIndex: 101
                  }}
                >
                  Lihat Selengkapnya
                </button>
              )}
              {actuallyExpanded && (
                <button
                  className="see-more-btn"
                  onClick={handleToggleClick}
                  style={{
                    display: 'block',
                    textAlign: 'left',
                    margin: '4px 0 0 0',
                    color: '#ff2e63',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    position: 'relative',
                    zIndex: 101
                  }}
                >
                  Lebih Sedikit
                </button>
              )}
            </div>

            <div
              className="post-date-wrapper"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                pointerEvents: 'auto',
                marginTop: '8px',
              }}
            >
              <span>{formattedDate}</span>
              {post.is_ad && (
                <span
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <span
                    className="material-icons"
                    style={{ fontSize: '12px', color: '#fff' }}
                  >
                    campaign
                  </span>{' '}
                  Iklan
                </span>
              )}
            </div>

            <div
              className="actions"
              style={{ pointerEvents: 'auto' }}
            >
              <button
                onClick={() => router.push(`/post?id=${postIdStr}`)}
                className="primary btn-press"
                style={{
                  display: 'inline-block',
                  border: 'none',
                  background: '#1f3cff',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('view_detail')}
              </button>
              <EngagementButtons
                postId={postIdStr}
                creatorId={creatorIdStr}
                counts={counts}
                mySavedPosts={mySavedPosts}
                myRepostedPosts={myRepostedPosts}
                myLikedPosts={myLikedPosts}
                animatingReposts={animatingReposts}
                handleSave={handleSave}
                openRepostModal={openRepostModal}
                handleLike={handleLike}
              />
            </div>
          </div>
        </>
      ) : (
        // ==================== TAMPILAN POSTINGAN TEKS / AUDIO ====================
        // Padding horizontal 15px sudah diterapkan di cardStyle, semua konten otomatis menjorok
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <div
              style={{ display: 'flex', gap: '12px', cursor: 'pointer' }}
              onClick={() => router.push(`/data?id=${creatorIdStr}`)}
            >
              <img
                src={optimizedAvatar}
                alt="Avatar Profil"
                decoding="async"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: 'var(--text-main)',
                  }}
                >
                  {post.profiles?.full_name || post.profiles?.username || 'User'}
                  <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                  <FollowButton
                    creatorId={creatorIdStr}
                    currentUser={currentUser}
                    followedUsers={followedUsers}
                    mutualUsers={mutualUsers}
                    animatingFollows={animatingFollows}
                    handleFollowToggle={handleFollowToggle}
                    t={t}
                  />
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {formattedDate}
                  {post.is_ad && (
                    <>
                      <span>•</span>
                      <span
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-card)',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          color: 'var(--text-main)',
                        }}
                      >
                        <span
                          className="material-icons"
                          style={{ fontSize: '12px', color: '#1f3cff' }}
                        >
                          campaign
                        </span>{' '}
                        Iklan
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>
            <button
              className="btn-press"
              aria-label="Opsi Postingan"
              onClick={(e) => {
                e.stopPropagation();
                openShareOptions(post, isOwner);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>

          {poppingHeart?.startsWith(postIdStr) && (
            <span
              key={poppingHeart}
              className="material-icons"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#ff2e63',
                fontSize: '160px',
                animation:
                  'popHeartAnim 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))',
                zIndex: 9999,
                pointerEvents: 'none',
              }}
            >
              favorite
            </span>
          )}

          {/* Bio untuk postingan teks - tampilan penuh */}
          <div
            style={{
              marginBottom: '12px',
              fontSize: '14.5px',
              color: 'var(--text-main)',
              lineHeight: 1.5,
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              textAlign: 'left',
            }}
          >
            {bioContent}
          </div>

          {/* Audio player */}
          {post.audio_src && (
            <>
              <audio
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={post.audio_src}
                className="post-audio-element"
                loop
                playsInline
                autoPlay
                muted={isGloballyMuted}
                style={{
                  width: '1px',
                  height: '1px',
                  position: 'absolute',
                  opacity: 0,
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  height: '40px',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <MusicMarquee
                  post={post}
                  isOverlay={false}
                  mediaRef={mediaRef}
                />
                <button
                  className="btn-press"
                  onClick={(e) => {
                    toggleMute(e);
                    if (mediaRef.current && isGloballyMuted) {
                      mediaRef.current.muted = false;
                      mediaRef.current.play().catch(() => {});
                    }
                  }}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2,
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '18px' }}>
                    {isGloballyMuted ? 'volume_off' : 'volume_up'}
                  </span>
                </button>
              </div>
            </>
          )}

          <div
            className="actions"
            style={{
              borderTop: '1px solid var(--border-card)',
              marginTop: '4px',
              paddingTop: '12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => router.push(`/post?id=${postIdStr}`)}
              className="btn-press"
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                fontWeight: 600,
                display: 'inline-block',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {t('view_detail')}
            </button>
            <EngagementButtons
              postId={postIdStr}
              creatorId={creatorIdStr}
              counts={counts}
              mySavedPosts={mySavedPosts}
              myRepostedPosts={myRepostedPosts}
              myLikedPosts={myLikedPosts}
              animatingReposts={animatingReposts}
              handleSave={handleSave}
              openRepostModal={openRepostModal}
              handleLike={handleLike}
            />
          </div>
        </>
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