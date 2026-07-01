'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { sendPushAndAppNotif } from '@/lib/notif';
import PostCard from '@/components/post/PostCard';
import RepostModal from '@/components/post/RepostModal';
import ImagePreview from '@/components/post/ImagePreview';

function PostContent() {
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
  
  // NOTE: Key untuk jumlah tanggapan sekarang pakai 'tanggapan' bukan 'comments'
  const [counts, setCounts] = useState<Record<string, { likes: number; tanggapan: number; reposts: number; saves: number }>>({});
  
  const [animatingReposts, setAnimatingReposts] = useState<Set<string>>(new Set());
  const [likersMap, setLikersMap] = useState<Record<string, any[]>>({});
  const [repostersMap, setRepostersMap] = useState<Record<string, any[]>>({});
  
  // State Khusus Tanggapan
  const [tanggapanMap, setTanggapanMap] = useState<Record<string, any[]>>({});
  
  // === STATE MODAL SLIDE UP TANGGAPAN ===
  const [tanggapanModal, setTanggapanModal] = useState<{ isOpen: boolean; postId: string }>({ isOpen: false, postId: '' });
  const [tanggapanInput, setTanggapanInput] = useState('');
  const [isSubmittingTanggapan, setIsSubmittingTanggapan] = useState(false);
  // ================================================

  const [poppingHeart, setPoppingHeart] = useState<string | null>(null);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const [repostModal, setRepostModal] = useState<{ isOpen: boolean; postId: string; creatorId: string } | null>(null);
  const [repostNote, setRepostNote] = useState("");
  
  const [isGloballyMuted, setIsGloballyMuted] = useState(true);
  const isMutedRef = useRef(true);

  const lastTapRef = useRef<Record<string, number>>({});
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  const [profileUsername, setProfileUsername] = useState<string>('');
  const [isMyOwnProfile, setIsMyOwnProfile] = useState<boolean>(false);

  const myLikedPostsRef = useRef(myLikedPosts);
  const myRepostedPostsRef = useRef(myRepostedPosts);
  const mySavedPostsRef = useRef(mySavedPosts);
  const followedUsersRef = useRef(followedUsers);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

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
      .from('posts').select('creator_id').eq('id', postIdFromUrl).maybeSingle(); 

    if (errExact || !exactPost) {
      setUserPosts([]);
      setIsLoading(false);
      return;
    }

    const targetUserId = exactPost.creator_id; 
    const isMe = user && targetUserId === user.id;
    setIsMyOwnProfile(isMe);

    if (!isMe) {
      const { data: profileData } = await supabase.from('profiles').select('username').eq('id', targetUserId).maybeSingle(); 
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
    const [likesRes, tanggapanRes, repostsRes, savesRes] = await Promise.all([
      supabase.from('likes').select('user_id, profiles:user_id(id, username, avatar_url)').eq('post_id', postId),
      supabase.from('tanggapan') // <-- Update ke tabel tanggapan
        .select('id, post_id, user_id, content, created_at, profiles:user_id(full_name, username, role, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true }),
      supabase.from('reposts').select('user_id, note, profiles:user_id(id, username, avatar_url)').eq('post_id', postId),
      supabase.rpc('get_bookmark_counts', { post_ids: [postId] })
    ]);

    const transformedTanggapan = tanggapanRes.data?.map((t: any) => ({
      id: `tanggapan-${t.id}`, 
      real_tanggapan_id: t.id,
      post_id: t.post_id,
      creator_id: t.user_id,
      bio: t.content || '',
      created_at: t.created_at,
      profiles: t.profiles,
      image_url: null,
      video_url: null,
      audio_src: null,
    })) || [];

    setTanggapanMap(prev => ({ ...prev, [pid]: transformedTanggapan }));

    setCounts(prev => {
      const baseCounts = {
        ...prev,
        [pid]: {
          likes: likesRes.data?.length || 0,
          tanggapan: transformedTanggapan.length,
          reposts: repostsRes.data?.length || 0,
          saves: (savesRes.data && savesRes.data[0]?.count) || 0,
        }
      };

      transformedTanggapan.forEach((t: any) => {
        baseCounts[t.id] = { likes: 0, tanggapan: 0, reposts: 0, saves: 0 };
      });

      return baseCounts;
    });

    setLikersMap(prev => ({ ...prev, [pid]: likesRes.data?.map(l => l.profiles) || [] }));
    setRepostersMap(prev => ({ ...prev, [pid]: repostsRes.data?.map(r => ({ ...r.profiles, note: r.note })) || [] }));

    if (user) {
      const liked = likesRes.data?.some(l => String(l.user_id) === user.id) || false;
      const reposted = repostsRes.data?.some(r => String(r.user_id) === user.id) || false;
      
      const { data: userBookmark } = await supabase.from('bookmarks').select('user_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle(); 
      const isSavedByUser = !!userBookmark;
      
      setMyLikedPosts(prev => { const n = new Set(prev); if (liked) n.add(pid); return n; });
      setMyRepostedPosts(prev => { const n = new Set(prev); if (reposted) n.add(pid); return n; });
      setMySavedPosts(prev => { const n = new Set(prev); if (isSavedByUser) n.add(pid); return n; });
    }
  };

  useEffect(() => {
    if (!isLoading && userPosts.length > 0 && postIdFromUrl) {
      const scrollToPost = () => {
        const targetPost = document.getElementById(`post-wrapper-${postIdFromUrl}`);
        if (targetPost) {
          targetPost.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      };
      const timer1 = setTimeout(scrollToPost, 150);
      const timer2 = setTimeout(scrollToPost, 600);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [isLoading, userPosts, postIdFromUrl]);

  // === FUNGSI SUBMIT TANGGAPAN BARU ===
  const handleSubmitTanggapan = async () => {
    if (!tanggapanInput.trim() || !currentUserRef.current || !tanggapanModal.postId) return;
    
    setIsSubmittingTanggapan(true);
    const postIdNum = parseInt(tanggapanModal.postId);

    try {
      const { data, error } = await supabase
        .from('tanggapan') // <-- Update ke tabel tanggapan
        .insert({
          post_id: postIdNum,
          user_id: currentUserRef.current.id,
          content: tanggapanInput.trim()
        })
        .select('id, post_id, user_id, content, created_at, profiles:user_id(full_name, username, role, avatar_url)')
        .single();

      if (!error && data) {
        const newTanggapan = {
          id: `tanggapan-${data.id}`,
          real_tanggapan_id: data.id,
          post_id: data.post_id,
          creator_id: data.user_id,
          bio: data.content,
          created_at: data.created_at,
          profiles: data.profiles,
          image_url: null,
          video_url: null,
          audio_src: null,
        };

        setTanggapanMap(prev => ({
          ...prev,
          [tanggapanModal.postId]: [...(prev[tanggapanModal.postId] || []), newTanggapan]
        }));

        setCounts(prev => ({
          ...prev,
          [tanggapanModal.postId]: {
            ...prev[tanggapanModal.postId],
            tanggapan: (prev[tanggapanModal.postId]?.tanggapan || 0) + 1
          },
          [newTanggapan.id]: { likes: 0, tanggapan: 0, reposts: 0, saves: 0 }
        }));

        const postOwner = userPosts.find(p => String(p.id) === String(tanggapanModal.postId))?.creator_id;
        if (postOwner && postOwner !== currentUserRef.current.id) {
          // Tetap bisa pakai type: "comment" di notifikasi jika sistem notif-mu masih mendeteksi "comment"
          // Atau ubah ke "tanggapan" jika push notification handler-mu juga diubah
          await sendPushAndAppNotif({ 
            senderId: currentUserRef.current.id, 
            receiverId: postOwner, 
            type: "tanggapan", 
            postId: tanggapanModal.postId 
          });
        }

        setTanggapanModal({ isOpen: false, postId: '' });
        setTanggapanInput('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingTanggapan(false);
    }
  };
  // =====================================

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
    if (String(postId).startsWith('tanggapan-')) return; 

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
    if (String(postId).startsWith('tanggapan-')) return;

    const numericPostId = parseInt(postId);
    const finalNote = repostNote.trim().substring(0, 15);
    setRepostModal(null);

    setAnimatingReposts((prev) => new Set(prev).add(postId));
    setTimeout(() => setAnimatingReposts((prev) => { const n = new Set(prev); n.delete(postId); return n; }), 500);

    const wasReposted = myRepostedPostsRef.current.has(postId);
    setMyRepostedPosts((prev) => { const n = new Set(prev); isUnrepost ? n.delete(postId) : n.add(postId); return n; });
    setCounts((prev) => ({ ...prev, [postId]: { ...prev[postId], reposts: Math.max(0, (prev[postId]?.reposts || 0) + (isUnrepost ? -1 : 1)) } }));

    try {
      if (isUnrepost) {
        await supabase.from("reposts").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id });
      } else {
        const { error } = await supabase.from("reposts").insert({ post_id: numericPostId, user_id: currentUserRef.current.id, note: finalNote });
        if (error) {
          setMyRepostedPosts((prev) => { const n = new Set(prev); wasReposted ? n.add(postId) : n.delete(postId); return n; });
          setCounts((prev) => ({ ...prev, [postId]: { ...prev[postId], reposts: Math.max(0, (prev[postId]?.reposts || 0) - 1) } }));
        }
      }
    } catch (err) {}
  }, [repostNote]);

  const handleSave = useCallback(async (postId: string) => {
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));
    if (String(postId).startsWith('tanggapan-')) return;

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
      document.querySelectorAll(".post-audio-element, .post-video-element").forEach((el: any) => { el.muted = next; });
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
    <div style={{ background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', position: 'relative' }}>
      
      {/* SLIDE UP MODAL TANGGAPAN */}
      {tanggapanModal.isOpen && (
        <>
          <div 
            onClick={() => { setTanggapanModal({ isOpen: false, postId: '' }); setTanggapanInput(''); }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9998, transition: 'opacity 0.3s' }} 
          />
          <div className="slide-up-modal" style={{ 
            position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: '600px', margin: '0 auto', 
            backgroundColor: 'var(--bg-main)', zIndex: 9999, 
            borderTopLeftRadius: '24px', borderTopRightRadius: '24px', 
            padding: '20px 24px 30px', display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
          }}>
            <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--border-card)', borderRadius: '10px', alignSelf: 'center', marginBottom: '8px' }} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>Beri Tanggapan</h3>
            <textarea
              autoFocus
              placeholder="Apa yang ingin kamu sampaikan?"
              value={tanggapanInput}
              onChange={(e) => setTanggapanInput(e.target.value)}
              style={{ 
                width: '100%', minHeight: '120px', backgroundColor: 'transparent', 
                color: 'var(--text-main)', border: 'none', outline: 'none', 
                resize: 'none', fontSize: '16px', lineHeight: '1.5'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                disabled={!tanggapanInput.trim() || isSubmittingTanggapan}
                onClick={handleSubmitTanggapan}
                style={{ 
                  backgroundColor: '#1f3cff', color: '#fff', border: 'none', 
                  padding: '10px 24px', borderRadius: '24px', fontWeight: 700, fontSize: '15px',
                  cursor: tanggapanInput.trim() ? 'pointer' : 'not-allowed', 
                  opacity: tanggapanInput.trim() ? 1 : 0.6,
                  transition: 'opacity 0.2s'
                }}
              >
                {isSubmittingTanggapan ? 'Mengirim...' : 'Kirim'}
              </button>
            </div>
          </div>
        </>
      )}

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
              width: '100%', display: 'flex', flexDirection: 'column', gap: '0px'
            }}
          >
            {userPosts.map((p) => {
              const isTextOrAudio = !p.image_url && !p.video_url;
              const isExpanded = expandedPosts.has(p.id);
              
              const postTanggapan = tanggapanMap[String(p.id)] || [];

              return (
                <div 
                  key={p.id} 
                  id={`post-wrapper-${p.id}`} 
                  style={{ position: 'relative', width: '100%', padding: isTextOrAudio ? '0 12px' : '0', paddingBottom: postTanggapan.length > 0 ? '16px' : '0' }}
                >
                  {/* GARIS VERTIKAL PENGHUBUNG THREAD */}
                  {isTextOrAudio && postTanggapan.length > 0 && (
                    <div 
                      style={{
                        position: 'absolute', left: '48px', top: '70px', bottom: '50px',
                        width: '2px', backgroundColor: 'var(--border-card)', zIndex: 10,
                        pointerEvents: 'none', opacity: 0.8
                      }}
                    />
                  )}

                  {/* POSTINGAN UTAMA */}
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
                    // BUKA MODAL TANGGAPAN
                    onTanggapanClick={(id) => {
                      if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent('openLogin'));
                      setTanggapanInput('');
                      setTanggapanModal({ isOpen: true, postId: String(id) });
                    }}
                  />

                  {/* Teks Penanda Jumlah Tanggapan */}
                  {isTextOrAudio && postTanggapan.length > 0 && (
                    <div style={{ padding: '4px 16px', marginLeft: '38px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                       {postTanggapan.length} Tanggapan
                    </div>
                  )}

                  {/* AREA BALASAN / TANGGAPAN USER LAIN */}
                  {isTextOrAudio && postTanggapan.map((tanggapanItem) => (
                    <div 
                      key={tanggapanItem.id}
                      style={{ position: 'relative', width: '100%', marginTop: '-13px', padding: '0' }}
                    >
                      <PostCard
                        post={tanggapanItem}
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
                        openRepostModal={() => {}} 
                        handleMediaClick={handleMediaClick}
                        toggleMute={toggleMute}
                        openShareOptions={openShareOptions}
                        handleFollowToggle={handleFollowToggle}
                        setActivePreviewImage={setActivePreviewImage}
                        router={router}
                        t={t}
                        isExpanded={false}
                        onToggleExpand={() => {}}
                        // Klik icon tanggapan di level anak = membalas di thread post utama
                        onTanggapanClick={() => {
                           if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent('openLogin'));
                           setTanggapanInput('');
                           setTanggapanModal({ isOpen: true, postId: String(p.id) });
                        }}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* SUNTIKAN CSS GLOBAL & ANIMASI MODAL */}
      <style>{`
        @keyframes pureSpin { 100% { transform: rotate(360deg); } }
        @keyframes popHeartAnim {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          15% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          30% { transform: translate(-50%, -50%) scale(0.9); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -60%) scale(0); opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .slide-up-modal {
          animation: slideUp 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        #mainGallery::-webkit-scrollbar { display: none; }
        #mainGallery { -ms-overflow-style: none; scrollbar-width: none; }

        .avatar, [class*="avatar"], .floating-bubbles img, .floating-bubbles div, .liker-bubble img, .reposter-bubble img {
          border-radius: 50% !important;
          aspect-ratio: 1 / 1 !important;
          object-fit: cover !important;
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

export default function PostPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}>
        <div className="pure-spinner" style={{ margin: '0 auto', width: '30px', height: '30px', border: '3px solid var(--border-card)', borderTopColor: '#1f3cff', borderRadius: '50%', animation: 'pureSpin 1s linear infinite' }}></div>
      </div>
    }>
      <PostContent />
    </Suspense>
  );
}
