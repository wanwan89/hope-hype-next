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
    toggleMicSidebar?: (event?: any) => void; /* 🔥 INI UDAH JADI 'any' 🔥 */
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
    if (window.__VOICE_ROOM_INIT__) return;
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
            const drawer = document.getElementById('gift-drawer');
            if (drawer && drawer.classList.contains('open')) {
                toggleGiftDrawer();
            }
            // 🔥 FIX: Buang scrollIntoView, ganti pakai trik nahan layar tetep di atas 🔥
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
            textHTML = `<span style="color:#fff; font-size: 13px; font-weight: 600; letter-spacing: 1px;">SULTAN</span> <b style="color:#fff; font-size: 15px; font-weight: 800; text-transform: uppercase; margin: 0 4px;">${username}</b> <span style="color:#fff; font-size: 13px; font-weight: 600;">MEMASUKI ROOM</span>`;
        } else if (level >= 5) { 
            bgStyle = "background: rgba(225, 29, 72, 0.95); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(225, 29, 72, 0.4); backdrop-filter: blur(10px);";
            textHTML = `<span style="color:#fff; font-size: 13px; font-weight: 600; letter-spacing: 1px;">LEGEND</span> <b style="color:#fff; font-size: 15px; font-weight: 800; text-transform: uppercase; margin: 0 4px;">${username}</b> <span style="color:#fff; font-size: 13px; font-weight: 600;">MEMASUKI ROOM</span>`;
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
            
            if (!data.token) {
                throw new Error("Server tidak memberikan Token. Cek Edge Function kamu!");
            }

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
            console.log("✅ Terhubung ke Room:", roomName);

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
                    <span class="name-label">KOSONG</span>`;
            }
            grid.appendChild(item);
        });
    }

    function playGiftAnimation(giftId: number | string, forcedCombo: number | null = null) {
        const id = typeof giftId === 'string' ? parseInt(giftId) : (giftId || 1);
        const gifPath = `asets/gif/giftvid${id}.gif`; 
        
        if (forcedCombo !== null) {
            giftComboCount = forcedCombo;
            lastGiftId = id;
        } else {
            if (lastGiftId === id) {
                giftComboCount++;
            } else {
                giftComboCount = 1;
                lastGiftId = id;
            }
        }

        let overlay = document.getElementById('gift-anim-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gift-anim-overlay';
            overlay.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:9999999; display:none; justify-content:center; align-items:center; background:rgba(0,0,0,0.2); opacity:0; transition:opacity 0.3s;";
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; position:relative;">
                <img id="gift-anim-img" src="${gifPath}?t=${Date.now()}" 
                     style="width:280px; max-width:85%; object-fit:contain; filter:drop-shadow(0 0 20px gold);">
                <div id="gift-combo-text" 
                     style="font-family:'Inter',sans-serif; font-size:80px; font-weight:900; color:#ffeb3b; 
                            text-shadow:4px 4px 0px #f44336, 0 0 20px rgba(255,255,0,0.8); 
                            transform:rotate(-15deg) scale(0); transition:transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
                            margin-top:-60px; z-index:100;">
                </div>
            </div>`;

        const comboEl = document.getElementById('gift-combo-text');
        if (!comboEl) return;

        overlay.style.display = 'flex';
        setTimeout(() => { if(overlay) overlay.style.opacity = '1'; }, 10);

        const iconPngPath = `asets/png/gift${id}.png`; 

        if (giftComboCount === 1) {
            comboEl.innerHTML = `
                <img src="${iconPngPath}" style="width: 150px; height: 150px; object-fit: contain; filter: drop-shadow(3px 3px 0px #f44336);">
            `;
            setTimeout(() => { if(comboEl) comboEl.style.transform = "rotate(-15deg) scale(1.2)"; }, 50);

        } else if (giftComboCount > 1) {
            comboEl.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                    <img src="${iconPngPath}" style="width: 150px; height: 150px; object-fit: contain; filter: drop-shadow(3px 3px 0px #f44336);">
                    <span>x${giftComboCount}</span>
                </div>
            `;
            setTimeout(() => { if(comboEl) comboEl.style.transform = "rotate(-15deg) scale(1.2)"; }, 50);
        }

        if (giftAnimTimer) clearTimeout(giftAnimTimer);
        giftAnimTimer = setTimeout(() => {
            if(overlay) overlay.style.opacity = '0';
            setTimeout(() => { 
                if(overlay) overlay.style.display = 'none'; 
                giftComboCount = 0; 
                lastGiftId = null;
            }, 300);
        }, 3000); 
    }

    function listenRealtime() {
        if (!CURRENT_ROOM_ID || !MY_USER_ID) return;
        const roomChannel = sb.channel(`room_active_${CURRENT_ROOM_ID}`, { config: { presence: { key: MY_USER_ID } } });

        roomChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => { 
            fetchStage(); 
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (p: any) => { 
            fetchStage(); 
            if (p.new && p.new.id === MY_USER_ID) {
                const coinDisplay = document.getElementById('user-coins');
                if (coinDisplay) {
                    coinDisplay.innerText = (p.new.coins || 0).toLocaleString();
                }
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
            
            let isDariSaya = false;
            let comboValue = 1;
            
            if (isGift) {
                const match = p.new.text.match(/^(.+) mengirim .+ x(\d+) ke/);
                
                if (match) {
                    const pengirim = match[1]; 
                    comboValue = parseInt(match[2]); 
                    isDariSaya = (pengirim === myUsername);
                } else {
                    isDariSaya = p.new.text.startsWith(`${myUsername} `);
                }
            }

            const div = document.createElement('div'); 
            div.id = `msg-${p.new.id}`;
            
            if (isGift) {
                div.className = 'msg system-gift'; 
                div.innerHTML = `<span>🎁 ${p.new.text}</span>`;
                
                if (!isDariSaya) {
                    playGiftAnimation(parseInt(p.new.role), comboValue);
                }
            } else {
                const isSystem = p.new.username.startsWith("SISTEM");
                div.className = isSystem ? 'msg system' : 'msg';
                
                const style = getLevelStyle(p.new.level || 1);
                const lvlBadge = getLevelBadgeHTML(p.new.level || 1);
                const roleBadge = getUserBadge(p.new.role || '');
                
                const userLink = `
                    <span onclick="window.location.href='/data?username=${encodeURIComponent(p.new.username)}'" 
                          style="color:${style.color}; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; position:relative; z-index:10; pointer-events:auto;">
                        ${p.new.username}${lvlBadge}${roleBadge}
                    </span>`;
                
                div.innerHTML = isSystem 
                    ? `<span>${p.new.text}</span>` 
                    : `${userLink}<span>: ${p.new.text}</span>`;
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
            newPresences.forEach((p: any) => { 
                if (p.key !== MY_USER_ID && p.level >= 4) playVIPEntrance(p.username, p.level); 
            });
        })
        .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                await roomChannel.track({ 
                    online_at: new Date().toISOString(), 
                    username: myUsername, 
                    level: myLevel 
                });
            }
        });
    }

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
        let prevTarget = 0, currentTarget = 0, currentName = "";
        if (myLevel === 1) { prevTarget = 0; currentTarget = 1000; currentName = "NEWBIE"; }
        else if (myLevel === 2) { prevTarget = 1000; currentTarget = 5000; currentName = "SUPPORTER"; }
        else if (myLevel === 3) { prevTarget = 5000; currentTarget = 20000; currentName = "PATRON"; }
        else if (myLevel === 4) { prevTarget = 20000; currentTarget = 50000; currentName = "SULTAN"; }
        else { container.innerHTML = `<div style="text-align:center; font-size: 13px; color: #FF0055; font-weight: bold; margin: 15px 0;">LEVEL MAX (LEGEND)</div>`; return; }
        let needed = currentTarget - myTotalGiftSent;
        let percent = ((myTotalGiftSent - prevTarget) / (currentTarget - prevTarget)) * 100;
        if (percent > 100) percent = 100;
        container.innerHTML = `<div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-bottom: 6px; padding: 0 5px;"><span>LVL ${myLevel} (${currentName})</span><span>Butuh <b style="color:#f1c40f">${needed} koin</b> lagi</span></div><div style="width: 100%; height: 6px; background: #333; border-radius: 4px; overflow: hidden;"><div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #00ff88, #00d2ff); transition: width 0.5s ease-out;"></div></div>`;
    }

    let activeCombos: Record<string, any> = {}; 

    async function sendGift(giftName: string, harga: number | string, giftId: number | string, jumlah = 1) {
        if (!selectedTargetId) return alert("Pilih target!");

        if (selectedTargetId === MY_USER_ID) {
            if (typeof toast === "function") toast("Waduh", "Masa nyawer diri sendiri?", "warning");
            return alert("Nggak bisa gift ke diri sendiri, Bree!");
        }
        
        const coinDisplay = document.getElementById('user-coins');
        if (!coinDisplay) return;
        
        let saldoSkrg = parseInt(coinDisplay.innerText.replace(/[,.]/g, ''));
        let totalHarga = (typeof harga === 'string' ? parseInt(harga) : harga) * jumlah; 

        if (saldoSkrg < totalHarga) {
            return alert("Koin lo kurang Bree!");
        }
        
        saldoSkrg -= totalHarga;
        coinDisplay.innerText = saldoSkrg.toLocaleString(); 
        
        if (typeof playGiftAnimation === "function") playGiftAnimation(giftId);

        const targetIdDikunci = selectedTargetId; 
        const targetNameDikunci = selectedTargetName;
        const comboKey = `${giftName}_${targetIdDikunci}`;

        if (!activeCombos[comboKey]) {
            activeCombos[comboKey] = { 
                targetId: targetIdDikunci,
                targetName: targetNameDikunci,
                count: 0, 
                pendingCoins: 0, 
                msgId: null,
                syncTimer: null 
            };
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
                const { data: newTotalGift, error } = await sb.rpc('transfer_gift', {
                    sender_id: MY_USER_ID,
                    receiver_id: finalTargetId,
                    amount: coinsToDeduct
                });

                if (error) {
                    console.error("Gagal transfer:", error.message);
                    alert("Gagal kirim kado!"); 
                    const coinDisplayNow = document.getElementById('user-coins');
                    if (coinDisplayNow) {
                        const koinBalik = parseInt(coinDisplayNow.innerText.replace(/[,.]/g, '')) + coinsToDeduct;
                        coinDisplayNow.innerText = koinBalik.toLocaleString();
                    }
                    return; 
                }

                await sb.from('coin_history').insert([{
                    user_id: MY_USER_ID,
                    transaction_type: 'send_gift',
                    amount: -coinsToDeduct, 
                    description: `Kirim ${giftName} x${currentCount} ke ${finalTargetName}`,
                    balance_after: saldoSkrg 
                }]);

                await sb.from('coin_history').insert([{
                    user_id: finalTargetId,
                    transaction_type: 'receive_gift',
                    amount: coinsToDeduct, 
                    description: `Terima ${giftName} x${currentCount} dari ${myUsername}`,
                    balance_after: 0 
                }]);

                let levelData = checkLevelUp(newTotalGift);
                if (levelData.level !== myLevel) {
                    await sb.from('profiles').update({ level: levelData.level }).eq('id', MY_USER_ID);
                    await sb.from('room_messages').insert([{ 
                        room_id: CURRENT_ROOM_ID, 
                        username: "SISTEM", 
                        text: `⭐ SELAMAT! ${myUsername} naik ke Level ${levelData.level}!`, 
                        role: "admin" 
                    }]);
                }

                myTotalGiftSent = newTotalGift; 
                myLevel = levelData.level;
                if (typeof updateLevelProgressUI === "function") updateLevelProgressUI(); 

                const teksFinal = `${myUsername} mengirim ${giftName} x${currentCount} ke ${finalTargetName}`;
                if (savedMsgId) {
                    await sb.from('room_messages').update({ text: teksFinal }).eq('id', savedMsgId);
                } else {
                    const { data } = await sb.from('room_messages').insert([{ 
                        room_id: CURRENT_ROOM_ID, 
                        username: "SISTEM_GIFT", 
                        text: teksFinal, 
                        role: giftId.toString(), 
                        level: myLevel 
                    }]).select();
                    if (data && data.length > 0) activeCombos[comboKey] = { ...activeCombos[comboKey], msgId: data[0].id };
                }

            } catch (e: any) { 
                console.error("Error sistem gift:", e.message); 
            }

        }, 600); 
    }

    async function kirimKomentar() {
        const inputEl = document.getElementById('chat-input') as HTMLInputElement;
        if (!inputEl) return;

        const text = inputEl.value.trim();
        if (!text) return; 

        try {
            const currentLevel = myLevel || 1;
            const currentRole = myRole || "user";

            const { error } = await sb.from('room_messages').insert([{ 
                room_id: CURRENT_ROOM_ID, 
                username: myUsername, 
                text: text, 
                role: currentRole, 
                level: currentLevel 
            }]);

            if (error) {
                console.error("Gagal kirim chat:", error.message);
            } else {
                inputEl.value = ""; 
                inputEl.focus(); 
                // 🔥 FIX: Scroll otomatis chat ke bawah aja, tanpa bikin layar naik 🔥
                setTimeout(() => {
                    const chatBox = document.getElementById('chat-box');
                    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
                }, 100);
            }
        } catch (err) { 
            console.error("System Error:", err); 
        }
    }

    function toggleSidebar() {
        document.getElementById('sidebar')?.classList.toggle('active');
        document.getElementById('sidebar-overlay')?.classList.toggle('active');
    }

    async function toggleMicSidebar(event?: Event) {
        if (event) event.preventDefault(); 

        if (!room || !room.localParticipant) {
            return alert("Koneksi audio belum siap!");
        }

        const myAvatarOnStage = document.querySelector(`.avatar[data-user-id="${MY_USER_ID}"]`);
        if (!myAvatarOnStage) {
            return alert("Kamu belum naik panggung! Naik dulu untuk memakai Mic.");
        }

        try {
            const isMicOn = room.localParticipant.isMicrophoneEnabled;
            const newStatus = !isMicOn;
            await room.localParticipant.setMicrophoneEnabled(newStatus);

            await sb.from('profiles').update({ mic_off: !newStatus }).eq('id', MY_USER_ID);

            const micIcon = document.getElementById('mic-icon');
            const micText = document.getElementById('mic-text');

            if (newStatus) { 
                if(micIcon) { micIcon.innerText = "mic"; micIcon.style.color = "#2ecc71"; }
                if(micText) micText.innerText = "Matikan Mic"; 
            } else { 
                if(micIcon) { micIcon.innerText = "mic_off"; micIcon.style.color = "#e74c3c"; }
                if(micText) micText.innerText = "Hidupkan Mic";
            }

            fetchStage(); 
            toggleSidebar(); 

        } catch (err) { 
            console.error("LiveKit Mic Error:", err);
            alert("Gagal mengakses mic! Cek Izin Mikrofon di Pengaturan Situs Chrome kamu."); 
        }
    }

    function toggleGiftDrawer() {
        const drawer = document.getElementById('gift-drawer');
        const overlay = document.getElementById('drawer-overlay');
        if(drawer) drawer.classList.toggle('open');
        if(overlay) overlay.classList.toggle('show');
        
        if (drawer && drawer.classList.contains('open')) {
            updateGiftTargets();
            updateLevelProgressUI(); 
        }
    }

    async function updateGiftTargets() {
        const targetContainer = document.getElementById('gift-targets');
        if (!targetContainer) return;

        const { data: slots } = await sb.from('room_slots')
            .select(`profile_id, profiles (username, avatar_url)`)
            .eq('room_id', CURRENT_ROOM_ID)
            .not('profile_id', 'is', null)
            .neq('profile_id', MY_USER_ID); 

        targetContainer.innerHTML = "";

        if (!slots || slots.length === 0) {
            selectedTargetId = null; 
            selectedTargetName = "";
            return targetContainer.innerHTML = "<span style='font-size:12px; color:#888; padding: 10px;'>Cuma ada kamu disi</span>";
        }

        slots.forEach((slot, index) => {
            const isSelected = selectedTargetId === slot.profile_id;
            const div = document.createElement('div'); 
            
            div.classList.add('target-user');
            if (isSelected) div.classList.add('selected');
            
            div.onclick = () => { 
                selectedTargetId = slot.profile_id; 
                selectedTargetName = slot.profiles.username; 
                updateGiftTargets(); 
            };

            div.innerHTML = `
                <img src="${slot.profiles.avatar_url || 'asets/png/profile.png'}" class="target-avatar">
                <span class="target-name">${slot.profiles.username}</span>
            `;
            
            targetContainer.appendChild(div);

            if (!selectedTargetId && index === 0) { 
                selectedTargetId = slot.profile_id; 
                selectedTargetName = slot.profiles.username; 
                div.classList.add('selected'); 
            }
        });
    }

    function toggleKickBtn(el: HTMLElement, canKick: boolean) {
        if (!canKick) return;
        const wrapper = el.querySelector('.kick-btn-wrapper') as HTMLElement;
        document.querySelectorAll('.kick-btn-wrapper').forEach(w => { 
            if (w !== wrapper) (w as HTMLElement).style.display = 'none'; 
        });
        if(wrapper) wrapper.style.display = wrapper.style.display === 'none' ? 'flex' : 'none';
    }

    async function mintaNaik() {
        const { data: allSlots } = await sb.from('room_slots').select('slot_index, profile_id').order('slot_index', { ascending: true });
        if(!allSlots) return;
        const slotKosong = allSlots.find((s: any) => !s.profile_id);
        if (slotKosong) naikKeStage(slotKosong.slot_index); else alert("Panggung penuh!");
    }

    async function naikKeStage(index: number) {
        if (!MY_USER_ID) return alert("Login dulu!");

        try {
            if (room && room.state === "connected") {
                await room.localParticipant.setMicrophoneEnabled(true);
            }

            const { data: checkSlot } = await sb.from('room_slots').select('profile_id').match({ room_id: CURRENT_ROOM_ID, slot_index: index }).single();
            if (checkSlot && checkSlot.profile_id !== null) {
                await room.localParticipant.setMicrophoneEnabled(false);
                return alert("Kursi sudah ada yang menempati!");
            }
            
            await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID);
            await sb.from('room_slots').update({ profile_id: MY_USER_ID }).match({ room_id: CURRENT_ROOM_ID, slot_index: index });
            await sb.from('profiles').update({ mic_off: false }).eq('id', MY_USER_ID);

            const micIcon = document.getElementById('mic-icon');
            const micText = document.getElementById('mic-text');
            if(micIcon) { micIcon.innerText = "mic"; micIcon.style.color = "#2ecc71"; }
            if(micText) micText.innerText = "Matikan Mic";

            fetchStage();
        } catch (err) {
            console.error("Gagal naik panggung:", err);
            alert("Gagal naik! Pastikan HP kamu tidak memblokir akses mikrofon.");
        }
    }

    function turunMic(index: number) {
        const modal = document.getElementById('confirm-modal');
        if (modal) modal.style.display = 'flex';
    }

    async function prosesTurunMic() {
        const modal = document.getElementById('confirm-modal');
        if(modal) modal.style.display = 'none';
        
        try {
            if (room && room.localParticipant) {
                await room.localParticipant.setMicrophoneEnabled(false);
            }

            await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID);
            await sb.from('profiles').update({ mic_off: true }).eq('id', MY_USER_ID);

            const micIcon = document.getElementById('mic-icon');
            const micText = document.getElementById('mic-text');
            if(micIcon) { micIcon.innerText = "mic_off"; micIcon.style.color = "#e74c3c"; }
            if(micText) micText.innerText = "Hidupkan Mic";

            fetchStage();
        } catch (err) {
            console.error("Gagal turun:", err);
        }
    }

    async function kickUser(targetId: string, targetName: string) {
        if (!confirm(`Kick ${targetName}?`)) return;
        await sb.from('room_slots').update({ profile_id: null }).match({ room_id: CURRENT_ROOM_ID, profile_id: targetId });
        await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `${targetName} dikeluarkan.` }]);
    }

    async function keluarRoom() {
        if (IS_OWNER && confirm("Tutup panggung dan bersihkan riwayat? (Leaderboard akan direset)")) {
            await sb.from('room_slots').update({ profile_id: null }).eq('room_id', CURRENT_ROOM_ID);
            await sb.from('rooms').update({ is_active: false }).eq('id', CURRENT_ROOM_ID);
            await sb.from('room_messages').delete().eq('room_id', CURRENT_ROOM_ID);
        }
        
        window.location.href = '/lobby';
    }

    async function openRoomSetting() {
        if (!IS_OWNER) return alert("Hanya Owner!");
        const { data } = await sb.from('rooms').select('name').eq('id', CURRENT_ROOM_ID).single();
        const inputName = document.getElementById('edit-room-name') as HTMLInputElement;
        if (data && inputName) inputName.value = data.name;
        toggleSidebar(); 
        const modal = document.getElementById('setting-modal');
        if(modal) modal.style.display = 'flex';
    }

    function closeRoomSetting() { 
        const modal = document.getElementById('setting-modal');
        if(modal) modal.style.display = 'none'; 
    }

    async function saveRoomSetting() {
        const inputName = document.getElementById('edit-room-name') as HTMLInputElement;
        const inputSys = document.getElementById('system-message') as HTMLInputElement;
        
        const newName = inputName?.value;
        const sysMsg = inputSys?.value;
        
        if (!newName) return alert("Nama room tidak boleh kosong!");
        try {
            await sb.from('rooms').update({ name: newName }).eq('id', CURRENT_ROOM_ID);
            if (sysMsg) await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `PENGUMUMAN: ${sysMsg}`, role: "admin" }]);
            const url = new URL(window.location.href); url.searchParams.set('name', newName); window.history.pushState({}, '', url); 
            const title = document.querySelector('.room-title') as HTMLElement;
            if(title) title.innerText = newName.toUpperCase();
            closeRoomSetting();
        } catch (e: any) { alert("Gagal simpan: " + e.message); }
    }

    // 🔥 FIX: Hapus semua logik scrollIntoView di fungsi ini biar ga nendang header 🔥
    function fixMobileHeight() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    window.addEventListener('resize', fixMobileHeight);
    window.addEventListener('orientationchange', fixMobileHeight);
    fixMobileHeight();

    async function checkUser() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { window.location.href = '/lobby'; return false; }
        MY_USER_ID = session.user.id;
        const myProfile = await getCachedProfile(MY_USER_ID);
        const { data: roomData } = await sb.from('rooms').select('owner_id, is_active').eq('id', CURRENT_ROOM_ID).maybeSingle();
        if (myProfile) {
            myUsername = myProfile.username; 
            myRole = myProfile.role || "user";
            myTotalGiftSent = myProfile.total_gift_sent || 0; 
            myLevel = myProfile.level || 1;
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
            } else if (!roomData.is_active) { alert("Room tutup!"); window.location.href = '/lobby'; return false; }
        }
        fetchStage();
        return true; 
    }

    async function fetchTopGifters() {
        try {
            const { data: topUsers, error } = await sb
                .from('profiles')
                .select('username, avatar_url, total_gift_sent')
                .gt('total_gift_sent', 0) 
                .order('total_gift_sent', { ascending: false })
                .limit(3); 

            if (error) throw error;
            if (!topUsers || topUsers.length === 0) return;

            const container = document.getElementById('top-gifters-container');
            if (!container) return; 

            let html = `<span style="font-size: 11px; color: #FFD700; font-weight: 800; margin-right: 6px; letter-spacing: 0.5px;">🏆 TOP</span>`;
            html += `<div style="display: flex; align-items: center;">`;
            
            const bingkaiWarna = ['#FFD700', '#C0C0C0', '#CD7F32']; 
            
            topUsers.forEach((user, index) => {
                const marginKiri = index === 0 ? '0' : '-12px'; 
                const zIndex = 3 - index; 
                
                html += `
                    <img src="${user.avatar_url || 'asets/png/profile.png'}" 
                         title="${user.username} (Total: ${user.total_gift_sent} koin)"
                         style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; 
                                border: 2px solid ${bingkaiWarna[index]}; 
                                margin-left: ${marginKiri}; 
                                z-index: ${zIndex}; position: relative; background: #222;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                `;
            });
            
            html += `</div>`;
            container.innerHTML = html;
            container.onclick = openTopGiftersModal;

        } catch (err: any) {
            console.error("Gagal memuat Top Gifters:", err.message);
        }
    }

    async function getRoomLeaderboard() {
        try {
            const { data: messages, error } = await sb
                .from('room_messages')
                .select('text, role')
                .eq('room_id', CURRENT_ROOM_ID)
                .eq('username', 'SISTEM_GIFT');
            
            if (error || !messages) return [];

            const hargaKado: Record<string, number> = { '1': 1, '2': 10, '3': 50, '4': 100, '5': 2000 };
            let totalPerUser: Record<string, number> = {};

            messages.forEach((m: any) => {
                const match = m.text.match(/^(.+) mengirim (.+) x(\d+) ke/);
                if (match) {
                    const pengirim = match[1];
                    const jumlah = parseInt(match[3]);
                    const harga = hargaKado[m.role] || 0;
                    
                    if (!totalPerUser[pengirim]) totalPerUser[pengirim] = 0;
                    totalPerUser[pengirim] += (harga * jumlah); 
                }
            });

            const namaSultan = Object.keys(totalPerUser).sort((a, b) => totalPerUser[b] - totalPerUser[a]).slice(0, 10);
            if (namaSultan.length === 0) return [];

            const { data: profiles } = await sb.from('profiles').select('username, avatar_url, level, role').in('username', namaSultan);
            if (!profiles) return [];

            let leaderboard = profiles.map((p: any) => ({
                ...p,
                room_total: totalPerUser[p.username]
            })).sort((a: any, b: any) => b.room_total - a.room_total); 

            return leaderboard;
        } catch (err) {
            console.error("Gagal hitung koin panggung:", err);
            return [];
        }
    }

    async function openTopGiftersModal() {
        const modal = document.getElementById('top-gifters-modal');
        const listContainer = document.getElementById('top-gifters-list');
        if (!modal || !listContainer) return;

        modal.style.display = 'flex';
        listContainer.innerHTML = '<div style="text-align:center; color:#fff; padding: 20px;">Menghitung koin panggung... </div>';

        const titleEl = modal.querySelector('.modal-header h3');
        if (titleEl) titleEl.innerHTML = 'THE SULTAN';

        const topUsers = await getRoomLeaderboard();

        listContainer.innerHTML = '';
        if (topUsers.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; color:#888;">Belum ada kado di panggung ini. Ayo kirim yang pertama!</div>';
            return;
        }

        topUsers.forEach((user, index) => {
            let rankHtml = '';
            if (index === 0) rankHtml = `<div style="background: linear-gradient(135deg, #FFDF00, #D4AF37); color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 15px; box-shadow: 0 2px 8px rgba(255,215,0,0.5);">1</div>`;
            else if (index === 1) rankHtml = `<div style="background: linear-gradient(135deg, #FFFFFF, #A9A9A9); color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 15px; box-shadow: 0 2px 8px rgba(192,192,192,0.3);">2</div>`;
            else if (index === 2) rankHtml = `<div style="background: linear-gradient(135deg, #FFB37C, #C56F28); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 15px; box-shadow: 0 2px 8px rgba(205,127,50,0.3);">3</div>`;
            else rankHtml = `<div style="color: #94a3b8; font-weight: 900; font-size: 16px; width: 28px; text-align: center;">${index + 1}</div>`;

            const bgGradient = index === 0 ? 'background: linear-gradient(90deg, rgba(255, 215, 0, 0.15), transparent); border-left: 4px solid #FFD700;' : 
                               index === 1 ? 'background: linear-gradient(90deg, rgba(192, 192, 192, 0.1), transparent); border-left: 4px solid #C0C0C0;' : 
                               index === 2 ? 'background: linear-gradient(90deg, rgba(205, 127, 50, 0.1), transparent); border-left: 4px solid #CD7F32;' : 
                               'background: #2a3648; border-left: 4px solid transparent;';

            const lvlBadge = getLevelBadgeHTML(user.level || 1);
            const roleBadge = getUserBadge(user.role || '');

            listContainer.innerHTML += `
        <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 6px; ${bgGradient}">
            <div style="width: 30px; display: flex; justify-content: center;">${rankHtml}</div>
            <img src="${user.avatar_url || 'asets/png/profile.png'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #555;">
            <div style="flex: 1; min-width: 0;">
                <div onclick="window.location.href='/data?username=${encodeURIComponent(user.username)}'" 
                     style="color: #fff; font-weight: bold; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; cursor: pointer;">
                    ${user.username} ${lvlBadge} ${roleBadge}
                </div>
                <div style="color: #FFD700; font-size: 12px; margin-top: 2px; font-weight: 600;">
                     ${(user.room_total || 0).toLocaleString()} koin
                </div>
            </div>
        </div>
        `;
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const giftDrawer = document.getElementById('gift-drawer');
        const inputEl = document.getElementById('chat-input') as HTMLInputElement;
        const drawerOverlay = document.getElementById('drawer-overlay');

        if (!giftDrawer) return;

        let startY = 0;
        let currentY = 0;

        giftDrawer.addEventListener('touchstart', (e: TouchEvent) => {
            startY = e.touches[0].clientY;
        }, { passive: true });

        giftDrawer.addEventListener('touchmove', (e: TouchEvent) => {
            currentY = e.touches[0].clientY;
            const diffY = currentY - startY;
            if (diffY > 0) {
                giftDrawer.style.transform = `translateY(${diffY}px)`;
                giftDrawer.style.transition = 'none';
            }
        }, { passive: true });

        giftDrawer.addEventListener('touchend', () => {
            const diffY = currentY - startY;
            giftDrawer.style.transform = '';
            giftDrawer.style.transition = 'transform 0.3s ease-out';
            if (diffY > 80 && giftDrawer.classList.contains('open')) {
                toggleGiftDrawer();
            }
            startY = 0; currentY = 0;
        });

        if (inputEl) {
            inputEl.addEventListener('focus', () => {
                if (giftDrawer.classList.contains('open')) {
                    giftDrawer.classList.remove('open');
                    if (drawerOverlay) drawerOverlay.classList.remove('show');
                }
            });
        }
    });

    function closeTopGiftersModal() {
        const modal = document.getElementById('top-gifters-modal');
        if(modal) modal.style.display = 'none';
    }

    window.naikKeStage = naikKeStage;
    window.turunMic = turunMic;
    window.prosesTurunMic = prosesTurunMic;
    window.toggleSidebar = toggleSidebar;
    window.toggleMicSidebar = toggleMicSidebar;
    window.toggleGiftDrawer = toggleGiftDrawer;
    window.toggleKickBtn = toggleKickBtn;
    window.sendGift = sendGift;
    window.kickUser = kickUser;
    window.kirimKomentar = kirimKomentar;
    window.mintaNaik = mintaNaik;
    window.keluarRoom = keluarRoom;
    window.openRoomSetting = openRoomSetting;
    window.closeRoomSetting = closeRoomSetting;
    window.saveRoomSetting = saveRoomSetting;
    window.closeConfirmModal = () => { 
        const modal = document.getElementById('confirm-modal');
        if(modal) modal.style.display = 'none'; 
    };
    window.openTopGiftersModal = openTopGiftersModal;
    window.closeTopGiftersModal = closeTopGiftersModal;

    const checkSDK = setInterval(() => {
        if (typeof LivekitClient !== 'undefined') {
            clearInterval(checkSDK);
            initApp();
        }
    }, 500);

  }, []); 

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" />
      <Script src="https://cdn.jsdelivr.net/npm/livekit-client@1.15.12/dist/livekit-client.umd.min.js" />
      
      <Sidebar />
      <Modals />

      <div className="app-container">
        <Header />
        <Stage />
        <ChatBox />
        <Footer />
      </div> 

      <GiftDrawer />
      <GiftAnimOverlay />
    </>
  );
}
