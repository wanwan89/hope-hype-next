'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge } from '@/lib/ui-utils';
import '../Hypetalk.css'; // Ambil style dari halaman utama Hypetalk

export default function MessageRequestsPage() {
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [requestChats, setRequestChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initRequests();
  }, []);

  const initRequests = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setCurrentUser(session.user);
      
      const userId = session.user.id;

      // 1. Ambil data Followers
      const { data: followerData } = await supabase.from('followers').select('follower_id').eq('following_id', userId);
      const followerIds = new Set(followerData?.map((f: any) => f.follower_id) || []);

      // 2. Ambil Semua Pesan Private (Gak usah dibatasin 24 jam biar request lama tetep kelihatan)
      const { data: allMsgs } = await supabase.from("messages")
        .select("*")
        .like('room_id', '%pv_%') // Cuma ambil chat private
        .order("created_at", { ascending: false });

      if (!allMsgs) {
        setIsLoading(false);
        return;
      }

      // 3. Kelompokkan pesan berdasarkan Room ID
      const roomMap = new Map();
      allMsgs.forEach(msg => {
        if (msg.room_id.includes(userId)) {
          if (!roomMap.has(msg.room_id)) {
             roomMap.set(msg.room_id, []);
          }
          roomMap.get(msg.room_id).push(msg);
        }
      });

      const pendingPartners: any[] = [];
      const unreadMap = new Map();

      // 4. Saring mana yang masuk kriteria "Request"
      for (const [roomId, msgs] of roomMap.entries()) {
         const partnerId = roomId.replace("pv_", "").split("_").find((id: string) => id !== userId);
         if (!partnerId) continue;

         // Cek apakah KITA pernah mengirim pesan di room ini?
         const iHaveReplied = msgs.some((m: any) => m.user_id === userId);
         const isFollower = followerIds.has(partnerId);

         // Masuk list Request kalau: BUKAN Follower & KITA BELUM PERNAH BALAS
         if (!isFollower && !iHaveReplied) {
            const lastMsg = msgs[0]; // Karena udah di-order descending di awal
            const unreadCount = msgs.filter((m: any) => m.status !== 'read' && m.user_id !== userId).length;
            
            unreadMap.set(partnerId, unreadCount);
            
            pendingPartners.push({
               id: partnerId,
               lastMsg
            });
         }
      }

      // 5. Ambil data Profil si Pengirim
      if (pendingPartners.length > 0) {
         const partnerIds = pendingPartners.map(p => p.id);
         const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, role").in("id", partnerIds);
         
         const finalReqChats = pendingPartners.map(pending => {
            const p = profiles?.find(prof => prof.id === pending.id);
            if (!p) return null;

            const lastMsg = pending.lastMsg;
            let msgPreview = lastMsg.message;
            if (lastMsg.sticker_url) msgPreview = "Mengirim gambar";
            if (lastMsg.audio_url) msgPreview = "Mengirim Voice Note";

            return {
              id: p.id,
              name: p.username,
              avatar: p.avatar_url,
              role: p.role,
              preview: msgPreview,
              time: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              sortTime: new Date(lastMsg.created_at).getTime(),
              unread: unreadMap.get(p.id) || 0
            };
         }).filter(Boolean); // Buang yang null

         setRequestChats(finalReqChats.sort((a: any, b: any) => b.sortTime - a.sortTime));
      } else {
         setRequestChats([]);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChat = (chatId: string) => {
    // Arahkan ke room chat. 
    // Nanti kalau user ngetik balesan di room sana, otomatis chat ini bakal pindah ke Beranda Utama!
    router.push(`/hypetalk/chat?from=${chatId}`);
  };

  return (
    <div className="telegram-wrapper">
      <header className="tg-header" style={{ borderBottom: '1px solid var(--tg-border)' }}>
        <div className="tg-header-top">
          <div className="tg-header-left" style={{ gap: '8px' }}>
            <button className="icon-btn" onClick={() => router.back()}>
              <span className="material-icons">arrow_back</span>
            </button>
            <h2 style={{ fontSize: '18px' }}>Permintaan Pesan</h2>
          </div>
        </div>
        <div style={{ padding: '0 16px 12px', fontSize: '13px', color: 'var(--tg-text-muted)' }}>
          Buka obrolan untuk melihat info lebih lanjut. Mereka tidak akan tahu kamu telah membaca pesannya sampai kamu membalas.
        </div>
      </header>

      <main className="tg-chat-list" style={{ paddingBottom: '20px' }}>
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="tg-chat-item skeleton-chat">
              <div className="tg-avatar skeleton-shimmer"></div>
              <div className="tg-chat-info" style={{ flex: 1 }}>
                <div className="tg-chat-top">
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '14px' }}></div>
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '30px', height: '10px' }}></div>
                </div>
                <div className="skeleton-line skeleton-shimmer" style={{ width: '70%', height: '12px', marginTop: '8px' }}></div>
              </div>
            </div>
          ))
        ) : requestChats.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--tg-text-muted)' }}>
            <span className="material-icons" style={{ fontSize: '64px', opacity: 0.3, marginBottom: '16px' }}>mark_chat_read</span>
            <p style={{ fontWeight: 600, fontSize: '16px', color: 'var(--tg-text)', margin: '0 0 4px 0' }}>Tidak ada permintaan</p>
            <p style={{ fontSize: '13px', textAlign: 'center', maxWidth: '250px', margin: 0 }}>
              Pesan dari orang yang tidak kamu ikuti akan muncul di sini.
            </p>
          </div>
        ) : (
          requestChats.map(chat => (
            <div key={chat.id} className="tg-chat-item" onClick={() => handleOpenChat(chat.id)}>
              <div className="tg-avatar global-avatar">
                <img src={chat.avatar || "/asets/png/profile.webp"} className="tg-avatar" alt="av" />
              </div>
              <div className="tg-chat-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="tg-chat-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h4 className="tg-name" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--tg-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                    {chat.name}
                    <span dangerouslySetInnerHTML={{ __html: getUserBadge(chat.role || 'user') }} style={{ marginLeft: '4px' }} />
                  </h4>
                  <span className="tg-time" style={{ fontSize: '11px', color: chat.unread > 0 ? '#1DA1F2' : 'var(--tg-text-muted)', fontWeight: chat.unread > 0 ? 'bold' : 'normal', flexShrink: 0, marginLeft: '8px' }}>
                    {chat.time}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="tg-preview-container" style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <p className="tg-preview" style={{ margin: 0, color: chat.unread > 0 ? 'var(--tg-text)' : 'var(--tg-text-muted)', fontWeight: chat.unread > 0 ? 600 : 400, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chat.preview}
                    </p>
                  </div>
                  {chat.unread > 0 && (
                    <div style={{ background: '#1DA1F2', color: 'white', borderRadius: '10px', padding: '0 6px', fontSize: '11px', fontWeight: 'bold', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px', flexShrink: 0 }}>
                      {chat.unread}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
