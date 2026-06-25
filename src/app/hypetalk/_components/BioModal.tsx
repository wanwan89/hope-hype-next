'use client';
import React from 'react';

type Props = {
  bioForm: any;
  setBioForm: (data: any) => void;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
};

const BioModal: React.FC<Props> = ({ bioForm, setBioForm, isSaving, onSave, onClose }) => {
  // Helper untuk update state agar kodenya lebih bersih
  const updateField = (field: string, value: any) => setBioForm({ ...bioForm, [field]: value });

  return (
    <div className="tg-modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
      <div className="tg-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Lengkapi Biodata</h3>
          <button className="close-modal-btn" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="form-grid">
          {/* Info Dasar */}
          <div className="input-group">
            <input type="text" placeholder="Username" value={bioForm.username} onChange={e => updateField('username', e.target.value)} />
          </div>
          <div className="input-group">
            <input type="number" placeholder="Umur" value={bioForm.umur} onChange={e => updateField('umur', e.target.value)} />
          </div>
          <div className="input-group">
            <input type="text" placeholder="Lokasi/Kota" value={bioForm.lokasi} onChange={e => updateField('lokasi', e.target.value)} />
          </div>
          <div className="input-group">
            <select value={bioForm.gender} onChange={e => updateField('gender', e.target.value)}>
              <option value="">Pilih Gender</option>
              <option value="Pria">Pria</option>
              <option value="Wanita">Wanita</option>
            </select>
          </div>

          {/* Profil Profesional & Fisik */}
          <input type="text" placeholder="Pekerjaan" value={bioForm.pekerjaan} onChange={e => updateField('pekerjaan', e.target.value)} />
          <input type="text" placeholder="Pendidikan" value={bioForm.pendidikan} onChange={e => updateField('pendidikan', e.target.value)} />
          <input type="number" placeholder="Tinggi Badan (cm)" value={bioForm.tinggi_badan} onChange={e => updateField('tinggi_badan', e.target.value)} />
          <input type="text" placeholder="Agama" value={bioForm.agama} onChange={e => updateField('agama', e.target.value)} />

          {/* Lifestyle & Preferensi */}
          <textarea placeholder="Tentang Diri / Bio (50-500 karakter)" value={bioForm.bio} onChange={e => updateField('bio', e.target.value)} />
          <input type="text" placeholder="Hobi" value={bioForm.hobi} onChange={e => updateField('hobi', e.target.value)} />
          <input type="text" placeholder="Olahraga Favorit" value={bioForm.olahraga} onChange={e => updateField('olahraga', e.target.value)} />
          
          <select value={bioForm.tujuan} onChange={e => updateField('tujuan', e.target.value)}>
            <option value="">Tujuan Bergabung</option>
            <option value="Teman">Cari Teman</option>
            <option value="Pasangan">Pasangan Serius</option>
            <option value="Casual">Casual Dating</option>
            <option value="Networking">Networking</option>
          </select>

          {/* Kebiasaan */}
          <div className="row-grid">
            <input type="text" placeholder="Merokok?" value={bioForm.merokok} onChange={e => updateField('merokok', e.target.value)} />
            <input type="text" placeholder="Alkohol?" value={bioForm.alkohol} onChange={e => updateField('alkohol', e.target.value)} />
          </div>

          {/* Media Sosial */}
          <div className="social-inputs">
            <input type="text" placeholder="IG Username" value={bioForm.ig_username} onChange={e => updateField('ig_username', e.target.value)} />
            <input type="text" placeholder="TikTok Username" value={bioForm.tiktok_username} onChange={e => updateField('tiktok_username', e.target.value)} />
            <input type="text" placeholder="Spotify URL" value={bioForm.spotify_url} onChange={e => updateField('spotify_url', e.target.value)} />
          </div>
        </div>

        <button className="action-btn" onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
};

export default React.memo(BioModal);
