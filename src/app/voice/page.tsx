'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { useSearchParams } from 'next/navigation'; 
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
    closeConfirmModal?: () => void;
    openTopGiftersModal?: () => void;
    closeTopGiftersModal?: () => void;
    playGiftAnimation?: (giftId: number | string, forcedCombo?: number | null) => void;
  }
  var LivekitClient: any;
}

export default function RoomPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams(); 
  const [mounted, setMounted] = useState(false);
  const roomRef = useRef<any>(null); // Pake ref biar statenya awet
  
  // STATE BARU UNTUK LEVELING & COMBO
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

  useEffect(() => {
    setMounted(true);
    window.__VOICE_ROOM_INIT__ = true;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const CURRENT_ROOM_ID = searchParams?.get('id') || new URLSearchParams(window.location.search).get('id'); 
    const CURRENT_ROOM_NAME = searchParams?.get('name') || new URLSearchParams(window.location.search).get('name') || "Voice Room";

    const updateTitle = () => {
        const titleEl = document.querySelector('.room-title') as HTMLElement;
        if (titleEl && CURRENT_ROOM_NAME) {
            titleEl.innerText = CURRENT_ROOM_NAME.toUpperCase();
        }
    };
    updateTitle();
    setTimeout(updateTitle, 300);

    // --- HELPER LOGICS ---
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

    function playVIPEntrance(username: string, level: number) {
        if (level < 4) return; 

        // Inject animasi CSS jika belum ada
        if (!document.getElementById('vip-anim-styles-clean')) {
            const style = document.createElement('style');
            style.id = 'vip-anim-styles-clean';
            style.innerHTML = `
                @keyframes vipSlideInClean { 0% { transform: translate(-150vw, -50%); opacity: 0; } 15% { transform: translate(-50%, -50%); opacity: 1; } 85% { transform: translate(-50%, -50%); opacity: 1; } 100% { transform: translate(150vw, -50%); opacity: 0; } }
                @keyframes vipShineClean { 0% { left: -100%; } 20% { left: 100%; } 100% { left: 100%; } }
                .vip-banner-clean { position: fixed; top: 60%; left: 50%; z-index: 1000000; padding: 12px 28px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; overflow: hidden; pointer-events: none; width: max-content; max-width: 90%; animation: vipSlideInClean 4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                .vip-shine-clean { position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%); transform: skewX(-20deg); animation: vipShineClean 2s infinite ease-in-out; }
            `;
            document.head.appendChild(style);
        }

        let overlay = document.getElementById('vip-entrance-overlay');
        if (overlay) overlay.remove(); 
        overlay = document.createElement('div');
        overlay.id = 'vip-entrance-overlay';
        overlay.className = 'vip-banner-clean';
        
        let bgStyle, textHTML;
        if (level === 4) { 
            bgStyle = "background: rgba(14, 165, 233, 0.95); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(14, 165, 233, 0.4); backdrop-filter: blur(10px);";
            textHTML = `<span style="color:#fff; font-size: 13px; font-weight: 600; letter-spacing: 1px;">SULTAN</span> <b style="color:#fff; font-size: 15px; font-weight: 800; text-transform: uppercase; margin: 0 4px;">${username}</b> <span style="color:#fff; font-size: 13px; font-weight: 600;">MEMASUKI ROOM</span>`;
        } else if (level >= 5) { 
            bgStyle = "background: rgba(225, 29, 72, 0.95); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(225, 29, 72, 0.4); backdrop-filter: blur(10px);";
            textHTML = `<span style="color:#fff; font-size: 13px; font-weight: 600; letter-spacing: 1px;">LEGEND</span> <b style="color:#fff; font-size: 15px; font-weight: 800; text-transform: uppercase; margin: 0 4px;">${username}</b> <span style="color:#fff; font-size: 13px; font-weight: 600;">MEMASUKI ROOM</span>`;
        }

        overlay.setAttribute('style', bgStyle || '');
        overlay.innerHTML = `<div class="vip-shine-clean"></div><div style="display: flex; align-items: center;">${textHTML}</div>`;
        document.body.appendChild(overlay);
        setTimeout(() => { if (overlay) overlay.remove(); }, 4100);
    }

    function playGiftAnimation(giftId: number | string, forcedCombo: number | null = null) {
        const id = typeof giftId === 'string' ? parseInt(giftId) : (giftId || 1);
        const gifPath = `asets/gif/giftvid${id}.gif`; 
        
        if (forcedCombo !== null) { giftComboCount.current = forcedCombo; lastGiftId.current = id; } 
        else { if (lastGiftId.current === id) giftComboCount.current++; else { giftComboCount.current = 1; lastGiftId.current = id; } }

        let overlay = document.getElementById('gift-anim-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gift-anim-overlay';
            overlay.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:9999999; display:none; justify-content:center; align-items:center; background:rgba(0,0,0,0.2); opacity:0; transition:opacity 0.3s;";
            document.body.appendChild(overlay);
        }
        
        const iconPngPath = `asets/png/gift${id}.png`;
        let comboHtml = '';
        if (giftComboCount.current === 1) {
             comboHtml = `<img src="${iconPngPath}" style="width: 150px; height: 150px; object-fit: contain; filter: drop-shadow(3px 3px 0px #f44336);">`;
        } else if (giftComboCount.current > 1) {
             comboHtml = `<div style="display: flex; align-items: center; justify-content: center; gap: 12px;"><img src="${iconPngPath}" style="width: 150px; height: 150px; object-fit: contain; filter: drop-shadow(3px 3px 0px #f44336);"><span>x${giftComboCount.current}</span></div>`;
        }

        overlay.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; position:relative;">
                <img id="gift-anim-img" src="${gifPath}?t=${Date.now()}" style="width:280px; max-width:85%; object-fit:contain; filter:drop-shadow(0 0 20px gold);">
                <div id="gift-combo-text" style="font-family:'Inter',sans-serif; font-size:80px; font-weight:900; color:#ffeb3b; text-shadow:4px 4px 0px #f44336, 0 0 20px rgba(255,255,0,0.8); transform:rotate(-15deg) scale(0); transition:transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275); margin-top:-60px; z-index:100;">
                    ${comboHtml}
                </div>
            </div>`;

        const comboEl = overlay.querySelector('#gift-combo-text') as HTMLElement;
        overlay.style.display = 'flex';
        setTimeout(() => { if(overlay) overlay.style.opacity = '1'; }, 10);
        setTimeout(() => { if(comboEl) comboEl.style.transform = "rotate(-15deg) scale(1.2)"; }, 50);

        if (giftAnimTimer.current) clearTimeout(giftAnimTimer.current);
        giftAnimTimer.current = setTimeout(() => {
            if(overlay) overlay.style.opacity = '0';
            setTimeout(() => { if(overlay) overlay.style.display = 'none'; giftComboCount.current = 0; lastGiftId.current = null; }, 300);
        }, 3000);
    }

    function listenRealtime() {
        if (!CURRENT_ROOM_ID || !MY_USER_ID.current) return;
        const roomChannel = sb.channel(`room_active_${CURRENT_ROOM_ID}`, { config: { presence: { key: MY_USER_ID.current } } });

        roomChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => { fetchStage(); })
        // 🔥 UPDATE KOIN REALTIME 🔥
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (p: any) => { 
            fetchStage(); 
            if (p.new && p.new.id === MY_USER_ID.current) {
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
            let isDariSaya = false;
            let comboValue = 1;
            
            if (isGift) {
                const match = p.new.text.match(/^(.+) mengirim .+ x(\d+) ke/);
                if (match) {
                    const pengirim = match[1]; 
                    comboValue = parseInt(match[2]); 
                    isDariSaya = (pengirim === myUsername.current);
                } else {
                    isDariSaya = p.new.text.startsWith(`${myUsername.current} `);
                }
            }

            const div = document.createElement('div'); 
            div.id = `msg-${p.new.id}`;
            
            if (isGift) {
                div.className = 'msg system-gift'; 
                div.innerHTML = `<span>🎁 ${p.new.text}</span>`;
                if (!isDariSaya) playGiftAnimation(parseInt(p.new.role), comboValue);
            } else {
                const isSystem = p.new.username.startsWith("SISTEM");
                div.className = isSystem ? 'msg system' : 'msg';
                const style = getLevelStyle(p.new.level || 1);
                const lvlBadge = getLevelBadgeHTML(p.new.level || 1);
                const roleBadge = getUserBadge(p.new.role || '');
                const userLink = `<span onclick="window.location.href='/data?username=${encodeURIComponent(p.new.username)}'" style="color:${style.color}; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; position:relative; z-index:10; pointer-events:auto;">${p.new.username}${lvlBadge}${roleBadge}</span>`;
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
            newPresences.forEach((p: any) => { if (p.key !== MY_USER_ID.current && p.level >= 4) playVIPEntrance(p.username, p.level); });
        })
        .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                await roomChannel.track({ online_at: new Date().toISOString(), username: myUsername.current, level: myLevel.current });
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
        
        if (myLevel.current === 1) { prevTarget = 0; currentTarget = 1000; currentName = "NEWBIE"; }
        else if (myLevel.current === 2) { prevTarget = 1000; currentTarget = 5000; currentName = "SUPPORTER"; }
        else if (myLevel.current === 3) { prevTarget = 5000; currentTarget = 20000; currentName = "PATRON"; }
        else if (myLevel.current === 4) { prevTarget = 20000; currentTarget = 50000; currentName = "SULTAN"; }
        else { container.innerHTML = `<div style="text-align:center; font-size: 13px; color: #FF0055; font-weight: bold; margin: 15px 0;">LEVEL MAX (LEGEND)</div>`; return; }
        
        let needed = currentTarget - myTotalGiftSent.current;
        let percent = ((myTotalGiftSent.current - prevTarget) / (currentTarget - prevTarget)) * 100;
        if (percent > 100) percent = 100;
        
        container.innerHTML = `<div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-bottom: 6px; padding: 0 5px;"><span>LVL ${myLevel.current} (${currentName})</span><span>Butuh <b style="color:#f1c40f">${needed} koin</b> lagi</span></div><div style="width: 100%; height: 6px; background: #333; border-radius: 4px; overflow: hidden;"><div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #00ff88, #00d2ff); transition: width 0.5s ease-out;"></div></div>`;
    }

    async function sendGift(giftName: string, harga: number | string, giftId: number | string, jumlah = 1) {
        if (!selectedTargetId.current) return showNotif(t('select_target'), "warning");
        if (selectedTargetId.current === MY_USER_ID.current) return showNotif(t('gift_self_alert'), "warning");
        
        const totalHarga = (typeof harga === 'string' ? parseInt(harga) : harga) * jumlah; 
        const coinDisplay = document.getElementById('user-coins');
        let currentCoins = coinDisplay ? parseInt(coinDisplay.innerText.replace(/[,.]/g, '')) : 0;
        if (currentCoins < totalHarga) return showNotif(t('min_topup_warning'), "error");

        // Kurangi koin di UI seketika
        currentCoins -= totalHarga;
        if (coinDisplay) coinDisplay.innerText = currentCoins.toLocaleString();

        playGiftAnimation(giftId);
        
        const comboKey = `${giftName}_${selectedTargetId.current}`;
        if (!activeCombos.current[comboKey]) {
            activeCombos.current[comboKey] = { targetId: selectedTargetId.current, targetName: selectedTargetName.current, count: 0, pendingCoins: 0, msgId: null, syncTimer: null };
        }
        
        const combo = activeCombos.current[comboKey];
        combo.count += jumlah; 
        combo.pendingCoins += totalHarga;

        if (combo.syncTimer) clearTimeout(combo.syncTimer);
        
        combo.syncTimer = setTimeout(async () => {
            const coinsToDeduct = combo.pendingCoins;
            const currentCount = combo.count;
            const finalTargetId = combo.targetId;
            const finalTargetName = combo.targetName;
            const savedMsgId = combo.msgId;

            delete activeCombos.current[comboKey];
            
            try {
                const { data: newTotalGift, error } = await sb.rpc('transfer_gift', { sender_id: MY_USER_ID.current, receiver_id: finalTargetId, amount: coinsToDeduct });
                if (error) {
                    showNotif("Gagal transfer kado", "error");
                    const koinBalik = parseInt(document.getElementById('user-coins')?.innerText.replace(/[,.]/g, '') || "0") + coinsToDeduct;
                    if (coinDisplay) coinDisplay.innerText = koinBalik.toLocaleString();
                    return;
                }
                
                await sb.from('coin_history').insert([{ user_id: MY_USER_ID.current, transaction_type: 'send_gift', amount: -coinsToDeduct, description: `Kirim ${giftName} x${currentCount} ke ${finalTargetName}`, balance_after: currentCoins }]);
                await sb.from('coin_history').insert([{ user_id: finalTargetId, transaction_type: 'receive_gift', amount: coinsToDeduct, description: `Terima ${giftName} x${currentCount} dari ${myUsername.current}`, balance_after: 0 }]);

                let lvlData = checkLevelUp(newTotalGift);
                if (lvlData.level !== myLevel.current) {
                    await sb.from('profiles').update({ level: lvlData.level }).eq('id', MY_USER_ID.current);
                    await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `⭐ SELAMAT! ${myUsername.current} naik ke Level ${lvlData.level}!`, role: "admin" }]);
                }
                
                myTotalGiftSent.current = newTotalGift; 
                myLevel.current = lvlData.level; 
                updateLevelProgressUI();
                
                const teksFinal = `${myUsername.current} mengirim ${giftName} x${currentCount} ke ${finalTargetName}`;
                if (savedMsgId) {
                    await sb.from('room_messages').update({ text: teksFinal }).eq('id', savedMsgId);
                } else {
                    const { data } = await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM_GIFT", text: teksFinal, role: giftId.toString(), level: myLevel.current }]).select();
                    if (data && data.length > 0) activeCombos.current[comboKey] = { ...activeCombos.current[comboKey], msgId: data[0].id };
                }
            } catch (e) { showNotif(t('gift_fail'), "error"); }
        }, 600);
    }

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
        try {
            const { data: topUsers, error } = await sb.from('profiles').select('username, avatar_url, total_gift_sent').gt('total_gift_sent', 0).order('total_gift_sent', { ascending: false }).limit(3); 
            if (error) throw error;
            const container = document.getElementById('top-gifters-container');
            if (!container || !topUsers || topUsers.length === 0) return;

            let html = `<span style="font-size: 11px; color: #FFD700; font-weight: 800; margin-right: 6px; letter-spacing: 0.5px;">🏆 TOP</span><div style="display: flex; align-items: center;">`;
            const bingkaiWarna = ['#FFD700', '#C0C0C0', '#CD7F32']; 
            
            topUsers.forEach((user, index) => {
                const marginKiri = index === 0 ? '0' : '-12px'; 
                const zIndex = 3 - index; 
                html += `<img src="${user.avatar_url || 'asets/png/profile.webp'}" title="${user.username} (Total: ${user.total_gift_sent} koin)" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 2px solid ${bingkaiWarna[index]}; margin-left: ${marginKiri}; z-index: ${zIndex}; position: relative; background: #222; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">`;
            });
            html += `</div>`;
            container.innerHTML = html;
            container.onclick = () => window.openTopGiftersModal?.();
        } catch (err: any) { console.error("Gagal memuat Top Gifters:", err.message); }
    }

    async function initApp() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { window.location.href = '/lobby'; return; }
        MY_USER_ID.current = session.user.id;
        const { data: p } = await sb.from('profiles').select('*').eq('id', MY_USER_ID.current).single();
        if (p) { 
            myUsername.current = p.username; 
            myRole.current = p.role; 
            myLevel.current = p.level || 1; 
            myTotalGiftSent.current = p.total_gift_sent || 0; 
            if (document.getElementById('user-coins')) document.getElementById('user-coins')!.innerText = (p.coins || 0).toLocaleString();
        }
        
        const { data: roomData } = await sb.from('rooms').select('owner_id, is_active').eq('id', CURRENT_ROOM_ID).maybeSingle();
        if (roomData) {
            IS_OWNER.current = roomData.owner_id === MY_USER_ID.current;
            if (IS_OWNER.current) {
                const menuSet = document.getElementById('menu-setting');
                if (menuSet) menuSet.style.display = 'flex'; 
                await sb.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID);
            }
        }
        
        if (typeof window.LivekitClient !== 'undefined') {
            try {
                const res = await fetch(`${supabaseUrl}/functions/v1/get-livekit-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey || '', 'Authorization': `Bearer ${supabaseKey}` },
                    body: JSON.stringify({ username: myUsername.current, identity: MY_USER_ID.current, roomName: CURRENT_ROOM_ID || "main-room" })
                });
                const data = await res.json();
                if (!data.token) throw new Error("Token Error");
                
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
        fetchStage(); listenRealtime(); fetchTopGifters();
    }

    async function fetchStage() {
        if (!CURRENT_ROOM_ID) return;
        const { data } = await sb.from('room_slots').select('*, profiles(*)').eq('room_id', CURRENT_ROOM_ID).order('slot_index');
        const grid = document.getElementById('stage-grid');
        if (!grid || !data) return;
        grid.innerHTML = "";
        data.forEach((slot: any, i: number) => {
            const user = slot.profiles; const isMe = user?.id === MY_USER_ID.current;
            const item = document.createElement('div'); item.className = 'speaker-item';
            if (user) {
                const style = getLevelStyle(user.level);
                const roleBadgeHTML = getUserBadge(user.role || '');
                item.innerHTML = `
                    <div class="avatar ${isMe ? 'active' : ''}" data-user-id="${user.id}" onclick="window.${isMe ? 'turunMic' : 'toggleKickBtn'}(this, ${IS_OWNER.current && !isMe})">
                        <img src="${user.avatar_url || '/asets/png/profile.webp'}" style="object-fit:cover;">
                        <div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'}; position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7); border-radius: 50%; width: 22px; height: 22px; align-items: center; justify-content: center; border: 2px solid white; z-index: 10;">
                            <span class="material-icons" style="color: #e74c3c; font-size: 14px;">mic_off</span>
                        </div>
                        ${(IS_OWNER.current && !isMe) ? `<div class="kick-btn-wrapper" style="display:none;"><div class="kick-btn" onclick="event.stopPropagation(); window.kickUser('${slot.profile_id}', '${user.username}')"><span class="material-icons">close</span></div></div>` : ''}
                    </div>
                    <span class="name-label" style="color:${style.color}">
                        <div style="display:flex; align-items:center; justify-content:center; gap:2px; flex-wrap:wrap; text-align:center;">
                            ${user.username} ${getLevelBadgeHTML(user.level)} ${roleBadgeHTML}
                        </div>
                    </span>`;
            } else {
                item.innerHTML = `<div class="avatar" onclick="window.naikKeStage?.(${slot.slot_index})"><span class="material-icons" style="color:#444; font-size:30px;">add</span></div><span class="name-label">${t('empty_slot')}</span>`;
            }
            grid.appendChild(item);
        });
    }

    // ==========================================================
    // 🔥 GLOBAL WINDOW ASSIGNMENTS 🔥
    // ==========================================================
    window.sendGift = sendGift;

    window.kickUser = async (targetId, targetName) => {
        if (!confirm(`Kick ${targetName}?`)) return;
        await sb.from('room_slots').update({ profile_id: null }).match({ room_id: CURRENT_ROOM_ID, profile_id: targetId });
        await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `${targetName} dikeluarkan.` }]);
    };

    window.toggleKickBtn = (el, canKick) => {
        if (!canKick) return;
        const wrapper = el.querySelector('.kick-btn-wrapper') as HTMLElement;
        document.querySelectorAll('.kick-btn-wrapper').forEach((w: any) => { if (w !== wrapper) w.style.display = 'none'; });
        if(wrapper) wrapper.style.display = wrapper.style.display === 'none' ? 'flex' : 'none';
    };

    window.naikKeStage = async (idx) => {
        if (!MY_USER_ID.current) return showNotif("Login dulu!", "warning");
        if (roomRef.current && roomRef.current.state === "connected") await roomRef.current.localParticipant.setMicrophoneEnabled(true);
        
        const { data: checkSlot } = await sb.from('room_slots').select('profile_id').match({ room_id: CURRENT_ROOM_ID, slot_index: idx }).single();
        if (checkSlot && checkSlot.profile_id !== null) {
            await roomRef.current?.localParticipant.setMicrophoneEnabled(false);
            return showNotif("Kursi sudah ada yang menempati!", "warning");
        }

        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID.current);
        await sb.from('room_slots').update({ profile_id: MY_USER_ID.current }).match({ room_id: CURRENT_ROOM_ID, slot_index: idx });
        await sb.from('profiles').update({ mic_off: false }).eq('id', MY_USER_ID.current);

        isMicOn.current = true;
        const micIcon = document.getElementById('mic-icon');
        const micText = document.getElementById('mic-text');
        if(micIcon) { micIcon.innerText = "mic"; micIcon.style.color = "#2ecc71"; }
        if(micText) micText.innerText = t('mute_mic');

        fetchStage();
    };

    window.turunMic = () => { 
        const m = document.getElementById('confirm-modal'); 
        if(m) m.style.display = 'flex'; 
    };

    window.prosesTurunMic = async () => {
        document.getElementById('confirm-modal')!.style.display = 'none';
        if (roomRef.current?.localParticipant) await roomRef.current.localParticipant.setMicrophoneEnabled(false);
        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID.current);
        await sb.from('profiles').update({ mic_off: true }).eq('id', MY_USER_ID.current);
        
        isMicOn.current = false;
        const micIcon = document.getElementById('mic-icon');
        const micText = document.getElementById('mic-text');
        if(micIcon) { micIcon.innerText = "mic_off"; micIcon.style.color = "#e74c3c"; }
        if(micText) micText.innerText = t('unmute_mic');
        fetchStage();
    };

    window.toggleRoomGiftDrawer = () => {
        const d = document.getElementById('room-gift-drawer');
        const o = document.getElementById('room-drawer-overlay');
        d?.classList.toggle('open'); o?.classList.toggle('show');
        if (d?.classList.contains('open')) {
            updateLevelProgressUI();
            sb.from('room_slots').select('profile_id, profiles(username, avatar_url)').eq('room_id', CURRENT_ROOM_ID).not('profile_id', 'is', null).neq('profile_id', MY_USER_ID.current)
            .then(({data}) => {
                const tc = document.getElementById('gift-targets');
                if(!tc) return; tc.innerHTML = "";
                if(!data?.length) { 
                    selectedTargetId.current = null; selectedTargetName.current = "";
                    tc.innerHTML = `<span style="font-size:12px; color:#888;">${t('only_you_here')}</span>`; return; 
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

    window.toggleSidebar = () => { 
        document.getElementById('sidebar')?.classList.toggle('active'); 
        document.getElementById('sidebar-overlay')?.classList.toggle('active'); 
    };

    window.openTopGiftersModal = async () => {
        const m = document.getElementById('top-gifters-modal'); const l = document.getElementById('top-gifters-list');
        if(m && l) { 
            m.style.display = 'flex'; l.innerHTML = `<div style="text-align:center; color:#fff; padding: 20px;">Menghitung koin panggung...</div>`;
            const top = await getRoomLeaderboard(); l.innerHTML = "";
            if (top.length === 0) { l.innerHTML = '<div style="text-align:center; color:#888;">Belum ada kado di panggung ini. Ayo kirim yang pertama!</div>'; return; }
            top.forEach((u, i) => {
                let rankHtml = '';
                if (i === 0) rankHtml = `<div style="background: linear-gradient(135deg, #FFDF00, #D4AF37); color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 15px; box-shadow: 0 2px 8px rgba(255,215,0,0.5);">1</div>`;
                else if (i === 1) rankHtml = `<div style="background: linear-gradient(135deg, #FFFFFF, #A9A9A9); color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 15px; box-shadow: 0 2px 8px rgba(192,192,192,0.3);">2</div>`;
                else if (i === 2) rankHtml = `<div style="background: linear-gradient(135deg, #FFB37C, #C56F28); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 15px; box-shadow: 0 2px 8px rgba(205,127,50,0.3);">3</div>`;
                else rankHtml = `<div style="color: #94a3b8; font-weight: 900; font-size: 16px; width: 28px; text-align: center;">${i + 1}</div>`;
                const bgGradient = i === 0 ? 'background: linear-gradient(90deg, rgba(255, 215, 0, 0.15), transparent); border-left: 4px solid #FFD700;' : i === 1 ? 'background: linear-gradient(90deg, rgba(192, 192, 192, 0.1), transparent); border-left: 4px solid #C0C0C0;' : i === 2 ? 'background: linear-gradient(90deg, rgba(205, 127, 50, 0.1), transparent); border-left: 4px solid #CD7F32;' : 'background: #2a3648; border-left: 4px solid transparent;';
                
                l.innerHTML += `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 6px; ${bgGradient} margin-bottom:8px;">
                    <div style="width: 30px; display: flex; justify-content: center;">${rankHtml}</div>
                    <img src="${u.avatar_url || '/asets/png/profile.webp'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #555;">
                    <div style="flex: 1; min-width: 0;">
                        <div onclick="window.location.href='/data?username=${encodeURIComponent(u.username)}'" style="color: #fff; font-weight: bold; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; cursor: pointer;">
                            ${u.username} ${getLevelBadgeHTML(u.level || 1)} ${getUserBadge(u.role || '')}
                        </div>
                        <div style="color: #FFD700; font-size: 12px; margin-top: 2px; font-weight: 600;">${(u.room_total || 0).toLocaleString()} koin</div>
                    </div>
                </div>`;
            });
        }
    };

    window.kirimKomentar = async () => {
        const inputEl = document.getElementById('chat-input') as HTMLInputElement;
        const text = inputEl?.value.trim();
        if (!text || !CURRENT_ROOM_ID || !MY_USER_ID.current) return;

        inputEl.value = ''; 
        inputEl.focus(); 
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try {
            await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: myUsername.current, text: text, role: myRole.current, level: myLevel.current }]);
        } catch (e) { console.error(e); }
    };

    window.mintaNaik = async () => {
        const { data: allSlots } = await sb.from('room_slots').select('slot_index, profile_id').order('slot_index', { ascending: true });
        const slotKosong = allSlots?.find(s => !s.profile_id);
        if (slotKosong) window.naikKeStage?.(slotKosong.slot_index); else showNotif("Panggung penuh!", "warning");
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
        if (!roomRef.current) return showNotif(t('mic_not_ready'), "warning");

        const { data: onStage } = await sb.from('room_slots').select('*').eq('room_id', CURRENT_ROOM_ID).eq('profile_id', MY_USER_ID.current).single();
        if (!onStage) return showNotif(t('mic_stage_first'), "warning");

        isMicOn.current = !isMicOn.current;
        await roomRef.current.localParticipant.setMicrophoneEnabled(isMicOn.current);
        await sb.from('profiles').update({ mic_off: !isMicOn.current }).eq('id', MY_USER_ID.current);

        const icon = document.getElementById('mic-icon');
        const text = document.getElementById('mic-text');
        if (icon && text) {
            icon.innerText = isMicOn.current ? 'mic' : 'mic_off';
            text.innerText = isMicOn.current ? t('mute_mic') : t('unmute_mic');
            icon.style.color = isMicOn.current ? 'inherit' : '#ef4444';
        }
        
        window.toggleSidebar?.(); 
        fetchStage();
    };

    window.openRoomSetting = () => {
        if (!IS_OWNER.current) return showNotif(t('owner_only'), "error");
        document.getElementById('setting-modal')?.classList.add('show');
        window.toggleSidebar?.(); 
    };
    
    window.closeRoomSetting = () => { document.getElementById('setting-modal')?.classList.remove('show'); };
    
    window.saveRoomSetting = async () => {
        const newName = (document.getElementById('edit-room-name') as HTMLInputElement).value;
        const sysMsg = (document.getElementById('system-message') as HTMLInputElement).value;
        if (!newName) return showNotif(t('room_name_empty'), "warning");
        try {
            await sb.from('rooms').update({ name: newName }).eq('id', CURRENT_ROOM_ID);
            if (sysMsg) await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `PENGUMUMAN: ${sysMsg}`, role: "admin" }]);
            const url = new URL(window.location.href); url.searchParams.set('name', newName); window.history.pushState({}, '', url); 
            const titleEl = document.querySelector('.room-title') as HTMLElement;
            if(titleEl) titleEl.innerText = newName.toUpperCase();
            window.closeRoomSetting?.();
        } catch (e: any) { showNotif("Gagal simpan: " + e.message, "error"); }
    };

    window.closeConfirmModal = () => {
        const m = document.getElementById('confirm-modal');
        if (m) m.style.display = 'none';
    };

    window.closeTopGiftersModal = () => {
        const m = document.getElementById('top-gifters-modal');
        if (m) m.style.display = 'none';
    };

    // FITUR ANTI KETUTUP KEYBOARD DAN GESER LACI
    const fixMobileHeight = () => {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    window.addEventListener('resize', fixMobileHeight);
    window.addEventListener('orientationchange', fixMobileHeight);
    fixMobileHeight();

    const giftDrawerEl = document.getElementById('room-gift-drawer');
    if (giftDrawerEl) {
        let startY = 0; let currentY = 0;
        giftDrawerEl.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
        giftDrawerEl.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const diffY = currentY - startY;
            if (diffY > 0) { giftDrawerEl.style.transform = `translateY(${diffY}px)`; giftDrawerEl.style.transition = 'none'; }
        }, { passive: true });
        giftDrawerEl.addEventListener('touchend', () => {
            const diffY = currentY - startY;
            giftDrawerEl.style.transform = ''; giftDrawerEl.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
            if (diffY > 80 && giftDrawerEl.classList.contains('open')) window.toggleRoomGiftDrawer?.();
            startY = 0; currentY = 0;
        });
    }

    const sdkInterval = setInterval(() => { if (typeof window.LivekitClient !== 'undefined') { clearInterval(sdkInterval); initApp(); } }, 500);

    return () => {
        clearInterval(sdkInterval); 
        roomRef.current?.disconnect();
        window.removeEventListener('resize', fixMobileHeight);
        window.removeEventListener('orientationchange', fixMobileHeight);
        ['room-gift-drawer', 'room-drawer-overlay', 'gift-anim-overlay', 'vip-entrance-overlay'].forEach(id => document.getElementById(id)?.remove());
    };
  }, [t, searchParams]);

  if (!mounted) return null;

  return (
    <div className="in-voice-room">
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" />
      <Script src="https://cdn.jsdelivr.net/npm/livekit-client@1.15.12/dist/livekit-client.umd.min.js" />
      <Sidebar /><Modals />
      <div className="app-container"><Header /><Stage /><ChatBox /><Footer /></div> 
      <GiftDrawer /><GiftAnimOverlay />
    </div>
  );
}
