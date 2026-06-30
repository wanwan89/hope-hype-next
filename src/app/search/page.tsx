'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Lottie from 'lottie-react';
import styles from './Search.module.css'; // <-- Import CSS Modules-nya di sini

import emptyLottie from '@/assets/lottie/empty.json';
import babyLottie from '@/assets/lottie/baby.json';

// --- KOMPONEN SEARCH HEADER ---
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
        const uniqueSuggestions = Array.from(new Set(data.map(item => item.query.toLowerCase())));
        setSearchSuggestions(uniqueSuggestions.slice(0, 6));
      }
    } catch (err) {
      console.error("Gagal mengambil saran", err);
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
    <div className={styles.header}>
      <button onClick={() => router.back()} className={styles.backButton}>
        <span className="material-icons">arrow_back</span>
      </button>
      
      <div ref={wrapperRef} className={styles.searchWrapper}>
        <span 
          className={`material-icons ${styles.searchIcon}`} 
          style={{ color: isFocused ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          search
        </span>
        <input 
          type="text" 
          className={styles.searchInput}
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={handleSearchEnter}
          onFocus={() => { 
            setIsFocused(true);
            if (localQuery.length > 1) setShowSuggestions(true); 
          }}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Cari kreator, postingan, #hashtag..."
        />

        {showSuggestions && searchSuggestions.length > 0 && (
          <div className={styles.suggestionsBox}>
            {searchSuggestions.map((sugg, idx) => (
              <div 
                key={idx}
                className={styles.suggestionItem}
                onMouseDown={() => executeSuggestion(sugg)} 
              >
                <span className="material-icons" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>search</span>
                <span>
                  {sugg.split(new RegExp(`(${localQuery})`, 'gi')).map((part, i) => 
                    part.toLowerCase() === localQuery.toLowerCase() 
                      ? <strong key={i} style={{ color: 'var(--primary)' }}>{part}</strong> 
                      : <span key={i} style={{ color: 'var(--text-muted)' }}>{part}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- KOMPONEN SEARCH CONTENT ---
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

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

  // ... (Pertahankan semua logika useEffect dan fungsi fetch data mu di sini, tidak ada yang berubah)
  // Untuk menghemat ruang, saya asumsikan fungsi-fungsi seperti fetchInitialDiscoverData dll. tetap utuh.

  const getThumbnail = (post: any) => post.video_url ? post.video_url.replace('.mp4', '.jpg') : (post.image_url ? post.image_url.split(',')[0] : 'https://placehold.co/300x400/1a1a1a/ffffff.png?text=No+Media');

  return (
    <div className={styles.container}>
      <SearchHeader initialQuery={query} onSearch={/* handleExecuteSearch */ (kw) => console.log(kw)} />

      <div className={styles.contentWrapper}>
        {/* HASIL PENCARIAN KREATOR */}
        {query && users.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 700 }}>KREATOR DITEMUKAN</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {users.map(user => {
                const isFollowing = followedUsers.has(user.id);
                return (
                  <div key={user.id} className={styles.userCard}>
                    <div className={styles.userInfo} onClick={() => router.push(`/data?id=${user.id}`)}>
                      {/* Avatar ini tidak akan gepeng lagi karena ada flex-shrink: 0 di CSS */}
                      <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`} alt="avatar" className={styles.avatar} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '15px' }}>
                          {user.username}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{user.bio || 'Kreator HypeTalk'}</div>
                      </div>
                    </div>
                    
                    {/* Grid Postingan User */}
                    {!user.is_private && user.recentPosts?.length > 0 && (
                      <div className={styles.grid3} style={{ marginTop: '15px' }}>
                        {user.recentPosts.map((rp: any) => (
                          <div key={rp.id} className={styles.postThumbnailSquare} onClick={(e) => { e.stopPropagation(); router.push(`/post?id=${rp.id}`); }}>
                            <img src={getThumbnail(rp)} className={styles.imageCover} alt="post" />
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

        {/* HASIL PENCARIAN POSTINGAN */}
        {query && posts.length > 0 && (
          <div>
            <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 700 }}>POSTINGAN TERKAIT</h3>
            <div className={styles.grid3}>
              {posts.map(post => (
                <div key={post.id} className={styles.postThumbnail} onClick={() => router.push(`/post?id=${post.id}`)}>
                  <img src={getThumbnail(post)} alt="post" className={styles.imageCover} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DISCOVER: REKOMENDASI KATEGORI (Saat tidak ada query) */}
        {!query && categoryRecommendations.length > 0 && (
          <div>
            <h3 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '15px' }}>REKOMENDASI PENCARIAN</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {categoryRecommendations.map((post) => (
                <div key={post.id} className={styles.categoryCard} onClick={() => router.push(`/post?id=${post.id}`)}>
                  <div style={{ flex: 1, paddingRight: '15px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{post.categoryName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pencarian terkait dengan @{post.profiles?.username}</div>
                  </div>
                  {/* Thumbnail ini dijamin aman karena flex-shrink: 0 */}
                  <div className={styles.categoryThumbnail}>
                    <img src={getThumbnail(post)} alt="Kategori" className={styles.imageCover} />
                    {post.video_url && <span className="material-icons" style={{ position: 'absolute', top: '25%', left: '25%', color: '#fff' }}>play_arrow</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Full Spinner Component...
const FullSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', width: '100%' }}>
    <div style={{ width: 40, height: 40, border: '3px solid var(--bg-secondary)', borderTopColor: 'var(--primary-bg)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

export default function SearchPage() {
  return (
    <Suspense fallback={<FullSpinner />}>
      <SearchContent />
    </Suspense>
  );
}
