'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Lottie from 'lottie-react';

// Pastikan file lottie ini ada di folder yang sesuai
import emptyLottie from '@/assets/lottie/empty.json'; 
import babyLottie from '@/assets/lottie/baby.json';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  
  const [localQuery, setLocalQuery] = useState(query);
  const [isFocused, setIsFocused] = useState(false); 

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  
  // STATE TAMPILAN AWAL
  const [recommendedPosts, setRecommendedPosts] = useState<any[]>([]); 
  const [categoryRecommendations, setCategoryRecommendations] = useState<any[]>([]); 
  const [trendingKeywords, setTrendingKeywords] = useState<string[]>([]);
  
  // STATE AUTOCOMPLETE & HISTORY
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  // STATE POP-UP SUPPORT
  const [showSupportPopup, setShowSupportPopup] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // KATA KUNCI SENSITIF
  const sensitiveKeywords = [
    'bunuh diri', 'membunuh', 'trauma', 'depresi', 'mati', 
    'akhiri hidup', 'kesepian', 'putus asa', 'menyakiti diri', 'suicide'
  ];

  useEffect(() => {
    setLocalQuery(query);
    setShowSuggestions(false);
  }, [query]);

  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        const { data: follows } = await supabase.from('followers').select('following_id').eq('follower_id', session.user.id);
        if (follows) setFollowedUsers(new Set(follows.map(f => f.following_id)));
      }
    };
    initUser();

    // Load Local History
    const savedHistory = localStorage.getItem('hype_recent_searches');
    if (savedHistory) {
      setRecentSearches(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    if (localQuery.trim().length > 1 && localQuery !== query) {
      fetchSuggestions(localQuery);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSearchSuggestions([]);
    }
  }, [localQuery, query]);

  const fetchSuggestions = async (text: string) => {
    try {
      const { data } = await supabase.from('search_history').select('query').ilike('query', `%${text}%`).limit(30);
      if (data) {
        const uniqueSuggestions = Array.from(new Set(data.map(item => item.query.toLowerCase())));
        setSearchSuggestions(uniqueSuggestions.slice(0, 6));
      }
    } catch (err) {
      console.error("Gagal mengambil saran", err);
    }
  };

  const saveSearchToHistory = async (text: string) => {
    if (!text.trim()) return;
    const cleanText = text.trim().toLowerCase();
    
    const newRecent = [cleanText, ...recentSearches.filter(item => item !== cleanText)].slice(0, 15);
    setRecentSearches(newRecent);
    localStorage.setItem('hype_recent_searches', JSON.stringify(newRecent));

    try {
      await supabase.from('search_history').insert([{ query: cleanText }]);
    } catch (err) {
      console.error("Gagal menyimpan histori pencarian", err);
    }
  };

  const deleteHistoryItem = (e: React.MouseEvent, textToRemove: string) => {
    e.stopPropagation(); 
    const newRecent = recentSearches.filter(item => item !== textToRemove);
    setRecentSearches(newRecent);
    localStorage.setItem('hype_recent_searches', JSON.stringify(newRecent));
  };

  useEffect(() => {
    if (query) {
      fetchSearchResults();
    } else {
      fetchInitialDiscoverData();
    }
  }, [query]);

  // FUNGSI DETEKSI KATA SENSITIF
  const checkSensitiveContent = (text: string) => {
    const lowerText = text.toLowerCase();
    return sensitiveKeywords.some(keyword => lowerText.includes(keyword));
  };

  const fetchInitialDiscoverData = async () => {
    setIsLoading(true);
    try {
      const { data: trendData } = await supabase.from('search_history').select('query').order('created_at', { ascending: false }).limit(200);
      const counts: Record<string, number> = {};
      if (trendData && trendData.length > 0) {
        trendData.forEach(item => { counts[item.query] = (counts[item.query] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(entry => entry[0]).slice(0, 8);
        setTrendingKeywords(sorted);
      } else {
        setTrendingKeywords(['hope hype', 'musik viral', 'tutorial ui']);
      }

      const { data: recPosts } = await supabase.from('posts')
        .select(`
          id, image_url, video_url, bio, 
          profiles:creator_id(username),
          categories(name)
        `)
        .eq('status', 'approved')
        .limit(20); 
      
      if (recPosts && recPosts.length > 0) {
        const shuffled = recPosts.sort(() => Math.random() - 0.5).slice(0, 5);
        const categorized = shuffled.map((post: any) => ({
          ...post,
          categoryName: post.categories?.name || "Eksplorasi"
        }));
        setCategoryRecommendations(categorized);
      }
    } catch (error) {
      console.error("Gagal memuat discover data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSearchResults = async () => {
    setIsLoading(true);
    try {
      const isHashtag = query.startsWith('#');

      if (!isHashtag) {
        const { data: userData } = await supabase.from('profiles').select('id, username, avatar_url, bio, is_private').ilike('username', `%${query}%`).limit(5);
        let usersWithPosts = [];
        if (userData && userData.length > 0) {
          const userIds = userData.map(u => u.id);
          const { data: userPosts } = await supabase.from('posts').select('id, creator_id, image_url, video_url').eq('status', 'approved').in('creator_id', userIds).order('created_at', { ascending: false });
          usersWithPosts = userData.map(u => ({
            ...u, recentPosts: userPosts ? userPosts.filter(p => p.creator_id === u.id).slice(0, 3) : []
          }));
        }
        setUsers(usersWithPosts);
      } else {
        setUsers([]);
      }

      const { data: postData } = await supabase.from('posts').select('id, image_url, video_url, bio, profiles:creator_id(username, is_private)').eq('status', 'approved').ilike('bio', `%${query}%`).order('created_at', { ascending: false }).limit(21);
      setPosts(postData || []);

      if (!postData || postData.length === 0) {
        const { data: recData } = await supabase.from('posts').select('id, image_url, video_url, bio, profiles:creator_id(username)').eq('status', 'approved').limit(20);
        if (recData) setRecommendedPosts(recData.sort(() => Math.random() - 0.5).slice(0, 9)); 
      } else {
        setRecommendedPosts([]); 
      }
    } catch (error) {
      console.error("Search Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && localQuery.trim() !== '') {
      setShowSuggestions(false);
      
      // CEK INTERCEPT POPUP SUPPORT
      if (checkSensitiveContent(localQuery)) {
        setShowSupportPopup(true);
        return; 
      }

      await saveSearchToHistory(localQuery);
      router.push(`/search?q=${encodeURIComponent(localQuery.trim())}`);
    }
  };

  const executeSearch = async (keyword: string) => {
    setLocalQuery(keyword);
    setShowSuggestions(false);

    // CEK INTERCEPT POPUP SUPPORT
    if (checkSensitiveContent(keyword)) {
      setShowSupportPopup(true);
      return; 
    }

    await saveSearchToHistory(keyword);
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  const handleFollowToggle = async (e: any, targetUserId: string) => {
    e.stopPropagation();
    if (!currentUser) return alert("Silakan login untuk mengikuti user.");
    if (currentUser.id === targetUserId) return; 

    const isFollowing = followedUsers.has(targetUserId);
    setFollowedUsers(prev => {
      const next = new Set(prev);
      isFollowing ? next.delete(targetUserId) : next.add(targetUserId);
      return next;
    });

    if (isFollowing) {
      await supabase.from('followers').delete().match({ follower_id: currentUser.id, following_id: targetUserId });
    } else {
      await supabase.from('followers').insert({ follower_id: currentUser.id, following_id: targetUserId });
    }
  };

  const getThumbnail = (post: any) => {
    if (post.video_url) return post.video_url.replace('.mp4', '.jpg');
    if (post.image_url) return post.image_url.split(',')[0];
    return 'https://placehold.co/300x400/1a1a1a/ffffff.png?text=No+Media';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
      
      {/* HEADER SEARCH BAR */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', padding: '12px 20px', borderBottom: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        
        <div ref={wrapperRef} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span className="material-icons" style={{ position: 'absolute', left: '12px', color: isFocused ? 'var(--primary)' : 'var(--text-muted)', fontSize: '18px', zIndex: 2, transition: 'color 0.3s ease' }}>search</span>
          <input 
            type="text" 
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleSearchEnter}
            onFocus={() => { 
              setIsFocused(true);
              if (localQuery.length > 1) setShowSuggestions(true); 
            }}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 150); 
            }}
            placeholder="Cari kreator, postingan, #hashtag..."
            style={{ 
              width: '100%', padding: '10px 15px 10px 38px', borderRadius: '24px', 
              background: 'var(--bg-input)', color: 'var(--text-main)', 
              border: '1px solid var(--border-card)',
              boxShadow: isFocused ? '0 0 0 3px var(--primary-soft)' : 'none',
              transition: 'box-shadow 0.3s ease',
              fontSize: '14px', outline: 'none', position: 'relative', zIndex: 1
            }}
          />

          {/* DROPDOWN AUTOCOMPLETE */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '48px', left: 0, right: 0,
              background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
              borderRadius: '16px', border: '1px solid var(--border-card)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 100, display: 'flex', flexDirection: 'column'
            }}>
              {searchSuggestions.map((sugg, idx) => (
                <div 
                  key={idx}
                  onMouseDown={() => executeSearch(sugg)} 
                  style={{
                    padding: '12px 16px', color: 'var(--text-main)', fontSize: '14px',
                    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                    borderBottom: idx === searchSuggestions.length - 1 ? 'none' : '1px solid var(--border-card)'
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>search</span>
                  <span>
                    {sugg.split(new RegExp(`(${localQuery})`, 'gi')).map((part, i) => 
                      part.toLowerCase() === localQuery.toLowerCase() ? <strong key={i} style={{ color: 'var(--primary)' }}>{part}</strong> : <span key={i} style={{ color: 'var(--text-muted)' }}>{part}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        
        {query && !isLoading && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Hasil pencarian untuk <strong style={{ color: 'var(--text-main)' }}>"{query}"</strong>
          </div>
        )}

        {/* TAMPILAN AWAL (SAAT BELUM ADA PENCARIAN) */}
        {!query && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {recentSearches.length > 0 && (
              <div>
                <h3 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-icons" style={{ fontSize: '18px' }}>history</span>
                  RIWAYAT PENCARIAN
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentSearches.slice(0, showAllHistory ? recentSearches.length : 3).map((historyItem, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', background: 'var(--bg-secondary)', borderRadius: '12px', cursor: 'pointer' }} onClick={() => executeSearch(historyItem)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', fontSize: '14px' }}>
                        <span className="material-icons" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>schedule</span>
                        {historyItem}
                      </div>
                      <button onClick={(e) => deleteHistoryItem(e, historyItem)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px' }}>
                        <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
                      </button>
                    </div>
                  ))}
                </div>
                {recentSearches.length > 3 && (
                  <button onClick={() => setShowAllHistory(!showAllHistory)} style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '0' }}>
                    {showAllHistory ? 'Sembunyikan' : 'Lihat Semua Riwayat'}
                  </button>
                )}
              </div>
            )}

            {categoryRecommendations.length > 0 && (
              <div>
                <h3 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-icons" style={{ color: '#00d2ff', fontSize: '18px' }}>explore</span>
                  REKOMENDASI PENCARIAN
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {categoryRecommendations.map((post) => (
                    <div key={post.id} onClick={() => router.push(`/post?id=${post.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', cursor: 'pointer' }}>
                      <div style={{ flex: 1, paddingRight: '15px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>{post.categoryName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          Pencarian terkait dengan @{post.profiles?.username} - {post.bio || 'Jelajahi lebih lanjut.'}
                        </div>
                      </div>
                      <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', position: 'relative', flexShrink: 0, background: 'var(--bg-secondary)' }}>
                        <img src={getThumbnail(post)} alt="Kategori" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {post.video_url && <span className="material-icons" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff', fontSize: '20px', background: 'rgba(0,0,0,0.4)', borderRadius: '50%' }}>play_arrow</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons" style={{ color: '#ff2e63', fontSize: '18px' }}>trending_up</span>
                SEDANG TREN
              </h3>
              
              {isLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Memuat tren...</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {trendingKeywords.map((kw, i) => (
                    <div 
                      key={i}
                      onClick={() => executeSearch(kw)}
                      style={{
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-card)',
                        padding: '8px 16px', borderRadius: '20px',
                        fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {kw}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HASIL PENCARIAN */}
        {query && (
          isLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>Mencari...</div>
          ) : (
            <>
              {users.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 700 }}>KREATOR DITEMUKAN</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {users.map(user => {
                      const isFollowing = followedUsers.has(user.id);
                      const isMe = currentUser?.id === user.id;
                      return (
                        <div key={user.id} style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '16px', border: '1px solid var(--border-card)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => router.push(`/data?id=${user.id}`)}>
                            <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`} alt="avatar" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {user.username}
                                {user.is_private && <span className="material-icons" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>lock</span>}
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {user.bio || 'Kreator HypeTalk'}
                              </div>
                            </div>
                            
                            {!isMe && (
                              <button 
                                onClick={(e) => handleFollowToggle(e, user.id)}
                                style={{ background: isFollowing ? 'var(--bg-secondary)' : 'var(--primary)', color: isFollowing ? 'var(--text-main)' : '#fff', border: isFollowing ? '1px solid var(--border-card)' : 'none', padding: '6px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                              >
                                {isFollowing ? 'Mengikuti' : 'Ikuti'}
                              </button>
                            )}
                          </div>

                          {user.is_private && !isMe ? (
                            <div style={{ marginTop: '15px', padding: '15px', background: 'var(--bg-main)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-card)' }}>
                              <span className="material-icons" style={{ fontSize: '24px', marginBottom: '4px' }}>lock</span>
                              <div style={{ fontSize: '12px', fontWeight: 600 }}>Akun ini privat</div>
                            </div>
                          ) : (
                            user.recentPosts?.length > 0 && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '15px' }}>
                                {user.recentPosts.map((rp: any) => (
                                  <div key={rp.id} onClick={(e) => { e.stopPropagation(); router.push(`/post?id=${rp.id}`); }} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-secondary)' }}>
                                    <img src={getThumbnail(rp)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="post" />
                                    {rp.video_url && <span className="material-icons" style={{ position: 'absolute', top: '4px', right: '4px', color: '#fff', fontSize: '16px', background: 'rgba(0,0,0,0.4)', borderRadius: '50%', padding: '2px' }}>play_arrow</span>}
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {posts.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 700 }}>POSTINGAN TERKAIT</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {posts.map(post => (
                      <div key={post.id} onClick={() => router.push(`/post?id=${post.id}`)} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-secondary)', cursor: 'pointer' }}>
                        <img src={getThumbnail(post)} alt="post" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {post.video_url && <div style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '4px', display: 'flex' }}><span className="material-icons" style={{ color: '#fff', fontSize: '14px' }}>play_arrow</span></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {posts.length === 0 && recommendedPosts.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ textAlign: 'center', padding: '20px 0 40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '180px', height: '180px' }}>
                      <Lottie animationData={emptyLottie} loop={true} />
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: '10px' }}>Tidak ada hasil yang cocok.</p>
                  </div>

                  <h3 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '15px', fontWeight: 800, textAlign: 'center' }}>🔥 MUNGKIN ANDA SUKA</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {recommendedPosts.map(post => (
                      <div key={post.id} onClick={() => router.push(`/post?id=${post.id}`)} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-secondary)', cursor: 'pointer' }}>
                        <img src={getThumbnail(post)} alt="post" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {post.video_url && <div style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '4px', display: 'flex' }}><span className="material-icons" style={{ color: '#fff', fontSize: '14px' }}>play_arrow</span></div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>

      {/* OVERLAY POP-UP SUPPORT SYSTEM */}
      {showSupportPopup && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            padding: '30px 20px',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid var(--border-card)',
            animation: 'fadeInUp 0.3s ease-out'
          }}>
            <div style={{ width: '150px', height: '150px', margin: '0 auto' }}>
              <Lottie animationData={babyLottie} loop={true} />
            </div>
            
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px' }}>
              Kamu Tidak Sendirian
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.6' }}>
              Apapun yang sedang kamu hadapi saat ini, ada orang yang peduli dan siap mendengarkan. Jangan ragu untuk berbagi bebanmu.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => {
                  setShowSupportPopup(false);
                  
                  // 🔥 GANTI "ID_AKUN_SUPPORT_KAMU" DENGAN UUID AKUN ADMIN KAMU DI SUPABASE 🔥
                  router.push('/hypetalk/room?id=b648ab89-32b7-494a-b858-ee186f918f90');
                }}
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '16px',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span className="material-icons">chat</span>
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
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Memuat halaman pencarian...</div>}>
      <SearchContent />
    </Suspense>
  );
}
