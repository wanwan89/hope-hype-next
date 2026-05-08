'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif, getUserBadge } from '@/lib/ui-utils';
import './Blocked.css';

export default function BlockedUsersPage() {
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const currentUserId = session.user.id;
      setMyId(currentUserId);

      // 1. Ambil daftar ID user yang kita blokir
      const { data: blockedData, error: blockErr } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', currentUserId);

      if (blockErr) throw blockErr;

      if (!blockedData || blockedData.length === 0) {
        setBlockedUsers([]);
        setIsLoading(false);
        return;
      }

      const blockedIds = blockedData.map(b => b.blocked_id);

      // 2. Ambil detail profil dari ID tersebut
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, role')
        .in('id', blockedIds);

      if (profErr) throw profErr;

      setBlockedUsers(profiles || []);
    } catch (error: any) {
      console.error(error);
      showNotif("Gagal memuat daftar blokir", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (targetId: string, targetName: string) => {
    if (!myId) return;
    
    // Opsional: Kasih konfirmasi biar gak kepencet
    if (!confirm(`Yakin ingin membuka blokir ${targetName}?`)) return;

    setUnblockingId(targetId);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .match({ blocker_id: myId, blocked_id: targetId });

      if (error) throw error;

      showNotif(`Blokir ${targetName} telah dibuka.`, "success");
      
      // Hapus user dari state (UI) tanpa harus reload halaman
      setBlockedUsers(prev => prev.filter(user => user.id !== targetId));
    } catch (error: any) {
      showNotif(error.message, "error");
    } finally {
      setUnblockingId(null);
    }
  };

  if (!mounted) return <div className="bl-wrapper"></div>;

  return (
    <div className="bl-wrapper">
      <header className="bl-header">
        <button className="bl-back-btn" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>Pengguna Diblokir</h2>
        <div style={{ width: '32px' }}></div> {/* Spacer biar judul di tengah */}
      </header>

      <main className="bl-content">
        <p className="bl-desc">
          Pengguna dalam daftar ini tidak akan dapat menemukan profil Anda, melihat karya Anda, atau mengirim pesan kepada Anda.
        </p>

        {isLoading ? (
          // Skeleton Loading
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
          // Empty State
          <div className="bl-empty">
            <div className="bl-empty-icon">
              <span className="material-icons">gpp_good</span>
            </div>
            <h3>Daftar Kosong</h3>
            <p>Anda belum memblokir pengguna siapa pun.</p>
          </div>
        ) : (
          // List User Diblokir
          <div className="bl-list">
            {blockedUsers.map((user) => (
              <div key={user.id} className="bl-item">
                <img 
                  src={user.avatar_url || '/asets/png/profile.webp'} 
                  alt={user.username} 
                  className="bl-avatar" 
                />
                <div className="bl-info">
                  <span className="bl-name">
                    {user.username} 
                    <span dangerouslySetInnerHTML={{ __html: getUserBadge(user.role) }} />
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
