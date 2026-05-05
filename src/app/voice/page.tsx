'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Room, RoomEvent } from 'livekit-client';
import { showNotif } from '@/lib/ui-utils';
import './Voice.css';

// Kumpulan kado sesuai HTML
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

  // State User & Profil
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  
  // Data State
  const [slots, setSlots] = useState<any[]>(Array(6).fill({ profile_id: null }));
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [topGifters, setTopGifters] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  
  // Modals & UI Toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Settings State
  const [roomSettingName, setRoomSettingName] = useState(CURRENT_ROOM_NAME);
  const [systemMessage, setSystemMessage] = useState("");

  // Gift State
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [giftAnim, setGiftAnim] = useState({ show: false, giftId: 1, count: 1 });

  // LiveKit (Voice) State
  const [roomLk, setRoomLk] = useState<Room | null>(null);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [isMicOn, setIsMicOn] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- INIT DATA & LIVEKIT ---
  useEffect(() => {
    if (!CURRENT_ROOM_ID) {
      router.push('/voice-room');
      return;
    }
    checkUserAndInit();
  }, [CURRENT_ROOM_ID]);

  const checkUserAndInit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (!profile) return;
    setCurrentUser(profile);

    const { data: roomData } = await supabase.from('rooms').select('owner_id, is_active, name').eq('id', CURRENT_ROOM_ID).maybeSingle();
    if (roomData) {
      if (roomData.owner_id === profile.id) {
        setIsOwner(true);
        await supabase.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID);
      } else if (!roomData.is_active) {
        showNotif("Panggung sedang tutup!", "warning");
        return router.push('/voice-room');
      }
    }

    fetchStage();
    fetchTopGifters();
    initLiveKit(profile.id, profile.username);
    listenRealtime(profile.id, profile.username, profile.level || 1);
  };

  const fetchStage = async () => {
    let { data: stg } = await supabase.from('room_slots')
      .select(`slot_index, profile_id, profiles (username, avatar_url, role, mic_off, level)`)
      .eq('room_id', CURRENT_ROOM_ID)
      .order('slot_index', { ascending: true });

    if (!stg || stg.length === 0) {
      const newSlots = Array.from({length: 6}, (_, i) => ({ room_id: CURRENT_ROOM_ID, slot_index: i, profile_id: null }));
      await supabase.from('room_slots').insert(newSlots);
      setSlots(newSlots);
    } else {
      setSlots(stg);
      // Update toggle mic status jika kita sedang di panggung
      const mySlot = stg.find(s => s.profile_id === currentUser?.id);
      if (mySlot && mySlot.profiles) {
        setIsMicOn(!mySlot.profiles.mic_off);
      }
    }
  };

  const initLiveKit = async (userId: string, username: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-livekit-token`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` 
        },
        body: JSON.stringify({ username, identity: userId, roomName: CURRENT_ROOM_ID })
      });

      const data = await response.json();
      if (!data.token) throw new Error("Token LiveKit Gagal");

      const lkRoom = new Room({ adaptiveStream: true, dynacast: true });
      
      lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setActiveSpeakers(speakers.map(s => s.identity));
      });

      lkRoom.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "audio") {
          const element = track.attach();
          document.body.appendChild(element);
          element.play().catch(() => {});
        }
      });

      await lkRoom.connect("wss://voicegrup-zxmeibkn.livekit.cloud", data.token);
      await lkRoom.localParticipant.setMicrophoneEnabled(false);
      setRoomLk(lkRoom);
    } catch (e) {
      console.error("LiveKit Error:", e);
    }
  };

  const listenRealtime = (userId: string, username: string, level: number) => {
    const roomChannel = supabase.channel(`room_active_${CURRENT_ROOM_ID}`, { config: { presence: { key: userId } } });

    roomChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => fetchStage())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (p: any) => {
        fetchStage();
        if (p.new.id === userId) {
          setCurrentUser((prev:any) => ({ ...prev, coins: p.new.coins, total_gift_sent: p.new.total_gift_sent, level: p.new.level }));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, (p: any) => {
        setChatMessages(prev => [...prev, p.new]);
        if (p.new.username === "SISTEM_GIFT") {
          const match = p.new.text.match(/^(.+) mengirim .+ x(\d+)/);
          if (match && match[1] !== username) triggerGiftAnimation(parseInt(p.new.role), parseInt(match[2]));
          fetchTopGifters();
        }
      })
      .on('presence', { event: 'sync' }, () => {
        setOnlineCount(Object.keys(roomChannel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await roomChannel.track({ online_at: new Date().toISOString(), username, level });
        }
      });
  };

  // --- AUTO SCROLL CHAT ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --- ANIMASI GIFT CONTROLLER ---
  useEffect(() => {
    if (giftAnim.show) {
      const timer = setTimeout(() => setGiftAnim(prev => ({ ...prev, show: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [giftAnim]);

  const triggerGiftAnimation = (giftId: number, count: number) => {
    setGiftAnim({ show: true, giftId, count });
  };

  // --- LOGIKA NAIK PANGGUNG & MIC ---
  const handleNaikStage = async (index: number) => {
    if (!currentUser) return showNotif("Login dulu!", "warning");
    try {
      if (roomLk && roomLk.state === "connected") await roomLk.localParticipant.setMicrophoneEnabled(true);
      
      const { data: checkSlot } = await supabase.from('room_slots').select('profile_id').match({ room_id: CURRENT_ROOM_ID, slot_index: index }).single();
      if (checkSlot && checkSlot.profile_id !== null) {
        if (roomLk) await roomLk.localParticipant.setMicrophoneEnabled(false);
        return showNotif("Kursi sudah ditempati!", "error");
      }
      
      await supabase.from('room_slots').update({ profile_id: null }).eq('profile_id', currentUser.id);
      await supabase.from('room_slots').update({ profile_id: currentUser.id }).match({ room_id: CURRENT_ROOM_ID, slot_index: index });
      await supabase.from('profiles').update({ mic_off: false }).eq('id', currentUser.id);
      setIsMicOn(true);
      fetchStage();
    } catch (e) {
      showNotif("Gagal naik panggung", "error");
    }
  };

  const mintaNaik = () => {
    const emptySlotIndex = slots.findIndex(s => !s.profile_id);
    if (emptySlotIndex !== -1) {
      handleNaikStage(emptySlotIndex);
    } else {
      showNotif("Panggung penuh!", "warning");
    }
  };

  const prosesTurunMic = async () => {
    setActiveModal(null);
    try {
      if (roomLk) await roomLk.localParticipant.setMicrophoneEnabled(false);
      await supabase.from('room_slots').update({ profile_id: null }).eq('profile_id', currentUser.id);
      await supabase.from('profiles').update({ mic_off: true }).eq('id', currentUser.id);
      setIsMicOn(false);
      fetchStage();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMic = async (e?: any) => {
    if (e) e.preventDefault();
    if (!roomLk) return showNotif("Koneksi audio belum siap", "warning");
    const mySlot = slots.find(s => s.profile_id === currentUser.id);
    if (!mySlot) return showNotif("Kamu belum naik panggung!", "warning");

    try {
      const newStatus = !isMicOn;
      await roomLk.localParticipant.setMicrophoneEnabled(newStatus);
      await supabase.from('profiles').update({ mic_off: !newStatus }).eq('id', currentUser.id);
      setIsMicOn(newStatus);
      setIsSidebarOpen(false);
      fetchStage();
    } catch (e) {
      showNotif("Gagal akses mic! Cek Izin Mikrofon.", "error");
    }
  };

  // --- LOGIKA CHAT & SETTING ---
  const kirimKomentar = async (e?: any) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;

    try {
      await supabase.from('room_messages').insert([{ 
        room_id: CURRENT_ROOM_ID, 
        username: currentUser.username, 
        text: chatInput.trim(), 
        role: currentUser.role || "user", 
        level: currentUser.level || 1 
      }]);
      setChatInput("");
    } catch (e) {
      console.error(e);
    }
  };

  const kickUser = async (targetId: string, targetName: string) => {
    if (!confirm(`Kick ${targetName}?`)) return;
    await supabase.from('room_slots').update({ profile_id: null }).match({ room_id: CURRENT_ROOM_ID, profile_id: targetId });
    await supabase.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `${targetName} dikeluarkan.` }]);
  };

  const keluarRoom = async () => {
    if (isOwner && confirm("Tutup panggung dan bersihkan riwayat? (Leaderboard akan direset)")) {
        await supabase.from('room_slots').update({ profile_id: null }).eq('room_id', CURRENT_ROOM_ID);
        await supabase.from('rooms').update({ is_active: false }).eq('id', CURRENT_ROOM_ID);
        await supabase.from('room_messages').delete().eq('room_id', CURRENT_ROOM_ID);
    }
    router.push('/voice-room');
  };

  const saveRoomSetting = async () => {
    if (!roomSettingName) return showNotif("Nama room tidak boleh kosong!", "warning");
    try {
      await supabase.from('rooms').update({ name: roomSettingName }).eq('id', CURRENT_ROOM_ID);
      if (systemMessage) {
        await supabase.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM", text: `PENGUMUMAN: ${systemMessage}`, role: "admin" }]);
      }
      setActiveModal(null);
      setSystemMessage("");
      showNotif("Perubahan disimpan", "success");
    } catch (e) {
      showNotif("Gagal simpan", "error");
    }
  };

  // --- GIFT & LEADERBOARD LOGIC ---
  const fetchTopGifters = async () => {
    const { data } = await supabase.from('profiles').select('username, avatar_url, total_gift_sent').gt('total_gift_sent', 0).order('total_gift_sent', { ascending: false }).limit(3); 
    if (data) setTopGifters(data);
  };

  const openLeaderboard = async () => {
    setActiveModal('leaderboard');
    const { data: messages } = await supabase.from('room_messages').select('text, role').eq('room_id', CURRENT_ROOM_ID).eq('username', 'SISTEM_GIFT');
    if (!messages) return;

    const hargaKado: Record<string, number> = { '1': 1, '2': 10, '3': 50, '4': 100, '5': 2000, '6': 5000, '7': 10000, '8': 25000, '9': 50000, '10': 100000 };
    let totalPerUser: Record<string, number> = {};

    messages.forEach((m: any) => {
        const match = m.text.match(/^(.+) mengirim .+ x(\d+) ke/);
        if (match) {
            const pengirim = match[1];
            const jumlah = parseInt(match[2]);
            const harga = hargaKado[m.role] || 0;
            if (!totalPerUser[pengirim]) totalPerUser[pengirim] = 0;
            totalPerUser[pengirim] += (harga * jumlah); 
        }
    });

    const namaSultan = Object.keys(totalPerUser).sort((a, b) => totalPerUser[b] - totalPerUser[a]).slice(0, 10);
    if (namaSultan.length === 0) { setLeaderboard([]); return; }

    const { data: profiles } = await supabase.from('profiles').select('username, avatar_url, level, role').in('username', namaSultan);
    if (profiles) {
      setLeaderboard(profiles.map(p => ({ ...p, room_total: totalPerUser[p.username] })).sort((a, b) => b.room_total - a.room_total));
    }
  };

  const sendGift = async (giftName: string, harga: number, giftId: number) => {
    if (!selectedTarget) return showNotif("Pilih target orangnya dulu di atas!", "warning");
    if (selectedTarget.profile_id === currentUser.id) return showNotif("Masa nyawer diri sendiri?", "warning");
    if (currentUser.coins < harga) return showNotif("Koin lo kurang Bree!", "error");

    setCurrentUser((prev:any) => ({ ...prev, coins: prev.coins - harga }));
    triggerGiftAnimation(giftId, 1);

    try {
      await supabase.rpc('transfer_gift', { sender_id: currentUser.id, receiver_id: selectedTarget.profile_id, amount: harga });
      
      await supabase.from('coin_history').insert([{
        user_id: currentUser.id, transaction_type: 'send_gift', amount: -harga,
        description: `Kirim ${giftName} ke ${selectedTarget.profiles.username}`, balance_after: currentUser.coins - harga
      }]);

      await supabase.from('room_messages').insert([{ 
        room_id: CURRENT_ROOM_ID, username: "SISTEM_GIFT", 
        text: `${currentUser.username} mengirim ${giftName} x1 ke ${selectedTarget.profiles.username}`, 
        role: giftId.toString(), level: currentUser.level 
      }]);
    } catch (e) {
      showNotif("Gagal transfer koin!", "error");
    }
  };

  // --- UI HELPERS ---
  const getLevelStyle = (level: number) => {
    if (level >= 5) return { color: "#FF0055", title: "LGDN" };
    if (level === 4) return { color: "#00E5FF", title: "SLTN" };
    if (level === 3) return { color: "#BB86FC", title: "PATRON" };
    if (level === 2) return { color: "#FFD700", title: "SPTR" };
    return { color: "inherit", title: "" };
  };

  const getUserBadge = (role: string) => {
    if (!role) return null;
    const r = role.toLowerCase();
    if (r === "admin") return <span style={{ background: '#ff4757', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', marginLeft: '4px', fontWeight: 'bold' }}>DEV</span>;
    if (r === "verified") return <span className="material-icons" style={{ color: '#1DA1F2', fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle' }}>verified</span>;
    return null;
  };

  return (
    <div className="app-container">
      {/* ================= HEADER ================= */}
      <header className="main-header">
        <div className="header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={keluarRoom} className="icon-btn-back"><span className="material-icons">arrow_back_ios_new</span></button>
            <h1 className="room-title">{CURRENT_ROOM_NAME || 'KLASIKAN NYANYI'}</h1>
          </div>
          <div className="online-status">
            <div className="online-dot"></div>
            <span className="material-icons" style={{ fontSize: '13px' }}>people</span>
            <span><b id="online-count">{onlineCount}</b> orang di room</span>
          </div>
        </div>
        
        <div className="header-right" style={{ display: 'flex', alignItems: 'center' }}>
          <div id="top-gifters-container" className="top-gifters-wrapper" onClick={openLeaderboard}>
            <span style={{ fontSize: '11px', color: '#FFD700', fontWeight: 800, marginRight: '6px', letterSpacing: '0.5px' }}>🏆 TOP</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {topGifters.map((user, i) => (
                <img key={i} src={user.avatar_url || '/asets/png/profile.png'} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${i===0?'#FFD700':i===1?'#C0C0C0':'#CD7F32'}`, marginLeft: i===0?'0':'-12px', zIndex: 3-i, position: 'relative', background: '#222', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }} />
              ))}
            </div>
          </div>
          <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <span className="material-icons" style={{ fontSize: '28px' }}>menu</span>
          </button>
        </div>
      </header>

      {/* ================= STAGE GRID ================= */}
      <section id="stage-grid" className="stage-container">
        {slots.map((slot, i) => {
          const user = slot.profiles;
          const isMe = slot.profile_id === currentUser?.id;
          const isSpeaking = activeSpeakers.includes(slot.profile_id);

          return (
            <div key={i} className={`speaker-item ${!user ? 'empty' : ''}`}>
              {user ? (
                <>
                  <div className={`avatar ${isSpeaking ? 'speaking' : ''}`} onClick={() => isMe ? setActiveModal('turun') : (isOwner && !isMe && kickUser(slot.profile_id, user.username))}>
                    <img src={user.avatar_url || '/asets/png/profile.png'} />
                    {user.mic_off && (
                      <div className="mute-badge">
                        <span className="material-icons" style={{ color: '#e74c3c', fontSize: '14px' }}>mic_off</span>
                      </div>
                    )}
                    {isOwner && !isMe && (
                      <div className="kick-btn-wrapper" style={{ display: 'none' }}>
                         <div className="kick-btn"><span className="material-icons">close</span></div>
                      </div>
                    )}
                  </div>
                  <span className="name-label" style={{ color: getLevelStyle(user.level).color }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {user.username}
                      {getUserBadge(user.role)}
                    </div>
                  </span>
                </>
              ) : (
                <>
                  <div className="avatar" onClick={() => handleNaikStage(i)}>
                    <span className="material-icons">add</span>
                  </div>
                  <span className="name-label">KOSONG</span>
                </>
              )}
            </div>
          )
        })}
      </section>

      {/* ================= CHAT BOX ================= */}
      <div id="chat-box" className="chat-display">
        <div className="msg system">
          <span className="user">SISTEM:</span> 
          Jangan gunakan kata kasar, hinaan, atau bullying dalam bentuk apa pun. Selalu jawab dengan sopan, santai, dan tetap menghargai orang lain ya!
        </div>
        {chatMessages.map(msg => {
          if (msg.username === "SISTEM_GIFT") {
             return <div key={msg.id} className="msg system-gift">🎁 {msg.text}</div>
          }
          if (msg.username.startsWith("SISTEM")) {
             return <div key={msg.id} className="msg system"><span className="user">SISTEM:</span> {msg.text.replace("SISTEM: ", "")}</div>
          }
          return (
            <div key={msg.id} className="msg">
              <span className="user" style={{ color: getLevelStyle(msg.level).color }}>{msg.username}</span>
              <span>: {msg.text}</span>
            </div>
          )
        })}
        <div ref={chatEndRef} />
      </div>

      {/* ================= FOOTER ================= */}
      <footer className="footer-controls">
        <button className="btn-gift-main" onClick={() => setIsDrawerOpen(true)}>
          <span className="material-icons">redeem</span>
        </button>
        <form className="input-wrapper" onSubmit={kirimKomentar}>
          <input type="text" id="chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ketik komentar..." autoComplete="off" />
          <button type="submit" className="btn-send">
            <span className="material-icons" style={{ fontSize: '18px', marginLeft: '3px' }}>send</span>
          </button>
        </form>
      </footer>

      {/* ================= GIFT OVERLAY ANIMATION ================= */}
      <div id="gift-anim-overlay" className={giftAnim.show ? 'show' : ''}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <img id="gift-anim-img" src={`/asets/gif/giftvid${giftAnim.giftId}.gif?t=${Date.now()}`} alt="Gift Animation" />
          <div id="gift-combo-text">
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <img src={`/asets/png/gift${giftAnim.giftId}.png`} style={{ width: '150px', height: '150px', objectFit: 'contain', filter: 'drop-shadow(3px 3px 0px #f44336)' }} />
                {giftAnim.count > 1 && <span>x{giftAnim.count}</span>}
             </div>
          </div>
        </div>
      </div>

      {/* ================= DRAWER & SIDEBAR OVERLAYS ================= */}
      <div id="drawer-overlay" className={`drawer-overlay ${isDrawerOpen ? 'show' : ''}`} onClick={() => setIsDrawerOpen(false)}></div>
      <div id="sidebar-overlay" className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      {/* ================= GIFT DRAWER ================= */}
      <div id="gift-drawer" className={`gift-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="handle"></div> 
        
        <div className="drawer-header">
          <span className="drawer-title">KIRIM HADIAH</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="coin-panel">
              <span id="user-coins">{currentUser?.coins?.toLocaleString() || 0}</span>
            </div>
            <span className="material-icons" onClick={() => setIsDrawerOpen(false)} style={{ color: '#94a3b8', fontSize: '26px', cursor: 'pointer' }}>cancel</span>
          </div>
        </div>
        
        <div className="target-selection-container">
          <span className="target-label">KIRIM KE:</span>
          <div id="gift-targets" className="target-list">
            {slots.filter(s => s.profile_id && s.profile_id !== currentUser?.id).length === 0 ? (
               <span style={{ fontSize: '12px', color: '#888', padding: '10px' }}>Cuma ada kamu disini</span>
            ) : (
               slots.filter(s => s.profile_id && s.profile_id !== currentUser?.id).map((s, index) => {
                 // Auto select first target if none selected
                 if (!selectedTarget && index === 0) setSelectedTarget(s);
                 
                 return (
                   <div key={s.profile_id} className={`target-user ${selectedTarget?.profile_id === s.profile_id ? 'selected' : ''}`} onClick={() => setSelectedTarget(s)}>
                     <img src={s.profiles.avatar_url || '/asets/png/profile.png'} className="target-avatar" />
                     <span className="target-name">{s.profiles.username}</span>
                   </div>
                 )
               })
            )}
          </div>
        </div>

        <div className="gift-list">
          {GIFTS.map(g => (
            <div key={g.id} className="gift-item" onClick={() => sendGift(g.name, g.price, g.id)}>
              <img src={`/asets/png/gift${g.id}.png`} className="gift-img" />
              <span className="gift-label">{g.name.toUpperCase()}</span>
              <span className="gift-price">{g.price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= SIDEBAR ================= */}
      <div id="sidebar" className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
          <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>
            <span className="material-icons">chevron_right</span>
          </button>
          <div className="profile-img-wrapper">
            <img src={currentUser?.avatar_url || '/asets/png/profile.png'} id="sidebar-avatar" className="sidebar-profile-img" />
          </div>
          <span id="sidebar-username">{currentUser?.username || "Username"}</span>
        </div>

        <div className="sidebar-menu">
          <a onClick={() => router.push('/data')} style={{ cursor: 'pointer' }}>
            <div className="menu-icon-box"><span className="material-icons">person</span></div>
            <span>Profil</span>
          </a>
          
          <a onClick={toggleMic} style={{ cursor: 'pointer' }}>
            <div className="menu-icon-box"><span className="material-icons" id="mic-icon">{isMicOn ? "mic" : "mic_off"}</span></div>
            <span id="mic-text">{isMicOn ? "Matikan Mic" : "Nyalakan Mic"}</span>
          </a>
          
          {isOwner && (
            <a onClick={() => { setIsSidebarOpen(false); setActiveModal('setting'); }} style={{ cursor: 'pointer' }}>
              <div className="menu-icon-box"><span className="material-icons">settings</span></div>
              <span>Room Settings</span>
            </a>
          )}
          
          <div className="menu-divider"></div>

          <a onClick={keluarRoom} className="logout-item" style={{ cursor: 'pointer' }}>
            <div className="menu-icon-box logout-box"><span className="material-icons">logout</span></div>
            <span>Keluar Ruangan</span>
          </a>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      <div className={`modal-overlay ${activeModal ? 'show' : ''}`} onClick={() => setActiveModal(null)}>
        {/* ROOM SETTINGS MODAL */}
        {activeModal === 'setting' && (
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ Room Settings</h3>
              <button className="close-modal" onClick={() => setActiveModal(null)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <label>Nama Room Baru</label>
              <input type="text" value={roomSettingName} onChange={e => setRoomSettingName(e.target.value)} placeholder="Contoh: Klasikan Galau..." />
              <label>Pesan Sistem (Broadcast ke Chat)</label>
              <textarea value={systemMessage} onChange={e => setSystemMessage(e.target.value)} placeholder="Tulis pesan pengumuman..."></textarea>
              <button className="btn-save-setting" onClick={saveRoomSetting}>SIMPAN PERUBAHAN</button>
            </div>
          </div>
        )}

        {/* CONFIRM MIC DROP MODAL */}
        {activeModal === 'turun' && (
          <div className="modal-box modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon-wrapper">
              <span className="material-icons">mic_off</span>
            </div>
            <h3>Turun Panggung?</h3>
            <p>Yakin mau turun dari panggung sekarang? Mic kamu akan otomatis dimatikan.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setActiveModal(null)}>BATAL</button>
              <button className="btn-danger" onClick={prosesTurunMic}>YAKIN</button>
            </div>
          </div>
        )}

        {/* LEADERBOARD (THE SULTAN) MODAL */}
        {activeModal === 'leaderboard' && (
          <div className="modal-box modal-leaderboard" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="gold-title">🏆 THE SULTAN</h3>
              <button className="close-modal" onClick={() => setActiveModal(null)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div id="top-gifters-list" className="leaderboard-list">
              {leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Belum ada kado di panggung ini.</div>
              ) : (
                leaderboard.map((u, index) => {
                  let rankHtml = <div style={{ color: '#94a3b8', fontWeight: 900, fontSize: '16px', width: '28px', textAlign: 'center' }}>{index + 1}</div>;
                  if (index === 0) rankHtml = <div style={{ background: 'linear-gradient(135deg, #FFDF00, #D4AF37)', color: '#000', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 900, fontSize: '15px', boxShadow: '0 2px 8px rgba(255,215,0,0.5)' }}>1</div>;
                  if (index === 1) rankHtml = <div style={{ background: 'linear-gradient(135deg, #FFFFFF, #A9A9A9)', color: '#000', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 900, fontSize: '15px', boxShadow: '0 2px 8px rgba(192,192,192,0.3)' }}>2</div>;
                  if (index === 2) rankHtml = <div style={{ background: 'linear-gradient(135deg, #FFB37C, #C56F28)', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 900, fontSize: '15px', boxShadow: '0 2px 8px rgba(205,127,50,0.3)' }}>3</div>;
                  
                  const bgGradient = index === 0 ? 'background: linear-gradient(90deg, rgba(255, 215, 0, 0.15), transparent); border-left: 4px solid #FFD700;' : 
                                     index === 1 ? 'background: linear-gradient(90deg, rgba(192, 192, 192, 0.1), transparent); border-left: 4px solid #C0C0C0;' : 
                                     index === 2 ? 'background: linear-gradient(90deg, rgba(205, 127, 50, 0.1), transparent); border-left: 4px solid #CD7F32;' : 
                                     'background: #2a3648; border-left: 4px solid transparent;';
                                     
                  return (
                    <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '6px', cssText: bgGradient } as React.CSSProperties}>
                        <div style={{ width: '30px', display: 'flex', justifyContent: 'center' }}>{rankHtml}</div>
                        <img src={u.avatar_url || '/asets/png/profile.png'} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #555' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div onClick={() => router.push(`/data?username=${encodeURIComponent(u.username)}`)} style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                {u.username} 
                                <span style={{ color: getLevelStyle(u.level).color, fontSize: '9px', background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '3px', marginLeft: '5px' }}>{getLevelStyle(u.level).title}</span>
                                {getUserBadge(u.role)}
                            </div>
                            <div style={{ color: '#FFD700', fontSize: '12px', marginTop: '2px', fontWeight: 600 }}>
                                 {(u.room_total || 0).toLocaleString()} koin
                            </div>
                        </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// BUNGKUS KOMPONEN UTAMA DENGAN SUSPENSE
export default function VoiceRoomPage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-main)' }}>Memuat Panggung...</div>}>
      <VoiceRoomContent />
    </Suspense>
  );
}