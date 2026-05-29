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

  // Mode profil
  const [profileUsername, setProfileUsername] = useState<string>('');
  const [isMyOwnProfile, setIsMyOwnProfile] = useState<boolean>(false);

  // Observer autoplay
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Refs untuk menghindari closure basi
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
      .single();

    if (errExact || !exactPost) {
      setUserPosts([]);
      setIsLoading(false);
      return;
    }

    const targetUserId = exactPost.creator_id; 

    const isMe = user && targetUserId === user.id;
    setIsMyOwnProfile(isMe);

    if (!isMe) {
      const { data: profileData } = await supabase.from('profiles').select('username').eq('id', targetUserId).single();
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
        .single();

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
      const { data: userBookmark } = await supabase.from('bookmarks').select('user_id').eq('post_id', postId).eq('user_id', user.id).single();
      const isSavedByUser = !!userBookmark;
      
      setMyLikedPosts(prev => { const n = new Set(prev); if (liked) n.add(pid); return n; });
      setMyRepostedPosts(prev => { const n = new Set(prev); if (reposted) n.add(pid); return n; });
      setMySavedPosts(prev => { const n = new Set(prev); if (isSavedByUser) n.add(pid); return n; });
    }
  };

  // Scroll otomatis ke postingan awal
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

  const handleFollowToggle = useCallback(async (e: any, creatorId: string) => { /* Code unchanged */ }, []);
  const handleLike = useCallback(async (postId: string, creatorId: string) => { /* Code unchanged */ }, []);
  const handleMediaClick = useCallback((e: React.MouseEvent, postId: string, creatorId: string, imageUrl?: string) => { /* Code unchanged */ }, [handleLike]);
  const handleConfirmRepost = useCallback(async (postId: string, creatorId: string, isUnrepost: boolean = false) => { /* Code unchanged */ }, [repostNote]);
  const handleSave = useCallback(async (postId: string) => { /* Code unchanged */ }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGloballyMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      document.querySelectorAll(".post-audio-element, .post-video-element").forEach((el: any) => { el.muted = next; });
      return next;
    });
  }, []);

  const openShareOptions = useCallback((postToShare: any, isOwner: boolean) => {
    if (window.openGlobalShare) {
      window.openGlobalShare(`${window.location.origin}/post?id=${postToShare.id}`, "Postingan HypeTalk", "Lihat karya keren ini di HypeTalk!", postToShare.profiles?.username || "User", postToShare.id, isOwner, postToShare.is_private || false);
    }
  }, []);

  // 🔥 PERBAIKAN OBSERVER UNTUK AUTOPLAY MEDIA 🔥
  useEffect(() => {
    if (userPosts.length === 0) return;
    
    // Kasih delay lebih panjang dikit (800ms) biar komponen PostCard beneran kelar ngerender video/audio ke DOM
    const timer = setTimeout(() => {
      if (observerRef.current) observerRef.current.disconnect();

      const container = document.getElementById('mainGallery');
      
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          // Cari SEMUA elemen media, pakai querySelectorAll biar nangkep semua kalo misal ada double
          const mediaNodes = entry.target.querySelectorAll(".post-audio-element, .post-video-element");
          
          mediaNodes.forEach(node => {
            const media = node as HTMLMediaElement;
            
            if (entry.isIntersecting) {
              media.muted = isMutedRef.current;
              
              // Handle Promise dari .play() buat hindarin error kalau diblokir browser
              const playPromise = media.play();
              if (playPromise !== undefined) {
                playPromise.catch((err) => {
                  console.warn("Autoplay diblokir, paksa mode bisu (muted)...", err);
                  // Kalau diblokir, paksa mute lalu play ulang. Browser biasanya ngebolehin autoplay kalau suaranya mati
                  media.muted = true;
                  isMutedRef.current = true;
                  setIsGloballyMuted(true);
                  media.play().catch(() => {});
                });
              }
            } else {
              // Pause kalau keluar layar
              media.pause();
            }
          });
        });
      }, { 
        root: container, // 🔥 WAJIB: Biar observer ngebacanya dari dalam kotak gallery, bukan dari layar utuh
        threshold: 0.6   // 🔥 Video/Music diputar pas udah 60% kelihatan, biar ga tumpang tindih
      });

      // Assign observer ke setiap wrapper post
      userPosts.forEach(p => {
        const wrapperEl = document.getElementById(`post-wrapper-${p.id}`);
        if (wrapperEl) observerRef.current?.observe(wrapperEl);
      });
      
    }, 800);

    return () => { 
      clearTimeout(timer); 
      observerRef.current?.disconnect(); 
    };
  }, [userPosts]);

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

      {/* KONTEN GALLERY SCROLLABLE */}
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
            {userPosts.map((p) => (
              <div 
                key={p.id} 
                id={`post-wrapper-${p.id}`} 
                style={{ 
                  scrollSnapAlign: 'start', 
                  height: '100%', 
                  position: 'relative' 
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
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @keyframes pureSpin { 100% { transform: rotate(360deg); } }
        #mainGallery::-webkit-scrollbar { display: none; }
        #mainGallery { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
