'use client';
import React from 'react';
import { getUserBadge } from '@/lib/ui-utils';

type Props = {
  isOpen: boolean;
  type: 'followers' | 'following';
  list: any[];
  isLoading: boolean;
  onClose: () => void;
  onUserClick: (userId: string) => void;
  t: (key: string, fallback?: string) => string;
};

const FollowModal: React.FC<Props> = ({ isOpen, type, list, isLoading, onClose, onUserClick, t }) => {
  return (
    <div className={`full-screen-modal ${isOpen ? 'open' : ''}`}>
      <div className="full-screen-header">
        <button className="icon-btn-header" onClick={onClose}><span className="material-icons">arrow_back</span></button>
        <h3>{type === 'followers' ? t('followers', 'Pengikut') : t('following', 'Mengikuti')}</h3>
        <div style={{width: '24px'}}></div>
      </div>
      <div className="full-screen-body no-padding">
        {isLoading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="follow-item-skeleton">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-text"></div>
            </div>
          ))
        ) : list.length === 0 ? (
          <div className="empty-follow-state">
            <span className="material-icons">group_off</span>
            <p>Belum ada {type === 'followers' ? 'pengikut' : 'yang diikuti'}.</p>
          </div>
        ) : (
          list.map(user => (
            <div key={user.id} className="follow-item" onClick={() => onUserClick(user.id)}>
              <img src={user.avatar_url || '/asets/png/profile.webp'} alt="Avatar" />
              <div className="follow-item-info">
                <span className="follow-username">
                  {user.username} <span dangerouslySetInnerHTML={{ __html: getUserBadge(user.role) }} />
                </span>
                <span className="follow-handle">@{(user.username || 'user').toLowerCase().replace(/\s/g, '')}</span>
              </div>
              <span className="material-icons" style={{color: '#8a8b91'}}>chevron_right</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default React.memo(FollowModal);