'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { sendPushAndAppNotif } from '@/lib/notif';
import PostCard from '@/components/post/PostCard';
import RepostModal from '@/components/post/RepostModal';
import ImagePreview from '@/components/post/ImagePreview';

export default function PostPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const postIdFromUrl = searchParams.get('id');
  const source = searchParams.get('from');        // 'profile' atau lainnya
  const userIdParam = searchParams.get('userId'); // hanya jika from=profile

  const [post, setPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const currentUserRef = useRef<any>(null);

  // Interaksi seperti gallery
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

  // Untuk mode profil: daftar postingan user & navigasi
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [activePostIndex, setActivePostIndex] = useState(0);
  const [profileUsername, setProfileUsername] = useState<string>('');

  // Observer autoplay
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Inisialisasi
  useEffect(() => {
    if (postIdFromUrl) {
      initializePage();
    } else {
      setIsLoading(false);
    }
  }, [postIdFromUrl, source, userIdParam]);

  const initializePage = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    setCurrentUser(user);

    // Ambil data relasi
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

    // Tentukan mode: profil atau default
    if (source === 'profile') {
      await loadProfileMode(user);
    } else {
      await loadSinglePost(postIdFromUrl!, user);
    }
  };

  // Mode profil: ambil semua postingan user tersebut
  const loadProfileMode = async (user: any) => {
    const targetUserId = userIdParam || user?.id; // fallback ke user sendiri jika tidak ada
    if (!targetUserId) {
      setIsLoading(false);
      return;
    }

    // Ambil username untuk judul jika bukan milik sendiri
    if (targetUserId !== user?.id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', targetUserId)
        .single();
      if (profileData) setProfileUsername(profileData.username);
    }

    // Ambil semua postingan user tersebut (approved)
    const { data: postsData, error } = await supabase
      .from('posts')
      .select(`id, image_url, video_url, audio_src, title, artist, bio, created_at, creator_id, category, views, is_private, is_ad, profiles:creator_id (full_name, username, role, avatar_url, is_private)`)
      .eq('creator_id', targetUserId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error || !postsData) {
      setPost(null);
      setIsLoading(false);
      return;
    }

    // Filter privasi
    const filtered = postsData.filter(p => {
      if (!p.profiles?.is_private) return true;
      if (user && p.creator_id === user.id) return true;
      if (user && mutualUsers.has(p.creator_id)) return true;
      return false;
    });

    setUserPosts(filtered);

    // Cari index post yang diminta
    const idx = filtered.findIndex(p => String(p.id) === postIdFromUrl);
    const startIdx = idx >= 0 ? idx : 0;
    setActivePostIndex(startIdx);
    const activePost = filtered[startIdx] || null;
    setPost(activePost);

    // Ambil interaksi untuk post yang aktif
    if (activePost) {
      await fetchPostInteractions(activePost.id, user);
    }

    setIsLoading(false);
  };

  // Mode default: satu post
  const loadSinglePost = async (id: string, user: any) => {
    try {
      const { data: postData, error } = await supabase
        .from('posts')
        .select(`id, image_url, video_url, audio_src, title, artist, bio, created_at, creator_id, category, views, is_private, is_ad, profiles:creator_id (full_name, username, role, avatar_url, is_private)`)
        .eq('id', id)
        .single();

      if (error || !postData) {
        setPost(null);
        setIsLoading(false);
        return;
      }

      setPost(postData);
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
      supabase.from('bookmarks').select('user_id').eq('post_id', postId),
    ]);

    setCounts({
      [pid]: {
        likes: likesRes.data?.length || 0,
        comments: commentsRes.count || 0,
        reposts: repostsRes.data?.length || 0,
        saves: savesRes.data?.length || 0,
      }
    });
    setLikersMap({ [pid]: likesRes.data?.map(l => l.profiles) || [] });
    setRepostersMap({ [pid]: repostsRes.data?.map(r => ({ ...r.profiles, note: r.note })) || [] });

    if (user) {
      const liked = likesRes.data?.some(l => String(l.user_id) === user.id) || false;
      const reposted = repostsRes.data?.some(r => String(r.user_id) === user.id) || false;
      const saved = savesRes.data?.some(s => String(s.user_id) === user.id) || false;
      setMyLikedPosts(new Set(liked ? [pid] : []));
      setMyRepostedPosts(new Set(reposted ? [pid] : []));
      setMySavedPosts(new Set(saved ? [pid] : []));
    }
  };

  // Navigasi untuk mode profil
  const navigateProfilePost = useCallback((direction: 'prev' | 'next') => {
    if (userPosts.length === 0) return;
    let newIndex = activePostIndex;
    if (direction === 'prev') newIndex = (activePostIndex - 1 + userPosts.length) % userPosts.length;
    else newIndex = (activePostIndex + 1) % userPosts.length;

    const newPost = userPosts[newIndex];
    setActivePostIndex(newIndex);
    setPost(newPost);
    // Update URL tanpa reload
    const newUrl = `/post?id=${newPost.id}&from=profile&userId=${newPost.creator_id}`;
    router.replace(newUrl, { scroll: false });
    // Ambil interaksi baru
    fetchPostInteractions(newPost.id, currentUserRef.current);
  }, [activePostIndex, userPosts, router]);

  // --- Handler interaksi (sama persis dengan galerypost, menggunakan ref) ---
  const handleFollowToggle = useCallback(async (e: any, creatorId: string) => {
    e.stopPropagation();
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));
    if (currentUserRef.current.id === creatorId) return;
    const isFollowing = followedUsers.has(creatorId);
    setAnimatingFollows(new Set([creatorId]));
    setTimeout(() => setAnimatingFollows(new Set()), 200);
    setFollowedUsers(prev => {
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
  }, [followedUsers]);

  const handleLike = useCallback(async (postId: string, creatorId: string) => {
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));
    const isLiked = myLikedPosts.has(postId);
    const numericPostId = parseInt(postId);
    setMyLikedPosts(prev => { const newSet = new Set(prev); isLiked ? newSet.delete(postId) : newSet.add(postId); return newSet; });
    setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], likes: Math.max(0, (prev[postId]?.likes || 0) + (isLiked ? -1 : 1)) } }));
    try {
      if (isLiked) await supabase.from("likes").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id });
      else {
        const { error } = await supabase.from("likes").insert({ post_id: numericPostId, user_id: currentUserRef.current.id });
        if (!error && creatorId !== currentUserRef.current.id) await sendPushAndAppNotif({ senderId: currentUserRef.current.id, receiverId: creatorId, type: "like", postId });
      }
    } catch (err) {}
  }, [myLikedPosts]);

  const handleMediaClick = useCallback((e: React.MouseEvent, postId: string, creatorId: string, imageUrl?: string) => {
    const now = Date.now();
    const lastTapTime = lastTapRef.current[postId] || 0;
    if (now - lastTapTime < 350) {
      lastTapRef.current[postId] = 0;
      if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));
      setPoppingHeart(postId);
      setTimeout(() => setPoppingHeart(null), 1000);
      if (!myLikedPosts.has(postId)) handleLike(postId, creatorId);
    } else {
      lastTapRef.current[postId] = now;
      if (imageUrl) setTimeout(() => { if (lastTapRef.current[postId] === now) { setActivePreviewImage(imageUrl); lastTapRef.current[postId] = 0; } }, 360);
    }
  }, [myLikedPosts, handleLike]);

  const handleConfirmRepost = useCallback(async (postId: string, creatorId: string, isUnrepost: boolean = false) => {
    const numericPostId = parseInt(postId);
    const finalNote = repostNote.trim().substring(0, 15);
    setRepostModal(null);
    setAnimatingReposts(new Set([postId]));
    setTimeout(() => setAnimatingReposts(new Set()), 500);
    setMyRepostedPosts(prev => { const newSet = new Set(prev); isUnrepost ? newSet.delete(postId) : newSet.add(postId); return newSet; });
    setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], reposts: Math.max(0, (prev[postId]?.reposts || 0) + (isUnrepost ? -1 : 1)) } }));
    try {
      if (isUnrepost) await supabase.from("reposts").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id });
      else await supabase.from("reposts").insert({ post_id: numericPostId, user_id: currentUserRef.current.id, note: finalNote });
    } catch (err) {}
  }, [repostNote]);

  const handleSave = useCallback(async (postId: string) => {
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent("openLogin"));
    const isSaved = mySavedPosts.has(postId);
    const numericPostId = parseInt(postId);
    setMySavedPosts(prev => { const newSet = new Set(prev); isSaved ? newSet.delete(postId) : newSet.add(postId); return newSet; });
    setCounts(prev => ({ ...prev, [postId]: { ...prev[postId], saves: Math.max(0, (prev[postId]?.saves || 0) + (isSaved ? -1 : 1)) } }));
    try {
      if (isSaved) await supabase.from("bookmarks").delete().match({ post_id: numericPostId, user_id: currentUserRef.current.id });
      else await supabase.from("bookmarks").insert({ post_id: numericPostId, user_id: currentUserRef.current.id });
    } catch (err) {}
  }, [mySavedPosts]);

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

  // --- Autoplay observer untuk halaman detail ---
  useEffect(() => {
    if (!post) return;
    // Tunggu render card
    const timer = setTimeout(() => {
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            const card = entry.target;
            const audio = card.querySelector(".post-audio-element") as HTMLAudioElement;
            const video = card.querySelector(".post-video-element") as HTMLVideoElement;
            const media = audio || video;
            if (!media) return;
            if (entry.isIntersecting) {
              media.muted = isMutedRef.current;
              media.currentTime = 0;
              media.play().catch(() => {});
            } else {
              media.pause();
            }
          });
        },
        { threshold: 0.6 }
      );
      const cardEl = document.querySelector('.card');
      if (cardEl) observerRef.current.observe(cardEl);
    }, 100);
    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [post]);

  // --- JUDUL DINAMIS ---
  let title = "Detail Postingan";
  if (source === 'profile') {
    if (userIdParam && userIdParam !== currentUser?.id) {
      title = `Postingan ${profileUsername || 'User'}`;
    } else {
      title = "Postingan Anda";
    }
  }

  return (
    <div style={{ paddingBottom: '80px', background: 'var(--bg-main)', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-main)', borderBottom: '1px solid var(--border-card)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>{title}</h2>
        {source === 'profile' && userPosts.length > 1 && (
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '20px' }}>
            {activePostIndex + 1} / {userPosts.length}
          </span>
        )}
      </div>

      <RepostModal isOpen={!!repostModal} postId={repostModal?.postId || ''} creatorId={repostModal?.creatorId || ''} note={repostNote} setNote={setRepostNote} onClose={() => setRepostModal(null)} onConfirm={() => { if (repostModal) handleConfirmRepost(repostModal.postId, repostModal.creatorId, false); }} />
      <ImagePreview imageUrl={activePreviewImage} onClose={() => setActivePreviewImage(null)} />

      {/* NAVIGASI MODE PROFIL */}
      {source === 'profile' && userPosts.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px 0' }}>
          <button
            onClick={() => navigateProfilePost('prev')}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '8px 16px', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span className="material-icons" style={{ fontSize: '18px' }}>chevron_left</span> Sebelumnya
          </button>
          <button
            onClick={() => navigateProfilePost('next')}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '8px 16px', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Selanjutnya <span className="material-icons" style={{ fontSize: '18px' }}>chevron_right</span>
          </button>
        </div>
      )}

      {/* RENDER KONTEN */}
      <div style={{ marginTop: '10px' }}>
        {isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div className="pure-spinner" style={{ margin: '0 auto', width: '30px', height: '30px', border: '3px solid var(--border-card)', borderTopColor: '#1f3cff', borderRadius: '50%', animation: 'pureSpin 1s linear infinite' }}></div>
          </div>
        ) : !post ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
            <span className="material-icons" style={{ fontSize: '48px', marginBottom: '10px' }}>error_outline</span>
            <h3>Postingan Tidak Ditemukan</h3>
            <p>Mungkin postingan ini sudah dihapus atau tidak tersedia.</p>
          </div>
        ) : (
          <div className="gallery">
            <PostCard
              post={post}
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
        )}
      </div>
      <style>{`
        @keyframes pureSpin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
