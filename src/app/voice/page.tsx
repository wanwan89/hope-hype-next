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
      } catch (err) { console.error(err); }
    };

    // 🔥 FIX 1: LOGIKA LEVEL 1 - 50 & ICON BADGE ELEGAN 🔥
    function calculateLevel(giftSent: number) {
      let lvl = Math.floor(giftSent / 500) + 1; // Tiap 500 Koin naik 1 level
      if (lvl > 50) lvl = 50;
      return lvl;
    }

    function getLevelColor(level: number) {
      if (level >= 40) return ["#ff0844", "#ffb199"]; // Ruby
      if (level >= 30) return ["#00c6ff", "#0072ff"]; // Diamond
      if (level >= 20) return ["#f6d365", "#fda085"]; // Gold
      if (level >= 10) return ["#89f7fe", "#66a6ff"]; // Silver
      return ["#d4fc79", "#96e6a1"]; // Bronze
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

    async function fetchTopGifters() {
        const topData = await getRoomLeaderboard();
        const container = document.getElementById('top-gifters-container');
        if (!container) return;
        if (topData.length === 0) { container.style.display = 'none'; return; }
        container.style.display = 'flex';
        container.innerHTML = `<span style="font-size: 11px; color: #FFD700; font-weight:800; margin-right:6px;">🏆 TOP</span>`;
        topData.slice(0, 3).forEach((u, i) => {
            container.innerHTML += `<img src="${u.avatar_url || '/asets/png/profile.webp'}" style="width:28px; height:28px; border-radius:50%; border:2px solid #222; margin-left:-12px; z-index:${3-i}; background:#222; object-fit:cover;">`;
        });
        container.onclick = () => window.openTopGiftersModal?.();
    }

    function syncOwnerUI() {
        if (!IS_OWNER.current) return;
        const trySync = () => {
            const menuSet = document.getElementById('menu-setting');
            if (menuSet) { menuSet.style.display = 'flex'; } else { setTimeout(trySync, 500); }
        };
        trySync();
    }

    function listenRealtime() {
        if (!CURRENT_ROOM_ID || !MY_USER_ID.current) return;
        channelRef.current = sb.channel(`room_active_${CURRENT_ROOM_ID}`, { config: { presence: { key: MY_USER_ID.current } } });

        channelRef.current
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => { fetchStage(); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${CURRENT_ROOM_ID}` }, (p: any) => { 
            if(p.new.slot_count) {
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
                const lvlBadge = getLevelBadgeHTML(p.new.level || 1);
                const roleBadge = getUserBadge(p.new.role || '');
                // 🔥 FIX 2: WARNA USERNAME IKUT TEMA (var(--text-main)) 🔥
                const userLink = `<span onclick="window.openUserProfile('${p.new.user_id || ''}')" style="color:var(--text-main, #ffffff); font-weight:700; cursor:pointer; display:inline-flex; align-items:center; position:relative; z-index:10; pointer-events:auto;">${p.new.username}${lvlBadge}${roleBadge}</span>`;
                div.innerHTML = isSystem ? `<span style="opacity:0.8">${p.new.text}</span>` : `${userLink}<span style="opacity:0.9">: ${p.new.text}</span>`;
            }

            chatBox.appendChild(div); 
            chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
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
            const countEl = document.getElementById('online-count');
            if (countEl) countEl.innerText = Object.keys(channelRef.current.presenceState()).length.toString();
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

                let newLvl = calculateLevel(newTotalGift);
                if (newLvl !== myLevel.current) {
                    await sb.from('profiles').update({ level: newLvl }).eq('id', MY_USER_ID.current);
                    await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `⭐ SELAMAT! ${myUsername.current} naik ke Level ${newLvl}!`, role: "admin" }]);
                }
                
                myTotalGiftSent.current = newTotalGift; 
                myLevel.current = newLvl; 
                updateLevelProgressUI();
                
                const teksFinal = `${myUsername.current} mengirim ${giftName} x${currentCount} ke ${finalTargetName}`;
                if (savedMsgId) {
                    await sb.from('room_messages').update({ text: teksFinal }).eq('id', savedMsgId);
                } else {
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
        const { data: roomData } = await sb.from('rooms').select('*').eq('id', CURRENT_ROOM_ID).maybeSingle();
        
        if (p) { 
            myUsername.current = p.username; myRole.current = p.role; 
            myTotalGiftSent.current = p.total_gift_sent || 0; 
            myLevel.current = calculateLevel(myTotalGiftSent.current); // Auto hitung level pas masuk
            if (document.getElementById('user-coins')) document.getElementById('user-coins')!.innerText = (p.coins || 0).toLocaleString(); 
        }
        
        if (roomData) {
            setTotalTaps(roomData.tap_count || 0);
            IS_OWNER.current = roomData.owner_id === MY_USER_ID.current;
            const sCount = roomData.slot_count || 6;
            setRoomSlotCount(sCount);

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
        const grid = document.getElementById('stage-grid');
        if (!grid || !data) return;
        grid.innerHTML = "";
        
        data.slice(0, targetCount).forEach((slot: any) => {
            const user = slot.profiles; const isMe = user?.id === MY_USER_ID.current;
            const item = document.createElement('div'); item.className = 'speaker-item';
            if (user) {
                // Di sini getLevelBadgeHTML kita kasih argumen dari function calculateLevel dari db nya
                const calculatedUserLvl = calculateLevel(user.total_gift_sent || 0);
                item.innerHTML = `
                    <div class="avatar ${isMe ? 'active' : ''}" data-user-id="${user.id}" onclick="window.openUserProfile('${user.id}')">
                        <img src="${user.avatar_url || '/asets/png/profile.webp'}" style="object-fit:cover;">
                        <div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'}; position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7); border-radius: 50%; width: 22px; height: 22px; align-items: center; justify-content: center; border: 2px solid white; z-index: 10;">
                            <span class="material-icons" style="color: #e74c3c; font-size: 14px;">mic_off</span>
                        </div>
                    </div>
                    <span class="name-label" style="color: var(--text-main, #ffffff); font-weight: 600; text-shadow: none;">
                        <div style="display:flex; align-items:center; justify-content:center; gap:2px; flex-wrap:wrap; text-align:center;">
                            ${user.username} ${getLevelBadgeHTML(calculatedUserLvl)}
                        </div>
                    </span>`;
            } else {
                item.innerHTML = `<div class="avatar" style="border: 1px dashed var(--border-color); opacity: 0.5;" onclick="window.naikKeStage?.(${slot.slot_index})"><span class="material-icons" style="color:var(--text-muted); font-size:24px;">add</span></div><span class="name-label" style="opacity:0.5">${t('empty_slot')}</span>`;
            }
            grid.appendChild(item);
        });
    }

    // ==========================================================
    // 🔥 GLOBAL WINDOW ASSIGNMENTS 🔥
    // ==========================================================
    window.sendGift = sendGift;

    window.kickUser = async (targetId, targetName) => {
        if (!confirm(`Turunkan ${targetName} dari slot panggung?`)) return;
        await sb.from('room_slots').update({ profile_id: null }).match({ room_id: CURRENT_ROOM_ID, profile_id: targetId });
        await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `${targetName} diturunkan dari panggung.` }]);
    };

    window.toggleKickBtn = (el, canKick) => {
        if (!canKick) return;
        const wrapper = el.querySelector('.kick-btn-wrapper') as HTMLElement;
        document.querySelectorAll('.kick-btn-wrapper').forEach((w: any) => { if (w !== wrapper) w.style.display = 'none'; });
        if(wrapper) wrapper.style.display = wrapper.style.display === 'none' ? 'flex' : 'none';
    };

    window.naikKeStage = async (idx) => {
        if (!MY_USER_ID.current) return showNotif("Login dulu!", "warning");
        if (idx >= roomSlotCount) return showNotif("Slot ini sedang ditutup Owner", "warning");

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
        if(micIcon) { micIcon.innerText = "mic"; micIcon.style.color = "#1f3cff"; } // Warna biru aktif
        if(micText) micText.innerText = t('mute_mic');

        fetchStage();
    };

    window.turunMic = () => { 
        const m = document.getElementById('confirm-modal'); 
        if(m) m.style.display = 'flex'; 
    };

    window.prosesTurunMic = async () => {
        const m = document.getElementById('confirm-modal');
        if (m) m.style.display = 'none';
        if (roomRef.current?.localParticipant) await roomRef.current.localParticipant.setMicrophoneEnabled(false);
        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID.current);
        await sb.from('profiles').update({ mic_off: true }).eq('id', MY_USER_ID.current);
        
        isMicOn.current = false;
        const micIcon = document.getElementById('mic-icon');
        const micText = document.getElementById('mic-text');
        if(micIcon) { micIcon.innerText = "mic_off"; micIcon.style.color = "#ff4757"; }
        if(micText) micText.innerText = t('unmute_mic');
        fetchStage();
    };

    window.toggleRoomGiftDrawer = () => {
        const d = document.getElementById('room-gift-drawer');
        const o = document.getElementById('room-drawer-overlay');
        d?.classList.toggle('open'); o?.classList.toggle('show');
        if (d?.classList.contains('open')) {
            updateLevelProgressUI(); 
            sb.from('room_slots').select('profile_id, profiles(username, avatar_url)')
            .eq('room_id', CURRENT_ROOM_ID)
            .lt('slot_index', roomSlotCount) 
            .not('profile_id', 'is', null)
            .neq('profile_id', MY_USER_ID.current)
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
        if (IS_OWNER.current) syncOwnerUI(); 
    };

    window.openTopGiftersModal = async () => {
        const m = document.getElementById('top-gifters-modal'); const l = document.getElementById('top-gifters-list');
        if(m && l) { 
            m.style.display = 'flex'; l.innerHTML = `<div style="text-align:center; color:#fff; padding: 20px;">Menghitung koin panggung...</div>`;
            const top = await getRoomLeaderboard(); l.innerHTML = "";
            if (top.length === 0) { l.innerHTML = '<div style="text-align:center; color:#888;">Belum ada kado di panggung ini. Ayo kirim yang pertama!</div>'; return; }
            top.forEach((u, i) => {
                let rankHtml = '';
                if (i === 0) rankHtml = `<div style="background: linear-gradient(135deg, #f6d365, #fda085); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 13px;">1</div>`;
                else if (i === 1) rankHtml = `<div style="background: linear-gradient(135deg, #e2e2e2, #999); color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 13px;">2</div>`;
                else if (i === 2) rankHtml = `<div style="background: linear-gradient(135deg, #d4fc79, #96e6a1); color: #000; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 13px;">3</div>`;
                else rankHtml = `<div style="color: #888; font-weight: 900; font-size: 14px; width: 28px; text-align: center;">${i + 1}</div>`;
                
                l.innerHTML += `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="width: 30px; display: flex; justify-content: center;">${rankHtml}</div>
                    <img src="${u.avatar_url || '/asets/png/profile.webp'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div style="flex: 1; min-width: 0;">
                        <div onclick="window.openUserProfile('${u.id || ''}')" style="color: var(--text-main); font-weight: bold; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; cursor: pointer;">
                            ${u.username} ${getLevelBadgeHTML(calculateLevel(u.total_gift_sent || 0))}
                        </div>
                        <div style="color: #1f3cff; font-size: 12px; margin-top: 2px; font-weight: 600;">${(u.room_total || 0).toLocaleString()} koin</div>
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

    window.mintaNaik = async () => {
        const { data: allSlots } = await sb.from('room_slots').select('slot_index, profile_id').eq('room_id', CURRENT_ROOM_ID).order('slot_index', { ascending: true });
        const slotKosong = allSlots?.find(s => !s.profile_id && s.slot_index < roomSlotCount);
        
        if (slotKosong) {
            window.naikKeStage?.(slotKosong.slot_index);
        } else {
            showNotif("Panggung penuh! Tunggu giliran", "warning");
        }
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
            icon.style.color = isMicOn.current ? '#1f3cff' : '#ff4757';
        }
        
        window.toggleSidebar?.(); 
        fetchStage();
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
                slotSelect.style.cssText = 'width: 100%; padding: 12px; background: rgba(0,0,0,0.05); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 8px; font-weight: bold; margin-bottom: 15px; outline:none;';
                
                [2, 4, 6].forEach(num => {
                    const opt = document.createElement('option');
                    opt.value = String(num);
                    opt.text = `${num} Kursi`;
                    if (num === roomSlotCount) opt.selected = true;
                    slotSelect.appendChild(opt);
                });
                slotDiv.appendChild(slotSelect);
                
                const saveBtn = body.querySelector('.btn-save-setting');
                if (saveBtn) body.insertBefore(slotDiv, saveBtn); else body.appendChild(slotDiv);
            }
        }
        window.toggleSidebar?.(); 
    };
    
    window.closeRoomSetting = () => { document.getElementById('setting-modal')?.classList.remove('show'); };
    
    window.saveRoomSetting = async () => {
        const newName = (document.getElementById('edit-room-name') as HTMLInputElement).value;
        const sysMsg = (document.getElementById('system-message') as HTMLInputElement).value;
        const slotSelect = document.getElementById('edit-room-slots') as HTMLSelectElement;
        
        let newSlotCount = roomSlotCount;
        if (slotSelect) {
            newSlotCount = parseInt(slotSelect.value) || 6;
        }

        if (!newName) return showNotif(t('room_name_empty'), "warning");
        
        try {
            await sb.from('rooms').update({ name: newName, slot_count: newSlotCount }).eq('id', CURRENT_ROOM_ID);
            
            if (newSlotCount < roomSlotCount) {
                await sb.from('room_slots')
                    .update({ profile_id: null })
                    .eq('room_id', CURRENT_ROOM_ID)
                    .gte('slot_index', newSlotCount); 
            }

            if (sysMsg) await sb.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `PENGUMUMAN: ${sysMsg}`, role: "admin" }]);
            
            setRoomSlotCount(newSlotCount);

            const url = new URL(window.location.href); url.searchParams.set('name', newName); window.history.pushState({}, '', url); 
            const titleEl = document.querySelector('.room-title') as HTMLElement;
            if(titleEl) titleEl.innerText = newName.toUpperCase();
            
            showNotif(`Pengaturan Panggung tersimpan (${newSlotCount} Kursi)`, "success");
            window.closeRoomSetting?.();
            fetchStage(newSlotCount);
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
        ['room-gift-drawer', 'room-drawer-overlay', 'gift-anim-overlay'].forEach(id => document.getElementById(id)?.remove());
    };
  }, [t, searchParams, router]);

  useEffect(() => {
  }, [roomSlotCount]);

  if (!mounted) return null;

  return (
    <div className="in-voice-room" onClick={(e) => window.handleGlobalClick?.(e)}>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" />
      <Script src="https://cdn.jsdelivr.net/npm/livekit-client@1.15.12/dist/livekit-client.umd.min.js" />
      
      <div className="tap-counter-box">
          <span className="material-icons">favorite</span>
          <b>{totalTaps.toLocaleString()}</b>
      </div>

      <Sidebar /><Modals />
      <div className="app-container"><Header /><Stage /><ChatBox /><Footer /></div> 
      <GiftDrawer /><GiftAnimOverlay />

      {/* MODAL PROFILE SHEET ELEGAN */}
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
              </div>
              
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

                {/* 🔥 FIX 2: TOMBOL GRADASI MERAH BIRU 🔥 */}
                <button className="btn-action-sheet btn-gradient" onClick={() => router.push(`/data?id=${selectedUser.id}`)}>
                  Lihat Profil Lengkap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* CSS GLOBAL KHUSUS TEMA BARU */}
      <style jsx global>{`
        :root { --radar-color: #1f3cff; }
        
        .tap-counter-box {
          position: fixed; top: calc(env(safe-area-inset-top, 0px) + 12px); left: 50%; transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(10px); padding: 4px 12px; border-radius: 20px;
          color: #fff; display: flex; align-items: center; gap: 6px; z-index: 2000; font-size: 12px;
          border: 1px solid rgba(255,255,255,0.1); pointer-events: none;
        }
        .tap-counter-box .material-icons { font-size: 14px; color: #ff4757; }

        .tap-emoji-fly {
          position: fixed; pointer-events: none; z-index: 999999; font-size: 28px; user-select: none;
          animation: flyUpAnim 1s ease-out forwards;
        }
        @keyframes flyUpAnim {
          0% { transform: translateY(0) scale(1) rotate(0); opacity: 1; }
          100% { transform: translateY(-200px) translateX(${Math.random() * 80 - 40}px) scale(1.5) rotate(20deg); opacity: 0; }
        }

        /* PROFILE SHEET CSS MINIMALIS */
        .user-profile-sheet-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 10005;
          opacity: 0; visibility: hidden; transition: 0.3s;
        }
        .user-profile-sheet-overlay.active { opacity: 1; visibility: visible; }
        .user-profile-sheet {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: var(--bg-main, #ffffff); border-top-left-radius: 24px; border-top-right-radius: 24px;
          padding: 20px 20px 40px; transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
          text-align: center; border-top: 1px solid var(--border-color);
          box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
        }
        .user-profile-sheet-overlay.active .user-profile-sheet { transform: translateY(0); }
        .sheet-handle { width: 40px; height: 5px; background: var(--border-color); border-radius: 10px; margin: 0 auto 20px; }
        
        .profile-sheet-avatar { 
          width: 90px; height: 90px; border-radius: 50%; border: 3px solid transparent; 
          background-clip: padding-box, border-box; background-origin: padding-box, border-box;
          background-image: linear-gradient(var(--bg-main), var(--bg-main)), linear-gradient(135deg, #ff4757, #1f3cff);
          object-fit: cover; margin-bottom: 15px; 
        }
        .profile-sheet-name { font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; justify-content: center; gap: 5px; }
        
        /* TOMBOL SHEET ELEGAN */
        .btn-action-sheet {
          width: 100%; padding: 14px; border: none; border-radius: 14px;
          font-weight: 800; font-size: 14px; cursor: pointer; transition: transform 0.2s, opacity 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-action-sheet.danger { background: rgba(255, 71, 87, 0.1); color: #ff4757; border: 1px solid rgba(255,71,87,0.2); }
        .btn-action-sheet.btn-gradient { 
          background: linear-gradient(135deg, #ff4757, #1f3cff); 
          color: #fff; box-shadow: 0 4px 15px rgba(31, 60, 255, 0.3);
        }
        .btn-action-sheet:active { transform: scale(0.96); opacity: 0.9; }

        .avatar.speaking { box-shadow: 0 0 0 3px var(--radar-color); animation: pulseRadar 1.5s infinite; }
        @keyframes pulseRadar { 0% { box-shadow: 0 0 0 0px var(--radar-color); } 70% { box-shadow: 0 0 0 10px rgba(31, 60, 255, 0); } 100% { box-shadow: 0 0 0 0px rgba(0,0,0,0); } }
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
