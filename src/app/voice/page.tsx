'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Script from 'next/script';
import { useSearchParams, useRouter } from 'next/navigation'; 
import { supabase as sb } from '@/lib/supabase'; 
import { useTranslation } from 'react-i18next';
import { showNotif } from '@/lib/ui-utils'; 
import { calculateLevel, getLevelBadgeHTML } from '@/lib/level-utils';

import Modals from '@/components/room/Modalsroom';
import Stage from '@/components/room/Stageroom';
import ChatBox from '@/components/room/ChatBoxroom';
import Footer from '@/components/room/Footerroom';
import GiftDrawer from '@/components/room/GiftDrawerroom'; 
import GiftAnimOverlay from '@/components/room/GiftAnimOverlayroom';

// 🔥 IMPORT KOMPONEN YANG BARU DIPISAH 🔥
import ActionSheetroom from '@/components/room/ActionSheetroom';
import UserProfileSheetroom from '@/components/room/UserProfileSheetroom';

import './Voice.css'; 

// (Bagian 'declare global' dibiarkan sama saja seperti sebelumnya...)
declare global {
  // ... (isi window global sama)
  var LivekitClient: any;
}

function VoiceRoomContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams(); 
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const roomRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  const [totalTaps, setTotalTaps] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [roomSlotCount, setRoomSlotCount] = useState(6);
  
  const [roomInfo, setRoomInfo] = useState<any>({ name: 'VOICE ROOM', ownerAvatar: '', ownerName: '', ownerId: '' });
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isOnStage, setIsOnStage] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isMicActive, setIsMicActive] = useState(false); 
  
  const myTotalGiftSent = useRef(0);
  const myLevel = useRef(1);
  const isMicOn = useRef(false);
  const giftComboCount = useRef(0);
  const lastGiftId = useRef<number | null>(null);
  const giftAnimTimer = useRef<NodeJS.Timeout | null>(null);
  const activeCombos = useRef<Record<string, any>>({});
  
  const myUsername = useRef("Guest");
  const myAvatar = useRef("/asets/png/profile.webp"); 
  const myRole = useRef("user");
  const MY_USER_ID = useRef<string | null>(null);
  const IS_OWNER = useRef(false);
  const selectedTargetId = useRef<string | null>(null);
  const selectedTargetName = useRef("");

  // (Semua useEffect dan logic internal seperti initApp, fetchStage, dll dibiarkan sama seperti sebelumnya)
  // ... (Kode logic dari baris 70 sampai baris 416 pada kode aslimu tetep di sini)

  useEffect(() => {
    setMounted(true);
    // ... Logika lainnya
  }, []);

  if (!mounted) return null;

  return (
    <div className="in-voice-room" onClick={(e) => window.handleGlobalClick?.(e)}>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" />
      <Script src="https://cdn.jsdelivr.net/npm/livekit-client@1.15.12/dist/livekit-client.umd.min.js" />
      
      <Modals />
      
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        <div className="vr-custom-header">
           <div className="vr-header-left">
              <img 
                 src={roomInfo.ownerAvatar || '/asets/png/profile.webp'} 
                 className="vr-owner-avatar" 
                 onClick={() => window.openUserProfile?.(roomInfo.ownerId)} 
                 alt="Owner"
              />
              <div className="vr-header-info">
                 <h2 className="vr-room-name">{roomInfo.name}</h2>
                 <div className="vr-room-stats">
                    <span id="online-count">{onlineUsers}</span> online
                    <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#ff4757' }}>
                       <span className="material-icons" style={{ fontSize: '11px' }}>favorite</span> {totalTaps.toLocaleString()}
                    </span>
                 </div>
              </div>
           </div>

           <div className="vr-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <div id="top-gifters-container" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '6px' }} onClick={() => window.openTopGiftersModal?.()}></div>
             
             {roomInfo.ownerId && roomInfo.ownerId !== MY_USER_ID.current && !isFollowingHost && (
                <button className="vr-btn-follow" onClick={() => {
                  if (MY_USER_ID.current && roomInfo.ownerId) {
                    setIsFollowingHost(true);
                    sb.from('followers').insert({ follower_id: MY_USER_ID.current, following_id: roomInfo.ownerId }).then();
                    showNotif(`Mengikuti ${roomInfo.ownerName}`, 'success');
                  }
                }}>+ Follow</button>
             )}
           </div>
        </div>

        <div style={{ height: '70px', width: '100%', flexShrink: 0 }}></div>

        <Stage />
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '90px', overflow: 'hidden' }}>
          <ChatBox messages={chatMessages} />
        </div>
        
        <Footer />
      </div> 
      
      <GiftDrawer />
      <GiftAnimOverlay />

      {/* 🔥 PANGGIL KOMPONEN SLIDE-UP YANG UDAH KITA PISAH 🔥 */}
      
      <ActionSheetroom 
        isOpen={isActionMenuOpen}
        onClose={() => setIsActionMenuOpen(false)}
        isOnStage={isOnStage}
        isMicActive={isMicActive}
        isOwner={IS_OWNER.current}
        onMintaNaik={() => window.mintaNaik?.()}
        onToggleMic={(e) => window.toggleMicSidebar?.(e)}
        onTurunPanggung={() => window.prosesTurunMic?.()}
        onOpenSetting={() => window.openRoomSetting?.()}
      />

      <UserProfileSheetroom 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        selectedUser={selectedUser}
        myUserId={MY_USER_ID.current}
        isOwner={IS_OWNER.current}
        onTurunSlot={() => window.prosesTurunMic?.()}
        onKickUser={(id, name) => window.kickUser?.(id, name)}
      />

      <style jsx global>{`
        /* ... Style global tetep di sini ... */
      `}</style>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B141A', color: '#fff', fontFamily: 'sans-serif' }}>Memuat panggung...</div>}>
      <VoiceRoomContent />
    </Suspense>
  );
}
