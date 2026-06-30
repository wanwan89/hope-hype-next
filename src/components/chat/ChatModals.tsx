import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';

interface MediaItem {
  id: string;
  originalUrl: string;
  file: File | null;
  caption: string;
  croppedAreaPixels: any;
  croppedPreview: string | null;
  croppedFile: File | null;
}

export default function ChatModals({
  isImageModalOpen,
  onCloseImageModal,
  onSendImage,
  isGroupSettingsOpen,
  setIsGroupSettingsOpen,
  groupModalTab,
  inviteSearch,
  setInviteSearch,
  handleAddMember,
  isUpdatingGroup,
  groupMembers,
  currentUser,
  headerInfo, 
  handleGroupPhotoUpload,
  newGroupName,
  setNewGroupName,
  updateGroupInfo,
  isOwner,
  kickMember,
}: any) {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  
  const [croppedPixels, setCroppedPixels] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isImageModalOpen) {
      setImages([]);
      setCurrentIndex(0);
      setIsCropping(false);
    }
  }, [isImageModalOpen]);

  useEffect(() => {
    setCroppedPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, [currentIndex, isCropping]);

  const handleInitialFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).slice(0, 10);
      const newImages = filesArray.map(file => ({
        id: Math.random().toString(36).substring(7),
        originalUrl: URL.createObjectURL(file),
        file,
        caption: '',
        croppedAreaPixels: null,
        croppedPreview: null,
        croppedFile: null,
      }));
      setImages(newImages);
      setCurrentIndex(0);
    }
  };

  const handleAddMorePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const remainingSlots = 10 - images.length;
      const allowedFiles = filesArray.slice(0, remainingSlots);
      const newImages = allowedFiles.map(file => ({
        id: Math.random().toString(36).substring(7),
        originalUrl: URL.createObjectURL(file),
        file,
        caption: '',
        croppedAreaPixels: null,
        croppedPreview: null,
        croppedFile: null,
      }));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    if (newImages.length === 0) {
      onCloseImageModal();
    } else if (currentIndex >= newImages.length) {
      setCurrentIndex(newImages.length - 1);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, currentCroppedPixels: any) => {
    setCroppedPixels(currentCroppedPixels);
  }, []);

  const handleSaveCrop = async () => {
    const currentImg = images[currentIndex];
    
    if (currentImg && croppedPixels) {
      try {
        const croppedBlob = await getCroppedImg(currentImg.originalUrl, croppedPixels);
        if (croppedBlob) {
          const croppedUrl = URL.createObjectURL(croppedBlob);
          const originalName = (currentImg.file as File)?.name || `image_${Date.now()}.jpg`;
          const croppedFile = new File([croppedBlob], `cropped_${originalName}`, { type: croppedBlob.type || 'image/jpeg' });

          setImages(prev => prev.map((img, idx) => 
            idx === currentIndex 
              ? { ...img, croppedPreview: croppedUrl, croppedFile: croppedFile, croppedAreaPixels: croppedPixels } 
              : img
          ));
        }
      } catch (error) {
        console.error("Gagal membuat preview crop", error);
      }
    }
    setIsCropping(false);
  };

  const handleInstantSend = async () => {
    for (const item of images) {
      const fileToSend = item.croppedFile || item.file || item.originalUrl;
      await onSendImage(fileToSend, item.caption);
    }
    onCloseImageModal();
  };

  const currentMedia = images[currentIndex];

  return (
    <>
      {/* ====== MODAL GAMBAR MULTI‑IMAGE + CROP ====== */}
      <AnimatePresence>
        {isImageModalOpen && (
          <>
            {images.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed', inset: 0, zIndex: 9999999,
                  background: 'rgba(0, 0, 0, 0.6)', // Backdrop redup
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '20px'
                }}
              >
                <div style={{
                  background: 'var(--bg-panel)', // Menyesuaikan Dark/Light Mode
                  padding: '32px',
                  borderRadius: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                  width: '100%',
                  maxWidth: '320px'
                }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'var(--bg-secondary)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: '20px'
                  }}>
                    <span className="material-icons" style={{ fontSize: '32px', color: 'var(--text-muted)' }}>add_photo_alternate</span>
                  </div>
                  
                  <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', fontSize: '18px' }}>Kirim Foto</h3>
                  <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                    Pilih foto dari perangkatmu untuk dibagikan.
                  </p>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      background: 'var(--primary-blue)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '14px',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginBottom: '12px'
                    }}
                  >
                    Pilih Foto
                  </button>
                  <button
                    onClick={onCloseImageModal}
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '14px',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Batal
                  </button>
                </div>

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleInitialFileSelect}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{
                  position: 'fixed', inset: 0, background: 'var(--bg-main)',
                  zIndex: 9999999, display: 'flex', flexDirection: 'column',
                }}
              >
                {/* Header */}
                <div style={{
                  flexShrink: 0, padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top))',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#000', zIndex: 10,
                }}>
                  <button onClick={onCloseImageModal} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <span className="material-icons" style={{ fontSize: '28px' }}>close</span>
                  </button>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>
                    {isCropping ? 'Potong Gambar' : `Kirim Foto (${currentIndex + 1}/${images.length})`}
                  </span>
                  {isCropping ? (
                    <button onClick={handleSaveCrop} style={{ background: 'none', border: 'none', color: '#4CAF50', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                      Selesai
                    </button>
                  ) : (
                    <button onClick={() => setIsCropping(true)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                      <span className="material-icons" style={{ fontSize: '24px' }}>crop</span>
                    </button>
                  )}
                </div>

                {/* Area Gambar / Cropper */}
                <div style={{
                  flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden',
                  background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
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
                      alt="preview"
                    />
                  )}
                </div>

                {/* Thumbnail Carousel */}
                {!isCropping && (
                  <div style={{
                    padding: '10px 16px', background: '#111', display: 'flex', gap: '10px',
                    overflowX: 'auto', alignItems: 'center', borderTop: '1px solid #333',
                  }}>
                    {images.map((img, idx) => (
                      <div key={img.id} style={{ position: 'relative', flexShrink: 0 }}>
                        <img
                          src={img.croppedPreview || img.originalUrl}
                          onClick={() => setCurrentIndex(idx)}
                          style={{
                            width: '56px', height: '56px', objectFit: 'cover', cursor: 'pointer',
                            border: currentIndex === idx ? '2px solid var(--primary-blue)' : '2px solid transparent',
                            borderRadius: '8px', opacity: currentIndex === idx ? 1 : 0.5, transition: 'all 0.2s',
                          }}
                          alt={`thumb-${idx}`}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemovePhoto(idx); }}
                          style={{
                            position: 'absolute', top: -6, right: -6, background: '#ff4757', color: 'white',
                            border: 'none', borderRadius: '50%', width: '22px', height: '22px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '14px', zIndex: 5, boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {images.length < 10 && (
                      <>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            width: '56px', height: '56px', borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px dashed #777',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <span className="material-icons">add</span>
                        </button>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                          onChange={handleAddMorePhotos}
                        />
                      </>
                    )}
                  </div>
                )}

                {/* Footer & Input Caption */}
                <div style={{
                  flexShrink: 0, padding: '12px 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                  background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)',
                  display: 'flex', gap: '10px', alignItems: 'flex-end',
                }}>
                  <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '20px' }}>
                    <textarea
                      placeholder={images.length > 1 ? `Keterangan untuk foto ke-${currentIndex + 1}...` : "Tambahkan keterangan..."}
                      value={currentMedia?.caption || ''}
                      onChange={(e) => {
                        setImages(prev => prev.map((img, idx) => 
                          idx === currentIndex ? { ...img, caption: e.target.value } : img
                        ));
                      }}
                      rows={1}
                      style={{
                        width: '100%', padding: '10px 14px', fontSize: '15px',
                        color: 'var(--text-main)', background: 'transparent',
                        border: 'none', outline: 'none', resize: 'none',
                      }}
                      disabled={isCropping}
                    />
                  </div>
                  <button
                    onClick={handleInstantSend}
                    style={{
                      background: 'var(--primary-blue)', color: 'white', border: 'none',
                      borderRadius: '50%', width: '45px', height: '45px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <span className="material-icons">send</span>
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* ====== MODAL GROUP SETTINGS ====== */}
      <AnimatePresence>
        {isGroupSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999998,
              background: 'rgba(0,0,0,0.6)', display: 'flex',
              alignItems: 'flex-end', justifyContent: 'center',
            }}
            onClick={() => setIsGroupSettingsOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '500px', background: 'var(--bg-panel)',
                borderRadius: '20px 20px 0 0', padding: '20px',
                maxHeight: '80vh', overflowY: 'auto',
              }}
            >
              {/* Tab sederhana */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button
                  onClick={() => groupModalTab !== 'invite' && setInviteSearch('')}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '10px', border: 'none',
                    background: groupModalTab === 'invite' ? 'var(--primary-blue)' : 'var(--bg-secondary)',
                    color: groupModalTab === 'invite' ? 'white' : 'var(--text-main)',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Invite
                </button>
                {isOwner && (
                  <button
                    onClick={() => {}}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '10px', border: 'none',
                      background: groupModalTab === 'settings' ? 'var(--primary-blue)' : 'var(--bg-secondary)',
                      color: groupModalTab === 'settings' ? 'white' : 'var(--text-main)',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Settings
                  </button>
                )}
              </div>

              {/* Konten Tab */}
              {groupModalTab === 'invite' ? (
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                      placeholder="Username atau Short ID"
                      value={inviteSearch}
                      onChange={(e) => setInviteSearch(e.target.value)}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                        color: 'var(--text-main)', fontSize: '14px',
                      }}
                    />
                    <button
                      onClick={handleAddMember}
                      disabled={isUpdatingGroup}
                      style={{
                        padding: '10px 16px', borderRadius: '10px', background: 'var(--primary-blue)',
                        color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Tambah
                    </button>
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {groupMembers.map((member: any) => (
                      <div key={member.user_id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 0', borderBottom: '1px solid var(--border-color)',
                      }}>
                        <img
                          src={member.profiles?.avatar_url || '/asets/png/profile.webp'}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                          alt=""
                        />
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>
                          {member.profiles?.username || 'User'}
                        </span>
                        {isOwner && member.user_id !== currentUser?.id && (
                          <button
                            onClick={() => kickMember(member.user_id, member.profiles?.username)}
                            style={{
                              background: 'transparent', border: '1px solid #ff4757',
                              color: '#ff4757', borderRadius: '8px', padding: '4px 12px',
                              cursor: 'pointer', fontSize: '12px',
                            }}
                          >
                            Kick
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    Nama Grup
                  </label>
                  <input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '10px',
                      border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                      color: 'var(--text-main)', fontSize: '14px', marginBottom: '12px',
                    }}
                  />
                  <button
                    onClick={() => updateGroupInfo('name', newGroupName)}
                    disabled={isUpdatingGroup}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '10px',
                      background: 'var(--primary-blue)', color: 'white', border: 'none',
                      fontWeight: 600, cursor: 'pointer', marginBottom: '24px',
                    }}
                  >
                    Simpan Nama
                  </button>

                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                    Foto Grup
                  </label>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      position: 'relative',
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                    }}>
                      <img
                        src={headerInfo?.avatar || '/asets/png/profile.webp'}
                        alt="group avatar"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        cursor: 'pointer',
                      }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                        onClick={() => groupPhotoInputRef.current?.click()}
                      >
                        <span className="material-icons" style={{ color: 'white', fontSize: '32px' }}>photo_camera</span>
                      </div>
                    </div>

                    <button
                      onClick={() => groupPhotoInputRef.current?.click()}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--primary-blue)',
                        color: 'var(--primary-blue)',
                        borderRadius: '8px',
                        padding: '6px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: '18px' }}>upload</span>
                      Ganti Foto
                    </button>

                    <input
                      type="file"
                      accept="image/*"
                      ref={groupPhotoInputRef}
                      style={{ display: 'none' }}
                      onChange={handleGroupPhotoUpload}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
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

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0, 0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Canvas kosong'));
      else resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}
