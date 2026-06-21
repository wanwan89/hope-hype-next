import React from 'react';
import PostCard from './PostCard'; // Komponen asli

interface Props {
  post: any; // tipe spesifik disesuaikan
  isLiked: boolean;
  isReposted: boolean;
  isSaved: boolean;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  savesCount: number;
  // props lainnya tetap stabil (fungsi2 callback di-memo oleh parent)
}

const PostCardMemo = React.memo(
  function PostCardMemo(props: Props) {
    return <PostCard {...props} />;
  },
  (prev, next) => {
    // Hanya re‑render jika data relevan berubah
    return (
      prev.post.id === next.post.id &&
      prev.isLiked === next.isLiked &&
      prev.isReposted === next.isReposted &&
      prev.isSaved === next.isSaved &&
      prev.likesCount === next.likesCount &&
      prev.commentsCount === next.commentsCount &&
      prev.repostsCount === next.repostsCount &&
      prev.savesCount === next.savesCount &&
      prev.post === next.post // shallow compare (post jarang berubah)
    );
  }
);

export default PostCardMemo;