import { useRef } from 'react';

type Props = {
  previewUrls: string[];
  existingImageUrl: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePreview: (idx: number) => void;
  destination: 'feed' | 'story';
};

export default function ImageUploader({
  previewUrls,
  existingImageUrl,
  onFileSelect,
  onRemovePreview,
  destination,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ marginTop: '20px' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        hidden
        onChange={onFileSelect}
      />

      {previewUrls.length === 0 ? (
        <div
          className="post-upload-area"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%',
            height: '200px',
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '2px dashed var(--border-card)',
          }}
        >
          <div
            className="post-upload-placeholder"
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <span
              className="material-icons"
              style={{
                fontSize: '40px',
                marginBottom: '10px',
                color: 'var(--primary-bg)',
              }}
            >
              add_photo_alternate
            </span>
            <div
              className="post-upload-text"
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-main)',
              }}
            >
              {existingImageUrl ? 'Ganti Foto Draf' : 'Pilih Foto (Max 3)'}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '10px',
          }}
        >
          {previewUrls.map((url, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                width: '120px',
                height: '160px',
                flexShrink: 0,
              }}
            >
              <img
                src={url}
                alt={`Preview ${i}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '12px',
                }}
              />
              <button
                type="button"
                onClick={() => onRemovePreview(i)}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '25px',
                  height: '25px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span className="material-icons" style={{ fontSize: '14px' }}>
                  close
                </span>
              </button>
            </div>
          ))}

          {previewUrls.length < 3 && destination === 'feed' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '120px',
                height: '160px',
                border: '2px dashed var(--border-card)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                color: 'var(--text-muted)',
              }}
            >
              <span className="material-icons" style={{ fontSize: '30px' }}>
                add
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}