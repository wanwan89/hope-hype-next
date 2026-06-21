'use client';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Virtuoso } from 'react-virtuoso';

import { supabase } from '@/lib/supabase';
import { sendPushAndAppNotif } from '@/lib/notif';
import { useFeed } from '@/hooks/useFeed';
import { useVideoManager } from '@/hooks/useVideoManager';
import { useLazyMedia } from '@/hooks/useLazyMedia';
import { useScrollPersistence } from '@/hooks/useScrollPersistence';

import PostCardMemo from './PostCardMemo';
import RepostModal from './RepostModal';
import ImagePreview from './ImagePreview';
import SuggestedUsers from './SuggestedUsers';
import './Gallery.css';

// Cloudinary helper
const getOptimizedImage = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('res.cloudinary.com')) {
    if (!cleanUrl.includes('f_auto'))
      cleanUrl = cleanUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_auto,dpr_auto/');
    return cleanUrl;
  }
  return cleanUrl;
};

// Memoized components tetap sama (tanpa perubahan)
const MemoizedSlider = React.memo(({ posts }: { posts: any[] }) => {
  if (!posts.length) return null;
  // render seperti sebelumnya ...
  return null;
});
MemoizedSlider.displayName = 'MemoizedSlider';

const MemoizedSuggested = React.memo(SuggestedUsers, (prev, next) =>
  prev.myId === next.myId && prev.followedUsers === next.followedUsers
);

