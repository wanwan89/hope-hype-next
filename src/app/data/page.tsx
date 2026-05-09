'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import './DataProfile.css';

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

  // ==========================================
  // 🔥 1. STATE MANAGEMENT 🔥
  // ==========================================
  const [isMounted, setIsMounted] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, likes: 0 });
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasStory, setHasStory] = useState(false); 
  const [storyIdToGo, setStoryIdToGo] = useState<string | null>(null); // 🔥 TAMBAHIN INI

  const [blockStatus, setBlockStatus] = useState<'none' | 'blocked_by_me' | 'blocking_me'>('none');
  
  const [activeTab, setActiveTab] = useState<'post' | 'like' | 'repost' | 'simpan'>('post');
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  // Modals & Sheets
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const [followList, setFollowList] = useState<any[]>([]);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Form Edit
  const [editData, setEditData] = useState({ username: '', bio: '', avatar_url: '', website: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const avatarPresets = [
    '/asets/png/avatar1.png', '/asets/png/avatar2.png',
    '/asets/png/avatar3.png', '/asets/png/avatar4.png'
  ];

  // ==========================================
  // 🔥 2. LIFECYCLE & DATA FETCHING 🔥
  // ==========================================
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsEditModalOpen(false);
      setIsSidebarOpen(false);
      setIsActionSheetOpen(false);
    };
  }, []);

  useEffect(() => { 
    if (isMounted) loadProfile(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlId, urlUser, isMounted]);

  useEffect(() => { 
    if (profile && isMounted && blockStatus === 'none') {
      if (profile.is_private && myId !== profile.id && !isFollowing) {
        setPosts([]); 
      } else {
        loadPostsTab(activeTab); 
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, profile, isMounted, blockStatus, isFollowing]);

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

    // Cek Status Blokir
    if (currentUserId && currentUserId !== profData.id) {
      const { data: myBlock } = await supabase.from('blocked_users').select('id').match({ blocker_id: currentUserId, blocked_id: profData.id }).maybeSingle();
      if (myBlock) setBlockStatus('blocked_by_me');

      const { data: theirBlock } = await supabase.from('blocked_users').select('id').match({ blocker_id: profData.id, blocked_id: currentUserId }).maybeSingle();
      if (theirBlock) setBlockStatus('blocking_me');
    }

    setProfile(profData);
    setEditData({
      username: profData.username || '',
      bio: profData.bio || '',
      avatar_url: profData.avatar_url || '',
      website: profData.website || ''
    });
    setPreviewUrl(profData.avatar_url || '/asets/png/profile.webp');
    
    // 🔥 FIX: LOGIKA CEK STORY (SIMPEL & NANGKAP ID STORY) 🔥
    const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: stories } = await supabase
      .from('stories')
      .select('id')
      .eq('creator_id', profData.id) 
      .gte('created_at', timeLimit)
      .order('created_at', { ascending: true }) // Ambil story yang paling awal
      .limit(1);

    // Kalau ada story, simpan status dan ID-nya!
    if (stories && stories.length > 0) {
      setHasStory(true);
      setStoryIdToGo(String(stories[0].id)); // 🔥 Simpan ID Story-nya di sini
    } else {
      setHasStory(false);
      setStoryIdToGo(null);
    }

    // Update stats kalau tidak diblokir
    if (blockStatus === 'none') {
      updateStats(profData.id, currentUserId);
    }

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
  const { data, error } = await supabase
    .from('posts')
    .select('id, image_url')
    .eq('creator_id', profile.id) // Pakai kolom creator_id sesuai tabel lu
    .eq('status', 'approved')    // 🔥 WAJIB: Cuma yang sudah di-ACC
    .order('created_at', { ascending: false });
  
  if (data && !error) setPosts(data);
}

      else {
        let tableName = '';
        if (type === 'simpan') tableName = 'bookmarks';
        else if (type === 'repost') tableName = 'reposts';
        else if (type === 'like') tableName = 'likes';

        if (tableName) {
          const { data: relData, error: relError } = await supabase
            .from(tableName)
            .select('post_id')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false });

          if (relData && relData.length > 0 && !relError) {
            const postIds = relData.map((r: any) => r.post_id).filter(Boolean);
            
            if (postIds.length > 0) {
              const { data: pData, error: pError } = await supabase
                .from('posts')
                .select('id, image_url')
                .in('id', postIds)
                .order('created_at', { ascending: false });
              
              if (pData && !pError) setPosts(pData);
            }
          }
        }
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsLoadingPosts(false); 
    }
  };

  // ==========================================
  // 🔥 3. EVENT HANDLERS 🔥
  // ==========================================
  
