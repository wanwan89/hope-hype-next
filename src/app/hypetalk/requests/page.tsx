'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserBadge } from '@/lib/ui-utils';
import '../Hypetalk.css';

export default function MessageRequestsPage() {
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [requestChats, setRequestChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initRequests();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const channelName = `realtime-requests-user-${currentUser.id}`;
    const channel = supabase.channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        initRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const initRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setCurrentUser(session.user);
      const userId = session.user.id;

      const { data: followerData } = await supabase.from('followers').select('follower_id').eq('following_id', userId);
      const followerIds = new Set(followerData?.map((f: any) => f.follower_id) || []);

      const { data: allMsgs } = await supabase.from("messages")
        .select("*")
        .like('room_id', 'pv_%')
        .ilike('room_id', `%${userId}%`)
        .order("created_at", { ascending: false });

      if (!allMsgs || allMsgs.length === 0) {
        setRequestChats([]);
        setIsLoading(false);
        return;
      }

      const roomMap = new Map();
      allMsgs.forEach(msg => {
        if (!roomMap.has(msg.room_id)) {
          roomMap.set(msg.room_id, []);
        }
        roomMap.get(msg.room_id).push(msg);
      });

      const pendingPartners: any[] = [];
      const unreadMap = new Map();

      for (const [roomId, msgs] of roomMap.entries()) {
        const partnerId = roomId.replace("pv_", "").split("_").find((id: string) => id !== userId);
        if (!partnerId) continue;

        const iHaveReplied = msgs.some((m: any) => m.user_id === userId);
        const isFollower = followerIds.has(partnerId);

        if (!isFollower && !iHaveReplied) {
          const lastMsg = msgs[0];
          const unreadCount = msgs.filter((m: any) => m.status !== 'read' && m.user_id !== userId).length;
          unreadMap.set(partnerId, unreadCount);
          pendingPartners.push({ id: partnerId, lastMsg });
        }
      }

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
        }).filter(Boolean);

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
    router.push(`/hypetalk/room?from=${chatId}`);
  };

  return (
    <div className="telegram-wrapper">
      <header className="tg-header" style={{ borderBottom: '1px solid var(--border-card)' }}>
        <div className="tg-header-top">
          <div className="tg-header-left" style={{ gap: '8px' }}>
            <button className="icon-btn" onClick={() => router.back()}>
              <span className="material-icons">arrow_back</span>
            </button>
            <h2 style={{ fontSize: '18px', color: 'var(--text-main)' }}>Permintaan Pesan</h2>
          </div>
        </div>
        <div style={{ padding: '0 16px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Buka obrolan untuk melihat info lebih lanjut. Mereka tidak akan tahu kamu telah membaca pesannya sampai kamu membalas.
        </div>
      </header>

      <main className="tg-chat-list" style={{ paddingBottom: '20px' }}>
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="tg-chat-item skeleton-chat">
              <div className="tg-avatar skeleton-shimmer" style={{ backgroundColor: 'var(--bg-secondary)' }}></div>
              <div className="tg-chat-info" style={{ flex: 1 }}>
                <div className="tg-chat-top">
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '14px', backgroundColor: 'var(--bg-secondary)' }}></div>
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '30px', height: '10px', backgroundColor: 'var(--bg-secondary)' }}></div>
                </div>
                <div className="skeleton-line skeleton-shimmer" style={{ width: '70%', height: '12px', marginTop: '8px', backgroundColor: 'var(--bg-secondary)' }}></div>
              </div>
            </div>
          ))
        ) : requestChats.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
            <span className="material-icons" style={{ fontSize: '64px', opacity: 0.3, marginBottom: '16px' }}>mark_chat_read</span>
            <p style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-main)', margin: '0 0 4px 0' }}>Tidak ada permintaan</p>
            <p style={{ fontSize: '13px', textAlign: 'center', maxWidth: '250px', margin: 0 }}>
              Pesan dari orang yang tidak kamu ikuti akan muncul di sini.
            </p>
          </div>
        ) : (
          requestChats.map(chat => (
            <div key={chat.id} className="tg-chat-item" onClick={() => handleOpenChat(chat.id)} style={{ cursor: 'pointer' }}>
              <div className="tg-avatar global-avatar">
                <img src={chat.avatar || "/asets/png/profile.webp"} className="tg-avatar" alt="av" />
              </div>
              <div className="tg-chat-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="tg-chat-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h4 className="tg-name" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                    {chat.name}
                    <span dangerouslySetInnerHTML={{ __html: getUserBadge(chat.role || 'user') }} style={{ marginLeft: '4px' }} />
                  </h4>
                  <span className="tg-time" style={{ fontSize: '11px', color: chat.unread > 0 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: chat.unread > 0 ? 'bold' : 'normal', flexShrink: 0, marginLeft: '8px' }}>
                    {chat.time}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="tg-preview-container" style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <p className="tg-preview" style={{ margin: 0, color: chat.unread > 0 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: chat.unread > 0 ? 600 : 400, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chat.preview}
                    </p>
                  </div>
                  {chat.unread > 0 && (
                    <div style={{
                      background: 'var(--primary-bg)',  // ✅ latar biru
                      color: 'white',
                      borderRadius: '10px',
                      padding: '0 6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      minWidth: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: '8px',
                      flexShrink: 0,
                    }}>
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