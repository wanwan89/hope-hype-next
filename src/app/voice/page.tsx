'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Script from 'next/script';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase as sb } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { showNotif } from '@/lib/ui-utils';
import { calculateLevel } from '@/lib/level-utils';

import Modals from '@/components/room/Modalsroom';
import Stage from '@/components/room/Stageroom';
import ChatBox from '@/components/room/ChatBoxroom';
import Footer from '@/components/room/Footerroom';
import GiftDrawer from '@/components/room/GiftDrawerroom';
import GiftAnimOverlay from '@/components/room/GiftAnimOverlayroom';
import ActionSheetroom from '@/components/room/ActionSheetroom';
import UserProfileSheetroom from '@/components/room/UserProfileSheetroom';

import './Voice.css';

declare global {
  interface Window {
    __VOICE_ROOM_INIT__?: boolean;
    naikKeStage?: (index: number) => void;
    toggleActionMenu?: () => void;
    toggleMicSidebar?: (event?: any) => void;
    toggleRoomGiftDrawer?: (e?: any) => void;
    kirimKomentar?: () => void;
    mintaNaik?: () => void;
    keluarRoom?: () => void;
    openRoomSetting?: () => void;
    closeRoomSetting?: () => void;
    saveRoomSetting?: () => void;
    openConfirmModal?: () => void;
    closeConfirmModal?: () => void;
    openTopGiftersModal?: () => void;
    closeTopGiftersModal?: () => void;
    openUserProfile?: (userId: string) => void;
    updateRadarColor?: (color: string) => void;
    handleGlobalClick?: (e: any) => void;
  }
  var LivekitClient: any;
}

function VoiceRoomContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // ... semua state dan ref seperti sebelumnya (tidak diubah) ...
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
  const channelRef = useRef<any>(null);
  const roomRef = useRef<any>(null);

  // Semua fungsi (initApp, fetchStage, sendGift, dll.) tetap sama, tidak diubah.
  // Hanya bagian return dan useEffect yang disesuaikan.

  useEffect(() => {
    setMounted(true);
    window.__VOICE_ROOM_INIT__ = true;

    // Tidak ada document.body.classList.add('voice-room-active');

    // ... semua kode inisialisasi (fetch user, fetch room, realtime, dll.) ...
    // (tidak diubah)

    const fixMobileHeight = () => {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    window.addEventListener('resize', fixMobileHeight);
    window.addEventListener('orientationchange', fixMobileHeight);
    fixMobileHeight();

    return () => {
      // Tidak ada document.body.classList.remove('voice-room-active');
      window.removeEventListener('resize', fixMobileHeight);
      window.removeEventListener('orientationchange', fixMobileHeight);
      roomRef.current?.disconnect();
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="in-voice-room" onClick={(e) => window.handleGlobalClick?.(e)}>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" />
      <Script src="https://cdn.jsdelivr.net/npm/livekit-client@1.15.12/dist/livekit-client.umd.min.js" />

      <Modals />

      <div className="app-container">
        <div className="vr-custom-header">
          {/* ... header seperti sebelumnya ... */}
        </div>

        <div className="header-spacer" />

        <Stage />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '90px', overflow: 'hidden' }}>
          <ChatBox messages={chatMessages} />
        </div>

        <Footer />
      </div>

      <GiftDrawer />
      <GiftAnimOverlay />

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

      {/* Tidak ada <style jsx global> */}
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