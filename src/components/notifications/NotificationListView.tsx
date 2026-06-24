'use client';
import React from 'react';

interface Notification {
  id: string;
  type: string;
  actor_id?: string;
  actor?: {
    username?: string;
    avatar_url?: string | null;
  };
  actors?: { username?: string; avatar_url?: string | null }[];
  actor_ids?: string[];
  otherCount?: number;
  message?: string;
  amount?: number;
  description?: string;
  status?: string;
  postData?: {
    image_url?: string | null;
    video_url?: string | null;
  };
  post_id?: string;
  created_at: string;
  is_read: boolean;
}

interface Props {
  title: string;
  notifs: Notification[];
  onBack: () => void;
  handleNotifClick: (notif: Notification) => void;
  handleFollowBack: (e: React.MouseEvent, targetId: string) => void;
  myFollowings: Set<string>;
  router: any;
  formatDate: (date: string) => string;
  getIconAndColor: (type: string) => { icon: string; color: string };
}

export default function NotificationListView({
  title,
  notifs,
  onBack,
  handleNotifClick,
  handleFollowBack,
  myFollowings,
  router,
  formatDate,
  getIconAndColor,
}: Props) {
  return (
    <div className="notif-detail-view slide-in-right">
      <header className="notif-detail-header">
        <button onClick={onBack} className="back-btn btn-press">
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>{title}</h2>
      </header>

      <div className="notif-list-container">
        {notifs.length === 0 ? (
          <div className="notif-empty-state">
            <span className="material-icons" style={{ fontSize: '48px', color: 'var(--border-card)' }}>notifications_none</span>
            <p style={{ color: 'var(--text-muted)' }}>Belum ada notifikasi di kategori ini.</p>
          </div>
        ) : (
          notifs.map((notif) => {
            const { icon: typeIcon, color } = getIconAndColor(notif.type);
            const actorName = notif.actor?.username || notif.actor_id || 'Pengguna';
            const actorAvatar = notif.actor?.avatar_url || null;
            const isFollowing = notif.actor_id ? myFollowings.has(notif.actor_id) : false;

            let thumbUrl: string | null = null;
            if (notif.postData) {
              if (notif.postData.image_url) {
                const imgs = notif.postData.image_url.split(',');
                thumbUrl = imgs[0] || notif.postData.video_url || null;
              } else if (notif.postData.video_url) {
                thumbUrl = notif.postData.video_url;
              }
            }

            let messageHtml = '';
            switch (notif.type) {
              case 'like':
                messageHtml = 'menyukai postinganmu.';
                break;
              case 'like_group': {
                const actor1 = notif.actors?.[0]?.username || 'Pengguna';
                const actor2 = notif.actors?.[1]?.username;
                const otherCount = notif.otherCount;
                messageHtml = actor2
                  ? `${actor1}, ${actor2} dan ${otherCount} lainnya menyukai postingan Anda.`
                  : `${actor1} dan ${otherCount} lainnya menyukai postingan Anda.`;
                break;
              }
              case 'comment_like':
                messageHtml = 'menyukai komentarmu.';
                break;
              case 'comment':
                messageHtml = `berkomentar: <span style="color:var(--text-muted)">"${notif.message || ''}"</span>`;
                break;
              case 'repost':
                messageHtml = 'membagikan ulang karyamu.';
                break;
              case 'save':
                messageHtml = 'menyimpan karyamu.';
                break;
              case 'follow':
                messageHtml = 'mulai mengikuti Anda.';
                break;
              case 'coin_receive':
                messageHtml = `Anda menerima koin: <strong style="color:#f59e0b">+${notif.amount || 0}</strong><br/><span style="font-size: 12px; color:var(--text-muted)">${notif.description || 'Top up / Reward'}</span>`;
                break;
              case 'payment_status':
                messageHtml = `Status pembayaran Rp ${notif.amount?.toLocaleString('id-ID') || 0} Anda saat ini: <strong style="text-transform: capitalize">${notif.status || ''}</strong>.`;
                break;
              default:
                messageHtml = notif.message?.replace(/<b>(.*?)<\/b>/g, '') || 'Ada notifikasi baru untukmu.';
                break;
            }

            // Tampilan khusus like_group: dua avatar kecil
            const avatarElement = notif.type === 'like_group' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '-8px' }}>
                {(notif.actors || []).slice(0, 2).map((actor, idx) => (
                  <img
                    key={idx}
                    src={actor?.avatar_url || '/asets/png/profile.webp'}
                    alt={actor?.username}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--bg-main)',
                      marginLeft: idx === 0 ? 0 : -10,
                      zIndex: idx === 0 ? 2 : 1,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (notif.actor_ids?.[idx]) router.push(`/data?id=${notif.actor_ids[idx]}`);
                    }}
                  />
                ))}
                {/* Ikon badge like */}
                <div className="notif-icon-badge" style={{ background: color, position: 'relative', marginLeft: -6, zIndex: 3 }}>
                  <span className="material-icons">{typeIcon}</span>
                </div>
              </div>
            ) : (
              <div className="notif-avatar-wrapper">
                {actorAvatar ? (
                  <img
                    src={actorAvatar}
                    alt={actorName}
                    className="notif-avatar"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (notif.actor_id) router.push(`/data?id=${notif.actor_id}`);
                    }}
                  />
                ) : (
                  <div
                    className="notif-avatar default-avatar"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (notif.actor_id) router.push(`/data?id=${notif.actor_id}`);
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-card)',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: 28, color: 'var(--text-muted)' }}>person</span>
                  </div>
                )}
                <div className="notif-icon-badge" style={{ background: color }}>
                  <span className="material-icons">{typeIcon}</span>
                </div>
              </div>
            );

            return (
              <div
                key={notif.id}
                className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                onClick={() => handleNotifClick(notif)}
              >
                {avatarElement}

                <div className="notif-content">
                  <div className="notif-text">
                    {notif.type !== 'like_group' && (
                      <strong
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notif.actor_id) router.push(`/data?id=${notif.actor_id}`);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {actorName}
                      </strong>
                    )}
                    {notif.type !== 'like_group' ? (
                      <> <span dangerouslySetInnerHTML={{ __html: messageHtml }} /></>
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: messageHtml }} />
                    )}
                  </div>
                  <span className="notif-date">{formatDate(notif.created_at)}</span>
                </div>

                <div className="notif-action-area">
                  {notif.type === 'follow' && notif.actor_id && (
                    <button
                      className={`notif-follow-btn ${isFollowing ? 'followed' : ''}`}
                      onClick={(e) => handleFollowBack(e, notif.actor_id!)}
                    >
                      {isFollowing ? 'Mengikuti' : 'Ikuti Balik'}
                    </button>
                  )}
                  {thumbUrl && (
                    <img src={thumbUrl} className="notif-post-thumb" alt="post thumbnail" />
                  )}
                </div>

                {!notif.is_read && <div className="notif-unread-dot" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}