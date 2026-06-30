'use client';

import React, { useState } from 'react';
import Cropper from 'react-easy-crop';

interface MediaEditorProps {
  postType: 'image' | 'text' | 'video';
  croppedImagesCount: number;
  rawImagesCount: number;
  isProcessingEdit: boolean;

  // Image Props
  imageForCrop: string | null;
  crop: { x: number; y: number };
  zoom: number;
  setCrop: (crop: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  onCropComplete: (croppedArea: any, croppedAreaPixels: any) => void;
  handleSaveCrop: () => void;
  handleCancelCrop: () => void;

  // Video Props
  rawVideoUrl: string | null;
  isVideoPlaying: boolean;
  videoDuration: number;
  videoStart: number;
  videoEnd?: number;
  coverTime: number;
  videoRotation?: number;
  videoThumbnails: string[];
  MAX_VIDEO_CLIP: number;

  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  setVideoStart: (start: number) => void;
  setVideoEnd?: (end: number) => void;
  setCoverTime: (time: number) => void;
  setVideoRotation?: (rotation: number | ((prev: number) => number)) => void;

  // Video crop
  videoCropX: number;
  videoCropY: number;
  videoZoom: number;
  setVideoCropX: (x: number) => void;
  setVideoCropY: (y: number) => void;
  setVideoZoom: (zoom: number) => void;

  handleRemoveVideo: () => void;
  captureFrameAndSave: () => void;
  handleVideoLoadedMetadata: () => void;
  togglePlayVideo: () => void;
  setIsVideoPlaying: (playing: boolean) => void;
  setStep: (step: 'pick' | 'edit' | 'post') => void;
}

export default function MediaEditor({
  postType,
  croppedImagesCount,
  rawImagesCount,
  isProcessingEdit,
  imageForCrop,
  crop,
  zoom,
  rawVideoUrl,
  isVideoPlaying,
  videoDuration,
  videoStart,
  videoEnd,
  coverTime,
  videoRotation = 0,
  videoThumbnails,
  MAX_VIDEO_CLIP,
  videoRef,
  canvasRef,
  setCrop,
  setZoom,
  onCropComplete,
  setVideoStart,
  setVideoEnd,
  setCoverTime,
  setVideoRotation,
  videoCropX,
  videoCropY,
  videoZoom,
  setVideoCropX,
  setVideoCropY,
  setVideoZoom,
  handleCancelCrop,
  handleRemoveVideo,
  handleSaveCrop,
  captureFrameAndSave,
  handleVideoLoadedMetadata,
  togglePlayVideo,
  setStep,
  setIsVideoPlaying
}: MediaEditorProps) {
  const [activeTab, setActiveTab] = useState<'trim' | 'cover' | 'crop' | 'format'>('trim');

  const effectiveEnd = videoEnd ?? videoStart + MAX_VIDEO_CLIP;

  const Spinner = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </svg>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#000', color: '#fff',
      display: 'flex', flexDirection: 'column',
      zIndex: 99999, height: '100vh', width: '100vw',
      overflow: 'hidden', fontFamily: 'system-ui, sans-serif'
    }}>
      {/* HEADER */}
      <div style={{
        flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px', backgroundColor: 'rgba(0,0,0,0.9)', borderBottom: '1px solid #27272a', zIndex: 10
      }}>
        <button onClick={() => {
          if (postType === 'image') handleCancelCrop();
          else { handleRemoveVideo(); setStep('post'); }
        }} style={{
          background: 'transparent', border: 'none', color: '#fff',
          width: 36, height: 36, borderRadius: '50%', backgroundColor: '#27272a',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span className="material-icons">close</span>
        </button>

        <p style={{ margin: 0, fontSize: 15, fontWeight: 'bold' }}>
          {postType === 'image' ? `Edit Foto (${croppedImagesCount + 1}/${croppedImagesCount + rawImagesCount})` : 'Editor Video'}
        </p>

        <button disabled={isProcessingEdit}
          onClick={postType === 'image' ? handleSaveCrop : captureFrameAndSave}
          style={{
            backgroundColor: isProcessingEdit ? '#4b5563' : '#ffffff',
            color: isProcessingEdit ? '#9ca3af' : '#000',
            border: 'none', padding: '6px 16px', borderRadius: 20,
            fontWeight: 'bold', fontSize: 14, cursor: isProcessingEdit ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, minWidth: 100
          }}>
          {isProcessingEdit ? <><Spinner /> Memproses...</> : 'Selesai'}
        </button>
      </div>

      {/* WORKSPACE */}
      <div style={{
        flex: 1, position: 'relative', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#09090b', overflow: 'hidden'
      }}>
        {postType === 'image' && imageForCrop ? (
          <div style={{ position: 'absolute', inset: 0 }}>
            <Cropper image={imageForCrop} crop={crop} zoom={zoom} aspect={3/4}
              onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
          </div>
        ) : postType === 'video' && rawVideoUrl ? (
          <div style={{
            width: '100%', maxWidth: '100%', aspectRatio: '2/3',
            position: 'relative', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#000', overflow: 'hidden'
          }}>
            <video ref={videoRef} src={rawVideoUrl} playsInline muted={!isVideoPlaying} loop
              onLoadedMetadata={handleVideoLoadedMetadata}
              style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%', height: '100%',
                objectFit: 'contain',
                transform: `translate(${videoCropX}px, ${videoCropY}px) scale(${videoZoom}) rotate(${videoRotation}deg)`,
                transition: 'transform 0.1s ease',
                backgroundColor: '#000'
              }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {!isVideoPlaying && (
              <div onClick={togglePlayVideo} style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10
              }}>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 16, borderRadius: '50%' }}>
                  <span className="material-icons" style={{ fontSize: 40, color: '#fff' }}>play_arrow</span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* FOOTER CONTROLS */}
      <div style={{
        flexShrink: 0, backgroundColor: '#18181b',
        padding: '16px 16px 32px', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        position: 'relative', zIndex: 20
      }}>
        {postType === 'image' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '24px 16px' }}>
            <span className="material-icons" style={{ color: '#9ca3af' }}>remove</span>
            <input type="range" className="custom-slider" style={{ flex: 1 }}
              value={zoom} min={1} max={3} step={0.1}
              onChange={e => setZoom(Number(e.target.value))} />
            <span className="material-icons" style={{ color: '#9ca3af' }}>add</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {/* TAB TRIM */}
              {activeTab === 'trim' && (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                    <span>Geser untuk memotong durasi</span>
                    <span style={{ color: '#fff' }}>Durasi: {Math.min(videoDuration, effectiveEnd - videoStart).toFixed(1)}s</span>
                  </div>
                  <div style={{ position: 'relative', height: 48, backgroundColor: '#27272a', borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                      {videoThumbnails.map((thumb, idx) => (
                        <img key={idx} src={thumb} style={{ height: '100%', width: 'auto', flex: 1, objectFit: 'cover', opacity: 0.6 }} alt="frame" />
                      ))}
                    </div>
                    <input type="range"
                      style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', zIndex: 20 }}
                      min={0} max={Math.max(0, videoDuration - MAX_VIDEO_CLIP)} step={0.1} value={videoStart}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setVideoStart(val);
                        if(setVideoEnd) setVideoEnd(val + MAX_VIDEO_CLIP);
                        if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.play(); setIsVideoPlaying(true); }
                        if (coverTime < val || coverTime > val + MAX_VIDEO_CLIP) setCoverTime(val);
                      }} />
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, zIndex: 10, pointerEvents: 'none',
                      borderTop: '4px solid #fff', borderBottom: '4px solid #fff', borderLeft: '4px solid #fff',
                      backgroundColor: 'rgba(255,255,255,0.2)', borderTopLeftRadius: 6, borderBottomLeftRadius: 6,
                      left: `${(videoStart / videoDuration) * 100}%`,
                      width: `${(MAX_VIDEO_CLIP / videoDuration) * 100}%`, minWidth: '20%'
                    }} />
                  </div>
                </div>
              )}

              {/* TAB COVER */}
              {activeTab === 'cover' && (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                    <span>Pilih frame sampul</span>
                    <span style={{ color: '#fff' }}>{coverTime.toFixed(1)}s</span>
                  </div>
                  <div style={{ position: 'relative', height: 48, backgroundColor: '#27272a', borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                      {videoThumbnails.map((thumb, idx) => (
                        <img key={idx} src={thumb} style={{ height: '100%', width: 'auto', flex: 1, objectFit: 'cover', opacity: 0.5 }} alt="cover" />
                      ))}
                    </div>
                    <input type="range"
                      style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', zIndex: 20 }}
                      min={videoStart} max={Math.min(videoDuration, videoStart + MAX_VIDEO_CLIP)} step={0.1} value={coverTime}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setCoverTime(val);
                        if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.pause(); setIsVideoPlaying(false); }
                      }} />
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, width: 4, backgroundColor: '#fff', zIndex: 10,
                      pointerEvents: 'none', borderRadius: 4, boxShadow: '0 0 10px rgba(255,255,255,0.8)',
                      left: `${((coverTime - videoStart) / Math.min(videoDuration, MAX_VIDEO_CLIP)) * 100}%`,
                      transform: 'translateX(-50%)'
                    }} />
                  </div>
                </div>
              )}

              {/* TAB CROP (AREA VIDEO) */}
              {activeTab === 'crop' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
                    <span>Geser & perbesar area video</span>
                    <span>Zoom: {videoZoom.toFixed(1)}x</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="material-icons" style={{ fontSize: 20, color: '#9ca3af' }}>swap_horiz</span>
                    <input type="range" style={{ flex: 1 }}
                      min={-200} max={200} value={videoCropX}
                      onChange={e => setVideoCropX(Number(e.target.value))} />
                    <span className="material-icons" style={{ fontSize: 20, color: '#9ca3af' }}>swap_horiz</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="material-icons" style={{ fontSize: 20, color: '#9ca3af' }}>swap_vert</span>
                    <input type="range" style={{ flex: 1 }}
                      min={-200} max={200} value={videoCropY}
                      onChange={e => setVideoCropY(Number(e.target.value))} />
                    <span className="material-icons" style={{ fontSize: 20, color: '#9ca3af' }}>swap_vert</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="material-icons" style={{ fontSize: 20, color: '#9ca3af' }}>zoom_out</span>
                    <input type="range" style={{ flex: 1 }}
                      min={1} max={3} step={0.1} value={videoZoom}
                      onChange={e => setVideoZoom(Number(e.target.value))} />
                    <span className="material-icons" style={{ fontSize: 20, color: '#9ca3af' }}>zoom_in</span>
                  </div>
                  <button onClick={() => { setVideoCropX(0); setVideoCropY(0); setVideoZoom(1); }}
                    style={{ backgroundColor: '#27272a', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, alignSelf: 'center' }}>
                    Reset Crop
                  </button>
                </div>
              )}

              {/* TAB FORMAT (PUTAR) */}
              {activeTab === 'format' && (
                <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
                  <button onClick={() => setVideoRotation && setVideoRotation(prev => (prev + 90) % 360)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#fff' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 11 }}>Putar 90°</span>
                  </button>
                  <button onClick={() => setVideoRotation && setVideoRotation(0)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#fff' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <polyline points="23 20 23 14 17 14" />
                        <path d="M20.49 9A9 9 0 1 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 11 }}>Reset</span>
                  </button>
                </div>
              )}
            </div>

            {/* TAB NAVIGATION */}
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #27272a' }}>
              <TabButton icon="content_cut" label="POTONG" active={activeTab === 'trim'} onClick={() => setActiveTab('trim')} />
              <TabButton icon="crop_original" label="SAMPUL" active={activeTab === 'cover'} onClick={() => setActiveTab('cover')} />
              {/* Tab Crop menggunakan SVG khusus */}
              <button onClick={() => setActiveTab('crop')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: activeTab === 'crop' ? '#fff' : '#71717a' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z" />
                </svg>
                <span style={{ fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>CROP</span>
              </button>
              <TabButton icon="crop_rotate" label="FORMAT" active={activeTab === 'format'} onClick={() => setActiveTab('format')} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Komponen tombol tab kecil (reusable)
function TabButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      background: 'none', border: 'none', cursor: 'pointer',
      color: active ? '#ffffff' : '#71717a'
    }}>
      <span className="material-icons" style={{ fontSize: 28 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>{label}</span>
    </button>
  );
}