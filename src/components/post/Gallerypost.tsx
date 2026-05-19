'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { sendPushAndAppNotif } from '@/lib/notif';
import PostCard from './PostCard';
import RepostModal from './RepostModal';
import ImagePreview from './ImagePreview';
import SuggestedUsers from './SuggestedUsers';
import { Virtuoso } from 'react-virtuoso';
import './Gallery.css';

const getOptimizedImage = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('res.cloudinary.com') && !cleanUrl.includes('f_auto')) {
    return cleanUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_800/');
  }
  return cleanUrl;
};

// 🔥 Memoization tingkat tinggi biar video nggak kereset 🔥
const MemoizedPostCard = React.memo(PostCard, (prevProps, nextProps) => {
  const pid = prevProps.post.id;
  
  if (prevProps.post !== nextProps.post) return false;
  if (prevProps.myLikedPosts.has(pid) !== nextProps.myLikedPosts.has(pid)) return false;
  if (prevProps.myRepostedPosts.has(pid) !== nextProps.myRepostedPosts.has(pid)) return false;
  if (prevProps.mySavedPosts.has(pid) !== nextProps.mySavedPosts.has(pid)) return false;

  const prevCount = prevProps.counts[pid];
  const nextCount = nextProps.counts[pid];
  if (JSON.stringify(prevCount) !== JSON.stringify(nextCount)) return false;

  if (prevProps.poppingHeart !== nextProps.poppingHeart && (prevProps.poppingHeart === pid || nextProps.poppingHeart === pid)) return false;
  if (prevProps.animatingFollows.has(prevProps.post.creator_id) !== nextProps.animatingFollows.has(nextProps.post.creator_id)) return false;
  if (prevProps.animatingReposts.has(pid) !== nextProps.animatingReposts.has(pid)) return false;
  if (prevProps.isGloballyMuted !== nextProps.isGloballyMuted) return false;
  if (prevProps.activePreviewImage !== nextProps.activePreviewImage) return false;

  if (prevProps.followedUsers.has(prevProps.post.creator_id) !== nextProps.followedUsers.has(nextProps.post.creator_id)) return false;
  if (prevProps.mutualUsers.has(prevProps.post.creator_id) !== nextProps.mutualUsers.has(nextProps.post.creator_id)) return false;

  if (prevProps.likersMap[pid] !== nextProps.likersMap[pid]) return false;
  if (prevProps.repostersMap[pid] !== nextProps.repostersMap[pid]) return false;

  return true;
});

