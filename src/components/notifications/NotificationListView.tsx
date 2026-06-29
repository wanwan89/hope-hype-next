'use client';
import React, { useState, useEffect } from 'react';

interface Notification {
  id: string;
  type: string;
  actor_id?: string;
  actor?: { username?: string; avatar_url?: string | null };
  actors?: { username?: string; avatar_url?: string | null }[];
  actor_ids?: string[];
  otherCount?: number;
  message?: string;
  amount?: number;
  description?: string;
  status?: string;
  postData?: { image_url?: string | null; video_url?: string | null };
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
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // SVG default avatar (menggantikan profile.webp)
  const defaultAvatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 48 48"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path fill="#2F88FF" stroke="#000" d="M4.14317 21.0805C4.4982 17.2939 4.67571 15.4006 6.65595 13.3751C8.63619 11.3496 10.8152 11.0955 15.1734 10.5873C18.0037 10.2573 21.1305 10 24 10C26.8695 10 29.9963 10.2573 32.8266 10.5873C37.1848 11.0955 39.3638 11.3496 41.3441 13.3751C43.3243 15.4006 43.5018 17.2939 43.8568 21.0805C43.9464 22.0361 44 23.0181 44 24C44 24.9819 43.9464 25.9639 43.8568 26.9195C43.5018 30.7061 43.3243 32.5994 41.3441 34.6249C39.3638 36.6504 37.1848 36.9045 32.8266 37.4127C29.9963 37.7427 26.8695 38 24 38C21.1305 38 18.0037 37.7427 15.1734 37.4127C10.8152 36.9045 8.63619 36.6504 6.65595 34.6249C4.67571 32.5994 4.4982 30.7061 4.14317 26.9195C4.05357 25.9639 4 24.9819 4 24C4 23.0181 4.05357 22.0361 4.14317 21.0805Z"/><path stroke="#fff" d="M16 19V29"/><path stroke="#fff" d="M33 19L28 24L33 29"/></g></svg>`;
  const defaultAvatarDataUri = `data:image/svg+xml,${encodeURIComponent(defaultAvatarSvg)}`;

