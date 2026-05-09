'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils'; 
import { useTranslation } from 'react-i18next';
import './Gallery.css';

export default function Gallerypost() {
  const { t, i18n } = useTranslation();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [myLikedPosts, setMyLikedPosts] = useState<Set<string>>(new Set());
  const [myRepostedPosts, setMyRepostedPosts] = useState<Set<string>>(new Set());
  const [mySavedPosts, setMySavedPosts] = useState<Set<string>>(new Set());
  
  const [counts, setCounts] = useState<Record<string, { likes: number, comments: number, reposts: number, saves: number }>>({});
  const [animatingReposts, setAnimatingReposts] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 🔥 STATE BUAT PREVIEW MODAL & DOUBLE TAP 🔥
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const lastTapRef = useRef<Record<string, number>>({}); 

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
        setCounts(newCounts);

        if (userObj) {
          const { data: myLikes } = await supabase.from("likes").select("post_id").eq("user_id", userObj.id).in("post_id", postIds);
          const { data: myReposts } = await supabase.from("reposts").select("post_id").eq("user_id", userObj.id).in("post_id", postIds);
          const { data: mySaves } = await supabase.from("bookmarks").select("post_id").eq("user_id", userObj.id).in("post_id", postIds);
          
          setMyLikedPosts(new Set(myLikes?.map(l => String(l.post_id))));
          setMyRepostedPosts(new Set(myReposts?.map(r => String(r.post_id))));
          setMySavedPosts(new Set(mySaves?.map(s => String(s.post_id))));
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
            message: t('notif_commented', { username: prof?.username }) 
          });
        }
      }
    } catch (err) { showNotif(t('like_save_error'), "error"); }
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
      if (isReposted) await supabase.from("reposts").delete().match({ post_id: numericPostId, user_id: currentUser.id });
      else await supabase.from("reposts").insert({ post_id: numericPostId, user_id: currentUser.id });
    } catch (err) { console.error(err); }
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
      if (isSaved) await supabase.from("bookmarks").delete().match({ post_id: numericPostId, user_id: currentUser.id });
      else await supabase.from("bookmarks").insert({ post_id: numericPostId, user_id: currentUser.id });
    } catch (err) { console.error(err); }
  };

  // 🔥 DOUBLE TAP HANDLER 🔥
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
          audio.play().catch(() => {});
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
      <div className="music-marquee-container" style={{ background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: '20px', padding: '5px 15px', zIndex: 40, maxWidth: '150px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none', marginBottom: '10px' }}>
        <div className="marquee-text" style={{ fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block', animation: 'marquee-play 8s linear infinite', letterSpacing: '0.3px' }}>
          {post.title || t('untitled')} — {post.artist || t('unknown_artist')}
        </div>
        <audio className="post-audio-element" loop preload="metadata" playsInline style={{ display: 'none' }}>
          <source src={finalAudio} type="audio/mpeg" />
        </audio>
      </div>
    );
  };

  const renderEngagementButtons = (post: any, postIdStr: string) => (
    <div className="engagement-group">
      <button className={`icon-btn save-btn ${mySavedPosts.has(postIdStr) ? 'active' : ''}`} onClick={() => handleSave(postIdStr)} style={{ color: mySavedPosts.has(postIdStr) ? "#1DA1F2" : "inherit" }}>
        <svg viewBox="0 0 24 24" className="icon" fill="currentColor">
          {mySavedPosts.has(postIdStr) ? <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /> : <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />}
        </svg>
        <span className="save-count">{counts[postIdStr]?.saves || 0}</span>
      </button>
      
      <button className={`icon-btn repost-btn ${myRepostedPosts.has(postIdStr) ? 'reposted' : ''} ${animatingReposts.has(postIdStr) ? 'animating' : ''}`} onClick={() => handleRepost(postIdStr)}>
        <svg viewBox="0 0 24 24" className="icon" fill="currentColor"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/></svg>
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
      <style>{`
        /* 🔥 STYLE CAROUSEL GESER 🔥 */
        .photo-carousel {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          position: relative;
        }
        .photo-carousel::-webkit-scrollbar { display: none; }
        
        .carousel-item {
          flex: 0 0 100%;
          width: 100%;
          scroll-snap-align: center;
          position: relative;
        }

        .carousel-dots {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 5px;
          z-index: 25;
          pointer-events: none;
        }
        .dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.4);
          transition: all 0.3s ease;
        }
        .dot.active { background: white; width: 12px; border-radius: 10px; }

        /* 🔥 PREVIEW MODAL 🔥 */
        .image-preview-overlay {
          position: fixed; inset: 0; z-index: 100000;
          background: rgba(0, 0, 0, 0.9); backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; pointer-events: none; transition: opacity 0.3s;
        }
        .image-preview-overlay.active { opacity: 1; pointer-events: auto; }
        .image-preview-content img {
          max-width: 95vw; max-height: 85vh; object-fit: contain;
          border-radius: 12px; animation: popZoom 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes popZoom { from { transform: scale(0.8); } to { transform: scale(1); } }
      `}</style>

      {/* MODAL PREVIEW */}
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
            const formattedDate = new Date(post.created_at).toLocaleDateString(i18n.language, { day: "numeric", month: "short" });
            const isOwner = currentUser && currentUser.id === post.creator_id;
            const postIdStr = String(post.id);

            // 🔥 PECAH URL MULTIPLE FOTO 🔥
            const photoList = post.image_url ? post.image_url.split(',') : [];

            return (
              <div key={post.id} id={`post-${post.id}`} className="card" style={!post.image_url ? { padding: '16px' } : {}}>
                {photoList.length > 0 ? (
                  <>
                    <div className="slider" style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 40 }}>{getMusicHtml(post)}</div>
                      
                      {/* 🔥 CAROUSEL GESER 🔥 */}
                      <div className="photo-carousel" onScroll={(e) => {
                          const target = e.target as HTMLDivElement;
                          const index = Math.round(target.scrollLeft / target.offsetWidth);
                          const dots = document.querySelectorAll(`.dots-${post.id} .dot`);
                          dots.forEach((d, i) => i === index ? d.classList.add('active') : d.classList.remove('active'));
                      }}>
                        {photoList.map((url: string, i: number) => (
                          <div key={i} className="carousel-item">
                            <img 
                              src={url.trim()} 
                              className="active" 
                              loading="lazy" 
                              alt={`Post ${i}`} 
                              onClick={(e) => handleImageDoubleTap(e, url.trim(), postIdStr)} 
                            />
                          </div>
                        ))}
                      </div>

                      {/* DOTS INDIKATOR */}
                      {photoList.length > 1 && (
                        <div className={`carousel-dots dots-${post.id}`}>
                          {photoList.map((_: any, i: number) => (
                            <div key={i} className={`dot ${i === 0 ? 'active' : ''}`} />
                          ))}
                        </div>
                      )}

                      <div className="watermark-overlay"><img src="/asets/svg/watermark.svg" alt="watermark" /></div>
                    </div>
                    
                    <div className="overlay">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <h2 className="name" onClick={() => window.location.href=`/data?id=${post.creator_id}`}>
                          {post.profiles?.username || "User"} <span dangerouslySetInnerHTML={{ __html: badge }}></span>
                        </h2>
                        <button className="options-btn" onClick={() => (window as any).openPostOptions?.(post.id, isOwner, post.creator_id)}>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                      </div>
                      <p className="post-bio">{post.bio?.trim()}</p>
                      <div className="post-date-wrapper">{t('uploaded_on')} {formattedDate}</div>
                      <div className="actions">
                        <a href={`/data?id=${post.creator_id}`} className="primary">{t('view_detail')}</a>
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
                      <button onClick={() => (window as any).openPostOptions?.(post.id, isOwner, post.creator_id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                      </button>
                    </div>
                    <div style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: '12px' }}>{post.bio?.trim()}</div>
                    {post.audio_src && <div style={{ marginTop: '10px' }}>{getMusicHtml(post)}</div>}
                    <div className="actions" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '16px', paddingTop: '12px' }}>
                      <a href={`/data?id=${post.creator_id}`} style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>{t('view_profile_link')}</a>
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
