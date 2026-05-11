'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Script from 'next/script';
import { useSearchParams, useRouter } from 'next/navigation'; 
import { supabase as sb } from '@/lib/supabase'; 
import { useTranslation } from 'react-i18next';
import { showNotif, getUserBadge } from '@/lib/ui-utils'; 

import Modals from '@/components/room/Modalsroom';
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
  const [isMicActive, setIsMicActive] = useState(false); // 🔥 STATE MIC UI
  
  const myTotalGiftSent = useRef(0);
  const myLevel = useRef(1);
  const isMicOn = useRef(false);
  const giftComboCount = useRef(0);
  const lastGiftId = useRef<number | null>(null);
  const giftAnimTimer = useRef<NodeJS.Timeout | null>(null);
  const activeCombos = useRef<Record<string, any>>({});
  
  const myUsername = useRef("Guest");
  const myAvatar = useRef("/asets/png/profile.webp"); // Simpan avatar buat chat instan
  const myRole = useRef("user");
  const MY_USER_ID = useRef<string | null>(null);
  const IS_OWNER = useRef(false);
  const selectedTargetId = useRef<string | null>(null);
  const selectedTargetName = useRef("");

  useEffect(() => {
    setMounted(true);
    window.__VOICE_ROOM_INIT__ = true;

    const rawId = searchParams?.get('id');
    const rawName = searchParams?.get('name');
    const urlParams = new URLSearchParams(window.location.search);
    const CURRENT_ROOM_ID = rawId || urlParams.get('id'); 
    const CURRENT_ROOM_NAME = rawName || urlParams.get('name') || "Voice Room";

    window.toggleActionMenu = () => setIsActionMenuOpen(prev => !prev);
     
    // 🔥 FIX 7: SINKRONISASI WARNA RADAR DARI MODAL 🔥
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

    function calculateLevel(giftSent: number) {
      let lvl = Math.floor(giftSent / 500) + 1; 
      if (lvl > 50) lvl = 50; return lvl;
    }

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

    // 🔥 FIX 6: TAMPILKAN TOP GIFTERS MENGAMBANG DI KANAN HEADER 🔥
    async function fetchTopGifters() {
        const topData = await getRoomLeaderboard();
        const container = document.getElementById('top-gifters-container');
        if (!container) return;
        if (topData.length === 0) { container.style.display = 'none'; return; }
        container.style.display = 'flex';
        container.innerHTML = `<span style="font-size: 11px; color: #FFD700; font-weight:800; margin-right:4px;">🏆</span>`;
        topData.slice(0, 3).forEach((u, i) => {
            container.innerHTML += `<img src="${u.avatar_url || '/asets/png/profile.webp'}" style="width:24px; height:24px; border-radius:50%; border:1.5px solid #0B141A; margin-left:-8px; z-index:${3-i}; background:#222; object-fit:cover;">`;
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
            // Cegah duplikat karena fitur Optimistic Update
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

        // Tarik Riwayat Pesan Awal
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
          color: #fff !important; font-size: 9px; font-weight: 900; 
          padding: 2px 6px; border-radius: 12px; margin-left: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3); vertical-align: middle;
        ">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          ${lvl}
        </span>`;
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
                const calculatedUserLvl = Math.floor((user.total_gift_sent || 0) / 500) + 1;
                item.innerHTML = `
                    <div class="avatar ${isMe ? 'active' : ''}" data-user-id="${user.id}" onclick="window.openUserProfile('${user.id}')">
                        <img src="${user.avatar_url || '/asets/png/profile.webp'}" style="object-fit:cover;">
                        <div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'}; position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7); border-radius: 50%; width: 22px; height: 22px; align-items: center; justify-content: center; border: 2px solid white; z-index: 10;">
                            <span class="material-icons" style="color: #e74c3c; font-size: 14px;">mic_off</span>
                        </div>
                    </div>
                    <span class="name-label" style="color: #ffffff; font-weight: 600; text-shadow: none;">
                        <div style="display:flex; align-items:center; justify-content:center; gap:2px; flex-wrap:wrap; text-align:center;">
                            ${user.username}
                        </div>
                    </span>`;
            } else {
                item.innerHTML = `<div class="avatar" style="border: 1px dashed rgba(255,255,255,0.2); opacity: 0.5;" onclick="window.naikKeStage?.(${slot.slot_index})"><span class="material-icons" style="color:#aaa; font-size:24px;">add</span></div><span class="name-label" style="opacity:0.5; color:#fff;">${t('empty_slot')}</span>`;
            }
            grid.appendChild(item);
        });
    }

    // 🔥 FIX 4: KIRIM KOMENTAR LANGSUNG MUNCUL TANPA REFRESH (OPTIMISTIC UPDATE) 🔥
    window.kirimKomentar = async () => {
        const inputEl = document.getElementById('chat-input') as HTMLInputElement;
        const text = inputEl?.value.trim();
        if (!text || !CURRENT_ROOM_ID || !MY_USER_ID.current) return;

        inputEl.value = ''; 
        inputEl.focus(); 
        
        // Optimistic Update: Langsung tampilin di UI detik ini juga
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

    // 🔥 FIX 3: LOGIKA MIC ON/OFF ANTI ERROR (RE-RENDER AMAN) 🔥
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
            setIsMicActive(nextMicState); // Trigger Update Tombol
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
        const d = document.getElementById('room-gift-drawer');
        const o = document.getElementById('room-drawer-overlay');
        d?.classList.toggle('open'); o?.classList.toggle('show');
        if (d?.classList.contains('open')) {
            sb.from('room_slots').select('profile_id, profiles(username, avatar_url)').eq('room_id', CURRENT_ROOM_ID).lt('slot_index', roomSlotCount).not('profile_id', 'is', null).neq('profile_id', MY_USER_ID.current)
            .then(({data}) => {
                const tc = document.getElementById('gift-targets');
                if(!tc) return; tc.innerHTML = "";
                if(!data?.length) { 
                    selectedTargetId.current = null; selectedTargetName.current = "";
                    tc.innerHTML = `<span style="font-size:12px; color:#888;">Hanya kamu di sini</span>`; return; 
                }
                data.forEach((s:any, i) => {
                    const isSelected = selectedTargetId.current === s.profile_id;
                    const div = document.createElement('div'); div.className = `target-user ${isSelected ? 'selected' : ''}`;
                    div.onclick = () => { selectedTargetId.current = s.profile_id; selectedTargetName.current = s.profiles.username; window.toggleRoomGiftDrawer?.(); window.toggleRoomGiftDrawer?.(); };
                    div.innerHTML = `<img src="${s.profiles.avatar_url || '/asets/png/profile.webp'}" class="target-avatar" style="object-fit:cover;"><span>${s.profiles.username}</span>`;
                    tc.appendChild(div);
                    if(!selectedTargetId.current && i === 0) { selectedTargetId.current = s.profile_id; selectedTargetName.current = s.profiles.username; div.classList.add('selected'); }
                });
            });
        }
    };

    window.openRoomSetting = () => {
        const modal = document.getElementById('setting-modal');
        if (modal) {
            modal.classList.add('show');
            const body = modal.querySelector('.modal-body');
            
            if (body && !body.querySelector('.slot-settings')) {
                const slotDiv = document.createElement('div');
                slotDiv.className = 'slot-settings';
                const slotLabel = document.createElement('label');
                slotLabel.style.cssText = 'margin-top:20px; display:block; font-size: 13px; font-weight: 700; color: #888; margin-bottom: 8px;';
                slotLabel.innerText = 'Jumlah Kursi Panggung';
                slotDiv.appendChild(slotLabel);

                const slotSelect = document.createElement('select');
                slotSelect.id = 'edit-room-slots';
                slotSelect.style.cssText = 'width: 100%; padding: 12px; background: rgba(0,0,0,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-weight: bold; margin-bottom: 15px; outline:none;';
                
                [2, 4, 6].forEach(num => {
                    const opt = document.createElement('option');
                    opt.value = String(num); opt.text = `${num} Kursi`;
                    if (num === roomSlotCount) opt.selected = true;
                    slotSelect.appendChild(opt);
                });
                slotDiv.appendChild(slotSelect);
                const saveBtn = body.querySelector('.btn-save-setting');
                if (saveBtn) body.insertBefore(slotDiv, saveBtn); else body.appendChild(slotDiv);
            }
        }
    };
    
    window.closeRoomSetting = () => { document.getElementById('setting-modal')?.classList.remove('show'); };
    
    window.saveRoomSetting = async () => {
        const newName = (document.getElementById('edit-room-name') as HTMLInputElement).value;
        const sysMsg = (document.getElementById('system-message') as HTMLInputElement).value;
        const slotSelect = document.getElementById('edit-room-slots') as HTMLSelectElement;
        
        let newSlotCount = roomSlotCount;
        if (slotSelect) newSlotCount = parseInt(slotSelect.value) || 6;
        if (!newName) return showNotif(t('room_name_empty'), "warning");
        
        try {
            await sb.from('rooms').update({ name: newName, slot_count: newSlotCount }).eq('id', CURRENT_ROOM_ID);
            if (newSlotCount < roomSlotCount) await sb.from('room_slots').update({ profile_id: null }).eq('room_id', CURRENT_ROOM_ID).gte('slot_index', newSlotCount); 
            if (sysMsg) await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `PENGUMUMAN: ${sysMsg}`, role: "admin" }]);
            setRoomSlotCount(newSlotCount);

            const url = new URL(window.location.href); url.searchParams.set('name', newName); window.history.pushState({}, '', url); 
            const titleEl = document.querySelector('.vr-room-name') as HTMLElement;
            if(titleEl) titleEl.innerText = newName.toUpperCase();
            
            showNotif(`Pengaturan tersimpan (${newSlotCount} Kursi)`, "success");
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

    return () => {
        clearInterval(sdkInterval); 
        roomRef.current?.disconnect();
        window.removeEventListener('resize', fixMobileHeight);
        window.removeEventListener('orientationchange', fixMobileHeight);
        ['room-gift-drawer', 'room-drawer-overlay', 'gift-anim-overlay'].forEach(id => document.getElementById(id)?.remove());
    };
  }, [t, searchParams, router]);

  if (!mounted) return null;

  return (
    <div className="in-voice-room" onClick={(e) => window.handleGlobalClick?.(e)}>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" />
      <Script src="https://cdn.jsdelivr.net/npm/livekit-client@1.15.12/dist/livekit-client.umd.min.js" />
      
      <Modals />
      
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* 🔥 FIX 5 & 6: HEADER BARU DENGAN TAP COUNTER & TOP GIFTER 🔥 */}
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
             {/* Kumpulan Profil Top Gifter */}
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
        
        {/* 🔥 FIX 1: CHAT BOX DI ATAS FOOTER DENGAN PADDING AMAN 🔥 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '90px', overflow: 'hidden' }}>
          <ChatBox messages={chatMessages} />
        </div>
        
        <Footer />
      </div> 
      
      <GiftDrawer /><GiftAnimOverlay />

      {/* 🔥 FIX 2: SLIDE-UP MENU AKSI (TANPA TOMBOL GIFT) 🔥 */}
      <div className={`user-profile-sheet-overlay ${isActionMenuOpen ? 'active' : ''}`} onClick={() => setIsActionMenuOpen(false)}>
        <div className="user-profile-sheet" onClick={e => e.stopPropagation()}>
          <div className="sheet-handle"></div>
          <h3 style={{ color: '#fff', marginBottom: '20px', fontWeight: 800 }}>Aksi Ruangan</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {!isOnStage ? (
              <button className="btn-action-sheet btn-gradient" onClick={() => { setIsActionMenuOpen(false); window.mintaNaik?.(); }}>
                <span className="material-icons" style={{ fontSize: '20px' }}>front_hand</span> Minta Naik Panggung
              </button>
            ) : (
              <>
                <button className="btn-action-sheet" style={{ background: isMicActive ? 'rgba(255,255,255,0.1)' : 'rgba(255, 71, 87, 0.2)', color: isMicActive ? '#fff' : '#ff4757' }} onClick={(e) => { setIsActionMenuOpen(false); window.toggleMicSidebar?.(e); }}>
                  <span className="material-icons" style={{ fontSize: '20px' }}>{isMicActive ? 'mic' : 'mic_off'}</span> 
                  {isMicActive ? 'Matikan Mic' : 'Nyalakan Mic'}
                </button>
                <button className="btn-action-sheet danger" onClick={() => { setIsActionMenuOpen(false); window.prosesTurunMic?.(); }}>
                  <span className="material-icons" style={{ fontSize: '20px' }}>logout</span> Turun Panggung
                </button>
              </>
            )}

            {IS_OWNER.current && (
              <button className="btn-action-sheet" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => { setIsActionMenuOpen(false); window.openRoomSetting?.(); }}>
                <span className="material-icons" style={{ fontSize: '20px' }}>settings</span> Pengaturan Panggung
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL PROFILE SLIDE-UP */}
      <div className={`user-profile-sheet-overlay ${isProfileOpen ? 'active' : ''}`} onClick={() => setIsProfileOpen(false)}>
        <div className="user-profile-sheet" onClick={e => e.stopPropagation()}>
          <div className="sheet-handle"></div>
          {selectedUser && (
            <div className="profile-sheet-content">
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '15px' }}>
                 <img src={selectedUser.avatar_url || '/asets/png/profile.webp'} className="profile-sheet-avatar" alt="Avatar" style={{ marginBottom: '0' }}/>
                 <div style={{ position: 'absolute', bottom: '0', right: '-10px' }}>
                    <span dangerouslySetInnerHTML={{ 
                      __html: `<span style="display:inline-flex;align-items:center;background:linear-gradient(135deg,#ff0844,#ffb199);color:#fff;font-size:10px;font-weight:900;padding:4px 8px;border-radius:12px;border:2px solid #1A2228;box-shadow:0 2px 4px rgba(0,0,0,0.5);"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>&nbsp;${Math.floor((selectedUser.total_gift_sent || 0) / 500) + 1}</span>` 
                    }} />
                 </div>
              </div>
              <div className="profile-sheet-info">
                <h3 className="profile-sheet-name">
                  {selectedUser.username}
                  <span dangerouslySetInnerHTML={{ __html: getUserBadge(selectedUser.role) }} />
                </h3>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', margin: '20px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '15px 0' }}>
                 <div style={{ textAlign: 'center' }}>
                    <b style={{ color: '#fff', fontSize: '20px' }}>{selectedUser.followersCount || 0}</b>
                    <div style={{ color: '#888', fontSize: '12px', marginTop: '2px' }}>Pengikut</div>
                 </div>
                 <div style={{ textAlign: 'center' }}>
                    <b style={{ color: '#fff', fontSize: '20px' }}>{selectedUser.followingCount || 0}</b>
                    <div style={{ color: '#888', fontSize: '12px', marginTop: '2px' }}>Mengikuti</div>
                 </div>
              </div>
              <p style={{ color: '#aaa', fontSize: '14px', margin: '0 0 25px', padding: '0 20px', lineHeight: '1.5', fontStyle: selectedUser.bio ? 'normal' : 'italic' }}>
                 {selectedUser.bio || 'Belum ada bio'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
      
      <style jsx global>{`
        :root { --radar-color: #1f3cff; }
        body:has(.in-voice-room) { background-color: #0B141A !important; }
        .in-voice-room { background-color: #0B141A !important; color: #ffffff !important; }
        .in-voice-room .app-container { background-color: #0B141A !important; }

        .vr-custom-header {
           display: flex; align-items: center; justify-content: space-between;
           padding: 10px 16px; background: rgba(11, 20, 26, 0.85); backdrop-filter: blur(12px);
           position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 500px;
           z-index: 1000; border-bottom: 1px solid rgba(255,255,255,0.05); box-sizing: border-box;
        }
        .vr-header-left { display: flex; align-items: center; gap: 12px; }
        .vr-owner-avatar { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid #1f3cff; cursor: pointer; }
        .vr-room-name { font-size: 15px; font-weight: 800; color: #fff; margin: 0 0 2px 0; text-transform: uppercase; }
        .vr-room-stats { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #1da1f2; font-weight: 600; }
        .vr-btn-follow { background: linear-gradient(135deg, #ff4757, #1f3cff); border: none; color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; cursor: pointer; }

        .tap-emoji-fly { position: fixed; pointer-events: none; z-index: 999999; font-size: 28px; user-select: none; animation: flyUpAnim 1s ease-out forwards; }
        @keyframes flyUpAnim { 0% { transform: translateY(0) scale(1) rotate(0); opacity: 1; } 100% { transform: translateY(-200px) translateX(${Math.random() * 80 - 40}px) scale(1.5) rotate(20deg); opacity: 0; } }

        .user-profile-sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 10005; opacity: 0; visibility: hidden; transition: 0.3s; }
        .user-profile-sheet-overlay.active { opacity: 1; visibility: visible; }
        .user-profile-sheet {
          position: absolute; bottom: 0; left: 0; right: 0; background: #1A2228 !important; border-top-left-radius: 24px; border-top-right-radius: 24px;
          padding: 20px 20px 40px; transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1); text-align: center; border-top: 1px solid rgba(255,255,255,0.05); box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
        }
        .user-profile-sheet-overlay.active .user-profile-sheet { transform: translateY(0); }
        .sheet-handle { width: 40px; height: 5px; background: #444; border-radius: 10px; margin: 0 auto 20px; }
        .profile-sheet-avatar { width: 95px; height: 95px; border-radius: 50%; border: 3px solid transparent; background-clip: padding-box, border-box; background-origin: padding-box, border-box; background-image: linear-gradient(#1A2228, #1A2228), linear-gradient(135deg, #ff4757, #1f3cff); object-fit: cover; }
        .profile-sheet-name { font-size: 18px; font-weight: 800; color: #fff; margin: 0; display: flex; align-items: center; justify-content: center; gap: 5px; }
        
        .btn-action-sheet { width: 100%; padding: 14px; border: none; border-radius: 14px; font-weight: 800; font-size: 14px; cursor: pointer; transition: transform 0.2s, opacity 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-action-sheet.danger { background: rgba(255, 71, 87, 0.1); color: #ff4757; border: 1px solid rgba(255,71,87,0.2); }
        .btn-action-sheet.btn-gradient { background: linear-gradient(135deg, #ff4757, #1f3cff); color: #fff; box-shadow: 0 4px 15px rgba(31, 60, 255, 0.3); }
        .btn-action-sheet:active { transform: scale(0.96); opacity: 0.9; }

        .avatar.speaking { box-shadow: 0 0 0 3px var(--radar-color); animation: pulseRadar 1.5s infinite; }
        @keyframes pulseRadar { 0% { box-shadow: 0 0 0 0px var(--radar-color); } 70% { box-shadow: 0 0 0 10px rgba(31, 60, 255, 0); } 100% { box-shadow: 0 0 0 0px rgba(0,0,0,0); } }
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
