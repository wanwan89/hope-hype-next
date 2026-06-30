'use client';
import React, { useState, useEffect } from 'react';

type Props = {
  bioForm: any;
  setBioForm: (data: any) => void;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
};

// Tipe untuk konfigurasi halaman pilihan (Selection View)
type SelectionConfig = {
  field: string;
  title: string;
  icon: string;
  options: { label: string; value: string }[];
} | null;

// ==========================================
// KOMPONEN LIST ITEM (Untuk baris menu)
// ==========================================
const ListItem = ({
  icon,
  label,
  value,
  onClick,
  isLast = false,
}: {
  icon: string;
  label: string;
  value: string;
  onClick: () => void;
  isLast?: boolean;
}) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px',
      borderBottom: isLast ? 'none' : '1px solid #f0f0f0',
      cursor: 'pointer',
      backgroundColor: '#fff',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span className="material-icons" style={{ color: '#666', fontSize: '20px' }}>
        {icon}
      </span>
      <span style={{ fontSize: '15px', color: '#333' }}>{label}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ fontSize: '14px', color: '#999' }}>{value || ''}</span>
      <span className="material-icons" style={{ color: '#ccc', fontSize: '20px' }}>
        chevron_right
      </span>
    </div>
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function BioModal({ bioForm, setBioForm, isSaving, onSave, onClose }: Props) {
  // State untuk mengontrol view mana yang aktif ('main' atau 'selection')
  const [activeView, setActiveView] = useState<'main' | 'selection'>('main');
  const [selectionConfig, setSelectionConfig] = useState<SelectionConfig>(null);

  // Helper untuk update state form
  const updateField = (field: string, value: any) => {
    setBioForm({ ...bioForm, [field]: value });
  };

  // Buka halaman pilihan
  const openSelection = (config: NonNullable<SelectionConfig>) => {
    setSelectionConfig(config);
    setActiveView('selection');
  };

  // 🔥 Dispatch event agar Navbar tahu BioModal terbuka
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('biomodal-state', { detail: { isOpen: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent('biomodal-state', { detail: { isOpen: false } }));
    };
  }, []);

  // ==========================================
  // VIEW 2: HALAMAN PILIHAN (SELECTION VIEW)
  // ==========================================
  if (activeView === 'selection' && selectionConfig) {
    const currentValue = bioForm[selectionConfig.field];

    return (
      <div style={fullScreenOverlayStyle}>
        {/* Header Selection */}
        <div style={selectionHeaderStyle}>
          <button
            onClick={() => setActiveView('main')}
            style={{ ...iconBtnStyle, color: '#ccc', position: 'absolute', left: '16px' }}
          >
            <span className="material-icons">close</span>
          </button>
          {/* Progress Bar Mockup */}
          <div style={progressBarStyle}>
            <div style={progressFillStyle}></div>
          </div>
        </div>

        {/* Content Selection */}
        <div style={{ padding: '24px', textAlign: 'center', flex: 1, overflowY: 'auto' }}>
          <span className="material-icons" style={{ fontSize: '48px', color: '#333', marginBottom: '16px' }}>
            {selectionConfig.icon}
          </span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333', marginBottom: '32px' }}>
            {selectionConfig.title}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectionConfig.options.map((opt, idx) => {
              const isSelected = currentValue === opt.value;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    updateField(selectionConfig.field, opt.value);
                    setTimeout(() => setActiveView('main'), 150); // Delay sedikit agar user melihat efek klik
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '30px',
                    border: isSelected ? 'none' : '1px solid #e0e0e0',
                    backgroundColor: isSelected ? '#10b981' : '#fff', // Hijau jika dipilih
                    color: isSelected ? '#fff' : '#333',
                    fontSize: '15px',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Selection */}
        <div style={{ padding: '24px', borderTop: '1px solid #f0f0f0' }}>
          <button
            onClick={() => {
              updateField(selectionConfig.field, '');
              setActiveView('main');
            }}
            style={{
              padding: '12px 24px',
              borderRadius: '20px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#fff',
              color: '#666',
              cursor: 'pointer',
            }}
          >
            Hapus
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: HALAMAN UTAMA (UBAH PROFIL)
  // ==========================================
  return (
    <div style={fullScreenOverlayStyle}>
      {/* Header Utama */}
      <div style={headerStyle}>
        <button onClick={onClose} style={{ ...iconBtnStyle, color: '#00c99f' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#333' }}>
          Ubah Profil
        </h3>
        <button onClick={onSave} disabled={isSaving} style={{ ...iconBtnStyle, color: '#00c99f' }}>
          {isSaving ? (
            <span className="material-icons" style={{ fontSize: '18px' }}>hourglass_empty</span>
          ) : (
            <span className="material-icons">check</span>
          )}
        </button>
      </div>

      {/* Tabs Mockup */}
      <div style={tabsContainerStyle}>
        <div style={{ ...tabStyle, ...activeTabStyle }}>Ubah</div>
        <div style={tabStyle}>Pratinjau</div>
      </div>

      {/* Scroll Area */}
      <div style={scrollAreaStyle}>
        
        {/* Mockup Foto Grid */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>Foto</span>
            <span style={{ fontSize: '14px', color: '#ff4d4f' }}>+10%</span>
          </div>
          <div style={photoGridStyle}>
            {/* Slot Foto (Simulasi) */}
            <div style={photoSlotStyle}>
              <img src="/api/placeholder/100/100" alt="foto" style={imgStyle} />
              <div style={removeBtnStyle}><span className="material-icons" style={{fontSize: '14px', color: '#fff'}}>close</span></div>
            </div>
            <div style={photoSlotStyle}>
              <img src="/api/placeholder/100/100" alt="foto" style={imgStyle} />
              <div style={removeBtnStyle}><span className="material-icons" style={{fontSize: '14px', color: '#fff'}}>close</span></div>
            </div>
            <div style={photoSlotStyle}>
              <img src="/api/placeholder/100/100" alt="foto" style={imgStyle} />
              <div style={removeBtnStyle}><span className="material-icons" style={{fontSize: '14px', color: '#fff'}}>close</span></div>
            </div>
            {/* Slot Kosong */}
            <div style={emptySlotStyle}>
              <span className="material-icons" style={{fontSize: '32px', color: '#666'}}>beach_access</span>
              <span style={{fontSize:'12px', color: '#999', marginTop: '8px'}}>Travel</span>
            </div>
            <div style={emptySlotStyle}>
              <span className="material-icons" style={{fontSize: '32px', color: '#666'}}>pets</span>
              <span style={{fontSize:'12px', color: '#999', marginTop: '8px', textAlign: 'center'}}>Bersama Peliharaan</span>
            </div>
            <div style={emptySlotStyle}>
              <span className="material-icons" style={{fontSize: '32px', color: '#666'}}>menu_book</span>
              <span style={{fontSize:'12px', color: '#999', marginTop: '8px'}}>Kehidupan</span>
            </div>
          </div>
        </div>

        {/* Tentang Aku */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Tentang Aku</div>
          <div style={cardStyle}>
            <textarea
              placeholder="Ceritakan tentang dirimu..."
              value={bioForm.bio_hype || ''}
              onChange={(e) => updateField('bio_hype', e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                minHeight: '80px',
                resize: 'none',
                fontSize: '15px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {/* Profesi dan Pendidikan */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Profesi dan Pendidikan</div>
          <div style={cardStyle}>
            <ListItem
              icon="school"
              label="Pendidikan"
              value={bioForm.pendidikan || 'Pilih'}
              onClick={() =>
                openSelection({
                  field: 'pendidikan',
                  title: 'Apa tingkat pendidikanmu?',
                  icon: 'school',
                  options: [
                    { label: 'SMA', value: 'SMA' },
                    { label: 'Diploma', value: 'Diploma' },
                    { label: 'S1', value: 'S1' },
                    { label: 'S2 atau ke atas', value: 'S2/S3' },
                    { label: 'Lainnya', value: 'Lainnya' },
                  ],
                })
              }
            />
            <ListItem
              icon="work"
              label="Pekerjaan"
              value={bioForm.pekerjaan || 'Pilih'}
              onClick={() =>
                openSelection({
                  field: 'pekerjaan',
                  title: 'Apa pekerjaanmu saat ini?',
                  icon: 'work',
                  options: [
                    { label: 'Marketing', value: 'Marketing' },
                    { label: 'IT / Tech', value: 'IT / Tech' },
                    { label: 'Kesehatan', value: 'Kesehatan' },
                    { label: 'Pendidikan', value: 'Pendidikan' },
                    { label: 'Wiraswasta', value: 'Wiraswasta' },
                    { label: 'Lainnya', value: 'Lainnya' },
                  ],
                })
              }
              isLast={true}
            />
          </div>
        </div>

        {/* Informasi Dasar */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Informasi Dasar</div>
          <div style={cardStyle}>
            <ListItem
              icon="person"
              label="Gender"
              value={bioForm.gender || 'Pilih'}
              onClick={() =>
                openSelection({
                  field: 'gender',
                  title: 'Apa gendermu?',
                  icon: 'person',
                  options: [
                    { label: 'Pria', value: 'Pria' },
                    { label: 'Wanita', value: 'Wanita' },
                  ],
                })
              }
            />
             <ListItem
              icon="height"
              label="Tinggi"
              value={bioForm.tinggi_badan ? `${bioForm.tinggi_badan} cm` : 'Pilih'}
              onClick={() => {
                const tinggi = prompt("Masukkan tinggi badan (cm):", bioForm.tinggi_badan || "");
                if(tinggi) updateField('tinggi_badan', tinggi);
              }}
            />
            <ListItem
              icon="church"
              label="Agama"
              value={bioForm.agama || 'Pilih'}
              onClick={() =>
                openSelection({
                  field: 'agama',
                  title: 'Apa kepercayaanmu?',
                  icon: 'church',
                  options: [
                    { label: 'Islam', value: 'Islam' },
                    { label: 'Kristen Protestan', value: 'Kristen' },
                    { label: 'Katolik', value: 'Katolik' },
                    { label: 'Hindu', value: 'Hindu' },
                    { label: 'Buddha', value: 'Buddha' },
                  ],
                })
              }
              isLast={true}
            />
          </div>
        </div>

        {/* Gaya Hidup */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Gaya Hidup</div>
          <div style={cardStyle}>
            <ListItem
              icon="search"
              label="Bertujuan"
              value={bioForm.tujuan || 'Pilih'}
              onClick={() =>
                openSelection({
                  field: 'tujuan',
                  title: 'Apa tujuanmu di sini?',
                  icon: 'favorite',
                  options: [
                    { label: 'Hubungan serius', value: 'Hubungan serius' },
                    { label: 'Sesuatu yang santai', value: 'Santai' },
                    { label: 'Mencari teman', value: 'Teman' },
                    { label: 'Belum tahu', value: 'Belum tahu' },
                  ],
                })
              }
            />
            <ListItem
              icon="fitness_center"
              label="Olahraga"
              value={bioForm.olahraga || 'Pilih'}
              onClick={() =>
                openSelection({
                  field: 'olahraga',
                  title: 'Seberapa sering kamu olahraga?',
                  icon: 'fitness_center',
                  options: [
                    { label: 'Aktif / Sering', value: 'Sering' },
                    { label: 'Kadang-kadang', value: 'Kadang-kadang' },
                    { label: 'Jarang', value: 'Jarang' },
                  ],
                })
              }
            />
            <ListItem
              icon="smoking_rooms"
              label="Merokok"
              value={bioForm.merokok || 'Pilih'}
              onClick={() =>
                openSelection({
                  field: 'merokok',
                  title: 'Apakah kamu merokok?',
                  icon: 'smoking_rooms',
                  options: [
                    { label: 'Perokok sosial', value: 'Perokok sosial' },
                    { label: 'Perokok aktif', value: 'Perokok aktif' },
                    { label: 'Tidak merokok', value: 'Tidak merokok' },
                  ],
                })
              }
            />
            <ListItem
              icon="local_bar"
              label="Alkoholik"
              value={bioForm.alkohol || 'Pilih'}
              onClick={() =>
                openSelection({
                  field: 'alkohol',
                  title: 'Seberapa sering minum alkohol?',
                  icon: 'local_bar',
                  options: [
                    { label: 'Peminum ringan', value: 'Peminum ringan' },
                    { label: 'Sering', value: 'Sering' },
                    { label: 'Tidak minum', value: 'Tidak minum' },
                  ],
                })
              }
              isLast={true}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

// ================= STYLES =================
const fullScreenOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#f8f9fa',
  zIndex: 100000,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'sans-serif',
};

const headerStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  flexShrink: 0,
};

const tabsContainerStyle: React.CSSProperties = {
  display: 'flex',
  backgroundColor: '#fff',
  padding: '0 24px',
  borderBottom: '1px solid #eee',
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  textAlign: 'center',
  padding: '12px 0',
  color: '#999',
  fontSize: '15px',
  cursor: 'pointer',
};

const activeTabStyle: React.CSSProperties = {
  color: '#00c99f',
  fontWeight: 'bold',
  borderBottom: '2px solid #00c99f',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
};

const scrollAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '20px',
  paddingBottom: '80px',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '24px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#888',
  marginBottom: '12px',
  marginLeft: '4px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '16px',
  padding: '8px 16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  border: '1px solid #f0f0f0',
};

// Photo Grid Styles
const photoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '12px',
};

const photoSlotStyle: React.CSSProperties = {
  position: 'relative',
  aspectRatio: '3/4',
  borderRadius: '12px',
  overflow: 'hidden',
  backgroundColor: '#eee',
};

const imgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const removeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '8px',
  right: '8px',
  backgroundColor: '#00c99f',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
};

const emptySlotStyle: React.CSSProperties = {
  aspectRatio: '3/4',
  borderRadius: '12px',
  backgroundColor: '#fff',
  border: '1px solid #e0e0e0',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '8px',
};

// Selection View Styles
const selectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
  backgroundColor: '#f8f9fa',
  position: 'relative',
};

const progressBarStyle: React.CSSProperties = {
  width: '120px',
  height: '4px',
  backgroundColor: '#e0e0e0',
  borderRadius: '2px',
};

const progressFillStyle: React.CSSProperties = {
  width: '70%',
  height: '100%',
  backgroundColor: '#10b981', // Hijau
  borderRadius: '2px',
};
