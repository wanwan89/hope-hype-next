'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge, showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import Lottie from 'lottie-react';
import playAnimation from '@/assets/lottie/play.json'; 
import { motion, AnimatePresence } from 'framer-motion'; 

// 🔥 GANTI: Import RefreshableWrapper langsung ke sini
import RefreshableWrapper from '@/components/RefreshableWrapper';

// Import komponen anak
import ProfileHeader from './ProfileHeader';
import ProfileInfo from './ProfileInfo';
import ProfileTabs from './ProfileTabs';
import PostGrid from './PostGrid';
import EditProfileModal from './EditProfileModal';
import FollowModal from './FollowModal';
import ActionSheet from './ActionSheet';
import SidebarMenu from './SidebarMenu';

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
  // 🔥 STATE MANAGEMENT 🔥
  // ==========================================
  const [isMounted, setIsMounted] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false); 
  const [authText, setAuthText] = useState('Login'); 
  const [myId, setMyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, likes: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [hasStory, setHasStory] = useState(false);
  const [storyIdToGo, setStoryIdToGo] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState<'none' | 'blocked_by_me' | 'blocking_me'>('none');
  const [activeTab, setActiveTab] = useState<'post' | 'private' | 'like' | 'repost' | 'simpan'>('post');
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const [followList, setFollowList] = useState<any[]>([]);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [editData, setEditData] = useState({ full_name: '', username: '', bio: '', avatar_url: '', website: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ==========================================
  // 🔥 REFRESH LOGIC 🔥
  // ==========================================
  const refetch = async () => {
    try {
      // Ambil data profil terbaru dan postingan pada tab aktif secara paralel
      await Promise.all([
        loadProfile(true),
        loadPostsTab(activeTab, true)
      ]);
    } catch (error) {
      console.error("Gagal melakukan refresh data:", error);
    }
  };

  // ==========================================
  // 🔥 LIFECYCLE & DATA FETCHING 🔥
  // ==========================================
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsEditModalOpen(false);
      setIsSidebarOpen(false);
      setIsActionSheetOpen(false);
      setIsFollowModalOpen(false);
    };
  }, []);

  useEffect(() => {
    if (needsLogin) {
      const interval = setInterval(() => {
        setAuthText((prev) => (prev === 'Login' ? 'Sign Up' : 'Login'));
      }, 3000); 
      return () => clearInterval(interval);
    }
  }, [needsLogin]);

  useEffect(() => {
    let isComponentActive = true;
    const initLoad = async () => {
      if (isMounted) await loadProfile(isComponentActive);
    };
    initLoad();
    return () => { isComponentActive = false; };
  }, [urlId, urlUser, isMounted]);

  useEffect(() => {
    let isComponentActive = true;
    if (profile && isMounted && blockStatus === 'none') {
      const isMutual = isFollowing && isFollowedBy;
      if (profile.is_private && myId !== profile.id && !isMutual) {
        if (isComponentActive) setPosts([]);
      } else {
        loadPostsTab(activeTab, isComponentActive);
      }
    }
    return () => { isComponentActive = false; };
  }, [activeTab, profile, isMounted, blockStatus, isFollowing, isFollowedBy]);

  const loadProfile = async (isComponentActive: boolean = true) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;
      if (!isComponentActive) return;
      setMyId(currentUserId);

      let query = supabase.from('profiles').select('*');
      if (urlId) query = query.eq('id', urlId);
      else if (urlUser) query = query.eq('username', urlUser);
      else if (currentUserId) query = query.eq('id', currentUserId);
      else {
        if (isComponentActive) setNeedsLogin(true);
        return; 
      }

      const { data: profData, error } = await query.single();
      if (error || !profData) return;
      if (!isComponentActive) return;

      if (currentUserId && currentUserId !== profData.id) {
        const { data: myBlock } = await supabase
          .from('blocked_users')
          .select('id')
          .match({ blocker_id: currentUserId, blocked_id: profData.id })
          .maybeSingle();
        if (myBlock && isComponentActive) setBlockStatus('blocked_by_me');

        const { data: theirBlock } = await supabase
          .from('blocked_users')
          .select('id')
          .match({ blocker_id: profData.id, blocked_id: currentUserId })
          .maybeSingle();
        if (theirBlock && isComponentActive) setBlockStatus('blocking_me');
      }

      if (isComponentActive) {
        setProfile(profData);
        setEditData({
          full_name: profData.full_name || '',
          username: profData.username || '',
          bio: profData.bio || '',
          avatar_url: profData.avatar_url || '',
          website: profData.website || ''
        });
        setPreviewUrl(profData.avatar_url || '/asets/png/profile.webp');
      }

      const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: stories } = await supabase
        .from('stories')
        .select('id')
        .eq('creator_id', profData.id)
        .gte('created_at', timeLimit)
        .order('created_at', { ascending: true })
        .limit(1);

      if (isComponentActive) {
        if (stories && stories.length > 0) {
          setHasStory(true);
          setStoryIdToGo(String(stories[0].id));
        } else {
          setHasStory(false);
          setStoryIdToGo(null);
        }
      }

      if (blockStatus === 'none') {
        updateStats(profData.id, currentUserId, isComponentActive);
      }
    } catch (err) {
      console.error("Load Profile Error:", err);
    }
  };

  const updateStats = async (targetId: string, currentUserId: string | null, isComponentActive: boolean) => {
    try {
      const { count: fers } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetId);
      const { count: fing } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetId);

      const { data: myPosts } = await supabase.from('posts').select('id').eq('creator_id', targetId);
      let totalLikes = 0;
      if (myPosts && myPosts.length > 0) {
        const { count: lks } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', myPosts.map(p => p.id));
        totalLikes = lks || 0;
      }

      if (isComponentActive) {
        setStats({ followers: fers || 0, following: fing || 0, likes: totalLikes });
      }

      if (currentUserId && currentUserId !== targetId) {
        const { data: isF } = await supabase
          .from('followers')
          .select('id')
          .match({ follower_id: currentUserId, following_id: targetId })
          .maybeSingle();
        if (isComponentActive) setIsFollowing(!!isF);

        const { data: isFB } = await supabase
          .from('followers')
          .select('id')
          .match({ follower_id: targetId, following_id: currentUserId })
          .maybeSingle();
        if (isComponentActive) setIsFollowedBy(!!isFB);
      }
    } catch (e) {
      console.error("Stats Error:", e);
    }
  };

  const loadPostsTab = async (type: string, isComponentActive: boolean = true) => {
    if (!profile) return;
    const isMe = myId === profile.id;

    if (type === 'like' && !isMe && profile.hide_likes) {
      if (isComponentActive) { setPosts([]); setIsLoadingPosts(false); }
      return;
    }
    if (type === 'repost' && !isMe && profile.hide_reposts) {
      if (isComponentActive) { setPosts([]); setIsLoadingPosts(false); }
      return;
    }

    if (isComponentActive) {
      setIsLoadingPosts(true);
      setPosts([]);
    }

    try {
      if (type === 'post') {
        if (isMe) {
          const { data: drafts } = await supabase
            .from('posts')
            .select('id, image_url, video_url, views, status, is_pinned')
            .eq('creator_id', profile.id)
            .eq('status', 'draft')
            .order('created_at', { ascending: false });
          const { data: approveds } = await supabase
            .from('posts')
            .select('id, image_url, video_url, views, status, is_pinned')
            .eq('creator_id', profile.id)
            .eq('status', 'approved')
            .eq('is_private', false)
            .order('created_at', { ascending: false });
          if (isComponentActive) setPosts([...(drafts || []), ...(approveds || [])]);
        } else {
          const { data, error } = await supabase
            .from('posts')
            .select('id, image_url, video_url, views, status, is_pinned')
            .eq('creator_id', profile.id)
            .eq('status', 'approved')
            .eq('is_private', false)
            .order('created_at', { ascending: false });
          if (data && !error && isComponentActive) setPosts(data);
        }
      } else if (type === 'private') {
        const { data, error } = await supabase
          .from('posts')
          .select('id, image_url, video_url, views, status, is_pinned')
          .eq('creator_id', profile.id)
          .eq('is_private', true)
          .order('created_at', { ascending: false });
        if (data && !error && isComponentActive) setPosts(data);
      } else {
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
                .select('id, image_url, video_url, views, status, is_pinned')
                .in('id', postIds)
                .order('created_at', { ascending: false });
              if (pData && !pError && isComponentActive) setPosts(pData);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isComponentActive) setIsLoadingPosts(false);
    }
  };

  // ==========================================
  // 🔥 EVENT HANDLERS 🔥
  // ==========================================
  const handlePostClick = (postId: string, status: string) => {
    if (!postId) return;
    if (status === 'draft') {
      router.push(`/create?draft_id=${postId}`);
    } else {
      router.push(`/post?creator_id=${profile?.id}&id=${postId}#post-${postId}`);
    }
  };

  const handleAvatarClick = () => {
    if (hasStory && storyIdToGo) {
      router.push(`/story/view?id=${storyIdToGo}`);
    } else {
      showNotif("Belum ada story terbaru", "info");
    }
  };

  const handleGoToChat = () => {
    if (!profile?.id) return;
    router.push(`/hypetalk/room?from=${profile.id}`);
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
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, role')
          .in('id', userIds);
        setFollowList(profilesData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFollowLoading(false);
    }
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
        full_name: editData.full_name,
        username: editData.username,
        bio: editData.bio,
        avatar_url: finalAvatarUrl || profile.avatar_url,
        website: editData.website
      }).eq("id", myId);
      showNotif(t('profile_updated', 'Profil diperbarui!'), "success");
      setIsEditModalOpen(false);
      setTimeout(() => location.reload(), 800);
    } catch (err: any) {
      showNotif(err.message, "error");
    } finally {
      setIsSaving(false);
    }
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
      } catch (e: any) {
        showNotif(e.message, 'error');
      }
    }
  };

  const handleUnblockUser = async () => {
    if (!myId || !profile) return;
    try {
      await supabase.from('blocked_users').delete().match({ blocker_id: myId, blocked_id: profile.id });
      showNotif('Blokir dibuka.', 'success');
      setBlockStatus('none');
      loadProfile(true);
    } catch (e: any) {
      showNotif(e.message, 'error');
    }
  };

  // ==========================================
  // 🔥 RENDER 🔥
  // ==========================================

  if (needsLogin) {
    return (
      <div className="profile-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '20px', background: 'var(--bg-main)' }}>
        <div style={{ width: '250px', marginBottom: '24px' }}>
          <Lottie animationData={playAnimation} loop={true} />
        </div>
        <button
          onClick={() => router.push('/login')} 
          style={{
            width: '100%',
            maxWidth: '280px',
            background: '#1f3cff',
            color: 'white',
            border: 'none',
            padding: '14px 0',
            borderRadius: '14px',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer',
            transition: 'background 0.2s',
            overflow: 'hidden', 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={authText}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'inline-block' }}
            >
              {authText}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    );
  }

  if (!isMounted || !profile) return <div className="profile-page-container" style={{ backgroundColor: 'var(--bg-main)' }}></div>;

  const isMe = myId === profile.id;
  const isMutual = isFollowing && isFollowedBy;

  if (blockStatus === 'blocking_me') {
    return (
      <div className="profile-page-container" style={{ position: 'fixed', inset: 0, overflow: 'hidden', touchAction: 'none' }}>
        <ProfileHeader isMe={isMe} username={profile.username} isPrivate={profile.is_private} onBack={() => router.back()} onMenuClick={() => {}} />
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
        <ProfileHeader isMe={isMe} username={profile.username} isPrivate={profile.is_private} onBack={() => router.back()} onMenuClick={() => {}} />
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
    <div className={`profile-page-container ${isEditModalOpen || isFollowModalOpen ? 'noscroll' : ''}`}>
      <style>{`
        .avatar-container { margin: 0 auto 12px; display: flex; justify-content: center; align-items: center; }
        .story-ring, .normal-ring { width: 90px; height: 90px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; }
        .story-ring { background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); animation: pulseStory 2s infinite alternate; }
        .normal-ring { border: 2px solid var(--border-color); background: transparent; }
        .profile-avatar-img { width: 82px; height: 82px; border-radius: 50%; object-fit: cover; border: 3.5px solid var(--bg-main); background: var(--bg-secondary); }
        @keyframes pulseStory { 0% { filter: brightness(1); } 100% { filter: brightness(1.2); } }
        .edit-avatar-preview { width: 95px; height: 95px; border-radius: 50%; object-fit: cover; border: 3px solid #1f3cff; cursor: pointer; margin-bottom: 15px; background: var(--bg-secondary); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .profile-tabs { display: flex; overflow-x: auto; white-space: nowrap; border-bottom: 1px solid var(--border-card); scrollbar-width: none; }
        .profile-tabs::-webkit-scrollbar { display: none; }
        .profile-tab-item { padding: 14px 20px; color: var(--text-muted); font-weight: 600; font-size: 14px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.3s; display: flex; align-items: center; gap: 4px; }
        .profile-tab-item.active { color: var(--text-main); font-weight: 800; border-bottom: 2px solid transparent; }
        .full-screen-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--bg-main); z-index: 99999; transform: translateY(100%); transition: transform 0.3s ease-in-out; display: flex; flex-direction: column; opacity: 0; pointer-events: none; }
        .full-screen-modal.open { transform: translateY(0); opacity: 1; pointer-events: auto; }
        .full-screen-header { display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--border-card); background: var(--bg-main); }
        .full-screen-body { flex: 1; overflow-y: auto; padding: 20px; background: var(--bg-main); }
        .full-screen-body.no-padding { padding: 0; }
        .icon-btn-header { background: none; border: none; color: var(--text-main); cursor: pointer; display: flex; align-items: center; }
        .icon-btn-header.text-btn { color: #1f3cff; font-weight: 700; font-size: 15px; }
        .p-follow-sheet { position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg-secondary); border-top-left-radius: 24px; border-top-right-radius: 24px; z-index: 99999; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); max-height: 85dvh; display: flex; flex-direction: column; }
        .p-follow-sheet.open { transform: translateY(0); }
        .follow-sheet-header { display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--border-card); }
        .follow-sheet-body { padding: 15px 20px; overflow-y: auto; }
        .drag-handle { width: 40px; height: 5px; background: var(--border-card); border-radius: 10px; margin: 0 auto 5px; }
        .close-icon { color: var(--text-muted); cursor: pointer; }
        .noscroll { overflow: hidden !important; touch-action: none; }
      `}</style>

      {/* Header dibiarkan di luar wrapper agar tetap di posisinya (fixed/sticky) */}
      <ProfileHeader
        isMe={isMe}
        username={profile.username}
        isPrivate={profile.is_private}
        onBack={() => router.back()}
        onMenuClick={() => setIsSidebarOpen(true)}
      />

      {/* 🔥 KONTEN UTAMA DIBUNGKUS WRAPPER */}
      <RefreshableWrapper onRefresh={refetch}>
        <div>
          <div className="profile-top-section">
            <ProfileInfo
              profile={profile}
              stats={stats}
              isMe={isMe}
              isFollowing={isFollowing}
              isMutual={isMutual}
              hasStory={hasStory}
              storyIdToGo={storyIdToGo}
              onAvatarClick={handleAvatarClick}
              onChat={handleGoToChat}
              onToggleFollow={toggleFollow}
              onEdit={() => setIsEditModalOpen(true)}
              onShare={handleShareProfile}
              onOpenActionSheet={() => setIsActionSheetOpen(true)}
              onOpenFollowers={() => handleOpenFollowModal('followers')}
              onOpenFollowing={() => handleOpenFollowModal('following')}
              t={t}
            />

            {(!profile.is_private || isMe || isMutual) && (
              <ProfileTabs
                isMe={isMe}
                isMutual={isMutual}
                profile={profile}
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab as any)}
                t={t}
              />
            )}
          </div>

          <div className="post-grid-container">
            <PostGrid
              posts={posts}
              isLoadingPosts={isLoadingPosts}
              isMe={isMe}
              isMutual={isMutual}
              profile={profile}
              activeTab={activeTab}
              onPostClick={handlePostClick}
              t={t}
            />
          </div>
        </div>
      </RefreshableWrapper>

      {/* Komponen Modal dan Sidebar */}
      {isMe && (
        <SidebarMenu
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          t={t}
          onShare={handleShareProfile}
        />
      )}

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editData={editData}
        setEditData={setEditData}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        previewUrl={previewUrl}
        setPreviewUrl={setPreviewUrl}
        isSaving={isSaving}
        onSave={handleSaveSettings}
        fileInputRef={fileInputRef}
        t={t}
      />

      <FollowModal
        isOpen={isFollowModalOpen}
        type={followModalType}
        list={followList}
        isLoading={isFollowLoading}
        onClose={() => setIsFollowModalOpen(false)}
        onUserClick={(userId) => {
          setIsFollowModalOpen(false);
          router.push(`/data?id=${userId}`);
        }}
        t={t}
      />

      <ActionSheet
        isOpen={isActionSheetOpen}
        isMutual={isMutual} 
        onClose={() => setIsActionSheetOpen(false)}
        onSetNickname={() => {
          setIsActionSheetOpen(false);
          showNotif("Fitur ganti nama panggilan segera hadir!", "info");
        }}
        onReport={handleReportUser}
        onBlock={handleBlockUser}
      />

    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ height: '100dvh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #01070A)' }}></div>}>
      <ProfileContent />
    </Suspense>
  );
}
