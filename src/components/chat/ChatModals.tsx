import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';

// --- Komponen Utama ---
export default function ChatModals({
  pendingImagePreview, setPendingImage, setPendingImagePreview, setImageCaption, imageCaption,
  handleSendImageFullScreen, isGroupSettingsOpen, setIsGroupSettingsOpen,
  groupModalTab, inviteSearch, setInviteSearch, handleAddMember, isUpdatingGroup, groupMembers,
  currentUser, headerInfo, handleGroupPhotoUpload, newGroupName, setNewGroupName, updateGroupInfo,
  isOwner, kickMember
}: any) {

  // State untuk fitur Crop
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Fungsi saat tombol Kirim ditekan
  const handleInstantSend = async () => {
    let finalImageData = pendingImagePreview; // Default gambar asli

    // Jika user sedang dalam mode crop, proses gambar terlebih dahulu
    if (isCropping && croppedAreaPixels) {
      try {
        const croppedBlob = await getCroppedImg(pendingImagePreview, croppedAreaPixels);
        finalImageData = croppedBlob; 
      } catch (e) {
        console.error("Gagal melakukan crop gambar", e);
      }
    }

    // 1. Eksekusi fungsi kirim ke parent component
    // Pastikan parent function ini bisa menerima format Blob/File (jika di-crop) atau URL asli
    handleSendImageFullScreen(finalImageData, imageCaption);

    // 2. Langsung reset & tutup modal SEketika (agar upload pindah ke background/bubble)
    setPendingImage(null);
    setPendingImagePreview(null);
    setImageCaption('');
    setIsCropping(false);
    setZoom(1);
  };

  return (
    <>
      <AnimatePresence>
        {pendingImagePreview && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ position: 'fixed', inset: 0, background: 'var(--bg-main)', zIndex: 9999999, display: 'flex', flexDirection: 'column' }}
          >
            {/* HEADER */}
            <div style={{ flexShrink: 0, padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000000', zIndex: 10 }}>
              <button 
                onClick={() => { setPendingImage(null); setPendingImagePreview(null); setImageCaption(''); setIsCropping(false); }} 
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <span className="material-icons" style={{fontSize: '28px'}}>close</span>
              </button>
              
              <span style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>
                {isCropping ? 'Potong Gambar' : 'Kirim Foto'}
              </span>
              
              {/* Toggle Mode Crop */}
              <button 
                style={{ background: 'none', border: 'none', color: isCropping ? 'var(--primary-blue)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
                onClick={() => setIsCropping(!isCropping)}
              >
                <span className="material-icons" style={{fontSize: '24px'}}>crop</span>
              </button>
            </div>

            {/* AREA GAMBAR / CROPPER */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isCropping ? (
                <Cropper
                  image={pendingImagePreview}
                  crop={crop}
                  zoom={zoom}
                  aspect={1} // Bisa diubah sesuai kebutuhan (misal 4/3, 16/9, atau hilangkan aspect untuk bebas)
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              ) : (
                <img 
                  src={pendingImagePreview} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  alt="preview full" 
                />
              )}
            </div>

            {/* FOOTER & INPUT CHAT */}
            <div style={{ flexShrink: 0, padding: '12px 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div className="slim-input-wrapper" style={{ flex: 1, background: 'var(--bg-secondary)' }}>
                <textarea 
                  placeholder="Tambahkan keterangan..." 
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  rows={1}
                  style={{ width: '100%', padding: '8px 4px', fontSize: '15px', color: 'var(--text-main)', background: 'transparent', border: 'none', outline: 'none', resize: 'none' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                  }}
                  autoFocus={!isCropping}
                />
              </div>
              
              {/* Tombol Kirim Instan tanpa menunggu loading isUploadingImg */}
              <button onClick={handleInstantSend} className="send-btn-round">
                 <span className="material-icons">send</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SISA KODE MODAL GRUP (Tidak berubah, disingkat agar fokus) */}
      <AnimatePresence>
        {isGroupSettingsOpen && (
             // ... Isi modal grup dari kode Anda sebelumnya ...
             <div></div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- Fungsi Utility Untuk Mengekstrak Hasil Crop menjadi File (Blob) ---
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

  // Set ukuran canvas sesuai ukuran asli gambar
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);

  // Buat canvas baru untuk hasil potongan
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) return null;

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  // Potong dan pindahkan ke canvas baru
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Jadikan Blob (File gambar) untuk di-upload
  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.9); // Kualitas JPEG 90%
  });
}
