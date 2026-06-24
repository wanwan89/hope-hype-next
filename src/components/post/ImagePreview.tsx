'use client';
import React from 'react';

type ImagePreviewProps = {
  imageUrl: string | null;
  onClose: () => void;
};

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageUrl, onClose }) => {
  // Jika tidak ada gambar, modal tidak akan dirender
  if (!imageUrl) return null;

  return (
    <div
      className="image-preview-overlay active"
      onClick={onClose}
      style={{
        position: 'fixed', // 🔥 FIX BUG 2: Paksa agar memblokir 100% layar HP
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh', // Pakai dvh untuk support browser mobile lebih baik
        zIndex: 999999, // Layer paling atas agar tidak tertutup navbar
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0,
        overscrollBehavior: 'contain', // Mencegah scroll bodi di background
      }}
    >
      <div
        className="image-preview-content"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: '16px', // Memberi sedikit jarak bernafas dari bezel layar
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()} // Mencegah modal ter-close saat yang di-klik bukan layar hitam
      >
        <img
          src={imageUrl}
          alt="Preview"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            cursor: 'zoom-out',
          }}
          onClick={onClose} // Klik gambar juga akan menutup preview
        />
      </div>
    </div>
  );
};

export default ImagePreview;
