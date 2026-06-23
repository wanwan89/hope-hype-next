'use client';
import React from 'react';

export default function FriendStoriesTray({ friends, router }: { friends: any[], router: any }) {
  return (
    <div className="friend-stories-tray">
      {friends.length === 0 ? (
        <div style={{ padding: '0 15px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Belum mengikuti siapa pun.
        </div>
      ) : (
        friends.map(friend => (
          <div 
            key={friend.id} 
            className="story-avatar-container"
            onClick={() => friend.hasStory ? router.push(`/story/view?id=${friend.storyId}`) : router.push(`/data?id=${friend.id}`)}
          >
            <div className={`story-ring ${friend.hasStory ? 'active-story' : 'no-story'}`}>
              <img src={friend.avatar_url || "/asets/png/profile.webp"} alt={friend.username} />
            </div>
            <span className="story-username">{friend.username}</span>
          </div>
        ))
      )}
    </div>
  );
}
