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
      {/* Profil sendiri dengan bubble note */}
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

          {/* Tombol + untuk tambah note */}
          <button className="add-status-btn" onClick={onAddStatus}>
            <span className="material-icons" style={{ fontSize: 14, color: 'white' }}>add</span>
          </button>

          {/* Bubble note sendiri */}
          {myStatusText && (
            <div
              className="note-bubble"
              style={{
                position: 'absolute',
                top: -8,
                right: -16,
                background: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-card, #ccc)',
                borderRadius: '12px',
                padding: '4px 10px',
                maxWidth: '140px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 5,
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/data?id=${currentUser.id}`);
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                }}
              >
                {myStatusText}
              </span>
              {/* Ekor bubble kecil */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -5,
                  right: 22,
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid var(--bg-card, #ffffff)',
                }}
              />
            </div>
          )}
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

            {/* Bubble note teman */}
            {friend.status_text && (
              <div
                className="note-bubble"
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -16,
                  background: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-card, #ccc)',
                  borderRadius: '12px',
                  padding: '4px 10px',
                  maxWidth: '140px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 5,
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onFriendNoteClick?.(friend.id);
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                  }}
                >
                  {friend.status_text}
                </span>
                <div
                  style={{
                    position: 'absolute',
                    bottom: -5,
                    right: 22,
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid var(--bg-card, #ffffff)',
                  }}
                />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}