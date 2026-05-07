'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils'; 
import './Gallery.css';

export default function Gallerypost() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [myLikedPosts, setMyLikedPosts] = useState<Set<string>>(new Set());
  const [myRepostedPosts, setMyRepostedPosts] = useState<Set<string>>(new Set());
  const [mySavedPosts, setMySavedPosts] = useState<Set<string>>(new Set()); // 🔥 STATE SIMPAN
  const [counts, setCounts] = useState<Record<string, { likes: number, comments: number, reposts: number }>>({});
  
  const [animatingReposts, setAnimatingReposts] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    initGallery();
    const handleCategoryChange = (e: any) => fetchPosts(e.detail.category);
    window.addEventListener('changeCategory', handleCategoryChange);
    return () => window.removeEventListener('changeCategory', handleCategoryChange);
  }, []);

  const initGallery = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    setCurrentUser(user);
    await fetchPosts("all", user);
  };

  const fetchPosts = async (category = "all", userObj = currentUser) => {
    setIsLoading(true);
    try {
      let query = supabase.from("posts")
        .select(`id, image_url, audio_src, title, artist, bio, created_at, creator_id, category, profiles:creator_id (username, role, avatar_url)`)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(100);

      if (category && category !== "all") {
        query = query.ilike("category", `%${category.trim()}%`);
      }

      const { data: rawPosts, error } = await query;
      if (error) throw error;

      let fetchedPosts = rawPosts || [];
      if (category === "all") fetchedPosts = [...fetchedPosts].sort(() => Math.random() - 0.5);

      if (fetchedPosts.length > 0) {
        const postIds = fetchedPosts.map(p => p.id);
        
        const [likesRes, commentsRes, repostsRes] = await Promise.all([
          supabase.from("likes").select("post_id").in("post_id", postIds),
          supabase.from("comments").select("post_id").in("post_id", postIds),
          supabase.from("reposts").select("post_id").in("post_id", postIds)
        ]);

        const newCounts: any = {};
        postIds.forEach(id => { newCounts[id] = { likes: 0, comments: 0, reposts: 0 }; });
        
        likesRes.data?.forEach(l => { if(newCounts[l.post_id]) newCounts[l.post_id].likes++; });
        commentsRes.data?.forEach(c => { if(newCounts[c.post_id]) newCounts[c.post_id].comments++; });
        repostsRes.data?.forEach(r => { if(newCounts[r.post_id]) newCounts[r.post_id].reposts++; });
        setCounts(newCounts);

        if (userObj) {
          const [myL, myR, myS] = await Promise.all([
            supabase.from("likes").select("post_id").eq("user_id", userObj.id).in("post_id", postIds),
            supabase.from("reposts").select("post_id").eq("user_id", userObj.id).in("post_id", postIds),
            supabase.from("bookmarks").select("post_id").eq("user_id", userObj.id).in("post_id", postIds)
          ]);
          
          setMyLikedPosts(new Set(myL.data?.map(l => String(l.post_id))));
          setMyRepostedPosts(new Set(myR.data?.map(r => String(r.post_id))));
          setMySavedPosts(new Set(myS.data?.map(s => String(s.post_id))));
        }
      }
      setPosts(fetchedPosts);
      setTimeout(initAutoPlayObserver, 500);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleLike = async (postId: string, creatorId: string) => {
    if (!currentUser) return window.dispatchEvent(new CustomEvent('openLogin'));
    const isLiked = myLikedPosts.has(postId);
    const numericPostId = parseInt(postId);
    setMyLikedPosts(prev => { const n = new Set(prev); isLiked ? n.delete(postId) : n.add(postId); return n; });
    setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], likes: Math.max(0, (prev[postId]?.likes || 0) + (isLiked ? -1 : 1)) } }));
    try {
      if (isLiked) await supabase.from("likes").delete().match({ post_id: numericPostId, user_id: currentUser.id });
      else {
        await supabase.from("likes").insert({ post_id: numericPostId, user_id: currentUser.id });
        if (creatorId !== currentUser.id) {
          const { data: prof } = await supabase.from("profiles").select("username").eq("id", currentUser.id).single();
          await supabase.from("notifications").insert({ user_id: creatorId, actor_id: currentUser.id, post_id: numericPostId, type: "like", message: `<b>${prof?.username}</b> menyukai karyamu.` });
        }
      }
    } catch (err) { console.error(err); }
  };

  const handleRepost = async (postId: string) => {
    if (!currentUser) return window.dispatchEvent(new CustomEvent('openLogin'));
    const isReposted = myRepostedPosts.has(postId);
    const numericPostId = parseInt(postId);
    setAnimatingReposts(prev => new Set(prev).add(postId));
    setTimeout(() => setAnimatingReposts(prev => { const n = new Set(prev); n.delete(postId); return n; }), 400);
    setMyRepostedPosts(prev => { const n = new Set(prev); isReposted ? n.delete(postId) : n.add(postId); return n; });
    setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], reposts: Math.max(0, (prev[postId]?.reposts || 0) + (isReposted ? -1 : 1)) } }));
    try {
      if (isReposted) await supabase.from("reposts").delete().match({ post_id: numericPostId, user_id: currentUser.id });
      else await supabase.from("reposts").insert({ post_id: numericPostId, user_id: currentUser.id });
    } catch (err) { console.error(err); }
  };

  // 🔥 FUNGSI SIMPAN BARU 🔥
  const handleSave = async (postId: string) => {
    if (!currentUser) return window.dispatchEvent(new CustomEvent('openLogin'));
    const isSaved = mySavedPosts.has(postId);
    const numericPostId = parseInt(postId);
    setMySavedPosts(prev => { const n = new Set(prev); isSaved ? n.delete(postId) : n.add(postId); return n; });
    try {
      if (isSaved) {
        await supabase.from("bookmarks").delete().match({ post_id: numericPostId, user_id: currentUser.id });
        showNotif("Dihapus dari simpanan", "info");
      } else {
        await supabase.from("bookmarks").insert({ post_id: numericPostId, user_id: currentUser.id });
        showNotif("Berhasil disimpan!", "success");
      }
    } catch (err) { console.error(err); }
  };

  const initAutoPlayObserver = () => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const audio = entry.target.querySelector('.post-audio-element') as HTMLAudioElement;
        if (!audio) return;
        if (entry.isIntersecting) audio.play().catch(() => {});
        else audio.pause();
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.card').forEach(card => observerRef.current?.observe(card));
  };

  const getMusicHtml = (post: any) => {
    if (!post.audio_src) return null;
    const finalAudio = post.audio_src.startsWith("http") ? post.audio_src : `/songs/${post.audio_src}`;
    return (
      <div className="music-marquee-container">
        <div className="marquee-text">{post.title || 'Untitled'} — {post.artist || 'Unknown'}</div>
        <audio className="post-audio-element" loop preload="metadata" playsInline style={{ display: 'none' }}><source src={finalAudio} type="audio/mpeg" /></audio>
      </div>
    );
  };

  const renderEngagementButtons = (post: any, postIdStr: string) => (
    <div className="engagement-group">
      {/* 🔥 TOMBOL SIMPAN (GANTI GIFT) 🔥 */}
      <button className={`icon-btn save-btn ${mySavedPosts.has(postIdStr) ? 'active' : ''}`} onClick={() => handleSave(postIdStr)}>
        <svg viewBox="0 0 24 24" className="icon" fill={mySavedPosts.has(postIdStr) ? "var(--primary-blue)" : "currentColor"}>
          <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
        </svg>
      </button>
      
      {/* 🔥 ICON REPOST BARU (MODERN) 🔥 */}
      <button className={`icon-btn repost-btn ${myRepostedPosts.has(postIdStr) ? 'reposted' : ''} ${animatingReposts.has(postIdStr) ? 'animating' : ''}`} onClick={() => handleRepost(postIdStr)}>
        <svg viewBox="0 0 24 24" className="icon" fill="currentColor">
          <path d="M19.5,7.06c-0.29,0.29-0.29,0.77,0,1.06L21.44,10H6.5c-1.93,0-3.5,1.57-3.5,3.5v3c0,0.41,0.34,0.75,0.75,0.75s0.75-0.34,0.75-0.75v-3 c0-1.1,0.9-2,2-2h14.94l-1.94,1.88c-0.29,0.29-0.29,0.77,0,1.06c0.29,0.29,0.77,0.29,1.06,0l3.25-3.15c0.29-0.29,0.29-0.77,0-1.06 l-3.25-3.15C20.27,6.77,19.79,6.77,19.5,7.06z M23.25,6.5c-0.41,0-0.75,0.34-0.75,0.75v3c0,1.1-0.9,2-2,2H5.56l1.94-1.88 c0.29-0.29,0.29-0.77,0-1.06c-0.29-0.29-0.77-0.29-1.06,0L3.19,12.47c-0.29,0.29-0.29,0.77,0,1.06l3.25,3.15 c0.29,0.29,0.77,0.29,1.06,0c0.29-0.29,0.29-0.77,0-1.06L5.56,13.75H20.5c1.93,0,3.5-1.57,3.5-3.5v-3 C24,6.84,23.66,6.5,23.25,6.5z"/>
        </svg>
        <span className="repost-count">{counts[postIdStr]?.reposts || 0}</span>
      </button>

      <button className={`icon-btn like-btn ${myLikedPosts.has(postIdStr) ? 'liked' : ''}`} onClick={() => handleLike(postIdStr, post.creator_id)}>
        <svg viewBox="0 0 24 24" className="icon heart" fill="currentColor"><path d="M12.1 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 22 12.28 18.6 15.36 13.55 20.04z"/></svg>
        <span className="like-count">{counts[postIdStr]?.likes || 0}</span>
      </button>
      
      <button className="icon-btn comment-toggle" data-post={post.id} data-creator={post.creator_id}>
        <svg viewBox="0 0 24 24" className="icon" fill="currentColor"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>
        <span className="comment-count">{counts[postIdStr]?.comments || 0}</span>
      </button>
    </div>
  );

  return (
    <section>
      <div className="gallery" id="mainGallery">
        {isLoading ? (
          <div className="gallery-skeleton-wrapper">
            <div className="gallery-skeleton-card"><div className="gallery-skeleton-shimmer"></div></div>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} id={`post-${post.id}`} className="card">
              <div className="slider">
                <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 20 }}>{getMusicHtml(post)}</div>
                <img src={post.image_url} loading="lazy" alt="Post" />
                <div className="watermark-overlay"><img src="/asets/svg/watermark.svg" alt="watermark" /></div>
              </div>
              <div className="overlay">
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <h2 className="name" onClick={() => window.location.href=`/data?id=${post.creator_id}`}>{post.profiles?.username || "User"}</h2>
                </div>
                <p className="post-bio">{post.bio?.trim()}</p>
                <div className="actions">
                  <a href={`/data?id=${post.creator_id}`} className="primary">Detail</a>
                  {renderEngagementButtons(post, String(post.id))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
