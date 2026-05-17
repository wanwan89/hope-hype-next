'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils'; 
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation'; 
import { sendPushAndAppNotif } from '@/lib/notif'; 
import { motion, AnimatePresence } from 'framer-motion'; 
import './Gallery.css';

// Kompres Gambar Cloudinary
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

export default function Gallerypost() {
  const { t } = useTranslation();
  const router = useRouter(); 

  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [myLikedPosts, setMyLikedPosts] = useState<Set<string>>(new Set());
  const [myRepostedPosts, setMyRepostedPosts] = useState<Set<string>>(new Set());
  const [mySavedPosts, setMySavedPosts] = useState<Set<string>>(new Set());
  
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [mutualUsers, setMutualUsers] = useState<Set<string>>(new Set());
  const [animatingFollows, setAnimatingFollows] = useState<Set<string>>(new Set());
  
  const [counts, setCounts] = useState<Record<string, { likes: number, comments: number, reposts: number, saves: number }>>({});
  const [animatingReposts, setAnimatingReposts] = useState<Set<string>>(new Set());
  
  // 🔥 MAP UNTUK MENYIMPAN TEMAN YANG MELIKE/MEREPOST (BUBBLE) 🔥
  const [likersMap, setLikersMap] = useState<Record<string, any[]>>({});
  const [repostersMap, setRepostersMap] = useState<Record<string, any[]>>({});

  const [poppingHeart, setPoppingHeart] = useState<string | null>(null); // 🔥 STATE UNTUK EFEK MELETUP (LOVE MERAH) 🔥

  const observerRef = useRef<IntersectionObserver | null>(null);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const viewObserverRef = useRef<IntersectionObserver | null>(null);
  const viewedPostsRef = useRef<Set<string>>(new Set());
  const viewTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const lastTapRef = useRef<Record<string, number>>({}); 

  const [currentCategory, setCurrentCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const POSTS_PER_PAGE = 15;

  const [isGloballyMuted, setIsGloballyMuted] = useState(true);
  const isMutedRef = useRef(true);

  // 🔥 STATE MODAL REPOST NOTE 🔥
  const [repostModal, setRepostModal] = useState<{isOpen: boolean, postId: string, creatorId: string} | null>(null);
  const [repostNote, setRepostNote] = useState("");

  useEffect(() => {
    return () => {
      if (viewObserverRef.current) viewObserverRef.current.disconnect();
      Object.values(viewTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, page, currentCategory, mutualUsers]);

  useEffect(() => {
    const handleCommentRefresh = (e: any) => {
      const postId = String(e.detail.postId);
      if (postId) {
        setCounts(prev => ({
          ...prev,
          [postId]: { 
            ...prev[postId], 
            comments: (prev[postId]?.comments || 0) + 1 
          }
        }));
      }
    };

    window.addEventListener('commentAdded', handleCommentRefresh);
    return () => window.removeEventListener('commentAdded', handleCommentRefresh);
  }, []);

  useEffect(() => { initGallery(); }, []);

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

  const initGallery = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    setCurrentUser(user);

    let currentMutuals = new Set<string>();

    if (user) {
      const [followsRes, followersRes] = await Promise.all([
        supabase.from('followers').select('following_id').eq('follower_id', user.id),
        supabase.from('followers').select('follower_id').eq('following_id', user.id)
      ]);

      if (followsRes.data) {
        const followingSet = new Set(followsRes.data.map(f => String(f.following_id)));
        setFollowedUsers(followingSet);

        if (followersRes.data) {
          const followerSet = new Set(followersRes.data.map(f => String(f.follower_id)));
          currentMutuals = new Set([...followingSet].filter(x => followerSet.has(x)));
          setMutualUsers(currentMutuals);
        }
      }
    }

    await fetchPosts("all", user, 1, false, currentMutuals);
  };

  const fetchPosts = async (category = "all", userObj = currentUser, pageNumber = 1, isLoadMore = false, mutuals = mutualUsers) => {
    if (isLoadMore) setIsLoadingMore(true);
    else setIsLoading(true);

    try {
      const from = (pageNumber - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      let query = supabase.from("posts")
        .select(`id, image_url, video_url, audio_src, title, artist, bio, created_at, creator_id, category, views, is_private, is_ad, profiles:creator_id (full_name, username, role, avatar_url, is_private)`)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .range(from, to); 

      if (category && category !== "all") {
        query = query.ilike("category", `%${category.trim()}%`);
      }

      const { data: rawPosts, error } = await query;
      if (error) throw error;

      let fetchedPosts = (rawPosts || []).filter(post => {
        if (!post.profiles?.is_private) return true; 
        if (userObj && post.creator_id === userObj.id) return true; 
        if (userObj && mutuals.has(post.creator_id)) return true; 
        return false; 
      });
      
      setHasMore((rawPosts || []).length === POSTS_PER_PAGE);

      if (category === "all" && !isLoadMore) fetchedPosts = [...fetchedPosts].sort(() => Math.random() - 0.5);

      if (fetchedPosts.length > 0) {
        const postIds = fetchedPosts.map(p => p.id);
        
        const [likesRes, commentsRes, repostsRes, savesRes] = await Promise.all([
          supabase.from("likes").select("post_id, user_id, profiles:user_id(id, username, avatar_url)").in("post_id", postIds),
          supabase.from("comments").select("post_id").in("post_id", postIds),
          supabase.from("reposts").select("post_id, user_id, note, profiles:user_id(id, username, avatar_url)").in("post_id", postIds),
          supabase.from("bookmarks").select("post_id").in("post_id", postIds)
        ]);

        const newCounts: any = {};
        const newLikersMap: any = {}; 
        const newRepostersMap: any = {};

        postIds.forEach(id => { 
          newCounts[id] = { likes: 0, comments: 0, reposts: 0, saves: 0 }; 
          newLikersMap[id] = []; 
          newRepostersMap[id] = [];
        });
        
        likesRes.data?.forEach(l => { 
          if(newCounts[l.post_id]) {
            newCounts[l.post_id].likes++; 
            if (l.profiles) newLikersMap[l.post_id].push(l.profiles);
          }
        });
        
        commentsRes.data?.forEach(c => { if(newCounts[c.post_id]) newCounts[c.post_id].comments++; });
        
        repostsRes.data?.forEach(r => { 
          if(newCounts[r.post_id]) {
            newCounts[r.post_id].reposts++; 
            if (r.profiles) newRepostersMap[r.post_id].push({ ...r.profiles, note: r.note });
          }
        });

        savesRes.data?.forEach(s => { if(newCounts[s.post_id]) newCounts[s.post_id].saves++; });
        
        setCounts(prev => isLoadMore ? { ...prev, ...newCounts } : newCounts);
        setLikersMap(prev => isLoadMore ? { ...prev, ...newLikersMap } : newLikersMap);
        setRepostersMap(prev => isLoadMore ? { ...prev, ...newRepostersMap } : newRepostersMap);

        if (userObj) {
          const { data: myLikes } = await supabase.from("likes").select("post_id").eq("user_id", userObj.id).in("post_id", postIds);
          const { data: myReposts } = await supabase.from("reposts").select("post_id").eq("user_id", userObj.id).in("post_id", postIds);
          const { data: mySaves } = await supabase.from("bookmarks").select("post_id").eq("user_id", userObj.id).in("post_id", postIds);
          
          setMyLikedPosts(prev => isLoadMore ? new Set([...prev, ...(myLikes?.map(l => String(l.post_id)) || [])]) : new Set(myLikes?.map(l => String(l.post_id))));
          setMyRepostedPosts(prev => isLoadMore ? new Set([...prev, ...(myReposts?.map(r => String(r.post_id)) || [])]) : new Set(myReposts?.map(r => String(r.post_id))));
          setMySavedPosts(prev => isLoadMore ? new Set([...prev, ...(mySaves?.map(s => String(s.post_id)) || [])]) : new Set(mySaves?.map(s => String(s.post_id))));
        }
      }

      if (isLoadMore) setPosts(prev => [...prev, ...fetchedPosts]);
      else setPosts(fetchedPosts);

      setTimeout(() => {
        initAutoPlayObserver();
        initViewTrackingObserver(); 
      }, 500);

    } catch (err) { console.error(err); } finally { setIsLoading(false); setIsLoadingMore(false); }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(currentCategory, currentUser, nextPage, true, mutualUsers);
    }
  };

  const openShareOptions = (post: any, isOwner: boolean) => {
    if (window.openGlobalShare) {
      window.openGlobalShare(
        `${window.location.origin}/post?id=${post.id}`, 
        "Postingan HypeTalk", 
        "Lihat karya keren ini di HypeTalk!", 
        post.profiles?.username || 'User', 
        post.id, 
        isOwner, 
        post.is_private || false 
      );
    }
  };

  const handleFollowToggle = async (e: any, creatorId: string) => {
    e.stopPropagation(); 
    if (!currentUser) return window.dispatchEvent(new CustomEvent('openLogin'));
    if (currentUser.id === creatorId) return; 

    const isFollowing = followedUsers.has(creatorId);

    setAnimatingFollows(prev => new Set(prev).add(creatorId));
    setTimeout(() => {
      setAnimatingFollows(prev => {
        const newSet = new Set(prev);
        newSet.delete(creatorId);
        return newSet;
      });
    }, 200);

    setFollowedUsers(prev => {
      const newSet = new Set(prev);
      isFollowing ? newSet.delete(creatorId) : newSet.add(creatorId);
      return newSet;
    });

    try {
      if (isFollowing) {
        await supabase.from("followers").delete().match({ follower_id: currentUser.id, following_id: creatorId });
      } else {
        const { error } = await supabase.from("followers").insert({ follower_id: currentUser.id, following_id: creatorId });
        if (error && error.code !== '23505') throw error; 
        
        if (!error) {
          await sendPushAndAppNotif({
            senderId: currentUser.id,
            receiverId: creatorId,
            type: 'follow',
          });
        }
      }
    } catch (err) { console.error("Follow error", err); }
  };

  const handleLike = async (postId: string, creatorId: string) => {
    if (!currentUser) return window.dispatchEvent(new CustomEvent('openLogin'));
    const isLiked = myLikedPosts.has(postId);
    const numericPostId = parseInt(postId);
    
    setMyLikedPosts(prev => {
      const newSet = new Set(prev);
      isLiked ? newSet.delete(postId) : newSet.add(postId);
      return newSet;
    });

    setCounts(prev => ({
      ...prev,
      [postId]: { ...prev[postId], likes: Math.max(0, (prev[postId]?.likes || 0) + (isLiked ? -1 : 1)) }
    }));

    try {
      if (isLiked) {
        await supabase.from("likes").delete().match({ post_id: numericPostId, user_id: currentUser.id });
      } else {
        const { error } = await supabase.from("likes").insert({ post_id: numericPostId, user_id: currentUser.id });
        if (error && error.code !== '23505') throw error; 
        
        if (!error && creatorId !== currentUser.id) {
          await sendPushAndAppNotif({
            senderId: currentUser.id,
            receiverId: creatorId,
            type: 'like',
            postId: postId
          });
        }
      }
    } catch (err) { console.error("Like error", err); }
  };

  const handleMediaClick = (e: React.MouseEvent, postId: string, creatorId: string, imageUrl?: string) => {
    const now = Date.now();
    const lastTapTime = lastTapRef.current[postId] || 0;
    
    if (now - lastTapTime < 350) {
      lastTapRef.current[postId] = 0; 
      if (!currentUser) return window.dispatchEvent(new CustomEvent('openLogin'));

      // 🔥 FIX: MUNCULKAN HANYA EFEK LOVE MERAH MELETUP SAAT DOUBLE TAP 🔥
      setPoppingHeart(postId);

      setTimeout(() => {
        setPoppingHeart(null);
      }, 1000);

      // Otomatis Like jika belum dilike
      if (!myLikedPosts.has(postId)) {
        handleLike(postId, creatorId);
      }

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
  };

  const openRepostModal = (postId: string, creatorId: string) => {
    if (!currentUser) return window.dispatchEvent(new CustomEvent('openLogin'));
    const isReposted = myRepostedPosts.has(postId);
    
    if (isReposted) {
      handleConfirmRepost(postId, creatorId, true);
    } else {
      setRepostNote("");
      setRepostModal({ isOpen: true, postId, creatorId });
    }
  };

  const handleConfirmRepost = async (postId: string, creatorId: string, isUnrepost: boolean = false) => {
    const numericPostId = parseInt(postId);
    const finalNote = repostNote.trim().substring(0, 15);
    setRepostModal(null); 

    setAnimatingReposts(prev => new Set(prev).add(postId));
    setTimeout(() => setAnimatingReposts(prev => {
      const newSet = new Set(prev);
      newSet.delete(postId);
      return newSet;
    }), 500);

    setMyRepostedPosts(prev => {
      const newSet = new Set(prev);
      isUnrepost ? newSet.delete(postId) : newSet.add(postId);
      return newSet;
    });

    setCounts(prev => ({
      ...prev,
      [postId]: { ...prev[postId], reposts: Math.max(0, (prev[postId]?.reposts || 0) + (isUnrepost ? -1 : 1)) }
    }));

    try {
      if (isUnrepost) {
        await supabase.from("reposts").delete().match({ post_id: numericPostId, user_id: currentUser.id });
      } else {
        const { error } = await supabase.from("reposts").insert({ post_id: numericPostId, user_id: currentUser.id, note: finalNote });
        if (error && error.code !== '23505') throw error;
      }
    } catch (err) { console.error("Repost error", err); }
  };

  const handleSave = async (postId: string) => {
    if (!currentUser) return window.dispatchEvent(new CustomEvent('openLogin'));
    const isSaved = mySavedPosts.has(postId);
    const numericPostId = parseInt(postId);

    setMySavedPosts(prev => {
      const newSet = new Set(prev);
      isSaved ? newSet.delete(postId) : newSet.add(postId);
      return newSet;
    });

    setCounts(prev => ({
      ...prev,
      [postId]: { ...prev[postId], saves: Math.max(0, (prev[postId]?.saves || 0) + (isSaved ? -1 : 1)) }
    }));

    try {
      if (isSaved) {
        await supabase.from("bookmarks").delete().match({ post_id: numericPostId, user_id: currentUser.id });
      } else {
        const { error } = await supabase.from("bookmarks").insert({ post_id: numericPostId, user_id: currentUser.id });
        if (error && error.code !== '23505') throw error; 
      }
    } catch (err) { console.error("Save error", err); }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isGloballyMuted;
    setIsGloballyMuted(nextMuted);
    isMutedRef.current = nextMuted;

    document.querySelectorAll('.post-audio-element, .post-video-element').forEach((el: any) => {
      el.muted = nextMuted;
    });
  };

  const initAutoPlayObserver = () => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const audio = entry.target.querySelector('.post-audio-element') as HTMLAudioElement;
        const video = entry.target.querySelector('.post-video-element') as HTMLVideoElement;

        if (entry.isIntersecting) {
          if (audio) {
            document.querySelectorAll('.post-audio-element').forEach(el => { 
              if (el !== audio) { (el as HTMLAudioElement).pause(); }
            });
            audio.currentTime = 0;
            audio.volume = 1.0;
            audio.muted = isMutedRef.current; 
            audio.play().catch(() => {});
          }

          if (video) {
            document.querySelectorAll('.post-video-element').forEach(el => { 
              if (el !== video) { (el as HTMLVideoElement).pause(); }
            });
            video.muted = isMutedRef.current; 
            video.play().catch(() => {});
          }

        } else {
          if (audio) audio.pause();
          if (video) video.pause();
        }
      });
    }, { threshold: 0.6 });

    document.querySelectorAll('.card').forEach(card => observerRef.current?.observe(card));
  };

  const initViewTrackingObserver = () => {
    if (viewObserverRef.current) viewObserverRef.current.disconnect();

    viewObserverRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const postId = entry.target.getAttribute('data-postid');
        if (!postId) return;

        if (entry.isIntersecting) {
          if (!viewedPostsRef.current.has(postId) && !viewTimersRef.current[postId]) {
            viewTimersRef.current[postId] = setTimeout(async () => {
              viewedPostsRef.current.add(postId);
              delete viewTimersRef.current[postId]; 
              
              try {
                const { data } = await supabase.from('posts').select('views').eq('id', postId).single();
                const currentViews = data?.views || 0;
                await supabase.from('posts').update({ views: currentViews + 1 }).eq('id', postId);
              } catch (err) {
                console.error("Gagal hitung view", err);
              }
            }, 2000); 
          }
        } else {
          if (viewTimersRef.current[postId]) {
            clearTimeout(viewTimersRef.current[postId]);
            delete viewTimersRef.current[postId];
          }
        }
      });
    }, { threshold: 0.6 }); 

    document.querySelectorAll('.card[data-postid]').forEach(card => {
      viewObserverRef.current?.observe(card);
    });
  };

  const getMusicHtml = (post: any, isOverlay = true) => {
    if (!post.audio_src) return null;
    let cleanAudio = (post.audio_src || "").trim();
    if (cleanAudio.includes('res.cloudinary.com') && cleanAudio.includes('/video/upload/')) {
        cleanAudio = cleanAudio.replace('/video/upload/', '/video/upload/f_mp3/');
    }
    const finalAudio = cleanAudio.startsWith("http") ? cleanAudio : `/songs/${cleanAudio}`;
    
    return (
      <div 
        className="music-marquee-container" 
        style={{ 
          position: isOverlay ? 'absolute' : 'relative',
          top: isOverlay ? '12px' : 'auto',
          left: isOverlay ? '12px' : 'auto',
          maxWidth: isOverlay ? '130px' : '220px', 
          width: isOverlay ? 'auto' : 'fit-content',
          zIndex: 2, 
          background: isOverlay ? 'rgba(0,0,0,0.5)' : 'var(--bg-secondary)',
          backdropFilter: isOverlay ? 'blur(8px)' : 'none',
          borderRadius: '16px',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          overflow: 'hidden',
          border: isOverlay ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-card)'
        }}
      >
        <span className="material-icons" style={{ fontSize: '12px', color: isOverlay ? '#fff' : 'var(--text-main)' }}>music_note</span>
        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', position: 'relative' }}>
          <div 
            className="marquee-text"
            style={{
              display: 'inline-block',
              color: isOverlay ? '#fff' : 'var(--text-main)',
              fontSize: '10px', 
              fontWeight: 'bold',
              animation: 'marqueeMusic 6s linear infinite', 
              paddingLeft: '100%' 
            }}
          >
            {post.title || t('untitled')} — {post.artist || t('unknown_artist')}
          </div>
        </div>
        <audio className="post-audio-element" loop preload="none" playsInline style={{ display: 'none' }}>
          <source src={finalAudio} type="audio/mpeg" />
        </audio>
      </div>
    );
  };

  const renderFollowButton = (creatorId: string) => {
    if (!currentUser || currentUser.id === creatorId) return null; 
    const isFollowing = followedUsers.has(creatorId);
    const isMutual = mutualUsers.has(creatorId); 
    const isAnimating = animatingFollows.has(creatorId);

    return (
      <button
        onClick={(e) => handleFollowToggle(e, creatorId)}
        className="btn-press"
        style={{
          background: isFollowing ? 'var(--bg-secondary)' : '#1f3cff',
          color: isFollowing ? 'var(--text-main)' : '#ffffff',
          border: isFollowing ? '1px solid var(--border-card)' : 'none',
          padding: '4px 12px',
          borderRadius: '16px',
          fontSize: '11px',
          fontWeight: 700,
          marginLeft: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transform: isAnimating ? 'scale(0.85)' : 'scale(1)',
          transition: 'all 0.2s ease-in-out'
        }}
      >
        {isFollowing && (
          <span 
            className="material-icons check-pop" 
            style={{ fontSize: '13px', color: 'var(--text-main)' }}
          >
            check
          </span>
        )}
        {isFollowing ? (isMutual ? 'Berteman' : 'Mengikuti') : t('follow', 'Ikuti')}
      </button>
    );
  };

  const renderEngagementButtons = (post: any, postIdStr: string) => (
    <div className="engagement-group">
      <button 
        className={`icon-btn save-btn btn-press ${mySavedPosts.has(postIdStr) ? 'active' : ''}`} 
        onClick={() => handleSave(postIdStr)} 
      >
        <svg viewBox="0 0 24 24" className="icon" fill="currentColor" style={{ color: mySavedPosts.has(postIdStr) ? "#1f3cff" : "inherit", transition: '0.2s' }}>
          {mySavedPosts.has(postIdStr) ? <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /> : <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />}
        </svg>
        <span className="save-count" style={{ color: 'var(--text-main)' }}>{counts[postIdStr]?.saves || 0}</span>
      </button>

      <button 
        className={`icon-btn repost-btn btn-press ${myRepostedPosts.has(postIdStr) ? 'reposted' : ''}`} 
        onClick={() => openRepostModal(postIdStr, post.creator_id)}
      >
        <svg viewBox="0 0 24 24" className={`icon ${animatingReposts.has(postIdStr) ? 'spin-anim' : ''}`} fill="currentColor" style={{ color: myRepostedPosts.has(postIdStr) ? "#1f3cff" : "inherit", transition: '0.2s' }}>
          <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
        </svg>
        <span className="repost-count" style={{ color: 'var(--text-main)' }}>{counts[postIdStr]?.reposts || 0}</span>
      </button>

      <button 
        className={`icon-btn like-btn btn-press ${myLikedPosts.has(postIdStr) ? 'liked' : ''}`} 
        onClick={() => handleLike(postIdStr, post.creator_id)}
      >
        <svg viewBox="0 0 24 24" className={`icon heart ${myLikedPosts.has(postIdStr) ? 'heart-pop active' : ''}`} fill="currentColor" style={{ transition: '0.2s' }}>
          <path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z"/>
        </svg>
        <span className="like-count">{counts[postIdStr]?.likes || 0}</span>
      </button>
      
      <button 
        className="icon-btn comment-toggle btn-press" 
        data-post={post.id} 
        data-creator={post.creator_id}
      >
        <svg viewBox="0 0 24 24" className="icon" fill="currentColor"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>
        <span className="comment-count">{counts[postIdStr]?.comments || 0}</span>
      </button>
    </div>
  );

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
        return (
          <span key={i} onClick={(e) => handleMentionClick(e, usernameOnly)} style={{ color: '#1f3cff', fontWeight: 700, cursor: 'pointer' }}>
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
            style={{ color: 'var(--text-muted, #8696a0)', fontWeight: 400, cursor: 'pointer' }}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <section>
      <style>{`
        @keyframes marqueeMusic { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
        .btn-press { transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .btn-press:active { transform: scale(0.85); }
        .check-pop { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .heart-pop.active { animation: heartPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); fill: #ff2e63; }
        @keyframes heartPop { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
        .spin-anim { animation: spinRep 0.5s ease-in-out; }
        @keyframes spinRep { 100% { transform: rotate(360deg); } }
        .pure-spinner { width: 30px; height: 30px; border: 3px solid var(--border-card); border-top-color: #1f3cff; border-radius: 50%; animation: pureSpin 1s linear infinite; }
        @keyframes pureSpin { 100% { transform: rotate(360deg); } }

        /* 🔥 BUBBLE UNTUK OWNER (MUTUALS MAX 3) 🔥 */
        .liker-bubble-wrapper { position: absolute; bottom: 60px; right: 15px; display: flex; flex-direction: column-reverse; align-items: flex-end; gap: 8px; pointer-events: none; z-index: 5; }
        .liker-bubble { position: relative; animation: floatBubble 4s ease-in-out infinite alternate; opacity: 0.95; cursor: pointer; pointer-events: auto; }
        .liker-bubble img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.5); }
        
        /* 🔥 BUBBLE UNTUK NON-OWNER (MUTUALS MAX 2 + BISA ADA CATATAN) 🔥 */
        .nonowner-bubble-wrapper { position: absolute; bottom: 60px; left: 15px; display: flex; flex-direction: column-reverse; align-items: flex-start; gap: 10px; pointer-events: none; z-index: 5; }
        .nonowner-bubble { position: relative; animation: floatBubbleOpposite 4s ease-in-out infinite alternate; opacity: 0.95; cursor: pointer; pointer-events: auto; display: flex; align-items: center; gap: 8px; }
        .nonowner-bubble img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #1f3cff; box-shadow: 0 2px 8px rgba(0,0,0,0.5); }
        .note-bubble { background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); }
        
        .liker-mini-icon { position: absolute; bottom: -2px; right: -2px; color: white; border-radius: 50%; padding: 2px; font-size: 10px; border: 1px solid white; display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; }
        .liker-mini-icon.heart { background: #ff2e63; }
        .liker-mini-icon.repeat { background: #1f3cff; }

        @keyframes floatBubble { 0% { transform: translateY(0) translateX(0); } 33% { transform: translateY(-8px) translateX(-4px); } 66% { transform: translateY(-4px) translateX(4px); } 100% { transform: translateY(-12px) translateX(0); } }
        @keyframes floatBubbleOpposite { 0% { transform: translateY(0) translateX(0); } 33% { transform: translateY(-8px) translateX(4px); } 66% { transform: translateY(-4px) translateX(-4px); } 100% { transform: translateY(-12px) translateX(0); } }

        /* 🔥 CSS EFEK MELETUP BIG HEART (HANYA LOVE MERAH) 🔥 */
        .big-pop-heart {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0);
          color: #ff2e63; /* Warna merah full */
          font-size: 120px; /* Ukuran lebih besar */
          z-index: 10;
          pointer-events: none;
          opacity: 0;
          animation: popHeartAnim 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          filter: drop-shadow(0 4px 15px rgba(0,0,0,0.4));
        }
        @keyframes popHeartAnim {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          15% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          30% { transform: translate(-50%, -50%) scale(0.95); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -100%) scale(0); opacity: 0; }
        }
      `}</style>

      {/* 🔥 MODAL REPOST NOTE 🔥 */}
      <AnimatePresence>
        {repostModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRepostModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', zIndex: 99998 }} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: '-50%', x: '-50%' }} 
              animate={{ scale: 1, opacity: 1, y: '-50%', x: '-50%' }} 
              exit={{ scale: 0.9, opacity: 0, y: '-50%', x: '-50%' }} 
              style={{ 
                position: 'fixed', top: '50%', left: '50%', 
                background: 'var(--bg-secondary)', borderRadius: '24px', padding: '24px', 
                zIndex: 99999, width: '85%', maxWidth: '340px', 
                boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
                display: 'flex', flexDirection: 'column', alignItems: 'center' // Memaksa isi ke tengah
              }}
            >
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: 'var(--text-main)', textAlign: 'center', fontWeight: 800 }}>Repost Karya Ini</h3>
              
              {/* 🔥 INPUT TEKS REPOST DIRAPIKAN DI TENGAH 🔥 */}
              <input 
                type="text" 
                placeholder="Tambahkan catatan... (opsional)" 
                maxLength={15}
                value={repostNote}
                onChange={(e) => setRepostNote(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '16px', 
                  borderRadius: '16px', 
                  border: '2px solid var(--border-card)', 
                  background: 'var(--bg-main)', 
                  color: 'var(--text-main)', 
                  outline: 'none', 
                  marginBottom: '8px',
                  textAlign: 'center', 
                  fontSize: '16px',
                  fontWeight: 700,
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1f3cff'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-card)'}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', width: '100%', marginBottom: '24px', fontWeight: 600 }}>{repostNote.length}/15</div>
              
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button onClick={() => setRepostModal(null)} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: 'var(--border-card)', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>Batal</button>
                <button onClick={() => handleConfirmRepost(repostModal.postId, repostModal.creatorId, false)} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: '#1f3cff', color: 'white', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>Repost</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className={`image-preview-overlay ${activePreviewImage ? 'active' : ''}`} onClick={() => setActivePreviewImage(null)}>
        <div className="image-preview-content">
          {activePreviewImage && <img src={activePreviewImage} alt="Preview" />}
        </div>
      </div>

      <div className="gallery" id="mainGallery">
        {isLoading ? (
          <div className="gallery-skeleton-wrapper">
            <div className="gallery-skeleton-card"><div className="gallery-skeleton-shimmer" /></div>
            <div className="gallery-skeleton-card"><div className="gallery-skeleton-shimmer" /></div>
          </div>
        ) : posts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '50px' }}>{t('no_posts_found')}</p>
        ) : (
          posts.map(post => {
            const badge = getUserBadge(post.profiles?.role);
            const avatarUrl = post.profiles?.avatar_url || "https://ui-avatars.com/api/?name=" + post.profiles?.username;
            
            let optimizedAvatar = avatarUrl;
            if (optimizedAvatar && optimizedAvatar.includes('res.cloudinary.com') && !optimizedAvatar.includes('f_auto')) {
              optimizedAvatar = optimizedAvatar.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
            }

            const formattedDate = formatRelativeTime(post.created_at);
            
            const isOwner = currentUser && currentUser.id === post.creator_id;
            const postIdStr = String(post.id);
            const photoList = post.image_url ? post.image_url.split(',') : [];
            const isVideoPost = !!post.video_url;
            
            const likers = likersMap[postIdStr] || [];
            const reposters = repostersMap[postIdStr] || [];
            
            const mutualLikers = likers.filter(l => mutualUsers.has(l.id));
            const mutualReposters = reposters.filter(r => mutualUsers.has(r.id));
            
            const combinedMutualInteractors = [];
            let rCount = 0; let lCount = 0;
            
            if (mutualReposters[rCount]) combinedMutualInteractors.push({ ...mutualReposters[rCount++], type: 'repost' });
            if (mutualLikers[lCount] && combinedMutualInteractors.length < 2) combinedMutualInteractors.push({ ...mutualLikers[lCount++], type: 'like' });
            if (mutualReposters[rCount] && combinedMutualInteractors.length < 2) combinedMutualInteractors.push({ ...mutualReposters[rCount++], type: 'repost' });
            if (mutualLikers[lCount] && combinedMutualInteractors.length < 2) combinedMutualInteractors.push({ ...mutualLikers[lCount++], type: 'like' });

            return (
              <div key={post.id} id={`post-${post.id}`} data-postid={post.id} className="card" style={(!post.image_url && !post.video_url) ? { padding: '16px' } : {}}>
                {(photoList.length > 0 || isVideoPost) ? (
                  <>
                    <div className="slider" style={{ position: 'relative' }}>
                      {getMusicHtml(post, true)}
                      
                      {/* 🔥 EFEK BIG POPPING HEART (MUNCUL DI TENGAH FOTO/VIDEO) 🔥 */}
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
                        <button
                          className="btn-press"
                          onClick={toggleMute}
                          style={{
                            position: 'absolute', bottom: '12px', left: '12px', zIndex: 2, 
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '32px',
                            height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                          }}
                        >
                          <span className="material-icons" style={{ fontSize: '18px' }}>
                            {isGloballyMuted ? 'volume_off' : 'volume_up'}
                          </span>
                        </button>
                      )}

                      {isOwner && mutualLikers.length > 0 && (
                        <div className="liker-bubble-wrapper">
                          {mutualLikers.slice(0, 3).map((liker, index) => (
                            <div key={index} className="liker-bubble" onClick={() => router.push(`/data?id=${liker.id}`)} style={{ animationDelay: `${index * 1.5}s`, transform: `translateX(${index * -5}px)` }}>
                              <img src={liker.avatar_url || '/asets/png/profile.webp'} alt="liker" />
                              <span className="material-icons liker-mini-icon heart">favorite</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {!isOwner && combinedMutualInteractors.length > 0 && (
                        <div className="nonowner-bubble-wrapper">
                          {combinedMutualInteractors.map((interactor, index) => (
                            <div key={index} className="nonowner-bubble" onClick={() => router.push(`/data?id=${interactor.id}`)} style={{ animationDelay: `${index * 1.2}s` }}>
                              <div style={{ position: 'relative' }}>
                                <img src={interactor.avatar_url || '/asets/png/profile.webp'} alt="interactor" />
                                {interactor.type === 'like' ? (
                                   <span className="material-icons liker-mini-icon heart">favorite</span>
                                ) : (
                                   <span className="material-icons liker-mini-icon repeat">repeat</span>
                                )}
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
                          <div className="carousel-item" onClick={(e) => handleMediaClick(e, postIdStr, post.creator_id)} style={{ aspectRatio: '2 / 3', width: '100%', overflow: 'hidden', position: 'relative', background: 'var(--bg-secondary)', cursor: 'pointer' }}>
                            <video src={post.video_url} className="post-video-element" poster={getOptimizedImage(post.image_url)} playsInline loop muted style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', pointerEvents: 'none' }} />
                          </div>
                        ) : (
                          photoList.map((url: string, i: number) => (
                            <div key={i} className="carousel-item" style={{ aspectRatio: '3 / 4', width: '100%', overflow: 'hidden', position: 'relative', background: 'var(--bg-secondary)' }}>
                              <img src={getOptimizedImage(url)} className="active" loading={i === 0 ? "eager" : "lazy"} alt={`Postingan Galeri ${i + 1}`} onClick={(e) => handleMediaClick(e, postIdStr, post.creator_id, getOptimizedImage(url))} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', cursor: 'pointer' }} />
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
                          <h2 className="name" onClick={() => window.location.href=`/data?id=${post.creator_id}`} style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            {post.profiles?.full_name || post.profiles?.username || "User"} <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                          </h2>
                          {renderFollowButton(post.creator_id)}
                        </div>
                        <button className="options-btn btn-press" aria-label="Opsi Postingan" onClick={(e) => { e.stopPropagation(); openShareOptions(post, isOwner); }}>
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
                        <a href={`/data?id=${post.creator_id}`} className="primary btn-press" style={{ display: 'inline-block' }}>{t('view_detail')}</a>
                        {renderEngagementButtons(post, postIdStr)}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', cursor: 'pointer' }} onClick={() => window.location.href=`/data?id=${post.creator_id}`}>
                        <img src={optimizedAvatar} alt="Avatar Profil" loading="lazy" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
                            {post.profiles?.full_name || post.profiles?.username || "User"} <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                            {renderFollowButton(post.creator_id)}
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
                      <button className="btn-press" aria-label="Opsi Postingan" onClick={(e) => { e.stopPropagation(); openShareOptions(post, isOwner); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                      </button>
                    </div>

                    <div style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: '12px', wordBreak: 'break-word' }}>
                      {renderBioWithMentions(post.bio?.trim())}
                    </div>
                    
                    {post.audio_src && (
                      <div style={{ position: 'relative', height: '40px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {getMusicHtml(post, false)}
                        <button
                          className="btn-press"
                          onClick={toggleMute}
                          style={{
                            background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', color: 'var(--text-main)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2
                          }}
                        >
                          <span className="material-icons" style={{ fontSize: '18px' }}>
                            {isGloballyMuted ? 'volume_off' : 'volume_up'}
                          </span>
                        </button>
                      </div>
                    )}

                    <div className="actions" style={{ borderTop: '1px solid var(--border-card)', marginTop: '16px', paddingTop: '12px' }}>
                      <a href={`/data?id=${post.creator_id}`} className="btn-press" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600, display: 'inline-block' }}>{t('view_detail')}</a>
                      {renderEngagementButtons(post, postIdStr)}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}

        {posts.length > 0 && (
          <div ref={observerTarget} style={{ display: 'flex', justifyContent: 'center', padding: '30px 0 80px 0', width: '100%' }}>
            {isLoadingMore ? (
              <div className="pure-spinner"></div>
            ) : hasMore ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Scroll ke bawah untuk memuat...</span>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-icons" style={{ fontSize: '14px', color: '#1f3cff' }}>check_circle</span>
                Tidak ada postingan lagi
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
