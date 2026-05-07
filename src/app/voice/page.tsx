'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { supabase as sb } from '@/lib/supabase'; 
// 🔥 FIX 1: Import i18n
import { useTranslation } from 'react-i18next';

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
    closeConfirmModal?: () => void;
    openTopGiftersModal?: () => void;
    closeTopGiftersModal?: () => void;
  }
  var LivekitClient: any;
  var toast: (title: string, msg: string, type: string) => void;
}

export default function RoomPage() {
  // 🔥 FIX 2: Inisialisasi Translate Hook
  const { t } = useTranslation();
  
  useEffect(() => {
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

    const titleEl = document.querySelector('.room-title') as HTMLElement;
    if (titleEl) titleEl.innerText = CURRENT_ROOM_NAME.toUpperCase();

    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    if (chatInput) {
        chatInput.addEventListener('focus', () => {
            const drawer = document.getElementById('room-gift-drawer');
            if (drawer && drawer.classList.contains('open')) {
                window.toggleRoomGiftDrawer(); 
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
                @keyframes vipShineClean {
                    0% { left: -100%; }
                    20% { left: 100%; }
                    100% { left: 100%; }
                }
                .vip-banner-clean {
                    position: fixed;
                    top: 60%; 
                    left: 50%;
                    z-index: 1000000;
                    padding: 12px 28px;
                    border-radius: 12px; 
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    overflow: hidden;
                    pointer-events: none;
                    width: max-content;
                    max-width: 90%;
                    animation: vipSlideInClean 4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
                .vip-shine-clean {
                    position: absolute;
                    top: 0; left: -100%;
                    width: 50%; height: 100%;
                    background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
                    transform: skewX(-20deg);
                    animation: vipShineClean 2s infinite ease-in-out;
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
            textHTML = `<span style="color:#fff; font-size: 13px; font-weight: 600; letter-spacing: 1px;">SULTAN</span> <b style="color:#fff; font-size: 15px; font-weight: 800; text-transform: uppercase; margin: 0 4px;">${username}</b> <span style="color:#fff; font-size: 13px; font-weight: 600;">${t('entering_room')}</span>`;
        } else if (level >= 5) { 
            bgStyle = "background: rgba(225, 29, 72, 0.95); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(225, 29, 72, 0.4); backdrop-filter: blur(10px);";
            textHTML = `<span style="color:#fff; font-size: 13px; font-weight: 600; letter-spacing: 1px;">LEGEND</span> <b style="color:#fff; font-size: 15px; font-weight: 800; text-transform: uppercase; margin: 0 4px;">${username}</b> <span style="color:#fff; font-size: 13px; font-weight: 600;">${t('entering_room')}</span>`;
        }

        overlay.setAttribute('style', bgStyle);
        overlay.innerHTML = `<div class="vip-shine-clean"></div><div style="display: flex; align-items: center;">${textHTML}</div>`;
        document.body.appendChild(overlay);

        setTimeout(() => { if (overlay) overlay.remove(); }, 4100);
    }

    async function getCachedProfile(userId: string) {
      const key = `hh_profile_${userId}`;
      const cachedData = sessionStorage.getItem(key);
      if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          if (parsedData.level !== undefined && parsedData.total_gift_sent !== undefined) return parsedData; 
      }
      const { data } = await sb.from('profiles').select('username, avatar_url, role, coins, total_gift_sent, level').eq('id', userId).single();
      if (data) {
          sessionStorage.setItem(key, JSON.stringify(data));
          return data;
      }
      return null;
    }

    const LIVEKIT_URL = "wss://voicegrup-zxmeibkn.livekit.cloud"; 
    let room: any;

    async function initApp() {
        const canEnter = await checkUser(); 
        if (!canEnter) return; 
        initLiveKit(); 
        listenRealtime(); 
        fetchTopGifters(); 
    }

    async function initLiveKit() {
        if (typeof LivekitClient === 'undefined') return console.error("SDK LiveKit Hilang!");
        try {
            const roomName = CURRENT_ROOM_ID || "main-room"; 
            const response = await fetch(`${supabaseUrl}/functions/v1/get-livekit-token`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'apikey': supabaseKey || '', 
                    'Authorization': `Bearer ${supabaseKey}` 
                },
                body: JSON.stringify({ 
                    username: myUsername, 
                    identity: MY_USER_ID,
                    roomName: roomName 
                })
            });

            const data = await response.json();
            if (!data.token) throw new Error("Server tidak memberikan Token.");

            room = new LivekitClient.Room({ adaptiveStream: true, dynacast: true });
            
            room.on(LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
                document.querySelectorAll('.avatar').forEach(el => el.classList.remove('speaking'));
                speakers.forEach((s) => {
                    let el = document.querySelector(`[data-user-id="${s.identity}"]`);
                    if (!el && s.isLocal) el = document.querySelector(`[data-user-id="${MY_USER_ID}"]`);
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

        } catch (e: any) { 
            console.error("❌ LiveKit Connection Error:", e.message);
        }
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
                const lvlBadge = getLevelBadgeHTML(user.level || 1);
                item.innerHTML = `
                    <div class="avatar ${isMe ? 'active' : ''}" data-user-id="${slot.profile_id}" onclick="${isMe ? `turunMic(${i})` : `toggleKickBtn(this, ${IS_OWNER && !isMe})`}">
                        <img src="${user.avatar_url || 'asets/png/profile.png'}">
                        <div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'}; position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7); border-radius: 50%; width: 22px; height: 22px; align-items: center; justify-content: center; border: 2px solid white; z-index: 10;">
                            <span class="material-icons" style="color: #e74c3c; font-size: 14px;">mic_off</span>
                        </div>
                        ${(IS_OWNER && !isMe) ? `<div class="kick-btn-wrapper" style="display:none;"><div class="kick-btn" onclick="event.stopPropagation(); kickUser('${slot.profile_id}', '${user.username}')"><span class="material-icons">close</span></div></div>` : ''}
                    </div>
                    <span class="name-label" 
                          onclick="window.location.href='/data?username=${encodeURIComponent(user.username)}'" 
                          style="color: ${lvlStyle.color}; cursor: pointer; font-weight: bold;">
                          ${user.username}${lvlBadge}${getUserBadge(user.role)}
                    </span>`; 
            } else {
                item.innerHTML = `
                    <div class="avatar" onclick="naikKeStage(${i})">
                        <span class="material-icons" style="color: #444; font-size: 30px;">add</span>
                    </div>
                    <span class="name-label">${t('empty_slot')}</span>`;
            }
            grid.appendChild(item);
        });
    }

    function listenRealtime() {
        if (!CURRENT_ROOM_ID || !MY_USER_ID) return;
        const roomChannel = sb.channel(`room_active_${CURRENT_ROOM_ID}`, { config: { presence: { key: MY_USER_ID } } });

        roomChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => { fetchStage(); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (p: any) => { 
            fetchStage(); 
            if (p.new && p.new.id === MY_USER_ID) {
                const coinDisplay = document.getElementById('user-coins');
                if (coinDisplay) coinDisplay.innerText = (p.new.coins || 0).toLocaleString();
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, (p: any) => {
            const chatBox = document.getElementById('chat-box');
            if (!chatBox) return;

            if (p.eventType === 'UPDATE' || p.eventType === 'INSERT') {
                const existingMsg = document.getElementById(`msg-${p.new.id}`);
                if (existingMsg) existingMsg.remove();
            }

            const isGift = p.new.username === "SISTEM_GIFT";
            let comboValue = 1;
            if (isGift) {
                const match = p.new.text.match(/^(.+) mengirim .+ x(\d+) ke/);
                if (match) comboValue = parseInt(match[2]); 
                if (!p.new.text.startsWith(`${myUsername} `)) (window as any).playGiftAnimation?.(p.new.role, comboValue);
            }

            const div = document.createElement('div'); 
            div.id = `msg-${p.new.id}`;
            
            if (isGift) {
                div.className = 'msg system-gift'; 
                div.innerHTML = `<span>🎁 ${p.new.text}</span>`;
            } else {
                const isSystem = p.new.username.startsWith("SISTEM");
                div.className = isSystem ? 'msg system' : 'msg';
                const style = getLevelStyle(p.new.level || 1);
                const lvlBadge = getLevelBadgeHTML(p.new.level || 1);
                const roleBadge = getUserBadge(p.new.role || '');
                const userLink = `<span onclick="window.location.href='/data?username=${encodeURIComponent(p.new.username)}'" style="color:${style.color}; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center;">${p.new.username}${lvlBadge}${roleBadge}</span>`;
                div.innerHTML = isSystem ? `<span>${p.new.text}</span>` : `${userLink}<span>: ${p.new.text}</span>`;
            }

            chatBox.appendChild(div); 
            chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
            fetchTopGifters(); 
        })
        .on('presence', { event: 'sync' }, () => {
            const countEl = document.getElementById('online-count');
            if (countEl) countEl.innerText = Object.keys(roomChannel.presenceState()).length.toString();
        })
        .on('presence', { event: 'join' }, ({ newPresences }: any) => {
            newPresences.forEach((p: any) => { if (p.key !== MY_USER_ID && p.level >= 4) playVIPEntrance(p.username, p.level); });
        })
        .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                await roomChannel.track({ online_at: new Date().toISOString(), username: myUsername, level: myLevel });
            }
        });
    }

    async function sendGift(giftName: string, harga: number | string, giftId: number | string, jumlah = 1) {
        if (!selectedTargetId) return alert(t('select_target'));
        if (selectedTargetId === MY_USER_ID) {
            if (typeof toast === "function") toast(t('oops'), t('gift_self_warning'), "warning");
            return alert(t('gift_self_alert'));
        }
        
        const coinDisplay = document.getElementById('user-coins');
        if (!coinDisplay) return;
        let saldoSkrg = parseInt(coinDisplay.innerText.replace(/[,.]/g, ''));
        let totalHarga = (typeof harga === 'string' ? parseInt(harga) : harga) * jumlah; 

        if (saldoSkrg < totalHarga) return alert(t('min_topup_warning'));
        
        saldoSkrg -= totalHarga;
        coinDisplay.innerText = saldoSkrg.toLocaleString(); 
        (window as any).playGiftAnimation?.(giftId);

        const targetIdDikunci = selectedTargetId; 
        const targetNameDikunci = selectedTargetName;
        const comboKey = `${giftName}_${targetIdDikunci}`;

        if (!activeCombos[comboKey]) {
            activeCombos[comboKey] = { targetId: targetIdDikunci, targetName: targetNameDikunci, count: 0, pendingCoins: 0, msgId: null, syncTimer: null };
        }

        const combo = activeCombos[comboKey];
        combo.count += jumlah; 
        combo.pendingCoins += totalHarga; 

        if (combo.syncTimer) clearTimeout(combo.syncTimer);
        combo.syncTimer = setTimeout(async () => {
            const coinsToDeduct = combo.pendingCoins;
            const currentCount = combo.count;
            const finalTargetId = combo.targetId;
            const finalTargetName = combo.targetName;
            const savedMsgId = combo.msgId;
            delete activeCombos[comboKey]; 

            try {
                const { data: newTotalGift, error } = await sb.rpc('transfer_gift', { sender_id: MY_USER_ID, receiver_id: finalTargetId, amount: coinsToDeduct });
                if (error) throw error;

                await sb.from('coin_history').insert([{ user_id: MY_USER_ID, transaction_type: 'send_gift', amount: -coinsToDeduct, description: `Kirim ${giftName} x${currentCount} ke ${finalTargetName}`, balance_after: saldoSkrg }]);
                await sb.from('coin_history').insert([{ user_id: finalTargetId, transaction_type: 'receive_gift', amount: coinsToDeduct, description: `Terima ${giftName} x${currentCount} dari ${myUsername}`, balance_after: 0 }]);

                let levelData = checkLevelUp(newTotalGift);
                if (levelData.level !== myLevel) {
                    await sb.from('profiles').update({ level: levelData.level }).eq('id', MY_USER_ID);
                    await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: t('congrats_level_up', { name: myUsername, level: levelData.level }), role: "admin" }]);
                }

                myTotalGiftSent = newTotalGift; 
                myLevel = levelData.level;
                updateLevelProgressUI(); 

                const teksFinal = `${myUsername} mengirim ${giftName} x${currentCount} ke ${finalTargetName}`;
                if (savedMsgId) {
                    await sb.from('room_messages').update({ text: teksFinal }).eq('id', savedMsgId);
                } else {
                    const { data } = await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM_GIFT", text: teksFinal, role: giftId.toString(), level: myLevel }]).select();
                    if (data && data.length > 0) combo.msgId = data[0].id;
                }
            } catch (e) { alert(t('gift_fail')); }
        }, 600); 
    }

    async function kirimKomentar() {
        const inputEl = document.getElementById('chat-input') as HTMLInputElement;
        if (!inputEl || !inputEl.value.trim()) return;
        try {
            await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: myUsername, text: inputEl.value.trim(), role: myRole, level: myLevel }]);
            inputEl.value = ""; 
            setTimeout(() => { const chatBox = document.getElementById('chat-box'); if (chatBox) chatBox.scrollTop = chatBox.scrollHeight; }, 100);
        } catch (err) { console.error(err); }
    }

    async function toggleMicSidebar(event?: Event) {
        if (event) event.preventDefault(); 
        if (!room || !room.localParticipant) return alert(t('mic_not_ready'));
        const myAvatarOnStage = document.querySelector(`.avatar[data-user-id="${MY_USER_ID}"]`);
        if (!myAvatarOnStage) return alert(t('mic_stage_first'));

        try {
            const isMicOn = room.localParticipant.isMicrophoneEnabled;
            const newStatus = !isMicOn;
            await room.localParticipant.setMicrophoneEnabled(newStatus);
            await sb.from('profiles').update({ mic_off: !newStatus }).eq('id', MY_USER_ID);

            const micIcon = document.getElementById('mic-icon');
            const micText = document.getElementById('mic-text');
            if (newStatus) { 
                if(micIcon) { micIcon.innerText = "mic"; micIcon.style.color = "#2ecc71"; }
                if(micText) micText.innerText = t('mute_mic'); 
            } else { 
                if(micIcon) { micIcon.innerText = "mic_off"; micIcon.style.color = "#e74c3c"; }
                if(micText) micText.innerText = t('unmute_mic');
            }
            fetchStage(); window.toggleSidebar(); 
        } catch (err) { alert(t('mic_fail')); }
    }

    async function updateGiftTargets() {
        const targetContainer = document.getElementById('gift-targets');
        if (!targetContainer) return;
        const { data: slots } = await sb.from('room_slots').select(`profile_id, profiles (username, avatar_url)`).eq('room_id', CURRENT_ROOM_ID).not('profile_id', 'is', null).neq('profile_id', MY_USER_ID); 
        targetContainer.innerHTML = "";
        if (!slots || slots.length === 0) {
            selectedTargetId = null; selectedTargetName = "";
            return targetContainer.innerHTML = `<span style='font-size:12px; color:#888; padding: 10px;'>${t('only_you_here')}</span>`;
        }
        slots.forEach((slot: any, index: number) => {
            const isSelected = selectedTargetId === slot.profile_id;
            const div = document.createElement('div'); 
            div.classList.add('target-user');
            if (isSelected) div.classList.add('selected');
            div.onclick = () => { 
                selectedTargetId = slot.profile_id; 
                selectedTargetName = slot.profiles?.username || "User"; 
                updateGiftTargets(); 
            };
            div.innerHTML = `<img src="${slot.profiles?.avatar_url || 'asets/png/profile.png'}" class="target-avatar"><span class="target-name">${slot.profiles?.username || 'User'}</span>`;
            targetContainer.appendChild(div);
            if (!selectedTargetId && index === 0) { selectedTargetId = slot.profile_id; selectedTargetName = slot.profiles?.username; div.classList.add('selected'); }
        });
    }

    async function mintaNaik() {
        const { data: allSlots } = await sb.from('room_slots').select('slot_index, profile_id').eq('room_id', CURRENT_ROOM_ID).order('slot_index', { ascending: true });
        if(!allSlots) return;
        const slotKosong = allSlots.find((s: any) => !s.profile_id);
        if (slotKosong) (window as any).naikKeStage(slotKosong.slot_index); else alert(t('stage_full'));
    }

    async function naikKeStage(index: number) {
        if (!MY_USER_ID) return;
        try {
            if (room?.state === "connected") await room.localParticipant.setMicrophoneEnabled(true);
            const { data: checkSlot } = await sb.from('room_slots').select('profile_id').match({ room_id: CURRENT_ROOM_ID, slot_index: index }).single();
            if (checkSlot?.profile_id !== null) return alert(t('seat_occupied'));
            
            await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID);
            await sb.from('room_slots').update({ profile_id: MY_USER_ID }).match({ room_id: CURRENT_ROOM_ID, slot_index: index });
            await sb.from('profiles').update({ mic_off: false }).eq('id', MY_USER_ID);

            const micIcon = document.getElementById('mic-icon');
            const micText = document.getElementById('mic-text');
            if(micIcon) { micIcon.innerText = "mic"; micIcon.style.color = "#2ecc71"; }
            if(micText) micText.innerText = t('mute_mic');
            fetchStage();
        } catch (err) { alert(t('mic_fail')); }
    }

    async function kickUser(targetId: string, targetName: string) {
        if (!confirm(t('kick_confirm', { name: targetName }))) return;
        await sb.from('room_slots').update({ profile_id: null }).match({ room_id: CURRENT_ROOM_ID, profile_id: targetId });
    }

    async function keluarRoom() {
        if (IS_OWNER && confirm(t('close_room_confirm'))) {
            await sb.from('room_slots').update({ profile_id: null }).eq('room_id', CURRENT_ROOM_ID);
            await sb.from('rooms').update({ is_active: false }).eq('id', CURRENT_ROOM_ID);
            await sb.from('room_messages').delete().eq('room_id', CURRENT_ROOM_ID);
        }
        window.location.href = '/lobby';
    }

    async function openRoomSetting() {
        if (!IS_OWNER) return alert(t('owner_only'));
        const { data } = await sb.from('rooms').select('name').eq('id', CURRENT_ROOM_ID).single();
        const inputName = document.getElementById('edit-room-name') as HTMLInputElement;
        if (data && inputName) inputName.value = data.name;
        window.toggleSidebar(); 
        const modal = document.getElementById('setting-modal');
        if(modal) modal.style.display = 'flex';
    }

    async function saveRoomSetting() {
        const inputName = document.getElementById('edit-room-name') as HTMLInputElement;
        const newName = inputName?.value;
        if (!newName) return alert(t('room_name_empty'));
        try {
            await sb.from('rooms').update({ name: newName }).eq('id', CURRENT_ROOM_ID);
            const title = document.querySelector('.room-title') as HTMLElement;
            if(title) title.innerText = newName.toUpperCase();
            (window as any).closeRoomSetting();
        } catch (e) { alert(e.message); }
    }

    async function checkUser() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { window.location.href = '/lobby'; return false; }
        MY_USER_ID = session.user.id;
        const myProfile = await getCachedProfile(MY_USER_ID);
        const { data: roomData } = await sb.from('rooms').select('owner_id, is_active').eq('id', CURRENT_ROOM_ID).maybeSingle();
        if (myProfile) {
            myUsername = myProfile.username; myRole = myProfile.role || "user"; myTotalGiftSent = myProfile.total_gift_sent || 0; myLevel = myProfile.level || 1;
            const sidebarUser = document.getElementById('sidebar-username');
            const sidebarAvatar = document.getElementById('sidebar-avatar') as HTMLImageElement;
            const userCoins = document.getElementById('user-coins');
            if (sidebarUser) sidebarUser.innerText = myUsername;
            if (sidebarAvatar) sidebarAvatar.src = myProfile.avatar_url || 'asets/png/profile.png';
            if (userCoins) userCoins.innerText = (myProfile.coins || 0).toLocaleString();
            if (myLevel >= 4) setTimeout(() => playVIPEntrance(myUsername, myLevel), 1500); 
        }
        if (roomData) {
            IS_OWNER = roomData.owner_id === MY_USER_ID;
            if (IS_OWNER) {
                const menuSetting = document.getElementById('menu-setting');
                if (menuSetting) menuSetting.style.display = 'flex'; 
                await sb.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID);
            } else if (!roomData.is_active) { alert(t('room_closed_notif')); window.location.href = '/lobby'; return false; }
        }
        fetchStage(); return true; 
    }

    async function fetchTopGifters() {
        try {
            const topUsers = await getRoomLeaderboard();
            const container = document.getElementById('top-gifters-container');
            if (!container) return; 
            if (!topUsers || topUsers.length === 0) { container.innerHTML = ''; container.style.display = 'none'; return; }
            container.style.display = 'flex';
            let html = `<span style="font-size: 11px; color: #FFD700; font-weight: 800; margin-right: 6px;">🏆 ${t('top_rank')}</span><div style="display: flex; align-items: center;">`;
            topUsers.slice(0, 3).forEach((user: any, index: number) => {
                html += `<img src="${user.avatar_url || 'asets/png/profile.png'}" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid ${['#FFD700','#C0C0C0','#CD7F32'][index] || '#555'}; margin-left: ${index === 0 ? '0' : '-12px'}; z-index: ${3-index}; position: relative;">`;
            });
            container.innerHTML = html + `</div>`;
            container.onclick = openTopGiftersModal;
        } catch (err) { console.error(err); }
    }

    async function openTopGiftersModal() {
        const modal = document.getElementById('top-gifters-modal');
        const listContainer = document.getElementById('top-gifters-list');
        if (!modal || !listContainer) return;
        modal.style.display = 'flex';
        listContainer.innerHTML = `<div style="text-align:center; color:#fff; padding: 20px;">${t('loading_leaderboard')}</div>`;
        const topUsers = await getRoomLeaderboard();
        listContainer.innerHTML = topUsers.length === 0 ? `<div style="text-align:center; color:#888;">${t('empty_leaderboard')}</div>` : '';
        topUsers.forEach((user, index) => {
            const lvlBadge = getLevelBadgeHTML(user.level || 1);
            listContainer.innerHTML += `
            <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 6px; background: #2a3648; margin-bottom: 8px;">
                <div style="color: #FFD700; font-weight: 900; width: 28px;">${index + 1}</div>
                <img src="${user.avatar_url || 'asets/png/profile.png'}" style="width: 40px; height: 40px; border-radius: 50%;">
                <div style="flex: 1;">
                    <div style="color: #fff; font-weight: bold; font-size: 14px;">${user.username} ${lvlBadge}</div>
                    <div style="color: #FFD700; font-size: 12px;">${(user.room_total || 0).toLocaleString()} koin</div>
                </div>
            </div>`;
        });
    }

    window.toggleRoomGiftDrawer = () => {
        const drawer = document.getElementById('room-gift-drawer');
        const overlay = document.getElementById('room-drawer-overlay');
        if(drawer) drawer.classList.toggle('open');
        if(overlay) overlay.classList.toggle('show');
        if (drawer?.classList.contains('open')) { updateGiftTargets(); updateLevelProgressUI(); }
    };

    window.naikKeStage = naikKeStage;
    window.turunMic = turunMic;
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
    window.closeRoomSetting = () => { const m = document.getElementById('setting-modal'); if(m) m.style.display = 'none'; };
    window.saveRoomSetting = saveRoomSetting;
    window.closeConfirmModal = () => { const m = document.getElementById('confirm-modal'); if(m) m.style.display = 'none'; };
    window.openTopGiftersModal = openTopGiftersModal;
    window.closeTopGiftersModal = () => { const m = document.getElementById('top-gifters-modal'); if(m) m.style.display = 'none'; };

    const checkSDK = setInterval(() => { if (typeof LivekitClient !== 'undefined') { clearInterval(checkSDK); initApp(); } }, 500);

    return () => {
        if (room) room.disconnect();
        sb.removeAllChannels(); 
        clearInterval(checkSDK); 
        ['gift-anim-overlay', 'vip-entrance-overlay', 'vip-anim-styles-clean', 'room-gift-drawer', 'room-drawer-overlay'].forEach(id => document.getElementById(id)?.remove());
    };
  }, [t]); 

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