export default function Gallerypost() {
  const { t } = useTranslation();
  const router = useRouter();

  // State untuk user dan data interaksi (dipisah dari data feed)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [mutualUsers, setMutualUsers] = useState<Set<string>>(new Set());
  const followedUsersRef = useRef(followedUsers);
  useEffect(() => { followedUsersRef.current = followedUsers; }, [followedUsers]);

  // State untuk animasi dan modal (tidak memengaruhi daftar)
  const [animatingFollows, setAnimatingFollows] = useState<Set<string>>(new Set());
  const [animatingReposts, setAnimatingReposts] = useState<Set<string>>(new Set());
  const [poppingHeart, setPoppingHeart] = useState<string | null>(null);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const [repostModal, setRepostModal] = useState<any>(null);
  const [repostNote, setRepostNote] = useState('');
  const [isGloballyMuted, setIsGloballyMuted] = useState(true);

  // Kategori dan scroll persistence
  const [currentCategory, setCurrentCategory] = useState('all');
  const { restoreScroll } = useScrollPersistence('gallery');

  // Hooks kustom
  const {
    allPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useFeed(currentCategory, currentUser, mutualUsers);

  const { observeVideo, pauseAll } = useVideoManager(allPosts.map(p => p.id));
  const { observeImage } = useLazyMedia('400px'); // preload 400px ahead

  // Data likes/reposts/saves/counts disimpan per post secara terpisah agar tidak memicu re-render massal
  const [postInteractions, setPostInteractions] = useState<
    Record<string, { isLiked: boolean; isReposted: boolean; isSaved: boolean; counts: any }>
  >({});

  // Inisialisasi user dan follows (hanya sekali)
  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) setCurrentUser(profile);
        // Ambil following
        const [followsRes, followersRes] = await Promise.all([
          supabase.from('followers').select('following_id').eq('follower_id', session.user.id),
          supabase.from('followers').select('follower_id').eq('following_id', session.user.id),
        ]);
        if (followsRes.data) {
          const followingSet = new Set(followsRes.data.map(f => String(f.following_id)));
          setFollowedUsers(followingSet);
          if (followersRes.data) {
            const followerSet = new Set(followersRes.data.map(f => String(f.follower_id)));
            setMutualUsers(new Set([...followingSet].filter(x => followerSet.has(x))));
          }
        }
      }
    };
    initUser();
  }, []);

  // Saat feed data berubah, ambil interaksi untuk semua post yang baru muncul
  useEffect(() => {
    if (!currentUser || allPosts.length === 0) return;

    const postIds = allPosts.map(p => p.id);
    const fetchInteractions = async () => {
      const [likesRes, repostsRes, savesRes, countsRes] = await Promise.all([
        supabase.from('likes').select('post_id').in('post_id', postIds).eq('user_id', currentUser.id),
        supabase.from('reposts').select('post_id').in('post_id', postIds).eq('user_id', currentUser.id),
        supabase.from('bookmarks').select('post_id').in('post_id', postIds).eq('user_id', currentUser.id),
        // Ambil counts via RPC atau aggregate
        supabase.rpc('get_post_counts', { post_ids: postIds }), // Anda perlu membuat function ini di Supabase
      ]);

      const likedSet = new Set(likesRes.data?.map(l => String(l.post_id)));
      const repostSet = new Set(repostsRes.data?.map(r => String(r.post_id)));
      const saveSet = new Set(savesRes.data?.map(s => String(s.post_id)));

      const newInteractions: any = {};
      postIds.forEach(id => {
        newInteractions[id] = {
          isLiked: likedSet.has(id),
          isReposted: repostSet.has(id),
          isSaved: saveSet.has(id),
          counts: countsRes.data?.[id] ?? { likes: 0, comments: 0, reposts: 0, saves: 0 },
        };
      });

      setPostInteractions(prev => ({ ...prev, ...newInteractions }));
    };

    fetchInteractions();
  }, [allPosts, currentUser]);

  // Callback yang di-memo agar referensinya stabil (tidak berubah setiap render)
  const handleLike = useCallback(async (postId: string) => {
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent('openLogin'));
    const currentInteractions = postInteractions[postId];
    if (!currentInteractions) return;
    const wasLiked = currentInteractions.isLiked;

    // Optimistic update
    setPostInteractions(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        isLiked: !wasLiked,
        counts: {
          ...prev[postId].counts,
          likes: prev[postId].counts.likes + (wasLiked ? -1 : 1),
        },
      },
    }));

    try {
      if (wasLiked) {
        await supabase.from('likes').delete().match({ post_id: parseInt(postId), user_id: currentUserRef.current.id });
      } else {
        const { error } = await supabase.from('likes').insert({ post_id: parseInt(postId), user_id: currentUserRef.current.id });
        if (!error && allPosts.find(p => p.id === postId)?.creator_id !== currentUserRef.current.id) {
          await sendPushAndAppNotif({ senderId: currentUserRef.current.id, receiverId: allPosts.find(p => p.id === postId)!.creator_id, type: 'like', postId });
        }
      }
    } catch {
      // Rollback
      setPostInteractions(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          isLiked: wasLiked,
          counts: {
            ...prev[postId].counts,
            likes: prev[postId].counts.likes + (wasLiked ? 1 : -1),
          },
        },
      }));
    }
  }, [postInteractions, allPosts]);

  const handleSave = useCallback(async (postId: string) => {
    if (!currentUserRef.current) return window.dispatchEvent(new CustomEvent('openLogin'));
    const current = postInteractions[postId];
    const wasSaved = current?.isSaved;
    setPostInteractions(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        isSaved: !wasSaved,
        counts: {
          ...prev[postId].counts,
          saves: prev[postId].counts.saves + (wasSaved ? -1 : 1),
        },
      },
    }));
    try {
      if (wasSaved) await supabase.from('bookmarks').delete().match({ post_id: parseInt(postId), user_id: currentUserRef.current.id });
      else await supabase.from('bookmarks').insert({ post_id: parseInt(postId), user_id: currentUserRef.current.id });
    } catch { /* rollback */ }
  }, [postInteractions]);

  const handleRepost = useCallback(async () => {
    if (!repostModal) return;
    const { postId } = repostModal;
    const current = postInteractions[postId];
    const wasReposted = current?.isReposted;
    setRepostModal(null);
    setPostInteractions(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        isReposted: !wasReposted,
        counts: {
          ...prev[postId].counts,
          reposts: prev[postId].counts.reposts + (wasReposted ? -1 : 1),
        },
      },
    }));
    try {
      if (wasReposted) {
        await supabase.from('reposts').delete().match({ post_id: parseInt(postId), user_id: currentUserRef.current.id });
      } else {
        await supabase.from('reposts').insert({ post_id: parseInt(postId), user_id: currentUserRef.current.id, note: repostNote });
      }
    } catch { /* rollback */ }
  }, [repostModal, repostNote, postInteractions]);

  const handleFollowToggle = useCallback(async (creatorId: string) => {
    // implementasi sama seperti sebelumnya, update followedUsers locally
    // ...
  }, []);

  // Scroll restoration setelah feed siap
  useEffect(() => {
    if (!isLoading && allPosts.length > 0) {
      restoreScroll();
    }
  }, [isLoading, allPosts, restoreScroll]);

  // Handler untuk virtuoso end reached
  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Render item dengan memoized PostCardMemo
  const renderItem = useCallback(
    (index: number, post: any) => {
      const interactions = postInteractions[post.id] || {
        isLiked: false,
        isReposted: false,
        isSaved: false,
        counts: { likes: 0, comments: 0, reposts: 0, saves: 0 },
      };

      // Inline skeleton loader untuk load more (ditampilkan jika masih fetching & halaman akhir)
      // ...

      return (
        <PostCardMemo
          key={post.id}
          post={post}
          isLiked={interactions.isLiked}
          isReposted={interactions.isReposted}
          isSaved={interactions.isSaved}
          likesCount={interactions.counts.likes}
          commentsCount={interactions.counts.comments}
          repostsCount={interactions.counts.reposts}
          savesCount={interactions.counts.saves}
          // Props lain yang diperlukan
          currentUser={currentUser}
          handleLike={handleLike}
          handleSave={handleSave}
          openRepostModal={setRepostModal}
          handleMediaClick={() => {}} // double tap like
          toggleMute={() => setIsGloballyMuted(!isGloballyMuted)}
          observeVideo={observeVideo}
          observeImage={observeImage}
          // ...
        />
      );
    },
    [postInteractions, currentUser, handleLike, handleSave, observeVideo, observeImage, isGloballyMuted]
  );

  if (isError) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Gagal memuat feed. <button onClick={() => refetch()}>Coba lagi</button>
      </div>
    );
  }

  return (
    <section style={{ width: '100%', maxWidth: '100%', padding: 0, margin: 0 }}>
      {/* ... style tag ... */}
      <RepostModal
        isOpen={!!repostModal}
        postId={repostModal?.postId}
        creatorId={repostModal?.creatorId}
        note={repostNote}
        setNote={setRepostNote}
        onClose={() => setRepostModal(null)}
        onConfirm={handleRepost}
        isUnrepost={repostModal?.isUnrepost}
      />
      <ImagePreview imageUrl={activePreviewImage} onClose={() => setActivePreviewImage(null)} />

      <Virtuoso
        useWindowScroll
        data={allPosts}
        endReached={loadMore}
        overscan={5}
        itemContent={renderItem}
        components={{
          Footer: () =>
            isFetchingNextPage ? (
              <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
                <div className="pure-spinner"></div>
              </div>
            ) : null,
        }}
      />
    </section>
  );
}