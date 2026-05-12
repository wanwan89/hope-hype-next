'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif, getUserBadge } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble, { ChatSkeleton } from './MessageBubble';
import './ChatArea.css';

export default function ChatArea() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const fromId = searchParams?.get('from');
  const groupId = searchParams?.get('group');

  const [roomId, setRoomId] = useState('room-1');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);

  const [headerInfo, setHeaderInfo] = useState({ title: 'HopeTalk Globe', sub: '', avatar: '', role: 'user' });
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetLastSeen, setTargetLastSeen] = useState<string | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUser, setTypingUser] = useState<{ username: string; avatar_url: string } | null>(null);

  const [replyTo, setReplyTo] = useState<any>(null);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [stickers, setStickers] = useState<any[]>([]);

  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editMessageId, setEditMessageId] = useState<any>(null);
  const [relation, setRelation] = useState({ iFollowThem: false, theyFollowMe: false });

  // VN states
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);

  const isRecordingRef = useRef(false);
  const vnTouchStartX = useRef(0);
  const vnIsCanceled = useRef(false);

  const [lightboxSticker, setLightboxSticker] = useState<string | null>(null);

  const refs = {
    scroll: useRef<HTMLDivElement>(null),
    msgChannel: useRef<any>(null),
    presenceChannel: useRef<any>(null),
    audio: useRef<{ send: HTMLAudioElement; receive: HTMLAudioElement } | null>(null),
    mediaRecorder: useRef<MediaRecorder | null>(null),
    audioChunks: useRef<Blob[]>([]),
    recordTimer: useRef<any>(null),
    audioCtx: useRef<AudioContext | null>(null),
    animFrame: useRef<number | null>(null),
  };

  useEffect(() => {
    initApp();
    return () => cleanup();
  }, [fromId, groupId]);

  const initApp = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    setCurrentUser(session.user);

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    setMyProfile(prof);

    refs.audio.current = {
      send: new Audio('/asets/sound/send.mp3'),
      receive: new Audio('/asets/sound/receive.mp3'),
    };

    // Load stickers
    fetchStickers();

    let currentRoom = 'room-1';
    if (groupId) {
      currentRoom = `group_${groupId}`;
      const { data: gData } = await supabase.from('groups').select('*').eq('id', groupId).single();
      if (gData)
        setHeaderInfo({ title: gData.name, sub: 'Grup', avatar: gData.photo_url, role: 'user' });
    } else if (fromId) {
      const ids = [session.user.id, fromId].sort();
      currentRoom = `pv_${ids[0]}_${ids[1]}`;
      setTargetId(fromId);

      // Query both id and short_id to always find the profile
      const { data: pTarget } = await supabase
        .from('profiles')
        .select('id, username, short_id, avatar_url, role, last_seen')
        .or(`id.eq.${fromId},short_id.eq.${fromId}`)
        .maybeSingle();

      if (pTarget) {
        setHeaderInfo({
          title: pTarget.username,
          sub: `#${pTarget.short_id}`,
          avatar: pTarget.avatar_url,
          role: pTarget.role,
        });
        setTargetLastSeen(pTarget.last_seen);
      }

      const { data: f1 } = await supabase
        .from('followers')
        .select('id')
        .match({ follower_id: session.user.id, following_id: fromId })
        .maybeSingle();
      const { data: f2 } = await supabase
        .from('followers')
        .select('id')
        .match({ follower_id: fromId, following_id: session.user.id })
        .maybeSingle();
      setRelation({ iFollowThem: !!f1, theyFollowMe: !!f2 });
    }
    setRoomId(currentRoom);
    await fetchMessages(currentRoom);
    setupRealtime(currentRoom, session.user);
  };

  const cleanup = () => {
    if (refs.msgChannel.current) supabase.removeChannel(refs.msgChannel.current);
    if (refs.presenceChannel.current) supabase.removeChannel(refs.presenceChannel.current);
    if (refs.audioCtx.current) refs.audioCtx.current.close();
    if (refs.animFrame.current) cancelAnimationFrame(refs.animFrame.current);
    clearInterval(refs.recordTimer.current);
  };

  // Fetch stickers from DB or use default ones
  const fetchStickers = async () => {
    try {
      const { data } = await supabase.from('stickers').select('url').limit(20);
      if (data && data.length > 0) {
        setStickers(data.map((s: any) => s.url));
      } else {
        // Default sticker set (contoh)
        setStickers([
          'https://i.ibb.co/0jV9zL8/sticker1.png',
          'https://i.ibb.co/5rL8vQ4/sticker2.png',
          'https://i.ibb.co/dbG9Y7d/sticker3.png',
          'https://i.ibb.co/8cBwvMg/sticker4.png',
        ]);
      }
    } catch (error) {
      // fallback default jika gagal
      setStickers([
        'https://i.ibb.co/0jV9zL8/sticker1.png',
        'https://i.ibb.co/5rL8vQ4/sticker2.png',
        'https://i.ibb.co/dbG9Y7d/sticker3.png',
        'https://i.ibb.co/8cBwvMg/sticker4.png',
      ]);
    }
  };

  const fetchMessages = async (room: string) => {
    setIsLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*, profiles:user_id(*), reply_to_msg:reply_to(id, username, message)')
      .eq('room_id', room)
      .order('created_at', { ascending: true })
      .limit(50);
    if (data) setMessages(data);
    setIsLoading(false);
    scrollToBottom();
  };

  const setupRealtime = (room: string, user: any) => {
    refs.msgChannel.current = supabase
      .channel(`msg-${room}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${room}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;
            const { data: p } = await supabase
              .from('profiles')
              .select('username, avatar_url, role')
              .eq('id', newMsg.user_id)
              .single();
            newMsg.profiles = p || undefined;
            setMessages((prev) => [...prev, newMsg]);
            if (newMsg.user_id !== user.id) {
              refs.audio.current?.receive.play().catch(() => {});
              if (newMsg.status !== 'read')
                await supabase.from('messages').update({ status: 'read' }).eq('id', newMsg.id);
            }
            scrollToBottom();
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
            );
          }
        }
      )
      .subscribe();

    refs.presenceChannel.current = supabase
      .channel(`presence-${room}`)
      .on('presence', { event: 'sync' }, () =>
        setOnlineCount(Object.keys(refs.presenceChannel.current.presenceState()).length)
      )
      .on('broadcast', { event: 'typing' }, (p: any) => {
        setTypingUser({ username: p.payload.username, avatar_url: p.payload.avatar_url });
        setTimeout(() => setTypingUser(null), 3000);
      })
      .subscribe(async (s) => {
        if (s === 'SUBSCRIBED')
          await refs.presenceChannel.current.track({ user_id: user.id, online: true });
      });
  };

  const scrollToBottom = (isSmooth = true) => {
    setTimeout(
      () =>
        refs.scroll.current?.scrollIntoView({ behavior: isSmooth ? 'smooth' : 'auto' }),
      150
    );
  };

  const triggerPushNotification = async (type: string, title: string, message: string) => {
    // ... (tidak diubah)
  };

  const sendMessage = async (text?: string, sticker?: string, audio?: string, image?: string) => {
    const content = text || inputValue;
    if (!content && !sticker && !audio && !image) return;
    refs.audio.current?.send.play().catch(() => {});

    if (editMessageId) {
      await supabase.from('messages').update({ message: content }).eq('id', editMessageId);
      setEditMessageId(null);
      setInputValue('');
      return;
    }

    const messagePreview = image && !content
      ? 'Mengirim Foto'
      : audio
      ? 'Voice Note'
      : sticker
      ? 'Stiker'
      : content;
    const { error } = await supabase.from('messages').insert([
      {
        room_id: roomId,
        user_id: currentUser.id,
        message: messagePreview,
        sticker_url: sticker || null,
        audio_url: audio || null,
        image_url: image || null,
        reply_to: replyTo?.id || null,
        status: 'sent',
      },
    ]);

    if (!error) {
      setInputValue('');
      setReplyTo(null);
      setIsStickerOpen(false);
      setPendingImagePreview(null);
      if (targetId)
        triggerPushNotification('chat', myProfile?.username || 'Pesan Baru', messagePreview);
    }
  };

  // Voice Note Start
  const startVN = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      refs.audioCtx.current = audioCtx;

      const updateWave = () => {
        if (!isRecordingRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average);
        refs.animFrame.current = requestAnimationFrame(updateWave);
      };
      updateWave();

      refs.mediaRecorder.current = new MediaRecorder(stream);
      refs.audioChunks.current = [];
      refs.mediaRecorder.current.ondataavailable = (e) => refs.audioChunks.current.push(e.data);
      refs.mediaRecorder.current.onstop = async () => {
        if (refs.audioCtx.current) refs.audioCtx.current.close();
        if (refs.animFrame.current) cancelAnimationFrame(refs.animFrame.current);
        if (vnIsCanceled.current) {
          vnIsCanceled.current = false;
          return;
        }

        const blob = new Blob(refs.audioChunks.current, { type: 'audio/mpeg' });
        const fd = new FormData();
        fd.append("file", blob);
        fd.append("upload_preset", "hopehype_preset");
        fd.append("resource_type", "video");
        const res = await fetch(`https://api.cloudinary.com/v1_1/dhhmkb8kl/upload`, { method: "POST", body: fd });
        const d = await res.json();
        if (d.secure_url) sendMessage(undefined, undefined, d.secure_url, undefined);
      };

      refs.mediaRecorder.current.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordTime(0);
      refs.recordTimer.current = setInterval(() => setRecordTime(p => p + 1), 1000);
    } catch (e) {
      showNotif("Izin mikrofon ditolak", "error");
    }
  };

  const stopVN = (isCanceledByUser = false) => {
    setSlideOffset(0);
    if (!isRecordingRef.current) return;
    setIsRecording(false);
    isRecordingRef.current = false;
    clearInterval(refs.recordTimer.current);

    if (isCanceledByUser) {
      vnIsCanceled.current = true;
    }
    refs.mediaRecorder.current?.stop();
  };

  const handleTouchStart = (e: any) => {
    if (!inputValue.trim() && !editMessageId && !pendingImagePreview) {
      vnIsCanceled.current = false;
      setSlideOffset(0);
      vnTouchStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
      startVN();
    }
  };

  const handleTouchMove = (e: any) => {
    if (!isRecordingRef.current) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const diff = vnTouchStartX.current - currentX;

    if (diff > 0) {
      setSlideOffset(-diff);
      if (diff > 100) {
        vnIsCanceled.current = true;
        stopVN(true);
      }
    }
  };

  const handleTouchEnd = () => stopVN(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return 'Tidak diketahui';
    const date = new Date(dateString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Hari ini ${timeStr}` : `${date.toLocaleDateString('id-ID')} ${timeStr}`;
  };

  let chatState = 'normal';
  if (targetId && currentUser) {
    const myRawMsgs = messages.filter((m) => m.user_id === currentUser.id);
    const partnerRawMsgs = messages.filter((m) => m.user_id === targetId);
    if (partnerRawMsgs.length > 0 && myRawMsgs.length === 0 && !relation.iFollowThem)
      chatState = 'i_must_approve';
    else if (myRawMsgs.length > 0 && partnerRawMsgs.length === 0 && !relation.theyFollowMe)
      chatState = 'i_am_blocked_by_request';
  }

  let displayStatus = '';
  if (typingUser) {
    displayStatus = `${typingUser.username} mengetik...`;
  } else if (groupId) {
    displayStatus = `${onlineCount} hopers sedang online`;
  } else if (targetId) {
    displayStatus = onlineCount >= 2 ? 'Online' : `Terakhir dilihat: ${formatLastSeen(targetLastSeen)}`;
  }

  return (
    <div className="hype-chat-scope telegram-chat">
      {/* Lightbox sticker */}
      {lightboxSticker && (
        <div
          className="sticker-lightbox"
          onClick={() => setLightboxSticker(null)}
        >
          <img src={lightboxSticker} alt="s" />
        </div>
      )}

      {/* Header */}
      <header className="chat-header">
        <div className="header-inner">
          <button
            className="back-btn"
            onClick={() => router.push('/hypetalk')}
          >
            <span className="material-icons">arrow_back</span>
          </button>

          {targetId && (
            <img
              src={headerInfo.avatar || '/asets/png/profile.webp'}
              alt="avatar"
              className="avatar"
            />
          )}

          <div className="header-text">
            <h3 className="title">
              {headerInfo.title}{' '}
              {targetId && <span dangerouslySetInnerHTML={{ __html: getUserBadge(headerInfo.role) }} />}
            </h3>
            <span className={`status ${typingUser ? 'typing' : ''}`}>
              {displayStatus}
            </span>
          </div>

          {targetId && (
            <button
              className="call-btn"
              style={{
                opacity: chatState === 'normal' ? 1 : 0.3,
                pointerEvents: chatState === 'normal' ? 'auto' : 'none',
              }}
              onClick={startCall}
            >
              <span className="material-icons">call</span>
            </button>
          )}
        </div>
      </header>

      {/* Main chat messages */}
      <main className="chat-messages">
        {isLoading ? (
          <ChatSkeleton />
        ) : (
          <>
            {/* Encryption notice */}
            <div className="encryption-notice">
              <div className="notice-box">
                <span className="material-icons">lock</span>
                <p>
                  Pesan dan panggilan dienkripsi secara end-to-end. Tidak ada orang di luar chat ini
                  yang dapat membaca atau mendengarkannya.
                </p>
              </div>
            </div>

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                currentUser={currentUser}
                isMe={msg.user_id === currentUser?.id}
                onReply={setReplyTo}
                roomId={roomId}
              />
            ))}
          </>
        )}
        <div ref={refs.scroll} />
      </main>

      {/* Footer input */}
      <footer className="chat-footer">
        <AnimatePresence>
          {isStickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="sticker-panel"
            >
              <div className="sticker-grid">
                {stickers.map((s, i) => (
                  <img
                    key={i}
                    src={s}
                    alt="sticker"
                    className="sticker-item"
                    onClick={() => sendMessage(undefined, s)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {chatState === 'normal' ? (
          <div className="input-container">
            <AnimatePresence>
              {replyTo && (
                <motion.div
                  initial={{ opacity: 0, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: '100%' }}
                  className="reply-preview"
                >
                  <div className="reply-content">
                    <span className="reply-username">
                      Membalas {replyTo.profiles?.username || 'User'}
                    </span>
                    <span className="reply-text">
                      {replyTo.message ||
                        (replyTo.image_url
                          ? 'Foto'
                          : replyTo.audio_url
                          ? 'Voice Note'
                          : 'Stiker')}
                    </span>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="close-reply">
                    <span className="material-icons text-sm">close</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="input-row">
              <div className="input-box">
                {pendingImagePreview && (
                  <div className="image-preview">
                    <img src={pendingImagePreview} alt="p" />
                    <button onClick={() => setPendingImagePreview(null)}>&times;</button>
                  </div>
                )}

                <AnimatePresence>
                  {isRecording ? (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="recording-bar"
                    >
                      <div className="record-info">
                        <div className="record-dot" />
                        <span className="record-time">{formatTime(recordTime)}</span>
                      </div>
                      <div className="record-wave">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <motion.div
                            key={i}
                            className="wave-bar"
                            animate={{
                              height: `${Math.max(
                                4,
                                (audioLevel / 255) * 24 * (Math.random() * 0.5 + 0.5)
                              )}px`,
                            }}
                            transition={{ type: 'tween', duration: 0.1 }}
                          />
                        ))}
                      </div>
                      <div className="slide-cancel">
                        <span className="material-icons">keyboard_double_arrow_left</span>
                        Geser batal
                      </div>
                    </motion.div>
                  ) : (
                    <div className="input-actions">
                      <button
                        onClick={() => setIsStickerOpen(!isStickerOpen)}
                        className="sticker-toggle"
                      >
                        <span className="material-icons">sentiment_satisfied_alt</span>
                      </button>

                      <textarea
                        placeholder={t('write_message')}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="message-input"
                        rows={1}
                      />

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="attach-btn"
                      >
                        <span className="material-icons">image</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        hidden
                        accept="image/*"
                        onChange={(e: any) =>
                          setPendingImagePreview(URL.createObjectURL(e.target.files[0]))
                        }
                      />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                id="action-btn"
                animate={{ x: slideOffset }}
                className={`send-btn ${isRecording ? 'recording' : ''}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={(e) => isRecording && handleTouchMove(e)}
                onMouseUp={handleTouchEnd}
                onMouseLeave={() => isRecording && handleTouchEnd()}
                onClick={() => (inputValue || pendingImagePreview) && sendMessage()}
              >
                <AnimatePresence mode="wait">
                  {inputValue || pendingImagePreview ? (
                    <motion.span
                      key="send"
                      initial={{ scale: 0, rotate: -45, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0, rotate: 45, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="material-icons"
                    >
                      send
                    </motion.span>
                  ) : (
                    <motion.span
                      key="mic"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="material-icons"
                    >
                      mic
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="pending-chat">
            Menunggu persetujuan chat...
          </div>
        )}
      </footer>
    </div>
  );
}
