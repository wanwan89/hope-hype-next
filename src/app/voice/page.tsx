'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Room, RoomEvent } from 'livekit-client';
import { showNotif } from '@/lib/ui-utils';
import './Voice.css'; // Sesuaikan jika nama file css beda

export default function VoiceRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // FIX-NYA DI SINI BREE 👇 (Tambahin tanda ?)
  const CURRENT_ROOM_ID = searchParams?.get('id');
  const CURRENT_ROOM_NAME = searchParams?.get('name') || "Voice Room";

  // --- STATE USER & ROOM ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [slots, setSlots] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  
  // --- STATE MODAL & SIDEBAR ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [roomSettingName, setRoomSettingName] = useState(CURRENT_ROOM_NAME);

  // --- STATE GIFT & LEADERBOARD ---
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [topGifters, setTopGifters] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // --- STATE LIVEKIT (VOICE) ---
  const [roomLk, setRoomLk] = useState<Room | null>(null);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [isMicOn, setIsMicOn] = useState(false);

  // Ref untuk Chat Auto-scroll
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Ref untuk Gift Combo (Anti-Spam State)
  const comboRef = useRef({ activeCombos: {} as any, giftAnimTimer: null as any });

  // --- 1. INIT APLIKASI ---
  useEffect(() => {
    if (!CURRENT_ROOM_ID) {
      router.push('/voice-room');
      return;
    }
    checkUserAndInit();
  }, [CURRENT_ROOM_ID]);

  // --- 2. CHECK USER & LOAD INIT DATA ---
  const checkUserAndInit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (!profile) return;
    setCurrentUser(profile);

    const { data: roomData } = await supabase.from('rooms').select('owner_id, is_active').eq('id', CURRENT_ROOM_ID).maybeSingle();
    if (roomData) {
      if (roomData.owner_id === profile.id) {
        setIsOwner(true);
        await supabase.from('rooms').update({ is_active: true }).eq('id', CURRENT_ROOM_ID);
      } else if (!roomData.is_active) {
        showNotif("Panggung sedang tutup!", "warning");
        router.push('/voice-room');
        return;
      }
    }

    fetchStage();
    fetchTopGifters();
    initLiveKit(profile.id, profile.username);
    listenRealtime(profile.id, profile.username, profile.level || 1);
  };

  // --- 3. LOGIKA STAGE (PANGGUNG) ---
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
    }
  };

  // --- 4. LIVEKIT CONNECTION ---
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
        const activeIds = speakers.map(s => s.identity);
        setActiveSpeakers(activeIds);
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

  // --- 5. REALTIME LISTENER (SUPABASE) ---
  const listenRealtime = (userId: string, username: string, level: number) => {
    const roomChannel = supabase.channel(`room_active_${CURRENT_ROOM_ID}`, { config: { presence: { key: userId } } });

    roomChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_slots', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, () => fetchStage())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (p: any) => {
        fetchStage();
        if (p.new.id === userId) setCurrentUser((prev:any) => ({ ...prev, coins: p.new.coins, total_gift_sent: p.new.total_gift_sent, level: p.new.level }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${CURRENT_ROOM_ID}` }, (p: any) => {
        setChatMessages(prev => [...prev, p.new]);
        
        if (p.new.username === "SISTEM_GIFT") {
          const match = p.new.text.match(/^(.+) mengirim .+ x(\d+) ke/);
          if (match && match[1] !== username) playGiftAnimation(parseInt(p.new.role), parseInt(match[2]));
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

  // --- 6. AUTO SCROLL CHAT ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --- 7. LOGIKA NAIK/TURUN MIC ---
  const handleNaikStage = async (index: number) => {
    if (!currentUser) return showNotif("Login dulu!", "warning");
    try {
      if (roomLk && roomLk.state === "connected") await roomLk.localParticipant.setMicrophoneEnabled(true);
      
      const { data: checkSlot } = await supabase.from('room_slots').select('profile_id').match({ room_id: CURRENT_ROOM_ID, slot_index: index }).single();
      if (checkSlot && checkSlot.profile_id !== null) {
        if (roomLk) await roomLk.localParticipant.setMicrophoneEnabled(false);
        return showNotif("Kursi penuh!", "error");
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

  // FIX: Fungsi mintaNaik yang hilang ditambahkan di sini
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

  const toggleMic = async () => {
    if (!roomLk) return showNotif("Koneksi belum siap", "warning");
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
      showNotif("Gagal akses mic", "error");
    }
  };

  // --- 8. LOGIKA CHAT & KICK ---
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
    if (isOwner && confirm("Tutup panggung dan bersihkan riwayat?")) {
        await supabase.from('room_slots').update({ profile_id: null }).eq('room_id', CURRENT_ROOM_ID);
        await supabase.from('rooms').update({ is_active: false }).eq('id', CURRENT_ROOM_ID);
        await supabase.from('room_messages').delete().eq('room_id', CURRENT_ROOM_ID);
    }
    router.push('/voice-room');
  };

  // --- 9. TOP GIFTER & LEADERBOARD ---
  const fetchTopGifters = async () => {
    const { data } = await supabase.from('profiles').select('username, avatar_url, total_gift_sent').gt('total_gift_sent', 0).order('total_gift_sent', { ascending: false }).limit(3); 
    if (data) setTopGifters(data);
  };

  const getRoomLeaderboard = async () => {
    const { data: messages } = await supabase.from('room_messages').select('text, role').eq('room_id', CURRENT_ROOM_ID).eq('username', 'SISTEM_GIFT');
    if (!messages) return;

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
    if (namaSultan.length === 0) { setLeaderboard([]); return; }

    const { data: profiles } = await supabase.from('profiles').select('username, avatar_url, level, role').in('username', namaSultan);
    if (profiles) {
      setLeaderboard(profiles.map(p => ({ ...p, room_total: totalPerUser[p.username] })).sort((a, b) => b.room_total - a.room_total));
    }
  };

  const openLeaderboard = () => {
    getRoomLeaderboard();
    setActiveModal('leaderboard');
  };

  // --- 10. SYSTEM GIFTING (DISEDERHANAKAN UNTUK REACT) ---
  const playGiftAnimation = (giftId: number, forcedCombo: number | null = null) => {
    // Fungsi ini bisa dibuat merender overlay khusus di React, 
    // tapi karena panjang, kita simpan logikanya dalam State khusus atau biarkan terpisah.
    // (Bisa gunakan komponen modal transparan untuk animasinya)
  };

  const sendGift = async (giftName: string, harga: number, giftId: number) => {
    if (!selectedTarget) return showNotif("Pilih target!", "warning");
    if (selectedTarget.profile_id === currentUser.id) return showNotif("Gak bisa gift diri sendiri!", "error");

    if (currentUser.coins < harga) return showNotif("Koin lo kurang Bree!", "error");

    // Instan UI update
    setCurrentUser((prev:any) => ({ ...prev, coins: prev.coins - harga }));

    try {
      // Potong koin
      await supabase.rpc('transfer_gift', { sender_id: currentUser.id, receiver_id: selectedTarget.profile_id, amount: harga });
      
      // Catat History
      await supabase.from('coin_history').insert([{
        user_id: currentUser.id, transaction_type: 'send_gift', amount: -harga,
        description: `Kirim ${giftName} ke ${selectedTarget.profiles.username}`, balance_after: currentUser.coins - harga
      }]);

      await supabase.from('room_messages').insert([{ 
        room_id: CURRENT_ROOM_ID, username: "SISTEM_GIFT", 
        text: `${currentUser.username} mengirim ${giftName} x1 ke ${selectedTarget.profiles.username}`, 
        role: giftId.toString(), level: currentUser.level 
      }]);

      playGiftAnimation(giftId, 1);
    } catch (e) {
      showNotif("Gagal kirim gift", "error");
    }
  };

  // --- HELPERS BUBBLES ---
  const getLevelStyle = (level: number) => {
    if (level >= 5) return { color: "#FF0055", textShadow: "0 0 8px rgba(255, 0, 85, 0.8)", title: "LGDN" };
    if (level === 4) return { color: "#00E5FF", textShadow: "0 0 5px rgba(0, 229, 255, 0.7)", title: "SLTN" };
    if (level === 3) return { color: "#BB86FC", textShadow: "none", title: "PATRON" };
    if (level === 2) return { color: "#FFD700", textShadow: "none", title: "SPTR" };
    return { color: "inherit", textShadow: "none", title: "" };
  };

  return (
    <div className="app-container">
      {/* --- HEADER --- */}
      <header className="room-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--panel-bg)', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={keluarRoom} className="icon-btn"><span className="material-icons">arrow_back</span></button>
          <div>
            <h3 className="room-title">{CURRENT_ROOM_NAME}</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{onlineCount} Online</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
           {isOwner && <button onClick={() => setActiveModal('setting')} className="icon-btn"><span className="material-icons">settings</span></button>}
           <button onClick={() => setIsSidebarOpen(true)} className="icon-btn"><span className="material-icons">menu</span></button>
        </div>
      </header>

      {/* --- TOP GIFTERS --- */}
      <div id="top-gifters-container" onClick={openLeaderboard} style={{ display: 'flex', padding: '8px 16px', cursor: 'pointer' }}>
        <span style={{ fontSize: '11px', color: '#FFD700', fontWeight: 800, marginRight: '6px' }}>🏆 TOP</span>
        <div style={{ display: 'flex' }}>
          {topGifters.map((user, i) => (
             <img key={i} src={user.avatar_url} style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${i===0?'#FFD700':i===1?'#C0C0C0':'#CD7F32'}`, marginLeft: i===0?'0':'-12px', zIndex: 3-i }} />
          ))}
        </div>
      </div>

      {/* --- STAGE GRID --- */}
      <div id="stage-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', padding: '20px' }}>
        {slots.map((slot, i) => {
          const user = slot.profiles;
          const isMe = slot.profile_id === currentUser?.id;
          const isSpeaking = activeSpeakers.includes(slot.profile_id);

          return (
            <div key={i} className="speaker-item" style={{ textAlign: 'center' }}>
              {user ? (
                <>
                  <div className={`avatar ${isMe ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`} onClick={() => isMe ? setActiveModal('turun') : (isOwner && !isMe && kickUser(slot.profile_id, user.username))} style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto' }}>
                    <img src={user.avatar_url || '/asets/png/profile.png'} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}/>
                    {user.mic_off && <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', padding: '2px' }}><span className="material-icons" style={{ color: '#e74c3c', fontSize: '14px' }}>mic_off</span></div>}
                  </div>
                  <span style={{ color: getLevelStyle(user.level).color, fontWeight: 'bold', fontSize: '12px' }}>{user.username}</span>
                </>
              ) : (
                <div className="avatar" onClick={() => handleNaikStage(i)} style={{ width: '60px', height: '60px', margin: '0 auto', background: 'var(--empty-slot)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-icons" style={{ color: '#444' }}>add</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* --- CHAT BOX --- */}
      <div id="chat-box" style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {chatMessages.map(msg => {
          const isGift = msg.username === "SISTEM_GIFT";
          const isSys = msg.username === "SISTEM";
          
          if (isGift) return <div key={msg.id} className="msg system-gift"><span>🎁 {msg.text}</span></div>
          if (isSys) return <div key={msg.id} className="msg system"><span>{msg.text}</span></div>

          return (
            <div key={msg.id} className="msg">
              <span style={{ color: getLevelStyle(msg.level).color, fontWeight: 'bold' }}>{msg.username}</span>
              <span>: {msg.text}</span>
            </div>
          )
        })}
        <div ref={chatEndRef} />
      </div>

      {/* --- BOTTOM ACTION BAR --- */}
      <div className="action-bar" style={{ display: 'flex', padding: '10px', background: 'var(--panel-bg)', gap: '10px' }}>
        <button className="icon-btn" onClick={() => setIsDrawerOpen(true)}><span className="material-icons">card_giftcard</span></button>
        <form onSubmit={kirimKomentar} style={{ flex: 1, display: 'flex' }}>
          <input id="chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)} type="text" placeholder="Ngobrol santuy..." style={{ flex: 1, borderRadius: '20px', padding: '10px 15px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-main)' }} />
        </form>
        <button className="icon-btn" onClick={mintaNaik}><span className="material-icons">pan_tool</span></button>
      </div>

      {/* --- GIFT DRAWER (SLIDE UP) --- */}
      <div className={`gift-drawer ${isDrawerOpen ? 'open' : ''}`} style={{ position: 'fixed', bottom: 0, left: '50%', transform: isDrawerOpen ? 'translate(-50%, 0)' : 'translate(-50%, 100%)', width: '100%', maxWidth: '480px', background: 'var(--panel-bg)', transition: 'transform 0.3s', zIndex: 1000, padding: '20px', borderRadius: '20px 20px 0 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3>Kirim Kado</h3>
          <span className="material-icons" onClick={() => setIsDrawerOpen(false)}>close</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '15px' }}>
          {slots.filter(s => s.profile_id && s.profile_id !== currentUser?.id).map(s => (
            <div key={s.profile_id} onClick={() => setSelectedTarget(s)} style={{ textAlign: 'center', opacity: selectedTarget?.profile_id === s.profile_id ? 1 : 0.5 }}>
              <img src={s.profiles.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }}/>
              <div style={{ fontSize: '10px' }}>{s.profiles.username}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
           <button onClick={() => sendGift("Mawar", 1, 1)}>Mawar (1)</button>
           <button onClick={() => sendGift("Kopi", 10, 2)}>Kopi (10)</button>
           <button onClick={() => sendGift("Love", 50, 3)}>Love (50)</button>
           <button onClick={() => sendGift("Mahkota", 100, 4)}>Mahkota (100)</button>
        </div>
      </div>

      {/* --- SIDEBAR MENU --- */}
      <div className={`sidebar ${isSidebarOpen ? 'active' : ''}`} style={{ position: 'fixed', top: 0, bottom: 0, left: 0, width: '250px', background: 'var(--panel-bg)', transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s', zIndex: 2000, padding: '20px' }}>
         <h3>Menu Panggung</h3>
         <button onClick={toggleMic} style={{ width: '100%', padding: '10px', marginTop: '20px' }}>
           {isMicOn ? "Matikan Mic" : "Nyalakan Mic"}
         </button>
         <button onClick={() => setIsSidebarOpen(false)} style={{ width: '100%', padding: '10px', marginTop: '10px' }}>Tutup Menu</button>
      </div>

      {/* --- MODAL CONFIRM TURUN MIC --- */}
      {activeModal === 'turun' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justify: 'center', zIndex: 3000 }}>
           <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
             <h3>Turun dari Panggung?</h3>
             <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
               <button onClick={() => setActiveModal(null)} style={{ flex: 1, padding: '10px' }}>Batal</button>
               <button onClick={prosesTurunMic} style={{ flex: 1, padding: '10px', background: 'var(--danger)', color: 'white' }}>Turun</button>
             </div>
           </div>
        </div>
      )}

      {/* --- MODAL LEADERBOARD KADO --- */}
      {activeModal === 'leaderboard' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justify: 'center', zIndex: 3000 }}>
           <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '15px', width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
             <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>THE SULTAN</h3>
             {leaderboard.length === 0 ? <p style={{ textAlign: 'center' }}>Belum ada kado.</p> : leaderboard.map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '25px', textAlign: 'center', fontWeight: 'bold' }}>{i + 1}</div>
                  <img src={u.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>{u.username}</div>
                    <div style={{ fontSize: '12px', color: 'var(--accent)' }}>{u.room_total.toLocaleString()} Koin</div>
                  </div>
                </div>
             ))}
             <button onClick={() => setActiveModal(null)} style={{ width: '100%', padding: '10px', marginTop: '20px' }}>Tutup</button>
           </div>
        </div>
      )}

    </div>
  );
}
