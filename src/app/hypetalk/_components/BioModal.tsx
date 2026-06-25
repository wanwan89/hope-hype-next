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
          {/* Info Dasar (Username Dihapus) */}
          <div className="input-group">
            <input 
              type="number" 
              placeholder="Umur" 
              value={bioForm.umur || ''} 
              onChange={e => updateField('umur', e.target.value)} 
            />
          </div>
          <div className="input-group">
            <select value={bioForm.gender || ''} onChange={e => updateField('gender', e.target.value)}>
              <option value="" disabled>Pilih Gender</option>
              <option value="Pria">Pria</option>
              <option value="Wanita">Wanita</option>
            </select>
          </div>

          <div className="input-group">
            <input 
              type="text" 
              placeholder="Lokasi/Kota" 
              value={bioForm.lokasi || ''} 
              onChange={e => updateField('lokasi', e.target.value)} 
            />
          </div>
          <div className="input-group">
            <select value={bioForm.agama || ''} onChange={e => updateField('agama', e.target.value)}>
              <option value="" disabled>Agama</option>
              <option value="Islam">Islam</option>
              <option value="Kristen">Kristen Protestan</option>
              <option value="Katolik">Katolik</option>
              <option value="Hindu">Hindu</option>
              <option value="Buddha">Buddha</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          {/* Profil Profesional & Fisik */}
          <input 
            type="text" 
            placeholder="Pekerjaan" 
            value={bioForm.pekerjaan || ''} 
            onChange={e => updateField('pekerjaan', e.target.value)} 
          />
          <select value={bioForm.pendidikan || ''} onChange={e => updateField('pendidikan', e.target.value)}>
            <option value="" disabled>Pendidikan Terakhir</option>
            <option value="SMA/SMK">SMA/SMK Sederajat</option>
            <option value="Diploma">Diploma (D1-D4)</option>
            <option value="S1">Sarjana (S1)</option>
            <option value="S2/S3">Pascasarjana (S2/S3)</option>
          </select>

          <input 
            type="number" 
            placeholder="Tinggi Badan (cm)" 
            value={bioForm.tinggi_badan || ''} 
            onChange={e => updateField('tinggi_badan', e.target.value)} 
          />
          <select value={bioForm.olahraga || ''} onChange={e => updateField('olahraga', e.target.value)}>
            <option value="" disabled>Olahraga Favorit</option>
            <option value="Gym/Fitness">Gym / Fitness</option>
            <option value="Lari/Jogging">Lari / Jogging</option>
            <option value="Sepak Bola/Futsal">Sepak Bola / Futsal</option>
            <option value="Berenang">Berenang</option>
            <option value="Bela Diri">Bela Diri</option>
            <option value="Lainnya">Lainnya</option>
            <option value="Jarang Olahraga">Jarang Olahraga</option>
          </select>

          {/* Lifestyle & Preferensi */}
          <textarea 
            placeholder="Tentang Diri / Bio (50-500 karakter)" 
            value={bioForm.bio || ''} 
            onChange={e => updateField('bio', e.target.value)} 
          />
          
          <select value={bioForm.tujuan || ''} onChange={e => updateField('tujuan', e.target.value)}>
            <option value="" disabled>Tujuan Bergabung</option>
            <option value="Teman">Nambah Teman / Relasi</option>
            <option value="Pasangan">Cari Pasangan Serius</option>
            <option value="Casual">Casual / Santai dulu</option>
            <option value="Networking">Networking Profesional</option>
          </select>

          <input 
            type="text" 
            placeholder="Hobi Utama (misal: Musik, Traveling)" 
            value={bioForm.hobi || ''} 
            onChange={e => updateField('hobi', e.target.value)} 
          />

          {/* Kebiasaan (Bahasa lebih natural) */}
          <div className="row-grid">
            <select value={bioForm.merokok || ''} onChange={e => updateField('merokok', e.target.value)}>
              <option value="" disabled>Status Merokok</option>
              <option value="Tidak Merokok">Sama sekali nggak ngerokok</option>
              <option value="Kadang-kadang">Kadang-kadang (Social smoker)</option>
              <option value="Perokok Aktif">Perokok aktif</option>
              <option value="Vape">Tim Vape / Pods</option>
            </select>
            
            <select value={bioForm.alkohol || ''} onChange={e => updateField('alkohol', e.target.value)}>
              <option value="" disabled>Konsumsi Alkohol</option>
              <option value="Tidak Minum">Sama sekali nggak minum</option>
              <option value="Jarang">Jarang banget</option>
              <option value="Social Drinker">Minum pas nongkrong aja</option>
              <option value="Sering">Lumayan sering</option>
            </select>
          </div>

          {/* Media Sosial */}
          <div className="social-inputs">
            <input 
              type="text" 
              placeholder="IG Username (tanpa @)" 
              value={bioForm.ig_username || ''} 
              onChange={e => updateField('ig_username', e.target.value)} 
            />
            <input 
              type="text" 
              placeholder="TikTok Username (tanpa @)" 
              value={bioForm.tiktok_username || ''} 
              onChange={e => updateField('tiktok_username', e.target.value)} 
            />
            <input 
              type="text" 
              placeholder="Link Playlist Spotify" 
              value={bioForm.spotify_url || ''} 
              onChange={e => updateField('spotify_url', e.target.value)} 
            />
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
