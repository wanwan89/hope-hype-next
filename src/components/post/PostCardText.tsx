import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import FollowButton from './FollowButton';
import EngagementButtons from './EngagementButtons';
import MusicMarquee from './MusicMarquee';
import TopTanggapan from './TopTanggapan';
import { supabase } from '@/lib/supabase';
import { getOptimizedImage, formatRelativeTime } from '@/lib/helpers';
import { getUserBadge } from '@/lib/ui-utils';

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
  handleLike: (postId: string, creatorId: string) => void;
  handleSave: (postId: string) => void;
  openRepostModal: (postId: string, creatorId: string) => void;
  toggleMute: (e: React.MouseEvent) => void;
  openShareOptions: (post: any, isOwner: boolean) => void;
  handleFollowToggle: (e: any, creatorId: string) => void;
  router: ReturnType<typeof import('next/navigation').useRouter>;
  t: any;
  onTanggapanClick?: (postId: string) => void;
  showTopComment?: boolean;
  tanggapanLabel?: string;
};

export default function PostCardText(props: Props) {
  const {
    post, currentUser, counts, myLikedPosts, myRepostedPosts, mySavedPosts,
    followedUsers, mutualUsers, animatingFollows, animatingReposts,
    isGloballyMuted, poppingHeart,
    handleLike, handleSave, openRepostModal,
    toggleMute, openShareOptions, handleFollowToggle,
    router, t, onTanggapanClick, showTopComment = true, tanggapanLabel
  } = props;

  const postIdStr = String(post.id);
  const creatorIdStr = String(post.creator_id);
  const isOwner = currentUser && currentUser.id === post.creator_id;
  const badge = getUserBadge(post.profiles?.role);
  const rawAvatarUrl = post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.username}`;
  const optimizedAvatar = useMemo(() => {
    if (rawAvatarUrl.includes('res.cloudinary.com') && !rawAvatarUrl.includes('f_auto'))
      return rawAvatarUrl.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
    return rawAvatarUrl;
  }, [rawAvatarUrl]);
  const formattedDate = formatRelativeTime(post.created_at);

  const [topComment, setTopComment] = useState<any>(null);
  const mediaRef = useRef<HTMLAudioElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasViewedRef = useRef(false);

  // Observer
  useEffect(() => {
    const audio = mediaRef.current;
    const card = cardRef.current;
    if (!card) return;
    if (audio) audio.muted = isGloballyMuted;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (audio) {
              audio.muted = isGloballyMuted;
              audio.play().catch(() => {});
            }
            if (!hasViewedRef.current && postIdStr) {
              hasViewedRef.current = true;
              supabase.rpc('increment_post_view', { p_id: postIdStr }).catch(() => {});
            }
          } else {
            if (audio) audio.pause();
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [isGloballyMuted, postIdStr]);

  // Fetch 1 tanggapan teratas
  useEffect(() => {
    let isMounted = true;
    if (showTopComment) {
      const fetchTop = async () => {
        const { data, error } = await supabase
          .from('tanggapan')
          .select(`id, content, created_at, profiles:user_id (username, full_name, avatar_url, role)`)
          .eq('post_id', postIdStr)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!error && isMounted && data?.length) setTopComment(data[0]);
      };
      fetchTop();
    }
    return () => { isMounted = false; };
  }, [postIdStr, showTopComment]);

  const commentCount = counts[postIdStr]?.tanggapan || 0;
  const tanggapanButtonLabel = tanggapanLabel || (commentCount > 0 ? `${commentCount} Tanggapan` : 'Tanggapi');

  const handleTanggapanClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onTanggapanClick) onTanggapanClick(postIdStr);
    else router.push(`/post?id=${postIdStr}`);
  };

  return (
    <div key={postIdStr} id={`post-${postIdStr}`} data-postid={postIdStr} className="card" ref={cardRef} style={{ background: 'var(--bg-main)', borderRadius: '0px', padding: '15px', borderTop: '1px solid var(--border-card)', borderBottom: '1px solid var(--border-card)', width: '100%', marginBottom: '12px', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', zIndex: 2 }}>
        <div style={{ display: 'flex', gap: '12px', cursor: 'pointer' }} onClick={() => router.push(`/data?id=${creatorIdStr}`)}>
          <img src={optimizedAvatar} alt="Avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
              {post.profiles?.full_name || post.profiles?.username || 'User'}
              <span dangerouslySetInnerHTML={{ __html: badge }}></span>
              <FollowButton creatorId={creatorIdStr} currentUser={currentUser} followedUsers={followedUsers} mutualUsers={mutualUsers} animatingFollows={animatingFollows} handleFollowToggle={handleFollowToggle} t={t} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {formattedDate}
              {post.is_ad && <><span>•</span><span style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, color: 'var(--text-main)' }}><span className="material-icons" style={{ fontSize: '12px', color: '#1f3cff' }}>campaign</span> Iklan</span></>}
            </span>
          </div>
        </div>
        <button className="btn-press" aria-label="Opsi" onClick={(e) => { e.stopPropagation(); openShareOptions(post, isOwner); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
      </div>

      {poppingHeart?.startsWith(postIdStr) && (
        <span className="material-icons" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ff2e63', fontSize: '160px', animation: 'popHeartAnim 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))', zIndex: 9999, pointerEvents: 'none' }}>favorite</span>
      )}

      <div style={{ marginBottom: '12px', fontSize: '14.5px', color: 'var(--text-main)', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap', marginTop: '8px' }}>
        {post.bio?.trim()}
      </div>

      {post.audio_src && (
        <>
          <audio ref={mediaRef} src={post.audio_src} className="post-audio-element" loop playsInline autoPlay muted={isGloballyMuted} style={{ width: '1px', height: '1px', position: 'absolute', opacity: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
            <MusicMarquee post={post} isOverlay={false} mediaRef={mediaRef} />
            <button className="btn-press" onClick={(e) => { e.stopPropagation(); toggleMute(e); if (mediaRef.current && isGloballyMuted) { mediaRef.current.muted = false; mediaRef.current.play().catch(() => {}); } }} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', color: 'var(--text-main)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-icons" style={{ fontSize: '18px' }}>{isGloballyMuted ? 'volume_off' : 'volume_up'}</span>
            </button>
          </div>
        </>
      )}

      <div className="actions" style={{ borderTop: '1px solid var(--border-card)', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={handleTanggapanClick} className="btn-press" style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'transparent', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '0' }}>
          <span className="material-icons" style={{ fontSize: '18px' }}>chat_bubble_outline</span>
          {tanggapanButtonLabel}
        </button>
        <EngagementButtons postId={postIdStr} creatorId={creatorIdStr} counts={counts} mySavedPosts={mySavedPosts} myRepostedPosts={myRepostedPosts} myLikedPosts={myLikedPosts} animatingReposts={animatingReposts} handleSave={handleSave} openRepostModal={openRepostModal} handleLike={handleLike} />
      </div>

      {showTopComment && topComment && <TopTanggapan topComment={topComment} />}
    </div>
  );
}