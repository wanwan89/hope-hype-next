'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  
  const [localQuery, setLocalQuery] = useState(query);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [recommendedPosts, setRecommendedPosts] = useState<any[]>([]);

  useEffect(() => {
    setLocalQuery(query);
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
  }, []);

  useEffect(() => {
    if (query) {
      fetchSearchResults();
    } else {
      setIsLoading(false);
    }
  }, [query]);

  const fetchSearchResults = async () => {
    setIsLoading(true);
    try {
      const isHashtag = query.startsWith('#');

      // ==========================================
      // 1. CARI PROFIL & 3 POSTINGAN TERBAIKNYA
      // ==========================================
      if (!isHashtag) {
        // 🔥 Tambahkan is_private di query
        const { data: userData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, is_private')
          .ilike('username', `%${query}%`)
          .limit(5);
        
        let usersWithPosts = [];
        if (userData && userData.length > 0) {
          const userIds = userData.map(u => u.id);
          
          const { data: userPosts } = await supabase
            .from('posts')
            .select('id, creator_id, image_url, video_url')
            .eq('status', 'approved')
            .in('creator_id', userIds)
            .order('created_at', { ascending: false });

          usersWithPosts = userData.map(u => ({
            ...u,
            recentPosts: userPosts ? userPosts.filter(p => p.creator_id === u.id).slice(0, 3) : []
          }));
        }
        setUsers(usersWithPosts);
      } else {
        setUsers([]);
      }

      // ==========================================
      // 2. CARI POSTINGAN SESUAI KATA KUNCI
      // ==========================================
      const { data: postData } = await supabase
        .from('posts')
        .select('id, image_url, video_url, bio, profiles:creator_id(username, is_private)')
        .eq('status', 'approved')
        .ilike('bio', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(21);

      setPosts(postData || []);

      // ==========================================
      // 3. FITUR "MUNGKIN ANDA SUKA" (JIKA KOSONG)
      // ==========================================
      if (!postData || postData.length === 0) {
        const { data: recData } = await supabase
          .from('posts')
          .select('id, image_url, video_url, bio, profiles:creator_id(username)')
          .eq('status', 'approved')
          .limit(20);
        
        if (recData) {
          setRecommendedPosts(recData.sort(() => Math.random() - 0.5).slice(0, 9)); 
        }
      } else {
        setRecommendedPosts([]); 
      }

    } catch (error) {
      console.error("Search Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && localQuery.trim() !== '') {
      router.push(`/search?q=${encodeURIComponent(localQuery.trim())}`);
    }
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
      
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', padding: '12px 20px', borderBottom: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span className="material-icons" style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', fontSize: '18px' }}>search</span>
          <input 
            type="text" 
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleSearchEnter}
            placeholder="Cari kreator, postingan, #hashtag..."
            style={{ 
              width: '100%', padding: '10px 15px 10px 38px', borderRadius: '24px', 
              background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-card)',
              fontSize: '14px', outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        
        {query && !isLoading && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Hasil pencarian untuk <strong style={{ color: 'var(--text-main)' }}>"{query}"</strong>
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>Mencari...</div>
        ) : (
          <>
            {/* ================================
                BAGIAN 1: KREATOR & 3 POSTINGAN
            ================================= */}
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
                            {/* 🔥 ICON PRIVATE DITAMBAHKAN DI SEBELAH NAMA 🔥 */}
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
                              style={{ 
                                background: isFollowing ? 'var(--bg-secondary)' : '#1f3cff', 
                                color: isFollowing ? 'var(--text-main)' : '#fff', 
                                border: isFollowing ? '1px solid var(--border-card)' : 'none', 
                                padding: '6px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' 
                              }}
                            >
                              {isFollowing ? 'Mengikuti' : 'Ikuti'}
                            </button>
                          )}
                        </div>

                        {/* 🔥 LOGIKA SEMBUNYIKAN POSTINGAN JIKA PRIVATE 🔥 */}
                        {user.is_private && !isMe ? (
                          <div style={{ marginTop: '15px', padding: '15px', background: 'var(--bg-main)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--border-card)' }}>
                            <span className="material-icons" style={{ fontSize: '24px', marginBottom: '4px' }}>lock</span>
                            <div style={{ fontSize: '12px', fontWeight: 600 }}>Akun ini privat</div>
                          </div>
                        ) : (
                          user.recentPosts?.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '15px' }}>
                              {user.recentPosts.map((rp: any) => (
                                <div 
                                  key={rp.id} 
                                  onClick={(e) => { e.stopPropagation(); router.push(`/#post-${rp.id}`); }}
                                  style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-secondary)' }}
                                >
                                  <img src={getThumbnail(rp)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="post" />
                                  {rp.video_url && (
                                    <span className="material-icons" style={{ position: 'absolute', top: '4px', right: '4px', color: '#fff', fontSize: '16px', background: 'rgba(0,0,0,0.4)', borderRadius: '50%', padding: '2px' }}>play_arrow</span>
                                  )}
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

            {/* ================================
                BAGIAN 2: POSTINGAN TERKAIT
            ================================= */}
            {posts.length > 0 && (
              <div>
                <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 700 }}>POSTINGAN TERKAIT</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {posts.map(post => (
                    <div 
                      key={post.id} 
                      onClick={() => router.push(`/#post-${post.id}`)}
                      style={{ position: 'relative', aspectRatio: '3/4', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                    >
                      <img src={getThumbnail(post)} alt="post" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {post.video_url && (
                        <div style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                          <span className="material-icons" style={{ color: '#fff', fontSize: '14px' }}>play_arrow</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================================
                BAGIAN 3: MUNGKIN ANDA SUKA (JIKA KOSONG)
            ================================= */}
            {posts.length === 0 && recommendedPosts.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ textAlign: 'center', padding: '20px 0 40px 0' }}>
                  <span className="material-icons" style={{ fontSize: '48px', color: 'var(--border-card)' }}>search_off</span>
                  <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: '10px' }}>Tidak ada hasil yang cocok.</p>
                </div>

                <h3 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '15px', fontWeight: 800, textAlign: 'center' }}>🔥 MUNGKIN ANDA SUKA</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {recommendedPosts.map(post => (
                    <div 
                      key={post.id} 
                      onClick={() => router.push(`/#post-${post.id}`)}
                      style={{ position: 'relative', aspectRatio: '3/4', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                    >
                      <img src={getThumbnail(post)} alt="post" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {post.video_url && (
                        <div style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                          <span className="material-icons" style={{ color: '#fff', fontSize: '14px' }}>play_arrow</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </>
        )}
      </div>
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
