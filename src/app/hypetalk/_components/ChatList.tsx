'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
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
  
  // Fitur seleksi & hapus
  isSelectionMode?: boolean;
  selectedChats?: Set<string>;
  onPressStart?: (chat: any) => void;
  onPressEnd?: () => void;
  onDeleteChat?: (chatIds: string[]) => void;
};

// Komponen Pembungkus untuk 1 Chat agar State Animasinya tidak bertabrakan
const SwipeableChatRow = ({
  chat, isSelectionMode, isSelected, onPressStart, onPressEnd, onDeleteChat, handleOpenChat,
  typingStatus, mutedChats, onlineUsers, currentUser, handleAvatarClick, renderReadReceipt
}: any) => {
  const x = useMotionValue(0);
  // Animasikan buka tutup tong sampah. Ketika ditarik, derajat tutup meningkat ke 45 (terbuka dari engsel kanan)
  const lidRotate = useTransform(x, [0, 200], [0, 45]);
  const [isDeleted, setIsDeleted] = useState(false);

  const isGlobalOrActiveGroup = chat.type === 'global' || (chat.type === 'group' && chat.isMember);
  const canSwipe = !isSelectionMode && !isGlobalOrActiveGroup;

  const handleDragEnd = (e: any, info: any) => {
    const screenMiddle = typeof window !== 'undefined' ? window.innerWidth * 0.4 : 150;
    
    if (info.offset.x > screenMiddle) {
      // Jika dislide sampai tengah layar (atau 40%), jalankan animasi hapus otomatis
      setIsDeleted(true);
      animate(x, window.innerWidth, { duration: 0.2 }).then(() => {
        if (onDeleteChat) onDeleteChat([chat.id]);
      });
    } else {
      // Batal hapus, kembalikan posisi semula
      animate(x, 0, { type: "spring", bounce: 0, duration: 0.4 });
    }
  };

  if (isDeleted) return null; // Hilangkan sesaat sesudah dihapus untuk menyembunyikan efek jeda data 

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      {/* Background Kotak Biru dengan Icon Tong Sampah */}
      {canSwipe && (
        <div style={{
          position: 'absolute', inset: 0, backgroundColor: '#2b93ff',
          display: 'flex', alignItems: 'center', paddingLeft: '24px'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            {/* Tutup Tong Sampah yang bereaksi pada tarikan (engsel sudut kanan bawah) */}
            <motion.path
              d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              style={{ rotate: lidRotate, transformOrigin: '80% 80%' }}
            />
            {/* Bagian Bawah Tong Sampah */}
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z" />
          </svg>
        </div>
      )}

      {/* Konten Utama Chat List */}
      <motion.div
        style={{ 
          x, display: 'flex', alignItems: 'center', 
          backgroundColor: isSelected ? 'rgba(43, 147, 255, 0.15)' : 'var(--bg-main, transparent)', 
          position: 'relative' 
        }}
        drag={canSwipe ? "x" : false}
        dragConstraints={{ left: 0, right: typeof window !== 'undefined' ? window.innerWidth : 400 }}
        dragElastic={0.1}
        onDragEnd={canSwipe ? handleDragEnd : undefined}
        onTouchStart={() => onPressStart?.(chat)}
        onTouchEnd={() => onPressEnd?.()}
        onTouchMove={() => onPressEnd?.()}
        onMouseDown={() => onPressStart?.(chat)}
        onMouseUp={() => onPressEnd?.()}
        onMouseLeave={() => onPressEnd?.()}
      >
        {/* CHECKBOX SELEKSI BERBENTUK BULAT */}
        {isSelectionMode && !isGlobalOrActiveGroup && (
          <div className="chat-checkbox" style={{ padding: '0 0 0 16px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleOpenChat(chat)}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              border: isSelected ? 'none' : '2px solid #555', // Warna border default jika belum dipencet
              backgroundColor: isSelected ? '#2b93ff' : 'transparent', // Biru solid jika dipilih
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease-in-out'
            }}>
              {isSelected && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
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
    </div>
  );
};

const ChatList: React.FC<Props> = ({
  isLoading, filteredChats, requestChats, searchQuery,
  typingStatus, mutedChats, onlineUsers, currentUser,
  handleOpenChat, handleAvatarClick, renderReadReceipt,
  isSelectionMode, selectedChats, onPressStart, onPressEnd, onDeleteChat
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
        filteredChats.map(chat => (
          <SwipeableChatRow
            key={chat.id}
            chat={chat}
            isSelectionMode={isSelectionMode}
            isSelected={selectedChats?.has(chat.id)}
            onPressStart={onPressStart}
            onPressEnd={onPressEnd}
            onDeleteChat={onDeleteChat}
            handleOpenChat={handleOpenChat}
            typingStatus={typingStatus}
            mutedChats={mutedChats}
            onlineUsers={onlineUsers}
            currentUser={currentUser}
            handleAvatarClick={handleAvatarClick}
            renderReadReceipt={renderReadReceipt}
          />
        ))
      )}
    </main>
  );
};

export default React.memo(ChatList);
