'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Room, RoomEvent } from 'livekit-client';
import { showNotif } from '@/lib/ui-utils';
import './Voice.css';

const GIFTS = [
  { name: 'Love', price: 1, id: 1 }, { name: 'Daebak', price: 10, id: 2 },
  { name: 'Omoomo', price: 50, id: 3 }, { name: 'Oppa', price: 100, id: 4 },
  { name: 'Fighting', price: 2000, id: 5 }, { name: 'Saranghae', price: 5000, id: 6 },
  { name: 'Kiyowo', price: 10000, id: 7 }, { name: 'Gomawo', price: 25000, id: 8 },
  { name: 'Daesang', price: 50000, id: 9 }, { name: 'Sultan', price: 100000, id: 10 }
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
  const [topGifters, setTopGifters] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [roomSettingName, setRoomSettingName] = useState(CURRENT_ROOM_NAME);
  const [systemMessage, setSystemMessage] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [giftAnim, setGiftAnim] = useState({ show: false, giftId: 1, count: 1 });
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [isMicOn, setIsMicOn] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const lkRef = useRef<Room | null>(null);

  // FIX: Lifecycle Management
  useEffect(() => {
    document.body.classList.add('room-active');

    if (!CURRENT_ROOM_ID) {
      router.push('/voice-room');
      return;
    }
    checkUserAndInit();

    return () => {
      document.body.classList.remove('room-active');
      if (lkRef.current) {
        lkRef.current.disconnect();
      }
    };
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
    listenRealtime(profile.id, profile.username);
  };

  const fetchStage = async () => {
    const { data: stg } = await supabase.from('room_slots').select(`slot_index, profile_id, profiles (username, avatar_url, role, mic_off, level)`).eq('room_id', CURRENT_ROOM_ID).order('slot_index', { ascending: true });
    if (stg) {
      const normalized = stg.map((slot: any) => ({ 
        ...slot, 
        profiles: Array.isArray(slot.profiles) ? slot.profiles[0] : slot.profiles 
      }));
      setSlots(normalized);
      const mySlot = normalized.find((s: any) => s.profile_id === currentUser?.id);
      if (mySlot) setIsMicOn(!mySlot.profiles.mic_off);
    }
  };

  const initLiveKit = async (userId: string, username: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-livekit-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        body: JSON.stringify({ username, identity: userId, roomName: CURRENT_ROOM_ID })
      });
      const { token } = await res.json();
      const lk = new Room({ adaptiveStream: true, dynacast: true });
      lkRef.current = lk;
      lk.on(RoomEvent.ActiveSpeakersChanged, (s) => setActiveSpeakers(s.map(p => p.identity)));
      lk.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "audio") {
          const el = track.attach();
          document.body.appendChild(el);
          el.play();
        }
      });
      await lk.connect("wss://voicegrup-zxmeibkn.livekit.cloud", token);
      await lk.localParticipant.setMicrophoneEnabled(false);
    } catch (e) { console.error(lkRef.current); }
  };

  const listenRealtime = (userId: string, username: string) => {
    supabase.channel(`room_${CURRENT_ROOM_ID}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, fetchStage)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, (p) => {
        setChatMessages(prev => [...prev, p.new]);
      })
      .subscribe();
  };

  const toggleMic = async () => {
    if (!lkRef.current) return;
    const mySlot = slots.find(s => s.profile_id === currentUser?.id);
    if (!mySlot) return showNotif("Naik panggung dulu!", "warning");
    const newStatus = !isMicOn;
    await lkRef.current.localParticipant.setMicrophoneEnabled(newStatus);
    await supabase.from('profiles').update({ mic_off: !newStatus }).eq('id', currentUser.id);
    setIsMicOn(newStatus);
    setIsSidebarOpen(false);
  };

  const keluarRoom = () => {
    router.push('/voice-room');
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={keluarRoom} className="material-icons" style={{background:'none', border:'none', color:'var(--text-main)'}}>arrow_back_ios</button>
          <h1 className="room-title">{CURRENT_ROOM_NAME}</h1>
        </div>
        <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
          <span className="material-icons">menu</span>
        </button>
      </header>

      <section className="stage-container">
        {slots.map((slot, i) => {
          const user = slot.profiles;
          const isSpeaking = activeSpeakers.includes(slot.profile_id);
          return (
            <div key={i} className="speaker-item">
              <div className={`avatar ${isSpeaking ? 'speaking' : ''}`}>
                {user ? <img src={user.avatar_url || '/asets/png/profile.png'} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} /> : <span className="material-icons">add</span>}
                {user?.mic_off && <div className="mute-badge"><span className="material-icons" style={{fontSize:'12px', color:'white'}}>mic_off</span></div>}
              </div>
              <span className="name-label">{user?.username || "KOSONG"}</span>
            </div>
          )
        })}
      </section>

      <div className="chat-display">
        {chatMessages.map((m, i) => (
          <div key={i} className="msg"><b>{m.username}:</b> {m.text}</div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <footer className="footer-controls">
        <button className="btn-gift-main" onClick={() => setIsDrawerOpen(true)}><span className="material-icons">redeem</span></button>
        <div className="input-wrapper">
          <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ketik komentar..." style={{width:'100%', border:'none', background:'none', color:'var(--text-main)'}} />
        </div>
        <button className="material-icons" style={{color:'var(--primary)', border:'none', background:'none'}}>send</button>
      </footer>

      {/* OVERLAYS */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
      <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div style={{padding:'24px'}}>
           <div className="sidebar-header">
              <div className="profile-img-wrapper"><img src={currentUser?.avatar_url || '/asets/png/profile.png'} className="sidebar-profile-img" /></div>
              <h3>{currentUser?.username}</h3>
           </div>
           <div className="sidebar-menu" style={{marginTop:'30px'}}>
              <a onClick={toggleMic} style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', padding:'12px'}}>
                <span className="material-icons">{isMicOn ? 'mic' : 'mic_off'}</span> {isMicOn ? 'Matikan Mic' : 'Nyalakan Mic'}
              </a>
              <a onClick={keluarRoom} style={{color:'var(--danger)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', padding:'12px'}}>
                <span className="material-icons">logout</span> Keluar Ruangan
              </a>
           </div>
        </div>
      </aside>

      <div className={`drawer-overlay ${isDrawerOpen ? 'show' : ''}`} onClick={() => setIsDrawerOpen(false)}></div>
      <div className={`gift-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="handle"></div>
        <div className="drawer-header"><span>KIRIM HADIAH</span> <div className="coin-panel">{currentUser?.coins?.toLocaleString()}</div></div>
        <div className="gift-list" style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'12px', marginTop:'20px'}}>
           {GIFTS.slice(0,6).map(g => (
             <div key={g.id} className="gift-item" style={{display:'flex', flexDirection:'column', alignItems:'center', padding:'12px', background:'var(--panel-bg)', borderRadius:'16px'}}>
                <span style={{fontSize:'32px'}}>🎁</span>
                <span style={{color:'var(--accent)', fontWeight:800}}>{g.price}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

export default function VoiceRoomPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VoiceRoomContent />
    </Suspense>
  );
}
