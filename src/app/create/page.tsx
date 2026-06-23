'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Cropper from 'react-easy-crop';
import { getCroppedImg, showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import './Create.css';

// Import komponen modular
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

export default function CreatePostPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams?.get('draft_id');

  // --- State ---
  const [postType, setPostType] = useState<'image' | 'text' | 'video'>('image');
  const [destination, setDestination] = useState<'feed' | 'story'>('feed');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBusinessUser, setIsBusinessUser] = useState(false);
  const [isAd, setIsAd] = useState(false);

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
  const [searchQuery, setSearchQuery] = useState("");
  const [popupResults, setPopupResults] = useState<any[]>([]);

  const [step, setStep] = useState<'pick' | 'edit' | 'post'>('post');
  const [imageForCrop, setImageForCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null);

  // --- Handlers Penting ---

  const togglePlayPreview = useCallback((url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (playingUrl === url) { 
      if (audioRef.current) audioRef.current.pause(); 
      setPlayingUrl(null); 
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url); 
      audioRef.current.play().catch(e => console.error(e)); 
      setPlayingUrl(url);
      audioRef.current.onended = () => setPlayingUrl(null);
    }
  }, [playingUrl]);

  const handleClose = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    router.back();
  };

  const countWords = (text: string) => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  // Fungsi submitPostAction, handleFileChange, handleRemoveVideo, dll...
  // Pastikan diletakkan di sini sebelum blok return
  
  const submitPostAction = async (isDraft: boolean = false) => {
    // ... isi logika submitPostAction Anda yang lama ...
    setIsSubmitting(true);
    // ...
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... isi logika handleFileChange ...
  };

  const handleRemoveVideo = () => {
    setRawVideoFile(null);
    setRawVideoUrl(null);
    setCoverBlob(null);
    setCoverUrlPreview(null);
    setVideoThumbnails([]);
    setExistingVideoUrl(null);
    setExistingImageUrl(null);
    setStep('post');
  };

  const handleRemovePreview = (index: number) => {
    setCroppedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectPopupItem = (selectedItem: string) => {
     // ... isi logika ...
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     // ... isi logika ...
  };
  
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     // ... isi logika ...
  };

  const renderEditorScreen = () => {
    // ... isi logika renderEditorScreen Anda ...
    return <div>...</div>;
  };

  // --- RENDER ---
  return (
    <div className="create-page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '80px', paddingTop: 'env(safe-area-inset-top, 20px)' }}>
      {step === 'edit' && renderEditorScreen()}

      <MusicSheet
        isOpen={isMusicSheetOpen}
        onClose={() => { setIsMusicSheetOpen(false); if (audioRef.current) { audioRef.current.pause(); setPlayingUrl(null); } }}
        searchMusic={searchMusic}
        setSearchMusic={setSearchMusic}
        isSearching={isSearching}
        musicResults={musicResults}
        playingUrl={playingUrl}
        onTogglePreview={togglePlayPreview}
        onSelect={(song) => { setSelectedMusic(song); if (audioRef.current) { audioRef.current.pause(); setPlayingUrl(null); } setIsMusicSheetOpen(false); }}
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

              <CaptionInput
                caption={caption}
                onChange={handleCaptionChange}
                onKeyDown={(e) => { if (showPopup !== 'none' && e.key === "Enter") { e.preventDefault(); if (popupResults.length > 0) { handleSelectPopupItem(showPopup === 'mention' ? popupResults[0].username : popupResults[0].tag); } } }}
                postType={postType}
                wordCount={countWords(caption)}
                maxWords={postType === 'text' ? 150 : 100}
                showPopup={showPopup}
                popupResults={popupResults}
                onSelectPopupItem={handleSelectPopupItem}
              />

              <MusicPicker
                selectedMusic={selectedMusic}
                onOpenSheet={() => setIsMusicSheetOpen(true)}
                onRemove={() => { setSelectedMusic(null); if (playingUrl === selectedMusic?.previewUrl) audioRef.current?.pause(); }}
              />

              {isBusinessUser && <AdToggle isAd={isAd} setIsAd={setIsAd} />}

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
