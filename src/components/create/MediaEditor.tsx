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
  videoEnd?: number; // Tambahan baru
  coverTime: number;
  videoRotation?: number; // Tambahan baru: 0, 90, 180, 270
  videoThumbnails: string[];
  MAX_VIDEO_CLIP: number;
  
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  
  setVideoStart: (start: number) => void;
  setVideoEnd?: (end: number) => void; // Tambahan baru
  setCoverTime: (time: number) => void;
  setVideoRotation?: (rotation: number | ((prev: number) => number)) => void; // Tambahan baru
  
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
  
  // State untuk navigasi menu bawah pada editor video (Mirip Capcut)
  const [activeTab, setActiveTab] = useState<'trim' | 'cover' | 'format'>('trim');

  // Menghitung rotasi untuk styling CSS
  const isRotated = videoRotation === 90 || videoRotation === 270;

  return (
    <div className="editor-screen-overlay bg-black text-white h-screen w-full flex flex-col fixed inset-0 z-50">
      
      {/* 1. Header Editor */}
      <div className="editor-screen-header flex justify-between items-center p-4 bg-black/80 backdrop-blur-sm z-10">
        <button 
          onClick={() => { 
            if (postType === 'image') handleCancelCrop(); 
            else { handleRemoveVideo(); setStep('post'); } 
          }} 
          className="text-white p-2 hover:bg-gray-800 rounded-full transition-colors"
        >
          <span className="material-icons">close</span>
        </button>
        <p className="font-semibold text-sm">
          {postType === 'image' 
            ? `Edit Foto (${croppedImagesCount + 1}/${croppedImagesCount + rawImagesCount})` 
            : 'Editor Video'}
        </p>
        <button 
          disabled={isProcessingEdit} 
          onClick={postType === 'image' ? handleSaveCrop : captureFrameAndSave} 
          className={`px-4 py-1.5 rounded-full font-semibold text-sm ${isProcessingEdit ? 'bg-gray-600 text-gray-400' : 'bg-white text-black hover:bg-gray-200'}`}
        >
          {isProcessingEdit ? 'Memproses...' : 'Selesai'}
        </button>
      </div>

      {/* 2. Ruang Kerja Kreatif (Preview) */}
      <div className="editor-workspace flex-1 relative overflow-hidden flex items-center justify-center bg-zinc-950">
        {postType === 'image' && imageForCrop ? (
          <div className="absolute inset-0">
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
        ) : postType === 'video' && rawVideoUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <video 
              ref={videoRef as React.RefObject<HTMLVideoElement>} 
              src={rawVideoUrl} 
              playsInline 
              muted={!isVideoPlaying} 
              loop 
              onLoadedMetadata={handleVideoLoadedMetadata}
              className="max-w-full max-h-full transition-transform duration-300 ease-in-out"
              style={{ 
                transform: `rotate(${videoRotation}deg)`,
                objectFit: 'contain',
                // Penyesuaian scale jika dirotasi agar tidak melebar keluar layar
                scale: isRotated ? '0.8' : '1' 
              }}
            />
            <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} style={{ display: 'none' }} />
            
            {/* Play/Pause Overlay */}
            <div 
              onClick={togglePlayVideo} 
              className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
            >
              {!isVideoPlaying && (
                <div className="bg-black/50 p-4 rounded-full backdrop-blur-md">
                  <span className="material-icons text-white text-4xl">play_arrow</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* 3. Footer Panel Kontrol (Alat Editor) */}
      <div className="editor-screen-footer bg-zinc-900 pb-8 pt-4 px-4 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 relative">
        
        {postType === 'image' ? (
          // Kontrol Foto
          <div className="flex items-center gap-4 px-4 py-6">
            <span className="material-icons text-gray-400">remove</span>
            <input 
              type="range" 
              className="w-full accent-white h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              value={zoom} min={1} max={3} step={0.1} 
              onChange={e => setZoom(Number(e.target.value))} 
            />
            <span className="material-icons text-gray-400">add</span>
          </div>
        ) : (
          // Kontrol Video (Gaya TikTok/CapCut)
          <div className="flex flex-col gap-4">
            
            {/* Area Alat yang Aktif */}
            <div className="h-[100px] flex flex-col justify-center">
              
              {/* TAB: POTONG VIDEO */}
              {activeTab === 'trim' && (
                <div className="animate-fade-in">
                  <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
                    <span>Geser untuk memotong</span>
                    <span className="text-white bg-white/10 px-2 py-0.5 rounded">
                      Durasi: {Math.min(videoDuration, videoEnd - videoStart).toFixed(1)}s
                    </span>
                  </div>
                  <div className="relative h-12 bg-zinc-800 rounded-lg overflow-hidden flex border-2 border-transparent focus-within:border-white transition-all">
                    <div className="absolute inset-0 flex">
                      {videoThumbnails.map((thumb, idx) => (
                        <img key={idx} src={thumb} className="h-full w-auto object-cover flex-1 opacity-70" alt="frame" />
                      ))}
                    </div>
                    <input 
                      type="range" 
                      className="absolute inset-0 w-full opacity-0 cursor-pointer z-20" 
                      min={0} 
                      max={Math.max(0, videoDuration - MAX_VIDEO_CLIP)} 
                      step={0.1} 
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
                    {/* Visual Indikator Area Terpotong */}
                    <div 
                      className="absolute top-0 bottom-0 border-y-4 border-l-4 border-white bg-white/20 z-10 rounded-l-md pointer-events-none"
                      style={{ 
                        left: `${(videoStart / videoDuration) * 100}%`,
                        width: `${(MAX_VIDEO_CLIP / videoDuration) * 100}%`,
                        minWidth: '20%'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* TAB: SAMPUL */}
              {activeTab === 'cover' && (
                <div className="animate-fade-in">
                  <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
                    <span>Pilih frame untuk sampul</span>
                    <span className="text-white">{coverTime.toFixed(1)}s</span>
                  </div>
                  <div className="relative h-12 bg-zinc-800 rounded-lg overflow-hidden flex">
                    <div className="absolute inset-0 flex">
                      {videoThumbnails.map((thumb, idx) => (
                        <img key={idx} src={thumb} className="h-full w-auto object-cover flex-1 opacity-50" alt="cover-frame" />
                      ))}
                    </div>
                    <input 
                      type="range" 
                      className="absolute inset-0 w-full opacity-0 cursor-pointer z-20" 
                      min={videoStart} 
                      max={Math.min(videoDuration, videoStart + MAX_VIDEO_CLIP)} 
                      step={0.1} 
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
                    {/* Visual Indikator Cover */}
                    <div 
                      className="absolute top-0 bottom-0 w-2 bg-white z-10 shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none rounded-full"
                      style={{ 
                        left: `${((coverTime - videoStart) / Math.min(videoDuration, MAX_VIDEO_CLIP)) * 100}%`,
                        transform: 'translateX(-50%)'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* TAB: FORMAT / PUTAR */}
              {activeTab === 'format' && (
                <div className="flex justify-center gap-8 animate-fade-in">
                  <button 
                    onClick={() => setVideoRotation && setVideoRotation(prev => (prev + 90) % 360)}
                    className="flex flex-col items-center gap-2 text-white hover:text-gray-300"
                  >
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                      <span className="material-icons">rotate_90_degrees_cw</span>
                    </div>
                    <span className="text-xs">Putar 90°</span>
                  </button>
                  <button 
                    onClick={() => {
                        // Reset rotasi
                        setVideoRotation && setVideoRotation(0);
                    }}
                    className="flex flex-col items-center gap-2 text-white hover:text-gray-300"
                  >
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                      <span className="material-icons">restart_alt</span>
                    </div>
                    <span className="text-xs">Reset</span>
                  </button>
                </div>
              )}

            </div>

            {/* Menu Navigasi Bawah */}
            <div className="flex justify-around items-center pt-4 border-t border-zinc-800">
              <button 
                onClick={() => setActiveTab('trim')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'trim' ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'}`}
              >
                <span className="material-icons text-[28px]">content_cut</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase">Potong</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('cover')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'cover' ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'}`}
              >
                <span className="material-icons text-[28px]">crop_original</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase">Sampul</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('format')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'format' ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'}`}
              >
                <span className="material-icons text-[28px]">crop_rotate</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase">Format</span>
              </button>
            </div>

          </div>
        )}
      </div>
      
      {/* Helper CSS untuk Animasi (Bisa dimasukkan ke file CSS Anda) */}
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
