import { useRef } from 'react';

type Props = {
  coverPreviewUrl: string | null;
  existingVideoUrl: string | null;
  onVideoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveVideo: () => void;
};

export default function VideoUploader({
  coverPreviewUrl,
  existingVideoUrl,
  onVideoSelect,
  onRemoveVideo,
}: Props) {
  const videoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ marginTop: '20px' }}>
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        hidden
        onChange={onVideoSelect}
      />

      {!coverPreviewUrl ? (
        <div
          className="post-upload-area"
          onClick={() => videoInputRef.current?.click()}
          style={{
            width: '100%',
            height: '200px', 
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div
            className="post-upload-placeholder"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-bg)', 
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M18 7c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-3.333L22 17V7l-4 3.333z" />
            </svg>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '2 / 3', /* 🔥 KUNCI 1: Tetapkan ukuran rasio container agar ruang kosongnya terlihat */
            borderRadius: '16px',
            overflow: 'hidden',
            background: '#000', /* 🔥 Background hitam untuk menutupi ruang kosong tersebut */
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={coverPreviewUrl}
            alt="Cover Preview"
            style={{
              width: '100%',
              height: '100%', /* 🔥 KUNCI 2: Gambar harus memenuhi container */
              display: 'block',
              objectFit: 'contain', /* 🔥 KUNCI 3: Gambar tidak dipotong, sisa ruang akan diisi warna dari background container (#000) */
            }}
          />
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
            <span className="material-icons" style={{ fontSize: '20px' }}>
              delete
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
