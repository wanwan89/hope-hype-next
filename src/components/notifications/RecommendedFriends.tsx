'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string | null;
}

interface Props {
  recommended: User[];
  onFollow: (e: React.MouseEvent, targetId: string) => void;
  myFollowings: Set<string>;
}

export default function RecommendedFriends({ recommended, onFollow, myFollowings }: Props) {
  const router = useRouter();

  if (!recommended || recommended.length === 0) return null;

  return (
    <div className="recommended-section">
      <h3 className="section-title">Saran Teman</h3>
      <div className="recommended-list">
        {recommended.map((user) => {
          const isFollowing = myFollowings.has(user.id);
          return (
            <div key={user.id} className="recommended-card">
              {/* Avatar dengan fallback */}
              <div
                onClick={() => router.push(`/data?id=${user.id}`)}
                style={{ cursor: 'pointer', flexShrink: 0 }}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid var(--border-card)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-card)',
                    }}
                  >
                    <span
                      className="material-icons"
                      style={{ fontSize: 28, color: 'var(--text-muted)' }}
                    >
                      person
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div
                className="rec-info"
                onClick={() => router.push(`/data?id=${user.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <span className="rec-name">{user.full_name || user.username}</span>
                <span className="rec-user">@{user.username}</span>
              </div>

              {/* Tombol Follow/Unfollow */}
              <button
                className={`rec-follow-btn ${isFollowing ? 'followed' : ''}`}
                onClick={(e) => onFollow(e, user.id)}
                style={{ flexShrink: 0 }}
              >
                {isFollowing ? 'Mengikuti' : 'Ikuti'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}