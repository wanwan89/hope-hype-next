import React, { useMemo } from 'react';
import { formatRelativeTime } from '@/lib/helpers';

type Props = {
  topComment: any;
};

export default function TopTanggapan({ topComment }: Props) {
  const rawAvatar = topComment?.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${topComment?.profiles?.username || 'User'}`;
  const optimizedAvatar = useMemo(() => {
    if (rawAvatar.includes('res.cloudinary.com') && !rawAvatar.includes('f_auto'))
      return rawAvatar.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
    return rawAvatar;
  }, [rawAvatar]);

  return (
    <div style={{ position: 'relative', marginTop: '14px', paddingTop: '14px' }}>
      {/* Garis vertikal thread */}
      <div
        style={{
          position: 'absolute',
          left: '20px',
          top: '0',
          bottom: '0',
          width: '2px',
          backgroundColor: 'var(--border-card)',
          zIndex: 0,
        }}
      />
      <div style={{ display: 'flex', gap: '10px', position: 'relative', zIndex: 2, paddingLeft: '8px' }}>
        <img
          src={optimizedAvatar}
          alt="Avatar"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            objectFit: 'cover',
            background: 'var(--bg-main)',
            flexShrink: 0,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main)' }}>
              {topComment.profiles?.full_name || topComment.profiles?.username || 'User'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              • {formatRelativeTime(topComment.created_at)}
            </span>
          </div>
          <p
            style={{
              margin: '2px 0 4px 0',
              fontSize: '13.5px',
              color: 'var(--text-main)',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {topComment.content}
          </p>
        </div>
      </div>
    </div>
  );
}