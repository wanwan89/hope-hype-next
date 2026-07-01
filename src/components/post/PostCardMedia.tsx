import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import MusicMarquee from './MusicMarquee';
import FloatingBubbles from './FloatingBubbles';
import FollowButton from './FollowButton';
import EngagementButtons from './EngagementButtons';
import { getOptimizedImage } from '@/lib/helpers';
import { supabase } from '@/lib/supabase';

// Sub-komponen CarouselImageItem (sama persis)
const CarouselImageItem = ({
  url,
  index,
  onClick,
}: {
  url: string;
  index: number;
  onClick: (e: React.MouseEvent) => void;
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <div
      className="carousel-item"
      style={{
        aspectRatio: '3 / 4',
        width: '100%',
        flexShrink: 0,
        scrollSnapAlign: 'start',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--bg-secondary)',
        transform: 'translateZ(0)',
      }}
    >
      {!imgLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
          <div className="loading-spinner" />
        </div>
      )}
      <img
        src={url}
        decoding="async"
        alt={`Galeri ${index + 1}`}
        onLoad={() => setImgLoaded(true)}
        onClick={onClick}
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
};

type Props = {
  post: any;
  currentUser: any;
  counts: Record<string, { likes: number; tanggapan: number; reposts: number; saves: number }>;
  myLikedPosts: Set<string>;
  myRepostedPosts: Set<string>;
  mySavedPosts: Set<string>;
  followedUsers: Set<string>;
  mutualUsers: Set<string>;
  animatingFollows: Set<string>;
  animatingReposts: Set<string>;
  isGloballyMuted: boolean;
  poppingHeart: string | null;
  likersMap: Record<string, any[]>;
  repostersMap: Record<string, any[]>;
  handleLike: (postId: string, creatorId: string) => void;
  handleSave: (postId: string) => void;
  openRepostModal: (postId: string, creatorId: string) => void;
  handleMediaClick: (e: React.MouseEvent, postId: string, creatorId: string, imageUrl?: string) => void;
  toggleMute: (e: React.MouseEvent) => void;
  openShareOptions: (post: any, isOwner: boolean) => void;
  handleFollowToggle: (e: any, creatorId: string) => void;
  router: ReturnType<typeof import('next/navigation').useRouter>;
  t: any;
  isExpanded: boolean;
  onToggleExpand: (postId: string) => void;
};

