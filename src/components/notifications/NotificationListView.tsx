'use client';
import React from 'react';

export default function NotificationListView({ 
  title, notifs, onBack, handleNotifClick, handleFollowBack, myFollowings, router, formatDate, getIconAndColor 
}: any) {
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
          notifs.map((notif: any) => {
            const { icon: typeIcon, color } = getIconAndColor(notif.type);
            const actorName = notif.actor?.username || "Sistem";
            const actorAvatar = notif.actor?.avatar_url || "/asets/png/profile.webp";
            const isFollowing = notif.actor_id ? myFollowings.has(notif.actor_id) : false;
            
            let messageHtml = "";
            let thumbUrl = null;

            if (notif.postData) {
               const imgs = notif.postData.image_url ? notif.postData.image_url.split(',') : [];
               thumbUrl = imgs.length > 0 ? imgs[0] : notif.postData.video_url;
            }

            if (notif.type === 'like') messageHtml = `menyukai postinganmu.`; 
            else if (notif.type === 'comment_like') messageHtml = `menyukai komentarmu.`; 
            else if (notif.type === 'comment') messageHtml = `berkomentar: <span style="color:var(--text-muted)">"${notif.message}"</span>`; 
            else if (notif.type === 'repost') messageHtml = `membagikan ulang karyamu.`; 
            else if (notif.type === 'save') messageHtml = `menyimpan karyamu.`; 
            else if (notif.type === 'follow') messageHtml = `mulai mengikuti Anda.`; 
            else if (notif.type === 'coin_receive') messageHtml = `Anda menerima koin: <strong style="color:#f59e0b">+${notif.amount}</strong><br/><span style="font-size: 12px; color:var(--text-muted)">${notif.description || 'Top up / Reward'}</span>`; 
            else if (notif.type === 'payment_status') messageHtml = `Status pembayaran Rp ${notif.amount?.toLocaleString('id-ID')} Anda saat ini: <strong style="text-transform: capitalize">${notif.status}</strong>.`; 
            else messageHtml = notif.message?.replace(/<b>(.*?)<\/b>/g, '') || "Ada notifikasi baru untukmu.";

            return (
              <div 
                key={notif.id} 
                className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                onClick={() => handleNotifClick(notif)}
              >
                <div className="notif-avatar-wrapper">
                  <img src={actorAvatar} alt={actorName} className="notif-avatar" onClick={(e) => { e.stopPropagation(); if (notif.actor_id) router.push(`/data?id=${notif.actor_id}`); }} />
                  <div className="notif-icon-badge" style={{ background: color }}>
                    <span className="material-icons">{typeIcon}</span>
                  </div>
                </div>
                
                <div className="notif-content">
                  <div className="notif-text">
                    <strong onClick={(e) => { e.stopPropagation(); if(notif.actor_id) router.push(`/data?id=${notif.actor_id}`); }}>{actorName}</strong> {messageHtml && <span dangerouslySetInnerHTML={{ __html: messageHtml }} />}
                  </div>
                  <span className="notif-date">{formatDate(notif.created_at)}</span>
                </div>

                <div className="notif-action-area">
                  {notif.type === 'follow' && notif.actor_id ? (
                     <button className={`notif-follow-btn ${isFollowing ? 'followed' : ''}`} onClick={(e) => handleFollowBack(e, notif.actor_id)}>
                       {isFollowing ? 'Mengikuti' : 'Ikuti Balik'}
                     </button>
                  ) : thumbUrl ? (
                     <img src={thumbUrl} className="notif-post-thumb" alt="post" />
                  ) : null}
                </div>
                {!notif.is_read && <div className="notif-unread-dot"></div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
