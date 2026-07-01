// components/post/PostTanggapanList.tsx
import React from 'react';
import PostCardText from './PostCardText'; // sesuaikan path jika berbeda

type Props = {
  tanggapan: any[];
  currentUser: any;
  counts: Record<string, { likes: number; tanggapan: number; reposts: number; saves: number }>;
  myLikedPosts: Set<string>;
  myRepostedPosts: Set<string>;
  mySavedPosts: Set<string>;
  followedUsers: Set<string>;
  mutualUsers: Set<string>;
  animatingFollows: Set<string>;
  animatingReposts: Set<string>;
  isGloballyMuted: boolean;
  poppingHeart: string | null;
  activePreviewImage: string | null;
  likersMap: Record<string, any[]>;
  repostersMap: Record<string, any[]>;
  handleLike: (postId: string, creatorId: string) => void;
  handleSave: (postId: string) => void;
  openRepostModal: (postId: string, creatorId: string) => void;
  handleMediaClick: (e: React.MouseEvent, postId: string, creatorId: string, imageUrl?: string) => void;
  toggleMute: (e: React.MouseEvent) => void;
  openShareOptions: (post: any, isOwner: boolean) => void;
  handleFollowToggle: (e: any, creatorId: string) => void;
  setActivePreviewImage: (url: string | null) => void;
  router: any;
  t: any;
  parentPostId: string; // UUID post induk
  onTanggapanClick?: (initialText: string, postId: string) => void;
};

export default function PostTanggapanList({
  tanggapan,
  parentPostId,
  ...rest
}: Props) {
  if (!tanggapan || tanggapan.length === 0) return null;

  // LOG 1: Mengecek apakah List menerima data parentPostId yang benar
  console.log(`[PostTanggapanList] Memuat ${tanggapan.length} tanggapan untuk Parent Post:`, parentPostId);

  return (
    <>
      <div
        style={{
          padding: '4px 16px',
          marginLeft: '38px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-muted)',
          marginBottom: '-8px',
        }}
      >
        {tanggapan.length} Tanggapan
      </div>
      
      {tanggapan.map((item) => (
        <div
          key={item.id}
          style={{
            position: 'relative',
            width: '100%',
            marginTop: '-13px',
            padding: '0',
          }}
        >
          <PostCardText
            post={item}
            currentUser={rest.currentUser}
            counts={rest.counts}
            myLikedPosts={rest.myLikedPosts}
            myRepostedPosts={rest.myRepostedPosts}
            mySavedPosts={rest.mySavedPosts}
            followedUsers={rest.followedUsers}
            mutualUsers={rest.mutualUsers}
            animatingFollows={rest.animatingFollows}
            animatingReposts={rest.animatingReposts}
            isGloballyMuted={rest.isGloballyMuted}
            poppingHeart={rest.poppingHeart}
            activePreviewImage={rest.activePreviewImage}
            likersMap={rest.likersMap}
            repostersMap={rest.repostersMap}
            handleLike={rest.handleLike}
            handleSave={rest.handleSave}
            openRepostModal={rest.openRepostModal}
            handleMediaClick={rest.handleMediaClick}
            toggleMute={rest.toggleMute}
            openShareOptions={rest.openShareOptions}
            handleFollowToggle={rest.handleFollowToggle}
            setActivePreviewImage={rest.setActivePreviewImage}
            router={rest.router}
            t={rest.t}
            showTopComment={false}
            tanggapanLabel="Balas"
            tanggapan={[]}
            onTanggapanClick={(initialText: string, postId: string) => {
              // LOG 2: Mengecek apakah tombol balas ditekan
              console.log(`[PostTanggapanList] Tombol 'Balas' ditekan pada ID:`, item.id);
              
              const mention = item.profiles?.username ? `@${item.profiles.username} ` : '';
              
              if (rest.onTanggapanClick) {
                // LOG 3: Memastikan fungsi diteruskan kembali ke PostPage
                console.log(`[PostTanggapanList] Meneruskan tanggapan ke PostPage. Parent: ${parentPostId}, Mention: ${mention}`);
                rest.onTanggapanClick(mention, parentPostId);
              } else {
                // LOG 4: Muncul jika Props dari PostPage gagal diteruskan
                console.warn(`[PostTanggapanList] ERROR: Fungsi onTanggapanClick tidak ditemukan (undefined)`);
              }
            }}
          />
        </div>
      ))}
    </>
  );
}
