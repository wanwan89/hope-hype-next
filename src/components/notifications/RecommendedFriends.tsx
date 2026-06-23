'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function RecommendedFriends({ recommended, onFollow, myFollowings }: { recommended: any[], onFollow: any, myFollowings: Set<string> }) {
  const router = useRouter();
  if (recommended.length === 0) return null;

  return (
    <div className="recommended-section">
      <h3 className="section-title">Saran Teman</h3>
      <div className="recommended-list">
        {recommended.map(user => {
          const isFollowing = myFollowings.has(user.id);
          return (
            <div key={user.id} className="recommended-card">
              <img src={user.avatar_url || "/asets/png/profile.webp"} alt={user.username} onClick={() => router.push(`/data?id=${user.id}`)} />
              <div className="rec-info" onClick={() => router.push(`/data?id=${user.id}`)}>
                <span className="rec-name">{user.full_name || user.username}</span>
                <span className="rec-user">@{user.username}</span>
              </div>
              <button 
                className={`rec-follow-btn ${isFollowing ? 'followed' : ''}`}
                onClick={(e) => onFollow(e, user.id)}
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
