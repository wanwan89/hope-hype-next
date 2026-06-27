'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import Cropper from 'react-easy-crop';
import { getCroppedImg, showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import './Create.css';

// Import komponen
import CreateHeader from '@/components/create/CreateHeader';
import DestinationSelector from '@/components/create/DestinationSelector';
import PostTypeSelector from '@/components/create/PostTypeSelector';
import ImageUploader from '@/components/create/ImageUploader';
import VideoUploader from '@/components/create/VideoUploader';
import CaptionInput from '@/components/create/CaptionInput';
import MusicPicker from '@/components/create/MusicPicker';
import AdToggle from '@/components/create/AdToggle';
import SubmitButtons from '@/components/create/SubmitButtons';
import MusicSheet from '@/components/create/MusicSheet';

const CLOUDINARY_CLOUD_NAME = "dhhmkb8kl";
const CLOUDINARY_UPLOAD_PRESET = "post_hope";

// Toggle Switch dengan warna CSS variabel
const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      width: '42px',
      height: '24px',
      background: checked ? 'var(--primary)' : 'var(--bg-main)',
      border: checked ? '1px solid var(--primary)' : '1px solid var(--text-muted)',
      borderRadius: '20px',
      position: 'relative',
      cursor: 'pointer',
      transition: 'all 0.3s',
    }}
  >
    <div
      style={{
        width: '18px',
        height: '18px',
        background: '#fff',
        borderRadius: '50%',
        position: 'absolute',
        top: '2px',
        left: checked ? '20px' : '2px',
        transition: 'left 0.3s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}
    />
  </div>
);

function CreatePostContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams?.get('draft_id');

  // ---------- STATE ----------
  const [postType, setPostType] = useState<'image' | 'text' | 'video'>('image');
  const [destination, setDestination] = useState<'feed' | 'story'>('feed');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBusinessUser, setIsBusinessUser] = useState(false);
  const [isAd, setIsAd] = useState(false);

  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [saveToDevice, setSaveToDevice] = useState(false);

  const [rawImagesQueue, setRawImagesQueue] = useState<string[]>([]);
  const [croppedImages, setCroppedImages] = useState<Blob[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const [rawVideoFile, setRawVideoFile] = useState<File | null>(null);
  const [rawVideoUrl, setRawVideoUrl] = useState<string | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStart, setVideoStart] = useState(0);
  const [coverTime, setCoverTime] = useState(0);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverUrlPreview] = useState<string | null>(null);
  const [videoThumbnails, setVideoThumbnails] = useState<string[]>([]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const [searchMusic, setSearchMusic] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isMusicSheetOpen, setIsMusicSheetOpen] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [showPopup, setShowPopup] = useState<'none' | 'mention' | 'hashtag'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [popupResults, setPopupResults] = useState<any[]>([]);

  const [step, setStep] = useState<'pick' | 'edit' | 'post'>('post');
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [imageForCrop, setImageForCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null); // ref textarea untuk popup

  const MAX_VIDEO_CLIP = 60;

  // ==================== EFFECTS ====================
  // ... (semua useEffect tetap sama seperti kode Anda, tidak berubah) ...
  // Saya tuliskan ringkas di sini, tapi di file final Anda harus menyertakan semuanya.
  useEffect(() => { /* load draft */ }, [draftId]);
  useEffect(() => { /* cek business user */ }, []);
  useEffect(() => { /* popup mention/hashtag */ }, [searchQuery, showPopup]);
  useEffect(() => { /* music search */ }, [searchMusic]);

  // ==================== HANDLERS ====================
  const handleClose = () => { audioRef.current?.pause(); router.back(); };
  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCaption(val);
    const pos = e.target.selectionStart || 0;
    const before = val.slice(0, pos);
    const mentionMatch = before.match(/(?:^|\s)@(\w*)$/);
    const hashtagMatch = before.match(/(?:^|\s)#(\w*)$/);
    if (mentionMatch) {
      setShowPopup('mention');
      setSearchQuery(mentionMatch[1]);
    } else if (hashtagMatch) {
      setShowPopup('hashtag');
      setSearchQuery(hashtagMatch[1]);
    } else {
      setShowPopup('none');
    }
  };

  // 🔥 FIX: handler pemilihan item popup yang menggunakan captionInputRef
  const handleSelectPopupItem = (item: string) => {
    if (!captionInputRef.current) return;
    const cursor = captionInputRef.current.selectionStart || 0;
    const before = caption.slice(0, cursor);
    const after = caption.slice(cursor);
    let newBefore = '';
    if (showPopup === 'mention') {
      newBefore = before.replace(/@\w*$/, `@${item} `);
    } else {
      // hashtag: item mungkin sudah berisi '#' dari database
      newBefore = before.replace(/#\w*$/, `${item.startsWith('#') ? item : `#${item}`} `);
    }
    setCaption(newBefore + after);
    setShowPopup('none');
    // Fokus kembali ke textarea
    captionInputRef.current.focus();
  };

  // ---------- GAMBAR ----------
  // ... (handleFileChange, onCropComplete, handleSaveCrop, dll. tetap sama) ...

  // ---------- VIDEO ----------
  // ... (generateVideoThumbnails, handleVideoSelect, dll. tetap sama) ...

  // ---------- UPLOAD & SUBMIT ----------
  // ... (submitPostAction tetap sama, tidak perlu diubah) ...

  // ---------- EDITOR SCREEN (FULL FIX VARIABEL) ----------
  const renderEditorScreen = () => {
    if (step !== 'edit') return null;

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'var(--bg-editor)',
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '15px 20px',
          background: 'var(--modal-overlay)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-editor)',
        }}>
          <button
            onClick={() => {
              if (postType === 'image') handleCancelCrop();
              else { handleRemoveVideo(); setStep('post'); }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-editor)',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span className="material-icons">arrow_back</span>
          </button>
          <p style={{
            color: 'var(--text-editor)',
            fontSize: '16px',
            fontWeight: 600,
            margin: 0,
          }}>
            {postType === 'image'
              ? `Atur Foto (${croppedImages.length + 1}/${croppedImages.length + rawImagesQueue.length})`
              : 'Edit Video'}
          </p>
          <button
            disabled={isProcessingEdit}
            onClick={postType === 'image' ? handleSaveCrop : captureFrameAndSave}
            style={{
              background: isProcessingEdit ? '#555' : 'var(--primary)',
              border: 'none',
              color: 'var(--text-editor)',
              padding: '8px 16px',
              borderRadius: '20px',
              fontWeight: 800,
              cursor: isProcessingEdit ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            {isProcessingEdit ? 'Memproses...' : 'Selesai'}
          </button>
        </div>

        {/* Konten crop/video */}
        <div style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: '#000',
          padding: '10px',
        }}>
          {/* Cropper gambar */}
          {postType === 'image' && imageForCrop && (
            <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: '16px', overflow: 'hidden' }}>
              <Cropper
                image={imageForCrop}
                crop={crop}
                zoom={zoom}
                aspect={3 / 4}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
          )}

          {/* Preview video */}
          {postType === 'video' && rawVideoUrl && (
            <div style={{
              width: 'auto',
              height: '100%',
              maxWidth: '100%',
              position: 'relative',
              overflow: 'hidden',
              aspectRatio: '2/3',
              borderRadius: '16px',
              border: '1px solid var(--border-editor)',
            }}>
              <video
                ref={videoRef}
                src={rawVideoUrl}
                playsInline
                muted={!isVideoPlaying}
                loop
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                onLoadedMetadata={handleVideoLoadedMetadata}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div
                onClick={togglePlayVideo}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isVideoPlaying ? 'transparent' : 'var(--modal-overlay)',
                  cursor: 'pointer',
                  transition: '0.2s',
                }}
              >
                {!isVideoPlaying && (
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    padding: '15px',
                    borderRadius: '50%',
                  }}>
                    <span className="material-icons" style={{ fontSize: '40px', color: '#fff' }}>
                      play_arrow
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer kontrol */}
        <div style={{
          flexShrink: 0,
          padding: '20px',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
          background: 'var(--bg-editor)',
          borderTop: '1px solid var(--border-editor)',
        }}>
          {postType === 'image' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-editor)' }}>
              <span className="material-icons" style={{ fontSize: '20px' }}>remove</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--primary)' }}
              />
              <span className="material-icons" style={{ fontSize: '20px' }}>add</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Potong video */}
              <div className="editor-control-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-editor)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-icons" style={{ fontSize: '16px', color: 'var(--primary)' }}>content_cut</span>
                    Potong Video (Max {MAX_VIDEO_CLIP}s)
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
                    {videoStart.toFixed(1)}s - {Math.min(videoDuration, videoStart + MAX_VIDEO_CLIP).toFixed(1)}s
                  </span>
                </div>
                <div className="filmstrip-box">
                  <div className="filmstrip-images">
                    {videoThumbnails.map((thumb, idx) => <img key={idx} src={thumb} alt="thumb" />)}
                  </div>
                  <input
                    type="range"
                    className="custom-range-timeline blue-slider"
                    min={0}
                    max={Math.max(0, videoDuration - MAX_VIDEO_CLIP)}
                    step={0.1}
                    value={videoStart}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setVideoStart(val);
                      if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.play(); setIsVideoPlaying(true); }
                      if (coverTime < val || coverTime > val + MAX_VIDEO_CLIP) setCoverTime(val);
                    }}
                  />
                </div>
              </div>

              {/* Pilih sampul */}
              <div className="editor-control-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-editor)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-icons" style={{ fontSize: '16px', color: 'var(--color-warning)' }}>image</span>
                    Pilih Sampul Depan
                  </span>
                  <span style={{ color: 'var(--color-warning)', fontSize: '12px', fontWeight: 600 }}>
                    Tampil di: {coverTime.toFixed(1)}s
                  </span>
                </div>
                <div className="filmstrip-box" style={{ height: '30px' }}>
                  <input
                    type="range"
                    className="custom-range-timeline orange-slider"
                    min={videoStart}
                    max={Math.min(videoDuration, videoStart + MAX_VIDEO_CLIP)}
                    step={0.1}
                    value={coverTime}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setCoverTime(val);
                      if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.pause(); setIsVideoPlaying(false); }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==================== RENDER UTAMA ====================
  return (
    <div className="create-page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '80px', paddingTop: 'env(safe-area-inset-top, 20px)' }}>
      {step === 'edit' && renderEditorScreen()}

      <MusicSheet
        isOpen={isMusicSheetOpen}
        onClose={() => { setIsMusicSheetOpen(false); audioRef.current?.pause(); setPlayingUrl(null); }}
        searchMusic={searchMusic}
        setSearchMusic={setSearchMusic}
        isSearching={isSearching}
        musicResults={musicResults}
        playingUrl={playingUrl}
        onTogglePreview={togglePlayPreview}
        onSelect={(song) => { setSelectedMusic(song); audioRef.current?.pause(); setPlayingUrl(null); setIsMusicSheetOpen(false); }}
        t={t}
      />

      {step === 'post' && (
        <>
          <CreateHeader draftId={draftId} onClose={handleClose} />

          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <div className="post-form">
              <DestinationSelector destination={destination} setDestination={setDestination} visibility={visibility} setVisibility={setVisibility} t={t} />
              <PostTypeSelector postType={postType} setPostType={setPostType} onReset={() => { setCroppedImages([]); setPreviewUrls([]); handleRemoveVideo(); setExistingImageUrl(null); setExistingVideoUrl(null); }} />

              {postType === 'image' && (
                <ImageUploader
                  previewUrls={previewUrls}
                  existingImageUrl={existingImageUrl}
                  onFileSelect={handleFileChange}
                  onRemovePreview={handleRemovePreview}
                  destination={destination}
                />
              )}

              {postType === 'video' && (
                <VideoUploader
                  coverPreviewUrl={coverPreviewUrl}
                  existingVideoUrl={existingVideoUrl}
                  onVideoSelect={handleVideoSelect}
                  onRemoveVideo={handleRemoveVideo}
                />
              )}

              {/* 🔥 Berikan inputRef agar popup bisa mengakses textarea */}
              <CaptionInput
                caption={caption}
                onChange={handleCaptionChange}
                onKeyDown={(e) => {
                  if (showPopup !== 'none' && e.key === "Enter") {
                    e.preventDefault();
                    if (popupResults.length > 0) {
                      handleSelectPopupItem(showPopup === 'mention' ? popupResults[0].username : popupResults[0].tag);
                    }
                  }
                }}
                postType={postType}
                wordCount={countWords(caption)}
                maxWords={postType === 'text' ? 150 : 100}
                showPopup={showPopup}
                popupResults={popupResults}
                onSelectPopupItem={handleSelectPopupItem}
                inputRef={captionInputRef}   // ✅ prop baru
              />

              <MusicPicker
                selectedMusic={selectedMusic}
                onOpenSheet={() => setIsMusicSheetOpen(true)}
                onRemove={() => { setSelectedMusic(null); if (playingUrl === selectedMusic?.previewUrl) audioRef.current?.pause(); }}
              />

              {isBusinessUser && <AdToggle isAd={isAd} setIsAd={setIsAd} />}

              {/* Opsi Lainnya – border pakai bg-input */}
              {destination === 'feed' && (
                <div style={{
                  marginTop: '16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  border: '1px solid var(--bg-input)',   // ✅ diperbaiki
                }}>
                  <div
                    onClick={() => setShowMoreOptions(!showMoreOptions)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-icons" style={{ fontSize: '18px' }}>settings</span> Opsi Lainnya
                    </span>
                    <span className="material-icons" style={{
                      color: 'var(--text-muted)',
                      transform: showMoreOptions ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease',
                    }}>
                      expand_more
                    </span>
                  </div>

                  {showMoreOptions && (
                    <div style={{
                      marginTop: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      borderTop: '1px solid var(--bg-input)', // ✅
                      paddingTop: '16px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Izinkan Komentar</p>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Orang lain bisa mengomentari ini</p>
                        </div>
                        <ToggleSwitch checked={allowComments} onChange={setAllowComments} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Simpan ke Perangkat</p>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Otomatis simpan media yang diedit</p>
                        </div>
                        <ToggleSwitch checked={saveToDevice} onChange={setSaveToDevice} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <SubmitButtons
                isSubmitting={isSubmitting}
                destination={destination}
                draftId={draftId}
                onSubmit={submitPostAction}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}></div>}>
      <CreatePostContent />
    </Suspense>
  );
}