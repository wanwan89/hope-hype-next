'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Cropper from 'react-easy-crop'; 
import { getCroppedImg, showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import './Create.css'; 

const CLOUDINARY_CLOUD_NAME = "dhhmkb8kl";
const CLOUDINARY_UPLOAD_PRESET = "post_hope";

export default function CreatePostPage() {
  const { t } = useTranslation();
  const router = useRouter(); 

  const [postType, setPostType] = useState<'image' | 'text'>('image');
  const [destination, setDestination] = useState<'feed' | 'story'>('feed');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Karya');
  
  const [rawImagesQueue, setRawImagesQueue] = useState<string[]>([]); 
  const [croppedImages, setCroppedImages] = useState<Blob[]>([]); 
  const [previewUrls, setPreviewUrls] = useState<string[]>([]); 

  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null); // 🔥 REF buat textarea

  const [imageForCrop, setImageForCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [searchMusic, setSearchMusic] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // 🔥 STATE UNTUK MENTIONS (@) 🔥
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<any[]>([]);

  // ===============================================
  // 🔥 FUNGSI HASHTAG
  // ===============================================
  useEffect(() => {
    if (!tagInput.trim()) {
      setSuggestedTags([]);
      return;
    }
    const fetchTags = async () => {
      let searchStr = tagInput.toLowerCase().trim();
      if (!searchStr.startsWith('#')) searchStr = '#' + searchStr;

      try {
        const { data } = await supabase
          .from('hashtags')
          .select('tag')
          .ilike('tag', `${searchStr}%`)
          .limit(5);
        if (data) setSuggestedTags(data.map(d => d.tag));
      } catch (err) {
        console.error("Gagal cari hashtag", err);
      }
    };
    const timer = setTimeout(fetchTags, 300);
    return () => clearTimeout(timer);
  }, [tagInput]);

  const handleAddTag = (tagToAdd: string) => {
    let cleanTag = tagToAdd.toLowerCase().trim();
    if (!cleanTag) return;
    if (!cleanTag.startsWith('#')) {
      showNotif("Hashtag harus pakai tanda # di depannya!", "warning");
      return;
    }
    if (!tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setTagInput('');
    setSuggestedTags([]);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // ===============================================
  // 🔥 FUNGSI PENCARIAN TEMAN UNTUK MENTIONS (@) 🔥
  // ===============================================
  useEffect(() => {
    if (!showMentions) return;

    const fetchMentionSuggestions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const myId = session.user.id;

      // Ambil teman
      const { data: following } = await supabase.from('followers').select('following_id').eq('follower_id', myId);
      const { data: followers } = await supabase.from('followers').select('follower_id').eq('following_id', myId);
      
      const connectedIds = new Set([
          ...(following?.map(f => f.following_id) || []),
          ...(followers?.map(f => f.follower_id) || [])
      ]);

      if (connectedIds.size > 0) {
        let query = supabase.from('profiles').select('id, username, avatar_url, role').in('id', Array.from(connectedIds)).limit(10);
        if (mentionQuery) query = query.ilike('username', `%${mentionQuery}%`);

        const { data: profiles } = await query;
        setMentionResults(profiles || []);
      } else {
        setMentionResults([]);
      }
    };

    const delayDebounceFn = setTimeout(() => { fetchMentionSuggestions(); }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [mentionQuery, showMentions]);

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCaption(val);

    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPosition);
    
    // Deteksi kata terakhir yang berawalan @
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
    } else {
      setShowMentions(false);
    }
  };

  const handleSelectMention = (username: string) => {
    if (!captionInputRef.current) return;
    
    const cursor = captionInputRef.current.selectionStart || 0;
    const textBeforeCursor = caption.slice(0, cursor);
    const textAfterCursor = caption.slice(cursor);
    
    // Replace @xxx dengan @username yang bener
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${username} `);
    
    setCaption(newTextBefore + textAfterCursor);
    setShowMentions(false);
    captionInputRef.current.focus();
  };

  // ===============================================
  // 🔥 MUSIC, FILE & CROP HANDLERS
  // ===============================================
  useEffect(() => {
    if (!searchMusic.trim()) { setMusicResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchMusic)}&media=music&limit=10`);
        const data = await res.json();
        setMusicResults(data.results || []);
      } catch (err) { console.error(err); } finally { setIsSearching(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchMusic]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (croppedImages.length + files.length > 3) return showNotif("Maksimal hanya bisa 3 foto!", "warning");

    const readersArr: Promise<string>[] = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readersArr).then(results => {
      setRawImagesQueue(results);
      setImageForCrop(results[0]); 
    });
  };

  const onCropComplete = useCallback((_croppedArea: any, pixels: any) => { setCroppedAreaPixels(pixels); }, []);

  const handleSaveCrop = async () => {
    if (!imageForCrop || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageForCrop, croppedAreaPixels);
      setCroppedImages(prev => [...prev, croppedBlob]);
      setPreviewUrls(prev => [...prev, URL.createObjectURL(croppedBlob)]);

      const nextQueue = rawImagesQueue.slice(1);
      if (nextQueue.length > 0) {
        setRawImagesQueue(nextQueue);
        setImageForCrop(nextQueue[0]);
        setCrop({ x: 0, y: 0 }); setZoom(1); setCroppedAreaPixels(null);
      } else {
        setRawImagesQueue([]); setImageForCrop(null);
      }
    } catch (e) { console.error("Error Cropping:", e); }
  };

  const handleCancelCrop = () => {
    const nextQueue = rawImagesQueue.slice(1);
    if (nextQueue.length > 0) { setRawImagesQueue(nextQueue); setImageForCrop(nextQueue[0]); } 
    else { setRawImagesQueue([]); setImageForCrop(null); }
  };

  const handleRemovePreview = (index: number) => {
    setCroppedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const togglePlayPreview = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (playingUrl === url) {
      audioRef.current?.pause(); setPlayingUrl(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url); audioRef.current.play(); setPlayingUrl(url);
      audioRef.current.onended = () => setPlayingUrl(null);
    }
  };

  const handleClose = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    router.back(); 
  };

  const uploadToCloudinary = async (file: File | Blob) => {
    const fd = new FormData();
    fd.append("file", file); fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
    return await res.json();
  };

  // ===============================================
  // 🔥 FUNGSI SUBMIT POSTINGAN & NOTIFIKASI
  // ===============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (croppedImages.length === 0 && !caption.trim()) return alert(t('alert_empty_post'));
    if (destination === "story" && croppedImages.length > 1) return showNotif("Story hanya bisa upload 1 foto saja!", "warning");

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return window.dispatchEvent(new CustomEvent('openLogin'));
      const myUserId = session.user.id;

      if (tags.length > 0) {
        const tagsToInsert = tags.map(t => ({ tag: t }));
        await supabase.from('hashtags').upsert(tagsToInsert, { onConflict: 'tag' }).select();
      }

      const finalCaption = tags.length > 0 ? `${caption.trim()}\n\n${tags.join(' ')}` : caption.trim();

      let finalImageUrl: string | null = null;
      if (croppedImages.length > 0 && postType === 'image') {
        const uploadPromises = croppedImages.map(blob => uploadToCloudinary(blob));
        const uploadResults = await Promise.all(uploadPromises);
        finalImageUrl = uploadResults.map(res => res.secure_url).join(',');
      }

      let newPostId: string | null = null;

      if (destination === "story") {
        await supabase.from("stories").insert({
          creator_id: myUserId,
          image_url: finalImageUrl, 
          content: finalCaption,
          audio_src: selectedMusic?.previewUrl,
          title: selectedMusic?.trackName,
          artist: selectedMusic?.artistName
        });
      } else {
        const { data: prof } = await supabase.from("profiles").select("username").eq("id", myUserId).single();
        const { data: newPost } = await supabase.from("posts").insert({
          creator_id: myUserId,
          name: prof?.username || "User",
          bio: finalCaption,
          category: category,
          image_url: finalImageUrl,
          audio_src: selectedMusic?.previewUrl,
          title: selectedMusic?.trackName,
          artist: selectedMusic?.artistName,
          status: "pending"
        }).select('id').single();
        
        if (newPost) newPostId = newPost.id;
      }

      // 🔥 KIRIM NOTIFIKASI MENTION JIKA ADA 🔥
      if (newPostId || destination === "story") {
        const mentionedUsernames = [...new Set((finalCaption.match(/@(\w+)/g) || []).map(m => m.substring(1)))];
        
        if (mentionedUsernames.length > 0) {
          const { data: taggedUsers } = await supabase.from('profiles').select('id, username').in('username', mentionedUsernames);
          
          if (taggedUsers) {
            const { data: myProf } = await supabase.from("profiles").select("username").eq("id", myUserId).single();
            const notifInserts = taggedUsers
              .filter(u => u.id !== myUserId) 
              .map(u => ({
                user_id: u.id,
                actor_id: myUserId,
                post_id: newPostId ? parseInt(newPostId) : null,
                type: "mention",
                message: `${myProf?.username} menyebut Anda dalam ${destination === "story" ? "cerita" : "postingan"} barunya.`
              }));
            
            if (notifInserts.length > 0) await supabase.from("notifications").insert(notifInserts);
          }
        }
      }

      handleClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '80px', paddingTop: 'env(safe-area-inset-top, 20px)' }}>
      
      {/* --- MENTIONS POPUP CSS --- */}
      <style>{`
        .mention-popup {
          position: absolute; top: calc(100% + 5px); left: 0; width: 100%; max-height: 200px;
          background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow-y: auto; z-index: 100;
        }
        .mention-item {
          display: flex; align-items: center; padding: 10px 14px; gap: 12px;
          cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;
        }
        .mention-item:hover, .mention-item:active { background: var(--bg-input); }
        .mention-item img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
        .mention-name { font-size: 13px; font-weight: 700; color: var(--text-main); }
        .mention-empty { padding: 12px; text-align: center; font-size: 12px; color: var(--text-muted); }
      `}</style>

      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
        <button type="button" onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, margin: 0 }}>Buat Postingan</h2>
        <div style={{ width: 28 }}></div> 
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        
        {imageForCrop && (
          <div className="crop-overlay-wrapper" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }}>
            <div style={{ position: 'absolute', top: '15px', right: '20px', color: 'white', zIndex: 10000, fontWeight: 'bold' }}>
              Crop Gambar {croppedImages.length + 1} dari {croppedImages.length + rawImagesQueue.length}
            </div>
            <div className="crop-container-box" style={{ position: 'relative', width: '100%', height: 'calc(100vh - 120px)' }}>
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
            <div className="crop-footer-controls" style={{ position: 'absolute', bottom: 0, width: '100%', padding: '20px', background: 'rgba(0,0,0,0.8)' }}>
              <div className="zoom-slider" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#fff' }}>
                <span className="material-icons">remove</span>
                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1 }} />
                <span className="material-icons">add</span>
              </div>
              <div className="crop-action-btns" style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="crop-cancel" onClick={handleCancelCrop} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#333', color: '#fff', border: 'none', fontWeight: 600 }}>Lewati / Batal</button>
                <button type="button" className="crop-confirm" onClick={handleSaveCrop} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#1f3cff', color: '#fff', border: 'none', fontWeight: 600 }}>{t('crop_confirm')}</button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="post-form">
          <div className="destination-container">
            <p className="section-label" style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>{t('send_to')}</p>
            <div className="dest-toggle-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { id: 'feed', title: t('feed_title'), desc: t('feed_desc') },
                { id: 'story', title: t('story_title'), desc: t('story_desc') }
              ].map((dest) => (
                <label key={dest.id} className="dest-option" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', border: destination === dest.id ? '2px solid #1f3cff' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input type="radio" name="postDestination" value={dest.id} checked={destination === dest.id} onChange={() => setDestination(dest.id as any)} style={{ display: 'none' }} />
                  <div className="dest-content" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '15px', padding: 0, background: 'transparent', border: 'none' }}>
                    <div className="dest-icon-box" style={{ width: '40px', height: '40px', background: destination === dest.id ? '#1f3cff' : 'var(--bg-card)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: destination === dest.id ? '#fff' : 'var(--text-muted)' }}>
                      {dest.id === 'feed' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
                    </div>
                    <div className="dest-text" style={{ flex: 1 }}>
                      <div className="dest-title" style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 700 }}>{dest.title}</div>
                      <div className="dest-desc" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{dest.desc}</div>
                    </div>
                    <div className="dest-check" style={{ width: '20px', height: '20px', borderRadius: '50%', border: destination === dest.id ? '6px solid #1f3cff' : '2px solid var(--border-card)' }}></div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="post-type-toggle" style={{ display: 'flex', gap: '10px', marginTop: '20px', background: 'var(--bg-secondary)', padding: '5px', borderRadius: '12px' }}>
            <button type="button" className={`type-btn ${postType === 'image' ? 'active' : ''}`} onClick={() => setPostType('image')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: postType === 'image' ? 'var(--bg-input)' : 'transparent', color: postType === 'image' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>{t('type_photo')}</button>
            <button type="button" className={`type-btn ${postType === 'text' ? 'active' : ''}`} onClick={() => setPostType('text')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: postType === 'text' ? 'var(--bg-input)' : 'transparent', color: postType === 'text' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>{t('type_text')}</button>
          </div>

          {postType === 'image' && (
            <div style={{ marginTop: '20px' }}>
              <input type="file" ref={fileInputRef} accept="image/*" multiple hidden onChange={handleFileChange} />
              
              {previewUrls.length === 0 ? (
                <div className="post-upload-area" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', height: '250px', background: 'var(--bg-secondary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px dashed var(--border-card)' }}>
                  <div className="post-upload-placeholder" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <span className="material-icons" style={{ fontSize: '40px', marginBottom: '10px', color: '#1f3cff' }}>add_photo_alternate</span>
                    <div className="post-upload-text" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>Pilih Foto (Max 3)</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                  {previewUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative', width: '120px', height: '160px', flexShrink: 0 }}>
                      <img src={url} alt={`Preview ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                      <button type="button" onClick={() => handleRemovePreview(i)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <span className="material-icons" style={{ fontSize: '14px' }}>close</span>
                      </button>
                    </div>
                  ))}
                  {previewUrls.length < 3 && destination === 'feed' && (
                    <div onClick={() => fileInputRef.current?.click()} style={{ width: '120px', height: '160px', border: '2px dashed var(--border-card)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: 'var(--text-muted)' }}>
                       <span className="material-icons" style={{ fontSize: '30px' }}>add</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 🔥 INPUT CAPTION DENGAN MENTION FEATURE 🔥 */}
          <div style={{ position: 'relative', marginTop: '20px' }}>
            <textarea 
              ref={captionInputRef}
              className="post-textarea" 
              placeholder={postType === 'image' ? t('placeholder_caption') : t('placeholder_thought')} 
              maxLength={300}
              value={caption}
              onChange={handleCaptionChange}
              onKeyDown={(e) => {
                if (showMentions && e.key === "Enter") {
                  e.preventDefault();
                  if (mentionResults.length > 0) handleSelectMention(mentionResults[0].username);
                }
              }}
              style={{ width: '100%', minHeight: '120px', background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: '16px', padding: '15px', color: 'var(--text-main)', fontSize: '15px', outline: 'none', resize: 'vertical' }}
            />
            
            {showMentions && (
              <div className="mention-popup">
                {mentionResults.length > 0 ? (
                  mentionResults.map(user => (
                    <div key={user.id} className="mention-item" onClick={() => handleSelectMention(user.username)}>
                      <img src={user.avatar_url || '/asets/png/profile.webp'} alt={user.username} />
                      <div className="mention-info">
                        <span className="mention-name">{user.username}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mention-empty">Tidak ditemukan...</div>
                )}
              </div>
            )}
          </div>

          <div className="hashtag-section" style={{ marginTop: '15px', position: 'relative' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: tags.length > 0 ? '10px' : '0' }}>
              {tags.map(t => (
                <span key={t} style={{ background: 'rgba(31, 60, 255, 0.1)', color: '#1f3cff', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  {t} <span onClick={() => removeTag(t)} style={{cursor: 'pointer', fontSize: '16px', lineHeight: 1}}>&times;</span>
                </span>
              ))}
            </div>
            
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Ketik Hashtag... (Wajib pakai #, lalu tekan Spasi)"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                style={{ width: '100%', padding: '12px 15px', background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: '12px', color: 'var(--text-main)', outline: 'none', fontSize: '14px' }}
              />
              
              {suggestedTags.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', marginTop: '6px', zIndex: 10, boxShadow: '0 4px 15px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  {suggestedTags.map(st => (
                    <div key={st} onClick={() => handleAddTag(st)} style={{ padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {st}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ position: 'relative', marginTop: '20px' }}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="post-select-custom" style={{ width: '100%', padding: '15px', border: '1px solid var(--border-card)', borderRadius: '12px', appearance: 'none', WebkitAppearance: 'none', backgroundColor: 'var(--bg-secondary)', fontSize: '15px', color: 'var(--text-main)', cursor: 'pointer', outline: 'none', fontWeight: '600' }}>
              {[
                { val: "Karya", label: t('cat_karya') }, { val: "Prestasi", label: t('cat_prestasi') }, { val: "Photography", label: t('cat_photo') }, { val: "Mountain", label: t('cat_mountain') }, { val: "Thread", label: t('cat_thread') }
              ].map(opt => ( <option key={opt.val} value={opt.val}>{opt.label}</option> ))}
            </select>
            <i style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '12px' }}>▼</i>
          </div>

          <div className="music-picker-section" style={{ marginTop: '25px', background: 'var(--bg-secondary)', padding: '15px', borderRadius: '16px' }}>
            <div className="section-label-bold" style={{ color: 'var(--text-main)', fontWeight: 700, marginBottom: '15px' }}>{t('select_music_optional')}</div>
            {!selectedMusic ? (
              <>
                <div style={{ position: 'relative' }}>
                  <span className="material-icons" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '20px' }}>search</span>
                  <input type="text" placeholder={t('search_music')} className="music-search-input" value={searchMusic} onChange={(e) => setSearchMusic(e.target.value)} style={{ width: '100%', padding: '12px 15px 12px 40px', borderRadius: '10px', border: '1px solid var(--border-card)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }} />
                </div>
                <div className="music-list-scroll" style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '15px' }}>
                  {isSearching && <p style={{textAlign:'center', fontSize:'12px', padding: '10px', color: 'var(--text-muted)'}}>{t('searching')}</p>}
                  {musicResults.map((song, i) => (
                    <div key={i} className="dest-content" style={{display: 'flex', padding:'10px', borderRadius: '10px', cursor:'pointer', alignItems: 'center', transition: 'background 0.2s', background: 'transparent', border: 'none'}} onClick={() => setSelectedMusic(song)}>
                      <div style={{position: 'relative', width: 45, height: 45, marginRight: 15, flexShrink: 0}}>
                        <img src={song.artworkUrl100} style={{width:'100%', height:'100%', borderRadius:10, objectFit: 'cover'}} />
                        <div onClick={(e) => togglePlayPreview(song.previewUrl, e)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-icons" style={{color: '#fff', fontSize: '24px'}}>{playingUrl === song.previewUrl ? 'pause' : 'play_arrow'}</span>
                        </div>
                      </div>
                      <div style={{flex:1, overflow:'hidden'}}>
                        <div style={{fontSize:14, fontWeight:700, color: 'var(--text-main)', whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden'}}>{song.trackName}</div>
                        <div style={{fontSize:12, color:'var(--text-muted)'}}>{song.artistName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="selected-music-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <div className="music-info-mini" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button type="button" onClick={() => togglePlayPreview(selectedMusic.previewUrl)} style={{ background: '#1f3cff', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <span className="material-icons" style={{ color: '#fff', fontSize: '20px' }}>{playingUrl === selectedMusic.previewUrl ? 'pause' : 'play_arrow'}</span>
                  </button>
                  <div>
                    <span className="audio-tag" style={{ fontSize: '10px', background: 'var(--bg-card)', color: 'var(--text-main)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>AUDIO</span>
                    <div className="music-title-text" style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>{selectedMusic.trackName} — {selectedMusic.artistName}</div>
                  </div>
                </div>
                <button type="button" className="remove-music-link" onClick={() => { if(playingUrl === selectedMusic.previewUrl) togglePlayPreview(selectedMusic.previewUrl); setSelectedMusic(null); }} style={{ background: 'transparent', border: 'none', color: '#ff4757', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>{t('remove_music')}</button>
              </div>
            )}
          </div>

          <button type="submit" className="post-submit-btn" disabled={isSubmitting} style={{ marginTop: '30px', width: '100%', padding: '16px', background: isSubmitting ? 'var(--bg-input)' : '#1f3cff', color: isSubmitting ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 800, cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: isSubmitting ? 'none' : '0 8px 20px rgba(31, 60, 255, 0.3)' }}>
            {isSubmitting ? t('btn_uploading') : t('btn_submit_post')}
          </button>
        </form>
      </div>
    </div>
  );
}
