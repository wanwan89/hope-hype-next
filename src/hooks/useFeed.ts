import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMemo } from 'react';

export interface Post {
  id: string;
  image_url?: string;
  video_url?: string;
  audio_src?: string;
  title?: string;
  artist?: string;
  bio?: string;
  created_at: string;
  creator_id: string;
  category?: string;
  views: number;
  is_private: boolean;
  is_ad: boolean;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
    role?: string;
    is_private?: boolean;
  };
}

export interface FeedCounts {
  likes: number;
  comments: number;
  reposts: number;
  saves: number;
}

// Performa: Diubah ke 10 agar infinite scroll lebih mulus dan mengurangi request berulang
const POSTS_PER_PAGE = 10;

const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const fetchFeed = async ({
  pageParam = 0,
  category = 'all',
  user,
  mutuals,
}: {
  pageParam?: number;
  category: string;
  user: any;
  mutuals: Set<string>;
}) => {
  const from = pageParam * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const isFyp = category === 'fyp';
  const queryCategory = isFyp ? 'all' : category;

  let query = supabase
    .from('posts')
    .select(
      'id, image_url, video_url, audio_src, title, artist, bio, created_at, creator_id, category, views, is_private, is_ad, profiles:creator_id (full_name, username, role, avatar_url, is_private)'
    )
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (queryCategory !== 'all') {
    query = query.ilike('category', `%${queryCategory}%`);
  }

  const { data: rawPosts, error } = await query;
  if (error) throw error;

  // Filter privacy: Publik kecuali di-private (level postingan atau level profil)
  let posts: Post[] = (rawPosts || []).filter((post: any) => {
    const isPrivate = post.is_private || post.profiles?.is_private;
    
    if (!isPrivate) return true;
    if (user && post.creator_id === user.id) return true;
    if (user && mutuals.has(post.creator_id)) return true;
    
    return false;
  });

  if (isFyp) {
    posts = shuffleArray(posts);
  }

  return {
    posts,
    nextPage: rawPosts.length < POSTS_PER_PAGE ? null : pageParam + 1,
  };
};

export function useFeed(
  category: string,
  user: any | null,
  mutuals: Set<string>
) {
  const query = useInfiniteQuery({
    queryKey: ['feed', category, user?.id, mutuals.size],
    queryFn: ({ pageParam }) =>
      fetchFeed({ pageParam: pageParam as number, category, user, mutuals }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 1000 * 60 * 5, 
    gcTime: 1000 * 60 * 10,   
    retry: 2,                 
    refetchOnWindowFocus: false, 
  });

  const allPosts = useMemo(
    () => query.data?.pages.flatMap((page) => page.posts) ?? [],
    [query.data]
  );

  return { ...query, allPosts };
}
