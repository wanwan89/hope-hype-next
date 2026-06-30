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
          }}
        >
          <div
            className="post-upload-placeholder"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* ✅ Icon Foto SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M9 14h10l-3.45-4.5l-2.3 3l-1.55-2zm-1 4q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm0-2h12V4H8zm-4 6q-.825 0-1.412-.587T2 20V6h2v14h14v2z"
              />
            </svg>
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
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                color: 'var(--text-muted)',
                background: 'var(--bg-secondary)',
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