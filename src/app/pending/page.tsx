'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils'; 

export default function PendingPostsPage() {
  const router = useRouter();
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPendingPosts();
  }, []);

  const fetchPendingPosts = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');

    const { data, error } = await supabase
      .from('posts')
      .select('id, image_url, video_url')
      .eq('creator_id', session.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingPosts(data);
    }
    setIsLoading(false);
  };

  const getThumbnail = (post: any) => {
    if (post.video_url) {
      return post.video_url.replace('.mp4', '.jpg');
    }
    if (post.image_url) {
      return post.image_url.split(',')[0];
    }
    return 'https://placehold.co/300x400/1a1a1a/ffffff.png?text=Processing';
  };

  const handleDeleteSingle = async (postId: string) => {
    if (!confirm("Hapus postingan ini?")) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      showNotif("Postingan dihapus.", "success");
      setPendingPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      showNotif("Gagal menghapus", "error");
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Yakin ingin menghapus SEMUA postingan yang belum disetujui?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('creator_id', session.user.id)
        .eq('status', 'pending');

      if (error) throw error;
      showNotif("Semua postingan pending dihapus.", "success");
      setPendingPosts([]);
    } catch (err) {
      showNotif("Gagal menghapus semua", "error");
    }
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-main)', color: 'var(--text-main)', maxWidth: '480px', margin: '0 auto', position: 'relative' }}>
      
      {/* HEADER — solid, tanpa efek kaca */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg-main)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '15px 20px',
        borderBottom: '1px solid var(--border-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <span className="material-icons">arrow_back</span>
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Menunggu Review</h2>
        </div>
        {pendingPosts.length > 0 && (
          <button onClick={handleDeleteAll} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
            Hapus Semua
          </button>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ padding: '20px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '50px' }}>Memuat...</div>
        ) : pendingPosts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '50px' }}>
            <span className="material-icons" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '10px' }}>check_circle</span>
            <p>Tidak ada postingan yang menunggu persetujuan.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {pendingPosts.map(post => (
              <div key={post.id} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border-card)' }}>
                <img 
                  src={getThumbnail(post)} 
                  alt="thumbnail" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                
                {/* Overlay Badge Status */}
                <div style={{ position: 'absolute', bottom: '5px', left: '5px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '4px 6px', borderRadius: '6px' }}>
                  Pending
                </div>

                {/* Tombol Hapus Satuan */}
                <button 
                  onClick={() => handleDeleteSingle(post.id)}
                  style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}
                >
                  <span className="material-icons" style={{ fontSize: '14px' }}>delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}