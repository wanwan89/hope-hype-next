'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Room, RoomEvent } from 'livekit-client';
import { showNotif } from '@/lib/ui-utils';
import './Voice.css';

const GIFTS = [
  { name: 'Love', price: 1, id: 1 },
  { name: 'Daebak', price: 10, id: 2 },
  { name: 'Omoomo', price: 50, id: 3 },
  { name: 'Oppa', price: 100, id: 4 },
  { name: 'Fighting', price: 2000, id: 5 },
  { name: 'Saranghae', price: 5000, id: 6 },
  { name: 'Kiyowo', price: 10000, id: 7 },
  { name: 'Gomawo', price: 25000, id: 8 },
  { name: 'Daesang', price: 50000, id: 9 },
  { name: 'Sultan', price: 100000, id: 10 }
];

function VoiceRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const CURRENT_ROOM_ID = searchParams?.get('id');
  const CURRENT_ROOM_NAME = searchParams?.get('name') || "Voice Room";

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [slots, setSlots] = useState<any[]>(Array(6).fill({ profile_id: null }));
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [topGifters, setTopGifters] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [roomLk, setRoomLk] = useState<Room | null>(null);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [isMicOn, setIsMicOn] = useState(false);
  const [giftAnim, setGiftAnim] = useState({ show: false, giftId: 1, count: 1 });
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CURRENT_ROOM_ID) return;
    checkUserAndInit();
  }, [CURRENT_ROOM_ID]);

  const checkUserAndInit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (!profile) return;
    setCurrentUser(profile);

    const { data: roomData } = await supabase.from('rooms').select('owner_id, is_active').eq('id', CURRENT_ROOM_ID).maybeSingle();
    if (roomData?.owner_id === profile.id) {
        setIsOwner(true);
        await supabase.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID);
    }
    fetchStage();
    fetchTopGifters();
    initLiveKit(profile.id, profile.username);
    listenRealtime();
  };

  const fetchStage = async () => {
    const { data: stg } = await supabase.from('room_slots')
        .select(`slot_index, profile_id, profiles (username, avatar_url, mic_off, level, role)`)
        .eq('room_id', CURRENT_ROOM_ID)
        .order('slot_index', { ascending: true });
    
    const normalized = (stg || []).map((s: any) => ({
      ...s,
      profiles: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    }));

    const finalSlots = Array.from({ length: 6 }, (_, i) => normalized.find(s => s.slot_index === i) || { slot_index: i, profile_id: null });
    setSlots(finalSlots);

    const mySlot = normalized.find((s: any) => s.profile_id === currentUser?.id);
    if (mySlot?.profiles) setIsMicOn(!mySlot.profiles.mic_off);
  };

  const initLiveKit = async (userId: string, username: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-livekit-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ username, identity: userId, roomName: CURRENT_ROOM_ID })
      });
      const { token } = await res.json();
      const lkRoom = new Room({ adaptiveStream: true });
      lkRoom.on(RoomEvent.ActiveSpeakersChanged, (s) => setActiveSpeakers(s.map(p => p.identity)));
      lkRoom.on(RoomEvent.TrackSubscribed, (t) => { if (t.kind === "audio") { const el = t.attach(); document.body.appendChild(el); el.play().catch(()=>{}); }});
      await lkRoom.connect("wss://voicegrup-zxmeibkn.livekit.cloud", token);
      setRoomLk(lkRoom);
    } catch (e) { console.error(e); }
  };

  const listenRealtime = () => {
    supabase.channel(`voice_${CURRENT_ROOM_ID}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots' }, fetchStage)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages' }, (p) => {
        setChatMessages(prev => [...prev, p.new]);
        if (p.new.username === "SISTEM_GIFT") fetchTopGifters();
      })
      .subscribe();
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const toggleMic = async () => {
    if (!roomLk) return;
    const nextStatus = !isMicOn;
    await roomLk.localParticipant.setMicrophoneEnabled(nextStatus);
    await supabase.from('profiles').update({ mic_off: !nextStatus }).eq('id', currentUser.id);
    setIsMicOn(nextStatus);
    setIsSidebarOpen(false);
    fetchStage();
  };

  const sendGift = async (giftName: string, harga: number, giftId: number) => {
    // Logic gift original lo (RPC transfer, history, insert message) - Disederhanakan untuk UI
    setCurrentUser((prev:any) => ({ ...prev, coins: prev.coins - harga }));
    setGiftAnim({ show: true, giftId, count: 1 });
    setTimeout(() => setGiftAnim(prev => ({ ...prev, show: false })), 3000);
    await supabase.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM_GIFT", text: `${currentUser.username} mengirim ${giftName} x1`, role: giftId.toString(), level: 1 }]);
  };

  const fetchTopGifters = async () => {
    const { data } = await supabase.from('profiles').select('username, avatar_url, total_gift_sent').gt('total_gift_sent', 0).order('total_gift_sent', { ascending: false }).limit(3); 
    if (data) setTopGifters(data);
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <div className="header-left">
          <h1 className="room-title">{CURRENT_ROOM_NAME}</h1>
          <div className="online-status"><div className="online-dot" /> <span>Online</span></div>
        </div>
        <span className="material-icons" onClick={() => setIsSidebarOpen(true)}>menu</span>
      </header>

      <section className="stage-container">
        {slots.map((s, i) => (
          <div key={i} className="speaker-item">
            <div className={`avatar ${activeSpeakers.includes(s.profile_id) ? 'speaking' : ''}`}>
              {s.profiles ? <img src={s.profiles.avatar_url} /> : <span className="material-icons">add</span>}
              {s.profiles?.mic_off && <div className="mute-badge"><span className="material-icons" style={{fontSize:'12px',color:'red'}}>mic_off</span></div>}
            </div>
            <span className="name-label">{s.profiles?.username || "KOSONG"}</span>
          </div>
        ))}
      </section>

      <div className="chat-display">
        {chatMessages.map(m => (
          <div key={m.id} className={`msg ${m.username === 'SISTEM_GIFT' ? 'system-gift' : ''}`}>
            {m.username !== 'SISTEM_GIFT' && <b>{m.username}: </b>} {m.text}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <footer className="footer-controls">
        <button className="btn-gift-main" onClick={() => setIsDrawerOpen(true)}><span className="material-icons">redeem</span></button>
        <div className="input-wrapper">
          <input id="chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ketik komentar..." />
        </div>
      </footer>

      {/* OVERLAYS - SEMUA FIXED KE CONTAINER */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
            <div className="profile-img-wrapper">
                <img src={currentUser?.avatar_url || '/asets/png/profile.png'} className="sidebar-profile-img" />
            </div>
            <b>{currentUser?.username}</b>
        </div>
        <div className="sidebar-menu">
            <a onClick={toggleMic} style={{cursor:'pointer'}}><div className="menu-icon-box"><span className="material-icons">{isMicOn ? 'mic' : 'mic_off'}</span></div><span>{isMicOn ? 'Matikan Mic' : 'Nyalakan Mic'}</span></a>
            <a onClick={() => router.push('/voice-room')} style={{cursor:'pointer', color:'red'}}><div className="menu-icon-box" style={{background:'#fee2e2'}}><span className="material-icons">logout</span></div><span>Keluar Ruangan</span></a>
        </div>
      </aside>

      <div className={`drawer-overlay ${isDrawerOpen ? 'show' : ''}`} onClick={() => setIsDrawerOpen(false)} />
      <div className={`gift-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="handle" />
        <div className="drawer-header"><span className="drawer-title">KIRIM HADIAH</span><div className="coin-panel"><span>{currentUser?.coins}</span></div></div>
        <div className="gift-list">
          {GIFTS.map(g => (
            <div key={g.id} className="gift-item" onClick={() => sendGift(g.name, g.price, g.id)}>
              <img src={`/asets/png/gift${g.id}.png`} className="gift-img"/>
              <div className="gift-price">{g.price}</div>
            </div>
          ))}
        </div>
      </div>

      <div id="gift-anim-overlay" className={giftAnim.show ? 'show' : ''}>
         <img id="gift-anim-img" src={`/asets/gif/giftvid${giftAnim.giftId}.gif`} />
      </div>
    </div>
  );
}

export default function VoiceRoomPage() {
  return <Suspense fallback={null}><VoiceRoomContent /></Suspense>;
}