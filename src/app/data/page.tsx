'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import './DataProfile.css';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const urlId = searchParams?.get('id');
  const urlUser = searchParams?.get('user') || searchParams?.get('username');

  const [myId, setMyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, likes: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'foto' | 'musik' | 'repost' | 'like'>('foto');
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  // STATE MODALS & SIDEBAR
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editData, setEditData] = useState({ username: '', bio: '', avatar_url: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const avatarPresets = [
    '/asets/png/avatar1.png',
    '/asets/png/avatar2.png',
    '/asets/png/avatar3.png',
    '/asets/png/avatar4.png'
  ];

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
    setEditData({
      username: profData.username || '',
      bio: profData.bio || '',
      avatar_url: profData.avatar_url || ''
    });
    setPreviewUrl(profData.avatar_url || '/asets/png/profile.webp');
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
      const table = type === 'repost' ? 'reposts' : type === 'like' ? 'likes' : null;
      if (type === 'foto') {
        const { data } = await supabase.from('posts').select('id, image_url').eq('creator_id', profile.id).eq('status', 'approved').order('created_at', { ascending: false });
        setPosts(data || []);
      } else if (type === 'musik') {
        const { data } = await supabase.from('songs').select('id, cover_url').eq('artist', profile.username).order('created_at', { ascending: false });
        setPosts(data ? data.map(s => ({ id: s.id, image_url: s.cover_url })) : []);
      } else if (table) {
        const { data: rels } = await supabase.from(table).select('post_id').eq('user_id', profile.id);
        if (rels && rels.length > 0) {
           const { data: pData } = await supabase.from('posts').select('id, image_url').in('id', rels.map(r => r.post_id)).eq('status', 'approved');
           setPosts(pData || []);
        }
      }
    } catch (err) { console.error(err); } finally { setIsLoadingPosts(false); }
  };

  const handleShareProfile = async () => {
    const shareData = {
      title: `Profil ${profile.username} - Hope Hype`,
      text: `Cek karya keren ${profile.username} di Hope Hype!`,
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      showNotif("Link disalin ke clipboard!", "success");
    }
  };

  const handleSaveSettings = async () => {
    if (!myId) return;
    if (!editData.username.trim()) return showNotif("Username tidak boleh kosong", "warning");

    setIsSaving(true);
    try {
      let finalAvatarUrl = editData.avatar_url;

      if (selectedFile) {
        showNotif("Mengunggah foto...", "info");
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("upload_preset", "post_hope"); 
        const res = await fetch("https://api.cloudinary.com/v1_1/dhhmkb8kl/image/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Gagal unggah foto");
        const resData = await res.json();
        finalAvatarUrl = resData.secure_url;
      }

      const { error } = await supabase.from("profiles").update({
        username: editData.username,
        bio: editData.bio,
        avatar_url: finalAvatarUrl || profile.avatar_url
      }).eq("id", myId);

      if (error) throw error;

      showNotif("Profil berhasil diperbarui!", "success");
      setIsEditModalOpen(false);
      setTimeout(() => location.reload(), 800);
    } catch (err: any) {
      showNotif(err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setEditData(prev => ({ ...prev, avatar_url: '' })); 
    }
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

  const navTo = (path: string) => {
    setIsSidebarOpen(false);
    router.push(path);
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
                   <button className="btn-action btn-secondary" onClick={() => setIsEditModalOpen(true)}>Edit Profil</button>
                   <button className="btn-action btn-secondary" onClick={handleShareProfile}>Bagikan</button>
                </>
             ) : (
                <button className={`btn-action ${isFollowing ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleFollow}>
                   {isFollowing ? 'Mengikuti' : 'Ikuti'}
                </button>
             )}
          </div>

          <p className="profile-bio">{profile.bio || 'Belum ada bio.'}</p>
        </section>

        <div className="profile-tabs">
           <div className={`tab-item ${activeTab === 'foto' ? 'active' : ''}`} onClick={() => setActiveTab('foto')}>Karya</div>
           <div className={`tab-item ${activeTab === 'musik' ? 'active' : ''}`} onClick={() => setActiveTab('musik')}>Musik</div>
           <div className={`tab-item ${activeTab === 'repost' ? 'active' : ''}`} onClick={() => setActiveTab('repost')}>Repost</div>
           <div className={`tab-item ${activeTab === 'like' ? 'active' : ''}`} onClick={() => setActiveTab('like')}>Suka</div>
        </div>
      </div>

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

      {/* 🔥 SIDEBAR DENGAN UNIQUE CLASS & ICON BARU 🔥 */}
      <div className={`p-sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      
      <aside className={`p-sidebar-panel ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-search-container">
          <div className="sidebar-search">
             <span className="material-icons" style={{fontSize: '20px', color: '#8a8b91'}}>search</span>
             <input type="text" placeholder="Cari..." />
          </div>
        </div>

        <div className="menu-category-label">Dompet & Aset</div>
        <div className="menu-item-tiktok" onClick={() => navTo('/saldo')}>
           <div className="icon-wrapper"><span className="material-icons">toll</span></div>
           <div className="menu-text">Saldo HypeCoin</div>
           <div className="arrow-right">›</div>
        </div>
        <div className="menu-item-tiktok" onClick={() => navTo('/historycoin')}>
           <div className="icon-wrapper"><span className="material-icons">receipt_long</span></div>
           <div className="menu-text">Riwayat Transaksi</div>
           <div className="arrow-right">›</div>
        </div>

        <div className="menu-category-label">Misi & Hadiah</div>
        <div className="menu-item-tiktok" onClick={() => navTo('/dailycek')}>
           <div className="icon-wrapper" style={{color: '#f59e0b'}}><span className="material-icons">emoji_events</span></div>
           <div className="menu-text">Pusat Misi</div>
           <div className="arrow-right">›</div>
        </div>

        <hr className="menu-divider" />

        <div className="menu-category-label">Alat Pribadi</div>
        <div className="menu-item-tiktok" onClick={handleShareProfile}>
           <div className="icon-wrapper"><span className="material-icons">ios_share</span></div>
           <div className="menu-text">Bagikan Profil</div>
           <div className="arrow-right">›</div>
        </div>
        <div className="menu-item-tiktok logout" onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}>
           <div className="icon-wrapper"><span className="material-icons">power_settings_new</span></div>
           <div className="menu-text">Keluar Akun</div>
        </div>
      </aside>

      {/* MODAL EDIT PROFIL LENGKAP */}
      <div className={`custom-modal-overlay ${isEditModalOpen ? 'active' : ''}`} onClick={() => !isSaving && setIsEditModalOpen(false)}>
         <div className="edit-profile-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
               <h3>Edit Profil</h3>
               <span className="material-icons close-btn" onClick={() => setIsEditModalOpen(false)}>close</span>
            </div>

            <div className="avatar-edit-section">
               <label className="main-preview-label">
                  <img src={previewUrl || '/asets/png/profile.webp'} className="avatar-main-preview" alt="Preview" />
                  <div className="upload-overlay" onClick={() => fileInputRef.current?.click()}>
                     <span className="material-icons">camera_alt</span>
                  </div>
               </label>
               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{display: 'none'}} />
               
               <p className="section-label">Ganti Avatar:</p>
               <div className="avatar-presets">
                  {avatarPresets.map((src, i) => (
                     <img 
                        key={i} 
                        src={src} 
                        className={`preset-img ${previewUrl === src ? 'selected' : ''}`} 
                        onClick={() => {
                           setEditData(prev => ({ ...prev, avatar_url: src }));
                           setPreviewUrl(src);
                           setSelectedFile(null);
                        }}
                     />
                  ))}
               </div>
            </div>

            <div className="input-group">
               <label>Username</label>
               <input 
                  type="text" 
                  value={editData.username} 
                  onChange={e => setEditData(prev => ({ ...prev, username: e.target.value }))}
               />
            </div>

            <div className="input-group">
               <label>Bio</label>
               <textarea 
                  rows={3} 
                  value={editData.bio} 
                  onChange={e => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                  maxLength={150}
               />
            </div>

            <button className="save-btn-premium" onClick={handleSaveSettings} disabled={isSaving}>
               {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
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
