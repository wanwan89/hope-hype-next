'use client';

import React from 'react';
import MessageBubble from './MessageBubble';

export default function ChatMessageList({
  isLoading,
  t,
  messages,
  currentUser,
  setReplyTo,
  setMsgOptions,
  typingUser,
  refs,
  onEdit,
  onDelete,
  router,
  isSelectionMode,
  selectedMessages,
  toggleSelectMessage,
  setIsSelectionMode,
}: any) {
  
  // HAPUS touchTimerRef dan fungsi handleTouchStart/End 
  // karena logika tekan lama sekarang ditangani sepenuhnya oleh MessageBubble untuk memunculkan slide-up.

  return (
    <main className="chat-messages">
      {isLoading ? (
        <div className="chat-loading-screen">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`skeleton-msg ${i % 2 === 0 ? 'left' : 'right'}`}>
              <div className="skeleton-avatar"></div>
              <div className="skeleton-bubble"></div>
            </div>
          ))}
          <div className="loading-chat-hint">{t('connecting_chat')}</div>
        </div>
      ) : (
        <>
          <div className="encryption-notice">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z" />
            </svg>
            <span>{t('encryption_notice')}</span>
          </div>

          {messages.map((msg: any, idx: number) => {
            const isUnread = msg.user_id !== currentUser?.id && msg.status !== 'read';
            let isFirstUnread = false;

            if (isUnread) {
              const prevMsg = messages[idx - 1];
              if (!prevMsg || prevMsg.status === 'read' || prevMsg.user_id === currentUser?.id) {
                isFirstUnread = true;
              }
            }

            let showDateSeparator = false;
            if (idx === 0) {
              showDateSeparator = true;
            } else {
              const prevMsg = messages[idx - 1];
              const currDate = new Date(msg.created_at).toDateString();
              const prevDate = new Date(prevMsg.created_at).toDateString();

              const prevTime = new Date(prevMsg.created_at).getTime();
              const currTime = new Date(msg.created_at).getTime();
              const diffInHours = (currTime - prevTime) / (1000 * 60 * 60);

              if (currDate !== prevDate || diffInHours >= 5) {
                showDateSeparator = true;
              }
            }

            const isMe = msg.user_id === currentUser?.id;
            const isSelected = selectedMessages.includes(msg.id);

            return (
              <div
                key={msg.id}
                className={`message-wrapper ${isSelectionMode ? 'selection-mode-active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}
              >
                {isSelectionMode && (
                  <div className="msg-checkbox-container" onClick={() => toggleSelectMessage(msg.id)} style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="msg-checkbox"
                      checked={isSelected}
                      readOnly
                    />
                  </div>
                )}

                <div style={{ flex: 1, pointerEvents: isSelectionMode ? 'none' : 'auto' }}>
                  <MessageBubble
                    msg={msg}
                    currentUser={currentUser}
                    isMe={isMe}
                    onReply={setReplyTo}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isFirstUnread={isFirstUnread}
                    unreadCount={
                      isFirstUnread
                        ? messages.filter((m: any) => m.user_id !== currentUser?.id && m.status !== 'read').length
                        : 0
                    }
                    showDateSeparator={showDateSeparator}
                    router={router}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    onSelect={(id: string) => {
                      // Jika mode seleksi belum aktif, aktifkan dan pilih pesannya
                      if (!isSelectionMode) {
                        setIsSelectionMode(true);
                        if (!selectedMessages.includes(id)) {
                          toggleSelectMessage(id);
                        }
                      } else {
                        // Jika sudah aktif, cukup toggle pilihan pesannya
                        toggleSelectMessage(id);
                      }
                    }}
                    onSelectAll={() => {
                      // Tambahkan logika Select All di parent komponen jika diperlukan,
                      // sementara ini akan menyalakan mode seleksi terlebih dahulu.
                      setIsSelectionMode(true);
                    }}
                  />
                </div>
              </div>
            );
          })}

          {typingUser && (
            <div
              className="chat-message other"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: '8px',
                marginBottom: '8px',
                paddingLeft: '12px',
              }}
            >
              <img
                src={typingUser.avatar_url || '/asets/png/profile.webp'}
                alt="avatar"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  marginBottom: '2px',
                  border: '1px solid var(--border-color)',
                }}
              />
              <div
                className="content"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 'fit-content',
                  background: 'var(--bg-panel)',
                  padding: '8px 14px',
                  borderRadius: '14px 14px 14px 4px',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: 'var(--primary)',
                    marginBottom: '4px',
                  }}
                >
                  {typingUser.username}
                </div>
                <div
                  className="typing-bubble"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '14px' }}
                >
                  <span
                    style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out' }}
                  ></span>
                  <span
                    style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out 0.2s' }}
                  ></span>
                  <span
                    style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out 0.4s' }}
                  ></span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={refs.scroll} />
    </main>
  );
}
