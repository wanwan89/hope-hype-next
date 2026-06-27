'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif, getUserBadge } from '@/lib/ui-utils';
import './Blocked.css';

// 1. Interface untuk profil user agar lebih aman dari tipe "any"
interface BlockedUser {
  id: string;
  username: string;
  avatar_url: string;
  role: string;
}

// 2. Fungsi optimasi gambar (konsisten dengan standar komponen Anda)
const getOptimizedImage = (url: string | null, username: string) => {
  if (!url) return `https://ui-avatars.com/api/?name=${username}&background=random`;
  
  let cleanUrl = url.trim();
  // Optimasi Cloudinary: resize dan kompresi format webp otomatis
  if (cleanUrl.includes('res.cloudinary.com') && !cleanUrl.includes('f_auto')) {
    return cleanUrl.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
  }
  return cleanUrl;
};

export default function BlockedUsersPage() {
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        router.push('/login');
        return;
      }
      
      const currentUserId = session.user.id;
      setMyId(currentUserId);

      // Ambil daftar ID user yang kita blokir
      const { data: blockedData, error: blockErr } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', currentUserId);

      if (blockErr) throw blockErr;

      // Jika tidak ada user yang diblokir, hentikan proses
      if (!blockedData || blockedData.length === 0) {
        setBlockedUsers([]);
        setIsLoading(false);
        return;
      }

      const blockedIds = blockedData.map(b => b.blocked_id);

      // Ambil detail profil dari ID tersebut
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, role')
        .in('id', blockedIds);

      if (profErr) throw profErr;

      setBlockedUsers(profiles || []);
    } catch (error: any) {
      console.error("Error fetching blocked users:", error);
      showNotif("Gagal memuat daftar blokir", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (targetId: string, targetName: string) => {
    if (!myId) return;
    
    // Konfirmasi natif (bisa diganti dengan custom modal jika ada)
    if (!window.confirm(`Yakin ingin membuka blokir @${targetName}?`)) return;

    setUnblockingId(targetId);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .match({ blocker_id: myId, blocked_id: targetId });

      if (error) throw error;

      showNotif(`Blokir @${targetName} telah dibuka.`, "success");
      
      // Hapus user dari state (UI) tanpa harus reload halaman
      setBlockedUsers(prev => prev.filter(user => user.id !== targetId));
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      showNotif("Terjadi kesalahan saat membuka blokir", "error");
    } finally {
      setUnblockingId(null);
    }
  };

  // Mencegah hydration mismatch error di Next.js
  if (!mounted) return <div className="bl-wrapper"></div>;

  return (
    <div className="bl-wrapper">
      <header className="bl-header">
        <button 
          className="bl-back-btn" 
          onClick={() => router.back()} 
          aria-label="Kembali"
        >
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>Pengguna Diblokir</h2>
        <div style={{ width: '32px' }}></div> {/* Spacer biar judul tepat di tengah */}
      </header>

      <main className="bl-content">
        <p className="bl-desc">
          Pengguna dalam daftar ini tidak akan dapat menemukan profil Anda, melihat karya Anda, atau mengirim pesan kepada Anda.
        </p>

        {isLoading ? (
          // SKELETON LOADING
          <div className="bl-list">
            {[1, 2, 3].map(i => (
              <div key={i} className="bl-item-skeleton">
                <div className="bl-skel-avatar"></div>
                <div className="bl-skel-text"></div>
                <div className="bl-skel-btn"></div>
              </div>
            ))}
          </div>
        ) : blockedUsers.length === 0 ? (
          // EMPTY STATE
          <div className="bl-empty">
            <div className="bl-empty-icon">
              <span className="material-icons">gpp_good</span>
            </div>
            <h3>Daftar Kosong</h3>
            <p>Anda belum memblokir pengguna siapa pun.</p>
          </div>
        ) : (
          // LIST USER DIBLOKIR
          <div className="bl-list">
            {blockedUsers.map((user) => (
              <div key={user.id} className="bl-item">
                <img 
                  src={getOptimizedImage(user.avatar_url, user.username)} 
                  alt={user.username} 
                  className="bl-avatar"
                  loading="lazy"
                />
                <div className="bl-info">
                  <span className="bl-name">
                    {user.username} 
                    <span 
                      dangerouslySetInnerHTML={{ __html: getUserBadge(user.role) }} 
                      style={{ display: 'inline-flex', alignItems: 'center' }}
                    />
                  </span>
                  <span className="bl-username">
                    @{user.username.toLowerCase().replace(/\s/g, '')}
                  </span>
                </div>
                <button 
                  className={`bl-unblock-btn ${unblockingId === user.id ? 'loading' : ''}`}
                  onClick={() => handleUnblock(user.id, user.username)}
                  disabled={unblockingId === user.id}
                >
                  {unblockingId === user.id ? 'Membuka...' : 'Buka Blokir'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
