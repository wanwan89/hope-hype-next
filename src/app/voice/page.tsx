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
    closeConfirmModal?: () => void;
    openTopGiftersModal?: () => void;
    closeTopGiftersModal?: () => void;
    playGiftAnimation?: (giftId: number | string, forcedCombo?: number | null) => void;
    accRequestNaik?: (userId: string, username: string) => void; // 🔥 Fungsi ACC
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
  
  const myTotalGiftSent = useRef(0);
  const myLevel = useRef(1);
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

    const CURRENT_ROOM_ID = searchParams?.get('id') || new URLSearchParams(window.location.search).get('id'); 
    const CURRENT_ROOM_NAME = searchParams?.get('name') || new URLSearchParams(window.location.search).get('name') || "Voice Room";

    const updateTitle = () => {
        const titleEl = document.querySelector('.room-title') as HTMLElement;
        if (titleEl && CURRENT_ROOM_NAME) {
            titleEl.innerText = CURRENT_ROOM_NAME.toUpperCase();
        }
    };
    updateTitle();

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
        overlay.innerHTML = `<b>${username}</b> <span style="margin-left:5px;">${t('entering_room')}</span>`;
        document.body.appendChild(overlay);
        setTimeout(() => { if (overlay) overlay.remove(); }, 4000);
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, (p: any) => {
            const chatBox = document.getElementById('chat-box');
            if (!chatBox) return;
            const isGift = p.new.username === "SISTEM_GIFT";
            let isDariSaya = false;
            let comboValue = 1;
            if (isGift) {
                const match = p.new.text.match(/^(.+) mengirim .+ x(\d+) ke/);
                if (match) { comboValue = parseInt(match[2]); isDariSaya = (match[1] === myUsername.current); }
                if (!isDariSaya) playGiftAnimation(parseInt(p.new.role), comboValue);
            }
            const div = document.createElement('div'); div.id = `msg-${p.new.id}`;
            if (isGift) {
                div.className = 'msg system-gift'; div.innerHTML = `<span>🎁 ${p.new.text}</span>`;
            } else {
                const isSystem = p.new.username.startsWith("SISTEM");
                div.className = isSystem ? 'msg system' : 'msg';
                const style = getLevelStyle(p.new.level || 1);
                const lvlBadge = getLevelBadgeHTML(p.new.level || 1);
                const roleBadge = getUserBadge(p.new.role || '');
                const userLink = `<span onclick="window.location.href='/data?username=${encodeURIComponent(p.new.username)}'" style="color:${style.color}; font-weight:bold; cursor:pointer;">${p.new.username}${lvlBadge}${roleBadge}</span>`;
                div.innerHTML = isSystem ? `<span>${p.new.text}</span>` : `${userLink}<span>: ${p.new.text}</span>`;
            }
            chatBox.appendChild(div); chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
            fetchTopGifters(); 
        })
        // 🔥 FITUR ACC: Dengerin broadcast permintaan naik 🔥
        .on('broadcast', { event: 'minta_naik' }, (p: any) => {
            if (IS_OWNER.current) {
                const acc = confirm(`${p.payload.username} ingin naik panggung. Izinkan?`);
                if (acc) window.accRequestNaik?.(p.payload.userId, p.payload.username);
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

    async function fetchTopGifters() {
        // 🔥 FIX 2: Hitung Top Gifter hanya untuk room ini 🔥
        const { data: messages } = await sb.from('room_messages').select('text, role').eq('room_id', CURRENT_ROOM_ID).eq('username', 'SISTEM_GIFT');
        const hargaKado: Record<string, number> = { '1': 1, '2': 10, '3': 50, '4': 100, '5': 2000, '6': 5000, '7': 10000, '8': 25000, '9': 50000, '10': 100000 };
        let totals: Record<string, number> = {};
        messages?.forEach((m: any) => {
            const match = m.text.match(/^(.+) mengirim .+ x(\d+) ke/);
            if (match) { totals[match[1]] = (totals[match[1]] || 0) + (hargaKado[m.role] * parseInt(match[2])); }
        });
        const sorted = Object.keys(totals).sort((a, b) => totals[b] - totals[a]).slice(0, 3);
        const container = document.getElementById('top-gifters-container');
        if (!container) return;
        if (sorted.length === 0) { container.style.display = 'none'; return; }
        const { data: profs } = await sb.from('profiles').select('username, avatar_url').in('username', sorted);
        container.style.display = 'flex';
        container.innerHTML = `<span style="font-size: 11px; color: #FFD700; font-weight:800; margin-right:6px;">🏆 TOP</span>`;
        sorted.forEach((name, i) => {
            const p = profs?.find(x => x.username === name);
            container.innerHTML += `<img src="${p?.avatar_url || '/asets/png/profile.webp'}" style="width:28px; height:28px; border-radius:50%; border:2px solid #555; margin-left:-12px; z-index:${3-i}; background:#222; object-fit:cover;">`;
        });
        container.onclick = () => window.openTopGiftersModal?.();
    }

    async function initApp() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { router.push('/hypetalk'); return; }
        MY_USER_ID.current = session.user.id;
        const { data: p } = await sb.from('profiles').select('*').eq('id', MY_USER_ID.current).single();
        const { data: roomData } = await sb.from('rooms').select('owner_id, is_active').eq('id', CURRENT_ROOM_ID).maybeSingle();
        if (p) { myUsername.current = p.username; myRole.current = p.role; myLevel.current = p.level || 1; myTotalGiftSent.current = p.total_gift_sent || 0; if (document.getElementById('user-coins')) document.getElementById('user-coins')!.innerText = (p.coins || 0).toLocaleString(); }
        if (roomData) {
            IS_OWNER.current = roomData.owner_id === MY_USER_ID.current;
            // 🔥 FIX 4: Owner Presence Protection 🔥
            if (IS_OWNER.current) { await sb.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID); } 
            else if (!roomData.is_active) { showNotif("Panggung sedang ditutup oleh owner!", "error"); router.push('/hypetalk'); return; }
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
        data.forEach((slot: any) => {
            const user = slot.profiles; const isMe = user?.id === MY_USER_ID.current;
            const item = document.createElement('div'); item.className = 'speaker-item';
            if (user) {
                const style = getLevelStyle(user.level);
                item.innerHTML = `<div class="avatar ${isMe ? 'active' : ''}" data-user-id="${user.id}" onclick="window.${isMe ? 'turunMic' : 'toggleKickBtn'}(this, ${IS_OWNER.current && !isMe})"><img src="${user.avatar_url || '/asets/png/profile.webp'}" style="object-fit:cover;"><div class="mute-badge" style="display: ${user.mic_off ? 'flex' : 'none'}; position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.7); border-radius: 50%; width: 22px; height: 22px; align-items: center; justify-content: center; border: 2px solid white; z-index: 10;"><span class="material-icons" style="color: #e74c3c; font-size: 14px;">mic_off</span></div>${(IS_OWNER.current && !isMe) ? `<div class="kick-btn-wrapper" style="display:none;"><div class="kick-btn" onclick="event.stopPropagation(); window.kickUser('${slot.profile_id}', '${user.username}')"><span class="material-icons">close</span></div></div>` : ''}</div><span class="name-label" style="color:${style.color}">${user.username}${getLevelBadgeHTML(user.level)}${getUserBadge(user.role || '')}</span>`;
            } else {
                item.innerHTML = `<div class="avatar" onclick="window.naikKeStage?.(${slot.slot_index})"><span class="material-icons" style="color:#444; font-size:30px;">add</span></div><span class="name-label">KOSONG</span>`;
            }
            grid.appendChild(item);
        });
    }

    // 🔥 GLOBAL WINDOW ASSIGNMENTS 🔥
    window.toggleMicSidebar = async (e) => {
        e?.preventDefault();
        if (!roomRef.current?.localParticipant) return showNotif(t('mic_not_ready'), "warning");
        const { data: onStage } = await sb.from('room_slots').select('*').eq('room_id', CURRENT_ROOM_ID).eq('profile_id', MY_USER_ID.current).single();
        if (!onStage) return showNotif(t('mic_stage_first'), "warning");

        // 🔥 FIX 1: Gunakan status asli LiveKit sebagai Source of Truth 🔥
        const nowEnabled = roomRef.current.localParticipant.isMicrophoneEnabled;
        await roomRef.current.localParticipant.setMicrophoneEnabled(!nowEnabled);
        await sb.from('profiles').update({ mic_off: nowEnabled }).eq('id', MY_USER_ID.current);

        const icon = document.getElementById('mic-icon');
        const text = document.getElementById('mic-text');
        if (icon && text) {
            icon.innerText = !nowEnabled ? 'mic' : 'mic_off';
            text.innerText = !nowEnabled ? "Matikan Mic" : "Hidupkan Mic";
            icon.style.color = !nowEnabled ? '#2ecc71' : '#ef4444';
        }
        window.toggleSidebar?.();
        fetchStage();
    };

    window.mintaNaik = () => {
        if (IS_OWNER.current) return showNotif("Lu owner-nya Bree!", "info");
        showNotif("Permintaan naik panggung terkirim...", "info");
        // 🔥 FIX 3: Broadcast minta naik 🔥
        channelRef.current.send({ type: 'broadcast', event: 'minta_naik', payload: { userId: MY_USER_ID.current, username: myUsername.current } });
    };

    window.accRequestNaik = (userId) => {
        channelRef.current.send({ type: 'broadcast', event: 'naik_diizinkan', payload: { userId } });
    };

    window.naikKeStage = async (idx) => {
        if (!MY_USER_ID.current) return showNotif("Login dulu!", "warning");
        const { data: check } = await sb.from('room_slots').select('profile_id').match({ room_id: CURRENT_ROOM_ID, slot_index: idx }).single();
        if (check?.profile_id) return showNotif("Sudah terisi!", "warning");
        if (roomRef.current) await roomRef.current.localParticipant.setMicrophoneEnabled(true);
        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID.current);
        await sb.from('room_slots').update({ profile_id: MY_USER_ID.current }).match({ room_id: CURRENT_ROOM_ID, slot_index: idx });
        await sb.from('profiles').update({ mic_off: false }).eq('id', MY_USER_ID.current);
        fetchStage();
    };

    window.prosesTurunMic = async () => {
        document.getElementById('confirm-modal')!.style.display = 'none';
        if (roomRef.current) await roomRef.current.localParticipant.setMicrophoneEnabled(false);
        await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID.current);
        await sb.from('profiles').update({ mic_off: true }).eq('id', MY_USER_ID.current);
        fetchStage();
    };

    window.keluarRoom = async () => {
        if (IS_OWNER.current && confirm("Tutup panggung?")) {
            await sb.from('rooms').update({ is_active: false }).eq('id', CURRENT_ROOM_ID);
            await sb.from('room_slots').update({ profile_id: null }).eq('room_id', CURRENT_ROOM_ID);
            await sb.from('room_messages').delete().eq('room_id', CURRENT_ROOM_ID);
        } else {
            await sb.from('room_slots').update({ profile_id: null }).eq('profile_id', MY_USER_ID.current).eq('room_id', CURRENT_ROOM_ID);
        }
        roomRef.current?.disconnect(); router.push('/hypetalk');
    };

    window.sendGift = sendGift;
    window.toggleSidebar = () => { document.getElementById('sidebar')?.classList.toggle('active'); document.getElementById('sidebar-overlay')?.classList.toggle('active'); };
    window.toggleRoomGiftDrawer = () => { document.getElementById('room-gift-drawer')?.classList.toggle('open'); document.getElementById('room-drawer-overlay')?.classList.toggle('show'); updateLevelProgressUI(); };
    window.openConfirmModal = () => { document.getElementById('confirm-modal')!.style.display = 'flex'; };
    window.closeConfirmModal = () => { document.getElementById('confirm-modal')!.style.display = 'none'; };
    window.toggleKickBtn = (el, canKick) => { if (!canKick) return; const w = el.querySelector('.kick-btn-wrapper'); w.style.display = w.style.display === 'none' ? 'flex' : 'none'; };
    
    const sdkInterval = setInterval(() => { if (window.LivekitClient) { clearInterval(sdkInterval); initApp(); } }, 500);
    return () => { clearInterval(sdkInterval); roomRef.current?.disconnect(); };
  }, [searchParams, router, t]);

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

export default function Page() {
  return (
    <Suspense fallback={<div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#01070A', color:'#fff'}}>Memuat panggung...</div>}>
      <VoiceRoomContent />
    </Suspense>
  );
}
