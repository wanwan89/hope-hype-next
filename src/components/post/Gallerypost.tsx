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
          const { data: myLikes } = await supabase.from("likes").select("post_id").eq("user_id", userObj.id).in("post_id", postIds);
          const { data: myReposts } = await supabase.from("reposts").select("post_id").eq("user_id", userObj.id).in("post_id", postIds);
          
          setMyLikedPosts(new Set(myLikes?.map(l => String(l.post_id))));
          setMyRepostedPosts(new Set(myReposts?.map(r => String(r.post_id))));
        }
      }

      setPosts(fetchedPosts);
      setTimeout(initAutoPlayObserver, 500);

      // 🔥 FIX 1: JALANKAN LOGIKA DEEP LINKING (SCROLL KE HASH) 🔥
      setTimeout(() => {
        if (window.location.hash) {
          const hashId = window.location.hash.substring(1); // ambil 'post-123'
          const targetEl = document.getElementById(hashId);
          if (targetEl) {
            targetEl.style.transition = 'box-shadow 0.5s ease';
            targetEl.style.boxShadow = '0 0 30px rgba(0, 162, 255, 0.8)';
            
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            setTimeout(() => {
              targetEl.style.boxShadow = '';
            }, 2000);
          }
        }
      }, 800);

    } catch (err) {
      console.error("Gallery Error:", err);
    } finally {
      setIsLoading(false);
    }
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
        await supabase.from("likes").insert({ post_id: numericPostId, user_id: currentUser.id });
        if (creatorId !== currentUser.id) {
          const { data: prof } = await supabase.from("profiles").select("username").eq("id", currentUser.id).single();
          await supabase.from("notifications").insert({
            user_id: creatorId, actor_id: currentUser.id, post_id: numericPostId, type: "like",
            message: `<b>${prof?.username}</b> menyukai karyamu.`
          });
        }
      }
    } catch (err) {
      console.error("Like Error:", err);
      showNotif("Gagal menyimpan like", "error");
    }
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
    }), 400);

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
        await supabase.from("reposts").insert({ post_id: numericPostId, user_id: currentUser.id });
      }
    } catch (err) {
      console.error("Repost Error:", err);
    }
  };

  const initAutoPlayObserver = () => {
    let userHasInteracted = false;
    const handleFirstInteract = () => { userHasInteracted = true; document.body.removeEventListener('click', handleFirstInteract); };
    document.body.addEventListener('click', handleFirstInteract, { once: true });

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const audio = entry.target.querySelector('.post-audio-element') as HTMLAudioElement;
        if (!audio) return;
        if (entry.isIntersecting) {
          document.querySelectorAll('.post-audio-element').forEach(el => { 
            if (el !== audio) { (el as HTMLAudioElement).pause(); (el as HTMLAudioElement).muted = true; }
          });
          audio.currentTime = 0;
          audio.volume = 1.0;
          audio.muted = !userHasInteracted;
          audio.play().catch(() => {
            audio.muted = true;
            audio.play().catch(() => {});
          });
        } else {
          audio.pause();
        }
      });
    }, { threshold: 0.6 });

    document.querySelectorAll('.card').forEach(card => observerRef.current?.observe(card));
  };

  const getMusicHtml = (post: any) => {
    if (!post.audio_src) return null;
    let cleanAudio = (post.audio_src || "").trim();
    if (cleanAudio.includes('res.cloudinary.com') && cleanAudio.includes('/video/upload/')) {
        cleanAudio = cleanAudio.replace('/video/upload/', '/video/upload/f_mp3/');
    }
    const finalAudio = cleanAudio.startsWith("http") ? cleanAudio : `/songs/${cleanAudio}`;
    
    return (
      <div className="music-marquee-container" style={{ background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: '20px', padding: '5px 15px', zIndex: 10, maxWidth: '150px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none', marginBottom: '10px' }}>
        <div className="marquee-text" style={{ fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block', animation: 'marquee-play 8s linear infinite', letterSpacing: '0.3px' }}>
          {post.title || 'Untitled'} — {post.artist || 'Unknown Artist'}
        </div>
        <audio className="post-audio-element" loop preload="metadata" playsInline style={{ display: 'none' }}>
          <source src={finalAudio} type="audio/mpeg" />
        </audio>
      </div>
    );
  };

  const renderEngagementButtons = (post: any, postIdStr: string) => (
    <div className="engagement-group">
      <button className="icon-btn gift-btn" data-post={post.id} data-creator={post.creator_id}>
        <svg viewBox="0 0 24 24" className="icon" fill="currentColor"><path d="M20 7h-2.18A3 3 0 0 0 12 3a3 3 0 0 0-5.82 4H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-8-2a1 1 0 0 1 1 1v1h-2V6a1 1 0 0 1 1-1Zm-4 1a1 1 0 0 1 2 0v1H8a1 1 0 0 1 0-2Zm9 13h-4v-7h4Zm-6 0H7v-7h4Zm8-9H5V9h14Z"/></svg>
      </button>
      
      <button className={`icon-btn repost-btn ${myRepostedPosts.has(postIdStr) ? 'reposted' : ''} ${animatingReposts.has(postIdStr) ? 'animating' : ''}`} onClick={() => handleRepost(postIdStr)}>
        <svg viewBox="0 0 24 24" className="icon" fill="currentColor"><path d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.292-.768-.292-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"></path></svg>
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
          // 🔥 FIX: NAMA CLASS SKELETON DIGANTI JADI gallery-skeleton-* 🔥
          <div className="gallery-skeleton-wrapper">
            <div className="gallery-skeleton-card"><div className="gallery-skeleton-shimmer"></div></div>
            <div className="gallery-skeleton-card"><div className="gallery-skeleton-shimmer"></div></div>
          </div>
        ) : posts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '50px' }}>Tidak ada postingan.</p>
        ) : (
          posts.map(post => {
            const badge = getUserBadge(post.profiles?.role);
            const avatarUrl = post.profiles?.avatar_url || "https://ui-avatars.com/api/?name=" + post.profiles?.username;
            const formattedDate = new Date(post.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
            const isOwner = currentUser && currentUser.id === post.creator_id;
            const postIdStr = String(post.id);

            return (
              <div key={post.id} id={`post-${post.id}`} className="card" style={!post.image_url ? { padding: '16px' } : {}}>
                {post.image_url && post.image_url.trim() !== "" ? (
                  <>
                    <div className="slider">
                      <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 20 }}>{getMusicHtml(post)}</div>
                      <img 
                        src={post.image_url} 
                        className="active" 
                        loading="lazy" 
                        alt="Post" 
                        onClick={() => (window as any).openBigImage && (window as any).openBigImage(post.image_url)}
                      />
                      <div className="watermark-overlay"><img src="/asets/svg/watermark.svg" alt="watermark" /></div>
                    </div>
                    
                    <div className="overlay">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <h2 className="name" onClick={() => window.location.href=`/data?id=${post.creator_id}`}>
                          {post.profiles?.username || "User"} <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                        </h2>
                        <button className="options-btn" onClick={() => (window as any).openPostOptions && (window as any).openPostOptions(post.id, isOwner, post.creator_id)}>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                      </div>
                      <p className="post-bio">{post.bio?.trim()}</p>
                      <div className="post-date-wrapper">Diunggah {formattedDate}</div>
                      <div className="actions">
                        <a href={`/data?id=${post.creator_id}`} className="primary">Detail</a>
                        {renderEngagementButtons(post, postIdStr)}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', cursor: 'pointer' }} onClick={() => window.location.href=`/data?id=${post.creator_id}`}>
                        <img src={avatarUrl} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
                            {post.profiles?.username || "User"} <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formattedDate}</span>
                        </div>
                      </div>
                      <button onClick={() => (window as any).openPostOptions && (window as any).openPostOptions(post.id, isOwner, post.creator_id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                      </button>
                    </div>
                    <div style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: '12px' }}>{post.bio?.trim()}</div>
                    {post.audio_src && <div style={{ marginTop: '10px' }}>{getMusicHtml(post)}</div>}
                    <div className="actions" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '16px', paddingTop: '12px' }}>
                      <a href={`/data?id=${post.creator_id}`} style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>Lihat Profil</a>
                      {renderEngagementButtons(post, postIdStr)}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
