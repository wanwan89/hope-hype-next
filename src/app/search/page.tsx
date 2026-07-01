'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Lottie from 'lottie-react';
import emptyLottie from '@/assets/lottie/empty.json';
import babyLottie from '@/assets/lottie/baby.json';

// ======================= KOMPONEN HEADER (FIXED) =======================
interface SearchHeaderProps {
  initialQuery: string;
  onSearch: (keyword: string) => void;
}

function SearchHeader({ initialQuery, onSearch }: SearchHeaderProps) {
  const router = useRouter();
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalQuery(initialQuery);
    setShowSuggestions(false);
  }, [initialQuery]);

  useEffect(() => {
    if (localQuery.trim().length > 1 && localQuery !== initialQuery) {
      fetchSuggestions(localQuery);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSearchSuggestions([]);
    }
  }, [localQuery, initialQuery]);

  const fetchSuggestions = async (text: string) => {
    try {
      const { data } = await supabase
        .from('search_history')
        .select('query')
        .ilike('query', `%${text}%`)
        .limit(30);

      if (data) {
        const unique = Array.from(new Set(data.map(item => item.query.toLowerCase())));
        setSearchSuggestions(unique.slice(0, 6));
      }
    } catch (err) {
      console.error('Gagal mengambil saran', err);
    }
  };

  const handleSearchEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && localQuery.trim() !== '') {
      setShowSuggestions(false);
      onSearch(localQuery);
    }
  };

  const executeSuggestion = (keyword: string) => {
    setLocalQuery(keyword);
    setShowSuggestions(false);
    onSearch(keyword);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'var(--bg-main)',
        borderBottom: '1px solid var(--border-card)',
        padding: '12px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          width: '100%',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <span className="material-icons">arrow_back</span>
        </button>

        <div
          ref={wrapperRef}
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          <span
            className="material-icons"
            style={{
              position: 'absolute',
              left: '12px',
              color: isFocused ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '18px',
              zIndex: 2,
              transition: 'color 0.3s ease',
              flexShrink: 0,
            }}
          >
            search
          </span>

          <input
            type="text"
            value={localQuery}
            onChange={e => setLocalQuery(e.target.value)}
            onKeyDown={handleSearchEnter}
            onFocus={() => {
              setIsFocused(true);
              if (localQuery.length > 1) setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            placeholder="Cari kreator, postingan, #hashtag..."
            style={{
              width: '100%',
              flex: 1,
              padding: '10px 15px 10px 38px',
              borderRadius: '24px',
              background: 'var(--bg-input)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-card)',
              boxShadow: isFocused ? '0 0 0 3px var(--primary-soft)' : 'none',
              transition: 'box-shadow 0.3s ease',
              fontSize: '14px',
              outline: 'none',
              position: 'relative',
              zIndex: 1,
              minWidth: '200px',
            }}
          />

          {showSuggestions && searchSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                left: 0,
                right: 0,
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-card)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {searchSuggestions.map((sugg, idx) => (
                <div
                  key={idx}
                  onMouseDown={() => executeSuggestion(sugg)}
                  style={{
                    padding: '12px 16px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    borderBottom:
                      idx === searchSuggestions.length - 1
                        ? 'none'
                        : '1px solid var(--border-card)',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                    search
                  </span>
                  <span>
                    {sugg
                      .split(new RegExp(`(${localQuery})`, 'gi'))
                      .map((part, i) =>
                        part.toLowerCase() === localQuery.toLowerCase() ? (
                          <strong key={i} style={{ color: 'var(--primary)' }}>
                            {part}
                          </strong>
                        ) : (
                          <span key={i} style={{ color: 'var(--text-muted)' }}>
                            {part}
                          </span>
                        )
                      )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================= SPINNER =======================
const SmallSpinner = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px 0',
      width: '100%',
    }}
  >
    <div
      style={{
        width: 25,
        height: 25,
        border: '3px solid var(--bg-secondary)',
        borderTopColor: 'var(--primary-bg)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  </div>
);

const FullSpinner = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      width: '100%',
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        border: '3px solid var(--bg-secondary)',
        borderTopColor: 'var(--primary-bg)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  </div>
);

// ======================= MAIN CONTENT =======================
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [recommendedPosts, setRecommendedPosts] = useState<any[]>([]);
  const [categoryRecommendations, setCategoryRecommendations] = useState<any[]>([]);
  const [trendingKeywords, setTrendingKeywords] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showSupportPopup, setShowSupportPopup] = useState(false);

  const sensitiveKeywords = [
    'bunuh diri', 'membunuh', 'trauma', 'depresi', 'mati',
    'akhiri hidup', 'kesepian', 'putus asa', 'menyakiti diri', 'suicide'
  ];

  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        const { data: follows } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', session.user.id);
        if (follows) setFollowedUsers(new Set(follows.map(f => f.following_id)));
      }
    };
    initUser();

    const savedHistory = localStorage.getItem('hype_recent_searches');
    if (savedHistory) setRecentSearches(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    if (query) {
      fetchSearchResults().finally(() => setIsLoading(false));
    } else {
      fetchInitialDiscoverData().finally(() => setIsLoading(false));
    }
  }, [query]);

  const fetchInitialDiscoverData = async () => {
    try {
      const { data: trendData } = await supabase
        .from('search_history')
        .select('query')
        .order('created_at', { ascending: false })
        .limit(200);
      const counts: Record<string, number> = {};
      if (trendData) {
        trendData.forEach(item => {
          counts[item.query] = (counts[item.query] || 0) + 1;
        });
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0])
          .slice(0, 8);
        setTrendingKeywords(sorted.length > 0 ? sorted : ['hope hype', 'musik viral', 'tutorial ui']);
      }

      const { data: recPosts } = await supabase
        .from('posts')
        .select(`id, image_url, video_url, bio, profiles:creator_id(username), categories(name)`)
        .eq('status', 'approved')
        .limit(20);
      if (recPosts) {
        const shuffled = recPosts.sort(() => Math.random() - 0.5).slice(0, 5);
        setCategoryRecommendations(
          shuffled.map((post: any) => ({
            ...post,
            categoryName: post.categories?.name || 'Eksplorasi',
          }))
        );
      }
    } catch (error) {
      console.error('Gagal memuat discover data', error);
    }
  };

  const fetchSearchResults = async () => {
    try {
      const isHashtag = query.startsWith('#');
      if (!isHashtag) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, is_private')
          .ilike('username', `%${query}%`)
          .limit(5);
        if (userData) {
          const userIds = userData.map(u => u.id);
          const { data: userPosts } = await supabase
            .from('posts')
            .select('id, creator_id, image_url, video_url')
            .eq('status', 'approved')
            .in('creator_id', userIds)
            .order('created_at', { ascending: false });
          setUsers(
            userData.map(u => ({
              ...u,
              recentPosts: userPosts
                ? userPosts.filter(p => p.creator_id === u.id).slice(0, 3)
                : [],
            }))
          );
        }
      } else {
        setUsers([]);
      }

      const { data: postData } = await supabase
        .from('posts')
        .select('id, image_url, video_url, bio, profiles:creator_id(username, is_private)')
        .eq('status', 'approved')
        .ilike('bio', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(21);
      setPosts(postData || []);

      if (!postData || postData.length === 0) {
        const { data: recData } = await supabase
          .from('posts')
          .select('id, image_url, video_url, bio, profiles:creator_id(username)')
          .eq('status', 'approved')
          .limit(20);
        if (recData)
          setRecommendedPosts(recData.sort(() => Math.random() - 0.5).slice(0, 9));
      } else {
        setRecommendedPosts([]);
      }
    } catch (error) {
      console.error('Search Error:', error);
    }
  };

  const handleExecuteSearch = async (keyword: string) => {
    const lowerText = keyword.toLowerCase();
    if (sensitiveKeywords.some(kw => lowerText.includes(kw))) {
      setShowSupportPopup(true);
      return;
    }

    if (keyword.trim()) {
      const newRecent = [lowerText, ...recentSearches.filter(item => item !== lowerText)].slice(0, 15);
      setRecentSearches(newRecent);
      localStorage.setItem('hype_recent_searches', JSON.stringify(newRecent));
      try {
        await supabase.from('search_history').insert([{ query: lowerText }]);
      } catch (err) {
        console.error('Gagal menyimpan histori pencarian', err);
      }
    }
    router.push(`/search?q=${encodeURIComponent(keyword.trim())}`);
  };

  const deleteHistoryItem = (e: React.MouseEvent, textToRemove: string) => {
    e.stopPropagation();
    const newRecent = recentSearches.filter(item => item !== textToRemove);
    setRecentSearches(newRecent);
    localStorage.setItem('hype_recent_searches', JSON.stringify(newRecent));
  };

  const handleFollowToggle = async (e: any, targetUserId: string) => {
    e.stopPropagation();
    if (!currentUser) return alert('Silakan login untuk mengikuti user.');
    if (currentUser.id === targetUserId) return;

    const isFollowing = followedUsers.has(targetUserId);
    setFollowedUsers(prev => {
      const next = new Set(prev);
      isFollowing ? next.delete(targetUserId) : next.add(targetUserId);
      return next;
    });

    if (isFollowing) {
      await supabase
        .from('followers')
        .delete()
        .match({ follower_id: currentUser.id, following_id: targetUserId });
    } else {
      await supabase
        .from('followers')
        .insert({ follower_id: currentUser.id, following_id: targetUserId });
    }
  };

  const getThumbnail = (post: any) =>
    post.video_url
      ? post.video_url.replace('.mp4', '.jpg')
      : post.image_url
      ? post.image_url.split(',')[0]
      : 'https://placehold.co/300x400/1a1a1a/ffffff.png?text=No+Media';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        paddingTop: '72px',
        paddingBottom: '80px',
        maxWidth: '600px',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      <SearchHeader initialQuery={query} onSearch={handleExecuteSearch} />

      <div style={{ padding: '20px' }}>
        {isLoading ? (
          <FullSpinner />
        ) : (
          <>
            {query && (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Hasil pencarian untuk <strong style={{ color: 'var(--text-main)' }}>"{query}"</strong>
              </div>
            )}

            {/* ===== DISCOVER MODE ===== */}
            {!query && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Riwayat Pencarian */}
                {recentSearches.length > 0 && (
                  <div>
                    <h3
                      style={{
                        fontSize: '14px',
                        color: 'var(--text-main)',
                        marginBottom: '12px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: '18px' }}>
                        history
                      </span>{' '}
                      RIWAYAT PENCARIAN
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {recentSearches
                        .slice(0, showAllHistory ? recentSearches.length : 3)
                        .map((historyItem, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleExecuteSearch(historyItem)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 15px',
                              background: 'var(--bg-secondary)',
                              borderRadius: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: 'var(--text-main)',
                                fontSize: '14px',
                              }}
                            >
                              <span
                                className="material-icons"
                                style={{ fontSize: '16px', color: 'var(--text-muted)' }}
                              >
                                schedule
                              </span>
                              {historyItem}
                            </div>
                            <button
                              onClick={e => deleteHistoryItem(e, historyItem)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              <span className="material-icons" style={{ fontSize: '18px' }}>
                                close
                              </span>
                            </button>
                          </div>
                        ))}
                    </div>
                    {recentSearches.length > 3 && (
                      <button
                        onClick={() => setShowAllHistory(!showAllHistory)}
                        style={{
                          marginTop: '10px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {showAllHistory ? 'Sembunyikan' : 'Lihat Semua Riwayat'}
                      </button>
                    )}
                  </div>
                )}

                {/* Rekomendasi Kategori */}
                {categoryRecommendations.length > 0 && (
                  <div>
                    <h3
                      style={{
                        fontSize: '14px',
                        color: 'var(--text-main)',
                        marginBottom: '15px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span className="material-icons" style={{ color: '#00d2ff', fontSize: '18px' }}>
                        explore
                      </span>{' '}
                      REKOMENDASI PENCARIAN
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {categoryRecommendations.map(post => (
                        <div
                          key={post.id}
                          onClick={() => router.push(`/post?id=${post.id}`)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-card)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ flex: 1, paddingRight: '15px' }}>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: 'var(--text-main)',
                                marginBottom: '4px',
                              }}
                            >
                              {post.categoryName}
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              Pencarian terkait dengan @{post.profiles?.username}
                            </div>
                          </div>
                          <div
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              position: 'relative',
                              background: 'var(--bg-secondary)',
                            }}
                          >
                            <img
                              src={getThumbnail(post)}
                              alt="Kategori"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {post.video_url && (
                              <span
                                className="material-icons"
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  color: '#fff',
                                  fontSize: '20px',
                                  background: 'rgba(0,0,0,0.4)',
                                  borderRadius: '50%',
                                }}
                              >
                                play_arrow
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending */}
                <div>
                  <h3
                    style={{
                      fontSize: '14px',
                      color: 'var(--text-main)',
                      marginBottom: '15px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span className="material-icons" style={{ color: '#ff2e63', fontSize: '18px' }}>
                      trending_up
                    </span>{' '}
                    SEDANG TREN
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {trendingKeywords.length === 0 ? (
                      <SmallSpinner />
                    ) : (
                      trendingKeywords.map((kw, i) => (
                        <div
                          key={i}
                          onClick={() => handleExecuteSearch(kw)}
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-card)',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span
                            className="material-icons"
                            style={{ fontSize: '14px', color: 'var(--primary)' }}
                          >
                            trending_up
                          </span>{' '}
                          {kw}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===== HASIL PENCARIAN ===== */}
            {query && (
              <>
                {users.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3
                      style={{
                        fontSize: '14px',
                        color: 'var(--text-muted)',
                        marginBottom: '10px',
                        fontWeight: 700,
                      }}
                    >
                      KREATOR DITEMUKAN
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {users.map(user => {
                        const isFollowing = followedUsers.has(user.id);
                        const isMe = currentUser?.id === user.id;
                        return (
                          <div
                            key={user.id}
                            style={{
                              background: 'var(--bg-card)',
                              padding: '15px',
                              borderRadius: '16px',
                              border: '1px solid var(--border-card)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                cursor: 'pointer',
                              }}
                              onClick={() => router.push(`/data?id=${user.id}`)}
                            >
                              <img
                                src={
                                  user.avatar_url ||
                                  `https://ui-avatars.com/api/?name=${user.username}`
                                }
                                alt="avatar"
                                style={{
                                  width: '50px',
                                  height: '50px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    color: 'var(--text-main)',
                                    fontSize: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  {user.username}{' '}
                                  {user.is_private && (
                                    <span
                                      className="material-icons"
                                      style={{ fontSize: '14px', color: 'var(--text-muted)' }}
                                    >
                                      lock
                                    </span>
                                  )}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                  {user.bio || 'Kreator HypeTalk'}
                                </div>
                              </div>
                              {!isMe && (
                                <button
                                  onClick={e => handleFollowToggle(e, user.id)}
                                  style={{
                                    background: isFollowing
                                      ? 'var(--bg-secondary)'
                                      : 'var(--primary-bg)',
                                    color: isFollowing ? 'var(--text-main)' : '#fff',
                                    padding: '6px 16px',
                                    borderRadius: '20px',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isFollowing ? 'Mengikuti' : 'Ikuti'}
                                </button>
                              )}
                            </div>
                            {!user.is_private && user.recentPosts?.length > 0 && (
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(3, 1fr)',
                                  gap: '8px',
                                  marginTop: '15px',
                                }}
                              >
                                {user.recentPosts.map((rp: any) => (
                                  <div
                                    key={rp.id}
                                    onClick={e => {
                                      e.stopPropagation();
                                      router.push(`/post?id=${rp.id}`);
                                    }}
                                    style={{
                                      position: 'relative',
                                      aspectRatio: '1/1',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <img
                                      src={getThumbnail(rp)}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                      }}
                                      alt="post"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {posts.length > 0 && (
                  <div>
                    <h3
                      style={{
                        fontSize: '14px',
                        color: 'var(--text-muted)',
                        marginBottom: '10px',
                        fontWeight: 700,
                      }}
                    >
                      POSTINGAN TERKAIT
                    </h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                      }}
                    >
                      {posts.map(post => (
                        <div
                          key={post.id}
                          onClick={() => router.push(`/post?id=${post.id}`)}
                          style={{
                            position: 'relative',
                            aspectRatio: '3/4',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                          }}
                        >
                          <img
                            src={getThumbnail(post)}
                            alt="post"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {posts.length === 0 && recommendedPosts.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '20px 0 40px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ width: '180px', height: '180px' }}>
                        <Lottie animationData={emptyLottie} loop={true} />
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: '10px' }}>
                        Tidak ada hasil yang cocok.
                      </p>
                    </div>
                    <h3
                      style={{
                        fontSize: '14px',
                        color: 'var(--text-main)',
                        marginBottom: '15px',
                        fontWeight: 800,
                        textAlign: 'center',
                      }}
                    >
                      🔥 MUNGKIN ANDA SUKA
                    </h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                      }}
                    >
                      {recommendedPosts.map(post => (
                        <div
                          key={post.id}
                          onClick={() => router.push(`/post?id=${post.id}`)}
                          style={{
                            position: 'relative',
                            aspectRatio: '3/4',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                          }}
                        >
                          <img
                            src={getThumbnail(post)}
                            alt="post"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Popup Support */}
      {showSupportPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              padding: '30px 20px',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '400px',
              textAlign: 'center',
            }}
          >
            <div style={{ width: '150px', height: '150px', margin: '0 auto' }}>
              <Lottie animationData={babyLottie} loop={true} />
            </div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--text-main)',
                marginBottom: '12px',
              }}
            >
              Kamu Tidak Sendirian
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Apapun yang sedang kamu hadapi saat ini, ada orang yang peduli dan siap mendengarkan.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowSupportPopup(false);
                  router.push('/hypetalk/room?from=b648ab89-32b7-494a-b858-ee186f918f90');
                }}
                style={{
                  background: 'var(--primary-bg)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cerita dengan kami
              </button>
              <button
                onClick={() => setShowSupportPopup(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ======================= EXPORT HALAMAN =======================
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingTop: '72px' }}>
          <FullSpinner />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}