'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Room, RoomEvent } from 'livekit-client';
import { showNotif } from '@/lib/ui-utils';
import './Voice.css'; 

function VoiceRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const CURRENT_ROOM_ID = searchParams?.get('id');
  const CURRENT_ROOM_NAME = searchParams?.get('name') || "Voice Room";

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [slots, setSlots] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [topGifters, setTopGifters] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [roomLk, setRoomLk] = useState<Room | null>(null);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [isMicOn, setIsMicOn] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CURRENT_ROOM_ID) return router.push('/voice-room');
    checkUserAndInit();
  }, [CURRENT_ROOM_ID]);

  const checkUserAndInit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');

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
        return router.push('/voice-room');
      }
    }

    fetchStage();
    fetchTopGifters();
    initLiveKit(profile.id, profile.username);
    listenRealtime(profile.id, profile.username, profile.level || 1);
  };

  const fetchStage = async () => {
    let { data: stg } = await supabase.from('room_slots').select(`slot_index, profile_id, profiles (username, avatar_url, role, mic_off, level)`).eq('room_id', CURRENT_ROOM_ID).order('slot_index', { ascending: true });
    if (!stg || stg.length === 0) {
      const newSlots = Array.from({length: 6}, (_, i) => ({ room_id: CURRENT_ROOM_ID, slot_index: i, profile_id: null }));
      await supabase.from('room_slots').insert(newSlots);
      setSlots(newSlots);
    } else {
      setSlots(stg);
    }
  };

  const initLiveKit = async (userId: string, username: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-livekit-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ username, identity: userId, roomName: CURRENT_ROOM_ID })
      });
      const data = await response.json();
      if (!data.token) throw new Error("Token LiveKit Gagal");

      const lkRoom = new Room({ adaptiveStream: true, dynacast: true });
      lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => setActiveSpeakers(speakers.map(s => s.identity)));
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
    } catch (e) { console.error("LiveKit Error:", e); }
  };

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
        if (p.new.username === "SISTEM_GIFT") fetchTopGifters();
      })
      .on('presence', { event: 'sync' }, () => setOnlineCount(Object.keys(roomChannel.presenceState()).length))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await roomChannel.track({ online_at: new Date().toISOString(), username, level });
      });
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

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
      setIsMicOn(true); fetchStage();
    } catch (e) { showNotif("Gagal naik", "error"); }
  };

  const mintaNaik = () => {
    const emptySlotIndex = slots.findIndex(s => !s.profile_id);
    if (emptySlotIndex !== -1) handleNaikStage(emptySlotIndex); else showNotif("Panggung penuh!", "warning");
  };

  const prosesTurunMic = async () => {
    setActiveModal(null);
    try {
      if (roomLk) await roomLk.localParticipant.setMicrophoneEnabled(false);
      await supabase.from('room_slots').update({ profile_id: null }).eq('profile_id', currentUser.id);
      await supabase.from('profiles').update({ mic_off: true }).eq('id', currentUser.id);
      setIsMicOn(false); fetchStage();
    } catch (e) {}
  };

  const toggleMic = async () => {
    if (!roomLk) return showNotif("Koneksi belum siap", "warning");
    const mySlot = slots.find(s => s.profile_id === currentUser.id);
    if (!mySlot) return showNotif("Kamu belum naik panggung!", "warning");
    try {
      const newStatus = !isMicOn;
      await roomLk.localParticipant.setMicrophoneEnabled(newStatus);
      await supabase.from('profiles').update({ mic_off: !newStatus }).eq('id', currentUser.id);
      setIsMicOn(newStatus); setIsSidebarOpen(false); fetchStage();
    } catch (e) { showNotif("Gagal akses mic", "error"); }
  };

  const kirimKomentar = async (e?: any) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;
    try {
      await supabase.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: currentUser.username, text: chatInput.trim(), role: currentUser.role || "user", level: currentUser.level || 1 }]);
      setChatInput("");
    } catch (e) {}
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

  const fetchTopGifters = async () => {
    const { data } = await supabase.from('profiles').select('username, avatar_url, total_gift_sent').gt('total_gift_sent', 0).order('total_gift_sent', { ascending: false }).limit(3); 
    if (data) setTopGifters(data);
  };

  const openLeaderboard = async () => {
    const { data: messages } = await supabase.from('room_messages').select('text, role').eq('room_id', CURRENT_ROOM_ID).eq('username', 'SISTEM_GIFT');
    if (!messages) return;
    const hargaKado: Record<string, number> = { '1': 1, '2': 10, '3': 50, '4': 100, '5': 2000 };
    let totalPerUser: Record<string, number> = {};
    messages.forEach((m: any) => {
        const match = m.text.match(/^(.+) mengirim .+ x(\d+)/);
        if (match) totalPerUser[match[1]] = (totalPerUser[match[1]] || 0) + ((hargaKado[m.role] || 0) * parseInt(match[2])); 
    });
    const namaSultan = Object.keys(totalPerUser).sort((a, b) => totalPerUser[b] - totalPerUser[a]).slice(0, 10);
    if (namaSultan.length === 0) { setLeaderboard([]); setActiveModal('leaderboard'); return; }
    const { data: profiles } = await supabase.from('profiles').select('username, avatar_url, level, role').in('username', namaSultan);
    if (profiles) setLeaderboard(profiles.map(p => ({ ...p, room_total: totalPerUser[p.username] })).sort((a, b) => b.room_total - a.room_total));
    setActiveModal('leaderboard');
  };

  const sendGift = async (giftName: string, harga: number, giftId: number) => {
    if (!selectedTarget) return showNotif("Pilih target!", "warning");
    if (selectedTarget.profile_id === currentUser.id) return showNotif("Gak bisa gift diri sendiri!", "error");
    if (currentUser.coins < harga) return showNotif("Koin lo kurang Bree!", "error");
    setCurrentUser((prev:any) => ({ ...prev, coins: prev.coins - harga }));
    try {
      await supabase.rpc('transfer_gift', { sender_id: currentUser.id, receiver_id: selectedTarget.profile_id, amount: harga });
      await supabase.from('coin_history').insert([{ user_id: currentUser.id, transaction_type: 'send_gift', amount: -harga, description: `Kirim ${giftName} ke ${selectedTarget.profiles.username}`, balance_after: currentUser.coins - harga }]);
      await supabase.from('room_messages').insert([{ room_id: CURRENT_ROOM_ID, username: "SISTEM_GIFT", text: `${currentUser.username} mengirim ${giftName} x1 ke ${selectedTarget.profiles.username}`, role: giftId.toString(), level: currentUser.level }]);
    } catch (e) { showNotif("Gagal kirim gift", "error"); }
  };

  const getLevelStyle = (level: number) => {
    if (level >= 5) return { color: "#ef4444" };
    if (level === 4) return { color: "#3b82f6" };
    if (level === 3) return { color: "#a855f7" };
    if (level === 2) return { color: "#f59e0b" };
    return { color: "inherit" };
  };

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="room-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={keluarRoom} className="icon-btn"><span className="material-icons">arrow_back</span></button>
          <div>
            <h3 className="room-title">{CURRENT_ROOM_NAME}</h3>
            <span className="room-subtitle">{onlineCount} Online</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
           {isOwner && <button onClick={() => setActiveModal('setting')} className="icon-btn"><span className="material-icons">settings</span></button>}
           <button onClick={() => setIsSidebarOpen(true)} className="icon-btn"><span className="material-icons">menu</span></button>
        </div>
      </header>

      {/* STAGE GRID */}
      <div className="stage-grid">
        {slots.map((slot, i) => {
          const user = slot.profiles;
          const isMe = slot.profile_id === currentUser?.id;
          const isSpeaking = activeSpeakers.includes(slot.profile_id);
          return (
            <div key={i} className="speaker-item">
              {user ? (
                <>
                  <div className={`avatar-wrapper ${isMe ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`} onClick={() => isMe ? setActiveModal('turun') : (isOwner && !isMe && kickUser(slot.profile_id, user.username))}>
                    <img src={user.avatar_url || '/asets/png/profile.png'} />
                    {user.mic_off && <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'rgba(0,0,0,0.8)', borderRadius: '50%', padding: '4px' }}><span className="material-icons" style={{ color: '#ef4444', fontSize: '14px' }}>mic_off</span></div>}
                  </div>
                  <span className="speaker-name" style={{ color: getLevelStyle(user.level).color }}>{user.username}</span>
                </>
              ) : (
                <div className="avatar-wrapper" onClick={() => handleNaikStage(i)}>
                  <span className="material-icons empty-icon">add</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* CHAT BOX */}
      <div className="chat-box">
        {chatMessages.map(msg => {
          if (msg.username === "SISTEM_GIFT") return <div key={msg.id} className="msg system-gift">🎁 {msg.text}</div>
          if (msg.username === "SISTEM") return <div key={msg.id} className="msg system">{msg.text}</div>
          return (
            <div key={msg.id} className="msg">
              <span style={{ color: getLevelStyle(msg.level).color, fontWeight: '800' }}>{msg.username}</span>
              <span style={{ fontWeight: '500' }}>: {msg.text}</span>
            </div>
          )
        })}
        <div ref={chatEndRef} />
      </div>

      {/* ACTION BAR */}
      <div className="action-bar">
        <button className="icon-btn primary" onClick={() => setIsDrawerOpen(true)}><span className="material-icons">card_giftcard</span></button>
        <form onSubmit={kirimKomentar} style={{ flex: 1, display: 'flex' }}>
          <input className="chat-input" id="chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)} type="text" placeholder="Ngobrol santuy..." />
        </form>
        <button className="icon-btn secondary" onClick={mintaNaik}><span className="material-icons">front_hand</span></button>
      </div>

      {/* OVERLAY & LACI KADO */}
      {(isDrawerOpen || isSidebarOpen) && <div className="overlay" onClick={() => { setIsDrawerOpen(false); setIsSidebarOpen(false); }}></div>}
      
      <div className={`gift-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3>Kirim Kado</h3>
          <span className="material-icons" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsDrawerOpen(false)}>close</span>
        </div>
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '10px' }}>
          {slots.filter(s => s.profile_id && s.profile_id !== currentUser?.id).map(s => (
            <div key={s.profile_id} className={`target-user ${selectedTarget?.profile_id === s.profile_id ? 'selected' : ''}`} onClick={() => setSelectedTarget(s)}>
              <img src={s.profiles.avatar_url} />
              <span>{s.profiles.username}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
           <button className="gift-btn" onClick={() => sendGift("Mawar", 1, 1)}>Mawar<br/>(1)</button>
           <button className="gift-btn" onClick={() => sendGift("Kopi", 10, 2)}>Kopi<br/>(10)</button>
           <button className="gift-btn" onClick={() => sendGift("Love", 50, 3)}>Love<br/>(50)</button>
           <button className="gift-btn" onClick={() => sendGift("Mahkota", 100, 4)}>Mahkota<br/>(100)</button>
        </div>
      </div>

      {/* SIDEBAR MENU */}
      <div className={`sidebar ${isSidebarOpen ? 'active open' : ''}`}>
         <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Menu Panggung</h3>
         <div onClick={() => { openLeaderboard(); setIsSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--empty-slot)', borderRadius: '16px', cursor: 'pointer', transition: '0.2s' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent)' }}>🏆 Top Gifter</span>
            <div style={{ display: 'flex' }}>
              {topGifters.map((user, i) => (
                 <img key={i} src={user.avatar_url} style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${i===0?'#f59e0b':i===1?'#94a3b8':'#b45309'}`, marginLeft: i===0?'0':'-12px', zIndex: 3-i, objectFit: 'cover' }} />
              ))}
            </div>
         </div>
         <button className="btn-secondary" onClick={toggleMic} style={{ marginTop: '24px', background: isMicOn ? 'var(--danger)' : 'var(--success)', color: 'white' }}>
           {isMicOn ? "Matikan Mic" : "Nyalakan Mic"}
         </button>
      </div>

      {/* MODAL TURUN & LEADERBOARD */}
      {activeModal && (
        <div className="overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-box">
             {activeModal === 'turun' ? (
                <>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Turun dari Panggung?</h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-secondary" onClick={() => setActiveModal(null)}>Batal</button>
                    <button className="btn-primary" onClick={prosesTurunMic}>Turun</button>
                  </div>
                </>
             ) : (
                <>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)', marginBottom: '20px' }}>🏆 THE SULTAN</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {leaderboard.length === 0 ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Belum ada kado.</p> : leaderboard.map((u, i) => (
                       <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--empty-slot)', borderRadius: '16px' }}>
                         <div style={{ width: '24px', fontWeight: 800, color: i<3 ? 'var(--accent)' : 'var(--text-muted)' }}>#{i + 1}</div>
                         <img src={u.avatar_url} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                         <div style={{ textAlign: 'left', flex: 1 }}>
                           <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>{u.username}</div>
                           <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700 }}>{u.room_total.toLocaleString()} Koin</div>
                         </div>
                       </div>
                    ))}
                  </div>
                  <button className="btn-secondary" onClick={() => setActiveModal(null)} style={{ marginTop: '24px' }}>Tutup</button>
                </>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function VoiceRoomPage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 700 }}>Memuat Panggung...</div>}>
      <VoiceRoomContent />
    </Suspense>
  );
}
