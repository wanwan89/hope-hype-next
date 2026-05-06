'use client'; // Wajib ada biar Vanilla JS lu bisa jalan di browser

import { useEffect } from 'react';
import Script from 'next/script';
import { supabase as sb } from '@/lib/supabase'; 

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
    // 🔥 FIX 1: Nama unik agar tidak bentrok dengan Home 🔥
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
    closeConfirmModal?: () => void;
    openTopGiftersModal?: () => void;
    closeTopGiftersModal?: () => void;
  }
  var LivekitClient: any;
  var toast: (title: string, msg: string, type: string) => void;
}

export default function RoomPage() {
  
  useEffect(() => {
    // Paksa reset gembok setiap kali halaman ini dimuat ulang oleh React
    window.__VOICE_ROOM_INIT__ = true;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const urlParams = new URLSearchParams(window.location.search);
    const CURRENT_ROOM_ID = urlParams.get('id'); 
    const CURRENT_ROOM_NAME = urlParams.get('name') || "Voice Room";

    let IS_OWNER = false; 
    let myRole = "user"; 
    let myUsername = "Guest";
    let MY_USER_ID: string | null = null;
    let selectedTargetId: string | null = null; 
    let selectedTargetName = "";

    let myTotalGiftSent = 0; 
    let myLevel = 1;

    let giftComboCount = 0;
    let lastGiftId: number | null = null;
    let giftAnimTimer: NodeJS.Timeout | null = null;
    let room: any;

    const titleEl = document.querySelector('.room-title') as HTMLElement;
    if (titleEl) titleEl.innerText = CURRENT_ROOM_NAME.toUpperCase();

    // --- FUNGSI TOGGLE GIFT (ROOM ONLY) ---
    function toggleRoomGiftDrawer(e?: any) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const drawer = document.getElementById('gift-drawer');
        const overlay = document.getElementById('drawer-overlay');
        
        if(drawer) drawer.classList.toggle('open');
        if(overlay) overlay.classList.toggle('show');
        
        if (drawer && drawer.classList.contains('open')) {
            updateGiftTargets();
            if (typeof updateLevelProgressUI === "function") updateLevelProgressUI(); 
        }
    }

    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    if (chatInput) {
        chatInput.addEventListener('focus', () => {
            const drawer = document.getElementById('gift-drawer');
            // 🔥 FIX 2: Panggil fungsi baru pas keyboard naik 🔥
            if (drawer && drawer.classList.contains('open')) {
                toggleRoomGiftDrawer(); 
            }
            
            setTimeout(() => {
                window.scrollTo(0, 0);
                const chatBox = document.getElementById('chat-box');
                if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
            }, 300);
        });
    }

    function getLevelStyle(level: string | number) {
        const lvl = typeof level === 'string' ? parseInt(level) : (level || 1);
        if (lvl >= 5) return { color: "#FF0055", textShadow: "0 0 8px rgba(255, 0, 85, 0.8)", title: "LGDN" };
        if (lvl === 4) return { color: "#00E5FF", textShadow: "0 0 5px rgba(0, 229, 255, 0.7)", title: "SLTN" };
        if (lvl === 3) return { color: "#BB86FC", textShadow: "none", title: "PATRON" };
        if (lvl === 2) return { color: "#FFD700", textShadow: "none", title: "SPTR" };
        return { color: "inherit", textShadow: "none", title: "" };
    }

    function getLevelBadgeHTML(level: string | number) {
        const style = getLevelStyle(level);
        if (!style.title) return ""; 
        return `<span style="font-size: 9px; font-weight: 800; background: ${style.color}; color: #000; padding: 2px 4px; border-radius: 3px; margin-left: 5px; vertical-align: middle;">${style.title}</span>`;
    }

    function getUserBadge(role: string) {
      if (!role) return "";
      let badge = "";
      const r = role.toLowerCase();
      if (r === "admin") badge += `<span class="admin-badge" style="background: #ff4757; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 5px; font-weight: bold; height: 16px; display: inline-flex; align-items: center; vertical-align: middle;">DEV</span>`;
      if (r === "verified") badge += `<span class="verified-badge" style="margin-left:5px; vertical-align:middle;"><svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1DA1F2"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
      const crowBadges: Record<string, string> = { crown1: "asets/png/crown1.png", crown2: "asets/png/crown2.png", crown3: "asets/png/crown3.png" };
      if (crowBadges[r]) badge += `<img src="${crowBadges[r]}" style="width:18px;height:18px;margin-left:5px;vertical-align:middle;object-fit:contain;display:inline-block;" alt="${r}">`;
      return badge;
    }

    function playVIPEntrance(username: string, level: number) {
        if (level < 4) return; 

        if (!document.getElementById('vip-anim-styles-clean')) {
            const style = document.createElement('style');
            style.id = 'vip-anim-styles-clean';
            style.innerHTML = `
                @keyframes vipSlideInClean {
                    0% { transform: translate(-150vw, -50%); opacity: 0; }
                    15% { transform: translate(-50%, -50%); opacity: 1; }
                    85% { transform: translate(-50%, -50%); opacity: 1; } 
                    100% { transform: translate(150vw, -50%); opacity: 0; }
                }
                .vip-banner-clean {
                    position: fixed;
                    top: 60%; left: 50%; z-index: 1000000;
                    padding: 12px 28px; border-radius: 12px; 
                    display: flex; align-items: center; justify-content: center;
                    gap: 8px; overflow: hidden; pointer-events: none;
                    width: max-content; max-width: 90%;
                    animation: vipSlideInClean 4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
            `;
            document.head.appendChild(style);
        }

        let overlay = document.getElementById('vip-entrance-overlay');
        if (overlay) overlay.remove(); 

        overlay = document.createElement('div');
        overlay.id = 'vip-entrance-overlay';
        overlay.className = 'vip-banner-clean';
        
        let bgStyle = "", textHTML = "";

        if (level === 4) { 
            bgStyle = "background: rgba(14, 165, 233, 0.95); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(14, 165, 233, 0.4); backdrop-filter: blur(10px);";
            textHTML = `<span style="color:#fff; font-size: 13px; font-weight: 600;">SULTAN</span> <b style="color:#fff; font-size: 15px; font-weight: 800; text-transform: uppercase; margin: 0 4px;">${username}</b> <span style="color:#fff; font-size: 13px; font-weight: 600;">MEMASUKI ROOM</span>`;
        } else if (level >= 5) { 
            bgStyle = "background: rgba(225, 29, 72, 0.95); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(225, 29, 72, 0.4); backdrop-filter: blur(10px);";
            textHTML = `<span style="color:#fff; font-size: 13px; font-weight: 600;">LEGEND</span> <b style="color:#fff; font-size: 15px; font-weight: 800; text-transform: uppercase; margin: 0 4px;">${username}</b> <span style="color:#fff; font-size: 13px; font-weight: 600;">MEMASUKI ROOM</span>`;
        }

        overlay.setAttribute('style', bgStyle);
        overlay.innerHTML = `<div style="display: flex; align-items: center;">${textHTML}</div>`;
        document.body.appendChild(overlay);
        setTimeout(() => { if (overlay) overlay.remove(); }, 4100);
    }

    async function getCachedProfile(userId: string) {
      const key = `hh_profile_${userId}`;
      const cachedData = sessionStorage.getItem(key);
      if (cachedData) return JSON.parse(cachedData);
      const { data } = await sb.from('profiles').select('username, avatar_url, role, coins, total_gift_sent, level').eq('id', userId).single();
      if (data) sessionStorage.setItem(key, JSON.stringify(data));
      return data;
    }

    const LIVEKIT_URL = "wss://voicegrup-zxmeibkn.livekit.cloud"; 

    async function initApp() {
        const canEnter = await checkUser(); 
        if (!canEnter) return; 
        initLiveKit(); 
        listenRealtime(); 
        fetchTopGifters(); 
    }

    async function initLiveKit() {
        if (typeof LivekitClient === 'undefined') return;
        try {
            const roomName = CURRENT_ROOM_ID || "main-room"; 
            const response = await fetch(`${supabaseUrl}/functions/v1/get-livekit-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey || '', 'Authorization': `Bearer ${supabaseKey}` },
                body: JSON.stringify({ username: myUsername, identity: MY_USER_ID, roomName: roomName })
            });
            const data = await response.json();
            if (!data.token) throw new Error("No token");
            room = new LivekitClient.Room({ adaptiveStream: true, dynacast: true });
            room.on(LivekitClient.RoomEvent.TrackSubscribed, (track: any) => {
                if (track.kind === "audio") {
                    const element = track.attach();
                    document.body.appendChild(element);
                    element.play().catch(() => {});
                }
            });
            await room.connect(LIVEKIT_URL, data.token);
            await room.localParticipant.setMicrophoneEnabled(false);
        } catch (e: any) { console.error("LK Error", e); }
    }

    async function fetchStage() {
        if (!CURRENT_ROOM_ID || CURRENT_ROOM_ID === "null") return;
        let { data: slots } = await sb.from('room_slots').select(`slot_index, profile_id, profiles (username, avatar_url, role, mic_off, level)`).eq('room_id', CURRENT_ROOM_ID).order('slot_index', { ascending: true });
        if (!slots || slots.length === 0) {
            const newSlots = Array.from({length: 6}, (_, i) => ({ room_id: CURRENT_ROOM_ID, slot_index: i, profile_id: null }));
            await sb.from('room_slots').insert(newSlots);
            return renderStage(newSlots); 
        }
        renderStage(slots);
    }

    function renderStage(slots: any[]) {
        const grid = document.getElementById('stage-grid');
        if (!grid) return;
        grid.innerHTML = "";
        slots.forEach((slot, i) => {
            const user = slot.profiles;
            const isMe = slot.profile_id === MY_USER_ID;
            const item = document.createElement('div');
            item.className = 'speaker-item';
            if (user) {
                const lvlStyle = getLevelStyle(user.level || 1);
                item.innerHTML = `
                    <div class="avatar ${isMe ? 'active' : ''}" data-user-id="${slot.profile_id}" onclick="${isMe ? `turunMic(${i})` : `toggleKickBtn(this, ${IS_OWNER && !isMe})`}">
                        <img src="${user.avatar_url || 'asets/png/profile.png'}">
                        <div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'};">
                            <span class="material-icons">mic_off</span>
                        </div>
                    </div>
                    <span class="name-label" style="color: ${lvlStyle.color}; font-weight: bold;">
                          ${user.username}${getLevelBadgeHTML(user.level || 1)}${getUserBadge(user.role)}
                    </span>`; 
            } else {
                item.innerHTML = `
                    <div class="avatar" onclick="naikKeStage(${i})">
                        <span class="material-icons">add</span>
                    </div>
                    <span class="name-label">KOSONG</span>`;
            }
            grid.appendChild(item);
        });
    }

    function playGiftAnimation(giftId: number | string, forcedCombo: number | null = null) {
        const id = typeof giftId === 'string' ? parseInt(giftId) : (giftId || 1);
        if (forcedCombo !== null) { giftComboCount = forcedCombo; lastGiftId = id; } 
        else { if (lastGiftId === id) { giftComboCount++; } else { giftComboCount = 1; lastGiftId = id; } }

        let overlay = document.getElementById('gift-anim-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gift-anim-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center;">
                <img id="gift-anim-img" src="asets/gif/giftvid${id}.gif?t=${Date.now()}" style="width:280px; filter:drop-shadow(0 0 20px gold);">
                <div id="gift-combo-text" style="font-size:80px; font-weight:900; color:#ffeb3b; transform:rotate(-15deg) scale(1.2);">
                    ${giftComboCount > 1 ? `x${giftComboCount}` : ''}
                </div>
            </div>`;

        overlay.style.display = 'flex'; overlay.style.opacity = '1';
        if (giftAnimTimer) clearTimeout(giftAnimTimer);
        giftAnimTimer = setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => overlay.style.display = 'none', 300); }, 3000); 
    }

    function listenRealtime() {
        if (!CURRENT_ROOM_ID || !MY_USER_ID) return;
        const roomChannel = sb.channel(`room_active_${CURRENT_ROOM_ID}`);
        roomChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => fetchStage())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (p: any) => { 
            fetchStage(); 
            if (p.new?.id === MY_USER_ID) {
                const coinEl = document.getElementById('user-coins');
                if (coinEl) coinEl.innerText = (p.new.coins || 0).toLocaleString();
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, (p: any) => {
            const chatBox = document.getElementById('chat-box');
            if (!chatBox) return;
            const isGift = p.new.username === "SISTEM_GIFT";
            const div = document.createElement('div');
            div.className = isGift ? 'msg system-gift' : 'msg';
            div.innerHTML = `<span>${isGift ? '🎁 ' : ''}${p.new.text}</span>`;
            if (isGift && !p.new.text.startsWith(myUsername)) playGiftAnimation(parseInt(p.new.role), 1);
            chatBox.appendChild(div);
            chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
            fetchTopGifters();
        })
        .subscribe();
    }

    async function sendGift(giftName: string, harga: number | string, giftId: number | string, jumlah = 1) {
        if (!selectedTargetId) return alert("Pilih target!");
        if (selectedTargetId === MY_USER_ID) return alert("Nggak bisa gift ke diri sendiri!");
        const coinEl = document.getElementById('user-coins');
        if (!coinEl) return;
        let saldo = parseInt(coinEl.innerText.replace(/[,.]/g, ''));
        let total = (typeof harga === 'string' ? parseInt(harga) : harga) * jumlah;
        if (saldo < total) return alert("Koin kurang!");
        
        playGiftAnimation(giftId);
        try {
            const { data: newTotal } = await sb.rpc('transfer_gift', { sender_id: MY_USER_ID, receiver_id: selectedTargetId, amount: total });
            await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM_GIFT", text: `${myUsername} mengirim ${giftName} x${jumlah} ke ${selectedTargetName}`, role: giftId.toString(), level: myLevel }]);
            myTotalGiftSent = newTotal;
            myLevel = checkLevelUp(newTotal).level;
            updateLevelProgressUI();
        } catch (e) { console.error(e); }
    }

    async function kirimKomentar() {
        const input = document.getElementById('chat-input') as HTMLInputElement;
        if (!input?.value.trim()) return;
        await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: myUsername, text: input.value.trim(), role: myRole, level: myLevel }]);
        input.value = "";
    }

    async function toggleMicSidebar(event?: Event) {
        if (event) event.preventDefault();
        if (!room?.localParticipant) return;
        const myAvatar = document.querySelector(`.avatar[data-user-id="${MY_USER_ID}"]`);
        if (!myAvatar) return alert("Naik dulu ke panggung!");
        const isEnabled = room.localParticipant.isMicrophoneEnabled;
        await room.localParticipant.setMicrophoneEnabled(!isEnabled);
        await sb.from('profiles').update({ mic_off: isEnabled }).eq('id', MY_USER_ID);
        fetchStage();
    }

    async function updateGiftTargets() {
        const container = document.getElementById('gift-targets');
        if (!container) return;
        const { data: slots } = await sb.from('room_slots').select(`profile_id, profiles (username, avatar_url)`).eq('room_id', CURRENT_ROOM_ID).not('profile_id', 'is', null).neq('profile_id', MY_USER_ID); 
        container.innerHTML = "";
        if (!slots || slots.length === 0) return container.innerHTML = "<span>Cuma ada kamu</span>";
        slots.forEach((slot: any) => {
            const div = document.createElement('div');
            div.className = 'target-user';
            div.onclick = () => { selectedTargetId = slot.profile_id; selectedTargetName = slot.profiles?.username || "User"; updateGiftTargets(); };
            if (selectedTargetId === slot.profile_id) div.classList.add('selected');
            div.innerHTML = `<img src="${slot.profiles?.avatar_url || 'asets/png/profile.png'}" class="target-avatar"><span>${slot.profiles?.username}</span>`;
            container.appendChild(div);
        });
    }

    async function naikKeStage(index: number) {
        if (!MY_USER_ID) return;
        if (room) await room.localParticipant.setMicrophoneEnabled(true);
        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID);
        await sb.from('room_slots').update({ profile_id: MY_USER_ID }).match({ room_id: CURRENT_ROOM_ID, slot_index: index });
        await sb.from('profiles').update({ mic_off: false }).eq('id', MY_USER_ID);
        fetchStage();
    }

    async function prosesTurunMic() {
        if (room) await room.localParticipant.setMicrophoneEnabled(false);
        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID);
        await sb.from('profiles').update({ mic_off: true }).eq('id', MY_USER_ID);
        fetchStage();
    }

    async function checkUser() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return false;
        MY_USER_ID = session.user.id;
        const profile = await getCachedProfile(MY_USER_ID);
        const { data: roomData } = await sb.from('rooms').select('owner_id, is_active').eq('id', CURRENT_ROOM_ID).single();
        if (profile) { myUsername = profile.username; myRole = profile.role || "user"; myLevel = profile.level || 1; myTotalGiftSent = profile.total_gift_sent || 0; }
        if (roomData) { IS_OWNER = roomData.owner_id === MY_USER_ID; if (IS_OWNER) await sb.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID); }
        fetchStage(); return true; 
    }

    async function getRoomLeaderboard() {
        const { data } = await sb.from('room_messages').select('text, role').eq('room_id', CURRENT_ROOM_ID).eq('username', 'SISTEM_GIFT');
        if (!data) return [];
        let totals: any = {};
        data.forEach((m: any) => {
            const match = m.text.match(/^(.+) mengirim/);
            if (match) totals[match[1]] = (totals[match[1]] || 0) + 1;
        });
        const names = Object.keys(totals).sort((a, b) => totals[b] - totals[a]).slice(0, 3);
        const { data: profiles } = await sb.from('profiles').select('username, avatar_url').in('username', names);
        return profiles || [];
    }

    async function fetchTopGifters() {
        const top = await getRoomLeaderboard();
        const container = document.getElementById('top-gifters-container');
        if (!container || top.length === 0) return;
        container.style.display = 'flex';
        container.innerHTML = `<span style="font-size:11px;color:gold;">🏆 TOP</span><div style="display:flex;">${top.map(u => `<img src="${u.avatar_url}" style="width:28px;border-radius:50%;margin-left:-10px;border:2px solid gold;">`).join('')}</div>`;
    }

    // --- SWIPE LOGIC (FIXED) ---
    useEffect(() => {
        const giftDrawer = document.getElementById('gift-drawer');
        if (!giftDrawer) return;

        let startY = 0;
        let currentY = 0;

        const handleStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
        const handleMove = (e: TouchEvent) => {
            currentY = e.touches[0].clientY;
            const diffY = currentY - startY;
            if (diffY > 0) {
                giftDrawer.style.transform = `translateY(${diffY}px)`;
                giftDrawer.style.transition = 'none';
            }
        };
        const handleEnd = () => {
            const diffY = currentY - startY;
            giftDrawer.style.transform = '';
            giftDrawer.style.transition = 'transform 0.3s ease-out';
            // 🔥 FIX: Panggil toggleRoomGiftDrawer agar sinkron 🔥
            if (diffY > 80 && giftDrawer.classList.contains('open')) {
                toggleRoomGiftDrawer(); 
            }
            startY = 0; currentY = 0;
        };

        giftDrawer.addEventListener('touchstart', handleStart, { passive: true });
        giftDrawer.addEventListener('touchmove', handleMove, { passive: true });
        giftDrawer.addEventListener('touchend', handleEnd);

        return () => {
            giftDrawer.removeEventListener('touchstart', handleStart);
            giftDrawer.removeEventListener('touchmove', handleMove);
            giftDrawer.removeEventListener('touchend', handleEnd);
        };
    }, []);

    // --- WINDOW ASSIGNMENT ---
    window.toggleRoomGiftDrawer = toggleRoomGiftDrawer;
    window.naikKeStage = naikKeStage;
    window.turunMic = () => (document.getElementById('confirm-modal')!.style.display = 'flex');
    window.prosesTurunMic = prosesTurunMic;
    window.toggleSidebar = () => { document.getElementById('sidebar')?.classList.toggle('active'); document.getElementById('sidebar-overlay')?.classList.toggle('active'); };
    window.toggleMicSidebar = toggleMicSidebar;
    window.toggleKickBtn = toggleKickBtn;
    window.sendGift = sendGift;
    window.kickUser = kickUser;
    window.kirimKomentar = kirimKomentar;
    window.mintaNaik = mintaNaik;
    window.keluarRoom = keluarRoom;
    window.openRoomSetting = openRoomSetting;
    window.closeRoomSetting = () => (document.getElementById('setting-modal')!.style.display = 'none');
    window.saveRoomSetting = saveRoomSetting;
    window.closeConfirmModal = () => (document.getElementById('confirm-modal')!.style.display = 'none');
    window.openTopGiftersModal = () => {}; 
    window.closeTopGiftersModal = () => {};

    const checkSDK = setInterval(() => { if (typeof LivekitClient !== 'undefined') { clearInterval(checkSDK); initApp(); } }, 500);

    return () => {
        window.__VOICE_ROOM_INIT__ = false;
        if (room) room.disconnect();
        sb.removeAllChannels();
        clearInterval(checkSDK);
    };
  }, []);

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/livekit-client@1.15.12/dist/livekit-client.umd.min.js" />
      <Sidebar /><Modals />
      <div className="app-container"><Header /><Stage /><ChatBox /><Footer /></div> 
      <GiftDrawer /><GiftAnimOverlay />
    </>
  );
}
