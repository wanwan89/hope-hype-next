'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import './DataProfile.css';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const urlId = searchParams?.get('id');
  const urlUser = searchParams?.get('user') || searchParams?.get('username');

  const [myId, setMyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, likes: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  
  // 🔥 Update 4 Tab 🔥
  const [activeTab, setActiveTab] = useState<'foto' | 'musik' | 'repost' | 'like'>('foto');
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newBio, setNewBio] = useState('');

  useEffect(() => { loadProfile(); }, [urlId, urlUser]);
  useEffect(() => { if (profile) loadPostsTab(activeTab); }, [activeTab, profile]);

  const loadProfile = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id || null;
    setMyId(currentUserId);

    let query = supabase.from('profiles').select('*');
    if (urlId) query = query.eq('id', urlId);
    else if (urlUser) query = query.eq('username', urlUser);
    else if (currentUserId) query = query.eq('id', currentUserId);
    else { router.push('/login'); return; }

    const { data: profData, error } = await query.single();
    if (error || !profData) return;

    setProfile(profData);
    setNewBio(profData.bio || '');
    updateStats(profData.id, currentUserId);
  };

  const updateStats = async (targetId: string, currentUserId: string | null) => {
    const { count: fers } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', targetId);
    const { count: fing } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', targetId);
    
    const { data: myPosts } = await supabase.from('posts').select('id').eq('creator_id', targetId);
    let totalLikes = 0;
    if (myPosts && myPosts.length > 0) {
        const { count: lks } = await supabase.from('likes').select('*', { count: 'exact', head: true }).in('post_id', myPosts.map(p => p.id));
        totalLikes = lks || 0;
    }
    setStats({ followers: fers || 0, following: fing || 0, likes: totalLikes });

    if (currentUserId && currentUserId !== targetId) {
      const { data: isF } = await supabase.from('followers').select('id').match({ follower_id: currentUserId, following_id: targetId }).maybeSingle();
      setIsFollowing(!!isF);
    }
  };

  const loadPostsTab = async (type: string) => {
    if (!profile) return;
    setIsLoadingPosts(true);
    setPosts([]);
    try {
      if (type === 'foto') {
        const { data } = await supabase.from('posts').select('id, image_url').eq('creator_id', profile.id).eq('status', 'approved').order('created_at', { ascending: false });
        setPosts(data || []);
      } else if (type === 'musik') {
        const { data } = await supabase.from('songs').select('id, cover_url').eq('artist', profile.username).order('created_at', { ascending: false });
        setPosts(data ? data.map(s => ({ id: s.id, image_url: s.cover_url })) : []);
      } else if (type === 'repost' || type === 'like') {
        const table = type === 'repost' ? 'reposts' : 'likes';
        const { data: rels } = await supabase.from(table).select('post_id').eq('user_id', profile.id);
        if (rels && rels.length > 0) {
           const { data: pData } = await supabase.from('posts').select('id, image_url').in('id', rels.map(r => r.post_id)).eq('status', 'approved');
           setPosts(pData || []);
        }
      }
    } catch (err) { console.error(err); } finally { setIsLoadingPosts(false); }
  };

  const toggleFollow = async () => {
    if (!myId) return router.push('/login');
    if (isFollowing) {
        setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
        setIsFollowing(false);
        await supabase.from('followers').delete().match({ follower_id: myId, following_id: profile.id });
    } else {
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        setIsFollowing(true);
        await supabase.from('followers').insert([{ follower_id: myId, following_id: profile.id }]);
    }
  };

  const handleSaveBio = async () => {
    if (!myId) return;
    try {
        await supabase.from('profiles').update({ bio: newBio }).eq('id', myId);
        setProfile((prev: any) => ({ ...prev, bio: newBio }));
        setIsBioModalOpen(false);
        showNotif("Bio diperbarui", "success");
    } catch (err) { showNotif("Gagal simpan bio", "error"); }
  };

  if (!profile) return <div className="profile-page-container"></div>;

  const isMe = myId === profile.id;

  return (
    <div className="profile-page-container">
      
      {/* HEADER */}
      <header className="profile-header">
        <button className="header-btn" onClick={() => router.back()}>
           <span className="material-icons">arrow_back</span>
        </button>
        <h2>{profile.username}</h2>
        <button className="header-btn" onClick={() => setIsSidebarOpen(true)}>
           <span className="material-icons">menu</span>
        </button>
      </header>

      {/* TOP SECTION */}
      <div className="profile-top-section">
        <section className="profile-info">
          <div className="avatar-container">
             <img className="profile-avatar" src={profile.avatar_url || '/asets/png/profile.webp'} alt="Avatar" />
          </div>
          <h1 className="profile-name">
             {profile.username}
             <span dangerouslySetInnerHTML={{ __html: getUserBadge(profile.role) }} />
          </h1>
          <p className="profile-username">@{profile.username.toLowerCase().replace(/\s/g, '')}</p>

          <div className="profile-stats">
            <div className="stat-box">
               <span className="stat-num">{stats.likes}</span>
               <span className="stat-label">Suka</span>
            </div>
            <div className="stat-box">
               <span className="stat-num">{stats.followers}</span>
               <span className="stat-label">Pengikut</span>
            </div>
            <div className="stat-box">
               <span className="stat-num">{stats.following}</span>
               <span className="stat-label">Mengikuti</span>
            </div>
          </div>

          <div className="profile-actions">
             {isMe ? (
                <>
                   <button className="btn-action btn-secondary" onClick={() => setIsBioModalOpen(true)}>Edit Profil</button>
                   <button className="btn-action btn-secondary">Bagikan</button>
                </>
             ) : (
                <button className={`btn-action ${isFollowing ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleFollow}>
                   {isFollowing ? 'Mengikuti' : 'Ikuti'}
                </button>
             )}
          </div>

          {/* 🔥 Bio Pindah Sini 🔥 */}
          <p className="profile-bio">{profile.bio || 'Belum ada bio.'}</p>
        </section>

        <div className="profile-tabs">
           <div className={`tab-item ${activeTab === 'foto' ? 'active' : ''}`} onClick={() => setActiveTab('foto')}>Karya</div>
           <div className={`tab-item ${activeTab === 'musik' ? 'active' : ''}`} onClick={() => setActiveTab('musik')}>Musik</div>
           <div className={`tab-item ${activeTab === 'repost' ? 'active' : ''}`} onClick={() => setActiveTab('repost')}>Repost</div>
           <div className={`tab-item ${activeTab === 'like' ? 'active' : ''}`} onClick={() => setActiveTab('like')}>Suka</div>
        </div>
      </div>

      {/* SCROLLABLE GRID */}
      <div className="post-grid-container">
        <div className="post-grid">
           {isLoadingPosts ? (
              <div className="empty-state">Memuat...</div>
           ) : posts.length === 0 ? (
              <div className="empty-state">
                <span className="material-icons" style={{fontSize: '40px', opacity: 0.5}}>grid_on</span>
                <p style={{margin: '10px 0 0'}}>Belum ada postingan</p>
              </div>
           ) : (
              posts.map(post => (
                 <div key={post.id} className="grid-item" onClick={() => router.push(activeTab === 'musik' ? `/music?id=${post.id}` : `/post?id=${post.id}`)}>
                    {post.image_url ? <img src={post.image_url} alt="post" /> : <div className="grid-no-img"><span className="material-icons">article</span></div>}
                 </div>
              ))
           )}
        </div>
      </div>

      {/* 🔥 SIDEBAR TIKTOK STYLE 🔥 */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-search-container">
          <div className="sidebar-search">
             <span className="material-icons" style={{fontSize: '20px', color: '#8a8b91'}}>search</span>
             <input type="text" placeholder="Cari" />
          </div>
        </div>

        <div className="menu-category-label">Aset</div>
        <div className="menu-item-tiktok" onClick={() => router.push('/saldo')}>
           <div className="icon-wrapper"><span className="material-icons">account_balance_wallet</span></div>
           <div className="menu-text">Saldo</div>
           <div className="arrow-right">›</div>
        </div>
        <div className="menu-item-tiktok" onClick={() => router.push('/historycoin')}>
           <div className="icon-wrapper"><span className="material-icons">history</span></div>
           <div className="menu-text">Riwayat Transaksi</div>
           <div className="arrow-right">›</div>
        </div>

        <div className="menu-category-label">Misi & Hadiah</div>
        <div className="menu-item-tiktok" onClick={() => router.push('/dailycek')}>
           <div className="icon-wrapper" style={{color: '#f59e0b'}}><span className="material-icons">assignment_turned_in</span></div>
           <div className="menu-text">Pusat Misi</div>
           <div className="arrow-right">›</div>
        </div>

        <hr className="menu-divider" />

        <div className="menu-category-label">Alat Pribadi</div>
        <div className="menu-item-tiktok" onClick={() => { setIsSidebarOpen(false); /* trigger QR share */ }}>
           <div className="icon-wrapper"><span className="material-icons">qr_code_2</span></div>
           <div className="menu-text">Kode QR Anda</div>
           <div className="arrow-right">›</div>
        </div>
        <div className="menu-item-tiktok logout" onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}>
           <div className="icon-wrapper"><span className="material-icons">logout</span></div>
           <div className="menu-text">Keluar</div>
        </div>
      </aside>

      {/* MODAL BIO */}
      <div className={`custom-modal-overlay ${isBioModalOpen ? 'active' : ''}`} onClick={() => setIsBioModalOpen(false)}>
         <div className="custom-modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{textAlign: 'center', marginBottom: '15px'}}>Edit Bio</h3>
            <textarea className="bio-textarea" rows={4} value={newBio} onChange={e => setNewBio(e.target.value)} maxLength={150}></textarea>
            <div style={{display: 'flex', gap: '10px'}}>
               <button className="btn-action btn-secondary" style={{flex: 1}} onClick={() => setIsBioModalOpen(false)}>Batal</button>
               <button className="btn-action btn-primary" style={{flex: 1}} onClick={handleSaveBio}>Simpan</button>
            </div>
         </div>
      </div>

    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileContent />
    </Suspense>
  );
}
