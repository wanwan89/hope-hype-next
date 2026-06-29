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
    text && text.length > 65 ? text.substring(0, 65) + '...' : text;

  return (
    <div
      className="friend-stories-tray"
      style={{
        position: 'relative',
        background: 'var(--bg-main)',
        borderBottom: '1px solid var(--border-card)',
        padding: '0 15px', 
        overflow: 'visible',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          overflowY: 'visible', 
          paddingTop: '30px', 
          paddingBottom: '15px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Profil sendiri */}
        {currentUser && (
          <div style={{ position: 'relative', flexShrink: 0, width: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <div 
                className={`story-ring ${myStatusText ? 'active-story' : 'no-story'}`}
                style={{
                  padding: myStatusText ? '2px' : '0px',
                  background: myStatusText ? 'var(--accent-story)' : 'transparent',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {currentUser.avatar_url ? (
                  <img 
                    src={currentUser.avatar_url} 
                    alt="Catatan" 
                    style={{ 
                      borderRadius: '50%', 
                      border: myStatusText ? '2px solid var(--bg-main)' : 'none',
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }} 
                  />
                ) : (
                  <div className="default-avatar" style={{ borderRadius: '50%', border: myStatusText ? '2px solid var(--bg-main)' : 'none' }}>
                    <span className="material-icons" style={{ fontSize: 32, color: 'var(--text-muted)' }}>person</span>
                  </div>
                )}
              </div>

              {!myStatusText && (
                <button 
                  onClick={onAddStatus}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '-6px',
                    background: 'var(--bg-main)',
                    padding: '2px',
                    borderRadius: '50%',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    zIndex: 12
                  }}
                >
                  <div style={{ background: 'var(--primary)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons" style={{ fontSize: 14, color: 'white', fontWeight: 'bold' }}>add</span>
                  </div>
                </button>
              )}

              {myStatusText && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddStatus?.(); 
                  }}
                  style={{
                    position: 'absolute',
                    top: '-15px', 
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '20px', 
                    padding: '6px 12px',
                    minWidth: '55px',
                    maxWidth: '85px', 
                    zIndex: 10,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    textAlign: 'center',
                    display: '-webkit-box',
                    WebkitLineClamp: 3, 
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.2,
                    wordBreak: 'break-word',
                  }}>
                    {truncateBubble(myStatusText)}
                  </div>
                  <div style={{
                    content: '""',
                    position: 'absolute',
                    bottom: '-4px',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: '8px',
                    height: '8px',
                    background: 'var(--bg-card)',
                    borderRight: '1px solid var(--border-card)',
                    borderBottom: '1px solid var(--border-card)',
                    zIndex: -1,
                  }} />
                </div>
              )}
            </div>
            <span className="story-username" style={{ color: 'var(--text-main)', marginTop: '6px' }}>Catatan</span>
          </div>
        )}

        {/* Teman */}
        {sortedFriends.length === 0 && !currentUser ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0, marginTop: '20px' }}>
            Belum mengikuti siapa pun.
          </div>
        ) : (
          sortedFriends.map((friend) => (
            <div
              key={friend.id}
              style={{ position: 'relative', flexShrink: 0, width: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              onClick={() =>
                friend.hasStory
                  ? router.push(`/story/view?id=${friend.storyId}`)
                  : router.push(`/data?id=${friend.id}`)
              }
            >
              <div style={{ position: 'relative' }}>
                <div 
                  className={`story-ring ${friend.hasStory ? 'active-story' : 'no-story'}`}
                  style={{
                    padding: friend.hasStory ? '2px' : '0px',
                    background: friend.hasStory ? 'var(--accent-story)' : 'transparent',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {friend.avatar_url ? (
                    <img 
                      src={friend.avatar_url} 
                      alt={friend.username} 
                      style={{ 
                        borderRadius: '50%', 
                        border: friend.hasStory ? '2px solid var(--bg-main)' : 'none',
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }} 
                    />
                  ) : (
                    <div className="default-avatar" style={{ borderRadius: '50%', border: friend.hasStory ? '2px solid var(--bg-main)' : 'none' }}>
                      <span className="material-icons" style={{ fontSize: 32, color: 'var(--text-muted)' }}>person</span>
                    </div>
                  )}
                </div>

                {friend.status_text && (
                  <div
                    onClick={(e) => handleBubbleClick(e, friend.status_text!, friend.username, friend.id)}
                    style={{
                      position: 'absolute',
                      top: '-15px', 
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-card)',
                      borderRadius: '20px', 
                      padding: '6px 12px',
                      minWidth: '55px',
                      maxWidth: '85px',
                      zIndex: 10,
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                    }}
                  >
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      textAlign: 'center',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.2,
                      wordBreak: 'break-word',
                    }}>
                      {truncateBubble(friend.status_text)}
                    </div>
                    <div style={{
                      content: '""',
                      position: 'absolute',
                      bottom: '-4px',
                      left: '50%',
                      transform: 'translateX(-50%) rotate(45deg)',
                      width: '8px',
                      height: '8px',
                      background: 'var(--bg-card)',
                      borderRight: '1px solid var(--border-card)',
                      borderBottom: '1px solid var(--border-card)',
                      zIndex: -1,
                    }} />
                  </div>
                )}
              </div>
              <span className="story-username" style={{ color: 'var(--text-main)', marginTop: '6px' }}>{friend.username}</span>
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
              background: 'var(--modal-overlay)',
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
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '20px',
              padding: '20px',
              maxWidth: '320px',
              width: '85%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              zIndex: 9999,
              fontSize: '14px',
              color: 'var(--text-main)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
              <span className="material-icons" style={{ fontSize: 24, color: 'var(--primary)' }}>sticky_note_2</span>
              <strong style={{ fontSize: 16 }}>{popupNote.username}</strong>
            </div>

            <div
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-card)',
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
                  background: 'var(--primary)',
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
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-card)',
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
