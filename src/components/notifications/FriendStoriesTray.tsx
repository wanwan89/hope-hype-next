'use client';
import React, { useState } from 'react';

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
  const [popupNote, setPopupNote] = useState<{
    text: string;
    username: string;
    userId: string;
  } | null>(null);

  const sortedFriends = [...friends].sort((a, b) => {
    if (a.status_text && !b.status_text) return -1;
    if (!a.status_text && b.status_text) return 1;
    if (a.hasStory && !b.hasStory) return -1;
    if (!a.hasStory && b.hasStory) return 1;
    return 0;
  });

  const handleBubbleClick = (
    e: React.MouseEvent,
    text: string,
    username: string,
    userId: string
  ) => {
    e.stopPropagation();
    setPopupNote({ text, username, userId });
  };

  const closePopup = () => setPopupNote(null);

  const truncateBubble = (text: string) =>
    text && text.length > 20 ? text.substring(0, 20) + '...' : text;

  // Bubble di ATAS avatar, dengan teks kontras di kedua mode
  const bubbleStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: 'calc(100% - 4px)', // menempel di atas cincin
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--bg-card, #ffffff)',
    border: '1.5px solid var(--border-card, #e0e0e0)',
    borderRadius: '18px',
    padding: '7px 14px',
    maxWidth: '150px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
    zIndex: 999,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '12px',
    fontWeight: 600,
    // Teks otomatis kontras dengan background
    color: 'var(--text-main, #1c1e21)',
    textAlign: 'center',
    pointerEvents: 'auto',
  };

  // Ekor balon menunjuk ke bawah (arah avatar)
  const triangleStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: '-6px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '7px solid transparent',
    borderRight: '7px solid transparent',
    borderTop: '7px solid var(--bg-card, #ffffff)',
  };

  return (
    <div
      className="friend-stories-tray"
      style={{
        position: 'relative',
        background: 'var(--bg-main, #ffffff)',
        borderBottom: '1px solid var(--border-card, #e0e0e0)',
        padding: '15px',
        overflow: 'visible',
        zIndex: 100,
        marginTop: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          overflowY: 'visible',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Profil sendiri */}
        {currentUser && (
          <div className="story-avatar-container" style={{ position: 'relative', flexShrink: 0 }}>
            <div className={`story-ring ${myStatusText ? 'active-story' : 'no-story'}`}>
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Anda" />
              ) : (
                <div className="default-avatar">
                  <span className="material-icons" style={{ fontSize: 32, color: 'var(--text-muted)' }}>person</span>
                </div>
              )}
            </div>
            <span className="story-username" style={{ color: 'var(--text-main)' }}>Anda</span>
            <button className="add-status-btn" onClick={onAddStatus}>
              <span className="material-icons" style={{ fontSize: 14, color: 'white' }}>add</span>
            </button>

            {myStatusText && (
              <div
                className="note-bubble"
                style={bubbleStyles}
                onClick={(e) => handleBubbleClick(e, myStatusText, 'Anda', currentUser.id)}
              >
                {truncateBubble(myStatusText)}
                <div style={triangleStyles} />
              </div>
            )}
          </div>
        )}

        {/* Teman */}
        {sortedFriends.length === 0 && !currentUser ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }}>
            Belum mengikuti siapa pun.
          </div>
        ) : (
          sortedFriends.map((friend) => (
            <div
              key={friend.id}
              className="story-avatar-container"
              style={{ position: 'relative', flexShrink: 0 }}
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
                    <span className="material-icons" style={{ fontSize: 32, color: 'var(--text-muted)' }}>person</span>
                  </div>
                )}
              </div>
              <span className="story-username" style={{ color: 'var(--text-main)' }}>{friend.username}</span>

              {friend.status_text && (
                <div
                  className="note-bubble"
                  style={bubbleStyles}
                  onClick={(e) => handleBubbleClick(e, friend.status_text!, friend.username, friend.id)}
                >
                  {truncateBubble(friend.status_text)}
                  <div style={triangleStyles} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Popup full note */}
      {popupNote && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 9998,
            }}
            onClick={closePopup}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-card, #e0e0e0)',
              borderRadius: '20px',
              padding: '20px',
              maxWidth: '320px',
              width: '85%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              zIndex: 9999,
              fontSize: '14px',
              color: 'var(--text-main, #1a1a1a)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
              <span className="material-icons" style={{ fontSize: 24, color: '#1f3cff' }}>sticky_note_2</span>
              <strong style={{ fontSize: 16 }}>{popupNote.username}</strong>
            </div>

            <div
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: 'var(--bg-main, #f5f5f5)',
                border: '1px solid var(--border-card, #e0e0e0)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: 20,
                fontSize: '15px',
                lineHeight: 1.5,
              }}
            >
              {popupNote.text}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{
                  flex: 1,
                  background: '#1f3cff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  closePopup();
                  onFriendNoteClick?.(popupNote.userId);
                }}
              >
                Balas
              </button>
              <button
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: 'var(--text-main, #1a1a1a)',
                  border: '1px solid var(--border-card, #e0e0e0)',
                  borderRadius: 12,
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                onClick={closePopup}
              >
                Tutup
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}