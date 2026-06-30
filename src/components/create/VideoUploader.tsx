import { useRef } from 'react';

type Props = {
  coverPreviewUrl: string | null;
  existingVideoUrl: string | null;
  onVideoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveVideo: () => void;
};

export default function VideoUploader({ coverPreviewUrl, existingVideoUrl, onVideoSelect, onRemoveVideo }: Props) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div style={{ marginTop: '20px' }}>
      <input type="file" ref={videoInputRef} accept="video/*" hidden onChange={onVideoSelect} />
      {!coverPreviewUrl ? (
        <div
          className="post-upload-area"
          onClick={() => videoInputRef.current?.click()}
          style={{
            width: '100%',
            height: '300px',
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '2px dashed var(--border-card)',
          }}
        >
          <div className="post-upload-placeholder" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <span
              className="material-icons"
              style={{ fontSize: '50px', marginBottom: '10px', color: 'var(--primary-bg)' }}
            >
              videocam
            </span>
            <div className="post-upload-text" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
              {existingVideoUrl ? 'Ganti Video Draf' : 'Pilih Video Vertikal'}
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>(Max 50MB)</div>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
          <img
            src={coverPreviewUrl}
            alt="Cover Preview"
            style={{ width: '100%', display: 'block', aspectRatio: '2/3', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              top: '15px',
              left: '15px',
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>play_circle_filled</span> Trimmed (15s)
          </div>
          <button
            type="button"
            onClick={onRemoveVideo}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'rgba(239, 68, 68, 0.9)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            }}
          >
            <span className="material-icons" style={{ fontSize: '20px' }}>delete</span>
          </button>
        </div>
      )}
    </div>
  );
}