const handleOpenPost = (postId: string) => {
  if (!postId) return;
  // Ini bakal ngirim ?id=123#post-123 ke halaman gallery
  router.push(`/post?id=${postId}#post-${postId}`);
};


const handleAvatarClick = () => {
  if (hasStory && storyIdToGo) {
    // 🔥 Dia bakal loncat ke /story/24 (misalnya ID story-nya 24)
    router.push(`/story/${storyIdToGo}`); 
  } else {
    showNotif("Belum ada story terbaru", "info");
  }
};

  // 🔥 FUNGSI NAVIGASI CHAT 🔥
  const handleGoToChat = () => {
    if (!profile?.id) return;
    router.push(`/hypetalk/chat?from=${profile.id}`);
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

  const handleShareProfile = () => {
    const url = window.location.href;
    const title = `Profil ${profile?.username}`;
    setIsSidebarOpen(false);
    if (window.openGlobalShare) {
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

  const handleReportUser = () => {
    setIsActionSheetOpen(false);
    showNotif('Laporan telah dikirim untuk ditinjau.', 'info');
  };

  const handleBlockUser = async () => {
    if (!myId || !profile) return;
    if (confirm(`Yakin ingin memblokir ${profile.username}?`)) {
      try {
        setIsActionSheetOpen(false);
        await supabase.from('followers').delete().match({ follower_id: myId, following_id: profile.id });
        await supabase.from('followers').delete().match({ follower_id: profile.id, following_id: myId });
        await supabase.from('blocked_users').insert([{ blocker_id: myId, blocked_id: profile.id }]);
        
        showNotif('Pengguna berhasil diblokir.', 'success');
        setBlockStatus('blocked_by_me');
      } catch (e: any) { showNotif(e.message, 'error'); }
    }
  };

  const handleUnblockUser = async () => {
    if (!myId || !profile) return;
    try {
      await supabase.from('blocked_users').delete().match({ blocker_id: myId, blocked_id: profile.id });
      showNotif('Blokir dibuka.', 'success');
      setBlockStatus('none');
      loadProfile(); 
    } catch (e: any) { showNotif(e.message, 'error'); }
  };

  const navTo = (path: string) => { setIsSidebarOpen(false); router.push(path); };

  // ==========================================
  // 🔥 4. RENDER UI 🔥
  // ==========================================
  if (!isMounted || !profile) return <div className="profile-page-container" style={{ backgroundColor: 'var(--bg-main)' }}></div>;

  const isMe = myId === profile.id;

  // --- BLOKIR UI ---
  if (blockStatus === 'blocking_me') {
    return (
      <div className="profile-page-container" style={{ position: 'fixed', inset: 0, overflow: 'hidden', touchAction: 'none' }}>
        <header className="profile-header">
          <button className="header-btn" onClick={() => router.back()}><span className="material-icons">arrow_back</span></button>
        </header>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'}}>
          <span className="material-icons" style={{fontSize: '60px', opacity: 0.5}}>no_accounts</span>
          <h3 style={{marginTop: '10px'}}>Pengguna Tidak Ditemukan</h3>
        </div>
      </div>
    );
  }

  if (blockStatus === 'blocked_by_me') {
    return (
      <div className="profile-page-container" style={{ position: 'fixed', inset: 0, overflow: 'hidden', touchAction: 'none' }}>
        <header className="profile-header">
          <button className="header-btn" onClick={() => router.back()}><span className="material-icons">arrow_back</span></button>
          <h2>{profile.username}</h2>
          <div style={{width: '24px'}}></div>
        </header>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center'}}>
          <span className="material-icons" style={{fontSize: '60px', color: '#ef4444'}}>block</span>
          <h3 style={{color: 'var(--text-dark)', marginTop: '10px'}}>Anda Memblokir Pengguna Ini</h3>
          <p style={{color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px'}}>Anda tidak akan melihat postingan atau menerima pesan dari mereka.</p>
          <button onClick={handleUnblockUser} style={{background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-dark)', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold'}}>Buka Blokir</button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      
      <style>{`
        .avatar-container {
          margin: 0 auto 12px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .story-ring, .normal-ring {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
        }

        .story-ring {
          background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
          animation: pulseStory 2s infinite alternate;
        }
        
        .normal-ring {
          border: 2px solid var(--border-color);
          background: transparent;
        }

        .profile-avatar-img {
          width: 82px;
          height: 82px;
          border-radius: 50%;
          object-fit: cover;
          border: 3.5px solid var(--bg-main);
          background: var(--bg-secondary);
        }

        @keyframes pulseStory {
          0% { filter: brightness(1); }
          100% { filter: brightness(1.2); }
        }

        .edit-avatar-preview {
          width: 95px;
          height: 95px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--primary-blue);
          cursor: pointer;
          margin-bottom: 15px;
          background: var(--bg-secondary);
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
      `}</style>

      <header className="profile-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px' }}>
        
        {/* KIRI: Tombol Kembali (Hanya muncul kalau lagi liat profil orang) */}
        {!isMe ? (
          <button className="header-btn" onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex' }}>
            <span className="material-icons">arrow_back</span>
          </button>
        ) : (
          <div style={{ width: '24px' }}></div> /* Spacer biar seimbang */
        )}

        {/* TENGAH: Username */}
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-main)' }}>
          Hii {profile.username}
          {profile.is_private && <span className="material-icons" style={{fontSize: '14px', color: 'var(--text-secondary)'}}>lock</span>}
        </h2>

        {/* KANAN: Tombol Menu (Hanya muncul di profil sendiri) */}
        {isMe ? (
          <button className="header-btn" onClick={() => setIsSidebarOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex' }}>
            <span className="material-icons">menu</span>
          </button>
        ) : (
          <div style={{ width: '24px' }}></div> /* Spacer biar seimbang */
        )}

      </header>

      <div className="profile-top-section">
        <section className="profile-info">
          
          <div className="avatar-container">
<div 
  className={`avatar-ring ${hasStory ? 'has-story' : 'normal-ring'}`} 
  onClick={handleAvatarClick}
  style={{ cursor: hasStory ? 'pointer' : 'default' }}
>

              <img className="profile-avatar-img" src={profile.avatar_url || '/asets/png/profile.webp'} alt="Avatar" />
            </div>
          </div>
          
          <h1 className="profile-name">{profile.username} <span dangerouslySetInnerHTML={{ __html: getUserBadge(profile.role) }} /></h1>
          <p className="profile-username">@{profile.username.toLowerCase().replace(/\s/g, '')}</p>

          <div className="profile-stats">
            <div className="stat-box" onClick={() => handleOpenFollowModal('followers')}><span className="stat-num">{stats.followers}</span><span className="stat-label">{t('followers', 'Pengikut')}</span></div>
            <div className="stat-box" onClick={() => handleOpenFollowModal('following')}><span className="stat-num">{stats.following}</span><span className="stat-label">{t('following', 'Mengikuti')}</span></div>
            <div className="stat-box"><span className="stat-num">{stats.likes}</span><span className="stat-label">{t('likes', 'Suka')}</span></div>
          </div>

          <div className="profile-actions">
             {isMe ? (
                <>
                   <button className="btn-action btn-secondary" onClick={() => setIsEditModalOpen(true)}>{t('edit_profile', 'Edit Profil')}</button>
                   <button className="btn-action btn-secondary" onClick={handleShareProfile}>{t('share', 'Bagikan')}</button>
                </>
             ) : (
                <>
                  {/* 🔥 FIX 1: TOMBOL CHAT DITAMBAHKAN DI SINI 🔥 */}
                  <button className="btn-action btn-secondary" onClick={handleGoToChat}>
                    <span className="material-icons" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '4px' }}>chat</span>
                    Chat
                  </button>
                  <button className={`btn-action ${isFollowing ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleFollow}>{isFollowing ? t('following_btn', 'Mengikuti') : t('follow', 'Ikuti')}</button>
                  <button className="btn-action btn-secondary" onClick={() => setIsActionSheetOpen(true)} style={{ padding: '8px 12px' }}>
                    <span className="material-icons" style={{ fontSize: '18px' }}>more_horiz</span>
                  </button>
                </>
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

        {(!profile.is_private || isMe || isFollowing) && (
          <div className="profile-tabs">
            <div className={`profile-tab-item ${activeTab === 'post' ? 'active' : ''}`} onClick={() => setActiveTab('post')}>{t('tab_post', 'Karya')}</div>
            <div className={`profile-tab-item ${activeTab === 'like' ? 'active' : ''}`} onClick={() => setActiveTab('like')}>{t('tab_like', 'Suka')}</div>
            <div className={`profile-tab-item ${activeTab === 'repost' ? 'active' : ''}`} onClick={() => setActiveTab('repost')}>{t('tab_repost', 'Repost')}</div>
            <div className={`profile-tab-item ${activeTab === 'simpan' ? 'active' : ''}`} onClick={() => setActiveTab('simpan')}>{t('tab_saved', 'Simpan')}</div>
          </div>
        )}
      </div>

      <div className="post-grid-container">
        <div className="post-grid">
           {isLoadingPosts ? (
              Array(9).fill(0).map((_, i) => <div key={i} className="skeleton-grid-item"></div>)
           ) : profile.is_private && !isFollowing && !isMe ? (
              <div className="no-posts-v2">
                <div className="no-posts-icon-circle"><span className="material-icons">lock</span></div>
                <h3>Akun Private</h3>
                <p>Ikuti akun ini untuk melihat postingan dan karya mereka.</p>
              </div>
           ) : posts.length === 0 ? (
              <div className="no-posts-v2">
                <div className="no-posts-icon-circle"><span className="material-icons">auto_awesome</span></div>
                <h3>{t('no_posts', 'Belum ada postingan')}</h3>
                {isMe && activeTab === 'post' && <button className="btn-action btn-primary" onClick={() => router.push('/')}>{t('create_post', 'Buat Postingan')}</button>}
              </div>
           ) : (
posts.map(post => {
   // 🔥 LOGIKA FIX: Pecah string URL, ambil foto pertama buat thumbnail
   const allImages = post.image_url ? post.image_url.split(',') : [];
   const thumbUrl = allImages.length > 0 ? allImages[0].trim() : null;

   return (
      <div 
        key={post.id} 
        className="grid-item" 
        style={{ cursor: 'pointer', position: 'relative' }} 
        onClick={() => handleOpenPost(post.id)}
      >
         {thumbUrl ? (
            <>
              <img src={thumbUrl} alt="post" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* Tambahin icon tumpukan kalau fotonya lebih dari 1 biar keren */}
              {allImages.length > 1 && (
                <span className="material-icons" style={{ position: 'absolute', top: '8px', right: '8px', color: 'white', fontSize: '18px', textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>
                  filter_none
                </span>
              )}
            </>
         ) : (
            <div className="grid-no-img">
               <span className="material-icons">article</span>
            </div>
         )}
      </div>
   );
})

           )}
        </div>
      </div>

      {/* --- SIDEBAR MENU (Khusus Pemilik Akun) --- */}
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

      {/* --- MODAL EDIT PROFIL --- */}
      <div className={`p-sidebar-overlay ${isEditModalOpen ? 'active' : ''}`} onClick={() => setIsEditModalOpen(false)} />
      <aside className={`p-follow-sheet ${isEditModalOpen ? 'open' : ''}`} style={{height: 'auto', maxHeight: '90dvh', paddingBottom: '30px'}}>
         <div className="follow-sheet-header">
            <div className="drag-handle"></div>
            <h3>{t('edit_profile_modal', 'Edit Profil')}</h3>
            <span className="material-icons close-icon" onClick={() => setIsEditModalOpen(false)}>close</span>
         </div>
         <div className="follow-sheet-body" style={{padding: '0 20px'}}>
            
            <div className="edit-avatar-section">
               <div className="edit-avatar-wrapper" onClick={() => fileInputRef.current?.click()}>
                 <img src={previewUrl || '/asets/png/profile.webp'} alt="Avatar" className="edit-avatar-preview" />
                 <div className="upload-badge"><span className="material-icons">camera_alt</span></div>
               </div>
               <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
               <div className="avatar-presets">
                  {avatarPresets.map((url, i) => (
                     <img key={i} src={url} alt={`preset-${i}`} className={`preset-img ${previewUrl === url ? 'selected' : ''}`} onClick={() => { setEditData({...editData, avatar_url: url}); setPreviewUrl(url); setSelectedFile(null); }} />
                  ))}
               </div>
            </div>
            
            <div className="edit-form-group">
               <label>{t('username_label', 'Username')}</label>
               <input type="text" value={editData.username} onChange={e => setEditData({...editData, username: e.target.value.toLowerCase().replace(/\s/g, '')})} placeholder="Gunakan huruf kecil" />
            </div>
            
            <div className="edit-form-group">
               <label>{t('bio_label', 'Bio')}</label>
               <textarea value={editData.bio} onChange={e => setEditData({...editData, bio: e.target.value})} placeholder="Tulis sesuatu tentangmu..." rows={3} />
            </div>
            
            <div className="edit-form-group">
               <label>{t('link_label', 'Tautan / Website')}</label>
               <input type="text" value={editData.website} onChange={e => setEditData({...editData, website: e.target.value})} placeholder="misal: instagram.com/hope" />
            </div>

            <button className="btn-save-profile" onClick={handleSaveSettings} disabled={isSaving}>
               {isSaving ? t('saving', 'Menyimpan...') : t('save_changes', 'Simpan Perubahan')}
            </button>
         </div>
      </aside>

      {/* --- MODAL FOLLOWERS / FOLLOWING --- */}
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

      {/* --- ACTION SHEET (LAPORKAN / BLOKIR) --- */}
      <div className={`p-sidebar-overlay ${isActionSheetOpen ? 'active' : ''}`} onClick={() => setIsActionSheetOpen(false)} />
      <aside className={`p-follow-sheet ${isActionSheetOpen ? 'open' : ''}`} style={{ height: 'auto', paddingBottom: '30px' }}>
        <div className="follow-sheet-header">
           <div className="drag-handle"></div>
           <h3>Tindakan</h3>
           <span className="material-icons close-icon" onClick={() => setIsActionSheetOpen(false)}>close</span>
        </div>
        <div className="follow-sheet-body" style={{ padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
           <button onClick={handleReportUser} style={{ width: '100%', padding: '16px', background: 'var(--bg-secondary)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer' }}>
             Laporkan Pengguna
           </button>
           <button onClick={handleBlockUser} style={{ width: '100%', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, color: '#ef4444', cursor: 'pointer' }}>
             Blokir Pengguna
           </button>
        </div>
      </aside>

    </div>
  );
}

export default function ProfilePage() { 
  return (
    <Suspense 
      fallback={
        <div style={{ height: '100dvh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #01070A)' }}>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  ); 
}
