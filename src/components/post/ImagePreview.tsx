'use client';
import React from 'react';

type ImagePreviewProps = {
  imageUrl: string | null;
  onClose: () => void;
};

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageUrl, onClose }) => {
  return (
    <div
      className={`image-preview-overlay ${imageUrl ? 'active' : ''}`}
      onClick={onClose}
      style={{
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="image-preview-content"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '95vw',
          maxHeight: '85vh',
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ImagePreview;