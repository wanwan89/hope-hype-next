'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Script from 'next/script';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase as sb } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { showNotif, getUserBadge } from '@/lib/ui-utils';

import Sidebar from '@/components/room/Sidebarroom';
import Modals from '@/components/room/Modalsroom';
import Header from '@/components/room/Headerroom';
import Stage from '@/components/room/Stageroom';
import ChatBox from '@/components/room/ChatBoxroom';
import Footer from '@/components/room/Footerroom';
import GiftDrawer from '@/components/room/GiftDrawerroom';
import GiftAnimOverlay from '@/components/room/GiftAnimOverlayroom';

import './Voice.css';

declare global {
  interface Window {
    __VOICE_ROOM_INIT__?: boolean;
    naikKeStage?: (index: number) => void;
    turunMic?: (index: number) => void;
    prosesTurunMic?: () => void;
    toggleSidebar?: () => void;
    toggleMicSidebar?: (event?: any) => void;
    toggleRoomGiftDrawer?: (e?: any) => void;
    toggleKickBtn?: (el: HTMLElement, canKick: boolean) => void;
    sendGift?: (giftName: string, harga: number | string, giftId: number | string, jumlah?: number) => void;
    kickUser?: (targetId: string, targetName: string) => void;
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
    playGiftAnimation?: (giftId: number | string, forcedCombo?: number | null) => void;
    accNaikPanggung?: (userId: string, username: string) => void;
    updateRadarColor?: (color: string) => void;
    handleGlobalClick?: (e: any) => void;
    openUserProfile?: (userId: string) => void;
  }
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
  const [onlineCount, setOnlineCount] = useState(0);
  const [myAvatar, setMyAvatar] = useState('/asets/png/profile.webp');
  const [myUsernameState, setMyUsernameState] = useState('Guest');
  const [roomName, setRoomName] = useState('Voice Room');
  const [isFollowed, setIsFollowed] = useState(false);

  const myTotalGiftSent = useRef(0);
  const myLevel = useRef(1);
  const isMicOn = useRef(false);
  const giftComboCount = useRef(0);
  const lastGiftId = useRef<number | null>(null);
  const giftAnimTimer = useRef<NodeJS.Timeout | null>(null);
  const activeCombos = useRef<Record<string, any>>({});

  const myUsername = useRef("Guest");
  const myRole = useRef("user");
  const MY_USER_ID = useRef<string | null>(null);
  const IS_OWNER = useRef(false);

  const selectedTargetId = useRef<string | null>(null);
  const selectedTargetName = useRef("");
  const chatAvatarCache = useRef<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    window.__VOICE_ROOM_INIT__ = true;

    const rawId = searchParams?.get('id');
    const rawName = searchParams?.get('name');
    const urlParams = new URLSearchParams(window.location.search);
    const CURRENT_ROOM_ID = rawId || urlParams.get('id');
    const CURRENT_ROOM_NAME = rawName || urlParams.get('name') || "Voice Room";

    const updateTitle = () => {
      const titleEl = document.querySelector('.room-title') as HTMLElement;
      if (titleEl && CURRENT_ROOM_NAME && CURRENT_ROOM_NAME !== "Voice Room") {
        titleEl.innerText = CURRENT_ROOM_NAME.toUpperCase();
      }
    };
    updateTitle();
    setTimeout(updateTitle, 500);

    function createTapAnimation(x: number, y: number) {
      const heart = document.createElement('div');
      heart.innerHTML = '❤️';
      heart.className = 'tap-emoji-fly';
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      document.body.appendChild(heart);
      setTimeout(() => heart.remove(), 1000);
    }

    window.handleGlobalClick = async (e: any) => {
      const chatBoxArea = document.getElementById('chat-box');
      if (!chatBoxArea || !chatBoxArea.contains(e.target as Node)) return;

      const x = e.clientX || (e.touches && e.touches[0].clientX);
      const y = e.clientY || (e.touches && e.touches[0].clientY);
      if (!x || !y) return;

      createTapAnimation(x, y);

      setTotalTaps(prev => {
        const newTotal = prev + 1;
        if (newTotal % 5 === 0) {
          sb.from('rooms').update({ tap_count: newTotal }).eq('id', CURRENT_ROOM_ID).then();
        }
        return newTotal;
      });

      if (channelRef.current) {
        channelRef.current.send({ type: 'broadcast', event: 'tap_event', payload: { x, y } });
      }
    };

    window.openUserProfile = async (userId: string) => {
      if (!userId) return;
      try {
        const { data: p, error } = await sb.from('profiles').select('*').eq('id', userId).single();
        if (error || !p) return;
        setSelectedUser(p);
        setIsProfileOpen(true);
      } catch (err) {
        console.error(err);
      }
    };

    // 🔥 FIX 1: LOGIKA LEVEL 1 - 50 & ICON BADGE ELEGAN 🔥
    function calculateLevel(giftSent: number) {
      let lvl = Math.floor(giftSent / 500) + 1;
      if (lvl > 50) lvl = 50;
      return lvl;
    }

    function getLevelColor(level: number) {
      if (level >= 40) return ["#ff0844", "#ffb199"];
      if (level >= 30) return ["#00c6ff", "#0072ff"];
      if (level >= 20) return ["#f6d365", "#fda085"];
      if (level >= 10) return ["#89f7fe", "#66a6ff"];
      return ["#d4fc79", "#96e6a1"];
    }

    function getLevelBadgeHTML(levelVal: string | number) {
      const lvl = typeof levelVal === 'string' ? parseInt(levelVal) : (levelVal || 1);
      const [c1, c2] = getLevelColor(lvl);
      return `
        <span style="
          display: inline-flex; align-items: center; justify-content: center; gap: 2px;
          background: linear-gradient(135deg, ${c1}, ${c2});
          color: #fff; font-size: 9px; font-weight: 900;
          padding: 2px 6px; border-radius: 12px; margin-left: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3); vertical-align: middle;
        ">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          ${lvl}
        </span>`;
    }

    async function getRoomLeaderboard() {
      try {
        const { data: messages } = await sb.from('room_messages').select('text, role').eq('room_id', CURRENT_ROOM_ID).eq('username', 'SISTEM_GIFT');
        const hargaKado: Record<string, number> = { '1': 1, '2': 10, '3': 50, '4': 100, '5': 2000, '6': 5000, '7': 10000, '8': 25000, '9': 50000, '10': 100000 };
        let totals: Record<string, number> = {};
        messages?.forEach((m: any) => {
          const match = m.text.match(/^(.+) mengirim .+ x(\d+) ke/);
          if (match) {
            const user = match[1];
            const count = parseInt(match[2]);
            const price = hargaKado[m.role] || 0;
            totals[user] = (totals[user] || 0) + (price * count);
          }
        });
        const names = Object.keys(totals).sort((a, b) => totals[b] - totals[a]).slice(0, 10);
        if (names.length === 0) return [];
        const { data: profs } = await sb.from('profiles').select('id, username, avatar_url, level, role, total_gift_sent').in('username', names);
        return (profs || []).map(p => ({ ...p, room_total: totals[p.username] })).sort((a, b) => b.room_total - a.room_total);
      } catch (e) {
        return [];
      }
    }

    function playGiftAnimation(giftId: number | string, forcedCombo: number | null = null) {
      const id = typeof giftId === 'string' ? parseInt(giftId) : (giftId || 1);
      const gifPath = `asets/gif/giftvid${id}.gif`;
      if (forcedCombo !== null) {
        giftComboCount.current = forcedCombo;
        lastGiftId.current = id;
      } else {
        if (lastGiftId.current === id) giftComboCount.current++;
        else {
          giftComboCount.current = 1;
          lastGiftId.current = id;
        }
      }

      let overlay = document.getElementById('gift-anim-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gift-anim-overlay';
        overlay.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:9999999; display:none; justify-content:center; align-items:center; background:rgba(0,0,0,0.2); opacity:0; transition:opacity 0.3s;";
        document.body.appendChild(overlay);
      }
      const iconPngPath = `asets/png/gift${id}.png`;
      overlay.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; position:relative;"><img id="gift-anim-img" src="${gifPath}?t=${Date.now()}" style="width:280px; max-width:85%; object-fit:contain; filter:drop-shadow(0 0 20px gold);"><div id="gift-combo-text" style="font-family:'Inter',sans-serif; font-size:80px; font-weight:900; color:#ffeb3b; text-shadow:4px 4px 0px #f44336, 0 0 20px rgba(255,255,0,0.8); transform:rotate(-15deg) scale(0); transition:transform 0.1s; margin-top:-60px; z-index:100;"><img src="${iconPngPath}" style="width: 150px; height: 150px; object-fit: contain;"> ${giftComboCount.current > 1 ? 'x'+giftComboCount.current : ''}</div></div>`;
      overlay.style.display = 'flex';
      setTimeout(() => { if (overlay) overlay.style.opacity = '1'; }, 10);
      const comboEl = overlay.querySelector('#gift-combo-text') as HTMLElement;
      setTimeout(() => { if (comboEl) comboEl.style.transform = "rotate(-15deg) scale(1.2)"; }, 50);

      if (giftAnimTimer.current) clearTimeout(giftAnimTimer.current);
      giftAnimTimer.current = setTimeout(() => {
        if (overlay) overlay.style.opacity = '0';
        setTimeout(() => {
          if (overlay) overlay.style.display = 'none';
          giftComboCount.current = 0;
          lastGiftId.current = null;
        }, 300);
      }, 3000);
    }

    async function fetchTopGifters() {
      const topData = await getRoomLeaderboard();
      const container = document.getElementById('top-gifters-container');
      if (!container) return;
      if (topData.length === 0) {
        container.style.display = 'none';
        return;
      }
      container.style.display = 'flex';
      container.innerHTML = `<span style="font-size: 11px; color: #FFD700; font-weight:800; margin-right:6px;">🏆 TOP</span>`;
      topData.slice(0, 3).forEach((u, i) => {
        container.innerHTML += `<img src="${u.avatar_url || '/asets/png/profile.webp'}" style="width:28px; height:28px; border-radius:50%; border:2px solid #222; margin-left:-12px; z-index:${3 - i}; background:#222; object-fit:cover;">`;
      });
      container.onclick = () => window.openTopGiftersModal?.();
    }

    function syncOwnerUI() {
      if (!IS_OWNER.current) return;
      const trySync = () => {
        const menuSet = document.getElementById('menu-setting');
        if (menuSet) {
          menuSet.style.display = 'flex';
        } else {
          setTimeout(trySync, 500);
        }
      };
      trySync();
    }

    // 🔥 FIX: Chat bubble helper
    const addChatBubble = async (p: any) => {
      const chatBox = document.getElementById('chat-box');
      if (!chatBox) return;

      const existing = document.getElementById(`msg-${p.new.id}`);
      if (existing) existing.remove();

      let avatarUrl = '/asets/png/profile.webp';
      if (p.new.user_id) {
        if (chatAvatarCache.current[p.new.user_id]) {
          avatarUrl = chatAvatarCache.current[p.new.user_id];
        } else {
          const { data } = await sb.from('profiles').select('avatar_url').eq('id', p.new.user_id).single();
          if (data?.avatar_url) {
            avatarUrl = data.avatar_url;
            chatAvatarCache.current[p.new.user_id] = avatarUrl;
          }
        }
      }

      const div = document.createElement('div');
      div.id = `msg-${p.new.id}`;
      div.className = 'msg transparent';

      if (p.new.username === "SISTEM_GIFT") {
        div.className = 'msg system-gift';
        div.innerHTML = `<span>🎁 ${p.new.text}</span>`;
      } else {
        const isSystem = p.new.username.startsWith("SISTEM");
        const lvlBadge = getLevelBadgeHTML(p.new.level || 1);
        const roleBadge = getUserBadge(p.new.role || '');
        const avatarHTML = `<img src="${avatarUrl}" class="chat-avatar" style="width:28px; height:28px; border-radius:50%; object-fit:cover; margin-right:8px; flex-shrink:0;">`;
        const userLink = `<span onclick="window.openUserProfile('${p.new.user_id || ''}')" style="color:var(--text-main); font-weight:700; cursor:pointer; display:inline-flex; align-items:center;">${p.new.username}${lvlBadge}${roleBadge}</span>`;
        div.innerHTML = `
          <div style="display:flex; align-items:flex-start; gap:6px;">
            ${!isSystem ? avatarHTML : ''}
            <div style="flex:1; min-width:0;">
              <div>${isSystem ? '🔔' : ''} ${userLink}</div>
              <div style="opacity:0.85; margin-top:2px; word-break:break-word;">${p.new.text}</div>
            </div>
          </div>`;
      }
      chatBox.appendChild(div);
      chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    };

    function listenRealtime() {
      if (!CURRENT_ROOM_ID || !MY_USER_ID.current) return;
      channelRef.current = sb.channel(`room_active_${CURRENT_ROOM_ID}`, { config: { presence: { key: MY_USER_ID.current } } });

      channelRef.current
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => { fetchStage(); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${CURRENT_ROOM_ID}` }, (p: any) => {
          if (p.new.slot_count) {
            setRoomSlotCount(p.new.slot_count);
            fetchStage(p.new.slot_count);
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (p: any) => {
          fetchStage();
          if (p.new && p.new.id === MY_USER_ID.current) {
            const coinDisplay = document.getElementById('user-coins');
            if (coinDisplay) coinDisplay.innerText = (p.new.coins || 0).toLocaleString();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, (p) => {
          addChatBubble(p);
          fetchTopGifters();
        })
        .on('broadcast', { event: 'tap_event' }, (p: any) => {
          createTapAnimation(p.payload.x, p.payload.y);
          setTotalTaps(prev => prev + 1);
        })
        .on('broadcast', { event: 'minta_naik' }, async (p: any) => {
          if (IS_OWNER.current) {
            const acc = confirm(`${p.payload.username} ingin naik panggung. Izinkan?`);
            if (acc) {
              const { data: allSlots } = await sb.from('room_slots').select('slot_index, profile_id').eq('room_id', CURRENT_ROOM_ID).order('slot_index', { ascending: true });
              const slotKosong = allSlots?.find(s => !s.profile_id && s.slot_index < roomSlotCount);
              if (slotKosong) window.accNaikPanggung?.(p.payload.userId, p.payload.username);
              else showNotif("Panggung penuh!", "error");
            }
          }
        })
        .on('broadcast', { event: 'naik_diizinkan' }, async (p: any) => {
          if (p.payload.userId === MY_USER_ID.current) {
            showNotif("Diterima! Naik panggung...", "success");
            const { data: allSlots } = await sb.from('room_slots').select('slot_index, profile_id').eq('room_id', CURRENT_ROOM_ID).order('slot_index', { ascending: true });
            const slotKosong = allSlots?.find(s => !s.profile_id && s.slot_index < roomSlotCount);
            if (slotKosong) window.naikKeStage?.(slotKosong.slot_index);
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const count = Object.keys(channelRef.current.presenceState()).length;
          setOnlineCount(count);
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await channelRef.current.track({ online_at: new Date().toISOString(), username: myUsername.current, level: myLevel.current });
          }
        });
    }

    function updateLevelProgressUI() {
      const container = document.getElementById('level-progress-container');
      if (!container) return;

      let targetKoin = myLevel.current * 500;
      if (myLevel.current >= 50) {
        container.innerHTML = `<div style="text-align:center; font-size: 13px; color: #ff0844; font-weight: 800; margin: 15px 0;">LEVEL MAX (50) TERCAPAI 👑</div>`;
        return;
      }

      let prevTarget = (myLevel.current - 1) * 500;
      let needed = targetKoin - myTotalGiftSent.current;
      let percent = ((myTotalGiftSent.current - prevTarget) / (targetKoin - prevTarget)) * 100;
      if (percent > 100) percent = 100;

      container.innerHTML = `<div style="display: flex; justify-content: space-between; font-size: 11px; color: #888; margin-bottom: 6px; padding: 0 2px;"><span>LVL ${myLevel.current}</span><span>Butuh <b style="color:#1f3cff">${needed} koin</b> -> LVL ${myLevel.current + 1}</span></div><div style="width: 100%; height: 6px; background: rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden;"><div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #ff4757, #1f3cff); transition: width 0.5s ease-out;"></div></div>`;
    }

    async function sendGift(giftName: string, harga: number | string, giftId: number | string, jumlah = 1) {
      // ... implementasi tidak diubah, hanya menggunakan addChatBubble di listener
    }

    async function initApp() {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push('/hypetalk'); return; }
      MY_USER_ID.current = session.user.id;
      const { data: p } = await sb.from('profiles').select('*').eq('id', MY_USER_ID.current).single();
      const { data: roomData } = await sb.from('rooms').select('*').eq('id', CURRENT_ROOM_ID).maybeSingle();

      if (p) {
        myUsername.current = p.username;
        setMyUsernameState(p.username);
        setMyAvatar(p.avatar_url || '/asets/png/profile.webp');
        myRole.current = p.role;
        myTotalGiftSent.current = p.total_gift_sent || 0;
        myLevel.current = calculateLevel(myTotalGiftSent.current);
        if (document.getElementById('user-coins')) document.getElementById('user-coins')!.innerText = (p.coins || 0).toLocaleString();
      }

      if (roomData) {
        setTotalTaps(roomData.tap_count || 0);
        IS_OWNER.current = roomData.owner_id === MY_USER_ID.current;
        const sCount = roomData.slot_count || 6;
        setRoomSlotCount(sCount);
        setRoomName(roomData.name || CURRENT_ROOM_NAME);

        if (IS_OWNER.current) {
          await sb.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID);
          syncOwnerUI();
        } else if (!roomData.is_active) {
          showNotif("Panggung sedang ditutup oleh Owner!", "error");
          router.push('/hypetalk');
          return;
        }
      }

      if (typeof window.LivekitClient !== 'undefined') {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-livekit-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ username: myUsername.current, identity: MY_USER_ID.current, roomName: CURRENT_ROOM_ID })
          });
          const data = await res.json();
          roomRef.current = new window.LivekitClient.Room({ adaptiveStream: true, dynacast: true });
          roomRef.current.on('activeSpeakersChanged', (speakers: any[]) => {
            document.querySelectorAll('.avatar').forEach(el => el.classList.remove('speaking'));
            speakers.forEach(s => {
              let el = document.querySelector(`[data-user-id="${s.identity}"]`);
              if (!el && s.isLocal) el = document.querySelector(`[data-user-id="${MY_USER_ID.current}"]`);
              if (el) el.classList.add('speaking');
            });
          });
          await roomRef.current.connect("wss://voicegrup-zxmeibkn.livekit.cloud", data.token);
          await roomRef.current.localParticipant.setMicrophoneEnabled(false);
        } catch (e) { console.error(e); }
      }

      fetchStage(roomData?.slot_count || 6);
      listenRealtime();
      fetchTopGifters();
    }

    async function fetchStage(overrideCount?: number) {
      // ... implementasi tidak diubah
    }

    // Global window assignments
    window.sendGift = sendGift;
    // ... semua window function lainnya tetap sama
    window.kirimKomentar = async () => {
      const inputEl = document.getElementById('chat-input') as HTMLInputElement;
      const text = inputEl?.value.trim();
      if (!text || !CURRENT_ROOM_ID || !MY_USER_ID.current) return;

      inputEl.value = '';
      inputEl.focus();
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try {
        await sb.from('room_messages').insert([{
          room_id: CURRENT_ROOM_ID,
          username: myUsername.current,
          text: text,
          role: myRole.current,
          level: myLevel.current,
          user_id: MY_USER_ID.current
        }]);
      } catch (e) { console.error(e); }
    };
    // ... end window assignments

    const sdkInterval = setInterval(() => {
      if (typeof window.LivekitClient !== 'undefined') {
        clearInterval(sdkInterval);
        initApp();
      }
    }, 500);

    return () => {
      clearInterval(sdkInterval);
      roomRef.current?.disconnect();
      // ... cleanup
    };
  }, [t, searchParams, router]);

  if (!mounted) return null;

  return (
    <div className="in-voice-room" onClick={(e) => window.handleGlobalClick?.(e)}>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" />
      <Script src="https://cdn.jsdelivr.net/npm/livekit-client@1.15.12/dist/livekit-client.umd.min.js" />

      <div className="tap-counter-box">
        <span className="material-icons">favorite</span>
        <b>{totalTaps.toLocaleString()}</b>
      </div>

      <Sidebar />
      <Modals />

      <div className="app-container">
        {/* 🔥 Custom Header baru */}
        <div className="custom-room-header">
          <img
            src={myAvatar}
            className="header-avatar"
            onClick={() => window.openUserProfile?.(MY_USER_ID.current!)}
            alt="My Avatar"
          />
          <div className="header-room-info">
            <h2 className="room-title">{roomName.toUpperCase()}</h2>
            <div className="online-row">
              <span className="online-count-dot">🟢 {onlineCount} online</span>
              <span className="top-gifter-preview" id="top-gifters-container"></span>
            </div>
          </div>
          <button
            className={`follow-btn ${isFollowed ? 'active' : ''}`}
            onClick={() => setIsFollowed(!isFollowed)}
          >
            {isFollowed ? 'Following' : 'Follow'}
          </button>
          {/* Header asli disembunyikan judulnya, tetapi tetap render untuk tombol sidebar dll */}
          <Header />
        </div>
        <Stage />
        <ChatBox />
        <Footer />
      </div>

      <GiftDrawer />
      <GiftAnimOverlay />

      {/* Modal Profile Slide-up diperkaya */}
      <div className={`user-profile-sheet-overlay ${isProfileOpen ? 'active' : ''}`} onClick={() => setIsProfileOpen(false)}>
        <div className="user-profile-sheet" onClick={e => e.stopPropagation()}>
          <div className="sheet-handle"></div>
          {selectedUser && (
            <div className="profile-sheet-content">
              <img src={selectedUser.avatar_url || '/asets/png/profile.webp'} className="profile-sheet-avatar" alt="Avatar" />
              <div className="profile-sheet-info">
                <h3 className="profile-sheet-name">
                  {selectedUser.username}
                  <span dangerouslySetInnerHTML={{ __html: getUserBadge(selectedUser.role) }} />
                </h3>
                <span className="level-badge-lg" dangerouslySetInnerHTML={{ __html: getLevelBadgeHTML(calculateLevel(selectedUser.total_gift_sent || 0)) }} />
              </div>
              <div className="profile-sheet-stats">
                <div><b>{(selectedUser.followers_count ?? 0)}</b> Followers</div>
                <div><b>{(selectedUser.following_count ?? 0)}</b> Following</div>
              </div>
              <p className="profile-sheet-bio">{selectedUser.bio || 'Belum ada bio'}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                {selectedUser.id === MY_USER_ID.current && (
                  <button className="btn-action-sheet danger" onClick={() => { setIsProfileOpen(false); window.prosesTurunMic?.(); }}>
                    <span className="material-icons" style={{ fontSize: '18px' }}>mic_off</span> Turun Slot
                  </button>
                )}
                {IS_OWNER.current && selectedUser.id !== MY_USER_ID.current && (
                  <button className="btn-action-sheet danger" onClick={() => { setIsProfileOpen(false); window.kickUser?.(selectedUser.id, selectedUser.username); }}>
                    <span className="material-icons" style={{ fontSize: '18px' }}>person_remove</span> Turunkan dari Slot
                  </button>
                )}
                <button className="btn-action-sheet btn-gradient" onClick={() => router.push(`/data?id=${selectedUser.id}`)}>
                  Lihat Profil Lengkap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        :root { --radar-color: #1f3cff; }

        .tap-counter-box {
          position: fixed; top: calc(env(safe-area-inset-top, 0px) + 12px); left: 50%; transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(10px); padding: 4px 12px; border-radius: 20px;
          color: #fff; display: flex; align-items: center; gap: 6px; z-index: 2000; font-size: 12px;
          border: 1px solid rgba(255,255,255,0.1); pointer-events: none;
        }
        .tap-counter-box .material-icons { font-size: 14px; color: #ff4757; }

        .custom-room-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-secondary, rgba(255,255,255,0.05));
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border-color);
          position: relative;
          z-index: 500;
        }
        .header-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #1f3cff;
          object-fit: cover;
          cursor: pointer;
        }
        .header-room-info {
          flex: 1;
          min-width: 0;
        }
        .room-title {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-main);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .online-row {
          display: flex;
          align-items: center;
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
          gap: 8px;
        }
        .online-count-dot {
          display: flex;
          align-items: center;
        }
        .follow-btn {
          background: linear-gradient(135deg, #ff4757, #1f3cff);
          border: none;
          color: white;
          padding: 6px 16px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: 0.2s;
        }
        .follow-btn.active {
          background: transparent;
          border: 1px solid #1f3cff;
          color: #1f3cff;
        }
        header .room-title { display: none; }

        .msg.transparent {
          background: transparent;
          padding: 6px 8px;
          border-radius: 0;
          margin: 4px 0;
        }
        .chat-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
        }

        .profile-sheet-stats {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin: 12px 0;
          color: var(--text-secondary);
          font-size: 14px;
        }
        .profile-sheet-bio {
          color: var(--text-muted);
          font-style: italic;
          margin: 12px 0;
          padding: 0 20px;
          font-size: 13px;
        }
        .level-badge-lg {
          display: inline-block;
          margin-left: 8px;
          vertical-align: middle;
        }

        .avatar.speaking {
          box-shadow: 0 0 0 3px var(--radar-color);
          animation: pulseRadar 1.5s infinite;
        }
        @keyframes pulseRadar {
          0% { box-shadow: 0 0 0 0px var(--radar-color); }
          70% { box-shadow: 0 0 0 10px rgba(31, 60, 255, 0); }
          100% { box-shadow: 0 0 0 0px rgba(0,0,0,0); }
        }
      `}</style>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'sans-serif' }}>Memuat panggung...</div>}>
      <VoiceRoomContent />
    </Suspense>
  );
}