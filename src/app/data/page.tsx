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

  const [isMounted, setIsMounted] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, likes: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'post' | 'simpan' | 'repost' | 'like'>('post');
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editData, setEditData] = useState({ username: '', bio: '', avatar_url: '', website: '' });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const [followList, setFollowList] = useState<any[]>([]);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const avatarPresets = [
    '/asets/png/avatar1.png', '/asets/png/avatar2.png',
    '/asets/png/avatar3.png', '/asets/png/avatar4.png'
  ];

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsEditModalOpen(false);
      setIsSidebarOpen(false);
    };
  }, []);

  useEffect(() => { 
    if (isMounted) loadProfile(); 
  }, [urlId, urlUser, isMounted]);

  useEffect(() => { 
    if (profile && isMounted) loadPostsTab(activeTab); 
  }, [activeTab, profile, isMounted]);

  const loadProfile = async () => {
    try {
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
        avatar_url: profData.avatar_url || '',
        website: profData.website || ''
      });
      setPreviewUrl(profData.avatar_url || '/asets/png/profile.webp');
      updateStats(profData.id, currentUserId);
    } catch (err) {
      console.error("Load Profile Error:", err);
    }
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
      if (type === 'post') {
        const { data } = await supabase.from('posts').select('id, image_url').eq('creator_id', profile.id).eq('status', 'approved').order('created_at', { ascending: false });
        setPosts(data || []);
      } 
      else if (type === 'simpan') {
        const { data: saves } = await supabase.from('bookmarks').select('post_id').eq('user_id', profile.id);
        if (saves && saves.length > 0) {
          const postIds = saves.map((s: any) => s.post_id);
          const { data: pData } = await supabase.from('posts').select('id, image_url').in('id', postIds).eq('status', 'approved');
          setPosts(pData || []);
        }
      } 
      else if (type === 'repost' || type === 'like') {
        const tableName = type === 'repost' ? 'reposts' : 'likes';
        const { data: rels } = await supabase.from(tableName).select('post_id').eq('user_id', profile.id);
        if (rels && rels.length > 0) {
          const postIds = rels.map((r: any) => r.post_id);
          const { data: pData } = await supabase.from('posts').select('id, image_url').in('id', postIds).eq('status', 'approved');
          setPosts(pData || []);
        }
      }
    } catch (err) { 
      console.error(err);
      setPosts([]);
    } finally { 
      setIsLoadingPosts(false); 
    }
  };

  const handleOpenFollowModal = async (type: 'followers' | 'following') => {
    setFollowModalType(type);
    setIsFollowModalOpen(true);
    setIsFollowLoading(true);
    setFollowList([]);
    if (!profile) return;

    try {
      const targetCol = type === 'followers' ? 'follower_id' : 'following_id';
      const matchCol = type === 'followers' ? 'following_id' : 'follower_id';

      // 1. Ambil list ID
      const { data: idList, error: idError } = await supabase
        .from('followers')
        .select(targetCol)
        .eq(matchCol, profile.id);

      if (idError) throw idError;

      if (idList && idList.length > 0) {
        const userIds = idList.map((item: any) => item[targetCol]);
        // 2. Tarik info profil lengkap
        const { data: profilesData, error: profError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, role')
          .in('id', userIds);

        if (profError) throw profError;
        setFollowList(profilesData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleShareProfile = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: `Profil ${profile.username}`, url }); } catch (err) {} }
    else { navigator.clipboard.writeText(url); showNotif("Link disalin!", "success"); }
  };

  const handleSaveSettings = async () => {
    if (!myId || !editData.username.trim()) return showNotif("Username kosong", "warning");
    setIsSaving(true);
    try {
      let finalAvatarUrl = editData.avatar_url;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("upload_preset", "post_hope"); 
        const res = await fetch("https://api.cloudinary.com/v1_1/dhhmkb8kl/image/upload", { method: "POST", body: formData });
        const resData = await res.json();
        finalAvatarUrl = resData.secure_url;
      }
      await supabase.from("profiles").update({ 
        username: editData.username, 
        bio: editData.bio, 
        avatar_url: finalAvatarUrl || profile.avatar_url,
        website: editData.website 
      }).eq("id", myId);
      
      showNotif("Profil diperbarui!", "success");
      setIsEditModalOpen(false);
      setTimeout(() => location.reload(), 800);
    } catch (err: any) { showNotif(err.message, "error"); } finally { setIsSaving(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); }
  };

  const toggleFollow = async () => {
    if (!myId) return router.push('/login');
    if (isFollowing) {
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
        setIsFollowing(false);
        await supabase.from('followers').delete().match({ follower_id: myId, following_id: profile.id });
    } else {
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        setIsFollowing(true);
        await supabase.from('followers').insert([{ follower_id: myId, following_id: profile.id }]);
    }
  };

  const navTo = (path: string) => { setIsSidebarOpen(false); router.push(path); };

  if (!isMounted || !profile) return <div className="profile-page-container" style={{ backgroundColor: '#ffffff' }}></div>;

  const isMe = myId === profile.id;

  return (
    <div className="profile-page-container">
      <header className="profile-header">
        <h2 style={{ marginLeft: '10px' }}>{profile.username}</h2>
        <button className="header-btn" onClick={() => setIsSidebarOpen(true)}><span className="material-icons">menu</span></button>
      </header>

      <div className="profile-top-section">
        <section className="profile-info">
          <div className="avatar-container"><img className="profile-avatar" src={profile.avatar_url || '/asets/png/profile.webp'} alt="Avatar" /></div>
          <h1 className="profile-name">{profile.username} <span dangerouslySetInnerHTML={{ __html: getUserBadge(profile.role) }} /></h1>
          <p className="profile-username">@{profile.username.toLowerCase().replace(/\s/g, '')}</p>

          <div className="profile-stats">
            <div className="stat-box" onClick={() => handleOpenFollowModal('followers')} style={{cursor: 'pointer'}}><span className="stat-num">{stats.followers}</span><span className="stat-label">Pengikut</span></div>
            <div className="stat-box" onClick={() => handleOpenFollowModal('following')} style={{cursor: 'pointer'}}><span className="stat-num">{stats.following}</span><span className="stat-label">Mengikuti</span></div>
            <div className="stat-box"><span className="stat-num">{stats.likes}</span><span className="stat-label">Suka</span></div>
          </div>

          <div className="profile-actions">
             {isMe ? (
                <>
                   <button className="btn-action btn-secondary" onClick={() => setIsEditModalOpen(true)}>Edit Profil</button>
                   <button className="btn-action btn-secondary" onClick={handleShareProfile}>Bagikan</button>
                </>
             ) : (
                <button className={`btn-action ${isFollowing ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleFollow}>{isFollowing ? 'Mengikuti' : 'Ikuti'}</button>
             )}
          </div>
          <p className="profile-bio">{profile.bio || 'Belum ada bio.'}</p>
          
          {/* 🔥 FIX LINK MINIMALIS (11px & Muted Color) */}
          {profile.website && (
            <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
               target="_blank" rel="noopener noreferrer" 
               style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', color: '#64748b', fontWeight: '500', marginTop: '6px', textDecoration: 'none', opacity: 0.8 }}>
               <span className="material-icons" style={{ fontSize: '14px' }}>link</span>
               {profile.website.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          )}
        </section>

        <div className="profile-tabs">
           <div className={`profile-tab-item ${activeTab === 'post' ? 'active' : ''}`} onClick={() => setActiveTab('post')}>Post</div>
           <div className={`profile-tab-item ${activeTab === 'simpan' ? 'active' : ''}`} onClick={() => setActiveTab('simpan')}>Simpan</div>
           <div className={`profile-tab-item ${activeTab === 'repost' ? 'active' : ''}`} onClick={() => setActiveTab('repost')}>Repost</div>
           <div className={`profile-tab-item ${activeTab === 'like' ? 'active' : ''}`} onClick={() => setActiveTab('like')}>Suka</div>
        </div>
      </div>

      <div className="post-grid-container">
        <div className="post-grid">
           {isLoadingPosts ? (
              Array(9).fill(0).map((_, i) => <div key={i} className="skeleton-grid-item"></div>)
           ) : posts.length === 0 ? (
              <div className="no-posts-v2">
                <div className="no-posts-icon-circle"><span className="material-icons">auto_awesome</span></div>
                <h3>Belum ada postingan</h3>
                {isMe && <button className="btn-action btn-primary" onClick={() => router.push('/')}>Buat Postingan</button>}
              </div>
           ) : (
              posts.map(post => (
                 // 🔥 FIX KLIK POST: Navigasi Langsung ke Post Detail
                 <div key={post.id} className="grid-item" style={{ cursor: 'pointer' }} onClick={() => router.push(`/post?id=${post.id}`)}>
                    {post.image_url ? <img src={post.image_url} alt="post" /> : <div className="grid-no-img"><span className="material-icons">article</span></div>}
                 </div>
              ))
           )}
        </div>
      </div>

      <div className={`p-sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <aside className={`p-sidebar-panel ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-search-container"><div className="sidebar-search"><span className="material-icons" style={{fontSize: '20px', color: '#8a8b91'}}>search</span><input type="text" placeholder="Cari..." /></div></div>
        <div className="menu-category-label">Dompet & Aset</div>
        <div className="menu-item-tiktok" onClick={() => navTo('/saldo')}><div className="icon-wrapper"><span className="material-icons">toll</span></div><div className="menu-text">Saldo HypeCoin</div><div className="arrow-right">›</div></div>
        <div className="menu-item-tiktok" onClick={() => navTo('/historycoin')}><div className="icon-wrapper"><span className="material-icons">receipt_long</span></div><div className="menu-text">Riwayat Transaksi</div><div className="arrow-right">›</div></div>
        <div className="menu-item-tiktok" onClick={() => navTo('/vip')}><div className="icon-wrapper" style={{color: '#f59e0b'}}><span className="material-icons">diamond</span></div><div className="menu-text">Langganan VIP</div><div className="arrow-right">›</div></div>
        <div className="menu-category-label">Alat Pribadi</div>
        <div className="menu-item-tiktok" onClick={() => navTo('/settings')}><div className="icon-wrapper"><span className="material-icons">settings</span></div><div className="menu-text">Pengaturan</div><div className="arrow-right">›</div></div>
        <div className="menu-item-tiktok" onClick={() => navTo('/contact')}><div className="icon-wrapper"><span className="material-icons">support_agent</span></div><div className="menu-text">Hubungi Kami</div><div className="arrow-right">›</div></div>
        <div className="menu-item-tiktok" onClick={handleShareProfile}><div className="icon-wrapper"><span className="material-icons">ios_share</span></div><div className="menu-text">Bagikan Profil</div><div className="arrow-right">›</div></div>
        <div className="menu-item-tiktok logout" onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}><div className="icon-wrapper"><span className="material-icons">power_settings_new</span></div><div className="menu-text">Keluar Akun</div></div>
      </aside>

      <div className={`p-sidebar-overlay ${isFollowModalOpen ? 'active' : ''}`} onClick={() => setIsFollowModalOpen(false)} />
      <aside className={`p-follow-sheet ${isFollowModalOpen ? 'open' : ''}`}>
        <div className="follow-sheet-header">
           <div className="drag-handle"></div>
           <h3>{followModalType === 'followers' ? 'Pengikut' : 'Mengikuti'}</h3>
           <span className="material-icons close-icon" onClick={() => setIsFollowModalOpen(false)}>close</span>
        </div>
        <div className="follow-sheet-body">
           {isFollowLoading ? (
              Array(5).fill(0).map((_, i) => <div key={i} className="follow-item-skeleton"><div className="skeleton-avatar"></div><div className="skeleton-text"></div></div>)
           ) : (
              followList.map(user => (
                 <div key={user.id} className="follow-item" onClick={() => { setIsFollowModalOpen(false); router.push(`/data?id=${user.id}`); }}>
                    <img src={user.avatar_url || '/asets/png/profile.webp'} alt="Avatar" />
                    <div className="follow-item-info">
                       <span className="follow-username">{user.username} <span dangerouslySetInnerHTML={{ __html: getUserBadge(user.role) }} /></span>
                       <span className="follow-handle">@{user.username.toLowerCase().replace(/\s/g, '')}</span>
                    </div>
                    <span className="material-icons" style={{color: '#8a8b91'}}>chevron_right</span>
                 </div>
              ))
           )}
        </div>
      </aside>

      {isMounted && (
        <div className={`prof-modal-overlay ${isEditModalOpen ? 'active' : ''}`} onClick={() => !isSaving && setIsEditModalOpen(false)}>
           <div className="prof-modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3>Edit Profil</h3><span className="material-icons close-btn" onClick={() => setIsEditModalOpen(false)}>close</span></div>
              <div className="avatar-edit-section">
                 <label className="main-preview-label">
                    <img src={previewUrl || '/asets/png/profile.webp'} className="avatar-main-preview" alt="Preview" /><div className="upload-overlay" onClick={() => fileInputRef.current?.click()}><span className="material-icons">camera_alt</span></div>
                 </label>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{display: 'none'}} />
                 <div className="avatar-presets">
                    {avatarPresets.map((src, i) => (
                       <img key={i} src={src} className={`preset-img ${previewUrl === src ? 'selected' : ''}`} onClick={() => { setEditData(prev => ({ ...prev, avatar_url: src })); setPreviewUrl(src); setSelectedFile(null); }} />
                    ))}
                 </div>
              </div>
              <div className="input-group"><label>Username</label><input type="text" value={editData.username} onChange={e => setEditData(prev => ({ ...prev, username: e.target.value }))} /></div>
              <div className="input-group"><label>Bio</label><textarea rows={2} value={editData.bio} onChange={e => setEditData(prev => ({ ...prev, bio: e.target.value }))} maxLength={150} /></div>
              <div className="input-group"><label>Tautan / Link</label><input type="text" placeholder="google.com atau instagram.com/user" value={editData.website} onChange={e => setEditData(prev => ({ ...prev, website: e.target.value }))} /></div>
              <button className="save-btn-premium" onClick={handleSaveSettings} disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
           </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() { return <Suspense fallback={null}><ProfileContent /></Suspense>; }