export default function Gallerypost() {
  const { t } = useTranslation();
  const router = useRouter();

  const [posts, setPosts] = useState<any[]>([]);
  const [suggestedPosts, setSuggestedPosts] = useState<any[]>([]);
  const [randomSliderIndex, setRandomSliderIndex] = useState(2);
  const [randomFriendIndex, setRandomFriendIndex] = useState(4);

  const [isLoading, setIsLoading] = useState(true);
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

  const viewObserverRef = useRef<IntersectionObserver | null>(null);
  const viewedPostsRef = useRef<Set<string>>(new Set());
  const viewTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const activeMediaRef = useRef<Set<string>>(new Set());

  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const lastTapRef = useRef<Record<string, number>>({});
  const [currentCategory, setCurrentCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [isGloballyMuted, setIsGloballyMuted] = useState(true);
  const isMutedRef = useRef(true);
  const POSTS_PER_PAGE = 15;

  const [repostModal, setRepostModal] = useState<{ isOpen: boolean; postId: string; creatorId: string } | null>(null);
  const [repostNote, setRepostNote] = useState("");

  const followedUsersRef = useRef(followedUsers);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { followedUsersRef.current = followedUsers; }, [followedUsers]);

  useEffect(() => {
    return () => {
      if (viewObserverRef.current) viewObserverRef.current.disconnect();
      if (observerRef.current) observerRef.current.disconnect();
      Object.values(viewTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const gallery = document.getElementById('mainGallery');
    if (!gallery) return;

    let timeout: NodeJS.Timeout;
    const mutationObserver = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        initAutoPlayObserver();
        initViewTrackingObserver();
      }, 300);
    });

    mutationObserver.observe(gallery, { childList: true, subtree: true });
    return () => {
      mutationObserver.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const handleCommentRefresh = (e: any) => {
      const postId = String(e.detail.postId);
      if (postId) {
        setCounts((prev) => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            comments: (prev[postId]?.comments || 0) + 1,
          },
        }));
      }
    };
    window.addEventListener('commentAdded', handleCommentRefresh);
    return () => window.removeEventListener('commentAdded', handleCommentRefresh);
  }, []);

  useEffect(() => {
    const handleCategoryChange = (e: any) => {
      const newCat = e.detail.category;
      setCurrentCategory(newCat);
      setPage(1);
      fetchPosts(newCat, currentUser, 1, false, mutualUsers);
    };
    window.addEventListener('changeCategory', handleCategoryChange);
    return () => window.removeEventListener('changeCategory', handleCategoryChange);
  }, [currentUser, mutualUsers]);

  useEffect(() => {
    initGallery();
  }, []);

  const initGallery = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    setCurrentUser(user);

    let currentMutuals = new Set<string>();
    if (user) {
      const [followsRes, followersRes] = await Promise.all([
        supabase.from('followers').select('following_id').eq('follower_id', user.id),
        supabase.from('followers').select('follower_id').eq('following_id', user.id),
      ]);
      if (followsRes.data) {
        const followingSet = new Set(followsRes.data.map((f) => String(f.following_id)));
        setFollowedUsers(followingSet);
        if (followersRes.data) {
          const followerSet = new Set(followersRes.data.map((f) => String(f.follower_id)));
          currentMutuals = new Set([...followingSet].filter((x) => followerSet.has(x)));
          setMutualUsers(currentMutuals);
        }
      }
    }
    await fetchPosts("all", user, 1, false, currentMutuals);
    await fetchSuggestedPosts();
  };

  const fetchSuggestedPosts = async () => {
    try {
      const { data } = await supabase.from('posts').select('id, creator_id, image_url, bio, profiles:creator_id (username, avatar_url)').eq('status', 'approved').eq('is_private', false).neq('image_url', null).limit(20);
      if (data) {
        setSuggestedPosts(data.sort(() => 0.5 - Math.random()).slice(0, 6));
        setRandomSliderIndex(Math.floor(Math.random() * 2) + 1);
        setRandomFriendIndex(Math.floor(Math.random() * 2) + 3);
      }
    } catch (err) {}
  };

  const fetchPosts = async (category = "all", userObj = currentUser, pageNumber = 1, isLoadMore = false, mutuals = mutualUsers) => {
    if (isLoadMore) setIsLoadingMore(true);
    else setIsLoading(true);

    try {
      const from = (pageNumber - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      let query = supabase.from("posts").select(`id, image_url, video_url, audio_src, title, artist, bio, created_at, creator_id, category, views, is_private, is_ad, profiles:creator_id (full_name, username, role, avatar_url, is_private)`).eq("status", "approved").order("created_at", { ascending: false }).range(from, to);
      if (category && category !== "all") query = query.ilike("category", `%${category.trim()}%`);

      const { data: rawPosts } = await query;
      let fetchedPosts = (rawPosts || []).filter((post) => {
        if (!post.profiles?.is_private) return true;
        if (userObj && post.creator_id === userObj.id) return true;
        if (userObj && mutuals.has(post.creator_id)) return true;
        return false;
      });

      setHasMore((rawPosts || []).length === POSTS_PER_PAGE);

      if (category === "all" && !isLoadMore) {
        fetchedPosts = [...fetchedPosts].sort(() => Math.random() - 0.5);
      }

      if (fetchedPosts.length > 0) {
        const postIds = fetchedPosts.map((p) => p.id);

        const [likesRes, commentsRes, repostsRes, savesRes] = await Promise.all([
          supabase.from("likes").select("post_id, user_id, profiles:user_id(id, username, avatar_url)").in("post_id", postIds),
          supabase.from("comments").select("post_id").in("post_id", postIds),
          supabase.from("reposts").select("post_id, user_id, note, profiles:user_id(id, username, avatar_url)").in("post_id", postIds),
          supabase.from("bookmarks").select("post_id").in("post_id", postIds),
        ]);

        const newCounts: any = {};
        const newLikersMap: any = {};
        const newRepostersMap: any = {};

        postIds.forEach((id) => {
          newCounts[id] = { likes: 0, comments: 0, reposts: 0, saves: 0 };
          newLikersMap[id] = [];
          newRepostersMap[id] = [];
        });

        likesRes.data?.forEach((l) => {
          if (newCounts[l.post_id]) {
            newCounts[l.post_id].likes++;
            if (l.profiles) newLikersMap[l.post_id].push(l.profiles);
          }
        });

        commentsRes.data?.forEach((c) => { if (newCounts[c.post_id]) newCounts[c.post_id].comments++; });
        repostsRes.data?.forEach((r) => {
          if (newCounts[r.post_id]) {
            newCounts[r.post_id].reposts++;
            if (r.profiles) newRepostersMap[r.post_id].push({ ...r.profiles, note: r.note });
          }
        });
        savesRes.data?.forEach((s) => { if (newCounts[s.post_id]) newCounts[s.post_id].saves++; });

        setCounts((prev) => (isLoadMore ? { ...prev, ...newCounts } : newCounts));
        setLikersMap((prev) => (isLoadMore ? { ...prev, ...newLikersMap } : newLikersMap));
        setRepostersMap((prev) => (isLoadMore ? { ...prev, ...newRepostersMap } : newRepostersMap));

        if (userObj) {
          const { data: myLikes } = await supabase.from("likes").select("post_id").eq("user_id", userObj.id).in("post_id", postIds);
          const { data: myReposts } = await supabase.from("reposts").select("post_id").eq("user_id", userObj.id).in("post_id", postIds);
          const { data: mySaves } = await supabase.from("bookmarks").select("post_id").eq("user_id", userObj.id).in("post_id", postIds);

          setMyLikedPosts(isLoadMore ? new Set([...myLikedPosts, ...(myLikes?.map((l) => String(l.post_id)) || [])]) : new Set(myLikes?.map((l) => String(l.post_id))));
          setMyRepostedPosts(isLoadMore ? new Set([...myRepostedPosts, ...(myReposts?.map((r) => String(r.post_id)) || [])]) : new Set(myReposts?.map((r) => String(r.post_id))));
          setMySavedPosts(isLoadMore ? new Set([...mySavedPosts, ...(mySaves?.map((s) => String(s.post_id)) || [])]) : new Set(mySaves?.map((s) => String(s.post_id))));
        }
      }

      if (isLoadMore) setPosts((prev) => [...prev, ...fetchedPosts]);
      else setPosts(fetchedPosts);
    } catch (err) {} finally { setIsLoading(false); setIsLoadingMore(false); }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(currentCategory, currentUser, nextPage, true, mutualUsers);
    }
  };

  const openShareOptions = useCallback((post: any, isOwner: boolean) => {
    if (window.openGlobalShare) {
      window.openGlobalShare(`${window.location.origin}/post?id=${post.id}`, "Postingan HypeTalk", "Lihat karya keren ini di HypeTalk!", post.profiles?.username || "User", post.id, isOwner, post.is_private || false);
    }
  }, []);

  const handleFollowToggle = useCallback(async (e: any, creatorId: string) => {
    e.stopPropagation();
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));
    if (currentUserRef.current.id === creatorId) return;

    const isFollowing = followedUsersRef.current.has(creatorId);
    setAnimatingFollows((prev) => new Set(prev).add(creatorId));
    setTimeout(() => {
      setAnimatingFollows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(creatorId);
        return newSet;
      });
    }, 200);

    setFollowedUsers((prev) => {
      const newSet = new Set(prev);
      isFollowing ? newSet.delete(creatorId) : newSet.add(creatorId);
      return newSet;
    });

    try {
      if (isFollowing) await supabase.from("followers").delete().match({ follower_id: currentUserRef.current.id, following_id: creatorId });
      else {
        const { error } = await supabase.from("followers").insert({ follower_id: currentUserRef.current.id, following_id: creatorId });
        if (!error) await sendPushAndAppNotif({ senderId: currentUserRef.current.id, receiverId: creatorId, type: "follow" });
      }
    } catch (err) {}
  }, []);

  const handleLike = useCallback(async (postId: string, creatorId: string) => {
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));
    const numericPostId = parseInt(postId);

    setMyLikedPosts((prev) => {
      const newSet = new Set(prev);
      const isLiked = newSet.has(postId);
      
      if (isLiked) {
        newSet.delete(postId);
        setCounts((c) => ({ ...c, [postId]: { ...c[postId], likes: Math.max(0, (c[postId]?.likes || 0) - 1) } }));
        supabase.from("likes").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id }).then();
      } else {
        newSet.add(postId);
        setCounts((c) => ({ ...c, [postId]: { ...c[postId], likes: (c[postId]?.likes || 0) + 1 } }));
        supabase.from("likes").insert({ post_id: numericPostId, user_id: currentUserRef.current.id }).then(({ error }) => {
          if (!error && creatorId !== currentUserRef.current.id) {
            sendPushAndAppNotif({ senderId: currentUserRef.current.id, receiverId: creatorId, type: "like", postId: postId });
          }
        });
      }
      return newSet;
    });
  }, []);

  const handleMediaClick = useCallback((e: React.MouseEvent, postId: string, creatorId: string, imageUrl?: string) => {
    const now = Date.now();
    const lastTapTime = lastTapRef.current[postId] || 0;

    if (now - lastTapTime < 350) {
      lastTapRef.current[postId] = 0;
      if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));

      setPoppingHeart(postId);
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
  }, [handleLike]);

  const handleConfirmRepost = useCallback(async (postId: string, creatorId: string, isUnrepost: boolean = false) => {
    const numericPostId = parseInt(postId);
    const finalNote = repostNote.trim().substring(0, 15);
    setRepostModal(null);

    setAnimatingReposts((prev) => new Set(prev).add(postId));
    setTimeout(() => setAnimatingReposts((prev) => { const newSet = new Set(prev); newSet.delete(postId); return newSet; }), 500);

    setMyRepostedPosts((prev) => {
      const newSet = new Set(prev);
      if (isUnrepost) {
        newSet.delete(postId);
        setCounts((c) => ({ ...c, [postId]: { ...c[postId], reposts: Math.max(0, (c[postId]?.reposts || 0) - 1) } }));
        supabase.from("reposts").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id }).then();
      } else {
        newSet.add(postId);
        setCounts((c) => ({ ...c, [postId]: { ...c[postId], reposts: (c[postId]?.reposts || 0) + 1 } }));
        supabase.from("reposts").insert({ post_id: numericPostId, user_id: currentUserRef.current.id, note: finalNote }).then();
      }
      return newSet;
    });
  }, [repostNote]);

  const handleSave = useCallback(async (postId: string) => {
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));
    const numericPostId = parseInt(postId);

    setMySavedPosts((prev) => {
      const newSet = new Set(prev);
      const isSaved = newSet.has(postId);
      if (isSaved) {
        newSet.delete(postId);
        setCounts((c) => ({ ...c, [postId]: { ...c[postId], saves: Math.max(0, (c[postId]?.saves || 0) - 1) } }));
        supabase.from("bookmarks").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id }).then();
      } else {
        newSet.add(postId);
        setCounts((c) => ({ ...c, [postId]: { ...c[postId], saves: (c[postId]?.saves || 0) + 1 } }));
        supabase.from("bookmarks").insert({ post_id: numericPostId, user_id: currentUserRef.current.id }).then();
      }
      return newSet;
    });
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGloballyMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      document.querySelectorAll(".post-audio-element, .post-video-element").forEach((el: any) => { el.muted = next; });
      return next;
    });
  }, []);

  const initAutoPlayObserver = () => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const card = entry.target;
          const postId = card.getAttribute("data-postid");
          const media = card.querySelector(".post-audio-element, .post-video-element") as HTMLMediaElement; 

          if (!media || !postId) return;

          if (entry.isIntersecting) {
            if (!activeMediaRef.current.has(postId)) {
              
              document.querySelectorAll(".post-audio-element, .post-video-element").forEach((el: any) => {
                if (el !== media && !el.paused) el.pause();
              });

              activeMediaRef.current.add(postId); 
              media.muted = isMutedRef.current;
              media.currentTime = 0; 
              media.play().catch(() => {});
            } else {
              media.muted = isMutedRef.current;
              if (media.paused) media.play().catch(()=>{});
            }
          } else {
            media.pause();
            activeMediaRef.current.delete(postId);
          }
        });
      },
      { threshold: 0.6 }
    );

    document.querySelectorAll(".card").forEach((card) => observerRef.current?.observe(card));
  };

  const initViewTrackingObserver = () => {
    if (viewObserverRef.current) viewObserverRef.current.disconnect();
    viewObserverRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const postId = entry.target.getAttribute("data-postid");
          if (!postId) return;

          if (entry.isIntersecting) {
            if (!viewedPostsRef.current.has(postId) && !viewTimersRef.current[postId]) {
              viewTimersRef.current[postId] = setTimeout(async () => {
                viewedPostsRef.current.add(postId);
                delete viewTimersRef.current[postId];
                try {
                  const { data } = await supabase.from("posts").select("views").eq("id", postId).single();
                  await supabase.from("posts").update({ views: (data?.views || 0) + 1 }).eq("id", postId);
                } catch (err) {}
              }, 2000);
            }
          } else {
            if (viewTimersRef.current[postId]) {
              clearTimeout(viewTimersRef.current[postId]);
              delete viewTimersRef.current[postId];
            }
          }
        });
      }, { threshold: 0.6 }
    );
    document.querySelectorAll(".card[data-postid]").forEach((card) => { viewObserverRef.current?.observe(card); });
  };

  return (
    <section>
      <style>{`
        .btn-press { transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .btn-press:active { transform: scale(0.85); }
        .pure-spinner { width: 30px; height: 30px; border: 3px solid var(--border-card); border-top-color: #1f3cff; border-radius: 50%; animation: pureSpin 1s linear infinite; }
        @keyframes pureSpin { 100% { transform: rotate(360deg); } }
        .slider-recommendation::-webkit-scrollbar { display: none; }
      `}</style>

      <RepostModal isOpen={!!repostModal} postId={repostModal?.postId || ''} creatorId={repostModal?.creatorId || ''} note={repostNote} setNote={setRepostNote} onClose={() => setRepostModal(null)} onConfirm={() => { if (repostModal) handleConfirmRepost(repostModal.postId, repostModal.creatorId, false); }} />
      <ImagePreview imageUrl={activePreviewImage} onClose={() => setActivePreviewImage(null)} />

      <div className="gallery" id="mainGallery">
        {isLoading ? (
          <div className="gallery-skeleton-wrapper"><div className="gallery-skeleton-card"><div className="gallery-skeleton-shimmer" /></div></div>
        ) : posts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '50px' }}>{t('no_posts_found')}</p>
        ) : (
          <Virtuoso
            useWindowScroll
            data={posts}
            endReached={handleLoadMore}
            overscan={500}
            itemContent={(index, post) => (
              <React.Fragment key={post.id}>
                {index === randomSliderIndex && suggestedPosts.length > 0 && (
                  <div style={{ margin: '15px 0 35px 0', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-card)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '15px' }}><span className="material-icons" style={{ color: '#ff2e63', fontSize: '20px' }}>local_fire_department</span><h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>Rekomendasi Postingan</h3></div>
                    <div className="slider-recommendation" style={{ display: 'flex', overflowX: 'auto', gap: '12px', scrollbarWidth: 'none', scrollSnapType: 'x mandatory', paddingBottom: '5px' }}>
                      {suggestedPosts.map(sp => {
                        const img = sp.image_url ? sp.image_url.split(',')[0] : '';
                        return (
                          <div key={`sugg-${String(sp.id)}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/post?id=${String(sp.id)}&from=home`; }} style={{ minWidth: '150px', maxWidth: '150px', background: 'var(--bg-main)', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-card)', scrollSnapAlign: 'start', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ width: '100%', height: '160px', background: '#000', position: 'relative' }}><img src={getOptimizedImage(img) || '/asets/png/placeholder.png'} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                            <div style={{ padding: '10px' }}><p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sp.bio || 'Tanpa Caption'}</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><img src={getOptimizedImage(sp.profiles?.avatar_url) || '/asets/png/profile.webp'} style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} alt="av" /><span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.profiles?.username}</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {index === randomFriendIndex && <SuggestedUsers myId={currentUser?.id} followedUsers={followedUsers} />}
                
                <MemoizedPostCard
                  post={post}
                  currentUser={currentUser}
                  // 🔥 TAMBAHKAN INI BIAR FLOATING BUBBLES AMAN 🔥
                  isOwner={currentUser?.id === post.creator_id}
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
                  openRepostModal={(id, cid) => { if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent('openLogin')); setRepostNote(""); setRepostModal({ isOpen: true, postId: id, creatorId: cid }); }}
                  handleMediaClick={handleMediaClick}
                  toggleMute={toggleMute}
                  openShareOptions={openShareOptions}
                  handleFollowToggle={handleFollowToggle}
                  setActivePreviewImage={setActivePreviewImage}
                  router={router}
                  t={t}
                />
              </React.Fragment>
            )}
            components={{ Footer: () => (<div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0 80px 0', width: '100%' }}>{isLoadingMore ? <div className="pure-spinner"></div> : hasMore ? <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Scroll ke bawah untuk memuat...</span> : <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-icons" style={{ fontSize: '14px', color: '#1f3cff' }}>check_circle</span>Tidak ada postingan lagi</span>}</div>) }}
          />
        )}
      </div>
    </section>
  );
}
