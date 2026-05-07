'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { supabase as sb } from '@/lib/supabase'; 
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
    // Helper animasi biar TS ga marah
    playGiftAnimation?: (giftId: number | string, forcedCombo?: number | null) => void;
  }
  var LivekitClient: any;
  var toast: (title: string, msg: string, type: string) => void;
}

export default function RoomPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
    let activeCombos: Record<string, any> = {}; 

    const titleEl = document.querySelector('.room-title') as HTMLElement;
    if (titleEl) titleEl.innerText = CURRENT_ROOM_NAME.toUpperCase();

    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    if (chatInput) {
        chatInput.addEventListener('focus', () => {
            const drawer = document.getElementById('room-gift-drawer');
            // 🔥 FIX VERCEL: Pake Optional Chaining ?.()
            if (drawer && drawer.classList.contains('open')) {
                window.toggleRoomGiftDrawer?.(); 
            }
            setTimeout(() => {
                window.scrollTo(0, 0);
                const chatBox = document.getElementById('chat-box');
                if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
            }, 300);
        });
    }

    // --- HELPER LOGICS (LEVEL, BADGE, STYLE) ---
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
        let overlay = document.getElementById('vip-entrance-overlay');
        if (overlay) overlay.remove(); 
        overlay = document.createElement('div');
        overlay.id = 'vip-entrance-overlay';
        overlay.className = 'vip-banner-clean';
        
        let bgStyle = "", textHTML = "";
        if (level === 4) { 
            bgStyle = "background: rgba(14, 165, 233, 0.95); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(14, 165, 233, 0.4); backdrop-filter: blur(10px); position: fixed; top: 60%; left: 50%; z-index: 1000000; padding: 12px 28px; border-radius: 12px; color: #fff; width: max-content; transform: translate(-50%, -50%);";
            textHTML = `<span>SULTAN</span> <b>${username}</b> <span>${t('entering_room')}</span>`;
        } else { 
            bgStyle = "background: rgba(225, 29, 72, 0.95); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(225, 29, 72, 0.4); backdrop-filter: blur(10px); position: fixed; top: 60%; left: 50%; z-index: 1000000; padding: 12px 28px; border-radius: 12px; color: #fff; width: max-content; transform: translate(-50%, -50%);";
            textHTML = `<span>LEGEND</span> <b>${username}</b> <span>${t('entering_room')}</span>`;
        }
        overlay.setAttribute('style', bgStyle);
        overlay.innerHTML = textHTML;
        document.body.appendChild(overlay);
        setTimeout(() => { if (overlay) overlay.remove(); }, 4000);
    }

    // --- ANIMASI GIFT & COMBO ---
    function playGiftAnimation(giftId: number | string, forcedCombo: number | null = null) {
        const id = typeof giftId === 'string' ? parseInt(giftId) : (giftId || 1);
        const gifPath = `asets/gif/giftvid${id}.gif`; 
        if (forcedCombo !== null) { giftComboCount = forcedCombo; lastGiftId = id; } 
        else { if (lastGiftId === id) giftComboCount++; else { giftComboCount = 1; lastGiftId = id; } }

        let overlay = document.getElementById('gift-anim-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gift-anim-overlay';
            overlay.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:9999999; display:flex; justify-content:center; align-items:center; background:rgba(0,0,0,0.2);";
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center;">
                <img src="${gifPath}?t=${Date.now()}" style="width:280px; filter:drop-shadow(0 0 20px gold);">
                <div id="combo-txt" style="font-size:80px; font-weight:900; color:#ffeb3b; text-shadow:4px 4px #f44336; margin-top:-60px; transform:scale(1.2) rotate(-15deg);">
                    <img src="asets/png/gift${id}.png" style="width:150px;"> ${giftComboCount > 1 ? 'x'+giftComboCount : ''}
                </div>
            </div>`;

        if (giftAnimTimer) clearTimeout(giftAnimTimer);
        giftAnimTimer = setTimeout(() => { if(overlay) overlay.style.display = 'none'; giftComboCount = 0; lastGiftId = null; }, 3000);
    }

    // --- REALTIME PRESENCE & MESSAGES ---
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
            const isGift = p.new.username === "SISTEM_GIFT";
            let comboValue = 1;
            if (isGift) {
                const match = p.new.text.match(/^(.+) mengirim .+ x(\d+) ke/);
                if (match) comboValue = parseInt(match[2]); 
                if (!p.new.text.startsWith(`${myUsername} `)) playGiftAnimation(p.new.role, comboValue);
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
                const userLink = `<span onclick="window.location.href='/data?username=${encodeURIComponent(p.new.username)}'" style="color:${style.color}; font-weight:bold; cursor:pointer;">${p.new.username}${lvlBadge}${roleBadge}</span>`;
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

    // --- LEVEL PROGRESS ---
    const LEVEL_THRESHOLDS: Record<number, number> = { 1: 0, 2: 1000, 3: 5000, 4: 20000, 5: 50000 };
    function checkLevelUp(totalGiftSent: number) {
        if (totalGiftSent >= LEVEL_THRESHOLDS[5]) return { level: 5, name: "LEGEND", color: "#FF0055" };
        if (totalGiftSent >= LEVEL_THRESHOLDS[4]) return { level: 4, name: "SULTAN", color: "#00E5FF" };
        if (totalGiftSent >= LEVEL_THRESHOLDS[3]) return { level: 3, name: "PATRON", color: "#BB86FC" };
        if (totalGiftSent >= LEVEL_THRESHOLDS[2]) return { level: 2, name: "SUPPORTER", color: "#FFD700" };
        return { level: 1, name: "NEWBIE", color: "#FFFFFF" };
    }

    function updateLevelProgressUI() {
        const container = document.getElementById('level-progress-container');
        if (!container) return; 
        let prevTarget = 0, currentTarget = 1000, currentName = "NEWBIE";
        if (myLevel === 2) { prevTarget = 1000; currentTarget = 5000; currentName = "SUPPORTER"; }
        else if (myLevel === 3) { prevTarget = 5000; currentTarget = 20000; currentName = "PATRON"; }
        else if (myLevel === 4) { prevTarget = 20000; currentTarget = 50000; currentName = "SULTAN"; }
        else if (myLevel >= 5) { container.innerHTML = `<div style="color: #FF0055; font-weight: bold;">LEVEL MAX (LEGEND)</div>`; return; }
        
        const needed = currentTarget - myTotalGiftSent;
        const percent = Math.min(100, ((myTotalGiftSent - prevTarget) / (currentTarget - prevTarget)) * 100);
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-bottom: 6px;">
                <span>LVL ${myLevel} (${currentName})</span>
                <span>Butuh <b style="color:#f1c40f">${needed}</b> koin lagi</span>
            </div>
            <div style="width: 100%; height: 6px; background: #333; border-radius: 4px; overflow: hidden;">
                <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #00ff88, #00d2ff);"></div>
            </div>`;
    }

    // --- LOGIKA SAWIR / SEND GIFT ---
    async function sendGift(giftName: string, harga: number | string, giftId: number | string, jumlah = 1) {
        if (!selectedTargetId) return alert(t('select_target'));
        if (selectedTargetId === MY_USER_ID) return alert(t('gift_self_alert'));
        
        const totalHarga = (typeof harga === 'string' ? parseInt(harga) : harga) * jumlah; 
        const coinDisplay = document.getElementById('user-coins');
        let currentCoins = coinDisplay ? parseInt(coinDisplay.innerText.replace(/[,.]/g, '')) : 0;
        if (currentCoins < totalHarga) return alert(t('min_topup_warning'));

        playGiftAnimation(giftId);
        const comboKey = `${giftName}_${selectedTargetId}`;
        if (!activeCombos[comboKey]) activeCombos[comboKey] = { count: 0, pendingCoins: 0, syncTimer: null };
        const combo = activeCombos[comboKey];
        combo.count += jumlah; combo.pendingCoins += totalHarga;

        if (combo.syncTimer) clearTimeout(combo.syncTimer);
        combo.syncTimer = setTimeout(async () => {
            const finalCoins = combo.pendingCoins; const finalCount = combo.count; delete activeCombos[comboKey];
            try {
                const { data: newTotal, error } = await sb.rpc('transfer_gift', { sender_id: MY_USER_ID, receiver_id: selectedTargetId, amount: finalCoins });
                if (error) throw error;

                await sb.from('coin_history').insert([{ user_id: MY_USER_ID, transaction_type: 'send_gift', amount: -finalCoins, description: `Kirim ${giftName} x${finalCount} ke ${selectedTargetName}` }]);
                
                let lvlData = checkLevelUp(newTotal);
                if (lvlData.level !== myLevel) {
                    await sb.from('profiles').update({ level: lvlData.level }).eq('id', MY_USER_ID);
                    await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: t('congrats_level_up', { name: myUsername, level: lvlData.level }), role: "admin" }]);
                }
                myTotalGiftSent = newTotal; myLevel = lvlData.level; updateLevelProgressUI();
                const text = `${myUsername} mengirim ${giftName} x${finalCount} ke ${selectedTargetName}`;
                await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM_GIFT", text, role: giftId.toString(), level: myLevel }]);
            } catch (e) { alert(t('gift_fail')); }
        }, 600);
    }

    // --- LEADERBOARD ROOM ---
    async function getRoomLeaderboard() {
        const { data: messages } = await sb.from('room_messages').select('text, role').eq('room_id', CURRENT_ROOM_ID).eq('username', 'SISTEM_GIFT');
        if (!messages) return [];
        const hargaKado: Record<string, number> = { '1': 1, '2': 10, '3': 50, '4': 100, '5': 2000 };
        let totals: Record<string, number> = {};
        messages.forEach((m: any) => {
            const match = m.text.match(/^(.+) mengirim (.+) x(\d+) ke/);
            if (match) {
                const user = match[1]; const count = parseInt(match[3]); const price = hargaKado[m.role] || 0;
                totals[user] = (totals[user] || 0) + (price * count);
            }
        });
        const users = Object.keys(totals).sort((a, b) => totals[b] - totals[a]).slice(0, 10);
        if (users.length === 0) return [];
        const { data: profs } = await sb.from('profiles').select('username, avatar_url, level, role').in('username', users);
        return (profs || []).map(p => ({ ...p, room_total: totals[p.username] })).sort((a, b) => b.room_total - a.room_total);
    }

    async function fetchTopGifters() {
        const top = await getRoomLeaderboard();
        const container = document.getElementById('top-gifters-container');
        if (!container) return;
        if (top.length === 0) { container.style.display = 'none'; return; }
        container.style.display = 'flex';
        container.innerHTML = `<span style="font-size: 11px; color: #FFD700; font-weight:800;">🏆 ${t('top_rank')}</span>`;
        top.slice(0, 3).forEach((u, i) => {
            container.innerHTML += `<img src="${u.avatar_url || 'asets/png/profile.png'}" style="width:28px; height:28px; border-radius:50%; border:2px solid #555; margin-left:-12px; z-index:${3-i};">`;
        });
        container.onclick = window.openTopGiftersModal;
    }

    // --- CORE APP INIT ---
    async function initApp() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { window.location.href = '/lobby'; return; }
        MY_USER_ID = session.user.id;
        const { data: p } = await sb.from('profiles').select('*').eq('id', MY_USER_ID).single();
        if (p) { myUsername = p.username; myRole = p.role; myLevel = p.level || 1; myTotalGiftSent = p.total_gift_sent || 0; }
        
        if (typeof window.LivekitClient !== 'undefined') {
            try {
                const res = await fetch(`${supabaseUrl}/functions/v1/get-livekit-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey || '', 'Authorization': `Bearer ${supabaseKey}` },
                    body: JSON.stringify({ username: myUsername, identity: MY_USER_ID, roomName: CURRENT_ROOM_ID })
                });
                const { token } = await res.json();
                room = new window.LivekitClient.Room({ adaptiveStream: true, dynacast: true });
                room.on('activeSpeakersChanged', (speakers: any[]) => {
                    document.querySelectorAll('.avatar').forEach(el => el.classList.remove('speaking'));
                    speakers.forEach(s => document.querySelector(`[data-user-id="${s.identity}"]`)?.classList.add('speaking'));
                });
                await room.connect("wss://voicegrup-zxmeibkn.livekit.cloud", token);
                await room.localParticipant.setMicrophoneEnabled(false);
            } catch (e) { console.error(e); }
        }
        fetchStage(); listenRealtime(); fetchTopGifters();
    }

    async function fetchStage() {
        const { data } = await sb.from('room_slots').select('*, profiles(*)').eq('room_id', CURRENT_ROOM_ID).order('slot_index');
        const grid = document.getElementById('stage-grid');
        if (!grid || !data) return;
        grid.innerHTML = "";
        data.forEach((slot: any) => {
            const user = slot.profiles; const isMe = user?.id === MY_USER_ID;
            const item = document.createElement('div'); item.className = 'speaker-item';
            if (user) {
                const style = getLevelStyle(user.level);
                item.innerHTML = `
                    <div class="avatar ${isMe ? 'active' : ''}" data-user-id="${user.id}" onclick="window.${isMe ? 'turunMic' : 'toggleKickBtn'}(this, true)">
                        <img src="${user.avatar_url || 'asets/png/profile.png'}">
                        <div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'};"><span class="material-icons">mic_off</span></div>
                    </div><span class="name-label" style="color:${style.color}">${user.username}${getLevelBadgeHTML(user.level)}</span>`;
            } else {
                item.innerHTML = `<div class="avatar" onclick="window.naikKeStage?.(${slot.slot_index})"><span class="material-icons">add</span></div><span class="name-label">${t('empty_slot')}</span>`;
            }
            grid.appendChild(item);
        });
    }

    // --- GLOBAL WINDOW ASSIGNMENTS (WITH SAFE CALLS) ---
    window.sendGift = sendGift;
    window.naikKeStage = async (idx) => {
        await sb.from('room_slots').update({ profile_id: MY_USER_ID }).match({ room_id: CURRENT_ROOM_ID, slot_index: idx });
        await room?.localParticipant.setMicrophoneEnabled(true);
        fetchStage();
    };
    window.turunMic = () => { const m = document.getElementById('confirm-modal'); if(m) m.style.display = 'flex'; };
    window.prosesTurunMic = async () => {
        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID);
        await room?.localParticipant.setMicrophoneEnabled(false);
        const m = document.getElementById('confirm-modal'); if(m) m.style.display = 'none';
        fetchStage();
    };
    window.toggleRoomGiftDrawer = () => {
        const d = document.getElementById('room-gift-drawer');
        const o = document.getElementById('room-drawer-overlay');
        d?.classList.toggle('open'); o?.classList.toggle('show');
        if (d?.classList.contains('open')) {
            updateLevelProgressUI();
            // Fetch targets
            sb.from('room_slots').select('profile_id, profiles(username, avatar_url)').eq('room_id', CURRENT_ROOM_ID).not('profile_id', 'is', null).neq('profile_id', MY_USER_ID)
            .then(({data}) => {
                const tc = document.getElementById('gift-targets');
                if(!tc) return; tc.innerHTML = "";
                if(!data?.length) { tc.innerHTML = `<span style="font-size:12px; color:#888;">${t('only_you_here')}</span>`; return; }
                data.forEach((s:any, i) => {
                    const div = document.createElement('div'); div.className = `target-user ${selectedTargetId === s.profile_id ? 'selected' : ''}`;
                    div.onclick = () => { selectedTargetId = s.profile_id; selectedTargetName = s.profiles.username; window.toggleRoomGiftDrawer?.(); window.toggleRoomGiftDrawer?.(); };
                    div.innerHTML = `<img src="${s.profiles.avatar_url || 'asets/png/profile.png'}" class="target-avatar"><span>${s.profiles.username}</span>`;
                    tc.appendChild(div);
                    if(!selectedTargetId && i === 0) { selectedTargetId = s.profile_id; selectedTargetName = s.profiles.username; div.classList.add('selected'); }
                });
            });
        }
    };
    window.toggleSidebar = () => { document.getElementById('sidebar')?.classList.toggle('active'); document.getElementById('sidebar-overlay')?.classList.toggle('active'); };
    window.openTopGiftersModal = async () => {
        const m = document.getElementById('top-gifters-modal'); const l = document.getElementById('top-gifters-list');
        if(m && l) { m.style.display = 'flex'; l.innerHTML = `<div style="color:#fff; padding:20px;">${t('loading_leaderboard')}</div>`;
            const top = await getRoomLeaderboard(); l.innerHTML = "";
            top.forEach((u, i) => {
                l.innerHTML += `<div style="display:flex; align-items:center; gap:12px; padding:10px; background:#2a3648; border-radius:8px; margin-bottom:8px;">
                    <div style="font-weight:900; color:#FFD700; width:25px;">${i+1}</div>
                    <img src="${u.avatar_url || 'asets/png/profile.png'}" style="width:40px; height:40px; border-radius:50%;">
                    <div style="flex:1;"><div style="color:#fff; font-weight:bold;">${u.username}</div><div style="color:#FFD700; font-size:12px;">${u.room_total.toLocaleString()} koin</div></div>
                </div>`;
            });
        }
    };

    const sdkInterval = setInterval(() => { if (typeof window.LivekitClient !== 'undefined') { clearInterval(sdkInterval); initApp(); } }, 500);

    return () => {
        clearInterval(sdkInterval); room?.disconnect();
        ['room-gift-drawer', 'room-drawer-overlay', 'gift-anim-overlay', 'vip-entrance-overlay'].forEach(id => document.getElementById(id)?.remove());
    };
  }, [t]);

  if (!mounted) return null;

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
