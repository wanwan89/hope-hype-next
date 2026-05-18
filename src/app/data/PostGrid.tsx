'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  posts: any[];
  isLoadingPosts: boolean;
  isMe: boolean;
  isMutual: boolean;
  profile: any;
  activeTab: string;
  onPostClick: (postId: string, status: string) => void;
  t: (key: string, fallback?: string) => string;
};

const PostGrid: React.FC<Props> = ({ posts, isLoadingPosts, isMe, isMutual, profile, activeTab, onPostClick, t }) => {
  const router = useRouter();

  // 🔥 PISAHKAN DRAF DAN POSTINGAN PUBLIK 🔥
  const draftPosts = posts.filter(p => p.status === 'draft');
  const publishedPostsRaw = posts.filter(p => p.status !== 'draft');

  // 🔥 URUTKAN POSTINGAN & LIMIT PIN MAKSIMAL 3 🔥
  const sortedPosts = [...publishedPostsRaw].sort((a, b) => {
    // Paksa jadi angka untuk perbandingan yang pasti
    const aPinned = a.is_pinned === true ? 1 : 0;
    const bPinned = b.is_pinned === true ? 1 : 0;
    return bPinned - aPinned; 
  });

  let pinCount = 0;
  const publishedPosts = sortedPosts.map(post => {
    if (post.is_pinned === true) {
      if (pinCount < 3) {
        pinCount++;
        return { ...post, visually_pinned: true }; // Masih dapet kuota pin
      } else {
        return { ...post, visually_pinned: false }; // Udah lebih dari 3, cabut lencananya
      }
    }
    return { ...post, visually_pinned: false };
  });

  if (isLoadingPosts) {
    return (
      <div className="post-grid">
        {Array(9).fill(0).map((_, i) => <div key={i} className="skeleton-grid-item"></div>)}
      </div>
    );
  }

  if (profile.is_private && !isMutual && !isMe) {
    return (
      <div className="post-grid">
        <div className="no-posts-v2">
          <div className="no-posts-icon-circle"><span className="material-icons">lock</span></div>
          <h3>Akun Private</h3>
          <p>Harus saling mengikuti (berteman) untuk melihat postingan dan karya mereka.</p>
        </div>
      </div>
    );
  }

  if ((activeTab === 'like' && !isMe && profile.hide_likes) || (activeTab === 'repost' && !isMe && profile.hide_reposts)) {
    return (
      <div className="post-grid">
        <div className="no-posts-v2">
          <div className="no-posts-icon-circle"><span className="material-icons">lock</span></div>
          <h3>Aktivitas Privat</h3>
          <p>Pengguna menyembunyikan riwayat aktivitas ini.</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="post-grid">
        <div className="no-posts-v2">
          <div className="no-posts-icon-circle">
            <span className="material-icons">{activeTab === 'private' ? 'lock' : 'auto_awesome'}</span>
          </div>
          <h3>{activeTab === 'private' ? 'Tidak ada postingan privat' : t('no_posts', 'Belum ada postingan')}</h3>
          {isMe && activeTab === 'post' && (
            <button className="btn-action btn-primary" onClick={() => router.push('/create')}>
              {t('create_post', 'Buat Postingan')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="post-grid">
      
      {/* 🔥 KOTAK KHUSUS FOLDER DRAF DENGAN PREVIEW (HANYA MUNCUL BUAT OWNER) 🔥 */}
      {isMe && activeTab === 'post' && draftPosts.length > 0 && (
        <div 
          className="grid-item" 
          style={{ 
            cursor: 'pointer', position: 'relative', overflow: 'hidden', 
            background: 'var(--bg-secondary)', border: '2px dashed #f59e0b' 
          }} 
          onClick={() => router.push('/drafts')}
        >
          <div style={{ position: 'absolute', top: '6px', left: '6px', zIndex: 5, background: 'rgba(245, 158, 11, 0.9)', color: '#000', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            <span className="material-icons" style={{ fontSize: '14px' }}>inventory_2</span>
            {draftPosts.length} Draf
          </div>

          {(() => {
            const latestDraft = draftPosts[0];
            const draftImages = latestDraft.image_url ? latestDraft.image_url.split(',') : [];
            const draftThumbUrl = draftImages.length > 0 ? draftImages[0].trim() : null;
            const draftIsVideo = !!latestDraft.video_url;

            return (
              <>
                {draftThumbUrl ? (
                  <img src={draftThumbUrl} alt="draft preview" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.5)' }} />
                ) : draftIsVideo ? (
                  <video src={latestDraft.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.5)' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons" style={{ fontSize: '40px', color: 'var(--text-muted)', opacity: 0.5 }}>article</span>
                  </div>
                )}
              </>
            );
          })()}

          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
             <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}>Lihat Draf</span>
          </div>
        </div>
      )}

      {/* 🔥 RENDER POSTINGAN YANG SUDAH DI-PUBLISH 🔥 */}
      {publishedPosts.map(post => {
        const allImages = post.image_url ? post.image_url.split(',') : [];
        const thumbUrl = allImages.length > 0 ? allImages[0].trim() : null;
        const isVideo = !!post.video_url;
        
        // 🔥 FIX TIPE DATA: Jadikan string secara eksplisit
        const safeId = String(post.id);

        return (
          <div 
            key={safeId} 
            className="grid-item" 
            style={{ cursor: 'pointer', position: 'relative' }} 
            // 🔥 FIX NAVIGASI: Kirim ID yang udah aman ke fungsi bawaan parent
            onClick={() => {
              if (post.status === 'draft') {
                router.push(`/create?draft_id=${safeId}`);
              } else {
                router.push(`/post?id=${safeId}`);
              }
            }}
          >
            {/* 🔥 LENCANA JELAS UNTUK POSTINGAN YANG DISEMATKAN (MAX 3) 🔥 */}
            {post.visually_pinned && (
              <div style={{ 
                position: 'absolute', top: '6px', right: '6px', zIndex: 3, 
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', 
                padding: '4px 8px', borderRadius: '12px', display: 'flex', 
                alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <span className="material-icons" style={{ fontSize: '12px', color: '#fff', transform: 'rotate(45deg)' }}>push_pin</span>
                <span style={{ fontSize: '10px', color: '#fff', fontWeight: 700 }}>Disematkan</span>
              </div>
            )}

            {thumbUrl || isVideo ? (
              <>
                {thumbUrl ? <img src={thumbUrl} alt="post" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <video src={post.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                
                {/* Ikon tambahan kalau video / multi-gambar */}
                {!post.visually_pinned && isVideo ? (
                  <span className="material-icons" style={{ position: 'absolute', top: '8px', right: '8px', color: 'white', fontSize: '20px', textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>play_circle_filled</span>
                ) : !post.visually_pinned && allImages.length > 1 ? (
                  <span className="material-icons" style={{ position: 'absolute', top: '8px', right: '8px', color: 'white', fontSize: '18px', textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>filter_none</span>
                ) : null}
                
                <div style={{ position: 'absolute', bottom: '6px', left: '8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'white', fontSize: '11px', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  <span className="material-icons" style={{ fontSize: '14px' }}>visibility</span>{post.views || 0}
                </div>
              </>
            ) : (
              <div className="grid-no-img" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                <span className="material-icons" style={{ fontSize: '32px', color: 'var(--text-muted)' }}>article</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(PostGrid);
