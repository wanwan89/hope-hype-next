'use client';
import React, { useState, useEffect, useRef } from 'react';

type Props = {
  bioForm: any;
  setBioForm: (data: any) => void;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
};

type SelectionConfig = {
  field: string;
  title: string;
  icon: string;
  options: { label: string; value: string }[];
} | null;

// ==========================================
// KOMPONEN LIST ITEM
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
      borderBottom: isLast ? 'none' : '1px solid var(--bg-secondary)',
      cursor: 'pointer',
      backgroundColor: 'transparent',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span className="material-icons" style={{ color: 'var(--text-muted)', fontSize: '20px' }}>
        {icon}
      </span>
      <span style={{ fontSize: '15px', color: 'var(--text-main)' }}>{label}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{value || ''}</span>
      <span className="material-icons" style={{ color: 'var(--text-muted)', fontSize: '20px', opacity: 0.7 }}>
        chevron_right
      </span>
    </div>
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function BioModal({ bioForm, setBioForm, isSaving, onSave, onClose }: Props) {
  const [activeView, setActiveView] = useState<'main' | 'selection'>('main');
  const [selectionConfig, setSelectionConfig] = useState<SelectionConfig>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadIndex, setUploadIndex] = useState<number>(0);

  // Pastikan photos selalu berupa array dengan panjang 3
  const currentPhotos = Array.isArray(bioForm.photos) && bioForm.photos.length > 0
    ? [...bioForm.photos, null, null, null].slice(0, 3) 
    : [null, null, null];

  const updateField = (field: string, value: any) => {
    setBioForm({ ...bioForm, [field]: value });
  };

  const openSelection = (config: NonNullable<SelectionConfig>) => {
    setSelectionConfig(config);
    setActiveView('selection');
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('biomodal-state', { detail: { isOpen: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent('biomodal-state', { detail: { isOpen: false } }));
    };
  }, []);

  // ==========================================
  // LOGIKA PENGELOLAAN FOTO
  // ==========================================
  const triggerPhotoUpload = (index: number) => {
    setUploadIndex(index);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tempUrl = URL.createObjectURL(file);
    const newPhotos = [...currentPhotos];
    newPhotos[uploadIndex] = tempUrl;

    setBioForm({
      ...bioForm,
      photos: newPhotos,
      // Simpan object file mentah agar bisa di-upload ke Cloudinary via Parent
      [`raw_file_${uploadIndex}`]: file 
    });

    e.target.value = '';
  };

  const handlePhotoRemove = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPhotos = [...currentPhotos];
    newPhotos[index] = null;
    
    const filteredPhotos = newPhotos.filter(Boolean);
    const finalizedPhotos = [...filteredPhotos, null, null, null].slice(0, 3);

    const updatedBioForm = { ...bioForm, photos: finalizedPhotos };

    // Hapus raw file jika ada
    delete updatedBioForm[`raw_file_${index}`];

    setBioForm(updatedBioForm);
  };

  // ==========================================
  // VIEW 2: HALAMAN PILIHAN (SELECTION VIEW)
  // ==========================================
  if (activeView === 'selection' && selectionConfig) {
    const currentValue = bioForm[selectionConfig.field];

    return (
      <div style={fullScreenOverlayStyle}>
        <div style={selectionHeaderStyle}>
          <button
            onClick={() => setActiveView('main')}
            style={{ ...iconBtnStyle, color: 'var(--text-muted)', position: 'absolute', left: '16px' }}
          >
            <span className="material-icons">close</span>
          </button>
          <div style={progressBarStyle}>
            <div style={progressFillStyle}></div>
          </div>
        </div>

        <div style={{ padding: '24px', textAlign: 'center', flex: 1, overflowY: 'auto' }}>
          <span className="material-icons" style={{ fontSize: '48px', color: 'var(--text-main)', marginBottom: '16px' }}>
            {selectionConfig.icon}
          </span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '32px' }}>
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
                    setTimeout(() => setActiveView('main'), 150);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '30px',
                    border: isSelected ? 'none' : '1px solid var(--bg-secondary)',
                    backgroundColor: isSelected ? 'var(--primary-bg)' : 'var(--bg-card)',
                    color: isSelected ? '#ffffff' : 'var(--text-main)',
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

        <div style={{ padding: '24px', borderTop: '1px solid var(--bg-secondary)', backgroundColor: 'var(--bg-main)' }}>
          <button
            onClick={() => {
              updateField(selectionConfig.field, '');
              setActiveView('main');
            }}
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: '20px',
              border: '1px solid var(--bg-secondary)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Hapus Pilihan
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
      <div style={headerStyle}>
        <button onClick={onClose} style={{ ...iconBtnStyle, color: 'var(--text-main)' }}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main)' }}>
          Ubah Profil
        </h3>
        <button onClick={onSave} disabled={isSaving} style={{ ...iconBtnStyle, color: 'var(--primary-bg)' }}>
          {isSaving ? (
            <span className="material-icons" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>hourglass_empty</span>
          ) : (
            <span className="material-icons">check</span>
          )}
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      <div className="main-content" style={scrollAreaStyle}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>Foto Profil</span>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Maks. 3</span>
          </div>
          <div style={photoGridStyle}>
            {[0, 1, 2].map((index) => (
              <div 
                key={index}
                onClick={() => triggerPhotoUpload(index)}
                style={currentPhotos[index] ? photoSlotStyle : emptySlotStyle}
              >
                {currentPhotos[index] ? (
                  <>
                    <img src={currentPhotos[index]} alt={`Profile ${index + 1}`} style={imgStyle} />
                    <div 
                      style={removeBtnStyle} 
                      onClick={(e) => handlePhotoRemove(index, e)}
                    >
                      <span className="material-icons" style={{fontSize: '14px', color: '#fff'}}>close</span>
                    </div>
                  </>
                ) : (
                  <span className="material-icons" style={{fontSize: '32px', color: 'var(--text-muted)'}}>
                    add_photo_alternate
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

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
                fontFamily: 'inherit',
                backgroundColor: 'transparent',
                color: 'var(--text-main)'
              }}
            />
          </div>
        </div>

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
            {/* Field pekerjaan diubah menjadi occupation */}
            <ListItem
              icon="work"
              label="Pekerjaan"
              value={bioForm.occupation || 'Pilih'}
              onClick={() =>
                openSelection({
                  field: 'occupation',
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
                if(tinggi && !isNaN(Number(tinggi))) updateField('tinggi_badan', tinggi);
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
  backgroundColor: 'var(--bg-main)',
  zIndex: 100000,
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-main)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  flexShrink: 0,
  borderBottom: '1px solid var(--border-editor)',
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
  padding: '20px',
  paddingBottom: '80px', 
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '24px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: 'var(--text-muted)',
  marginBottom: '12px',
  marginLeft: '4px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: '16px',
  padding: '8px 16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  border: '1px solid var(--border-editor)',
};

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
  backgroundColor: 'var(--bg-secondary)',
  cursor: 'pointer',
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
  backgroundColor: '#ff4757',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  zIndex: 10,
};

const emptySlotStyle: React.CSSProperties = {
  aspectRatio: '3/4',
  borderRadius: '12px',
  backgroundColor: 'var(--bg-card)',
  border: '2px dashed var(--bg-secondary)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '8px',
  cursor: 'pointer',
};

const selectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
  backgroundColor: 'var(--bg-main)',
  position: 'relative',
};

const progressBarStyle: React.CSSProperties = {
  width: '120px',
  height: '4px',
  backgroundColor: 'var(--bg-secondary)',
  borderRadius: '2px',
};

const progressFillStyle: React.CSSProperties = {
  width: '70%',
  height: '100%',
  backgroundColor: 'var(--primary-bg)',
  borderRadius: '2px',
};
