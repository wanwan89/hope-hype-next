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
  const updateField = (field: string, value: any) => setBioForm({ ...bioForm, [field]: value });

  return (
    <div className="tg-modal-overlay" style={overlayStyle} onClick={onClose}>
      <div className="tg-modal-content" style={contentStyle} onClick={(e) => e.stopPropagation()}>
        
        {/* Header - Diberi padding dan sticky agar tidak tertutup */}
        <div className="modal-header" style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Lengkapi Biodata</h3>
          <button className="close-modal-btn" onClick={onClose} style={closeBtnStyle}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="form-grid" style={gridStyle}>
          
          {/* Baris 1 */}
          <div className="input-group">
            <input type="number" placeholder="Umur" className="custom-input"
              value={bioForm.umur || ''} onChange={e => updateField('umur', e.target.value)} />
          </div>
          <div className="input-group">
            <select className="custom-input" value={bioForm.gender || ''} onChange={e => updateField('gender', e.target.value)}>
              <option value="" disabled>Pilih Gender</option>
              <option value="Pria">Pria</option>
              <option value="Wanita">Wanita</option>
            </select>
          </div>

          {/* Baris 2 */}
          <div className="input-group">
            <input type="text" placeholder="Lokasi/Kota" className="custom-input"
              value={bioForm.lokasi || ''} onChange={e => updateField('lokasi', e.target.value)} />
          </div>
          <div className="input-group">
            <select className="custom-input" value={bioForm.agama || ''} onChange={e => updateField('agama', e.target.value)}>
              <option value="" disabled>Agama</option>
              <option value="Islam">Islam</option>
              <option value="Kristen">Kristen Protestan</option>
              <option value="Katolik">Katolik</option>
              <option value="Hindu">Hindu</option>
              <option value="Buddha">Buddha</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          {/* Baris 3 */}
          <div className="input-group">
            <input type="text" placeholder="Pekerjaan / Jabatan" className="custom-input"
              value={bioForm.pekerjaan || ''} onChange={e => updateField('pekerjaan', e.target.value)} />
          </div>
          <div className="input-group">
            <select className="custom-input" value={bioForm.pendidikan || ''} onChange={e => updateField('pendidikan', e.target.value)}>
              <option value="" disabled>Pendidikan Terakhir</option>
              <option value="SMA/SMK">SMA/SMK Sederajat</option>
              <option value="Diploma">Diploma (D1-D4)</option>
              <option value="S1">Sarjana (S1)</option>
              <option value="S2/S3">Pascasarjana (S2/S3)</option>
            </select>
          </div>

          {/* Baris 4 */}
          <div className="input-group">
            <input type="number" placeholder="Tinggi Badan (cm)" className="custom-input"
              value={bioForm.tinggi_badan || ''} onChange={e => updateField('tinggi_badan', e.target.value)} />
          </div>
          <div className="input-group">
            <select className="custom-input" value={bioForm.olahraga || ''} onChange={e => updateField('olahraga', e.target.value)}>
              <option value="" disabled>Olahraga Favorit</option>
              <option value="Gym/Fitness">Gym / Fitness</option>
              <option value="Lari/Jogging">Lari / Jogging</option>
              <option value="Sepak Bola/Futsal">Sepak Bola / Futsal</option>
              <option value="Berenang">Berenang</option>
              <option value="Bela Diri">Bela Diri</option>
              <option value="Lainnya">Lainnya</option>
              <option value="Jarang Olahraga">Jarang Olahraga</option>
            </select>
          </div>

          {/* Bio - Span 2 Kolom agar lebar penuh */}
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <textarea placeholder="Tentang Diri / Bio (Ceritakan sedikit tentang kamu)" 
              className="custom-input" style={{ minHeight: '100px', resize: 'vertical' }}
              value={bioForm.bio || ''} onChange={e => updateField('bio', e.target.value)} />
          </div>
          
          {/* Baris 5 */}
          <div className="input-group">
            <select className="custom-input" value={bioForm.tujuan || ''} onChange={e => updateField('tujuan', e.target.value)}>
              <option value="" disabled>Tujuan Bergabung</option>
              <option value="Teman">Nambah Teman / Relasi</option>
              <option value="Pasangan">Cari Pasangan Serius</option>
              <option value="Casual">Casual / Santai dulu</option>
              <option value="Networking">Networking Profesional</option>
            </select>
          </div>
          <div className="input-group">
            <input type="text" placeholder="Hobi Utama (misal: Musik, Traveling)" className="custom-input"
              value={bioForm.hobi || ''} onChange={e => updateField('hobi', e.target.value)} />
          </div>

          {/* Baris 6: Kebiasaan (Sekarang letaknya sejajar Kiri & Kanan, tidak numpuk) */}
          <div className="input-group">
            <select className="custom-input" value={bioForm.merokok || ''} onChange={e => updateField('merokok', e.target.value)}>
              <option value="" disabled>Status Merokok</option>
              <option value="Tidak Merokok">Sama sekali nggak ngerokok</option>
              <option value="Kadang-kadang">Kadang-kadang (Social smoker)</option>
              <option value="Perokok Aktif">Perokok aktif</option>
              <option value="Vape">Tim Vape / Pods</option>
            </select>
          </div>
          <div className="input-group">
            <select className="custom-input" value={bioForm.alkohol || ''} onChange={e => updateField('alkohol', e.target.value)}>
              <option value="" disabled>Konsumsi Alkohol</option>
              <option value="Tidak Minum">Sama sekali nggak minum</option>
              <option value="Jarang">Jarang banget</option>
              <option value="Social Drinker">Minum pas nongkrong aja</option>
              <option value="Sering">Lumayan sering</option>
            </select>
          </div>

          {/* Media Sosial - Span 2 Kolom */}
          <div className="social-inputs" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#888' }}>Media Sosial (Opsional)</h4>
            <input type="text" placeholder="IG Username (tanpa @)" className="custom-input"
              value={bioForm.ig_username || ''} onChange={e => updateField('ig_username', e.target.value)} />
            <input type="text" placeholder="TikTok Username (tanpa @)" className="custom-input"
              value={bioForm.tiktok_username || ''} onChange={e => updateField('tiktok_username', e.target.value)} />
            <input type="text" placeholder="Link Playlist Spotify" className="custom-input"
              value={bioForm.spotify_url || ''} onChange={e => updateField('spotify_url', e.target.value)} />
          </div>

        </div>

        <button className="action-btn" onClick={onSave} disabled={isSaving} style={btnStyle}>
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
};

// ================= STYLES =================
// Inline style pembantu agar layoutnya dijamin presisi tanpa merusak CSS kamu yang lain.

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  padding: '20px', zIndex: 1000
};

const contentStyle: React.CSSProperties = {
  backgroundColor: '#ffffff', // Ganti ke warna dark mode (misal #1e1e1e) jika pakai tema gelap
  width: '100%', maxWidth: '500px',
  maxHeight: '85vh', // Membatasi tinggi modal agar tidak menabrak ujung layar
  overflowY: 'auto', // Memastikan bisa di-scroll dengan aman
  borderRadius: '20px',
  padding: '24px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  position: 'relative'
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: '20px',
  paddingBottom: '16px',
  borderBottom: '1px solid #eef0f2'
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '8px', borderRadius: '50%', backgroundColor: '#f1f5f9'
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)', // Memaksa selalu 2 kolom yang sama besar
  gap: '12px'
};

const btnStyle: React.CSSProperties = {
  width: '100%', padding: '16px', marginTop: '24px',
  backgroundColor: '#2563eb', color: 'white', border: 'none',
  borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer'
};

export default React.memo(BioModal);
