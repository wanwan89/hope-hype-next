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
  const [popupNote, setPopupNote] = useState<{ text: string; username: string; userId: string } | null>(null);

  // 🔥 Potong teks ke maks 50 karakter
  const truncateText = (text: string, maxLen: number = 50) => {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + '...';
  };

  // 🔥 Urutkan: yang punya note di depan, lalu yang punya story
  const sortedFriends = [...friends].sort((a, b) => {
    if (a.status_text && !b.status_text) return -1;
    if (!a.status_text && b.status_text) return 1;
    if (a.hasStory && !b.hasStory) return -1;
    if (!a.hasStory && b.hasStory) return 1;
    return 0;
  });

  // 🔥 Handler klik bubble
  const handleBubbleClick = (e: React.MouseEvent, text: string, username: string, userId: string) => {
    e.stopPropagation();
    if (text.length > 50) {
      // Tampilkan popup full note
      setPopupNote({ text, username, userId });
    } else {
      // Navigasi ke profil untuk balas
      onFriendNoteClick?.(userId);
    }
  };

  // 🔥 Tutup popup
  const closePopup = () => setPopupNote(null);

  return (
    <div className="friend-stories-tray" style={{ position: 'relative' }}>
      {/* ============ PROFIL SENDIRI ============ */}
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
                if (myStatusText.length > 50) {
                  setPopupNote({ text: myStatusText, username: 'Anda', userId: currentUser.id });
                }
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
                {truncateText(myStatusText)}
              </span>
              {/* Ekor bubble */}
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

      {/* ============ DAFTAR TEMAN ============ */}
      {sortedFriends.length === 0 && !currentUser ? (
        <div style={{ padding: '0 15px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Belum mengikuti siapa pun.
        </div>
      ) : (
        sortedFriends.map((friend) => (
          <div
            key={friend.id}
            className="story-avatar-container"
            style={{ position: 'relative' }}
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
                onClick={(e) => handleBubbleClick(e, friend.status_text!, friend.username, friend.id)}
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
                  {truncateText(friend.status_text)}
                </span>
                {/* Ekor bubble */}
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

      {/* ============ POPUP FULL NOTE ============ */}
      {popupNote && (
        <>
          {/* Overlay transparan */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 9998,
            }}
            onClick={closePopup}
          />
          {/* Popup */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-card, #ccc)',
              borderRadius: '16px',
              padding: '20px',
              maxWidth: '320px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              zIndex: 9999,
              fontSize: '14px',
              color: 'var(--text-main)',
              lineHeight: 1.5,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="material-icons" style={{ fontSize: 24, color: '#1f3cff' }}>sticky_note_2</span>
              <strong style={{ fontSize: 16 }}>{popupNote.username}</strong>
            </div>

            {/* Teks note penuh */}
            <div
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: 'var(--bg-secondary, #f3f4f6)',
                padding: '12px',
                borderRadius: '12px',
                marginBottom: 16,
              }}
            >
              {popupNote.text}
            </div>

            {/* Tombol aksi */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{
                  flex: 1,
                  background: '#1f3cff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px',
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
                  background: 'var(--bg-secondary, #e5e7eb)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 12,
                  padding: '10px',
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