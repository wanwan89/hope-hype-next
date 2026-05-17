'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { sendPushAndAppNotif } from '@/lib/notif'; 
import { motion, AnimatePresence } from 'framer-motion'; 
import PostCard from './PostCard'; // PASTIKAN PATH IMPORT INI BENAR
import './Gallery.css';

export default function Gallerypost() {
  const { t } = useTranslation();

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
  
  const [likersMap, setLikersMap] = useState<Record<string, any[]>>({});
  const [repostersMap, setRepostersMap] = useState<Record<string, any[]>>({});

  const [floatingLikes, setFloatingLikes] = useState<Array<{ id: number, x: number, y: number, avatar: string, delay: string }>>([]);

  const observerTarget = useRef<HTMLDivElement | null>(null);

  const [currentCategory, setCurrentCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const POSTS_PER_PAGE = 15;

  const [isGloballyMuted, setIsGloballyMuted] = useState(true);
  const isMutedRef = useRef(true);

  const [repostModal, setRepostModal] = useState<{isOpen: boolean, postId: string, creatorId: string} | null>(null);
  const [repostNote, setRepostNote] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, page, currentCategory, mutualUsers]);

  useEffect(() => {
    const handleCommentRefresh = (e: any) => {
      const postId = String(e.detail.postId);
      if (postId) {
        setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], comments: (prev[postId]?.comments || 0) + 1 } }));
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

      if (category && category !== "all") query = query.ilike("category", `%${category.trim()}%`);

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
      window.openGlobalShare(`${window.location.origin}/post?id=${post.id}`, "Postingan HypeTalk", "Lihat karya keren ini di HypeTalk!", post.profiles?.username || 'User', post.id, isOwner, post.is_private || false);
    }
  };

  const handleFollowToggle = async (e: any, creatorId: string) => {
    e.stopPropagation(); 
    if (!currentUser) return window.dispatchEvent(new CustomEvent('openLogin'));
    if (currentUser.id === creatorId) return; 

    const isFollowing = followedUsers.has(creatorId);

    setAnimatingFollows(prev => new Set(prev).add(creatorId));
    setTimeout(() => {
      setAnimatingFollows(prev => { const newSet = new Set(prev); newSet.delete(creatorId); return newSet; });
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
        if (!error) await sendPushAndAppNotif({ senderId: currentUser.id, receiverId: creatorId, type: 'follow' });
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

    setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], likes: Math.max(0, (prev[postId]?.likes || 0) + (isLiked ? -1 : 1)) } }));

    try {
      if (isLiked) {
        await supabase.from("likes").delete().match({ post_id: numericPostId, user_id: currentUser.id });
      } else {
        const { error } = await supabase.from("likes").insert({ post_id: numericPostId, user_id: currentUser.id });
        if (error && error.code !== '23505') throw error; 
        if (!error && creatorId !== currentUser.id) await sendPushAndAppNotif({ senderId: currentUser.id, receiverId: creatorId, type: 'like', postId: postId });
      }
    } catch (err) { console.error("Like error", err); }
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
    setTimeout(() => setAnimatingReposts(prev => { const newSet = new Set(prev); newSet.delete(postId); return newSet; }), 500);

    setMyRepostedPosts(prev => {
      const newSet = new Set(prev);
      isUnrepost ? newSet.delete(postId) : newSet.add(postId);
      return newSet;
    });

    setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], reposts: Math.max(0, (prev[postId]?.reposts || 0) + (isUnrepost ? -1 : 1)) } }));

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

    setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], saves: Math.max(0, (prev[postId]?.saves || 0) + (isSaved ? -1 : 1)) } }));

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
    document.querySelectorAll('.post-audio-element, .post-video-element').forEach((el: any) => { el.muted = nextMuted; });
  };

  return (
    <section>
      {/* RENDER ELEMENT FLOATING LIKES DI TINGKAT PALING ATAS */}
      {floatingLikes.map(like => (
        <div key={like.id} className="floating-like-container" style={{ left: like.x, top: like.y, animationDelay: like.delay }}>
          <div style={{ position: 'relative' }}>
            <img src={like.avatar} className="floating-avatar" alt="liker" />
            <span className="material-icons floating-heart">favorite</span>
          </div>
        </div>
      ))}

      {/* 🔥 MODAL REPOST NOTE 🔥 */}
      <AnimatePresence>
        {repostModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRepostModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', zIndex: 99998 }} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: '-50%', x: '-50%' }} animate={{ scale: 1, opacity: 1, y: '-50%', x: '-50%' }} exit={{ scale: 0.9, opacity: 0, y: '-50%', x: '-50%' }} 
              style={{ position: 'fixed', top: '50%', left: '50%', background: 'var(--bg-secondary)', borderRadius: '24px', padding: '24px', zIndex: 99999, width: '85%', maxWidth: '340px', boxShadow: '0 15px 40px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: 'var(--text-main)', textAlign: 'center', fontWeight: 800 }}>Repost Karya Ini</h3>
              <input type="text" placeholder="Tambahkan catatan... (opsional)" maxLength={15} value={repostNote} onChange={(e) => setRepostNote(e.target.value)}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid var(--border-card)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', marginBottom: '8px', textAlign: 'center', fontSize: '16px', fontWeight: 700, transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#1f3cff'} onBlur={(e) => e.target.style.borderColor = 'var(--border-card)'}
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
            const postIdStr = String(post.id);
            const isOwner = currentUser && currentUser.id === post.creator_id;
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
              <PostCard 
                key={post.id}
                post={post}
                currentUser={currentUser}
                isOwner={isOwner}
                counts={counts[postIdStr]}
                isLiked={myLikedPosts.has(postIdStr)}
                isReposted={myRepostedPosts.has(postIdStr)}
                isSaved={mySavedPosts.has(postIdStr)}
                isFollowing={followedUsers.has(post.creator_id)}
                isMutual={mutualUsers.has(post.creator_id)}
                isAnimatingFollow={animatingFollows.has(post.creator_id)}
                isGloballyMuted={isGloballyMuted}
                animatingReposts={animatingReposts}
                mutualLikers={mutualLikers}
                combinedMutualInteractors={combinedMutualInteractors}
                onLike={handleLike}
                onRepostClick={openRepostModal}
                onSave={handleSave}
                onFollow={handleFollowToggle}
                onShare={openShareOptions}
                onMuteToggle={toggleMute}
                onSetFloatingLikes={(x: number, y: number, avatar: string) => {
                  const newLikes = [
                    { id: Date.now(), x: x - 20, y: y - 10, avatar, delay: '0s' },
                    { id: Date.now() + 1, x: x + 25, y: y + 15, avatar, delay: '0.1s' }
                  ];
                  setFloatingLikes(prev => [...prev, ...newLikes]);
                  setTimeout(() => setFloatingLikes(prev => prev.filter(item => !newLikes.some(nl => nl.id === item.id))), 1500);
                }}
              />
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
