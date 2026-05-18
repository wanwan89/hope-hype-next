'use client';
import React from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editData: any;
  setEditData: (data: any) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  isSaving: boolean;
  onSave: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  t: (key: string, fallback?: string) => string;
};

const avatarPresets = [
  '/asets/png/avatar1.png', '/asets/png/avatar2.png',
  '/asets/png/avatar3.png', '/asets/png/avatar4.png'
];

const EditProfileModal: React.FC<Props> = ({
  isOpen, onClose, editData, setEditData, selectedFile, setSelectedFile,
  previewUrl, setPreviewUrl, isSaving, onSave, fileInputRef, t
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className={`full-screen-modal ${isOpen ? 'open' : ''}`}>
      <div className="full-screen-header">
        <button className="icon-btn-header" onClick={onClose}><span className="material-icons">arrow_back</span></button>
        <h3>{t('edit_profile_modal', 'Edit Profil')}</h3>
        <button className="icon-btn-header text-btn" onClick={onSave} disabled={isSaving}>
          {isSaving ? <span className="material-icons spinner">sync</span> : 'Simpan'}
        </button>
      </div>
      <div className="full-screen-body">
        <div className="edit-avatar-section">
          <div className="edit-avatar-wrapper" onClick={() => fileInputRef.current?.click()}>
            <img src={previewUrl || '/asets/png/profile.webp'} alt="Avatar" className="edit-avatar-preview" />
            <div className="upload-badge"><span className="material-icons">camera_alt</span></div>
          </div>
          <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
          <div className="avatar-presets">
            {avatarPresets.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`preset-${i}`}
                className={`preset-img ${previewUrl === url ? 'selected' : ''}`}
                onClick={() => {
                  setEditData({ ...editData, avatar_url: url });
                  setPreviewUrl(url);
                  setSelectedFile(null);
                }}
              />
            ))}
          </div>
        </div>
        <div className="edit-form-group">
          <label>Nama Tampilan</label>
          <input type="text" value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} placeholder="Nama lengkap kamu" />
        </div>
        <div className="edit-form-group">
          <label>{t('username_label', 'Username')}</label>
          <input type="text" value={editData.username} onChange={e => setEditData({...editData, username: e.target.value.toLowerCase().replace(/\s/g, '')})} placeholder="Gunakan huruf kecil" />
        </div>
        <div className="edit-form-group">
          <label>{t('bio_label', 'Bio')}</label>
          <textarea value={editData.bio} onChange={e => setEditData({...editData, bio: e.target.value})} placeholder="Tulis sesuatu tentangmu..." rows={3} />
        </div>
        <div className="edit-form-group">
          <label>{t('link_label', 'Tautan / Website')}</label>
          <input type="text" value={editData.website} onChange={e => setEditData({...editData, website: e.target.value})} placeholder="misal: instagram.com/hope" />
        </div>
      </div>
    </div>
  );
};

export default React.memo(EditProfileModal);