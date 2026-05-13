'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils'; 
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation'; 
// 🔥 FIX: Framer Motion DIHAPUS TOTAL biar scroll super ringan 🔥
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

export default function Gallerypost() {
  const { t, i18n } = useTranslation();
  const router = useRouter(); 

  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [myLikedPosts, setMyLikedPosts] = useState<Set<string>>(new Set());
  const [myRepostedPosts, setMyRepostedPosts] = useState<Set<string>>(new Set());
  const [mySavedPosts, setMySavedPosts] = useState<Set<string>>(new Set());
  
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [animatingFollows, setAnimatingFollows] = useState<Set<string>>(new Set());
  
  const [counts, setCounts] = useState<Record<string, { likes: number, comments: number, reposts: number, saves: number }>>({});
  const [animatingReposts, setAnimatingReposts] = useState<Set<string>>(new Set());
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const lastTapRef = useRef<Record<string, number>>({}); 

  const [currentCategory, setCurrentCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const POSTS_PER_PAGE = 15;

  const [isGloballyMuted, setIsGloballyMuted] = useState(true);
  const isMutedRef = useRef(true);

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
  }, [hasMore, isLoadingMore, isLoading, page, currentCategory]);

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
      fetchPosts(newCat, currentUser, 1, false);
    };
    window.addEventListener('changeCategory', handleCategoryChange);
    return () => window.removeEventListener('changeCategory', handleCategoryChange);
  }, [currentUser]);

  useEffect(() => {
    const hash = window.location.hash; 
    if (hash && posts.length > 0 && !isLoading) {
      const timer = setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 800); 
      return () => clearTimeout(timer);
    }
  }, [posts, isLoading]);

  const initGallery = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    setCurrentUser(user);

    if (user) {
      const { data: follows } = await supabase.from('followers').select('following_id').eq('follower_id', user.id);
      if (follows) {
        setFollowedUsers(new Set(follows.map(f => String(f.following_id))));
      }
    }

    await fetchPosts("all", user, 1, false);
  };

  const fetchPosts = async (category = "all", userObj = currentUser, pageNumber = 1, isLoadMore = false) => {
    if (isLoadMore) setIsLoadingMore(true);
    else setIsLoading(true);

    try {
      const from = (pageNumber - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      let query = supabase.from("posts")
        .select(`id, image_url, video_url, audio_src, title, artist, bio, created_at, creator_id, category, profiles:creator_id (username, role, avatar_url)`)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .range(from, to); 

      if (category && category !== "all") {
        query = query.ilike("category", `%${category.trim()}%`);
      }

      const { data: rawPosts, error } = await query;
      if (error) throw error;

      let fetchedPosts = rawPosts || [];
      
      setHasMore(fetchedPosts.length === POSTS_PER_PAGE);

      if (category === "all" && !isLoadMore) fetchedPosts = [...fetchedPosts].sort(() => Math.random() - 0.5);

      if (fetchedPosts.length > 0) {
        const postIds = fetchedPosts.map(p => p.id);
        const [likesRes, commentsRes, repostsRes, savesRes] = await Promise.all([
          supabase.from("likes").select("post_id").in("post_id", postIds),
          supabase.from("comments").select("post_id").in("post_id", postIds),
          supabase.from("reposts").select("post_id").in("post_id", postIds),
          supabase.from("bookmarks").select("post_id").in("post_id", postIds)
        ]);

        const newCounts: any = {};
        postIds.forEach(id => { newCounts[id] = { likes: 0, comments: 0, reposts: 0, saves: 0 }; });
        
        likesRes.data?.forEach(l => { if(newCounts[l.post_id]) newCounts[l.post_id].likes++; });
        commentsRes.data?.forEach(c => { if(newCounts[c.post_id]) newCounts[c.post_id].comments++; });
        repostsRes.data?.forEach(r => { if(newCounts[r.post_id]) newCounts[r.post_id].reposts++; });
        savesRes.data?.forEach(s => { if(newCounts[s.post_id]) newCounts[s.post_id].saves++; });
        
        setCounts(prev => isLoadMore ? { ...prev, ...newCounts } : newCounts);

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

      setTimeout(initAutoPlayObserver, 500);

    } catch (err) { console.error(err); } finally { setIsLoading(false); setIsLoadingMore(false); }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(currentCategory, currentUser, nextPage, true);
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
        if (error && error.code !== '23505') throw error; // 🔥 PENANGKAL ERROR DUPLIKAT
        
        if (!error) {
          const { data: myProf } = await supabase.from("profiles").select("username").eq("id", currentUser.id).single();
          await supabase.from("notifications").insert({
            user_id: creatorId,
            actor_id: currentUser.id,
            type: "follow",
            message: `<b>${myProf?.username}</b> mulai mengikuti Anda.`
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
        if (error && error.code !== '23505') throw error; // 🔥 PENANGKAL ERROR DUPLIKAT
        
        if (!error && creatorId !== currentUser.id) {
          const { data: prof } = await supabase.from("profiles").select("username").eq("id", currentUser.id).single();
          await supabase.from("notifications").insert({
            user_id: creatorId, actor_id: currentUser.id, post_id: numericPostId, type: "like",
            message: t('notif_commented', { username: prof?.username }) 
          });
        }
      }
    } catch (err) { console.error("Like error", err); }
  };

  const handleRepost = async (postId: string) => {
    if (!currentUser) return window.dispatchEvent(new CustomEvent('openLogin'));
    const isReposted = myRepostedPosts.has(postId);
    const numericPostId = parseInt(postId);

    setAnimatingReposts(prev => new Set(prev).add(postId));
    setTimeout(() => setAnimatingReposts(prev => {
      const newSet = new Set(prev);
      newSet.delete(postId);
      return newSet;
    }), 500);

    setMyRepostedPosts(prev => {
      const newSet = new Set(prev);
      isReposted ? newSet.delete(postId) : newSet.add(postId);
      return newSet;
    });

    setCounts(prev => ({
      ...prev,
      [postId]: { ...prev[postId], reposts: Math.max(0, (prev[postId]?.reposts || 0) + (isReposted ? -1 : 1)) }
    }));

    try {
      if (isReposted) {
        await supabase.from("reposts").delete().match({ post_id: numericPostId, user_id: currentUser.id });
      } else {
        const { error } = await supabase.from("reposts").insert({ post_id: numericPostId, user_id: currentUser.id });
        if (error && error.code !== '23505') throw error; // 🔥 PENANGKAL ERROR DUPLIKAT
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
        if (error && error.code !== '23505') throw error; // 🔥 PENANGKAL ERROR DUPLIKAT
      }
    } catch (err) { console.error("Save error", err); }
  };

  const handleImageDoubleTap = (e: any, imageUrl: string, postId: string) => {
    const now = Date.now();
    const lastTapTime = lastTapRef.current[postId] || 0;
    if (now - lastTapTime < 400) {
      setActivePreviewImage(imageUrl);
      lastTapRef.current[postId] = 0;
    } else {
      lastTapRef.current[postId] = now;
    }
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
        {isFollowing ? t('following', 'Mengikuti') : t('follow', 'Ikuti')}
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
        onClick={() => handleRepost(postIdStr)}
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
          <span key={i} style={{ color: 'var(--text-muted, #8696a0)', fontWeight: 400 }}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <section>
      {/* 🔥 PURE CSS ANIMATIONS (SUPER LIGHTWEIGHT) 🔥 */}
      <style>{`
        @keyframes marqueeMusic {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .btn-press { transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .btn-press:active { transform: scale(0.85); }
        
        .check-pop { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        
        .heart-pop.active { animation: heartPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); fill: #ff2e63; }
        @keyframes heartPop { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
        
        .spin-anim { animation: spinRep 0.5s ease-in-out; }
        @keyframes spinRep { 100% { transform: rotate(360deg); } }

        .pure-spinner {
          width: 30px; height: 30px; border: 3px solid var(--border-card); 
          border-top-color: #1f3cff; border-radius: 50%;
          animation: pureSpin 1s linear infinite;
        }
        @keyframes pureSpin { 100% { transform: rotate(360deg); } }
      `}</style>

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

            const formattedDate = new Date(post.created_at).toLocaleDateString(i18n.language, { day: "numeric", month: "short" });
            const isOwner = currentUser && currentUser.id === post.creator_id;
            const postIdStr = String(post.id);
            const photoList = post.image_url ? post.image_url.split(',') : [];
            const isVideoPost = !!post.video_url;

            return (
              <div key={post.id} id={`post-${post.id}`} className="card" style={(!post.image_url && !post.video_url) ? { padding: '16px' } : {}}>
                {(photoList.length > 0 || isVideoPost) ? (
                  <>
                    <div className="slider">
                      {getMusicHtml(post, true)}
                      
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

                      <button
                        className="btn-press"
                        onClick={toggleMute}
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
                          boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: '18px' }}>
                          {isGloballyMuted ? 'volume_off' : 'volume_up'}
                        </span>
                      </button>

                      <div className="photo-carousel" onScroll={(e) => {
                          const target = e.target as HTMLDivElement;
                          const index = Math.round(target.scrollLeft / target.offsetWidth);
                          const dots = document.querySelectorAll(`.dots-${post.id} .dot`);
                          dots.forEach((d, i) => i === index ? d.classList.add('active') : d.classList.remove('active'));
                          
                          const counterEl = document.getElementById(`slide-counter-${post.id}`);
                          if (counterEl) counterEl.innerText = `${index + 1}/${photoList.length}`;
                      }}>
                        {/* 🔥 FIX: OBJECT FIT COVER DITAMBAHKAN DI SINI 🔥 */}
                        {isVideoPost ? (
                          <div className="carousel-item" style={{ aspectRatio: '2 / 3', width: '100%', overflow: 'hidden', position: 'relative', background: 'var(--bg-secondary)' }}>
                            <video 
                              src={post.video_url} 
                              className="post-video-element"
                              poster={getOptimizedImage(post.image_url)}
                              playsInline loop muted
                              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                            />
                          </div>
                        ) : (
                          photoList.map((url: string, i: number) => (
                            <div key={i} className="carousel-item" style={{ aspectRatio: '3 / 4', width: '100%', overflow: 'hidden', position: 'relative', background: 'var(--bg-secondary)' }}>
                              <img 
                                src={getOptimizedImage(url)} 
                                className="active" 
                                loading={i === 0 ? "eager" : "lazy"} 
                                alt={`Postingan Galeri ${i + 1}`} 
                                onClick={(e) => handleImageDoubleTap(e, getOptimizedImage(url), postIdStr)} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                              />
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
                            {post.profiles?.username || "User"} <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                          </h2>
                          {renderFollowButton(post.creator_id)}
                        </div>
                        <button 
                          className="options-btn btn-press" 
                          aria-label="Opsi Postingan" 
                          onClick={() => (window as any).openPostOptions?.(post.id, isOwner, post.creator_id)}
                        >
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                      </div>
                      
                      <p className="post-bio" style={{ minHeight: '24px', wordBreak: 'break-word', display: 'block' }}>
                        {renderBioWithMentions(post.bio?.trim())}
                      </p>

                      <div className="post-date-wrapper">{t('uploaded_on')} {formattedDate}</div>
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
                            {post.profiles?.username || "User"} <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                            {renderFollowButton(post.creator_id)}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formattedDate}</span>
                        </div>
                      </div>
                      <button className="btn-press" aria-label="Opsi Postingan" onClick={(e) => { e.stopPropagation(); (window as any).openPostOptions?.(post.id, isOwner, post.creator_id); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
                            zIndex: 2
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

        {/* 🔥 INFO END OF LIST (TIDAK ADA POSTINGAN LAGI) 🔥 */}
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
