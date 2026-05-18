'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import FollowButton from './FollowButton';
import EngagementButtons from './EngagementButtons';
import MusicMarquee from './MusicMarquee';
import FloatingBubbles from './FloatingBubbles'; // 🔥 IMPORT KOMPONEN BUBBLES
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
};

const PostCard: React.FC<PostCardProps> = ({
  post, currentUser, counts, myLikedPosts, myRepostedPosts, mySavedPosts,
  followedUsers, mutualUsers, animatingFollows, animatingReposts,
  isGloballyMuted, poppingHeart, activePreviewImage, likersMap, repostersMap,
  handleLike, handleSave, openRepostModal, handleMediaClick,
  toggleMute, openShareOptions, handleFollowToggle,
  setActivePreviewImage, router, t
}) => {
  const badge = getUserBadge(post.profiles?.role);
  const avatarUrl = post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.username}`;
  const optimizedAvatar = avatarUrl.includes('res.cloudinary.com') && !avatarUrl.includes('f_auto')
    ? avatarUrl.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/')
    : avatarUrl;
  const formattedDate = formatRelativeTime(post.created_at);
  const isOwner = currentUser && currentUser.id === post.creator_id;
  const postIdStr = String(post.id);
  const photoList = post.image_url ? post.image_url.split(',') : [];
  const isVideoPost = !!post.video_url;
  
  // Ambil likers dan reposters mentah
  const likers = likersMap[postIdStr] || [];
  const reposters = repostersMap[postIdStr] || [];

  // Filter yang mutual doang buat ditampilin di bubble
  const mutualLikers = likers.filter((l: any) => mutualUsers.has(l.id));
  const mutualReposters = reposters.filter((r: any) => mutualUsers.has(r.id));

  const renderBioWithMentions = (text: string) => {
    if (!text) return null;
    return text.split(/(@\w+|#\w+)/g).map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} onClick={(e) => { e.stopPropagation(); router.push(`/data?id=${part.substring(1)}`); }} style={{ color: '#1f3cff', fontWeight: 700, cursor: 'pointer' }}>{part}</span>
        );
      } else if (part.startsWith('#')) {
        return (
          <span key={i} onClick={(e) => { e.stopPropagation(); router.push(`/search?q=${encodeURIComponent(part)}`); }} style={{ color: 'var(--text-muted)', fontWeight: 400, cursor: 'pointer' }}>{part}</span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div key={post.id} id={`post-${post.id}`} data-postid={post.id} className="card"
      style={(!post.image_url && !post.video_url) ? { padding: '16px' } : {}}>
      {(photoList.length > 0 || isVideoPost) ? (
        <>
          <div className="slider" style={{ position: 'relative' }}>
            <MusicMarquee post={post} isOverlay />

            {poppingHeart === postIdStr && (
              <span className="material-icons big-pop-heart">favorite</span>
            )}

            <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 2, display: 'flex', gap: '6px' }}>
              {isVideoPost && (
                <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white', padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  <span className="material-icons" style={{ fontSize: '12px' }}>videocam</span> Video
                </div>
              )}
              {photoList.length > 1 && !isVideoPost && (
                <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white', padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  <span className="material-icons" style={{ fontSize: '12px' }}>collections</span>
                  <span id={`slide-counter-${post.id}`}>1/{photoList.length}</span>
                </div>
              )}
            </div>

            {(isVideoPost || post.audio_src) && (
              <button className="btn-press" onClick={toggleMute}
                style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 2, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                <span className="material-icons" style={{ fontSize: '18px' }}>{isGloballyMuted ? 'volume_off' : 'volume_up'}</span>
              </button>
            )}

            {/* 🔥 KOMPONEN FLOATING BUBBLES BERSIH TANPA KODE GANDA 🔥 */}
            <FloatingBubbles 
              likers={isOwner ? mutualLikers : []} 
              reposters={!isOwner ? mutualReposters : []} 
            />

            <div className="photo-carousel" onScroll={(e) => {
              const target = e.target as HTMLDivElement;
              const index = Math.round(target.scrollLeft / target.offsetWidth);
              document.querySelectorAll(`.dots-${post.id} .dot`).forEach((d, i) => {
                d.classList.toggle('active', i === index);
              });
              const counterEl = document.getElementById(`slide-counter-${post.id}`);
              if (counterEl) counterEl.innerText = `${index + 1}/${photoList.length}`;
            }}>
              {isVideoPost ? (
                <div className="carousel-item" onClick={(e) => handleMediaClick(e, postIdStr, post.creator_id)}
                  style={{ aspectRatio: '2 / 3', width: '100%', overflow: 'hidden', position: 'relative', background: 'var(--bg-secondary)', cursor: 'pointer' }}>
                  <video src={post.video_url} className="post-video-element" poster={getOptimizedImage(post.image_url)}
                    playsInline loop muted style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', pointerEvents: 'none' }} />
                </div>
              ) : (
                photoList.map((url: string, i: number) => (
                  <div key={i} className="carousel-item" style={{ aspectRatio: '3 / 4', width: '100%', overflow: 'hidden', position: 'relative', background: 'var(--bg-secondary)' }}>
                    <img src={getOptimizedImage(url)} loading={i === 0 ? "eager" : "lazy"} alt={`Postingan Galeri ${i + 1}`}
                      onClick={(e) => handleMediaClick(e, postIdStr, post.creator_id, getOptimizedImage(url))}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', cursor: 'pointer' }} />
                  </div>
                ))
              )}
            </div>

            {photoList.length > 1 && !isVideoPost && (
              <div className={`carousel-dots dots-${post.id}`} style={{ zIndex: 2 }}>
                {photoList.map((_: any, i: number) => (
                  <div key={i} className={`dot ${i === 0 ? 'active' : ''}`} />
                ))}
              </div>
            )}
          </div>

          <div className="overlay">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <h2 className="name" onClick={() => router.push(`/data?id=${post.creator_id}`)}
                  style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  {post.profiles?.full_name || post.profiles?.username || "User"}
                  <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                </h2>
                <FollowButton creatorId={post.creator_id} currentUser={currentUser} followedUsers={followedUsers}
                  mutualUsers={mutualUsers} animatingFollows={animatingFollows} handleFollowToggle={handleFollowToggle} t={t} />
              </div>
              <button className="options-btn btn-press" aria-label="Opsi Postingan"
                onClick={(e) => { e.stopPropagation(); openShareOptions(post, isOwner); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
            </div>

            <p className="post-bio" style={{ minHeight: '24px', wordBreak: 'break-word', display: 'block' }}>
              {renderBioWithMentions(post.bio?.trim())}
            </p>

            <div className="post-date-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{formattedDate}</span>
              {post.is_ad && (
                <span style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', color: '#fff' }}>
                  <span className="material-icons" style={{ fontSize: '12px' }}>campaign</span> Iklan
                </span>
              )}
            </div>

            <div className="actions">
              <button 
                onClick={() => router.push(`/data?id=${post.creator_id}`)} 
                className="primary btn-press" 
                style={{ display: 'inline-block', border: 'none', background: '#1f3cff', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {t('view_detail')}
              </button>
              <EngagementButtons postId={postIdStr} creatorId={post.creator_id} counts={counts}
                mySavedPosts={mySavedPosts} myRepostedPosts={myRepostedPosts} myLikedPosts={myLikedPosts}
                animatingReposts={animatingReposts}
                handleSave={handleSave} openRepostModal={openRepostModal} handleLike={handleLike} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', cursor: 'pointer' }} onClick={() => router.push(`/data?id=${post.creator_id}`)}>
              <img src={optimizedAvatar} alt="Avatar Profil" loading="lazy" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
                  {post.profiles?.full_name || post.profiles?.username || "User"}
                  <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                  <FollowButton creatorId={post.creator_id} currentUser={currentUser} followedUsers={followedUsers}
                    mutualUsers={mutualUsers} animatingFollows={animatingFollows} handleFollowToggle={handleFollowToggle} t={t} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {formattedDate}
                  {post.is_ad && (
                    <>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#1f3cff', fontWeight: 700 }}>
                        <span className="material-icons" style={{ fontSize: '12px' }}>campaign</span> Iklan
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>
            <button className="btn-press" aria-label="Opsi Postingan" onClick={(e) => { e.stopPropagation(); openShareOptions(post, isOwner); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
          </div>

          <div style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: '12px', wordBreak: 'break-word' }}>
            {renderBioWithMentions(post.bio?.trim())}
          </div>

          {post.audio_src && (
            <div style={{ position: 'relative', height: '40px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MusicMarquee post={post} isOverlay={false} />
              <button className="btn-press" onClick={toggleMute}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', color: 'var(--text-main)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                <span className="material-icons" style={{ fontSize: '18px' }}>{isGloballyMuted ? 'volume_off' : 'volume_up'}</span>
              </button>
            </div>
          )}

          <div className="actions" style={{ borderTop: '1px solid var(--border-card)', marginTop: '16px', paddingTop: '12px' }}>
            <button 
              onClick={() => router.push(`/data?id=${post.creator_id}`)} 
              className="btn-press" 
              style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'transparent', border: 'none', fontWeight: 600, display: 'inline-block', cursor: 'pointer', padding: 0 }}>
              {t('view_detail')}
            </button>
            <EngagementButtons postId={postIdStr} creatorId={post.creator_id} counts={counts}
              mySavedPosts={mySavedPosts} myRepostedPosts={myRepostedPosts} myLikedPosts={myLikedPosts}
              animatingReposts={animatingReposts}
              handleSave={handleSave} openRepostModal={openRepostModal} handleLike={handleLike} />
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(PostCard);
