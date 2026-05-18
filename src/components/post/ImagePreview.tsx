'use client';
import React from 'react';

type ImagePreviewProps = {
  imageUrl: string | null;
  onClose: () => void;
};

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageUrl, onClose }) => {
  return (
    <div className={`image-preview-overlay ${imageUrl ? 'active' : ''}`} onClick={onClose}>
      <div className="image-preview-content">
        {imageUrl && <img src={imageUrl} alt="Preview" />}
      </div>
    </div>
  );
};

export default ImagePreview;