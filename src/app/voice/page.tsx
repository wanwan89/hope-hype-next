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
    toggleGiftDrawer?: () => void;
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
    // 🔥 FIX 1: RESET FLAG INITIALIZATION AGAR BISA MASUK-KELUAR CEPAT 🔥
    if (window.__VOICE_ROOM_INIT__) {
        window.__VOICE_ROOM_INIT__ = false;
    }
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
    let room: any; // Scoped agar bisa di-disconnect saat cleanup

    const titleEl = document.querySelector('.room-title') as HTMLElement;
    if (titleEl) titleEl.innerText = CURRENT_ROOM_NAME.toUpperCase();

    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    if (chatInput) {
        chatInput.addEventListener('focus', () => {
            const drawer = document.getElementById('gift-drawer');
            if (drawer && drawer.classList.contains('open')) {
                toggleGiftDrawer();
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
                    position: fixed; top: 60%; left: 50%; z-index: 1000000;
                    padding: 12px 28px; border-radius: 12px; display: flex;
                    align-items: center; justify-content: center; gap: 8px;
                    overflow: hidden; pointer-events: none; width: max-content;
                    max-width: 90%; animation: vipSlideInClean 4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
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
            textHTML = `<span style="color:#fff; font-size: 13px; font-weight: 600;">SULTAN</span> <b style="color:#fff; font-size: 15px; margin: 0 4px;">${username}</b> <span style="color:#fff; font-size: 13px;">MEMASUKI ROOM</span>`;
        } else if (level >= 5) { 
            bgStyle = "background: rgba(225, 29, 72, 0.95); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(225, 29, 72, 0.4); backdrop-filter: blur(10px);";
            textHTML = `<span style="color:#fff; font-size: 13px;">LEGEND</span> <b style="color:#fff; font-size: 15px; margin: 0 4px;">${username}</b> <span style="color:#fff; font-size: 13px;">MEMASUKI ROOM</span>`;
        }

        overlay.setAttribute('style', bgStyle);
        overlay.innerHTML = `<div style="display: flex; align-items: center;">${textHTML}</div>`;
        document.body.appendChild(overlay);

        setTimeout(() => { if (overlay) overlay.remove(); }, 4100);
    }

    async function getCachedProfile(userId: string) {
      const key = `hh_profile_${userId}`;
      const { data } = await sb.from('profiles').select('username, avatar_url, role, coins, total_gift_sent, level').eq('id', userId).single();
      if (data) {
          sessionStorage.setItem(key, JSON.stringify(data));
          return data;
      }
      return null;
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
                headers: { 
                    'Content-Type': 'application/json', 
                    'apikey': supabaseKey || '', 
                    'Authorization': `Bearer ${supabaseKey}` 
                },
                body: JSON.stringify({ username: myUsername, identity: MY_USER_ID, roomName: roomName })
            });
            const data = await response.json();
            if (!data.token) return;
            room = new LivekitClient.Room({ adaptiveStream: true, dynacast: true });
            room.on(LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
                document.querySelectorAll('.avatar').forEach(el => el.classList.remove('speaking'));
                speakers.forEach((s) => {
                    let el = document.querySelector(`[data-user-id="${s.identity}"]`);
                    if (el) el.classList.add('speaking');
                });
            });
            room.on(LivekitClient.RoomEvent.TrackSubscribed, (track: any) => {
                if (track.kind === "audio") {
                    const element = track.attach();
                    document.body.appendChild(element);
                    element.play().catch(() => {});
                }
            });
            await room.connect(LIVEKIT_URL, data.token);
            await room.localParticipant.setMicrophoneEnabled(false);
        } catch (e: any) { console.error(e.message); }
    }

    async function fetchStage() {
        if (!CURRENT_ROOM_ID) return;
        let { data: slots } = await sb.from('room_slots').select(`slot_index, profile_id, profiles (username, avatar_url, role, mic_off, level)`).eq('room_id', CURRENT_ROOM_ID).order('slot_index', { ascending: true });
        if (!slots || slots.length === 0) return;
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
                const lvlBadge = getLevelBadgeHTML(user.level || 1);
                item.innerHTML = `
                    <div class="avatar ${isMe ? 'active' : ''}" data-user-id="${slot.profile_id}" onclick="${isMe ? `turunMic(${i})` : `toggleKickBtn(this, ${IS_OWNER && !isMe})`}">
                        <img src="${user.avatar_url || 'asets/png/profile.png'}">
                        <div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'}; position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7); border-radius: 50%; width: 22px; height: 22px; align-items: center; justify-content: center; border: 2px solid white; z-index: 10;">
                            <span class="material-icons" style="color: #e74c3c; font-size: 14px;">mic_off</span>
                        </div>
                    </div>
                    <span class="name-label" style="color: ${lvlStyle.color}; font-weight: bold;">
                          ${user.username}${lvlBadge}${getUserBadge(user.role)}
                    </span>`; 
            } else {
                item.innerHTML = `<div class="avatar" onclick="naikKeStage(${i})"><span class="material-icons">add</span></div><span class="name-label">KOSONG</span>`;
            }
            grid.appendChild(item);
        });
    }

    async function sendGift(giftName: string, harga: number | string, giftId: number | string, jumlah = 1) {
        if (!selectedTargetId) return alert("Pilih target!");
        if (selectedTargetId === MY_USER_ID) return alert("Gak bisa gift ke diri sendiri!");
        const coinDisplay = document.getElementById('user-coins');
        if (!coinDisplay) return;
        let saldoSkrg = parseInt(coinDisplay.innerText.replace(/[,.]/g, ''));
        let totalHarga = (typeof harga === 'string' ? parseInt(harga) : harga) * jumlah; 
        if (saldoSkrg < totalHarga) return alert("Koin kurang!");
        saldoSkrg -= totalHarga;
        coinDisplay.innerText = saldoSkrg.toLocaleString(); 
        playGiftAnimation(giftId);
        
        try {
            await sb.rpc('transfer_gift', {
                sender_id: MY_USER_ID, receiver_id: selectedTargetId, amount: totalHarga
            });
            const teksFinal = `${myUsername} mengirim ${giftName} x${jumlah} ke ${selectedTargetName}`;
            await sb.from('room_messages').insert([{ 
                room_id: CURRENT_ROOM_ID, username: "SISTEM_GIFT", text: teksFinal, role: giftId.toString(), level: myLevel 
            }]);
        } catch (e: any) { console.error(e.message); }
    }

    async function kirimKomentar() {
        const inputEl = document.getElementById('chat-input') as HTMLInputElement;
        if (!inputEl || !inputEl.value.trim()) return;
        try {
            await sb.from('room_messages').insert([{ 
                room_id: CURRENT_ROOM_ID, username: myUsername, text: inputEl.value.trim(), role: myRole, level: myLevel 
            }]);
            inputEl.value = ""; 
        } catch (err) { console.error(err); }
    }

    function toggleSidebar() {
        document.getElementById('sidebar')?.classList.toggle('active');
        document.getElementById('sidebar-overlay')?.classList.toggle('active');
    }

    async function toggleMicSidebar() {
        if (!room) return;
        const isMicOn = room.localParticipant.isMicrophoneEnabled;
        await room.localParticipant.setMicrophoneEnabled(!isMicOn);
        await sb.from('profiles').update({ mic_off: isMicOn }).eq('id', MY_USER_ID);
        fetchStage(); toggleSidebar();
    }

    function toggleGiftDrawer() {
        const drawer = document.getElementById('gift-drawer');
        const overlay = document.getElementById('drawer-overlay');
        drawer?.classList.toggle('open');
        overlay?.classList.toggle('show');
        if (drawer?.classList.contains('open')) updateGiftTargets();
    }

    async function updateGiftTargets() {
        const targetContainer = document.getElementById('gift-targets');
        if (!targetContainer) return;
        const { data: slots } = await sb.from('room_slots').select(`profile_id, profiles (username, avatar_url)`).eq('room_id', CURRENT_ROOM_ID).not('profile_id', 'is', null).neq('profile_id', MY_USER_ID); 
        targetContainer.innerHTML = "";
        if (!slots || slots.length === 0) {
            selectedTargetId = null; selectedTargetName = "";
            return targetContainer.innerHTML = "<span>Cuma ada kamu</span>";
        }
        slots.forEach((slot: any, index: number) => {
            const div = document.createElement('div'); 
            div.className = `target-user ${selectedTargetId === slot.profile_id ? 'selected' : ''}`;
            const pName = Array.isArray(slot.profiles) ? slot.profiles[0]?.username : slot.profiles?.username;
            div.onclick = () => { selectedTargetId = slot.profile_id; selectedTargetName = pName; updateGiftTargets(); };
            div.innerHTML = `<img src="${slot.profiles?.avatar_url || 'asets/png/profile.png'}" class="target-avatar"><span>${pName}</span>`;
            targetContainer.appendChild(div);
            if (!selectedTargetId && index === 0) { selectedTargetId = slot.profile_id; selectedTargetName = pName; }
        });
    }

    async function getRoomLeaderboard() {
        try {
            const { data: messages } = await sb.from('room_messages').select('text, role').eq('room_id', CURRENT_ROOM_ID).eq('username', 'SISTEM_GIFT');
            if (!messages) return [];
            const hargaKado: Record<string, number> = { '1': 1, '2': 10, '3': 50, '4': 100, '5': 2000 };
            let totalPerUser: Record<string, number> = {};
            messages.forEach((m: any) => {
                const match = m.text.match(/^(.+) mengirim (.+) x(\d+) ke/);
                if (match) {
                    const pengirim = match[1];
                    const jumlah = parseInt(match[3]);
                    totalPerUser[pengirim] = (totalPerUser[pengirim] || 0) + (hargaKado[m.role] * jumlah);
                }
            });
            const names = Object.keys(totalPerUser).sort((a,b) => totalPerUser[b] - totalPerUser[a]).slice(0, 10);
            if (names.length === 0) return [];
            const { data: profiles } = await sb.from('profiles').select('username, avatar_url, level, role').in('username', names);
            return profiles?.map(p => ({ ...p, room_total: totalPerUser[p.username] })) || [];
        } catch (err) { return []; }
    }

    async function fetchTopGifters() {
        const topUsers = await getRoomLeaderboard();
        const container = document.getElementById('top-gifters-container');
        if (!container) return;
        if (!topUsers || topUsers.length === 0) { container.style.display = 'none'; return; }
        container.style.display = 'flex';
        container.innerHTML = `<span style="font-size:11px;color:gold;">🏆 TOP</span><div style="display:flex;">${topUsers.slice(0,3).map((u:any) => `<img src="${u.avatar_url || 'asets/png/profile.png'}" style="width:28px;height:28px;border-radius:50%;border:2px solid gold;margin-left:-10px;">`).join('')}</div>`;
    }

    async function checkUser() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { window.location.href = '/lobby'; return false; }
        MY_USER_ID = session.user.id;
        const myProfile = await getCachedProfile(MY_USER_ID);
        const { data: roomData } = await sb.from('rooms').select('owner_id, is_active').eq('id', CURRENT_ROOM_ID).maybeSingle();
        if (myProfile) {
            myUsername = myProfile.username; myRole = myProfile.role || "user"; myLevel = myProfile.level || 1;
            const coinEl = document.getElementById('user-coins');
            if (coinEl) coinEl.innerText = (myProfile.coins || 0).toLocaleString();
        }
        if (roomData) {
            IS_OWNER = roomData.owner_id === MY_USER_ID;
            if (IS_OWNER) await sb.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID);
            else if (!roomData.is_active) { window.location.href = '/lobby'; return false; }
        }
        fetchStage(); return true; 
    }

    function listenRealtime() {
        const chan = sb.channel(`room_${CURRENT_ROOM_ID}`);
        chan.on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => fetchStage())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, (p: any) => {
                const box = document.getElementById('chat-box');
                if (!box) return;
                const div = document.createElement('div');
                div.className = p.new.username === "SISTEM_GIFT" ? "msg system-gift" : "msg";
                div.innerHTML = `<span>${p.new.text}</span>`;
                box.appendChild(div); box.scrollTop = box.scrollHeight;
                fetchTopGifters();
            }).subscribe();
    }

    function fixMobileHeight() {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    }
    window.addEventListener('resize', fixMobileHeight);
    fixMobileHeight();

    const checkSDK = setInterval(() => {
        if (typeof LivekitClient !== 'undefined') {
            clearInterval(checkSDK);
            initApp();
        }
    }, 500);

    // 🔥 FIX 2: FUNGSI PEMBERSIH SAAT KELUAR ROOM 🔥
    return () => {
        window.__VOICE_ROOM_INIT__ = false; 
        if (room) room.disconnect();
        sb.removeAllChannels(); 
        clearInterval(checkSDK);
        window.removeEventListener('resize', fixMobileHeight);
        const overlays = ['gift-anim-overlay', 'vip-entrance-overlay', 'vip-anim-styles-clean'];
        overlays.forEach(id => document.getElementById(id)?.remove());
    };

  }, []); 

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" />
      <Script src="https://cdn.jsdelivr.net/npm/livekit-client@1.15.12/dist/livekit-client.umd.min.js" />
      <Sidebar /><Modals />
      <div className="app-container"><Header /><Stage /><ChatBox /><Footer /></div> 
      <GiftDrawer /><GiftAnimOverlay />
    </>
  );
}
