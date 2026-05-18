'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
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
};

const ChatList: React.FC<Props> = ({
  isLoading, filteredChats, requestChats, searchQuery,
  typingStatus, mutedChats, onlineUsers, currentUser,
  handleOpenChat, handleAvatarClick, renderReadReceipt
}) => {
  const router = useRouter();

  return (
    <main className="tg-chat-list">
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
        filteredChats.map(chat => (
          <ChatItem
            key={chat.id}
            chat={chat}
            typingStatus={typingStatus}
            mutedChats={mutedChats}
            onlineUsers={onlineUsers}
            currentUser={currentUser}
            onOpenChat={handleOpenChat}
            onAvatarClick={handleAvatarClick}
            renderReadReceipt={renderReadReceipt}
          />
        ))
      )}
    </main>
  );
};

export default React.memo(ChatList);