'use client';
import React, { useState } from 'react';

type Props = {
  bioForm: any;
  setBioForm: (data: any) => void;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
};

// ==========================================
// KOMPONEN CUSTOM DROPDOWN (Bukan bawaan sistem)
// ==========================================
const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  options: { label: string, value: string }[], 
  placeholder: string 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Tampilan Input Select */}
      <div 
        className="custom-input"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          cursor: 'pointer', userSelect: 'none'
        }}
      >
        <span style={{ color: selectedOption ? 'var(--text-main)' : 'var(--text-muted)' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="material-icons" style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'none', 
          transition: 'transform 0.2s ease',
          color: 'var(--text-muted)'
        }}>
          expand_more
        </span>
      </div>

      {/* Pop-up List Pilihan */}
      {isOpen && (
        <>
          {/* Overlay transparan agar kalau klik di luar, dropdown tertutup */}
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 100,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            maxHeight: '220px', overflowY: 'auto'
          }}>
            {options.map((opt, idx) => (
              <div 
                key={idx}
                onClick={(e) => { e.stopPropagation(); onChange(opt.value); setIsOpen(false); }}
                style={{
                  padding: '14px 16px',
                  borderBottom: idx === options.length - 1 ? 'none' : '1px solid var(--border-card)',
                  backgroundColor: value === opt.value ? 'var(--bg-secondary)' : 'transparent',
                  color: value === opt.value ? 'var(--primary)' : 'var(--text-main)',  // ✅ teks saja
                  fontWeight: value === opt.value ? 'bold' : 'normal',
                  cursor: 'pointer', fontSize: '14px'
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ==========================================
// MAIN COMPONENT (FULL SCREEN MODAL)
// ==========================================
const BioModal: React.FC<Props> = ({ bioForm, setBioForm, isSaving, onSave, onClose }) => {
  const updateField = (field: string, value: any) => setBioForm({ ...bioForm, [field]: value });

  return (
    <div className="tg-modal-overlay" style={fullScreenOverlayStyle}>
      <div className="tg-modal-content" style={fullScreenContentStyle}>
        
        {/* Header Lengkapi Biodata */}
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>Lengkapi Biodata</h3>
          <button className="close-modal-btn" onClick={onClose} style={closeBtnStyle}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="form-grid" style={gridStyle}>
          
          {/* Baris 1 */}
          <div className="input-group" style={inputGroupStyle}>
            <input type="number" placeholder="Umur" className="custom-input"
              value={bioForm.umur || ''} onChange={e => updateField('umur', e.target.value)} />
          </div>
          <div className="input-group" style={inputGroupStyle}>
            <CustomSelect 
              value={bioForm.gender || ''} 
              onChange={val => updateField('gender', val)}
              placeholder="Pilih Gender"
              options={[ {label: 'Pria', value: 'Pria'}, {label: 'Wanita', value: 'Wanita'} ]}
            />
          </div>

          {/* Baris 2 */}
          <div className="input-group" style={inputGroupStyle}>
            <input type="text" placeholder="Lokasi/Kota" className="custom-input"
              value={bioForm.lokasi || ''} onChange={e => updateField('lokasi', e.target.value)} />
          </div>
          <div className="input-group" style={inputGroupStyle}>
            <CustomSelect 
              value={bioForm.agama || ''} 
              onChange={val => updateField('agama', val)}
              placeholder="Agama"
              options={[
                {label: 'Islam', value: 'Islam'}, {label: 'Kristen Protestan', value: 'Kristen'},
                {label: 'Katolik', value: 'Katolik'}, {label: 'Hindu', value: 'Hindu'},
                {label: 'Buddha', value: 'Buddha'}, {label: 'Lainnya', value: 'Lainnya'}
              ]}
            />
          </div>

          {/* Baris 3 */}
          <div className="input-group" style={inputGroupStyle}>
            <input type="text" placeholder="Pekerjaan / Jabatan" className="custom-input"
              value={bioForm.pekerjaan || ''} onChange={e => updateField('pekerjaan', e.target.value)} />
          </div>
          <div className="input-group" style={inputGroupStyle}>
            <CustomSelect 
              value={bioForm.pendidikan || ''} 
              onChange={val => updateField('pendidikan', val)}
              placeholder="Pendidikan Terakhir"
              options={[
                {label: 'SMA/SMK Sederajat', value: 'SMA/SMK'}, {label: 'Diploma (D1-D4)', value: 'Diploma'},
                {label: 'Sarjana (S1)', value: 'S1'}, {label: 'Pascasarjana (S2/S3)', value: 'S2/S3'}
              ]}
            />
          </div>

          {/* Baris 4 */}
          <div className="input-group" style={inputGroupStyle}>
            <input type="number" placeholder="Tinggi Badan (cm)" className="custom-input"
              value={bioForm.tinggi_badan || ''} onChange={e => updateField('tinggi_badan', e.target.value)} />
          </div>
          <div className="input-group" style={inputGroupStyle}>
            <CustomSelect 
              value={bioForm.olahraga || ''} 
              onChange={val => updateField('olahraga', val)}
              placeholder="Olahraga Favorit"
              options={[
                {label: 'Gym / Fitness', value: 'Gym/Fitness'}, {label: 'Lari / Jogging', value: 'Lari/Jogging'},
                {label: 'Sepak Bola / Futsal', value: 'Sepak Bola/Futsal'}, {label: 'Berenang', value: 'Berenang'},
                {label: 'Bela Diri', value: 'Bela Diri'}, {label: 'Jarang Olahraga', value: 'Jarang Olahraga'}
              ]}
            />
          </div>

          {/* ======================================= */}
          {/* BIO HYPE MATCH                          */}
          {/* ======================================= */}
          <div className="input-group" style={{ ...inputGroupStyle, gridColumn: '1 / -1' }}>
            <label style={{ marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600' }}>
              Bio Hype Match
            </label>
            <textarea 
              placeholder="Tulis kalimat singkat, lucu, atau pick-up line (Khusus tampil di Hype Match)..." 
              className="custom-input" 
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={bioForm.bio_hype || ''} 
              onChange={e => updateField('bio_hype', e.target.value)} 
            />
          </div>
          
          {/* Baris 5 */}
          <div className="input-group" style={inputGroupStyle}>
            <CustomSelect 
              value={bioForm.tujuan || ''} 
              onChange={val => updateField('tujuan', val)}
              placeholder="Tujuan Bergabung"
              options={[
                {label: 'Nambah Teman / Relasi', value: 'Teman'}, {label: 'Cari Pasangan Serius', value: 'Pasangan'},
                {label: 'Casual / Santai dulu', value: 'Casual'}, {label: 'Networking Profesional', value: 'Networking'}
              ]}
            />
          </div>
          <div className="input-group" style={inputGroupStyle}>
            <input type="text" placeholder="Hobi Utama (Musik, Traveling)" className="custom-input"
              value={bioForm.hobi || ''} onChange={e => updateField('hobi', e.target.value)} />
          </div>

          {/* Baris 6 */}
          <div className="input-group" style={inputGroupStyle}>
             <CustomSelect 
              value={bioForm.merokok || ''} 
              onChange={val => updateField('merokok', val)}
              placeholder="Status Merokok"
              options={[
                {label: 'Sama sekali nggak ngerokok', value: 'Tidak Merokok'}, {label: 'Kadang-kadang (Social)', value: 'Kadang-kadang'},
                {label: 'Perokok aktif', value: 'Perokok Aktif'}, {label: 'Tim Vape / Pods', value: 'Vape'}
              ]}
            />
          </div>
          <div className="input-group" style={inputGroupStyle}>
            <CustomSelect 
              value={bioForm.alkohol || ''} 
              onChange={val => updateField('alkohol', val)}
              placeholder="Konsumsi Alkohol"
              options={[
                {label: 'Sama sekali nggak minum', value: 'Tidak Minum'}, {label: 'Jarang banget', value: 'Jarang'},
                {label: 'Minum pas nongkrong aja', value: 'Social Drinker'}, {label: 'Lumayan sering', value: 'Sering'}
              ]}
            />
          </div>

          {/* Media Sosial */}
          <div className="social-inputs" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-main)' }}>Media Sosial (Opsional)</h4>
            <input type="text" placeholder="IG Username (tanpa @)" className="custom-input"
              value={bioForm.ig_username || ''} onChange={e => updateField('ig_username', e.target.value)} />
            <input type="text" placeholder="TikTok Username (tanpa @)" className="custom-input"
              value={bioForm.tiktok_username || ''} onChange={e => updateField('tiktok_username', e.target.value)} />
            <input type="text" placeholder="Link Playlist Spotify" className="custom-input"
              value={bioForm.spotify_url || ''} onChange={e => updateField('spotify_url', e.target.value)} />
          </div>

        </div>

        {/* Spacer agar tombol tidak mepet ke konten paling bawah */}
        <div style={{ flexGrow: 1, minHeight: '40px' }}></div>

        {/* Tombol Simpan Sticky di Bawah (UPDATED) */}
        <div style={{ 
          position: 'sticky', bottom: 0, padding: '16px 0', 
          backgroundColor: 'transparent'
        }}>
          <button className="action-btn" onClick={onSave} disabled={isSaving} style={btnStyle}>
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>

      </div>
    </div>
  );
};

// ================= STYLES =================

const fullScreenOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'var(--bg-main)',
  zIndex: 100000, display: 'flex', flexDirection: 'column'
};

const fullScreenContentStyle: React.CSSProperties = {
  width: '100%', height: '100%',
  overflowY: 'auto', 
  padding: '24px',
  display: 'flex', flexDirection: 'column',
  backgroundColor: 'var(--bg-main)'
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: '24px', paddingBottom: '16px',
  borderBottom: '1px solid var(--border-card)'
};

const closeBtnStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '8px', borderRadius: '50%', color: 'var(--text-main)'
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)', 
  gap: '16px'
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
  width: '100%', margin: 0, padding: 0, border: 'none', background: 'transparent'
};

const btnStyle: React.CSSProperties = {
  width: '100%', padding: '16px',
  backgroundColor: 'var(--primary-bg)',   // ✅ latar biru tetap
  color: 'white', border: 'none',
  borderRadius: '16px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
};

export default React.memo(BioModal);