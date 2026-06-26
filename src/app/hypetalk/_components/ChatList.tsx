'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ChatItem from './ChatItem';

type Props = {
  isLoading: boolean;
  filteredChats: any[];
  requestChats: any[];
  searchQuery: string;
  typingStatus: Record<string, string>;
  mutedChats: Set<string>;
  onlineUsers: Set<string>;
  currentUser: any;
  handleOpenChat: (chat: any) => void;
  handleAvatarClick: (e: React.MouseEvent, chatId: string, chatType: string) => void;
  renderReadReceipt: (chat: any) => React.ReactNode;
  
  // PROPS TAMBAHAN UNTUK FITUR SELEKSI DAN SWIPE
  isSelectionMode?: boolean;
  selectedChats?: Set<string>;
  onPressStart?: (chat: any) => void;
  onPressEnd?: () => void;
  onSwipeRight?: (chatId: string) => void;
};

const ChatList: React.FC<Props> = ({
  isLoading, filteredChats, requestChats, searchQuery,
  typingStatus, mutedChats, onlineUsers, currentUser,
  handleOpenChat, handleAvatarClick, renderReadReceipt,
  isSelectionMode, selectedChats, onPressStart, onPressEnd, onSwipeRight
}) => {
  const router = useRouter();

  return (
    <main className="tg-chat-list" style={{ overflowX: 'hidden' }}>
      {!isLoading && requestChats.length > 0 && !searchQuery && (
        <div className="message-request-banner" onClick={() => router.push('/hypetalk/requests')}>
          <div className="req-left">
            <span className="material-icons">mark_email_unread</span>
            <div className="req-text">
              <h4>Permintaan Pesan</h4>
              <p>{requestChats.length} pesan belum dibalas</p>
            </div>
          </div>
          <span className="material-icons arrow">chevron_right</span>
        </div>
      )}

      {isLoading ? (
        <>
          {[...Array(6)].map((_, index) => (
            <div key={index} className="tg-chat-item" style={{ pointerEvents: 'none' }}>
              <div className="tg-avatar skeleton-box" style={{ borderRadius: '50%' }}></div>
              <div className="tg-chat-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="skeleton-box" style={{ width: '40%', height: '16px' }}></div>
                  <div className="skeleton-box" style={{ width: '30px', height: '12px' }}></div>
                </div>
                <div className="skeleton-box" style={{ width: '70%', height: '14px' }}></div>
              </div>
            </div>
          ))}
        </>
      ) : (
        filteredChats.map(chat => {
          const isSelected = selectedChats?.has(chat.id);
          const isGlobalOrActiveGroup = chat.type === 'global' || (chat.type === 'group' && chat.isMember);
          const canSwipe = !isSelectionMode && !isGlobalOrActiveGroup;

          return (
            <motion.div
              key={chat.id}
              // Framer Motion Prop untuk Swipe Kanan
              drag={canSwipe ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset }) => {
                // Jika digeser ke kanan lebih dari 70px, picu onSwipeRight
                if (offset.x > 70 && onSwipeRight) {
                  onSwipeRight(chat.id);
                }
              }}
              className="chat-item-wrapper"
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isSelected ? 'rgba(43, 147, 255, 0.15)' : 'transparent', // Highlight kebiruan
                transition: 'background-color 0.2s',
                position: 'relative'
              }}
              // EVENT LISTENER UNTUK LONG-PRESS
              onTouchStart={() => onPressStart?.(chat)}
              onTouchEnd={() => onPressEnd?.()}
              onTouchMove={() => onPressEnd?.()} // Batal saat discroll vertikal
              onMouseDown={() => onPressStart?.(chat)}
              onMouseUp={() => onPressEnd?.()}
              onMouseLeave={() => onPressEnd?.()}
            >
              {isSelectionMode && !isGlobalOrActiveGroup && (
                <div className="chat-checkbox" style={{ padding: '0 0 0 16px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleOpenChat(chat)}>
                  <input
                    type="checkbox"
                    checked={isSelected || false}
                    readOnly
                    style={{ transform: 'scale(1.4)', cursor: 'pointer', accentColor: '#2b93ff' }} // Warna biru mirip gambar
                  />
                </div>
              )}
              
              <div style={{ flex: 1, minWidth: 0, pointerEvents: isSelectionMode ? 'none' : 'auto' }}>
                <ChatItem
                  chat={chat}
                  typingStatus={typingStatus}
                  mutedChats={mutedChats}
                  onlineUsers={onlineUsers}
                  currentUser={currentUser}
                  onOpenChat={handleOpenChat}
                  onAvatarClick={handleAvatarClick}
                  renderReadReceipt={renderReadReceipt}
                />
              </div>
            </motion.div>
          );
        })
      )}
    </main>
  );
};

export default React.memo(ChatList);
