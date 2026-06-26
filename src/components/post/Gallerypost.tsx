'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { sendPushAndAppNotif } from '@/lib/notif';
import PostCard from './PostCard';
import RepostModal from './RepostModal';
import ImagePreview from './ImagePreview';
import SuggestedUsers from './SuggestedUsers';
import { Virtuoso } from 'react-virtuoso';
import { useFeed } from '@/hooks/useFeed';
import './Gallery.css';

function shuffleArray(array: any[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const getOptimizedImage = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('res.cloudinary.com') && !cleanUrl.includes('f_auto')) {
    return cleanUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_800/');
  }
  return cleanUrl;
};

const MemoizedSlider = React.memo(({ posts }: { posts: any[] }) => {
  if (!posts.length) return null;
  return (
    <div style={{ margin: '15px 0 35px 0', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '15px' }}>
        <span className="material-icons" style={{ color: '#ff2e63', fontSize: '20px' }}>local_fire_department</span>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>Rekomendasi Postingan</h3>
      </div>
      <div className="slider-recommendation" style={{ display: 'flex', overflowX: 'auto', gap: '12px', scrollbarWidth: 'none', scrollSnapType: 'x mandatory', paddingBottom: '5px', willChange: 'transform' }}>
        {posts.map(sp => {
          const img = sp.image_url ? sp.image_url.split(',')[0] : '';
          return (
            <div
              key={`sugg-${String(sp.id)}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/post?id=${String(sp.id)}&from=home`; }}
              style={{
                minWidth: '150px', maxWidth: '150px', background: 'var(--bg-card)', borderRadius: '14px',
                overflow: 'hidden', border: '1px solid var(--border-card)', scrollSnapAlign: 'start',
                cursor: 'pointer', display: 'flex', flexDirection: 'column'
              }}
            >
              <div style={{ width: '100%', height: '160px', background: 'var(--bg-secondary)', position: 'relative' }}>
                <img src={getOptimizedImage(img) || '/asets/png/placeholder.png'} loading="lazy" decoding="async" alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: '10px' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {sp.bio || 'Tanpa Caption'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img src={getOptimizedImage(sp.profiles?.avatar_url) || '/asets/png/profile.webp'} loading="lazy" decoding="async" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} alt="av" />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sp.profiles?.username}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
MemoizedSlider.displayName = 'MemoizedSlider';

const MemoizedSuggested = React.memo(SuggestedUsers, (prev, next) =>
  prev.myId === next.myId && prev.followedUsers === next.followedUsers
);

export default function Gallerypost() {
  const { t } = useTranslation();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const currentUserRef = useRef<any>(null);

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
  const lastTapRef = useRef<Record<string, number>>({});

  const [currentCategory, setCurrentCategory] = useState("fyp");
  const [isGloballyMuted, setIsGloballyMuted] = useState(true);

  const [repostModal, setRepostModal] = useState<{
    isOpen: boolean;
    postId: string;
    creatorId: string;
    isUnrepost: boolean;
  } | null>(null);
  const [repostNote, setRepostNote] = useState("");

  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [suggestedPosts, setSuggestedPosts] = useState<any[]>([]);

  const myLikedPostsRef = useRef(myLikedPosts);
  const myRepostedPostsRef = useRef(myRepostedPosts);
  const mySavedPostsRef = useRef(mySavedPosts);
  const followedUsersRef = useRef(followedUsers);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { myLikedPostsRef.current = myLikedPosts; }, [myLikedPosts]);
  useEffect(() => { myRepostedPostsRef.current = myRepostedPosts; }, [myRepostedPosts]);
  useEffect(() => { mySavedPostsRef.current = mySavedPosts; }, [mySavedPosts]);
  useEffect(() => { followedUsersRef.current = followedUsers; }, [followedUsers]);

  const {
    allPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useFeed(currentCategory, currentUser, mutualUsers);

  // --- Inisialisasi user ---
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) setCurrentUser(profile);

        const [followsRes, followersRes] = await Promise.all([
          supabase.from('followers').select('following_id').eq('follower_id', session.user.id),
          supabase.from('followers').select('follower_id').eq('following_id', session.user.id),
        ]);
        if (followsRes.data) {
          const followingSet = new Set(followsRes.data.map(f => String(f.following_id)));
          setFollowedUsers(followingSet);
          if (followersRes.data) {
            const followerSet = new Set(followersRes.data.map(f => String(f.follower_id)));
            setMutualUsers(new Set([...followingSet].filter(x => followerSet.has(x))));
          }
        }
      }
    };
    init();
  }, []);

  // Fetch rekomendasi
  useEffect(() => {
    const fetchSuggestedPosts = async () => {
      try {
        const { data } = await supabase
          .from('posts')
          .select('id, creator_id, image_url, bio, profiles:creator_id (username, avatar_url)')
          .eq('status', 'approved')
          .eq('is_private', false)
          .neq('image_url', null)
          .limit(20);
        if (data) {
          setSuggestedPosts(shuffleArray(data).slice(0, 6));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSuggestedPosts();
  }, []);

  // --- Ambil Interaksi (Likes, dsb) berdasarkan allPosts ---
  useEffect(() => {
    if (!currentUser || allPosts.length === 0) return;

    const postIds = allPosts.map(p => p.id);
    const fetchInteractions = async () => {
      const [likesRes, commentsRes, repostsRes, savesRes] = await Promise.all([
        supabase.from("likes").select("post_id, user_id, profiles:user_id(id, username, avatar_url)").in("post_id", postIds),
        supabase.from("comments").select("post_id").in("post_id", postIds),
        supabase.from("reposts").select("post_id, user_id, note, profiles:user_id(id, username, avatar_url)").in("post_id", postIds),
        supabase.rpc('get_bookmark_counts', { post_ids: postIds }),
      ]);

      const newCounts: any = {};
      const newLikersMap: any = {};
      const newRepostersMap: any = {};
      postIds.forEach(id => {
        if (!newCounts[id]) {
          newCounts[id] = { likes: 0, comments: 0, reposts: 0, saves: 0 };
          newLikersMap[id] = [];
          newRepostersMap[id] = [];
        }
      });

      likesRes.data?.forEach(l => {
        if (newCounts[l.post_id]) { newCounts[l.post_id].likes++; newLikersMap[l.post_id].push(l.profiles); }
      });
      commentsRes.data?.forEach(c => { if (newCounts[c.post_id]) newCounts[c.post_id].comments++; });
      repostsRes.data?.forEach(r => {
        if (newCounts[r.post_id]) { newCounts[r.post_id].reposts++; newRepostersMap[r.post_id].push({ ...r.profiles, note: r.note }); }
      });
      (savesRes.data || []).forEach((s: any) => { if (newCounts[s.post_id]) newCounts[s.post_id].saves = Number(s.count); });

      setCounts(prev => ({ ...prev, ...newCounts }));
      setLikersMap(prev => ({ ...prev, ...newLikersMap }));
      setRepostersMap(prev => ({ ...prev, ...newRepostersMap }));

      const [myLikes, myReposts, mySaves] = await Promise.all([
        supabase.from("likes").select("post_id").eq("user_id", currentUser.id).in("post_id", postIds),
        supabase.from("reposts").select("post_id").eq("user_id", currentUser.id).in("post_id", postIds),
        supabase.from("bookmarks").select("post_id").eq("user_id", currentUser.id).in("post_id", postIds),
      ]);
      setMyLikedPosts(prev => {
        const n = new Set(prev);
        myLikes.data?.forEach(l => n.add(String(l.post_id)));
        return n;
      });
      setMyRepostedPosts(prev => {
        const n = new Set(prev);
        myReposts.data?.forEach(r => n.add(String(r.post_id)));
        return n;
      });
      setMySavedPosts(prev => {
        const n = new Set(prev);
        mySaves.data?.forEach(s => n.add(String(s.post_id)));
        return n;
      });
    };

    fetchInteractions();
  }, [allPosts, currentUser]);

  const handleLike = useCallback(async (postId: string, creatorId: string) => {
    if (!currentUserRef.current) return router.push('/login'); // Diperbarui
    const numericPostId = parseInt(postId);
    const isLiked = myLikedPostsRef.current.has(postId);
    setMyLikedPosts(prev => { const n = new Set(prev); isLiked ? n.delete(postId) : n.add(postId); return n; });
    setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], likes: Math.max(0, (prev[postId]?.likes || 0) + (isLiked ? -1 : 1)) } }));
    try {
      if (isLiked) {
        await supabase.from("likes").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id });
      } else {
        const { error } = await supabase.from("likes").insert({ post_id: numericPostId, user_id: currentUserRef.current.id });
        if (!error && creatorId !== currentUserRef.current.id) {
          await sendPushAndAppNotif({ senderId: currentUserRef.current.id, receiverId: creatorId, type: "like", postId });
        }
      }
    } catch (err) { }
  }, [router]); // Dependency array diperbarui

  const handleSave = useCallback(async (postId: string) => {
    if (!currentUserRef.current) return router.push('/login'); // Diperbarui
    const numericPostId = parseInt(postId);
    const isSaved = mySavedPostsRef.current.has(postId);
    setMySavedPosts(prev => { const n = new Set(prev); isSaved ? n.delete(postId) : n.add(postId); return n; });
    setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], saves: Math.max(0, (prev[postId]?.saves || 0) + (isSaved ? -1 : 1)) } }));
    try {
      if (isSaved) await supabase.from("bookmarks").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id });
      else await supabase.from("bookmarks").insert({ post_id: numericPostId, user_id: currentUserRef.current.id });
    } catch (err) { }
  }, [router]); // Dependency array diperbarui

  const openRepostModal = useCallback((postId: string, creatorId: string) => {
    if (!currentUserRef.current) return router.push('/login'); // Diperbarui
    const alreadyReposted = myRepostedPostsRef.current.has(postId);
    setRepostNote("");
    setRepostModal({ isOpen: true, postId, creatorId, isUnrepost: alreadyReposted });
  }, [router]); // Dependency array diperbarui

  const handleConfirmRepost = useCallback(async () => {
    if (!repostModal || !currentUserRef.current) return;
    const { postId, creatorId, isUnrepost } = repostModal;
    const numericPostId = parseInt(postId);
    const finalNote = repostNote.trim().substring(0, 15);
    setRepostModal(null);
    setAnimatingReposts(prev => new Set(prev).add(postId));
    setTimeout(() => setAnimatingReposts(prev => { const n = new Set(prev); n.delete(postId); return n; }), 500);
    const wasReposted = myRepostedPostsRef.current.has(postId);
    setMyRepostedPosts(prev => { const n = new Set(prev); isUnrepost ? n.delete(postId) : n.add(postId); return n; });
    setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], reposts: Math.max(0, (prev[postId]?.reposts || 0) + (isUnrepost ? -1 : 1)) } }));
    try {
      if (isUnrepost) {
        await supabase.from("reposts").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id });
      } else {
        const { error } = await supabase.from("reposts").insert({ post_id: numericPostId, user_id: currentUserRef.current.id, note: finalNote });
        if (error) {
          setMyRepostedPosts(prev => { const n = new Set(prev); wasReposted ? n.add(postId) : n.delete(postId); return n; });
          setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], reposts: Math.max(0, (prev[postId]?.reposts || 0) - 1) } }));
        }
      }
    } catch (err) { }
  }, [repostModal, repostNote]);

  const handleFollowToggle = useCallback(async (e: any, creatorId: string) => {
    e.stopPropagation();
    if (!currentUserRef.current) return router.push('/login'); // Diperbarui
    if (currentUserRef.current.id === creatorId) return;
    const isFollowing = followedUsersRef.current.has(creatorId);
    setAnimatingFollows(prev => new Set(prev).add(creatorId));
    setTimeout(() => setAnimatingFollows(prev => { const n = new Set(prev); n.delete(creatorId); return n; }), 200);
    setFollowedUsers(prev => { const n = new Set(prev); isFollowing ? n.delete(creatorId) : n.add(creatorId); return n; });
    try {
      if (isFollowing) {
        await supabase.from("followers").delete().match({ follower_id: currentUserRef.current.id, following_id: creatorId });
      } else {
        await supabase.from("followers").insert({ follower_id: currentUserRef.current.id, following_id: creatorId });
        await sendPushAndAppNotif({ senderId: currentUserRef.current.id, receiverId: creatorId, type: "follow" });
      }
    } catch (err) { }
  }, [router]); // Dependency array diperbarui

  const handleMediaClick = useCallback((e: React.MouseEvent, postId: string, creatorId: string, imageUrl?: string) => {
    const now = Date.now();
    const lastTapTime = lastTapRef.current[postId] || 0;
    if (now - lastTapTime < 350) {
      lastTapRef.current[postId] = 0;
      if (!currentUserRef.current) return router.push('/login'); // Diperbarui
      setPoppingHeart(`${postId}-${now}`);
      setTimeout(() => setPoppingHeart(null), 1000);
      handleLike(postId, creatorId);
    } else {
      lastTapRef.current[postId] = now;
      if (imageUrl) {
        setTimeout(() => {
          if (lastTapRef.current[postId] === now) {
            setActivePreviewImage(imageUrl);
            lastTapRef.current[postId] = 0;
          }
        }, 360);
      }
    }
  }, [handleLike, router]); // Dependency array diperbarui

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGloballyMuted(prev => {
      const next = !prev;
      document.querySelectorAll(".post-audio-element, .post-video-element").forEach((el: any) => {
        el.muted = next;
        if (!next && el.paused) el.play().catch(() => { });
      });
      return next;
    });
  }, []);

  const openShareOptions = useCallback((post: any, isOwner: boolean) => {
    if (typeof window !== 'undefined' && (window as any).openGlobalShare) {
      (window as any).openGlobalShare(
        `${window.location.origin}/post?id=${post.id}`,
        'Postingan HypeTalk',
        'Lihat karya keren ini di HypeTalk!',
        post.profiles?.username || 'User',
        post.id,
        isOwner,
        post.is_private || false
      );
    }
  }, []);

  const handleToggleExpand = useCallback((postId: string) => {
    setExpandedPosts(prev => {
      const n = new Set(prev);
      n.has(postId) ? n.delete(postId) : n.add(postId);
      return n;
    });
  }, []);

  const renderItem = useCallback((index: number, post: any) => {
    const isExpanded = expandedPosts.has(post.id);
    const isTextOrAudio = !post.image_url && !post.video_url;

    return (
      <React.Fragment key={post.id}>
        {index === 3 && <MemoizedSlider posts={suggestedPosts} />}
        {index === 7 && <MemoizedSuggested myId={currentUser?.id} followedUsers={followedUsers} />}
        <div className={isTextOrAudio ? "text-post-card-wp" : "media-post-card-wp"}>
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
            openRepostModal={openRepostModal}
            handleMediaClick={handleMediaClick}
            toggleMute={toggleMute}
            openShareOptions={openShareOptions}
            handleFollowToggle={handleFollowToggle}
            setActivePreviewImage={setActivePreviewImage}
            router={router}
            t={t}
            isExpanded={isExpanded}
            onToggleExpand={handleToggleExpand}
          />
        </div>
      </React.Fragment>
    );
  }, [
    expandedPosts, currentUser, followedUsers, mutualUsers, counts,
    myLikedPosts, myRepostedPosts, mySavedPosts, animatingFollows,
    animatingReposts, isGloballyMuted, poppingHeart, activePreviewImage,
    likersMap, repostersMap, handleLike, handleSave, openRepostModal,
    handleMediaClick, toggleMute, openShareOptions, handleFollowToggle, handleToggleExpand,
    router, t, suggestedPosts
  ]);

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div style={{ padding: 16, background: 'var(--bg-main)', minHeight: '100dvh' }}>
        {[1, 2].map(i => (
          <div key={i} style={{ marginBottom: 20, background: 'var(--bg-card)', padding: 16, borderRadius: 16, border: '1px solid var(--border-card)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div className="skeleton-block" style={{ width: 42, height: 42, borderRadius: '50%' }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton-block" style={{ width: '40%', height: 14, marginBottom: 6 }}></div>
                <div className="skeleton-block" style={{ width: '20%', height: 10 }}></div>
              </div>
            </div>
            <div className="skeleton-block" style={{ width: '100%', height: 12, marginBottom: 8 }}></div>
            <div className="skeleton-block" style={{ width: '90%', height: 12, marginBottom: 8 }}></div>
            <div className="skeleton-block" style={{ width: '60%', height: 12, marginBottom: 16 }}></div>
            {i === 1 && <div className="skeleton-block" style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 16 }}></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton-block" style={{ width: 80, height: 28, borderRadius: 20 }}></div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div className="skeleton-block" style={{ width: 24, height: 24, borderRadius: '50%' }}></div>
                <div className="skeleton-block" style={{ width: 24, height: 24, borderRadius: '50%' }}></div>
                <div className="skeleton-block" style={{ width: 24, height: 24, borderRadius: '50%' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-main)', minHeight: '100dvh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Gagal memuat feed.</p>
        <button onClick={() => refetch()} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, background: '#1f3cff', color: 'white', border: 'none', cursor: 'pointer' }}>Coba lagi</button>
      </div>
    );
  }

  return (
    <section style={{ width: '100%', maxWidth: '100%', padding: 0, margin: 0, background: 'var(--bg-main)', minHeight: '100dvh' }}>
      <RepostModal
        isOpen={!!repostModal}
        postId={repostModal?.postId || ''}
        creatorId={repostModal?.creatorId || ''}
        note={repostNote}
        setNote={setRepostNote}
        onClose={() => setRepostModal(null)}
        onConfirm={handleConfirmRepost}
        isUnrepost={repostModal?.isUnrepost || false}
      />
      <ImagePreview imageUrl={activePreviewImage} onClose={() => setActivePreviewImage(null)} />

      <Virtuoso
        useWindowScroll
        data={allPosts}
        endReached={loadMore}
        overscan={{ main: 600, reverse: 600 }}
        increaseViewportBy={{ top: 400, bottom: 400 }}
        itemContent={renderItem}
        components={{
          Footer: () => isFetchingNextPage ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
              <div className="pure-spinner"></div>
            </div>
          ) : null
        }}
      />
    </section>
  );
}
