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
import ActionSheetroom from '@/components/room/ActionSheetroom';
import UserProfileSheetroom from '@/components/room/UserProfileSheetroom';
import HeaderRoom from '@/components/room/Headerroom';

import './Voice.css';

declare global {
  interface Window {
    __VOICE_ROOM_INIT__?: boolean;
    naikKeStage?: (index: number) => void;
    turunMic?: (index: number) => void;
    prosesTurunMic?: () => void;
    toggleActionMenu?: () => void;
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

  useEffect(() => {
    setMounted(true);
    window.__VOICE_ROOM_INIT__ = true;

    // Paksa body global menggunakan background hitam panggung saat berada di halaman ini
    document.body.style.backgroundColor = '#000000';

    const rawId = searchParams?.get('id');
    const rawName = searchParams?.get('name');
    const urlParams = new URLSearchParams(window.location.search);
    const CURRENT_ROOM_ID = rawId || urlParams.get('id');
    const CURRENT_ROOM_NAME = rawName || urlParams.get('name') || "Voice Room";

    window.toggleActionMenu = () => setIsActionMenuOpen(prev => !prev);

    window.updateRadarColor = (color: string) => {
      if (color === 'rgb') {
        document.body.classList.add('radar-rgb');
      } else {
        document.body.classList.remove('radar-rgb');
        document.documentElement.style.setProperty('--radar-color', color);
      }
      showNotif("Warna radar diperbarui!", "success");
    };

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
        if (newTotal % 5 === 0) sb.from('rooms').update({ tap_count: newTotal }).eq('id', CURRENT_ROOM_ID).then();
        return newTotal;
      });
      if (channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'tap_event', payload: { x, y } });
    };

    window.openUserProfile = async (userId: string) => {
      if (!userId) return;
      try {
        const { data: p, error } = await sb.from('profiles').select('*').eq('id', userId).single();
        if (error || !p) return;
        const { count: followers } = await sb.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId);
        const { count: following } = await sb.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId);
        setSelectedUser({ ...p, followersCount: followers || 0, followingCount: following || 0 });
        setIsProfileOpen(true);
      } catch (err) { console.error(err); }
    };

    function playGiftAnimation(giftId: number | string, forcedCombo: number | null = null) {
      const id = typeof giftId === 'string' ? parseInt(giftId) : (giftId || 1);
      const gifPath = `asets/gif/giftvid${id}.gif`;
      if (forcedCombo !== null) { giftComboCount.current = forcedCombo; lastGiftId.current = id; }
      else { if (lastGiftId.current === id) giftComboCount.current++; else { giftComboCount.current = 1; lastGiftId.current = id; } }

      let overlay = document.getElementById('gift-anim-overlay');
      if (!overlay) {
        overlay = document.createElement('div'); overlay.id = 'gift-anim-overlay';
        overlay.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:9999999; display:none; justify-content:center; align-items:center; background:rgba(0,0,0,0.2); opacity:0; transition:opacity 0.3s;";
        document.body.appendChild(overlay);
      }
      const iconPngPath = `asets/png/gift${id}.png`;
      overlay.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; position:relative;"><img id="gift-anim-img" src="${gifPath}?t=${Date.now()}" style="width:280px; max-width:85%; object-fit:contain; filter:drop-shadow(0 0 20px gold);"><div id="gift-combo-text" style="font-family:'Inter',sans-serif; font-size:80px; font-weight:900; color:#ffeb3b; text-shadow:4px 4px 0px #f44336, 0 0 20px rgba(255,255,0,0.8); transform:rotate(-15deg) scale(0); transition:transform 0.1s; margin-top:-60px; z-index:100;"><img src="${iconPngPath}" style="width: 150px; height: 150px; object-fit: contain;"> ${giftComboCount.current > 1 ? 'x'+giftComboCount.current : ''}</div></div>`;
      overlay.style.display = 'flex';
      setTimeout(() => { if(overlay) overlay.style.opacity = '1'; }, 10);
      const comboEl = overlay.querySelector('#gift-combo-text') as HTMLElement;
      setTimeout(() => { if(comboEl) comboEl.style.transform = "rotate(-15deg) scale(1.2)"; }, 50);

      if (giftAnimTimer.current) clearTimeout(giftAnimTimer.current);
      giftAnimTimer.current = setTimeout(() => {
        if(overlay) overlay.style.opacity = '0';
        setTimeout(() => { if(overlay) overlay.style.display = 'none'; giftComboCount.current = 0; lastGiftId.current = null; }, 300);
      }, 3000);
    }

    async function getRoomLeaderboard() {
      try {
        const { data: messages } = await sb.from('room_messages').select('text, role').eq('room_id', CURRENT_ROOM_ID).eq('username', 'SISTEM_GIFT');
        const hargaKado: Record<string, number> = { '1': 1, '2': 10, '3': 50, '4': 100, '5': 2000, '6': 5000, '7': 10000, '8': 25000, '9': 50000, '10': 100000 };
        let totals: Record<string, number> = {};
        messages?.forEach((m: any) => {
          const match = m.text.match(/^(.+) mengirim .+ x(\d+) ke/);
          if (match) {
            const user = match[1]; const count = parseInt(match[2]); const price = hargaKado[m.role] || 0;
            totals[user] = (totals[user] || 0) + (price * count);
          }
        });
        const names = Object.keys(totals).sort((a, b) => totals[b] - totals[a]).slice(0, 10);
        if (names.length === 0) return [];
        const { data: profs } = await sb.from('profiles').select('id, username, avatar_url, level, role, total_gift_sent').in('username', names);
        return (profs || []).map(p => ({ ...p, room_total: totals[p.username] })).sort((a, b) => b.room_total - a.room_total);
      } catch (e) { return []; }
    }

    async function fetchTopGifters() {
      const topData = await getRoomLeaderboard();
      const container = document.getElementById('top-gifters-container');
      if (!container) return;
      if (topData.length === 0) { container.style.display = 'none'; return; }
      container.style.display = 'flex';
      container.innerHTML = `<span style="font-size: 11px; color: #FFD700; font-weight:800; margin-right:4px;">🏆</span>`;
      topData.slice(0, 3).forEach((u, i) => {
        container.innerHTML += `<img src="${u.avatar_url || '/asets/png/profile.webp'}" style="width:24px; height:24px; border-radius:50%; border:1.5px solid #0a0a0a; margin-left:-8px; z-index:${3-i}; background:#151515; object-fit:cover;">`;
      });
      container.onclick = () => window.openTopGiftersModal?.();
    }

    function listenRealtime() {
      if (!CURRENT_ROOM_ID || !MY_USER_ID.current) return;
      channelRef.current = sb.channel(`room_active_${CURRENT_ROOM_ID}`, { config: { presence: { key: MY_USER_ID.current } } });

      channelRef.current
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => { fetchStage(); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${CURRENT_ROOM_ID}` }, (p: any) => {
          if(p.new.slot_count) { setRoomSlotCount(p.new.slot_count); fetchStage(p.new.slot_count); }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (p: any) => {
          if (p.new && p.new.id === MY_USER_ID.current) {
            const coinDisplay = document.getElementById('user-coins');
            if (coinDisplay) coinDisplay.innerText = (p.new.coins || 0).toLocaleString();
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, async (p: any) => {
          const newMsg = p.new;
          setChatMessages((prev) => {
            if (prev.find(m => m.id === newMsg.id || m.id === `temp-${newMsg.text}`)) return prev;
            if (newMsg.user_id && !newMsg.avatar_url) {
              sb.from('profiles').select('avatar_url, level').eq('id', newMsg.user_id).single().then(({data}) => {
                if (data) {
                  newMsg.avatar_url = data.avatar_url;
                  newMsg.level = data.level || newMsg.level;
                  setChatMessages(curr => curr.map(m => m.id === newMsg.id ? newMsg : m));
                }
              });
            }
            return [...prev, newMsg];
          });

          if (newMsg.username === "SISTEM_GIFT") {
            let comboValue = 1; let isDariSaya = false;
            const match = newMsg.text.match(/^(.+) mengirim .+ x(\d+) ke/);
            if (match) { isDariSaya = (match[1] === myUsername.current); comboValue = parseInt(match[2]); }
            else { isDariSaya = newMsg.text.startsWith(`${myUsername.current} `); }
            if (!isDariSaya) playGiftAnimation(parseInt(newMsg.role), comboValue);
            fetchTopGifters();
          }
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
          setOnlineUsers(count);
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await channelRef.current.track({ online_at: new Date().toISOString(), username: myUsername.current, level: myLevel.current });
          }
        });

      sb.from('room_messages').select('*, profiles:user_id(avatar_url, level)').eq('room_id', CURRENT_ROOM_ID).order('created_at', { ascending: false }).limit(25).then(({ data }) => {
        if (data) {
          const formattedData = data.reverse().map(m => ({
            ...m,
            avatar_url: m.profiles?.avatar_url,
            level: m.profiles?.level || m.level
          }));
          setChatMessages(formattedData);
        }
      });
    }

    async function sendGift(giftName: string, harga: number | string, giftId: number | string, jumlah = 1) {
      if (!selectedTargetId.current) return showNotif(t('select_target'), "warning");
      if (selectedTargetId.current === MY_USER_ID.current) return showNotif(t('gift_self_alert'), "warning");

      const totalHarga = (typeof harga === 'string' ? parseInt(harga) : harga) * jumlah;
      const coinDisplay = document.getElementById('user-coins');
      let currentCoins = coinDisplay ? parseInt(coinDisplay.innerText.replace(/[,.]/g, '')) : 0;
      if (currentCoins < totalHarga) return showNotif(t('min_topup_warning'), "error");

      currentCoins -= totalHarga;
      if (coinDisplay) coinDisplay.innerText = currentCoins.toLocaleString();

      playGiftAnimation(giftId);

      const comboKey = `${giftName}_${selectedTargetId.current}`;
      if (!activeCombos.current[comboKey]) activeCombos.current[comboKey] = { targetId: selectedTargetId.current, targetName: selectedTargetName.current, count: 0, pendingCoins: 0, msgId: null, syncTimer: null };
      const combo = activeCombos.current[comboKey];
      combo.count += jumlah; combo.pendingCoins += totalHarga;

      if (combo.syncTimer) clearTimeout(combo.syncTimer);
      combo.syncTimer = setTimeout(async () => {
        const coinsToDeduct = combo.pendingCoins; const currentCount = combo.count;
        const finalTargetId = combo.targetId; const finalTargetName = combo.targetName;
        const savedMsgId = combo.msgId;
        delete activeCombos.current[comboKey];

        try {
          const { data: newTotalGift, error } = await sb.rpc('transfer_gift', { sender_id: MY_USER_ID.current, receiver_id: finalTargetId, amount: coinsToDeduct });
          if (error) throw error;

          await sb.from('coin_history').insert([{ user_id: MY_USER_ID.current, transaction_type: 'send_gift', amount: -coinsToDeduct, description: `Kirim ${giftName} x${currentCount} ke ${finalTargetName}`, balance_after: currentCoins }]);
          let newLvl = calculateLevel(newTotalGift);
          myTotalGiftSent.current = newTotalGift; myLevel.current = newLvl;

          const teksFinal = `${myUsername.current} mengirim ${giftName} x${currentCount} ke ${finalTargetName}`;
          if (savedMsgId) await sb.from('room_messages').update({ text: teksFinal }).eq('id', savedMsgId);
          else {
            const { data } = await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM_GIFT", text: teksFinal, role: giftId.toString(), level: myLevel.current, user_id: MY_USER_ID.current }]).select();
            if (data && data.length > 0) activeCombos.current[comboKey] = { ...activeCombos.current[comboKey], msgId: data[0].id };
          }
        } catch (e) { showNotif(t('gift_fail'), "error"); }
      }, 600);
    }

    async function initApp() {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push('/hypetalk'); return; }
      MY_USER_ID.current = session.user.id;
      const { data: p } = await sb.from('profiles').select('*').eq('id', MY_USER_ID.current).single();
      const { data: roomData } = await sb.from('rooms').select('*, profiles:owner_id(id, username, avatar_url)').eq('id', CURRENT_ROOM_ID).maybeSingle();

      if (p) {
        myUsername.current = p.username; myRole.current = p.role;
        myAvatar.current = p.avatar_url || "/asets/png/profile.webp";
        myTotalGiftSent.current = p.total_gift_sent || 0;
        myLevel.current = calculateLevel(myTotalGiftSent.current);
        if (document.getElementById('user-coins')) document.getElementById('user-coins')!.innerText = (p.coins || 0).toLocaleString();
      }

      if (roomData) {
        setTotalTaps(roomData.tap_count || 0);
        IS_OWNER.current = roomData.owner_id === MY_USER_ID.current;
        const sCount = roomData.slot_count || 6;
        setRoomSlotCount(sCount);

        setRoomInfo({
          name: roomData.name || CURRENT_ROOM_NAME,
          ownerAvatar: roomData.profiles?.avatar_url,
          ownerName: roomData.profiles?.username,
          ownerId: roomData.profiles?.id
        });

        if (roomData.profiles?.id && roomData.profiles?.id !== MY_USER_ID.current) {
          const { data: isF } = await sb.from('followers').select('id').match({ follower_id: MY_USER_ID.current, following_id: roomData.profiles.id }).maybeSingle();
          setIsFollowingHost(!!isF);
        }

        if (IS_OWNER.current) await sb.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID);
      }

      if (typeof window.LivekitClient !== 'undefined') {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-livekit-token`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` }, body: JSON.stringify({ username: myUsername.current, identity: MY_USER_ID.current, roomName: CURRENT_ROOM_ID }) });
          const data = await res.json();
          roomRef.current = new window.LivekitClient.Room({ adaptiveStream: true, dynacast: true });
          roomRef.current.on('activeSpeakersChanged', (speakers: any[]) => {
            document.querySelectorAll('.avatar').forEach(el => el.classList.remove('speaking'));
            speakers.forEach(s => { let el = document.querySelector(`[data-user-id="${s.identity}"]`); if (!el && s.isLocal) el = document.querySelector(`[data-user-id="${MY_USER_ID.current}"]`); if (el) el.classList.add('speaking'); });
          });
          await roomRef.current.connect("wss://voicegrup-zxmeibkn.livekit.cloud", data.token);
          await roomRef.current.localParticipant.setMicrophoneEnabled(false);
        } catch (e) { console.error(e); }
      }

      fetchStage(roomData?.slot_count || 6);
      listenRealtime(); fetchTopGifters();
    }

    async function fetchStage(overrideCount?: number) {
      if (!CURRENT_ROOM_ID) return;
      const targetCount = overrideCount || roomSlotCount;
      const { data } = await sb.from('room_slots').select('*, profiles(*)').eq('room_id', CURRENT_ROOM_ID).order('slot_index');

      if (MY_USER_ID.current) {
        setIsOnStage(data?.some(s => s.profile_id === MY_USER_ID.current) || false);
      }

      const grid = document.getElementById('stage-grid');
      if (!grid || !data) return;
      grid.innerHTML = "";

      data.slice(0, targetCount).forEach((slot: any) => {
        const user = slot.profiles; const isMe = user?.id === MY_USER_ID.current;
        const item = document.createElement('div'); item.className = 'speaker-item';
        if (user) {
          const userLvl = user.level || 1;
          item.innerHTML = `
            <div class="avatar ${isMe ? 'active' : ''}" data-user-id="${user.id}" onclick="window.openUserProfile('${user.id}')">
              <img src="${user.avatar_url || '/asets/png/profile.webp'}" style="object-fit:cover;">
              <div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'}; position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.8); border-radius: 50%; width: 22px; height: 22px; align-items: center; justify-content: center; border: 2px solid #0a0a0a; z-index: 10;">
                <span class="material-icons" style="color: #e74c3c; font-size: 14px;">mic_off</span>
              </div>
            </div>
            <span class="name-label" style="color: #f8fafc; font-weight: 600; text-shadow: none;">
              <div style="display:flex; align-items:center; justify-content:center; gap:2px; flex-wrap:wrap; text-align:center;">
                ${user.username} ${getLevelBadgeHTML(userLvl)}
              </div>
            </span>`;
        } else {
          item.innerHTML = `<div class="avatar" style="border: 1px dashed #94a3b8; opacity: 0.5;" onclick="window.naikKeStage?.(${slot.slot_index})"><span class="material-icons" style="color:#94a3b8; font-size:24px;">add</span></div><span class="name-label" style="opacity:0.5; color:#94a3b8;">${t('empty_slot')}</span>`;
        }
        grid.appendChild(item);
      });
    }

    window.kirimKomentar = async () => {
      const inputEl = document.getElementById('chat-input') as HTMLInputElement;
      const text = inputEl?.value.trim();
      if (!text || !CURRENT_ROOM_ID || !MY_USER_ID.current) return;

      inputEl.value = '';
      inputEl.focus();

      const tempId = 'temp-' + Date.now();
      const tempMsg = {
        id: tempId,
        room_id: CURRENT_ROOM_ID,
        username: myUsername.current,
        text: text,
        role: myRole.current,
        level: myLevel.current,
        user_id: MY_USER_ID.current,
        avatar_url: myAvatar.current
      };
      setChatMessages(prev => [...prev, tempMsg]);

      try {
        const { error } = await sb.from('room_messages').insert([{
          room_id: CURRENT_ROOM_ID,
          username: myUsername.current,
          text: text,
          role: myRole.current,
          level: myLevel.current,
          user_id: MY_USER_ID.current
        }]);
        if (error) throw error;
      } catch (e) {
        console.error("Gagal kirim komentar", e);
        showNotif("Gagal kirim pesan", "error");
      }
    };

    window.mintaNaik = async () => {
      const { data: allSlots } = await sb.from('room_slots').select('slot_index, profile_id').eq('room_id', CURRENT_ROOM_ID).order('slot_index', { ascending: true });
      const slotKosong = allSlots?.find(s => !s.profile_id && s.slot_index < roomSlotCount);
      if (slotKosong) window.naikKeStage?.(slotKosong.slot_index);
      else showNotif("Panggung penuh! Tunggu giliran", "warning");
    };

    window.keluarRoom = async () => {
      if (IS_OWNER.current && confirm("Tutup panggung dan bersihkan riwayat? (Leaderboard akan direset)")) {
        await sb.from('room_slots').update({ profile_id: null }).eq('room_id', CURRENT_ROOM_ID);
        await sb.from('rooms').update({ is_active: false }).eq('id', CURRENT_ROOM_ID);
        await sb.from('room_messages').delete().eq('room_id', CURRENT_ROOM_ID);
      } else {
        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID.current).eq('room_id', CURRENT_ROOM_ID);
      }
      roomRef.current?.disconnect();
      window.location.href = '/lobby';
    };

    window.toggleMicSidebar = async (e: any) => {
      e?.preventDefault();
      if (!roomRef.current) return showNotif('Koneksi suara belum siap', "warning");
      const { data: onStage } = await sb.from('room_slots').select('*').eq('room_id', CURRENT_ROOM_ID).eq('profile_id', MY_USER_ID.current).single();
      if (!onStage) return showNotif('Kamu harus naik panggung dulu', "warning");

      try {
        const nextMicState = !isMicOn.current;
        await roomRef.current.localParticipant.setMicrophoneEnabled(nextMicState);
        await sb.from('profiles').update({ mic_off: !nextMicState }).eq('id', MY_USER_ID.current);
        isMicOn.current = nextMicState;
        setIsMicActive(nextMicState);
        fetchStage();
        showNotif(nextMicState ? 'Mic dinyalakan' : 'Mic dimatikan', 'info');
      } catch (err) {
        console.error(err);
        showNotif("Gagal merubah mic", "error");
      }
    };

    window.naikKeStage = async (idx) => {
      if (!MY_USER_ID.current) return showNotif("Login dulu!", "warning");
      if (idx >= roomSlotCount) return showNotif("Slot ini ditutup Owner", "warning");

      if (roomRef.current && roomRef.current.state === "connected") await roomRef.current.localParticipant.setMicrophoneEnabled(true);
      const { data: checkSlot } = await sb.from('room_slots').select('profile_id').match({ room_id: CURRENT_ROOM_ID, slot_index: idx }).single();
      if (checkSlot && checkSlot.profile_id !== null) {
        await roomRef.current?.localParticipant.setMicrophoneEnabled(false);
        return showNotif("Kursi sudah ditempati!", "warning");
      }

      await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID.current);
      await sb.from('room_slots').update({ profile_id: MY_USER_ID.current }).match({ room_id: CURRENT_ROOM_ID, slot_index: idx });
      await sb.from('profiles').update({ mic_off: false }).eq('id', MY_USER_ID.current);

      isMicOn.current = true;
      setIsMicActive(true);
      fetchStage();
    };

    window.prosesTurunMic = async () => {
      if (roomRef.current?.localParticipant) await roomRef.current.localParticipant.setMicrophoneEnabled(false);
      await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID.current);
      await sb.from('profiles').update({ mic_off: true }).eq('id', MY_USER_ID.current);
      isMicOn.current = false;
      setIsMicActive(false);
      fetchStage();
    };

    window.toggleRoomGiftDrawer = () => {
      window.dispatchEvent(new CustomEvent('openRoomGift'));
    };

    window.openRoomSetting = () => {
      const modal = document.getElementById('setting-modal');
      if (modal) {
        modal.classList.add('show');
      }
    };

    window.closeRoomSetting = () => { document.getElementById('setting-modal')?.classList.remove('show'); };

    window.saveRoomSetting = async () => {
      const newName = (document.getElementById('edit-room-name') as HTMLInputElement).value;
      const sysMsg = (document.getElementById('system-message') as HTMLInputElement).value;
      let newSlotCount = roomSlotCount;

      if (!newName) return showNotif(t('room_name_empty'), "warning");

      try {
        await sb.from('rooms').update({ name: newName, slot_count: newSlotCount }).eq('id', CURRENT_ROOM_ID);
        if (newSlotCount < roomSlotCount) await sb.from('room_slots').update({ profile_id: null }).eq('room_id', CURRENT_ROOM_ID).gte('slot_index', newSlotCount);
        if (sysMsg) await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `PENGUMUMAN: ${sysMsg}`, role: "admin" }]);
        setRoomSlotCount(newSlotCount);

        const url = new URL(window.location.href); url.searchParams.set('name', newName); window.history.pushState({}, '', url);
        const titleEl = document.querySelector('.vr-room-name') as HTMLElement;
        if(titleEl) titleEl.innerText = newName.toUpperCase();

        showNotif(`Pengaturan tersimpan`, "success");
        window.closeRoomSetting?.();
        fetchStage(newSlotCount);
      } catch (e: any) { showNotif("Gagal simpan", "error"); }
    };

    window.closeConfirmModal = () => {
      const m = document.getElementById('confirm-modal');
      if (m) m.style.display = 'none';
    };

    window.closeTopGiftersModal = () => {
      const m = document.getElementById('top-gifters-modal');
      if (m) m.style.display = 'none';
    };

    const fixMobileHeight = () => {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    window.addEventListener('resize', fixMobileHeight);
    window.addEventListener('orientationchange', fixMobileHeight);
    fixMobileHeight();

    const sdkInterval = setInterval(() => { if (typeof window.LivekitClient !== 'undefined') { clearInterval(sdkInterval); initApp(); } }, 500);

    // CLEANUP LIFECYCLE: Berfungsi membersihkan modifikasi elemen global saat keluar dari room
    return () => {
      clearInterval(sdkInterval);
      roomRef.current?.disconnect();
      window.removeEventListener('resize', fixMobileHeight);
      window.removeEventListener('orientationchange', fixMobileHeight);
      
      // Mengembalikan background body bawaan global css web utama
      document.body.style.backgroundColor = '';
      document.body.classList.remove('radar-rgb');
      document.documentElement.style.removeProperty('--radar-color');
    };
  }, [t, searchParams, router]);

  if (!mounted) return null;

  return (
    <div className="in-voice-room" onClick={(e) => window.handleGlobalClick?.(e)}>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" />
      <Script src="https://cdn.jsdelivr.net/npm/livekit-client@1.15.12/dist/livekit-client.umd.min.js" />

      <Modals />

      <div className="app-container">
        <HeaderRoom
          roomInfo={roomInfo}
          onlineUsers={onlineUsers}
          totalTaps={totalTaps}
          myUserId={MY_USER_ID.current}
          isFollowingHost={isFollowingHost}
          setIsFollowingHost={setIsFollowingHost}
        />

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

    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="voice-room-fallback">Memuat panggung...</div>}>
      <VoiceRoomContent />
    </Suspense>
  );
}
