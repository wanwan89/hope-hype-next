'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';

export default function DiscoverFriendsPage() {
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
        return;
      }

      const userId = session.user.id;
      setMyId(userId);

      try {
        const { data: followsData } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', userId);

        const followsSet = new Set(followsData?.map((f) => String(f.following_id)) || []);
        setFollowedUsers(followsSet);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .neq('id', userId)
          .limit(30);

        if (profiles) {
          const notFollowedYet = profiles.filter((p) => !followsSet.has(p.id));
          const shuffled = notFollowedYet.sort(() => 0.5 - Math.random()).slice(0, 15);
          setSuggestions(shuffled);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, [router]);

  // Pencarian realtime dengan debounce
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .ilike('username', `%${searchQuery}%`)
          .neq('id', myId)
          .limit(10);

        setSearchResults(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounce = setTimeout(() => searchUsers(), 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, myId]);

  // Follow / unfollow
  const handleFollowToggle = async (targetId: string) => {
    if (!myId) return;

    const isFollowing = followedUsers.has(targetId);

    setFollowedUsers((prev) => {
      const newSet = new Set(prev);
      isFollowing ? newSet.delete(targetId) : newSet.add(targetId);
      return newSet;
    });

    try {
      if (isFollowing) {
        await supabase.from('followers').delete().match({ follower_id: myId, following_id: targetId });
      } else {
        await supabase.from('followers').insert({ follower_id: myId, following_id: targetId });
      }
    } catch (err) {
      console.error(err);
      showNotif('Gagal mengikuti', 'error');
    }
  };

  // Simulasi sinkronisasi kontak
  const handleSyncContacts = () => {
    showNotif('Meminta izin akses kontak perangkat...', 'info');
    setTimeout(() => {
      showNotif('Tidak ada kontak yang cocok dengan pengguna HypeTalk saat ini.', 'warning');
    }, 2000);
  };

  const renderUserCard = (user: any) => {
    const isFollowing = followedUsers.has(user.id);
    return (
      <div
        key={user.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 15px',
          borderBottom: '1px solid var(--border-card)',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => router.push(`/data?id=${user.id}`)}
        >
          <img
            src={user.avatar_url || '/asets/png/profile.webp'}
            alt="av"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid var(--border-card)',
            }}
          />
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
              {user.username}
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              {user.full_name || 'Pengguna HypeTalk'}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleFollowToggle(user.id)}
          style={{
            padding: '6px 16px',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            background: isFollowing ? 'var(--bg-secondary)' : 'var(--primary-bg)',   // ✅ latar biru
            color: isFollowing ? 'var(--text-main)' : '#fff',
            border: isFollowing ? '1px solid var(--border-card)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {isFollowing ? 'Mengikuti' : 'Ikuti'}
        </button>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100%',
        background: 'var(--bg-main)',
        color: 'var(--text-main)',
        paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--bg-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-card)',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span className="material-icons">arrow_back</span>
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>
          Temukan Teman
        </h2>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* SEARCH BAR */}
        <div style={{ padding: '15px 20px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span
              className="material-icons"
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-muted)',
                fontSize: '20px',
              }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Cari berdasarkan username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                borderRadius: '12px',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <span
                className="material-icons"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  color: 'var(--text-muted)',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                close
              </span>
            )}
          </div>
        </div>

        {/* BANNER KONTAK */}
        {!searchQuery && (
          <div style={{ padding: '0 20px 20px 20px' }}>
            <div
              style={{
                background:
                  'linear-gradient(135deg, rgba(31,60,255,0.1) 0%, rgba(255,46,99,0.1) 100%)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid var(--border-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--primary-bg)',               // ✅ latar biru
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <span className="material-icons">perm_contact_calendar</span>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>
                    Hubungkan Kontak
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Cari teman dari kontak HP kamu
                  </p>
                </div>
              </div>
              <button
                onClick={handleSyncContacts}
                style={{
                  background: 'var(--primary-bg)',               // ✅ latar biru
                  color: '#fff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Mulai
              </button>
            </div>
          </div>
        )}

        {/* KONTEN UTAMA */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '20px 20px 0 0',
            minHeight: '50vh',
            borderTop: '1px solid var(--border-card)',
            paddingTop: '10px',
          }}
        >
          {searchQuery ? (
            <>
              <h3
                style={{
                  margin: '15px 20px',
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                {isSearching ? 'Mencari...' : 'Hasil Pencarian'}
              </h3>
              {searchResults.length > 0 ? (
                searchResults.map(renderUserCard)
              ) : !isSearching ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <span
                    className="material-icons"
                    style={{ fontSize: '40px', opacity: 0.5, marginBottom: '10px' }}
                  >
                    search_off
                  </span>
                  <p style={{ margin: 0 }}>Tidak ada pengguna dengan username tersebut.</p>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <h3
                style={{
                  margin: '15px 20px',
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Saran untuk Anda
              </h3>
              {isLoading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 15px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: 'var(--bg-secondary)',
                          animation: 'pulse 1.5s infinite',
                        }}
                      />
                      <div style={{ marginLeft: '12px', flex: 1 }}>
                        <div
                          style={{
                            width: '40%',
                            height: '14px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '4px',
                            marginBottom: '6px',
                            animation: 'pulse 1.5s infinite',
                          }}
                        />
                        <div
                          style={{
                            width: '60%',
                            height: '10px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '4px',
                            animation: 'pulse 1.5s infinite',
                          }}
                        />
                      </div>
                    </div>
                  ))
              ) : suggestions.length > 0 ? (
                suggestions.map(renderUserCard)
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <p>Tidak ada saran teman baru saat ini.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}