'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { sendPushAndAppNotif } from '@/lib/notif';
import PostCard from './PostCard';
import RepostModal from './RepostModal';
import ImagePreview from './ImagePreview';
import './Gallery.css';

// Fungsi helper (tetap di sini)
const getOptimizedImage = (url: string) => { /* sama persis */ };
const formatRelativeTime = (dateString: string) => { /* sama persis */ };

export default function Gallerypost() {
  const { t } = useTranslation();
  const router = useRouter();

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
  const [poppingHeart, setPoppingHeart] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observerTarget = useRef<HTMLDivElement | null>(null);
  const viewObserverRef = useRef<IntersectionObserver | null>(null);
  const viewedPostsRef = useRef<Set<string>>(new Set());
  const viewTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const lastTapRef = useRef<Record<string, number>>({});
  const [currentCategory, setCurrentCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const POSTS_PER_PAGE = 15;
  const [isGloballyMuted, setIsGloballyMuted] = useState(true);
  const isMutedRef = useRef(true);
  const [repostModal, setRepostModal] = useState<{isOpen: boolean, postId: string, creatorId: string} | null>(null);
  const [repostNote, setRepostNote] = useState("");

  // ... semua useEffect, fungsi fetchPosts, handleLike, handleFollowToggle, dll sama persis ...
  // (tidak diubah satu karakter pun, cuma dipindahkan ke sini)

  return (
    <section>
      {/* CSS tetap pakai <style> seperti sebelumnya */}
      <style>{`...`}</style>

      <RepostModal
        isOpen={!!repostModal}
        postId={repostModal?.postId || ''}
        creatorId={repostModal?.creatorId || ''}
        note={repostNote}
        setNote={setRepostNote}
        onClose={() => setRepostModal(null)}
        onConfirm={() => {
          if (repostModal) {
            handleConfirmRepost(repostModal.postId, repostModal.creatorId, false);
          }
        }}
      />

      <ImagePreview imageUrl={activePreviewImage} onClose={() => setActivePreviewImage(null)} />

      <div className="gallery" id="mainGallery">
        {isLoading ? (
          <div className="gallery-skeleton-wrapper">
            <div className="gallery-skeleton-card"><div className="gallery-skeleton-shimmer" /></div>
            <div className="gallery-skeleton-card"><div className="gallery-skeleton-shimmer" /></div>
          </div>
        ) : posts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '50px' }}>{t('no_posts_found')}</p>
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
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
                if (!currentUser) return window.dispatchEvent(new CustomEvent('openLogin'));
                const isReposted = myRepostedPosts.has(id);
                if (isReposted) {
                  handleConfirmRepost(id, cid, true);
                } else {
                  setRepostNote("");
                  setRepostModal({ isOpen: true, postId: id, creatorId: cid });
                }
              }}
              handleMediaClick={handleMediaClick}
              toggleMute={toggleMute}
              openShareOptions={openShareOptions}
              handleFollowToggle={handleFollowToggle}
              setActivePreviewImage={setActivePreviewImage}
              router={router}
              t={t}
            />
          ))
        )}

        {/* elemen observer scroll */}
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
      </div>
    </section>
  );
}
