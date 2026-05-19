'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { sendPushAndAppNotif } from '@/lib/notif';
import PostCard from '@/components/post/PostCard';
import RepostModal from '@/components/post/RepostModal';
import ImagePreview from '@/components/post/ImagePreview';

export default function PostPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const postIdFromUrl = searchParams.get('id');
  const origin = searchParams.get('from'); // 'self', 'other', atau 'home'
  const username = searchParams.get('username');

  const [post, setPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [myLikedPosts, setMyLikedPosts] = useState<Set<string>>(new Set());
  const [myRepostedPosts, setMyRepostedPosts] = useState<Set<string>>(new Set());
  const [mySavedPosts, setMySavedPosts] = useState<Set<string>>(new Set());
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [mutualUsers, setMutualUsers] = useState<Set<string>>(new Set());
  const [animatingFollows, setAnimatingFollows] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, { likes: number; comments: number; reposts: number; saves: number }>>({});
  const [animatingReposts, setAnimatingReposts] = useState<Set<string>>(new Set());
  const [likersMap, setLikersMap] = useState<Record<string, any[]>>({});
  const [repostersMap, setRepostersMap] = useState<Record<string, any[]>>({});
  
  const [poppingHeart, setPoppingHeart] = useState<string | null>(null);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const [repostModal, setRepostModal] = useState<{ isOpen: boolean; postId: string; creatorId: string } | null>(null);
  const [repostNote, setRepostNote] = useState("");
  
  const [isGloballyMuted, setIsGloballyMuted] = useState(true);
  const isMutedRef = useRef(true);
  const lastTapRef = useRef<Record<string, number>>({});
  
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 🔥 JUDUL DINAMIS 🔥
  const getHeaderTitle = () => {
    if (isLoading) return "Memuat...";
    if (!post) return "Detail Postingan";
    if (origin === 'self') return "Postingan Anda";
    if (origin === 'other') return `Postingan ${username || 'User'}`;
    return "Detail Postingan"; // Default dari Home/Rekomendasi
  };

  useEffect(() => {
    if (postIdFromUrl) fetchSinglePost(postIdFromUrl);
    else setIsLoading(false);
  }, [postIdFromUrl]);

  // Autoplay khusus 1 postingan
  useEffect(() => {
    if (!post) return;
    const timer = setTimeout(() => {
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const media = entry.target.querySelector(".post-audio-element, .post-video-element") as HTMLMediaElement;
          if (!media) return;
          if (entry.isIntersecting) {
            media.muted = isMutedRef.current;
            if (media.paused) media.play().catch(()=>{});
          } else {
            media.pause();
          }
        });
      }, { threshold: 0.5 });
      
      const cardEl = document.querySelector('.card');
      if (cardEl) observerRef.current.observe(cardEl);
    }, 500);

    return () => { clearTimeout(timer); observerRef.current?.disconnect(); };
  }, [post]);

  const fetchSinglePost = async (id: string) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      setCurrentUser(user);

      let currentMutuals = new Set<string>();
      if (user) {
        const [followsRes, followersRes] = await Promise.all([
          supabase.from('followers').select('following_id').eq('follower_id', user.id),
          supabase.from('followers').select('follower_id').eq('following_id', user.id),
        ]);
        if (followsRes.data) setFollowedUsers(new Set(followsRes.data.map(f => String(f.following_id))));
        if (followsRes.data && followersRes.data) {
          const followerSet = new Set(followersRes.data.map(f => String(f.follower_id)));
          currentMutuals = new Set(followsRes.data.map(f => String(f.following_id)).filter(x => followerSet.has(x)));
          setMutualUsers(currentMutuals);
        }
      }

      const { data: postData, error } = await supabase
        .from('posts')
        .select(`id, image_url, video_url, audio_src, title, artist, bio, created_at, creator_id, category, views, is_private, is_ad, profiles:creator_id (full_name, username, role, avatar_url, is_private)`)
        .eq('id', id).single();

      if (error || !postData) { setPost(null); setIsLoading(false); return; }

      const [likesRes, commentsRes, repostsRes, savesRes] = await Promise.all([
        supabase.from('likes').select('user_id, profiles:user_id(id, username, avatar_url)').eq('post_id', id),
        supabase.from('comments').select('id', { count: 'exact' }).eq('post_id', id),
        supabase.from('reposts').select('user_id, note, profiles:user_id(id, username, avatar_url)').eq('post_id', id),
        supabase.from('bookmarks').select('user_id').eq('post_id', id),
      ]);

      const postIdStr = String(postData.id);
      setCounts({ [postIdStr]: { likes: likesRes.data?.length || 0, comments: commentsRes.count || 0, reposts: repostsRes.data?.length || 0, saves: savesRes.data?.length || 0 } });
      setLikersMap({ [postIdStr]: likesRes.data?.map(l => l.profiles) || [] });
      setRepostersMap({ [postIdStr]: repostsRes.data?.map(r => ({ ...r.profiles, note: r.note })) || [] });

      if (user) {
        if (likesRes.data?.some(l => String(l.user_id) === user.id)) setMyLikedPosts(new Set([postIdStr]));
        if (repostsRes.data?.some(r => String(r.user_id) === user.id)) setMyRepostedPosts(new Set([postIdStr]));
        if (savesRes.data?.some(s => String(s.user_id) === user.id)) setMySavedPosts(new Set([postIdStr]));
      }
      setPost(postData);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleFollowToggle = useCallback(async (e: any, creatorId: string) => { /* Sama kayak Gallery */ }, []);
  const handleLike = useCallback(async (postId: string, creatorId: string) => { /* Sama kayak Gallery */ }, []);
  const handleMediaClick = useCallback((e: React.MouseEvent, postId: string, creatorId: string, imageUrl?: string) => { /* Sama kayak Gallery */ }, []);
  const handleConfirmRepost = useCallback(async (postId: string, creatorId: string, isUnrepost: boolean = false) => { /* Sama kayak Gallery */ }, []);
  const handleSave = useCallback(async (postId: string) => { /* Sama kayak Gallery */ }, []);
  
  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGloballyMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      document.querySelectorAll(".post-audio-element, .post-video-element").forEach((el: any) => { el.muted = next; });
      return next;
    });
  }, []);

  const openShareOptions = useCallback((postToShare: any, isOwner: boolean) => { /* Sama kayak Gallery */ }, []);

  return (
    <div style={{ paddingBottom: '80px', background: 'var(--bg-main)', minHeight: '100vh' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-main)', borderBottom: '1px solid var(--border-card)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>{getHeaderTitle()}</h2>
      </div>

      <RepostModal isOpen={!!repostModal} postId={repostModal?.postId || ''} creatorId={repostModal?.creatorId || ''} note={repostNote} setNote={setRepostNote} onClose={() => setRepostModal(null)} onConfirm={() => { if (repostModal) handleConfirmRepost(repostModal.postId, repostModal.creatorId, false); }} />
      <ImagePreview imageUrl={activePreviewImage} onClose={() => setActivePreviewImage(null)} />

      <div style={{ marginTop: '10px', maxWidth: '600px', margin: '10px auto' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}><div className="pure-spinner" style={{ margin: '0 auto' }}></div></div>
        ) : !post ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
            <span className="material-icons" style={{ fontSize: '48px', marginBottom: '10px' }}>error_outline</span>
            <h3>Postingan Tidak Ditemukan</h3>
          </div>
        ) : (
          <div className="gallery">
            <PostCard
              post={post}
              currentUser={currentUser}
              counts={counts}
              myLikedPosts={myLikedPosts}
              myRepostedPosts={myRepostedPosts}
              mySavedPosts={mySavedPosts}
              followedUsers={followedUsers}
              mutualUsers={mutualUsers}
              animatingFollows={animatingFollows}
              animatingReposts={animatingReposts}
              isGloballyMuted={isGloballyMuted}
              poppingHeart={poppingHeart}
              activePreviewImage={activePreviewImage}
              likersMap={likersMap} 
              repostersMap={repostersMap}
              handleLike={handleLike}
              handleSave={handleSave}
              openRepostModal={(id, cid) => { setRepostNote(""); setRepostModal({ isOpen: true, postId: id, creatorId: cid }); }}
              handleMediaClick={handleMediaClick}
              toggleMute={toggleMute}
              openShareOptions={openShareOptions}
              handleFollowToggle={handleFollowToggle}
              setActivePreviewImage={setActivePreviewImage}
              router={router}
              t={t}
            />
          </div>
        )}
      </div>
    </div>
  );
}
