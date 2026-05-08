'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Script from 'next/script';
import { useSearchParams, useRouter } from 'next/navigation'; 
import { supabase as sb } from '@/lib/supabase'; 
import { useTranslation } from 'react-i18next';
// Import UI Utils biar Badge & Notif muncul
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
    // 🔥 FITUR BARU 🔥
    handleGlobalClick?: (e: any) => void;
    openUserProfile?: (userId: string) => void;
  }
  var LivekitClient: any;
}

// 🔥 1. FUNGSI KONTEN UTAMA (VoiceRoomContent) 🔥
function VoiceRoomContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams(); 
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const roomRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  // 🔥 STATES BARU UNTUK TAP & PROFILE 🔥
  const [totalTaps, setTotalTaps] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
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

    // 🔥 LOGIKA ANIMASI TAP TAP (❤️ ONLY) 🔥
    function createTapAnimation(x: number, y: number) {
      const heart = document.createElement('div');
      heart.innerHTML = '❤️';
      heart.className = 'tap-emoji-fly';
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      document.body.appendChild(heart);
      setTimeout(() => heart.remove(), 1000);
    }

    // 🔥 LOGIKA TAP HANYA DI CHAT BOX + PERSISTEN 🔥
    window.handleGlobalClick = async (e: any) => {
      const chatBoxArea = document.getElementById('chat-box');
      if (!chatBoxArea || !chatBoxArea.contains(e.target as Node)) return;
      
      const x = e.clientX || (e.touches && e.touches[0].clientX);
      const y = e.clientY || (e.touches && e.touches[0].clientY);
      if (!x || !y) return;

      createTapAnimation(x, y);
      
      // Update local state secara optimis
      setTotalTaps(prev => {
        const newTotal = prev + 1;
        // Sync ke DB setiap kelipatan 5 tap biar ga berat ke server
        if (newTotal % 5 === 0) {
          sb.from('rooms').update({ tap_count: newTotal }).eq('id', CURRENT_ROOM_ID).then();
        }
        return newTotal;
      });

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'tap_event',
          payload: { x, y }
        });
      }
    };

    // 🔥 LOGIKA PROFILE SLIDE UP 🔥
    window.openUserProfile = async (userId: string) => {
      if (!userId) return;
      try {
        const { data: p, error } = await sb.from('profiles').select('*').eq('id', userId).single();
        if (error || !p) return;
        setSelectedUser(p);
        setIsProfileOpen(true);
      } catch (err) { console.error(err); }
    };

    // --- LOGIKA HELPER ---
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
            const { data: profs } = await sb.from('profiles').select('id, username, avatar_url, level, role').in('username', names);
            return (profs || []).map(p => ({ ...p, room_total: totals[p.username] })).sort((a, b) => b.room_total - a.room_total);
        } catch (e) { return []; }
    }

    function playVIPEntrance(username: string, level: number) {
        if (level < 4) return; 
        if (!document.getElementById('vip-anim-styles-clean')) {
            const style = document.createElement('style');
            style.id = 'vip-anim-styles-clean';
            style.innerHTML = `@keyframes vipSlideInClean { 0% { transform: translate(-150vw, -50%); opacity: 0; } 15% { transform: translate(-50%, -50%); opacity: 1; } 85% { transform: translate(-50%, -50%); opacity: 1; } 100% { transform: translate(150vw, -50%); opacity: 0; } } .vip-banner-clean { position: fixed; top: 60%; left: 50%; z-index: 1000000; padding: 12px 28px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; overflow: hidden; pointer-events: none; width: max-content; max-width: 90%; animation: vipSlideInClean 4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }`;
            document.head.appendChild(style);
        }
        let overlay = document.getElementById('vip-entrance-overlay');
        if (overlay) overlay.remove(); 
        overlay = document.createElement('div');
        overlay.id = 'vip-entrance-overlay';
        overlay.className = 'vip-banner-clean';
        const bg = level === 4 ? "background: rgba(14, 165, 233, 0.95);" : "background: rgba(225, 29, 72, 0.95);";
        overlay.setAttribute('style', `${bg} border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(0,0,0,0.3); backdrop-filter: blur(10px);`);
        overlay.innerHTML = `<b>${username}</b> <span style="margin-left:5px;">MEMASUKI ROOM</span>`;
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

    function listenRealtime() {
        if (!CURRENT_ROOM_ID || !MY_USER_ID.current) return;
        channelRef.current = sb.channel(`room_active_${CURRENT_ROOM_ID}`, { config: { presence: { key: MY_USER_ID.current } } });

        channelRef.current
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => { fetchStage(); })
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
                // 🔥 FIX: User Link to open slide up profile 🔥
                const userLink = `<span onclick="window.openUserProfile('${p.new.user_id || ''}')" style="color:${style.color}; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; position:relative; z-index:10; pointer-events:auto;">${p.new.username}${lvlBadge}${roleBadge}</span>`;
                div.innerHTML = isSystem ? `<span>${p.new.text}</span>` : `${userLink}<span>: ${p.new.text}</span>`;
            }

            chatBox.appendChild(div); 
            chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
            fetchTopGifters(); 
        })
        // 🔥 SYNC TAP BROADCAST 🔥
        .on('broadcast', { event: 'tap_event' }, (p: any) => {
          createTapAnimation(p.payload.x, p.payload.y);
          setTotalTaps(prev => prev + 1);
        })
        .on('broadcast', { event: 'minta_naik' }, (p: any) => {
            if (IS_OWNER.current) {
                const acc = confirm(`${p.payload.username} ingin naik panggung. Izinkan?`);
                if (acc) window.accNaikPanggung?.(p.payload.userId, p.payload.username);
            }
        })
        .on('broadcast', { event: 'naik_diizinkan' }, async (p: any) => {
            if (p.payload.userId === MY_USER_ID.current) {
                showNotif("Permintaan diterima! Mencari kursi...", "success");
                const { data: allSlots } = await sb.from('room_slots').select('slot_index, profile_id').eq('room_id', CURRENT_ROOM_ID).order('slot_index', { ascending: true });
                const slotKosong = allSlots?.find(s => !s.profile_id);
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

    async function initApp() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { router.push('/hypetalk'); return; }
        MY_USER_ID.current = session.user.id;
        
        const { data: p } = await sb.from('profiles').select('*').eq('id', MY_USER_ID.current).single();
        const { data: roomData } = await sb.from('rooms').select('*').eq('id', CURRENT_ROOM_ID).maybeSingle();
        
        if (p) { 
            myUsername.current = p.username; myRole.current = p.role; myLevel.current = p.level || 1; myTotalGiftSent.current = p.total_gift_sent || 0; 
            if (document.getElementById('user-coins')) document.getElementById('user-coins')!.innerText = (p.coins || 0).toLocaleString(); 
        }
        
        if (roomData) {
            setTotalTaps(roomData.tap_count || 0); // 🔥 Load tap count dari DB
            IS_OWNER.current = roomData.owner_id === MY_USER_ID.current;
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
                // 🔥 Avatar click to open slide up profile 🔥
                item.innerHTML = `
                    <div class="avatar ${isMe ? 'active' : ''}" data-user-id="${user.id}" onclick="window.openUserProfile('${user.id}')">
                        <img src="${user.avatar_url || '/asets/png/profile.webp'}" style="object-fit:cover;">
                        <div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'}; position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7); border-radius: 50%; width: 22px; height: 22px; align-items: center; justify-content: center; border: 2px solid white; z-index: 10;">
                            <span class="material-icons" style="color: #e74c3c; font-size: 14px;">mic_off</span>
                        </div>
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
    // 🔥 WINDOW ASSIGNMENTS 🔥
    // ==========================================================
    window.sendGift = sendGift;

    window.naikKeStage = async (idx) => {
        if (!MY_USER_ID.current) return showNotif("Login dulu!", "warning");
        if (roomRef.current && roomRef.current.state === "connected") await roomRef.current.localParticipant.setMicrophoneEnabled(true);
        const { data: checkSlot } = await sb.from('room_slots').select('profile_id').match({ room_id: CURRENT_ROOM_ID, slot_index: idx }).single();
        if (checkSlot && checkSlot.profile_id !== null) { await roomRef.current?.localParticipant.setMicrophoneEnabled(false); return showNotif("Kursi sudah ada yang menempati!", "warning"); }
        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID.current);
        await sb.from('room_slots').update({ profile_id: MY_USER_ID.current }).match({ room_id: CURRENT_ROOM_ID, slot_index: idx });
        await sb.from('profiles').update({ mic_off: false }).eq('id', MY_USER_ID.current);
        isMicOn.current = true;
        fetchStage();
    };

    window.turunMic = () => { document.getElementById('confirm-modal')!.style.display = 'flex'; };

    window.prosesTurunMic = async () => {
        const m = document.getElementById('confirm-modal');
        if (m) m.style.display = 'none';
        if (roomRef.current?.localParticipant) await roomRef.current.localParticipant.setMicrophoneEnabled(false);
        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID.current);
        await sb.from('profiles').update({ mic_off: true }).eq('id', MY_USER_ID.current);
        isMicOn.current = false;
        fetchStage();
    };

    window.kirimKomentar = async () => {
        const inputEl = document.getElementById('chat-input') as HTMLInputElement;
        const text = inputEl?.value.trim();
        if (!text || !CURRENT_ROOM_ID || !MY_USER_ID.current) return;
        inputEl.value = ''; 
        try {
            // 🔥 FIX: user_id disertakan agar terbaca oleh listener realtime 🔥
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

    const sdkInterval = setInterval(() => { if (typeof window.LivekitClient !== 'undefined') { clearInterval(sdkInterval); initApp(); } }, 500);
    return () => { clearInterval(sdkInterval); roomRef.current?.disconnect(); };
  }, [t, searchParams, totalTaps]);

  if (!mounted) return null;

  return (
    <div className="in-voice-room" onClick={(e) => window.handleGlobalClick?.(e)}>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" />
      <Script src="https://cdn.jsdelivr.net/npm/livekit-client@1.15.12/dist/livekit-client.umd.min.js" />
      
      {/* 🔥 CONTAINER JUMLAH TAP-TAP 🔥 */}
      <div className="tap-counter-top">
          <span className="material-icons">favorite</span>
          <b>{totalTaps.toLocaleString()}</b>
      </div>

      <Sidebar /><Modals />
      <div className="app-container"><Header /><Stage /><ChatBox /><Footer /></div> 
      <GiftDrawer /><GiftAnimOverlay />

      {/* 🔥 PROFILE SLIDE UP 🔥 */}
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
                <div className="profile-sheet-level">LEVEL {selectedUser.level || 1}</div>
              </div>
              <button className="btn-view-profile-full" onClick={() => router.push(`/data?id=${selectedUser.id}`)}>
                Lihat Profil Lengkap
              </button>
            </div>
          )}
        </div>
      </div>
      
      <style jsx global>{`
        :root { --radar-color: #3b82f6; }
        
        .tap-counter-top {
          position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px);
          padding: 4px 12px; border-radius: 20px; color: #fff;
          display: flex; align-items: center; gap: 6px; z-index: 3000;
          font-size: 12px; border: 1px solid rgba(255,255,255,0.1); pointer-events: none;
        }
        .tap-counter-top .material-icons { font-size: 14px; color: #ff4757; }

        .tap-emoji-fly {
          position: fixed; pointer-events: none; z-index: 999999;
          font-size: 28px; animation: flyUpAnim 1s ease-out forwards;
        }

        @keyframes flyUpAnim {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-250px) translateX(${Math.random() * 80 - 40}px) scale(1.5); opacity: 0; }
        }

        .user-profile-sheet-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10005;
          opacity: 0; visibility: hidden; transition: 0.3s;
        }
        .user-profile-sheet-overlay.active { opacity: 1; visibility: visible; }
        .user-profile-sheet {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: #111; border-top-left-radius: 24px; border-top-right-radius: 24px;
          padding: 20px 20px 40px; transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
          text-align: center; border-top: 1px solid #333;
        }
        .user-profile-sheet-overlay.active .user-profile-sheet { transform: translateY(0); }
        .sheet-handle { width: 40px; height: 5px; background: #444; border-radius: 10px; margin: 0 auto 20px; }
        .profile-sheet-avatar { width: 90px; height: 90px; border-radius: 50%; border: 3px solid #1f3cff; object-fit: cover; margin-bottom: 15px; }
        .profile-sheet-name { font-size: 18px; font-weight: 800; color: #fff; margin: 0; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .profile-sheet-level { font-size: 12px; color: #f1c40f; font-weight: 800; margin-top: 5px; }
        .btn-view-profile-full {
          width: 100%; padding: 14px; background: #1f3cff; border: none; border-radius: 14px;
          color: #fff; font-weight: 800; font-size: 14px; margin-top: 25px; cursor: pointer;
        }

        .avatar.speaking { 
            box-shadow: 0 0 0 4px var(--radar-color); 
            animation: pulseRadar 1.5s infinite; 
        }
        .radar-rgb .avatar.speaking { 
            animation: rgbRadar 2s infinite linear; 
        }
        @keyframes pulseRadar { 
            0% { box-shadow: 0 0 0 0px var(--radar-color); } 
            70% { box-shadow: 0 0 0 15px rgba(0,0,0,0); } 
            100% { box-shadow: 0 0 0 0px rgba(0,0,0,0); } 
        }
        @keyframes rgbRadar { 
            0% { box-shadow: 0 0 10px red; } 
            33% { box-shadow: 0 0 10px green; } 
            66% { box-shadow: 0 0 10px blue; } 
            100% { box-shadow: 0 0 10px red; } 
        }
      `}</style>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#01070A', 
        color: '#fff',
        fontFamily: 'sans-serif'
      }}>
        Memuat panggung...
      </div>
    }>
      <VoiceRoomContent />
    </Suspense>
  );
}
