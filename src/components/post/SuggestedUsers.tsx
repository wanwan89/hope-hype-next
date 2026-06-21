'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { showNotif } from '@/lib/ui-utils';

type SuggestedUsersProps = {
  myId: string | null;
  followedUsers: Set<string>;
};

// Fungsi pembantu untuk membandingkan Set (digunakan di memo)
const setsAreEqual = (a: Set<string>, b: Set<string>) => {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
};

const SuggestedUsers: React.FC<SuggestedUsersProps> = ({ myId, followedUsers }) => {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localFollowed, setLocalFollowed] = useState<Set<string>>(new Set());

  // Fetch data
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        let query = supabase.from('profiles').select('id, username, avatar_url, full_name').limit(20);
        if (myId) query = query.neq('id', myId);

        const { data } = await query;
        if (data) {
          const notFollowedYet = myId
            ? data.filter((user) => !followedUsers.has(user.id))
            : data;
          const shuffled = notFollowedYet.sort(() => 0.5 - Math.random()).slice(0, 8);
          setSuggestions(shuffled);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [myId, followedUsers]);

  // Handler follow di‑memo
  const handleFollow = useCallback(
    async (e: React.MouseEvent, targetId: string) => {
      e.stopPropagation();
      if (!myId) {
        showNotif('Silakan login untuk mengikuti', 'warning');
        window.dispatchEvent(new CustomEvent('openLogin'));
        return;
      }

      setLocalFollowed((prev) => new Set(prev).add(targetId));

      try {
        const { error } = await supabase
          .from('followers')
          .insert({ follower_id: myId, following_id: targetId });
        if (error && error.code !== '23505') throw error;
      } catch (err) {
        console.error(err);
        showNotif('Gagal mengikuti pengguna', 'error');
        setLocalFollowed((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      }
    },
    [myId]
  );

  // Jangan render jika tidak ada data
  if (isLoading || suggestions.length === 0) return null;

  return (
    <div
      style={{
        margin: '15px 0 25px 0',
        padding: '15px 0',
        background: 'var(--bg-secondary)',
        borderRadius: '16px',
        border: '1px solid var(--border-card)',
        contain: 'content',
      }}
    >
      <div style={{ padding: '0 15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>Rekomendasi Teman</h3>
        <span
          style={{ fontSize: '12px', color: '#1f3cff', fontWeight: 700, cursor: 'pointer' }}
          onClick={() => router.push('/discover')}
        >
          Lihat Semua
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '12px',
          padding: '0 15px',
          scrollbarWidth: 'none',
          scrollSnapType: 'x mandatory',
          willChange: 'transform',
        }}
      >
        {suggestions.map((user) => {
          const isFollowingNow = localFollowed.has(user.id) || followedUsers.has(user.id);

          return (
            <div
              key={user.id}
              style={{
                minWidth: '120px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                scrollSnapAlign: 'start',
                cursor: 'pointer',
              }}
              onClick={() => router.push(`/data?id=${user.id}`)}
            >
              <img
                src={user.avatar_url || '/asets/png/profile.webp'}
                alt={user.username}
                loading="lazy"
                decoding="async"
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  marginBottom: '8px',
                  background: 'var(--bg-main)',
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  textAlign: 'center',
                  width: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.username}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Baru bergabung
              </span>

              <button
                style={{
                  width: '100%',
                  padding: '6px 0',
                  background: isFollowingNow ? 'transparent' : '#1f3cff',
                  color: isFollowingNow ? 'var(--text-main)' : 'white',
                  border: isFollowingNow ? '1px solid var(--border-card)' : 'none',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={(e) => handleFollow(e, user.id)}
                disabled={isFollowingNow}
              >
                {isFollowingNow ? 'Mengikuti' : 'Ikuti'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Pembanding memo kustom: hanya render ulang jika myId atau followedUsers benar‑benar berubah
export default React.memo(SuggestedUsers, (prev, next) => {
  return prev.myId === next.myId && setsAreEqual(prev.followedUsers, next.followedUsers);
});