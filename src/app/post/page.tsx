'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { sendPushAndAppNotif } from '@/lib/notif';
import PostCard from '@/components/post/PostCard';
import RepostModal from '@/components/post/RepostModal';
import ImagePreview from '@/components/post/ImagePreview';
import '@/components/post/Gallery.css'; 

export default function PostPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const postIdFromUrl = searchParams.get('id');
  const source = searchParams.get('from'); 

  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const currentUserRef = useRef<any>(null);

  // States Interaksi
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

  // State untuk expand caption (Lihat Selengkapnya)
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  // Mode profil
  const [profileUsername, setProfileUsername] = useState<string>('');
  const [isMyOwnProfile, setIsMyOwnProfile] = useState<boolean>(false);

  const myLikedPostsRef = useRef(myLikedPosts);
  const myRepostedPostsRef = useRef(myRepostedPosts);
  const mySavedPostsRef = useRef(mySavedPosts);
  const followedUsersRef = useRef(followedUsers);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { myLikedPostsRef.current = myLikedPosts; }, [myLikedPosts]);
  useEffect(() => { myRepostedPostsRef.current = myRepostedPosts; }, [myRepostedPosts]);
  useEffect(() => { mySavedPostsRef.current = mySavedPosts; }, [mySavedPosts]);
  useEffect(() => { followedUsersRef.current = followedUsers; }, [followedUsers]);

  useEffect(() => {
    if (postIdFromUrl) {
      initializePage();
    } else {
      setIsLoading(false);
    }
  }, [postIdFromUrl, source]);

  const initializePage = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    setCurrentUser(user);

    if (user) {
      const [followsRes, followersRes] = await Promise.all([
        supabase.from('followers').select('following_id').eq('follower_id', user.id),
        supabase.from('followers').select('follower_id').eq('following_id', user.id),
      ]);
      if (followsRes.data) setFollowedUsers(new Set(followsRes.data.map(f => String(f.following_id))));
      if (followsRes.data && followersRes.data) {
        const followerSet = new Set(followersRes.data.map(f => String(f.follower_id)));
        const mutuals = new Set(followsRes.data.map(f => String(f.following_id)).filter(x => followerSet.has(x)));
        setMutualUsers(mutuals);
      }
    }

    if (source === 'profile') {
      await loadProfileMode(user);
    } else {
      await loadSinglePost(postIdFromUrl!, user);
    }
  };

  const loadProfileMode = async (user: any) => {
    const { data: exactPost, error: errExact } = await supabase
      .from('posts')
      .select('creator_id')
      .eq('id', postIdFromUrl)
      .maybeSingle(); 

    if (errExact || !exactPost) {
      setUserPosts([]);
      setIsLoading(false);
      return;
    }

    const targetUserId = exactPost.creator_id; 

    const isMe = user && targetUserId === user.id;
    setIsMyOwnProfile(isMe);

    if (!isMe) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', targetUserId)
        .maybeSingle(); 
      if (profileData) setProfileUsername(profileData.username);
    }

    const { data: postsData, error } = await supabase
      .from('posts')
      .select(`id, image_url, video_url, audio_src, title, artist, bio, created_at, creator_id, category, views, is_private, is_ad, profiles:creator_id (full_name, username, role, avatar_url, is_private)`)
      .eq('creator_id', targetUserId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error || !postsData) {
      setUserPosts([]);
      setIsLoading(false);
      return;
    }

    const filtered = postsData.filter(p => {
      if (!p.profiles?.is_private) return true;
      if (user && p.creator_id === user.id) return true;
      if (user && mutualUsers.has(p.creator_id)) return true;
      return false;
    });

    setUserPosts(filtered);

    await Promise.all(filtered.map(post => fetchPostInteractions(post.id, user)));

    setIsLoading(false);
  };

  const loadSinglePost = async (id: string, user: any) => {
    try {
      const { data: postData, error } = await supabase
        .from('posts')
        .select(`id, image_url, video_url, audio_src, title, artist, bio, created_at, creator_id, category, views, is_private, is_ad, profiles:creator_id (full_name, username, role, avatar_url, is_private)`)
        .eq('id', id)
        .maybeSingle();

      if (error || !postData) {
        setUserPosts([]);
        setIsLoading(false);
        return;
      }

      setUserPosts([postData]);
      await fetchPostInteractions(postData.id, user);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPostInteractions = async (postId: string | number, user: any) => {
    const pid = String(postId);
    const [likesRes, commentsRes, repostsRes, savesRes] = await Promise.all([
      supabase.from('likes').select('user_id, profiles:user_id(id, username, avatar_url)').eq('post_id', postId),
      supabase.from('comments').select('id', { count: 'exact' }).eq('post_id', postId),
      supabase.from('reposts').select('user_id, note, profiles:user_id(id, username, avatar_url)').eq('post_id', postId),
      supabase.rpc('get_bookmark_counts', { post_ids: [postId] })
    ]);

    setCounts(prev => ({
      ...prev,
      [pid]: {
        likes: likesRes.data?.length || 0,
        comments: commentsRes.count || 0,
        reposts: repostsRes.data?.length || 0,
        saves: (savesRes.data && savesRes.data[0]?.count) || 0,
      }
    }));
    setLikersMap(prev => ({ ...prev, [pid]: likesRes.data?.map(l => l.profiles) || [] }));
    setRepostersMap(prev => ({ ...prev, [pid]: repostsRes.data?.map(r => ({ ...r.profiles, note: r.note })) || [] }));

    if (user) {
      const liked = likesRes.data?.some(l => String(l.user_id) === user.id) || false;
      const reposted = repostsRes.data?.some(r => String(r.user_id) === user.id) || false;
      
      const { data: userBookmark } = await supabase
        .from('bookmarks')
        .select('user_id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle(); 
        
      const isSavedByUser = !!userBookmark;
      
      setMyLikedPosts(prev => { const n = new Set(prev); if (liked) n.add(pid); return n; });
      setMyRepostedPosts(prev => { const n = new Set(prev); if (reposted) n.add(pid); return n; });
      setMySavedPosts(prev => { const n = new Set(prev); if (isSavedByUser) n.add(pid); return n; });
    }
  };

  useEffect(() => {
    if (!isLoading && userPosts.length > 0 && postIdFromUrl) {
      setTimeout(() => {
        const container = document.getElementById('mainGallery');
        const targetPost = document.getElementById(`post-wrapper-${postIdFromUrl}`);
        if (container && targetPost) {
          container.scrollTo({ top: targetPost.offsetTop, behavior: 'auto' });
        }
      }, 300);
    }
  }, [isLoading, userPosts, postIdFromUrl]);

  const handleToggleExpand = useCallback((postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }, []);

  const handleFollowToggle = useCallback(async (e: any, creatorId: string) => {
    e.stopPropagation();
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));
    if (currentUserRef.current.id === creatorId) return;

    const isFollowing = followedUsersRef.current.has(creatorId);
    
    setAnimatingFollows((prev) => new Set(prev).add(creatorId));
    setTimeout(() => setAnimatingFollows((prev) => { const n = new Set(prev); n.delete(creatorId); return n; }), 200);

    setFollowedUsers((prev) => { const n = new Set(prev); isFollowing ? n.delete(creatorId) : n.add(creatorId); return n; });

    try {
      if (isFollowing) {
        await supabase.from("followers").delete().match({ follower_id: currentUserRef.current.id, following_id: creatorId });
      } else {
        const { error } = await supabase.from("followers").insert({ follower_id: currentUserRef.current.id, following_id: creatorId });
        if (!error || error.code === '23505') {
          if (!error) await sendPushAndAppNotif({ senderId: currentUserRef.current.id, receiverId: creatorId, type: "follow" });
        }
      }
    } catch (err) {}
  }, []);

  const handleLike = useCallback(async (postId: string, creatorId: string) => {
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));
    const numericPostId = parseInt(postId);
    const isLiked = myLikedPostsRef.current.has(postId);

    setMyLikedPosts((prev) => { const n = new Set(prev); isLiked ? n.delete(postId) : n.add(postId); return n; });
    setCounts((prev) => ({ ...prev, [postId]: { ...prev[postId], likes: Math.max(0, (prev[postId]?.likes || 0) + (isLiked ? -1 : 1)) } }));

    try {
      if (isLiked) {
        await supabase.from("likes").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id });
      } else {
        const { error } = await supabase.from("likes").insert({ post_id: numericPostId, user_id: currentUserRef.current.id });
        if (!error && creatorId !== currentUserRef.current.id) {
          await sendPushAndAppNotif({ senderId: currentUserRef.current.id, receiverId: creatorId, type: "like", postId });
        }
      }
    } catch (err) {}
  }, []);

  const handleMediaClick = useCallback((e: React.MouseEvent, postId: string, creatorId: string, imageUrl?: string) => {
    const now = Date.now();
    const lastTapTime = lastTapRef.current[postId] || 0;

    if (now - lastTapTime < 350) {
      lastTapRef.current[postId] = 0;
      if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));

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
  }, [handleLike]);

  const handleConfirmRepost = useCallback(async (postId: string, creatorId: string, isUnrepost: boolean = false) => {
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));
    const numericPostId = parseInt(postId);
    const finalNote = repostNote.trim().substring(0, 15);
    setRepostModal(null);

    setAnimatingReposts((prev) => new Set(prev).add(postId));
    setTimeout(() => setAnimatingReposts((prev) => { const n = new Set(prev); n.delete(postId); return n; }), 500);

    const wasReposted = myRepostedPostsRef.current.has(postId);

    setMyRepostedPosts((prev) => { 
      const n = new Set(prev); 
      isUnrepost ? n.delete(postId) : n.add(postId); 
      return n; 
    });
    
    setCounts((prev) => ({ 
      ...prev, 
      [postId]: { 
        ...prev[postId], 
        reposts: Math.max(0, (prev[postId]?.reposts || 0) + (isUnrepost ? -1 : 1)) 
      } 
    }));

    try {
      if (isUnrepost) {
        await supabase.from("reposts").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id });
      } else {
        const { error } = await supabase.from("reposts").insert({ post_id: numericPostId, user_id: currentUserRef.current.id, note: finalNote });
        
        if (error) {
          console.error("Gagal Repost:", error.message);
          setMyRepostedPosts((prev) => { 
            const n = new Set(prev); 
            wasReposted ? n.add(postId) : n.delete(postId); 
            return n; 
          });
          setCounts((prev) => ({ 
            ...prev, 
            [postId]: { 
              ...prev[postId], 
              reposts: Math.max(0, (prev[postId]?.reposts || 0) - 1) 
            } 
          }));
        }
      }
    } catch (err) {}
  }, [repostNote]);

  const handleSave = useCallback(async (postId: string) => {
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));
    const numericPostId = parseInt(postId);
    const isSaved = mySavedPostsRef.current.has(postId);

    setMySavedPosts((prev) => { const n = new Set(prev); isSaved ? n.delete(postId) : n.add(postId); return n; });
    setCounts((prev) => ({ ...prev, [postId]: { ...prev[postId], saves: Math.max(0, (prev[postId]?.saves || 0) + (isSaved ? -1 : 1)) } }));

    try {
      if (isSaved) {
        await supabase.from("bookmarks").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id });
      } else {
        const { error } = await supabase.from("bookmarks").insert({ post_id: numericPostId, user_id: currentUserRef.current.id });
        if (error && error.code !== "23505") console.error(error);
      }
    } catch (err) {}
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGloballyMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      // FIX 1: Paksa audio main kalau di-unmute (karena tadi dipause browser)
      document.querySelectorAll(".post-audio-element, .post-video-element").forEach((el: any) => { 
        el.muted = next;
        if (!next && el.paused) {
           el.play().catch(() => {});
        }
      });
      return next;
    });
  }, []);

  const openShareOptions = useCallback((postToShare: any, isOwner: boolean) => {
    if (window.openGlobalShare) {
      window.openGlobalShare(`${window.location.origin}/post?id=${postToShare.id}`, "Postingan HypeTalk", "Lihat karya keren ini di HypeTalk!", postToShare.profiles?.username || "User", postToShare.id, isOwner, postToShare.is_private || false);
    }
  }, []);

  let headerTitle = "Detail Postingan";
  if (source === 'profile' && userPosts.length > 0) {
    if (isMyOwnProfile) {
       headerTitle = "Postingan Anda";
    } else {
       headerTitle = `Postingan ${profileUsername || userPosts[0].profiles?.username || 'User'}`;
    }
  }

  return (
    <div style={{ paddingBottom: '80px', background: 'var(--bg-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-main)', borderBottom: '1px solid var(--border-card)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>{headerTitle}</h2>
      </div>

      <RepostModal isOpen={!!repostModal} postId={repostModal?.postId || ''} creatorId={repostModal?.creatorId || ''} note={repostNote} setNote={setRepostNote} onClose={() => setRepostModal(null)} onConfirm={() => { if (repostModal) handleConfirmRepost(repostModal.postId, repostModal.creatorId, false); }} />
      <ImagePreview imageUrl={activePreviewImage} onClose={() => setActivePreviewImage(null)} />

      {/* GALLERY */}
      <div style={{ flex: 1, position: 'relative', width: '100%', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}>
            <div className="pure-spinner" style={{ margin: '0 auto', width: '30px', height: '30px', border: '3px solid var(--border-card)', borderTopColor: '#1f3cff', borderRadius: '50%', animation: 'pureSpin 1s linear infinite' }}></div>
          </div>
        ) : userPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
            <span className="material-icons" style={{ fontSize: '48px', marginBottom: '10px' }}>error_outline</span>
            <h3>Postingan Tidak Ditemukan</h3>
          </div>
        ) : (
          <div 
            className="gallery" 
            id="mainGallery" 
            style={{ 
              flex: 1, 
              overflowY: 'auto', 
              scrollSnapType: 'y mandatory',
              height: 'calc(100vh - 60px)', 
              width: '100%' 
            }}
          >
            {userPosts.map((p) => {
              const isTextOrAudio = !p.image_url && !p.video_url;
              const isExpanded = expandedPosts.has(p.id);

              return (
                <div 
                  key={p.id} 
                  id={`post-wrapper-${p.id}`} 
                  style={{ 
                    scrollSnapAlign: 'start', 
                    height: 'auto',
                    position: 'relative',
                    width: '100%',
                    padding: isTextOrAudio ? '0 12px' : '0', 
                    marginBottom: isTextOrAudio ? '14px' : '12px'
                  }}
                >
                  <PostCard
                    post={p}
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
                    openRepostModal={(id, cid) => {
                      if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent('openLogin'));
                      if (myRepostedPosts.has(id)) handleConfirmRepost(id, cid, true);
                      else { setRepostNote(""); setRepostModal({ isOpen: true, postId: id, creatorId: cid }); }
                    }}
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
              );
            })}
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes pureSpin { 100% { transform: rotate(360deg); } }
        
        /* FIX 2: CSS Animasi Jantung WAJIB didefinisikan agar tidak rendering di pinggir */
        @keyframes popHeartAnim {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          15% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          30% { transform: translate(-50%, -50%) scale(0.9); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -60%) scale(0); opacity: 0; }
        }

        .big-pop-heart {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) scale(0);
          color: #ff2e63 !important;
          font-size: 160px !important;
          z-index: 9999 !important;
          pointer-events: none !important;
          opacity: 0;
          animation: popHeartAnim 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
          filter: drop-shadow(0 10px 15px rgba(0,0,0,0.3)) !important;
        }

        #mainGallery::-webkit-scrollbar { display: none; }
        #mainGallery { -ms-overflow-style: none; scrollbar-width: none; }

        /* FIX 3: UKURAN KONSISTEN BOX TEKS */
        .media-post-card-wp [data-postid],
        .text-post-card-wp [data-postid] {
          width: 100% !important;
          max-width: 100% !important;
          background: var(--bg-card) !important;
        }

        .text-post-card-wp {
          padding: 0 !important; 
        }

        .media-post-card-wp [data-postid] img,
        .media-post-card-wp [data-postid] video,
        .media-post-card-wp [data-postid] .post-media-wrapper {
          width: 100% !important;
          border-radius: 16px 16px 0 0 !important;
        }

        img, .avatar, [class*="avatar"], .floating-bubbles img, .floating-bubbles div, .liker-bubble img, .reposter-bubble img {
          border-radius: 50% !important;
          aspect-ratio: 1 / 1 !important;
          object-fit: cover !important;
        }
        
        .carousel-item img, .post-video-element, .image-preview-content img {
          border-radius: 0 !important;
          aspect-ratio: auto !important;
        }

        .see-more-btn {
          color: #1f3cff !important;
          cursor: pointer;
          font-size: 13px !important;
          font-weight: 700 !important;
          display: inline-block;
          margin-top: 6px;
          background: none;
          border: none;
          padding: 0;
          z-index: 10;
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
}
