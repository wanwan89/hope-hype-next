import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';

interface MediaItem {
  id: string;
  originalUrl: string;
  file: File | Blob | null;
  caption: string;
  croppedAreaPixels: any;
  croppedPreview: string | null;
}

// --- Komponen Utama ---
export default function ChatModals({
  pendingImagePreview, setPendingImage, setPendingImagePreview, setImageCaption, imageCaption,
  handleSendImageFullScreen, isGroupSettingsOpen, setIsGroupSettingsOpen,
  groupModalTab, inviteSearch, setInviteSearch, handleAddMember, isUpdatingGroup, groupMembers,
  currentUser, headerInfo, handleGroupPhotoUpload, newGroupName, setNewGroupName, updateGroupInfo,
  isOwner, kickMember
}: any) {

  // State untuk Multi Image
  const [images, setImages] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // State untuk fitur Crop
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Masukkan single image dari props lama ke state multi-image
  useEffect(() => {
    if (pendingImagePreview && images.length === 0) {
      setImages([{
        id: Math.random().toString(36).substring(7),
        originalUrl: pendingImagePreview,
        file: null, // Asumsikan state parent menangani file asli jika hanya 1
        caption: imageCaption || '',
        croppedAreaPixels: null,
        croppedPreview: null,
      }]);
      setCurrentIndex(0);
    }
  }, [pendingImagePreview]);

  const onCropComplete = useCallback((_croppedArea: any, croppedPixels: any) => {
    setImages(prev => {
      const newImages = [...prev];
      if (newImages[currentIndex]) {
        newImages[currentIndex].croppedAreaPixels = croppedPixels;
      }
      return newImages;
    });
  }, [currentIndex]);

  const handleSaveCrop = async () => {
    const currentImg = images[currentIndex];
    if (currentImg && currentImg.croppedAreaPixels) {
      try {
        const croppedBlob = await getCroppedImg(currentImg.originalUrl, currentImg.croppedAreaPixels);
        if (croppedBlob) {
          const croppedUrl = URL.createObjectURL(croppedBlob);
          setImages(prev => {
            const newImages = [...prev];
            newImages[currentIndex].croppedPreview = croppedUrl;
            return newImages;
          });
        }
      } catch (error) {
        console.error("Gagal membuat preview crop", error);
      }
    }
    setIsCropping(false);
  };

  const handleAddMorePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const remainingSlots = 10 - images.length;
      const allowedFiles = filesArray.slice(0, remainingSlots);

      const newImages = allowedFiles.map(file => ({
        id: Math.random().toString(36).substring(7),
        originalUrl: URL.createObjectURL(file),
        file: file,
        caption: '',
        croppedAreaPixels: null,
        croppedPreview: null,
      }));

      setImages(prev => [...prev, ...newImages]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    if (newImages.length === 0) {
      handleCloseModal();
    } else if (currentIndex >= newImages.length) {
      setCurrentIndex(newImages.length - 1);
    }
  };

  const handleCloseModal = () => {
    setPendingImage(null);
    setPendingImagePreview(null);
    setImageCaption('');
    setImages([]);
    setIsCropping(false);
  };

  // Fungsi saat tombol Kirim ditekan
  const handleInstantSend = async () => {
    // Proses semua gambar dalam array
    const processedImages = await Promise.all(images.map(async (img) => {
      let finalFile: Blob | File | string | null = img.file || img.originalUrl;

      // Jika ada hasil crop, proses jadi Blob
      if (img.croppedAreaPixels) {
        try {
          const croppedBlob = await getCroppedImg(img.originalUrl, img.croppedAreaPixels);
          if (croppedBlob) finalFile = croppedBlob;
        } catch (e) {
          console.error("Gagal melakukan crop gambar", e);
        }
      }
      return { fileData: finalFile, caption: img.caption };
    }));

    // Kirim secara iteratif agar sesuai dengan fungsi parent lama (Bisa diubah jadi passing array jika parent mendukung)
    processedImages.forEach((item) => {
      handleSendImageFullScreen(item.fileData, item.caption);
    });

    // Reset & Tutup Modal
    handleCloseModal();
  };

  const currentMedia = images[currentIndex];

  return (
    <>
      <AnimatePresence>
        {images.length > 0 && currentMedia && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ position: 'fixed', inset: 0, background: 'var(--bg-main)', zIndex: 9999999, display: 'flex', flexDirection: 'column' }}
          >
            {/* HEADER */}
            <div style={{ flexShrink: 0, padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000000', zIndex: 10 }}>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <span className="material-icons" style={{fontSize: '28px'}}>close</span>
              </button>
              
              <span style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>
                {isCropping ? 'Potong Gambar' : `Kirim Foto (${currentIndex + 1}/${images.length})`}
              </span>
              
              {isCropping ? (
                <button onClick={handleSaveCrop} style={{ background: 'none', border: 'none', color: '#4CAF50', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                  Selesai
                </button>
              ) : (
                <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setIsCropping(true)}>
                  <span className="material-icons" style={{fontSize: '24px'}}>crop</span>
                </button>
              )}
            </div>

            {/* AREA GAMBAR / CROPPER */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isCropping ? (
                <Cropper
                  image={currentMedia.originalUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1} 
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              ) : (
                <img 
                  src={currentMedia.croppedPreview || currentMedia.originalUrl} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  alt="preview full" 
                />
              )}
            </div>

            {/* THUMBNAIL CAROUSEL (Maks 10 Foto) */}
            {!isCropping && (
              <div style={{ padding: '10px 16px', background: '#111', display: 'flex', gap: '10px', overflowX: 'auto', alignItems: 'center', borderTop: '1px solid #333' }}>
                {images.map((img, idx) => (
                  <div key={img.id} style={{ position: 'relative', flexShrink: 0 }}>
                     <img 
                        src={img.croppedPreview || img.originalUrl} 
                        onClick={() => setCurrentIndex(idx)}
                        style={{ 
                          width: '56px', height: '56px', objectFit: 'cover', cursor: 'pointer',
                          border: currentIndex === idx ? '2px solid var(--primary-blue, #1f3cff)' : '2px solid transparent',
                          borderRadius: '8px', opacity: currentIndex === idx ? 1 : 0.5, transition: 'all 0.2s'
                        }} 
                        alt={`thumb-${idx}`}
                     />
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleRemovePhoto(idx); }}
                       style={{ position: 'absolute', top: -6, right: -6, background: '#ff4757', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', zIndex: 5, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                       ×
                     </button>
                  </div>
                ))}
                
                {/* Tombol Tambah Foto */}
                {images.length < 10 && (
                  <>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px dashed #777', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-icons">add</span>
                    </button>
                    <input type="file" multiple accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAddMorePhotos} />
                  </>
                )}
              </div>
            )}

            {/* FOOTER & INPUT CHAT */}
            <div style={{ flexShrink: 0, padding: '12px 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div className="slim-input-wrapper" style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '20px' }}>
                <textarea 
                  placeholder={images.length > 1 ? `Keterangan untuk foto ke-${currentIndex + 1}...` : "Tambahkan keterangan..."} 
                  value={currentMedia.caption}
                  onChange={(e) => {
                    const newImages = [...images];
                    newImages[currentIndex].caption = e.target.value;
                    setImages(newImages);
                  }}
                  rows={1}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '15px', color: 'var(--text-main)', background: 'transparent', border: 'none', outline: 'none', resize: 'none' }}
                  disabled={isCropping}
                />
              </div>
              
              <button onClick={handleInstantSend} className="send-btn-round" style={{ background: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                 <span className="material-icons">send</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGroupSettingsOpen && (
             // ... Isi modal grup dari kode Anda sebelumnya ...
             <div></div>
        )}
      </AnimatePresence>
    </>
  );
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) return null;

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob((blob) => {
      if (!blob) reject(new Error('Canvas is empty'));
      else resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}
