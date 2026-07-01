'use client';
import React from 'react';
import PostCardMedia from './PostCardMedia';
import PostCardText from './PostCardText';

type PostCardProps = {
  post: any;
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
  router: ReturnType<typeof import('next/navigation').useRouter>;
  t: any;
  isExpanded?: boolean;
  onToggleExpand?: (postId: string) => void;
  onTanggapanClick?: (postId: string) => void;
  showTopComment?: boolean;
  tanggapanLabel?: string;
};

const PostCard: React.FC<PostCardProps> = (props) => {
  const { post, isExpanded = false, onToggleExpand = () => {} } = props;
  const photoList = post.image_url ? post.image_url.split(',') : [];
  const isVideoPost = !!post.video_url;

  if (photoList.length > 0 || isVideoPost) {
    return <PostCardMedia {...props} isExpanded={isExpanded} onToggleExpand={onToggleExpand} />;
  }
  return <PostCardText {...props} />;
};

export default PostCard;