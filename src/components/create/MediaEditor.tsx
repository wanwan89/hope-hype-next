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
  videoEnd = MAX_VIDEO_CLIP, 
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
  handleCancelCrop,
  handleRemoveVideo,
  handleSaveCrop,
  captureFrameAndSave,
  handleVideoLoadedMetadata,
  togglePlayVideo,
  setStep,
  setIsVideoPlaying
}: MediaEditorProps) {
  
  const [activeTab, setActiveTab] = useState<'trim' | 'cover' | 'format'>('trim');
  const isRotated = videoRotation === 90 || videoRotation === 270;

  return (
    <>
      {/* INJECT CSS GLOBAL (Khusus Komponen Ini): 
        - Mengatasi Material Icons yang tidak muncul
        - Mengatasi tampilan input range (slider) yang berantakan 
      */}
      <style>{`
        @import url('https://fonts.googleapis.com/icon?family=Material+Icons');

        .custom-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }
        .custom-slider:focus {
          outline: none;
        }
        .custom-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          background-color: #4b5563;
          border-radius: 8px;
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          margin-top: -6px;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background-color: #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* OVERLAY WRAPPER */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#000000', color: '#ffffff',
        display: 'flex', flexDirection: 'column',
        zIndex: 99999, height: '100vh', width: '100vw',
        overflow: 'hidden', fontFamily: 'sans-serif'
      }}>
        
        {/* 1. HEADER */}
        <div style={{
          flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px', backgroundColor: 'rgba(0, 0, 0, 0.9)', borderBottom: '1px solid #27272a', zIndex: 10
        }}>
          <button 
            onClick={() => { 
              if (postType === 'image') handleCancelCrop(); 
              else { handleRemoveVideo(); setStep('post'); } 
            }} 
            style={{
              background: 'transparent', border: 'none', color: '#fff', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#27272a'
            }}
          >
            <span className="material-icons">close</span>
          </button>
          
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
            {postType === 'image' 
              ? `Edit Foto (${croppedImagesCount + 1}/${croppedImagesCount + rawImagesCount})` 
              : 'Editor Video'}
          </p>
          
          <button 
            disabled={isProcessingEdit} 
            onClick={postType === 'image' ? handleSaveCrop : captureFrameAndSave} 
            style={{
              backgroundColor: isProcessingEdit ? '#4b5563' : '#ffffff',
              color: isProcessingEdit ? '#9ca3af' : '#000000',
              border: 'none', padding: '6px 16px', borderRadius: '20px',
              fontWeight: 'bold', fontSize: '14px', cursor: isProcessingEdit ? 'not-allowed' : 'pointer'
            }}
          >
            {isProcessingEdit ? 'Memproses...' : 'Selesai'}
          </button>
        </div>

        {/* 2. WORKSPACE (CANVAS UTAMA) */}
        <div style={{
          flex: 1, position: 'relative', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', 
          backgroundColor: '#09090b', overflow: 'hidden'
        }}>
          
          {/* KONDISI: JIKA FOTO */}
          {postType === 'image' && imageForCrop ? (
            /* FIX FOTO BLANK: Container wajib punya position absolute dan width/height 100% */
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
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
          ) : 
          
          /* KONDISI: JIKA VIDEO */
          postType === 'video' && rawVideoUrl ? (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video 
                ref={videoRef} 
                src={rawVideoUrl} 
                playsInline 
                muted={!isVideoPlaying} 
                loop 
                onLoadedMetadata={handleVideoLoadedMetadata}
                style={{ 
                  maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                  transform: `rotate(${videoRotation}deg)`,
                  scale: isRotated ? '0.8' : '1',
                  transition: 'transform 0.3s ease'
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {/* Overlay Play/Pause */}
              <div 
                onClick={togglePlayVideo} 
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 10
                }}
              >
                {!isVideoPlaying && (
                  <div style={{
                    backgroundColor: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '50%'
                  }}>
                    <span className="material-icons" style={{ fontSize: '40px', color: '#fff' }}>play_arrow</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* 3. FOOTER PANEL (ALAT EDITOR) */}
        <div style={{
          flexShrink: 0, backgroundColor: '#18181b', padding: '16px 16px 32px 16px',
          borderTopLeftRadius: '20px', borderTopRightRadius: '20px', position: 'relative', zIndex: 20
        }}>
          
          {postType === 'image' ? (
            // Slider Zoom Foto
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px 16px' }}>
              <span className="material-icons" style={{ color: '#9ca3af' }}>remove</span>
              <input 
                type="range" 
                className="custom-slider"
                style={{ flex: 1 }}
                value={zoom} min={1} max={3} step={0.1} 
                onChange={e => setZoom(Number(e.target.value))} 
              />
              <span className="material-icons" style={{ color: '#9ca3af' }}>add</span>
            </div>
          ) : (
            // Panel Video
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                
                {/* TAB: POTONG VIDEO */}
                {activeTab === 'trim' && (
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                      <span>Geser untuk memotong</span>
                      <span style={{ color: '#fff' }}>Durasi: {Math.min(videoDuration, videoEnd - videoStart).toFixed(1)}s</span>
                    </div>
                    
                    <div style={{ 
                      position: 'relative', height: '48px', backgroundColor: '#27272a', 
                      borderRadius: '8px', overflow: 'hidden', display: 'flex' 
                    }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
                        {videoThumbnails.map((thumb, idx) => (
                          <img key={idx} src={thumb} style={{ height: '100%', width: 'auto', flex: 1, objectFit: 'cover', opacity: 0.6 }} alt="frame" />
                        ))}
                      </div>
                      
                      <input 
                        type="range" 
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', opacity: 0, cursor: 'pointer', zIndex: 20 }}
                        min={0} max={Math.max(0, videoDuration - MAX_VIDEO_CLIP)} step={0.1} 
                        value={videoStart} 
                        onChange={e => { 
                          const val = Number(e.target.value); 
                          setVideoStart(val);
                          if(setVideoEnd) setVideoEnd(val + MAX_VIDEO_CLIP);
                          if (videoRef.current) { 
                            videoRef.current.currentTime = val; 
                            videoRef.current.play(); 
                            setIsVideoPlaying(true); 
                          } 
                          if (coverTime < val || coverTime > val + MAX_VIDEO_CLIP) setCoverTime(val); 
                        }} 
                      />
                      
                      {/* Visual Box Potongan */}
                      <div style={{ 
                        position: 'absolute', top: 0, bottom: 0, zIndex: 10, pointerEvents: 'none',
                        borderTop: '4px solid #fff', borderBottom: '4px solid #fff', borderLeft: '4px solid #fff',
                        backgroundColor: 'rgba(255,255,255,0.2)', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px',
                        left: `${(videoStart / videoDuration) * 100}%`,
                        width: `${(MAX_VIDEO_CLIP / videoDuration) * 100}%`,
                        minWidth: '20%'
                      }} />
                    </div>
                  </div>
                )}

                {/* TAB: SAMPUL */}
                {activeTab === 'cover' && (
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                      <span>Pilih frame untuk sampul</span>
                      <span style={{ color: '#fff' }}>{coverTime.toFixed(1)}s</span>
                    </div>
                    <div style={{ position: 'relative', height: '48px', backgroundColor: '#27272a', borderRadius: '8px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
                        {videoThumbnails.map((thumb, idx) => (
                          <img key={idx} src={thumb} style={{ height: '100%', width: 'auto', flex: 1, objectFit: 'cover', opacity: 0.5 }} alt="cover" />
                        ))}
                      </div>
                      <input 
                        type="range" 
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', opacity: 0, cursor: 'pointer', zIndex: 20 }}
                        min={videoStart} max={Math.min(videoDuration, videoStart + MAX_VIDEO_CLIP)} step={0.1} 
                        value={coverTime} 
                        onChange={e => { 
                          const val = Number(e.target.value); 
                          setCoverTime(val); 
                          if (videoRef.current) { 
                            videoRef.current.currentTime = val; 
                            videoRef.current.pause(); 
                            setIsVideoPlaying(false); 
                          } 
                        }} 
                      />
                      {/* Indikator Garis Sampul */}
                      <div style={{ 
                        position: 'absolute', top: 0, bottom: 0, width: '4px', backgroundColor: '#fff', zIndex: 10,
                        pointerEvents: 'none', borderRadius: '4px', boxShadow: '0 0 10px rgba(255,255,255,0.8)',
                        left: `${((coverTime - videoStart) / Math.min(videoDuration, MAX_VIDEO_CLIP)) * 100}%`,
                        transform: 'translateX(-50%)'
                      }} />
                    </div>
                  </div>
                )}

                {/* TAB: FORMAT / PUTAR */}
                {activeTab === 'format' && (
                  <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', gap: '32px' }}>
                    <button 
                      onClick={() => setVideoRotation && setVideoRotation(prev => (prev + 90) % 360)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                    >
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons">rotate_90_degrees_cw</span>
                      </div>
                      <span style={{ fontSize: '11px' }}>Putar 90°</span>
                    </button>
                    <button 
                      onClick={() => setVideoRotation && setVideoRotation(0)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                    >
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons">restart_alt</span>
                      </div>
                      <span style={{ fontSize: '11px' }}>Reset</span>
                    </button>
                  </div>
                )}

              </div>

              {/* MENU NAVIGASI BAWAH */}
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #27272a' }}>
                <button 
                  onClick={() => setActiveTab('trim')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: activeTab === 'trim' ? '#ffffff' : '#71717a' }}
                >
                  <span className="material-icons" style={{ fontSize: '28px' }}>content_cut</span>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>POTONG</span>
                </button>
                
                <button 
                  onClick={() => setActiveTab('cover')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: activeTab === 'cover' ? '#ffffff' : '#71717a' }}
                >
                  <span className="material-icons" style={{ fontSize: '28px' }}>crop_original</span>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>SAMPUL</span>
                </button>
                
                <button 
                  onClick={() => setActiveTab('format')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: activeTab === 'format' ? '#ffffff' : '#71717a' }}
                >
                  <span className="material-icons" style={{ fontSize: '28px' }}>crop_rotate</span>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>FORMAT</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
