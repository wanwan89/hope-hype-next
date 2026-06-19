'use client';
import React, { useRef, useState, useCallback } from 'react';
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
  isGloballyMuted, poppingHeart, likersMap, repostersMap,
  handleLike, handleSave, openRepostModal, handleMediaClick,
  toggleMute, openShareOptions, handleFollowToggle,
  setActivePreviewImage, router, t,
  isExpanded = false,
  onToggleExpand = () => {},
}) => {
  const badge = getUserBadge(post.profiles?.role);
  const avatarUrl = post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.username}`;
  const optimizedAvatar = avatarUrl.includes('res.cloudinary.com') && !avatarUrl.includes('f_auto')
    ? avatarUrl.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/') : avatarUrl;
  const formattedDate = formatRelativeTime(post.created_at);
  const isOwner = currentUser && currentUser.id === post.creator_id;

  const postIdStr = String(post.id);
  const creatorIdStr = String(post.creator_id);
  const photoList = post.image_url ? post.image_url.split(',') : [];
  const isVideoPost = !!post.video_url;

  const likers = likersMap[postIdStr] || [];
  const reposters = repostersMap[postIdStr] || [];
  const mutualLikers = likers.filter((l: any) => mutualUsers.has(String(l.id)));
  const mutualReposters = reposters.filter((r: any) => mutualUsers.has(String(r.id)));

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Perbaikan Performa: Hitung panjang karakter (jauh lebih cepat dari hitung Tinggi CSS DOM)
  const bioText = post.bio?.trim() || "";
  const showMoreButton = bioText.length > 130 || (bioText.match(/\n/g) || []).length >= 2;

  const renderBioWithMentions = (text: string) => {
    if (!text) return null;
    return text.split(/(@\w+|#\w+)/g).map((part, i) => {
      if (part.startsWith('@')) return <span key={i} onClick={(e) => { e.stopPropagation(); router.push(`/data?id=${part.substring(1)}`); }} style={{ color: '#1f3cff', fontWeight: 700, cursor: 'pointer' }}>{part}</span>;
      if (part.startsWith('#')) return <span key={i} onClick={(e) => { e.stopPropagation(); router.push(`/search?q=${encodeURIComponent(part)}`); }} style={{ color: 'var(--text-muted)', fontWeight: 400, cursor: 'pointer' }}>{part}</span>;
      return <span key={i}>{part}</span>;
    });
  };

  const handleToggleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleExpand(postIdStr);
  }, [onToggleExpand, postIdStr]);

  const cardStyle: React.CSSProperties = {
    ...(!post.image_url && !post.video_url ? { padding: '16px' } : {}),
    overflow: isExpanded ? 'visible' : 'hidden', // tetap butuh ini jika pakai radius
  };

  return (
    <div key={postIdStr} id={`post-${postIdStr}`} data-postid={postIdStr} className="card" style={cardStyle}>
      {(photoList.length > 0 || isVideoPost) ? (
        <>
          <div className="slider" style={{ position: 'relative' }}>
            <MusicMarquee post={post} isOverlay mediaRef={mediaRef} />
            {poppingHeart === postIdStr && <span className="material-icons big-pop-heart">favorite</span>}
            
            <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 2, display: 'flex', gap: '6px' }}>
              {isVideoPost && (
                <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white', padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  <span className="material-icons" style={{ fontSize: '12px' }}>videocam</span> Video
                </div>
              )}
              {photoList.length > 1 && !isVideoPost && (
                <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white', padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  <span className="material-icons" style={{ fontSize: '12px' }}>collections</span><span>{currentSlide + 1}/{photoList.length}</span>
                </div>
              )}
            </div>

            {(isVideoPost || post.audio_src) && (
              <button className="btn-press" onClick={toggleMute} style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 2, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span className="material-icons" style={{ fontSize: '18px' }}>{isGloballyMuted ? 'volume_off' : 'volume_up'}</span>
              </button>
            )}

            <FloatingBubbles likers={isOwner ? mutualLikers : []} reposters={!isOwner ? mutualReposters : []} />

            <div className="photo-carousel" onScroll={(e) => {
              const target = e.target as HTMLDivElement;
              const index = Math.round(target.scrollLeft / target.offsetWidth);
              setCurrentSlide(index);
            }}>
              {isVideoPost ? (
                <div className="carousel-item" onClick={(e) => handleMediaClick(e, postIdStr, creatorIdStr)} style={{ aspectRatio: '2 / 3', width: '100%', overflow: 'hidden', position: 'relative', background: '#000', cursor: 'pointer' }}>
                  {!videoLoaded && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}><div className="loading-spinner" /></div>}
                  <video ref={mediaRef as React.RefObject<HTMLVideoElement>} src={post.video_url} className="post-video-element" poster={getOptimizedImage(post.image_url)} playsInline loop muted={isGloballyMuted} onLoadedData={() => setVideoLoaded(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', pointerEvents: 'none', opacity: videoLoaded ? 1 : 0, transition: 'opacity 0.3s' }} />
                </div>
              ) : (
                photoList.map((url: string, i: number) => {
                  const [imgLoaded, setImgLoaded] = useState(false);
                  return (
                    <div key={i} className="carousel-item" style={{ aspectRatio: '3 / 4', width: '100%', overflow: 'hidden', position: 'relative', background: '#1a1a1a' }}>
                      {!imgLoaded && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}><div className="loading-spinner" /></div>}
                      <img src={getOptimizedImage(url)} decoding="async" alt={`Galeri ${i + 1}`} onLoad={() => setImgLoaded(true)} onClick={(e) => handleMediaClick(e, postIdStr, creatorIdStr, getOptimizedImage(url))} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', cursor: 'pointer', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }} />
                    </div>
                  );
                })
              )}
            </div>

            {photoList.length > 1 && !isVideoPost && (
              <div className={`carousel-dots dots-${postIdStr}`} style={{ zIndex: 2 }}>
                {photoList.map((_: any, i: number) => <div key={i} className={`dot ${i === currentSlide ? 'active' : ''}`} />)}
              </div>
            )}
          </div>

          <div className="overlay" style={{ pointerEvents: 'auto' }}> 
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pointerEvents: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <h2 className="name" onClick={() => router.push(`/data?id=${creatorIdStr}`)} style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  {post.profiles?.full_name || post.profiles?.username || "User"}<span dangerouslySetInnerHTML={{ __html: badge }}></span>
                </h2>
                <FollowButton creatorId={creatorIdStr} currentUser={currentUser} followedUsers={followedUsers} mutualUsers={mutualUsers} animatingFollows={animatingFollows} handleFollowToggle={handleFollowToggle} t={t} />
              </div>
              <button className="options-btn btn-press" aria-label="Opsi Postingan" onClick={(e) => { e.stopPropagation(); openShareOptions(post, isOwner); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
            </div>

            {/* Perbaikan z-index yang menutupi header: hilangkan zIndex tinggi di sini */}
            <div 
              style={{
                background: isExpanded ? 'rgba(0,0,0,0.65)' : 'transparent',
                backdropFilter: isExpanded ? 'blur(10px)' : 'none',
                padding: isExpanded ? '12px' : '0',
                borderRadius: '12px',
                marginTop: '8px',
                transition: 'all 0.3s ease-in-out',
                pointerEvents: 'auto',
                position: 'relative'
              }}
              onWheel={(e) => isExpanded && e.stopPropagation()}
              onTouchMove={(e) => isExpanded && e.stopPropagation()}
            >
              <div className={`post-bio ${isExpanded ? 'expanded' : ''}`} style={{ margin: 0 }}>
                {renderBioWithMentions(bioText)}
              </div>
              
              {showMoreButton && !isExpanded && (
                <button className="see-more-btn" onClick={handleToggleClick}>Lihat Selengkapnya</button>
              )}
              {isExpanded && (
                <button className="see-more-btn" onClick={handleToggleClick} style={{ color: '#ff7b9c' }}>Tutup</button>
              )}
            </div>

            <div className="post-date-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto', marginTop: '8px' }}>
              <span>{formattedDate}</span>
              {post.is_ad && (
                <span style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', color: '#fff' }}>
                  <span className="material-icons" style={{ fontSize: '12px' }}>campaign</span> Iklan
                </span>
              )}
            </div>

            <div className="actions" style={{ pointerEvents: 'auto' }}>
              <button onClick={() => router.push(`/post?id=${postIdStr}`)} className="primary btn-press" style={{ display: 'inline-block', border: 'none', background: '#1f3cff', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{t('view_detail')}</button>
              <EngagementButtons postId={postIdStr} creatorId={creatorIdStr} counts={counts} mySavedPosts={mySavedPosts} myRepostedPosts={myRepostedPosts} myLikedPosts={myLikedPosts} animatingReposts={animatingReposts} handleSave={handleSave} openRepostModal={openRepostModal} handleLike={handleLike} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', cursor: 'pointer' }} onClick={() => router.push(`/data?id=${creatorIdStr}`)}>
              <img src={optimizedAvatar} alt="Avatar Profil" decoding="async" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
                  {post.profiles?.full_name || post.profiles?.username || "User"}
                  <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                  <FollowButton creatorId={creatorIdStr} currentUser={currentUser} followedUsers={followedUsers} mutualUsers={mutualUsers} animatingFollows={animatingFollows} handleFollowToggle={handleFollowToggle} t={t} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {formattedDate}
                  {post.is_ad && (
                    <><span>•</span><span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#1f3cff', fontWeight: 700 }}><span className="material-icons" style={{ fontSize: '12px' }}>campaign</span> Iklan</span></>
                  )}
                </span>
              </div>
            </div>
            <button className="btn-press" aria-label="Opsi Postingan" onClick={(e) => { e.stopPropagation(); openShareOptions(post, isOwner); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
          </div>

          {poppingHeart === postIdStr && <div style={{ position: 'relative', height: '0' }}><span className="material-icons big-pop-heart">favorite</span></div>}

          <div className={`post-bio ${isExpanded ? 'expanded' : ''}`} style={{ marginBottom: '12px', fontSize: '15px', color: 'var(--text-main)' }}>
            {renderBioWithMentions(bioText)}
          </div>

          {showMoreButton && !isExpanded && (
            <button className="see-more-btn" onClick={handleToggleClick} style={{ marginBottom: '12px' }}>Lihat Selengkapnya</button>
          )}
          {isExpanded && (
            <button className="see-more-btn" onClick={handleToggleClick} style={{ marginBottom: '12px', color: '#ff2e63' }}>Lebih Sedikit</button>
          )}

          {post.audio_src && (
            <div style={{ position: 'relative', height: '40px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MusicMarquee post={post} isOverlay={false} mediaRef={mediaRef} />
              <button className="btn-press" onClick={toggleMute} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', color: 'var(--text-main)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                <span className="material-icons" style={{ fontSize: '18px' }}>{isGloballyMuted ? 'volume_off' : 'volume_up'}</span>
              </button>
            </div>
          )}

          <div className="actions" style={{ borderTop: '1px solid var(--border-card)', marginTop: '4px', paddingTop: '12px' }}>
            <button onClick={() => router.push(`/post?id=${postIdStr}`)} className="btn-press" style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'transparent', border: 'none', fontWeight: 600, display: 'inline-block', cursor: 'pointer', padding: 0 }}>{t('view_detail')}</button>
            <EngagementButtons postId={postIdStr} creatorId={creatorIdStr} counts={counts} mySavedPosts={mySavedPosts} myRepostedPosts={myRepostedPosts} myLikedPosts={myLikedPosts} animatingReposts={animatingReposts} handleSave={handleSave} openRepostModal={openRepostModal} handleLike={handleLike} />
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(PostCard, (prev, next) => {
  const pid = prev.post.id;
  if (prev.post !== next.post) return false;
  if (prev.isGloballyMuted !== next.isGloballyMuted) return false;

  const isPoppingPrev = prev.poppingHeart === pid;
  const isPoppingNext = next.poppingHeart === pid;
  if (isPoppingPrev !== isPoppingNext) return false;

  if (prev.counts[pid]?.likes !== next.counts[pid]?.likes) return false;
  if (prev.counts[pid]?.comments !== next.counts[pid]?.comments) return false;
  if (prev.counts[pid]?.reposts !== next.counts[pid]?.reposts) return false;
  if (prev.counts[pid]?.saves !== next.counts[pid]?.saves) return false;

  if (prev.myLikedPosts.has(pid) !== next.myLikedPosts.has(pid)) return false;
  if (prev.myRepostedPosts.has(pid) !== next.myRepostedPosts.has(pid)) return false;
  if (prev.mySavedPosts.has(pid) !== next.mySavedPosts.has(pid)) return false;
  if (prev.animatingReposts.has(pid) !== next.animatingReposts.has(pid)) return false;

  if (prev.isExpanded !== next.isExpanded) return false;

  return true;
});
