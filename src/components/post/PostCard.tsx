'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import { supabase } from '@/lib/supabase';

// Helper bawaan lu
const getOptimizedImage = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('res.cloudinary.com') && !cleanUrl.includes('f_auto')) {
    return cleanUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_800/');
  }
  return cleanUrl;
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Baru saja";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} hari lalu`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} minggu lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function PostCard({
  post,
  currentUser,
  isOwner,
  counts,
  isLiked,
  isReposted,
  isSaved,
  isFollowing,
  isMutual,
  isAnimatingFollow,
  isGloballyMuted,
  animatingReposts,
  mutualLikers,
  combinedMutualInteractors,
  onLike,
  onRepostClick,
  onSave,
  onFollow,
  onShare,
  onMuteToggle,
  onSetFloatingLikes // Untuk pass data ke parent (layer tertinggi)
}: any) {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [poppingHeart, setPoppingHeart] = useState<string | null>(null);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const lastTapRef = useRef<number>(0);

  const postIdStr = String(post.id);
  const badge = getUserBadge(post.profiles?.role);
  const avatarUrl = post.profiles?.avatar_url || "https://ui-avatars.com/api/?name=" + post.profiles?.username;
  
  let optimizedAvatar = avatarUrl;
  if (optimizedAvatar && optimizedAvatar.includes('res.cloudinary.com') && !optimizedAvatar.includes('f_auto')) {
    optimizedAvatar = optimizedAvatar.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
  }

  const formattedDate = formatRelativeTime(post.created_at);
  const photoList = post.image_url ? post.image_url.split(',') : [];
  const isVideoPost = !!post.video_url;

  // Handler Media Click (Double Tap Logic)
  const handleMediaClick = (e: React.MouseEvent, imageUrl?: string) => {
    const now = Date.now();
    const lastTapTime = lastTapRef.current || 0;
    
    if (now - lastTapTime < 350) {
      lastTapRef.current = 0; 
      if (!currentUser) return window.dispatchEvent(new CustomEvent('openLogin'));

      // Panggil efek love meletup di komponen ini
      setPoppingHeart(postIdStr);
      setTimeout(() => setPoppingHeart(null), 1000);

      // Panggil efek flying bubble di Parent
      const avatar = currentUser?.avatar_url || '/asets/png/profile.webp';
      const x = e.clientX;
      const y = e.clientY;
      onSetFloatingLikes(x, y, avatar);

      if (!isLiked) onLike(postIdStr, post.creator_id);
    } else {
      lastTapRef.current = now;
      if (imageUrl) {
        setTimeout(() => {
          if (lastTapRef.current === now) {
            setActivePreviewImage(imageUrl);
            lastTapRef.current = 0;
          }
        }, 360);
      }
    }
  };

  const handleMentionClick = async (e: React.MouseEvent, username: string) => {
    e.stopPropagation(); 
    try {
      const { data } = await supabase.from('profiles').select('id').eq('username', username).single();
      if (data && data.id) { router.push(`/data?id=${data.id}`); } 
      else { showNotif(`User @${username} tidak ditemukan`, "warning"); }
    } catch (err) { console.error(err); }
  };

  const renderBioWithMentions = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@\w+|#\w+)/g); 
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const usernameOnly = part.substring(1); 
        return <span key={i} onClick={(e) => handleMentionClick(e, usernameOnly)} style={{ color: '#1f3cff', fontWeight: 700, cursor: 'pointer' }}>{part}</span>;
      } else if (part.startsWith('#')) {
        return <span key={i} onClick={(e) => { e.stopPropagation(); router.push(`/search?q=${encodeURIComponent(part)}`); }} style={{ color: 'var(--text-muted, #8696a0)', fontWeight: 400, cursor: 'pointer' }}>{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const getMusicHtml = (isOverlay = true) => {
    if (!post.audio_src) return null;
    let cleanAudio = (post.audio_src || "").trim();
    if (cleanAudio.includes('res.cloudinary.com') && cleanAudio.includes('/video/upload/')) {
        cleanAudio = cleanAudio.replace('/video/upload/', '/video/upload/f_mp3/');
    }
    const finalAudio = cleanAudio.startsWith("http") ? cleanAudio : `/songs/${cleanAudio}`;
    
    return (
      <div className="music-marquee-container" style={{ position: isOverlay ? 'absolute' : 'relative', top: isOverlay ? '12px' : 'auto', left: isOverlay ? '12px' : 'auto', maxWidth: isOverlay ? '130px' : '220px', width: isOverlay ? 'auto' : 'fit-content', zIndex: 2, background: isOverlay ? 'rgba(0,0,0,0.5)' : 'var(--bg-secondary)', backdropFilter: isOverlay ? 'blur(8px)' : 'none', borderRadius: '16px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', border: isOverlay ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-card)' }}>
        <span className="material-icons" style={{ fontSize: '12px', color: isOverlay ? '#fff' : 'var(--text-main)' }}>music_note</span>
        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', position: 'relative' }}>
          <div className="marquee-text" style={{ display: 'inline-block', color: isOverlay ? '#fff' : 'var(--text-main)' }}>
            {post.title || t('untitled')} — {post.artist || t('unknown_artist')}
          </div>
        </div>
        <audio className="post-audio-element" loop preload="none" playsInline style={{ display: 'none' }}><source src={finalAudio} type="audio/mpeg" /></audio>
      </div>
    );
  };

  return (
    <>
      <div className={`image-preview-overlay ${activePreviewImage ? 'active' : ''}`} onClick={() => setActivePreviewImage(null)}>
        <div className="image-preview-content">
          {activePreviewImage && <img src={activePreviewImage} alt="Preview" />}
        </div>
      </div>

      <div id={`post-${post.id}`} data-postid={post.id} className="card" style={(!post.image_url && !post.video_url) ? { padding: '16px' } : {}}>
        {(photoList.length > 0 || isVideoPost) ? (
          <>
            <div className="slider">
              {getMusicHtml(true)}
              
              {/* Efek Love Merah Meletup */}
              {poppingHeart === postIdStr && <span className="material-icons big-pop-heart">favorite</span>}

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
                <button className="btn-press" onClick={onMuteToggle} style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 2, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                  <span className="material-icons" style={{ fontSize: '18px' }}>{isGloballyMuted ? 'volume_off' : 'volume_up'}</span>
                </button>
              )}

              {isOwner && mutualLikers.length > 0 && (
                <div className="liker-bubble-wrapper">
                  {mutualLikers.slice(0, 3).map((liker: any, index: number) => (
                    <div key={index} className="liker-bubble" onClick={() => router.push(`/data?id=${liker.id}`)} style={{ animationDelay: `${index * 1.5}s`, transform: `translateX(${index * -5}px)` }}>
                      <img src={liker.avatar_url || '/asets/png/profile.webp'} alt="liker" />
                      <span className="material-icons liker-mini-icon heart">favorite</span>
                    </div>
                  ))}
                </div>
              )}

              {!isOwner && combinedMutualInteractors.length > 0 && (
                <div className="nonowner-bubble-wrapper">
                  {combinedMutualInteractors.map((interactor: any, index: number) => (
                    <div key={index} className="nonowner-bubble" onClick={() => router.push(`/data?id=${interactor.id}`)} style={{ animationDelay: `${index * 1.2}s` }}>
                      <div style={{ position: 'relative' }}>
                        <img src={interactor.avatar_url || '/asets/png/profile.webp'} alt="interactor" />
                        {interactor.type === 'like' ? <span className="material-icons liker-mini-icon heart">favorite</span> : <span className="material-icons liker-mini-icon repeat">repeat</span>}
                      </div>
                      {interactor.note && <div className="note-bubble">"{interactor.note}"</div>}
                    </div>
                  ))}
                </div>
              )}

              <div className="photo-carousel" onScroll={(e) => {
                  const target = e.target as HTMLDivElement;
                  const index = Math.round(target.scrollLeft / target.offsetWidth);
                  const dots = document.querySelectorAll(`.dots-${post.id} .dot`);
                  dots.forEach((d, i) => i === index ? d.classList.add('active') : d.classList.remove('active'));
                  const counterEl = document.getElementById(`slide-counter-${post.id}`);
                  if (counterEl) counterEl.innerText = `${index + 1}/${photoList.length}`;
              }}>
                {isVideoPost ? (
                  <div className="carousel-item" onClick={(e) => handleMediaClick(e)} style={{ aspectRatio: '2 / 3', width: '100%', overflow: 'hidden', position: 'relative', background: 'var(--bg-secondary)', cursor: 'pointer' }}>
                    <video src={post.video_url} className="post-video-element" poster={getOptimizedImage(post.image_url)} playsInline loop muted style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', pointerEvents: 'none' }} />
                  </div>
                ) : (
                  photoList.map((url: string, i: number) => (
                    <div key={i} className="carousel-item" style={{ aspectRatio: '3 / 4', width: '100%', overflow: 'hidden', position: 'relative', background: 'var(--bg-secondary)' }}>
                      <img src={getOptimizedImage(url)} className="active" loading={i === 0 ? "eager" : "lazy"} alt={`Postingan Galeri ${i + 1}`} onClick={(e) => handleMediaClick(e, getOptimizedImage(url))} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', cursor: 'pointer' }} />
                    </div>
                  ))
                )}
              </div>

              {photoList.length > 1 && !isVideoPost && (
                <div className={`carousel-dots dots-${post.id}`}>
                  {photoList.map((_: any, i: number) => <div key={i} className={`dot ${i === 0 ? 'active' : ''}`} />)}
                </div>
              )}
            </div>
            
            <div className="overlay">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <h2 className="name" onClick={() => window.location.href=`/data?id=${post.creator_id}`} style={{ margin: 0, cursor: 'pointer' }}>
                    {post.profiles?.full_name || post.profiles?.username || "User"} <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                  </h2>
                  
                  {/* Tombol Follow */}
                  {currentUser && currentUser.id !== post.creator_id && (
                    <button onClick={(e) => onFollow(e, post.creator_id)} className="btn-press" style={{ background: isFollowing ? 'var(--bg-secondary)' : '#1f3cff', color: isFollowing ? 'var(--text-main)' : '#ffffff', border: isFollowing ? '1px solid var(--border-card)' : 'none', padding: '4px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 700, marginLeft: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transform: isAnimatingFollow ? 'scale(0.85)' : 'scale(1)', transition: 'all 0.2s ease-in-out' }}>
                      {isFollowing && <span className="material-icons check-pop" style={{ fontSize: '13px', color: 'var(--text-main)' }}>check</span>}
                      {isFollowing ? (isMutual ? 'Berteman' : 'Mengikuti') : t('follow', 'Ikuti')}
                    </button>
                  )}
                </div>
                <button className="options-btn btn-press" onClick={(e) => { e.stopPropagation(); onShare(post, isOwner); }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                </button>
              </div>
              
              <p className="post-bio" style={{ minHeight: '24px', wordBreak: 'break-word', display: 'block' }}>
                {renderBioWithMentions(post.bio?.trim())}
              </p>

              <div className="post-date-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{formattedDate}</span>
                {post.is_ad && (
                  <span style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', color: '#fff' }}><span className="material-icons" style={{ fontSize: '12px' }}>campaign</span> Iklan</span>
                )}
              </div>

              <div className="actions">
                <a href={`/data?id=${post.creator_id}`} className="primary btn-press" style={{ display: 'inline-block' }}>{t('view_detail')}</a>
                <div className="engagement-group">
                  <button className={`icon-btn save-btn btn-press ${isSaved ? 'active' : ''}`} onClick={() => onSave(postIdStr)}>
                    <svg viewBox="0 0 24 24" className="icon" fill="currentColor" style={{ color: isSaved ? "#1f3cff" : "inherit" }}>
                      {isSaved ? <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /> : <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />}
                    </svg>
                    <span className="save-count">{counts?.saves || 0}</span>
                  </button>

                  <button className={`icon-btn repost-btn btn-press ${isReposted ? 'reposted' : ''}`} onClick={() => onRepostClick(postIdStr, post.creator_id)}>
                    <svg viewBox="0 0 24 24" className={`icon ${animatingReposts.has(postIdStr) ? 'spin-anim' : ''}`} fill="currentColor" style={{ color: isReposted ? "#1f3cff" : "inherit" }}>
                      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
                    </svg>
                    <span className="repost-count">{counts?.reposts || 0}</span>
                  </button>

                  <button className={`icon-btn like-btn btn-press ${isLiked ? 'liked' : ''}`} onClick={() => onLike(postIdStr, post.creator_id)}>
                    <svg viewBox="0 0 24 24" className={`icon heart ${isLiked ? 'heart-pop active' : ''}`} fill="currentColor">
                      <path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z"/>
                    </svg>
                    <span className="like-count">{counts?.likes || 0}</span>
                  </button>
                  
                  <button className="icon-btn comment-toggle btn-press" data-post={post.id} data-creator={post.creator_id}>
                    <svg viewBox="0 0 24 24" className="icon" fill="currentColor"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>
                    <span className="comment-count">{counts?.comments || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* TAMPILAN TEXT-ONLY POST */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', cursor: 'pointer' }} onClick={() => window.location.href=`/data?id=${post.creator_id}`}>
                <img src={optimizedAvatar} alt="Avatar Profil" loading="lazy" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
                    {post.profiles?.full_name || post.profiles?.username || "User"} <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                    {currentUser && currentUser.id !== post.creator_id && (
                      <button onClick={(e) => onFollow(e, post.creator_id)} className="btn-press" style={{ background: isFollowing ? 'var(--bg-secondary)' : '#1f3cff', color: isFollowing ? 'var(--text-main)' : '#ffffff', border: isFollowing ? '1px solid var(--border-card)' : 'none', padding: '4px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 700, marginLeft: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transform: isAnimatingFollow ? 'scale(0.85)' : 'scale(1)' }}>
                        {isFollowing && <span className="material-icons check-pop" style={{ fontSize: '13px' }}>check</span>}
                        {isFollowing ? (isMutual ? 'Berteman' : 'Mengikuti') : t('follow', 'Ikuti')}
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {formattedDate}
                    {post.is_ad && <><span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#1f3cff', fontWeight: 700 }}><span className="material-icons" style={{ fontSize: '12px' }}>campaign</span> Iklan</span></>}
                  </span>
                </div>
              </div>
              <button className="btn-press" onClick={(e) => { e.stopPropagation(); onShare(post, isOwner); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
            </div>

            <div style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: '12px', wordBreak: 'break-word' }}>
              {renderBioWithMentions(post.bio?.trim())}
            </div>
            
            {post.audio_src && (
              <div style={{ position: 'relative', height: '40px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {getMusicHtml(false)}
                <button className="btn-press" onClick={onMuteToggle} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', color: 'var(--text-main)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                  <span className="material-icons" style={{ fontSize: '18px' }}>{isGloballyMuted ? 'volume_off' : 'volume_up'}</span>
                </button>
              </div>
            )}

            <div className="actions" style={{ borderTop: '1px solid var(--border-card)', marginTop: '16px', paddingTop: '12px' }}>
              <a href={`/data?id=${post.creator_id}`} className="btn-press" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>{t('view_detail')}</a>
              <div className="engagement-group">
                  <button className={`icon-btn save-btn btn-press ${isSaved ? 'active' : ''}`} onClick={() => onSave(postIdStr)}>
                    <svg viewBox="0 0 24 24" className="icon" fill="currentColor" style={{ color: isSaved ? "#1f3cff" : "inherit" }}>
                      {isSaved ? <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /> : <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />}
                    </svg>
                    <span className="save-count">{counts?.saves || 0}</span>
                  </button>

                  <button className={`icon-btn repost-btn btn-press ${isReposted ? 'reposted' : ''}`} onClick={() => onRepostClick(postIdStr, post.creator_id)}>
                    <svg viewBox="0 0 24 24" className={`icon ${animatingReposts.has(postIdStr) ? 'spin-anim' : ''}`} fill="currentColor" style={{ color: isReposted ? "#1f3cff" : "inherit" }}>
                      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
                    </svg>
                    <span className="repost-count">{counts?.reposts || 0}</span>
                  </button>

                  <button className={`icon-btn like-btn btn-press ${isLiked ? 'liked' : ''}`} onClick={() => onLike(postIdStr, post.creator_id)}>
                    <svg viewBox="0 0 24 24" className={`icon heart ${isLiked ? 'heart-pop active' : ''}`} fill="currentColor">
                      <path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z"/>
                    </svg>
                    <span className="like-count">{counts?.likes || 0}</span>
                  </button>
                  
                  <button className="icon-btn comment-toggle btn-press" data-post={post.id} data-creator={post.creator_id}>
                    <svg viewBox="0 0 24 24" className="icon" fill="currentColor"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>
                    <span className="comment-count">{counts?.comments || 0}</span>
                  </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