export default function PostCardMedia(props: Props) {
  const {
    post, currentUser, counts, myLikedPosts, myRepostedPosts, mySavedPosts,
    followedUsers, mutualUsers, animatingFollows, animatingReposts,
    isGloballyMuted, poppingHeart, likersMap, repostersMap,
    handleLike, handleSave, openRepostModal, handleMediaClick,
    toggleMute, openShareOptions, handleFollowToggle,
    router, t, isExpanded, onToggleExpand
  } = props;

  const postIdStr = String(post.id);
  const creatorIdStr = String(post.creator_id);
  const isOwner = currentUser && currentUser.id === post.creator_id;
  const photoList = useMemo(() => (post.image_url ? post.image_url.split(',') : []), [post.image_url]);
  const isVideoPost = !!post.video_url;
  const badge = useMemo(() => import('@/lib/ui-utils').then(m => m.getUserBadge(post.profiles?.role)), [post.profiles?.role]);

  const [badgeHtml, setBadgeHtml] = useState('');
  useEffect(() => {
    import('@/lib/ui-utils').then(m => setBadgeHtml(m.getUserBadge(post.profiles?.role)));
  }, [post.profiles?.role]);

  const formattedDate = useMemo(() => import('@/lib/helpers').then(m => m.formatRelativeTime(post.created_at)), [post.created_at]);
  const [dateStr, setDateStr] = useState('');
  useEffect(() => {
    import('@/lib/helpers').then(m => setDateStr(m.formatRelativeTime(post.created_at)));
  }, [post.created_at]);

  const optimizedPhotoUrls = useMemo(() => photoList.map((url: string) => getOptimizedImage(url)), [photoList]);

  // Refs
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasViewedRef = useRef(false);

  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const currentSlideRef = useRef(0);
  const [localExpanded, setLocalExpanded] = useState(false);
  const actuallyExpanded = isExpanded || localExpanded;

  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showPlayPause, setShowPlayPause] = useState(false);
  const [isBarVisible, setIsBarVisible] = useState(false);
  const playPauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapVideoRef = useRef<number>(0);
  const wasPlayingRef = useRef(false);
  const [showMoreButton, setShowMoreButton] = useState(false);

  // Observer
  useEffect(() => {
    const media = mediaRef.current;
    const card = cardRef.current;
    if (!card) return;
    if (media) media.muted = isGloballyMuted;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (media) {
              media.muted = isGloballyMuted;
              media.play().catch(() => { media.muted = true; media.play().catch(() => {}); });
            }
            document.querySelectorAll('.post-video-element').forEach((el) => {
              const mediaEl = el as HTMLMediaElement;
              if (mediaEl !== media && !mediaEl.paused) mediaEl.pause();
            });
            if (!hasViewedRef.current && postIdStr) {
              hasViewedRef.current = true;
              supabase.rpc('increment_post_view', { p_id: postIdStr }).catch(() => {});
            }
          } else {
            if (media) media.pause();
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [isGloballyMuted, postIdStr]);

  useEffect(() => {
    const video = mediaRef.current;
    if (!video || !isVideoPost) return;
    const onTimeUpdate = () => { if (!isSeeking) setVideoCurrentTime(video.currentTime); };
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

  // Bio overflow
  useEffect(() => {
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
  }, [post.bio, actuallyExpanded]);

  useEffect(() => {
    return () => {
      if (playPauseTimerRef.current) clearTimeout(playPauseTimerRef.current);
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  const handleToggleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setLocalExpanded((prev) => !prev);
    onToggleExpand(postIdStr);
  }, [onToggleExpand, postIdStr]);

  // Seek handlers
  const handleVideoSeekStart = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation(); setIsSeeking(true); setIsBarVisible(true);
    const video = mediaRef.current;
    if (video) { wasPlayingRef.current = !video.paused; video.pause(); }
  }, []);
  const handleVideoSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation(); const time = Number(e.target.value);
    setVideoCurrentTime(time);
    if (mediaRef.current) mediaRef.current.currentTime = time;
  }, []);
  const handleVideoSeekCommit = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation(); setIsSeeking(false);
    setTimeout(() => { if (!isSeeking) setIsBarVisible(false); }, 1500);
    const video = mediaRef.current;
    if (video) { video.currentTime = videoCurrentTime; if (wasPlayingRef.current) video.play().catch(() => {}); }
  }, [videoCurrentTime, isSeeking]);

  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now(); const lastTap = lastTapVideoRef.current;
    if (now - lastTap < 500) {
      lastTapVideoRef.current = 0;
      if (tapTimerRef.current) { clearTimeout(tapTimerRef.current); tapTimerRef.current = null; }
      setShowPlayPause(false);
      if (playPauseTimerRef.current) { clearTimeout(playPauseTimerRef.current); playPauseTimerRef.current = null; }
      handleMediaClick(e, postIdStr, creatorIdStr);
    } else {
      lastTapVideoRef.current = now;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        const video = mediaRef.current;
        if (video) { video.paused ? video.play() : video.pause(); }
        setShowPlayPause(true);
        if (playPauseTimerRef.current) clearTimeout(playPauseTimerRef.current);
        playPauseTimerRef.current = setTimeout(() => { setShowPlayPause(false); playPauseTimerRef.current = null; }, 1500);
        tapTimerRef.current = null;
      }, 500);
    }
  }, [handleMediaClick, postIdStr, creatorIdStr]);

  const handleCarouselScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (ticking.current) return;
    ticking.current = true;
    window.requestAnimationFrame(() => {
      const target = e.target as HTMLDivElement;
      const index = Math.round(target.scrollLeft / target.offsetWidth);
      if (index !== currentSlideRef.current) { setCurrentSlide(index); currentSlideRef.current = index; }
      ticking.current = false;
    });
  }, []);
  const ticking = useRef(false);

  const cardStyle: React.CSSProperties = useMemo(() => ({
    overflow: actuallyExpanded ? 'visible' : 'hidden',
    background: 'var(--bg-main)',
    borderRadius: '0px', padding: '0',
    borderLeft: 'none', borderRight: 'none',
    borderTop: '1px solid var(--border-card)',
    borderBottom: '1px solid var(--border-card)',
    position: 'relative' as const, width: '100%', marginBottom: '12px',
    boxSizing: 'border-box' as const, boxShadow: 'none', textAlign: 'left' as const,
    zIndex: actuallyExpanded ? 50 : 1,
  }), [actuallyExpanded]);

  return (
    <div key={postIdStr} id={`post-${postIdStr}`} data-postid={postIdStr} className="card" ref={cardRef} style={cardStyle}>
      <div className="slider" style={{ position: 'relative' }}>
        <MusicMarquee post={post} isOverlay mediaRef={mediaRef} />
        {poppingHeart?.startsWith(postIdStr) && (
          <span key={poppingHeart} className="material-icons" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ff2e63', fontSize: '160px', animation: 'popHeartAnim 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))', zIndex: 9999, pointerEvents: 'none' }}>favorite</span>
        )}
        {/* badges & mute button */}
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 2, display: 'flex', gap: '6px' }}>
          {isVideoPost && <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white', padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}><span className="material-icons" style={{ fontSize: '12px' }}>videocam</span> Video</div>}
          {photoList.length > 1 && !isVideoPost && <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white', padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}><span className="material-icons" style={{ fontSize: '12px' }}>collections</span> {currentSlide + 1}/{photoList.length}</div>}
        </div>
        {(isVideoPost || post.audio_src) && (
          <button className="btn-press" onClick={(e) => { e.stopPropagation(); toggleMute(e); if (mediaRef.current && isGloballyMuted) { mediaRef.current.muted = false; mediaRef.current.play().catch(() => {}); } }} style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 2, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-icons" style={{ fontSize: '18px' }}>{isGloballyMuted ? 'volume_off' : 'volume_up'}</span>
          </button>
        )}
        <FloatingBubbles likers={[]} reposters={[]} /> {/* disederhanakan, Anda bisa tambahkan logic mutual */}
        <div className="photo-carousel" onScroll={handleCarouselScroll} style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', width: '100%' }}>
          {isVideoPost ? (
            <div className="carousel-item" style={{ aspectRatio: '2 / 3', width: '100%', flexShrink: 0, scrollSnapAlign: 'start', overflow: 'hidden', position: 'relative', background: '#000' }}>
              <div style={{ position: 'absolute', inset: 0, zIndex: 1, cursor: 'pointer' }} onClick={handleVideoClick} />
              {!videoLoaded && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}><div className="loading-spinner" /></div>}
              <video ref={mediaRef as React.RefObject<HTMLVideoElement>} src={post.video_url} className="post-video-element" poster={getOptimizedImage(post.image_url)} playsInline autoPlay loop muted={isGloballyMuted} preload="metadata" onLoadedData={() => setVideoLoaded(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', pointerEvents: 'none', opacity: videoLoaded ? 1 : 0, transition: 'opacity 0.3s', backgroundColor: '#000' }} />
              {videoLoaded && showPlayPause && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 5, pointerEvents: 'none' }}><span className="material-icons" style={{ fontSize: '48px', color: 'white', textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>{isVideoPlaying ? 'pause' : 'play_arrow'}</span></div>}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '24px', zIndex: 4, display: 'flex', alignItems: 'flex-end' }} onPointerEnter={() => setIsBarVisible(true)} onPointerLeave={() => { if (!isSeeking) setIsBarVisible(false); }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: isBarVisible || isSeeking ? '6px' : '2px', background: 'rgba(255,255,255,0.3)', transition: 'height 0.2s', pointerEvents: 'none' }}><div style={{ height: '100%', width: `${(videoCurrentTime / (videoDuration || 1)) * 100}%`, background: '#1f3cff', transition: isSeeking ? 'none' : 'width 0.1s linear' }} /></div>
                {videoLoaded && <input type="range" min={0} max={videoDuration || 1} step="0.001" value={videoCurrentTime} onMouseDown={handleVideoSeekStart} onTouchStart={handleVideoSeekStart} onChange={handleVideoSeekChange} onMouseUp={handleVideoSeekCommit} onTouchEnd={handleVideoSeekCommit} style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '24px', margin: 0, opacity: 0, cursor: 'pointer', zIndex: 5 }} />}
              </div>
            </div>
          ) : (
            photoList.map((url: string, i: number) => (
              <CarouselImageItem key={i} url={optimizedPhotoUrls[i]} index={i} onClick={(e) => handleMediaClick(e, postIdStr, creatorIdStr, optimizedPhotoUrls[i])} />
            ))
          )}
        </div>
        {photoList.length > 1 && !isVideoPost && <div className={`carousel-dots dots-${postIdStr}`} style={{ zIndex: 2 }}>{photoList.map((_: any, i: number) => <div key={i} className={`dot ${i === currentSlide ? 'active' : ''}`} />)}</div>}
      </div>

      <div className="overlay" style={{ pointerEvents: 'auto', padding: '12px 15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <h2 className="name" onClick={() => router.push(`/data?id=${creatorIdStr}`)} style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}>
              {post.profiles?.full_name || post.profiles?.username || 'User'}
              <span dangerouslySetInnerHTML={{ __html: badgeHtml }}></span>
            </h2>
            <FollowButton creatorId={creatorIdStr} currentUser={currentUser} followedUsers={followedUsers} mutualUsers={mutualUsers} animatingFollows={animatingFollows} handleFollowToggle={handleFollowToggle} t={t} />
          </div>
          <button className="options-btn btn-press" aria-label="Opsi" onClick={(e) => { e.stopPropagation(); openShareOptions(post, isOwner); }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
        </div>

        <div style={{ maxHeight: actuallyExpanded ? 'none' : 'auto', overflowY: 'visible', background: actuallyExpanded ? 'rgba(0,0,0,0.65)' : 'transparent', backdropFilter: actuallyExpanded ? 'blur(10px)' : 'none', padding: actuallyExpanded ? '12px' : '0', borderRadius: '12px', marginTop: '8px', transition: 'all 0.3s ease-in-out', pointerEvents: 'auto', zIndex: 100, textAlign: 'left', position: 'relative' }}>
          <p ref={captionRef} style={{ fontSize: '14.5px', color: 'var(--text-main)', lineHeight: 1.5, margin: '4px 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: actuallyExpanded ? 'block' : '-webkit-box', WebkitLineClamp: actuallyExpanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: actuallyExpanded ? 'visible' : 'hidden' }}>
            {post.bio?.trim()}
          </p>
          {showMoreButton && !actuallyExpanded && <button className="see-more-btn" onClick={handleToggleClick} style={{ display: 'block', textAlign: 'left', margin: '4px 0 0 0', color: '#1f3cff', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: 'none', border: 'none', padding: 0, zIndex: 101 }}>Lihat Selengkapnya</button>}
          {actuallyExpanded && <button className="see-more-btn" onClick={handleToggleClick} style={{ display: 'block', textAlign: 'left', margin: '4px 0 0 0', color: '#ff2e63', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: 'none', border: 'none', padding: 0, zIndex: 101 }}>Lebih Sedikit</button>}
        </div>

        <div className="post-date-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: 'var(--text-muted)' }}>
          <span>{dateStr}</span>
          {post.is_ad && <span style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}><span className="material-icons" style={{ fontSize: '12px', color: '#fff' }}>campaign</span> Iklan</span>}
        </div>

        <div className="actions" style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => router.push(`/post?id=${postIdStr}`)} className="primary btn-press" style={{ display: 'inline-block', border: 'none', background: '#1f3cff', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{t('view_detail')}</button>
          <EngagementButtons postId={postIdStr} creatorId={creatorIdStr} counts={counts} mySavedPosts={mySavedPosts} myRepostedPosts={myRepostedPosts} myLikedPosts={myLikedPosts} animatingReposts={animatingReposts} handleSave={handleSave} openRepostModal={openRepostModal} handleLike={handleLike} />
        </div>
      </div>
    </div>
  );
}