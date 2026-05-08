'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import './DataProfile.css';

// 🔥 FIX 1: Update interface agar bisa nerima parameter 'name'
declare global {
  interface Window {
    openGlobalShare?: (url?: string, title?: string, text?: string, name?: string) => void;
  }
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

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
    } catch (err) { console.error(err); }
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
    } catch (err) { console.error(err); setPosts([]); } finally { setIsLoadingPosts(false); }
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
      const { data: idList } = await supabase.from('followers').select(targetCol).eq(matchCol, profile.id);

      if (idList && idList.length > 0) {
        const userIds = idList.map((item: any) => item[targetCol]);
        const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url, role').in('id', userIds);
        setFollowList(profilesData || []);
      }
    } catch (err) { console.error(err); } finally { setIsFollowLoading(false); }
  };

  // 🔥 FIX 2: Kirim profil username ke modal bagikan agar {{name}} berubah jadi nama asli
  const handleShareProfile = () => {
    const url = window.location.href;
    const title = `Profil ${profile?.username}`;
    
    setIsSidebarOpen(false);

    if (window.openGlobalShare) {
      // Kita kirim 'undefined' untuk text agar dia pakai default i18n, 
      // tapi kita kirim profile.username agar diolah jadi nama asli.
      window.openGlobalShare(url, title, undefined, profile?.username);
    } else {
      navigator.clipboard.writeText(url); 
      showNotif(t('link_copied', 'Link disalin!'), "success");
    }
  };

  const handleSaveSettings = async () => {
    if (!myId || !editData.username.trim()) return showNotif(t('username_empty', 'Username tidak boleh kosong'), "warning");
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
        username: editData.username, bio: editData.bio, avatar_url: finalAvatarUrl || profile.avatar_url, website: editData.website 
      }).eq("id", myId);
      showNotif(t('profile_updated', 'Profil diperbarui!'), "success");
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
        {isMe ? (
          <button className="header-btn" onClick={() => setIsSidebarOpen(true)}>
            <span className="material-icons">menu</span>
          </button>
        ) : (
          <button className="header-btn" onClick={() => router.push('/data')}>
            <span className="material-icons">arrow_back</span>
          </button>
        )}
      </header>

      <div className="profile-top-section">
        <section className="profile-info">
          <div className="avatar-container"><img className="profile-avatar" src={profile.avatar_url || '/asets/png/profile.webp'} alt="Avatar" /></div>
          <h1 className="profile-name">{profile.username} <span dangerouslySetInnerHTML={{ __html: getUserBadge(profile.role) }} /></h1>
          <p className="profile-username">@{profile.username.toLowerCase().replace(/\s/g, '')}</p>

          <div className="profile-stats">
            <div className="stat-box" onClick={() => handleOpenFollowModal('followers')} style={{cursor: 'pointer'}}><span className="stat-num">{stats.followers}</span><span className="stat-label">{t('followers', 'Pengikut')}</span></div>
            <div className="stat-box" onClick={() => handleOpenFollowModal('following')} style={{cursor: 'pointer'}}><span className="stat-num">{stats.following}</span><span className="stat-label">{t('following', 'Mengikuti')}</span></div>
            <div className="stat-box"><span className="stat-num">{stats.likes}</span><span className="stat-label">{t('likes', 'Suka')}</span></div>
          </div>

          <div className="profile-actions">
             {isMe ? (
                <>
                   <button className="btn-action btn-secondary" onClick={() => setIsEditModalOpen(true)}>{t('edit_profile', 'Edit Profil')}</button>
                   <button className="btn-action btn-secondary" onClick={handleShareProfile}>{t('share', 'Bagikan')}</button>
                </>
             ) : (
                <button className={`btn-action ${isFollowing ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleFollow}>{isFollowing ? t('following_btn', 'Mengikuti') : t('follow', 'Ikuti')}</button>
             )}
          </div>
          <p className="profile-bio">{profile.bio || t('no_bio', 'Belum ada bio')}</p>
          
          {profile.website && (
            <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
               target="_blank" rel="noopener noreferrer" 
               style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', color: '#8e8e8e', fontWeight: '500', marginTop: '4px', textDecoration: 'none' }}>
               <span className="material-icons" style={{ fontSize: '12px' }}>link</span>
               {profile.website.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          )}
        </section>

        <div className="profile-tabs">
           <div className={`profile-tab-item ${activeTab === 'post' ? 'active' : ''}`} onClick={() => setActiveTab('post')}>{t('tab_post', 'Karya')}</div>
           <div className={`profile-tab-item ${activeTab === 'simpan' ? 'active' : ''}`} onClick={() => setActiveTab('simpan')}>{t('tab_saved', 'Tersimpan')}</div>
           <div className={`profile-tab-item ${activeTab === 'repost' ? 'active' : ''}`} onClick={() => setActiveTab('repost')}>{t('tab_repost', 'Repost')}</div>
           <div className={`profile-tab-item ${activeTab === 'like' ? 'active' : ''}`} onClick={() => setActiveTab('like')}>{t('tab_like', 'Disukai')}</div>
        </div>
      </div>

      <div className="post-grid-container">
        <div className="post-grid">
           {isLoadingPosts ? (
              Array(9).fill(0).map((_, i) => <div key={i} className="skeleton-grid-item"></div>)
           ) : posts.length === 0 ? (
              <div className="no-posts-v2">
                <div className="no-posts-icon-circle"><span className="material-icons">auto_awesome</span></div>
                <h3>{t('no_posts', 'Belum ada postingan')}</h3>
                {isMe && <button className="btn-action btn-primary" onClick={() => router.push('/')}>{t('create_post', 'Buat Postingan')}</button>}
              </div>
           ) : (
              posts.map(post => (
                 <div key={post.id} className="grid-item" style={{ cursor: 'pointer' }} onClick={() => router.push(`/post?id=${post.id}`)}>
                    {post.image_url ? <img src={post.image_url} alt="post" /> : <div className="grid-no-img"><span className="material-icons">article</span></div>}
                 </div>
              ))
           )}
        </div>
      </div>

      {isMe && (
        <>
          <div className={`p-sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />
          <aside className={`p-sidebar-panel ${isSidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-search-container"><div className="sidebar-search"><span className="material-icons" style={{fontSize: '20px', color: '#8a8b91'}}>search</span><input type="text" placeholder={t('search_placeholder', 'Cari...')} /></div></div>
            <div className="menu-category-label">{t('wallet_assets', 'Aset Dompet')}</div>
            <div className="menu-item-tiktok" onClick={() => navTo('/saldo')}><div className="icon-wrapper"><span className="material-icons">toll</span></div><div className="menu-text">{t('hypecoin_balance', 'Saldo Hypecoin')}</div><div className="arrow-right">›</div></div>
            <div className="menu-item-tiktok" onClick={() => navTo('/historycoin')}><div className="icon-wrapper"><span className="material-icons">receipt_long</span></div><div className="menu-text">{t('transaction_history', 'Riwayat Transaksi')}</div><div className="arrow-right">›</div></div>
            <div className="menu-item-tiktok" onClick={() => navTo('/vip')}><div className="icon-wrapper" style={{color: '#f59e0b'}}><span className="material-icons">diamond</span></div><div className="menu-text">{t('vip_subscription', 'Langganan VIP')}</div><div className="arrow-right">›</div></div>
            
            <div className="menu-category-label">{t('mission_rewards', 'Misi & Hadiah')}</div>
            <div className="menu-item-tiktok" onClick={() => navTo('/dailycek')}><div className="icon-wrapper" style={{color: '#f59e0b'}}><span className="material-icons">emoji_events</span></div><div className="menu-text">{t('mission_center', 'Pusat Misi')}</div><div className="arrow-right">›</div></div>
            
            <hr className="menu-divider" />
            <div className="menu-category-label">{t('personal_tools', 'Alat Pribadi')}</div>
            <div className="menu-item-tiktok" onClick={() => navTo('/settings')}><div className="icon-wrapper"><span className="material-icons">settings</span></div><div className="menu-text">{t('settings', 'Pengaturan')}</div><div className="arrow-right">›</div></div>
            <div className="menu-item-tiktok" onClick={() => navTo('/contact')}><div className="icon-wrapper"><span className="material-icons">support_agent</span></div><div className="menu-text">{t('contact_us', 'Hubungi Kami')}</div><div className="arrow-right">›</div></div>
            
            <div className="menu-item-tiktok" onClick={handleShareProfile}><div className="icon-wrapper"><span className="material-icons">ios_share</span></div><div className="menu-text">{t('share_profile', 'Bagikan Profil')}</div><div className="arrow-right">›</div></div>
            
            <div className="menu-item-tiktok logout" onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}><div className="icon-wrapper"><span className="material-icons">power_settings_new</span></div><div className="menu-text">{t('logout', 'Keluar')}</div></div>
          </aside>
        </>
      )}

      <div className={`p-sidebar-overlay ${isFollowModalOpen ? 'active' : ''}`} onClick={() => setIsFollowModalOpen(false)} />
      <aside className={`p-follow-sheet ${isFollowModalOpen ? 'open' : ''}`}>
        <div className="follow-sheet-header">
           <div className="drag-handle"></div>
           <h3>{followModalType === 'followers' ? t('followers', 'Pengikut') : t('following', 'Mengikuti')}</h3>
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

      {isMounted && isMe && (
        <div className={`prof-modal-overlay ${isEditModalOpen ? 'active' : ''}`} onClick={() => !isSaving && setIsEditModalOpen(false)}>
           <div className="prof-modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{t('edit_profile_modal', 'Edit Profil')}</h3>
                <span className="material-icons close-btn" onClick={() => setIsEditModalOpen(false)}>close</span>
              </div>
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
              <div className="input-group">
                <label>{t('username_label', 'Username')}</label>
                <input type="text" value={editData.username} onChange={e => setEditData(prev => ({ ...prev, username: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>{t('bio_label', 'Bio')}</label>
                <textarea rows={2} value={editData.bio} onChange={e => setEditData(prev => ({ ...prev, bio: e.target.value }))} maxLength={150} />
              </div>
              <div className="input-group">
                <label>{t('link_label', 'Tautan / Website')}</label>
                <input type="text" placeholder="google.com" value={editData.website} onChange={e => setEditData(prev => ({ ...prev, website: e.target.value }))} />
              </div>
              <button className="save-btn-premium" onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? t('saving', 'Menyimpan...') : t('save_changes', 'Simpan Perubahan')}
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() { return <Suspense fallback={null}><ProfileContent /></Suspense>; }
