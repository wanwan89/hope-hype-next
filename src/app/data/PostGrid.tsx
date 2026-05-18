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
      {posts.map(post => {
        const allImages = post.image_url ? post.image_url.split(',') : [];
        const thumbUrl = allImages.length > 0 ? allImages[0].trim() : null;
        const isVideo = !!post.video_url;
        const isDraft = post.status === 'draft';

        return (
          <div key={post.id} className="grid-item" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => onPostClick(post.id, post.status)}>
            {isDraft && (
              <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(255, 193, 7, 0.9)', color: '#000', fontSize: '10px', fontWeight: '800', padding: '3px 6px', borderRadius: '6px', zIndex: 3, boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                DRAF
              </div>
            )}
            {thumbUrl || isVideo ? (
              <>
                {thumbUrl ? <img src={thumbUrl} alt="post" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <video src={post.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                {isVideo ? <span className="material-icons" style={{ position: 'absolute', top: '8px', right: '8px', color: 'white', fontSize: '20px', textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>play_circle_filled</span> : allImages.length > 1 ? <span className="material-icons" style={{ position: 'absolute', top: '8px', right: '8px', color: 'white', fontSize: '18px', textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>filter_none</span> : null}
                {!isDraft && (
                  <div style={{ position: 'absolute', bottom: '6px', left: '8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'white', fontSize: '11px', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    <span className="material-icons" style={{ fontSize: '14px' }}>visibility</span>{post.views || 0}
                  </div>
                )}
              </>
            ) : (
              <div className="grid-no-img">
                <span className="material-icons">{isDraft ? 'edit_document' : 'article'}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(PostGrid);