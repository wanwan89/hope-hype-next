 'use client';

import { supabase as sb } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';

interface HeaderRoomProps {
  roomInfo: {
    name: string;
    ownerAvatar: string;
    ownerName: string;
    ownerId: string;
  };
  onlineUsers: number;
  totalTaps: number;
  myUserId: string | null;
  isFollowingHost: boolean;
  setIsFollowingHost: (val: boolean) => void;
}

export default function HeaderRoom({
  roomInfo,
  onlineUsers,
  totalTaps,
  myUserId,
  isFollowingHost,
  setIsFollowingHost,
}: HeaderRoomProps) {
  
  const handleFollow = async () => {
    if (myUserId && roomInfo.ownerId) {
      setIsFollowingHost(true);
      await sb.from('followers').insert({ 
        follower_id: myUserId, 
        following_id: roomInfo.ownerId 
      });
      showNotif(`Mengikuti ${roomInfo.ownerName}`, 'success');
    }
  };

  return (
    <div className="vr-custom-header">
      <div className="vr-header-left">
        <img
          src={roomInfo.ownerAvatar || '/asets/png/profile.webp'}
          className="vr-owner-avatar"
          onClick={() => window.openUserProfile?.(roomInfo.ownerId)}
          alt="Owner"
        />
        <div className="vr-header-info">
          <h2 className="vr-room-name">{roomInfo.name}</h2>
          <div className="vr-room-stats">
            <span id="online-count">{onlineUsers}</span> online
            <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#ff4757' }}>
              <span className="material-icons" style={{ fontSize: '11px' }}>favorite</span> 
              {totalTaps.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="vr-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div 
          id="top-gifters-container" 
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '6px' }} 
          onClick={() => window.openTopGiftersModal?.()}
        ></div>

        {roomInfo.ownerId && roomInfo.ownerId !== myUserId && !isFollowingHost && (
          <button className="vr-btn-follow" onClick={handleFollow}>
            + Follow
          </button>
        )}
      </div>
    </div>
  );
}
