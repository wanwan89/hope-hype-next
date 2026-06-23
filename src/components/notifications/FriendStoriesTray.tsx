'use client';
import React from 'react';

interface Friend {
  id: string;
  username: string;
  avatar_url?: string | null;
  hasStory: boolean;
  storyId?: string | null;
  status_text?: string | null;
}

interface CurrentUser {
  id: string;
  username?: string;
  avatar_url?: string | null;
}

interface Props {
  friends: Friend[];
  currentUser?: CurrentUser | null;
  myStatusText?: string;
  onAddStatus?: () => void;
  onFriendNoteClick?: (friendId: string) => void;
  router: any;
}

export default function FriendStoriesTray({
  friends,
  currentUser,
  myStatusText,
  onAddStatus,
  onFriendNoteClick,
  router,
}: Props) {
  return (
    <div className="friend-stories-tray">
      {currentUser && (
        <div className="story-avatar-container" style={{ position: 'relative' }}>
          <div className={`story-ring ${myStatusText ? 'active-story' : 'no-story'}`}>
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt="Anda" />
            ) : (
              <div className="default-avatar">
                <span className="material-icons" style={{ fontSize: 32, color: 'var(--text-muted)' }}>
                  person
                </span>
              </div>
            )}
          </div>
          <span className="story-username">Anda</span>
          {myStatusText && (
            <span className="story-status-text" title="Status Anda">
              {myStatusText}
            </span>
          )}
          <button className="add-status-btn" onClick={onAddStatus}>
            <span className="material-icons" style={{ fontSize: 14, color: 'white' }}>
              add
            </span>
          </button>
        </div>
      )}

      {friends.length === 0 && !currentUser ? (
        <div style={{ padding: '0 15px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Belum mengikuti siapa pun.
        </div>
      ) : (
        friends.map((friend) => (
          <div
            key={friend.id}
            className="story-avatar-container"
            onClick={() =>
              friend.hasStory
                ? router.push(`/story/view?id=${friend.storyId}`)
                : router.push(`/data?id=${friend.id}`)
            }
          >
            <div className={`story-ring ${friend.hasStory ? 'active-story' : 'no-story'}`}>
              {friend.avatar_url ? (
                <img src={friend.avatar_url} alt={friend.username} />
              ) : (
                <div className="default-avatar">
                  <span className="material-icons" style={{ fontSize: 32, color: 'var(--text-muted)' }}>
                    person
                  </span>
                </div>
              )}
            </div>
            <span className="story-username">{friend.username}</span>
            {friend.status_text && (
              <span
                className="story-status-text"
                title="Klik untuk membalas"
                onClick={(e) => {
                  e.stopPropagation();
                  onFriendNoteClick?.(friend.id);
                }}
                style={{ cursor: 'pointer' }}
              >
                {friend.status_text}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}