'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SuggestedUsers({ myId, followedUsers }: { myId: string | null, followedUsers: Set<string> }) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoading(true); // Mulai loading

      try {
        // Ambil profil acak (limit 20)
        let query = supabase
          .from('profiles')
          .select('id, username, avatar_url, full_name')
          .limit(20);

        // Kalau ada user yang login, jangan tampilkan akunnya sendiri
        if (myId) {
          query = query.neq('id', myId);
        }

        const { data } = await query;

        if (data) {
          // Filter: Kalau login, buang user yang udah di-follow. Kalau belum login, tampilin semua.
          const notFollowedYet = myId 
            ? data.filter(user => !followedUsers.has(user.id)) 
            : data;
            
          // Acak urutannya dan ambil 8 teratas
          const shuffled = notFollowedYet.sort(() => 0.5 - Math.random()).slice(0, 8);
          setSuggestions(shuffled);
        }
      } catch (err) {
        console.error(err);
      } finally {
        // Pastikan loading dimatikan apapun yang terjadi!
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [myId, followedUsers]);

  if (isLoading || suggestions.length === 0) return null;

  return (
    <div style={{ margin: '15px 0 25px 0', padding: '15px 0', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-card)' }}>
      <div style={{ padding: '0 15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>Rekomendasi Teman</h3>
        <span style={{ fontSize: '12px', color: '#1f3cff', fontWeight: 700, cursor: 'pointer' }}>Lihat Semua</span>
      </div>
      
      {/* Container Slider Horizontal */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: '12px', padding: '0 15px', scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}>
        <style>{`
          .suggest-slider::-webkit-scrollbar { display: none; }
        `}</style>
        
        {suggestions.map(user => (
          <div 
            key={user.id} 
            className="suggest-slider"
            style={{ minWidth: '120px', background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', scrollSnapAlign: 'start', cursor: 'pointer' }}
            onClick={() => router.push(`/data?id=${user.id}`)}
          >
            <img 
              src={user.avatar_url || '/asets/png/profile.webp'} 
              alt={user.username} 
              style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', marginBottom: '8px' }}
            />
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.username}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '10px' }}>Baru bergabung</span>
            
            <button 
              style={{ width: '100%', padding: '6px 0', background: '#1f3cff', color: 'white', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/data?id=${user.id}`); // Lempar ke profil biar dia follow dari sana
              }}
            >
              Lihat Profil
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
