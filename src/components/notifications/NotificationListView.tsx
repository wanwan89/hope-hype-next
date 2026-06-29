// components/notifications/NotificationListView.tsx
import React from 'react';

type Props = {
  title: string;
  notifs: any[];
  onBack: () => void;
  handleNotifClick: (notif: any) => void;
  handleFollowBack: (e: React.MouseEvent, id: string) => void;
  myFollowings: Set<string>;
  router: any;
  formatDate: (date: string) => string;
  getIconAndColor: (type: string) => { icon: string; color: string };
};

const NotificationListView: React.FC<Props> = ({
  title,
  notifs,
  onBack,
  handleNotifClick,
  handleFollowBack,
  myFollowings,
  router,
  formatDate,
  getIconAndColor,
}) => {
  return (
    <div className="notif-detail-view">
      <div className="notif-detail-header">
        <button className="back-btn" onClick={onBack}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>{title}</h2>
      </div>

      {notifs.length === 0 ? (
        <div className="notif-empty-state">
          <span className="material-icons" style={{ fontSize: 48, opacity: 0.3 }}>notifications_none</span>
          <p>Belum ada notifikasi</p>
        </div>
      ) : (
        notifs.map((notif) => {
          const { icon, color } = getIconAndColor(notif.type);
          const actor = notif.actor || notif.actors?.[0];
          const postThumb = notif.postData?.image_url?.split(',')[0] || notif.postData?.video_url || null;

          return (
            <div
              key={notif.id}
              className="notif-item"
              onClick={() => handleNotifClick(notif)}
            >
              <div className="notif-avatar-wrapper">
                {actor ? (
                  <img
                    src={actor.avatar_url || '/asets/png/profile.webp'}
                    alt=""
                    className="notif-avatar"
                  />
                ) : (
                  <div className="notif-avatar default-avatar">
                    <span className="material-icons">person</span>
                  </div>
                )}
                <div className="notif-icon-badge" style={{ background: color }}>
                  <span className="material-icons" style={{ fontSize: 12 }}>{icon}</span>
                </div>
              </div>

              <div className="notif-content">
                <div className="notif-text">
                  {notif.type === 'follow' ? (
                    <>
                      <b>{actor?.username || 'Seseorang'}</b> mulai mengikuti Anda
                    </>
                  ) : notif.type === 'story_likes' ? (
                    <>
                      <b>{actor?.username || 'Seseorang'}</b> menyukai cerita Anda
                    </>
                  ) : (
                    <>
                      <b>{actor?.username || 'Seseorang'}</b>{' '}
                      {notif.type.includes('like') && 'menyukai postingan Anda'}
                      {notif.type.includes('repost') && 'membagikan ulang postingan Anda'}
                      {notif.type.includes('save') && 'menyimpan postingan Anda'}
                      {notif.type.includes('comment') && 'mengomentari postingan Anda'}
                      {notif.message && `: "${notif.message}"`}
                      {notif.otherCount > 0 && ` dan ${notif.otherCount} lainnya`}
                    </>
                  )}
                </div>
                <span className="notif-date">{formatDate(notif.created_at)}</span>
              </div>

              {/* Thumbnail postingan */}
              {postThumb && (
                <div className="notif-post-thumb">
                  <img
                    src={postThumb}
                    alt="post"
                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                  />
                </div>
              )}

              {/* Tombol Follow */}
              {notif.type === 'follow' && !myFollowings.has(notif.actor_id) && (
                <div className="notif-action-area">
                  <button
                    className={`notif-follow-btn ${myFollowings.has(notif.actor_id) ? 'followed' : ''}`}
                    onClick={(e) => handleFollowBack(e, notif.actor_id)}
                  >
                    {myFollowings.has(notif.actor_id) ? 'Mengikuti' : 'Ikuti'}
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default NotificationListView;