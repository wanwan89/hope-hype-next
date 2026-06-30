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
}) => {

  const renderNotifText = (notif: any, actor: any) => {
    const name = actor?.username || 'Seseorang';
    const others = notif.otherCount > 0 ? (<span> dan <b>{notif.otherCount} lainnya</b></span>) : null;
    
    if (notif.type === 'follow') return <><b>{name}</b> mulai mengikuti Anda</>;
    if (notif.type === 'story_likes') return <><b>{name}</b> menyukai cerita Anda</>;
    
    if (notif.type.includes('like')) return <><b>{name}</b>{others} menyukai postingan Anda</>;
    if (notif.type.includes('repost')) return <><b>{name}</b>{others} membagikan ulang postingan Anda</>;
    if (notif.type.includes('save')) return <><b>{name}</b>{others} menyimpan postingan Anda</>;
    if (notif.type.includes('comment')) return <><b>{name}</b> mengomentari postingan Anda{notif.message ? `: "${notif.message}"` : ''}</>;
    
    if (notif.type === 'coin_receive') return <>Anda menerima koin: <b>{notif.amount}</b> {notif.description ? `(${notif.description})` : ''}</>;
    if (notif.type === 'payment_status') return <>Status pembayaran Anda: <b>{notif.status}</b></>;
    if (notif.type === 'withdraw_request') return <>Permintaan penarikan <b>{notif.amount}</b>: {notif.status}</>;
    if (notif.type === 'coin_history') return <>Riwayat Koin: <b>{notif.amount}</b> {notif.description ? `(${notif.description})` : ''}</>;
    
    if (notif.message) return <><b>{name}</b>: {notif.message}</>;
    
    return <><b>{name}</b> berinteraksi dengan Anda</>;
  };

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
          const actor = notif.actor || notif.actors?.[0];
          const postThumb = notif.postData?.image_url?.split(',')[0] || notif.postData?.video_url || null;

          return (
            <div
              key={notif.id}
              className="notif-item"
              onClick={() => handleNotifClick(notif)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <div className="notif-avatar-wrapper" style={{ position: 'relative' }}>
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
                {/* Badge Icon Dihilangkan Secara Keseluruhan */}
              </div>

              <div className="notif-content" style={{ flex: 1, paddingRight: '12px' }}>
                <div className="notif-text">
                  {renderNotifText(notif, actor)}
                </div>
                <span className="notif-date" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {formatDate(notif.created_at)}
                </span>
              </div>

              {/* Menampilkan Thumbnail Postingan Di Sebelah Kanan */}
              {postThumb && (
                <div className="notif-post-thumb" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  <img
                    src={postThumb}
                    alt="post"
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', display: 'block' }}
                  />
                </div>
              )}

              {/* Tombol Follow */}
              {notif.type === 'follow' && !myFollowings.has(notif.actor_id) && (
                <div className="notif-action-area" style={{ marginLeft: 'auto' }}>
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
