'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// 1. PISAHKAN LOGIKA UTAMA KE KOMPONEN INI
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

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

      // 1. Cari Profil (Kalau bukan hashtag murni)
      if (!isHashtag) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio')
          .ilike('username', `%${query}%`)
          .limit(5);
        setUsers(userData || []);
      } else {
        setUsers([]);
      }

      // 2. Cari Postingan (Berdasarkan caption/bio)
      const { data: postData } = await supabase
        .from('posts')
        .select('id, image_url, video_url, bio, profiles:creator_id(username)')
        .eq('status', 'approved')
        .ilike('bio', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      setPosts(postData || []);
    } catch (error) {
      console.error("Search Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getThumbnail = (post: any) => {
    if (post.video_url) return post.video_url.replace('.mp4', '.jpg');
    if (post.image_url) return post.image_url.split(',')[0];
    return 'https://placehold.co/300x400/1a1a1a/ffffff.png?text=No+Media';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', padding: '15px 20px', borderBottom: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 800, margin: 0 }}>
          Hasil untuk "{query}"
        </h2>
      </div>

      <div style={{ padding: '20px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>Mencari...</div>
        ) : (
          <>
            {/* BOX PROFIL KREATOR */}
            {users.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 700 }}>KREATOR DITEMUKAN</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {users.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => router.push(`/data?id=${user.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg-card)', padding: '15px', borderRadius: '16px', border: '1px solid var(--border-card)', cursor: 'pointer' }}
                    >
                      <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`} alt="avatar" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '15px' }}>{user.username}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {user.bio || 'Tidak ada bio'}
                        </div>
                      </div>
                      <button style={{ background: '#1f3cff', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '12px' }}>Lihat</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HIGHLIGHT POSTINGAN */}
            <div>
              <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 700 }}>POSTINGAN TERKAIT</h3>
              {posts.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>Tidak ada postingan yang cocok.</div>
              ) : (
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 🔥 2. EXPORT DEFAULT KOMPONEN YANG UDAH DIBUNGKUS SUSPENSE 🔥
export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Memuat halaman pencarian...</div>}>
      <SearchContent />
    </Suspense>
  );
}