  return (
    <div
      className="notif-detail-view slide-in-right"
      style={{
        background: isDark ? 'var(--bg-main)' : '#ffffff',
        minHeight: '100dvh',
      }}
    >
      <header
        className="notif-detail-header"
        style={{
          background: isDark ? 'var(--bg-main)' : '#ffffff',
          borderBottom: `1px solid ${isDark ? 'var(--border-card)' : '#e0e0e0'}`,
        }}
      >
        <button
          onClick={onBack}
          className="back-btn btn-press"
          style={{ color: isDark ? 'var(--text-main)' : '#1a1a1a' }}
        >
          <span className="material-icons">arrow_back</span>
        </button>
        <h2 style={{ color: isDark ? 'var(--text-main)' : '#1a1a1a' }}>{title}</h2>
      </header>

      <div className="notif-list-container">
        {notifs.length === 0 ? (
          <div
            className="notif-empty-state"
            style={{ textAlign: 'center', padding: '40px 20px' }}
          >
            <span
              className="material-icons"
              style={{ fontSize: '48px', color: 'var(--border-card)' }}
            >
              notifications_none
            </span>
            <p style={{ color: 'var(--text-muted)' }}>
              Belum ada notifikasi di kategori ini.
            </p>
          </div>
        ) : (
          notifs.map((notif) => {
            const { icon: typeIcon, color } = getIconAndColor(notif.type);
            const actorName = notif.actor?.username;
            const actorAvatar = notif.actor?.avatar_url || null;
            const isFollowing = notif.actor_id
              ? myFollowings.has(notif.actor_id)
              : false;

            let thumbUrl: string | null = null;
            if (notif.postData) {
              if (notif.postData.image_url)
                thumbUrl = notif.postData.image_url.split(',')[0];
              else if (notif.postData.video_url)
                thumbUrl = notif.postData.video_url;
            }

            const getGroupMessageHtml = (actionText: string) => {
              const actor1 = notif.actors?.[0]?.username;
              const actor2 = notif.actors?.[1]?.username;
              const otherCount = notif.otherCount || 0;
              if (actor1 && actor2) {
                return otherCount > 0
                  ? `<strong>${actor1}</strong>, <strong>${actor2}</strong> dan <strong>${otherCount} lainnya</strong> ${actionText}`
                  : `<strong>${actor1}</strong> dan <strong>${actor2}</strong> ${actionText}`;
              } else if (actor1) {
                return otherCount > 0
                  ? `<strong>${actor1}</strong> dan <strong>${otherCount} lainnya</strong> ${actionText}`
                  : `<strong>${actor1}</strong> ${actionText}`;
              }
              return actionText;
            };

            let messageHtml = '';
            switch (notif.type) {
              case 'like':
                messageHtml = 'menyukai postinganmu.';
                break;
              case 'like_group':
                messageHtml = getGroupMessageHtml('menyukai postingan Anda.');
                break;
              case 'comment_likes':
                messageHtml = 'menyukai komentarmu.';
                break;
              case 'story_likes':
                messageHtml = 'menyukai cerita Anda.';
                break;
              case 'comment':
              case 'reply':
                messageHtml = `berkomentar: <span style="color:var(--text-muted)">"${
                  notif.message || ''
                }"</span>`;
                break;
              case 'repost':
                messageHtml = 'membagikan ulang karyamu.';
                break;
              case 'repost_group':
                messageHtml = getGroupMessageHtml('membagikan ulang karyamu.');
                break;
              case 'save':
                messageHtml = 'menyimpan karyamu.';
                break;
              case 'save_group':
                messageHtml = getGroupMessageHtml('menyimpan karyamu.');
                break;
              case 'follow':
                messageHtml = 'mulai mengikuti Anda.';
                break;
              case 'coin_receive':
              case 'coin_history':
                messageHtml = `Anda menerima koin: <strong style="color:#f59e0b">+${
                  notif.amount || 0
                }</strong><br/><span style="font-size: 12px; color:var(--text-muted)">${
                  notif.description || 'Top up / Reward / History'
                }</span>`;
                break;
              case 'payment_status':
                messageHtml = `Status pembayaran Rp ${
                  notif.amount?.toLocaleString('id-ID') || 0
                } Anda saat ini: <strong style="text-transform: capitalize">${
                  notif.status || ''
                }</strong>.`;
                break;
              case 'withdraw_request':
                messageHtml = `Permintaan penarikan koin sejumlah Rp ${
                  notif.amount?.toLocaleString('id-ID') || 0
                } saat ini: <strong style="text-transform: capitalize">${
                  notif.status || 'pending'
                }</strong>.`;
                break;
              default:
                messageHtml =
                  notif.message?.replace(/<b>(.*?)<\/b>/g, '') ||
                  'Ada notifikasi baru untukmu.';
                break;
            }

            const isGroupAction = notif.type.endsWith('_group');
            const avatarElement = isGroupAction ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                {(notif.actors || []).slice(0, 2).map((actor, idx) => (
                  <img
                    key={idx}
                    src={actor?.avatar_url || defaultAvatarDataUri}
                    alt={actor?.username || 'User'}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `2px solid ${
                        isDark ? 'var(--bg-card)' : '#ffffff'
                      }`,
                      marginLeft: idx === 0 ? 0 : -20,
                      zIndex: 2 - idx,
                      position: 'relative',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (notif.actor_ids?.[idx])
                        router.push(`/data?id=${notif.actor_ids[idx]}`);
                    }}
                  />
                ))}
                <div
                  className="notif-icon-badge"
                  style={{
                    background: color,
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    zIndex: 3,
                  }}
                >
                  <span
                    className="material-icons"
                    style={{ fontSize: 12, color: 'white' }}
                  >
                    {typeIcon}
                  </span>
                </div>
              </div>
            ) : (
              <div className="notif-avatar-wrapper">
                {actorAvatar ? (
                  <img
                    src={actorAvatar}
                    alt={actorName}
                    className="notif-avatar"
                    style={{
                      border: `1px solid ${
                        isDark ? 'var(--border-card)' : '#e0e0e0'
                      }`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (notif.actor_id)
                        router.push(`/data?id=${notif.actor_id}`);
                    }}
                  />
                ) : (
                  <div
                    className="notif-avatar default-avatar"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (notif.actor_id)
                        router.push(`/data?id=${notif.actor_id}`);
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: isDark
                        ? 'var(--bg-secondary)'
                        : '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${
                        isDark ? 'var(--border-card)' : '#e0e0e0'
                      }`,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      className="material-icons"
                      style={{ fontSize: 28, color: 'var(--text-muted)' }}
                    >
                      {['payment_status', 'withdraw_request', 'coin_history', 'coin_receive'].includes(notif.type)
                        ? 'account_balance_wallet'
                        : 'person'}
                    </span>
                  </div>
                )}
                <div
                  className="notif-icon-badge"
                  style={{ background: color }}
                >
                  <span
                    className="material-icons"
                    style={{ color: 'white', fontSize: 12 }}
                  >
                    {typeIcon}
                  </span>
                </div>
              </div>
            );

            return (
              <div
                key={notif.id}
                className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                style={{
                  borderBottom: `1px solid ${
                    isDark ? 'var(--border-card)' : '#e0e0e0'
                  }`,
                  background: !notif.is_read
                    ? isDark
                      ? 'rgba(31, 60, 255, 0.1)'
                      : 'rgba(31, 60, 255, 0.05)'
                    : 'transparent',
                  position: 'relative',
                  paddingRight: !notif.is_read ? '35px' : '15px',
                }}
                onClick={() => handleNotifClick(notif)}
              >
                {avatarElement}
                <div className="notif-content">
                  <div
                    className="notif-text"
                    style={{ color: isDark ? 'var(--text-main)' : '#1a1a1a' }}
                  >
                    {!isGroupAction && actorName && (
                      <strong
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notif.actor_id)
                            router.push(`/data?id=${notif.actor_id}`);
                        }}
                        style={{ cursor: 'pointer', marginRight: '4px' }}
                      >
                        {actorName}
                      </strong>
                    )}
                    <span dangerouslySetInnerHTML={{ __html: messageHtml }} />
                  </div>
                  <span
                    className="notif-date"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {formatDate(notif.created_at)}
                  </span>
                </div>

                <div className="notif-action-area">
                  {notif.type === 'follow' && notif.actor_id && (
                    <button
                      className={`notif-follow-btn ${
                        isFollowing ? 'followed' : ''
                      }`}
                      style={{
                        background: isFollowing
                          ? isDark
                            ? 'var(--bg-secondary)'
                            : '#f0f0f0'
                          : '#1f3cff',
                        color: isFollowing
                          ? isDark
                            ? 'var(--text-main)'
                            : '#1a1a1a'
                          : 'white',
                        border: isFollowing
                          ? `1px solid ${
                              isDark ? 'var(--border-card)' : '#e0e0e0'
                            }`
                          : 'none',
                      }}
                      onClick={(e) => handleFollowBack(e, notif.actor_id!)}
                    >
                      {isFollowing ? 'Mengikuti' : 'Ikuti Balik'}
                    </button>
                  )}
                  {thumbUrl && (
                    <img
                      src={thumbUrl}
                      className="notif-post-thumb"
                      alt="post thumbnail"
                    />
                  )}
                </div>
                {!notif.is_read && (
                  <div
                    className="notif-unread-dot"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      right: '15px',
                      width: '10px',
                      height: '10px',
                      background: '#1f3cff',
                      borderRadius: '50%',
                      boxShadow: `0 0 0 2px ${
                        isDark ? 'var(--bg-main)' : '#ffffff'
                      }`,
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}