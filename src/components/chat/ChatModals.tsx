import { motion, AnimatePresence } from 'framer-motion';

export default function ChatModals({
  pendingImagePreview, setPendingImage, setPendingImagePreview, setImageCaption, imageCaption,
  handleSendImageFullScreen, isUploadingImg, isGroupSettingsOpen, setIsGroupSettingsOpen,
  groupModalTab, inviteSearch, setInviteSearch, handleAddMember, isUpdatingGroup, groupMembers,
  currentUser, headerInfo, handleGroupPhotoUpload, newGroupName, setNewGroupName, updateGroupInfo,
  isOwner, kickMember
}: any) {
  return (
    <>
      <AnimatePresence>
        {pendingImagePreview && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ position: 'fixed', inset: 0, background: 'var(--bg-main)', zIndex: 9999999, display: 'flex', flexDirection: 'column' }}
          >
            {/* 🔥 PERBAIKAN 1: Hapus position 'absolute' dan ganti dengan flexShrink: 0. 
                 Agar header mengambil ruang statis di atas dan tidak bertumpuk dengan gambar */}
            <div style={{ flexShrink: 0, padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000000', zIndex: 10 }}>
              <button onClick={() => { setPendingImage(null); setPendingImagePreview(null); setImageCaption(''); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <span className="material-icons" style={{fontSize: '28px'}}>close</span>
              </button>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>Kirim Foto</span>
              
              {/* Tombol placeholder untuk fitur Edit/Crop ke depannya */}
              <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => alert("Fitur edit/crop bisa dihubungkan ke library seperti react-easy-crop nantinya!")}>
                <span className="material-icons" style={{fontSize: '24px'}}>crop</span>
              </button>
            </div>

            {/* 🔥 PERBAIKAN 2: Tambahkan minHeight: 0 dan overflow: hidden.
                 Ini adalah kunci wajib agar gambar beresolusi raksasa tidak "mendobrak" flexbox ke bawah */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={pendingImagePreview} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                alt="preview full" 
              />
            </div>

            {/* 🔥 PERBAIKAN 3: Tambahkan flexShrink: 0 pada area input.
                 Agar posisi area chat dan tombol kirim ini terkunci kokoh di bawah layar */}
            <div style={{ flexShrink: 0, padding: '12px 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div className="slim-input-wrapper" style={{ flex: 1, background: 'var(--bg-secondary)' }}>
                <textarea 
                  placeholder="Tambahkan keterangan..." 
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  rows={1}
                  style={{ width: '100%', padding: '8px 4px', fontSize: '15px', color: 'var(--text-main)', background: 'transparent', border: 'none', outline: 'none', resize: 'none' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                  }}
                  autoFocus
                />
              </div>
              <button onClick={handleSendImageFullScreen} disabled={isUploadingImg} className="send-btn-round">
                {isUploadingImg ? ( <span className="material-icons" style={{ animation: 'spinLoading 1s linear infinite' }}>autorenew</span> ) : ( <span className="material-icons">send</span> )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGroupSettingsOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, background: 'var(--bg-main)' }}
              onClick={() => setIsGroupSettingsOpen(false)}
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'relative', background: 'var(--bg-card)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '85vh' }}
            >
              <div style={{ width: '40px', height: '5px', background: 'var(--border-color)', borderRadius: '10px', margin: '0 auto 10px' }} />
              
              <h3 style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {groupModalTab === 'invite' ? 'Tambah Anggota' : 'Pengaturan Grup'}
                <span className="material-icons" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsGroupSettingsOpen(false)}>close</span>
              </h3>

              <div style={{ overflowY: 'auto', paddingRight: '4px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {groupModalTab === 'invite' ? (
                  <>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        placeholder="Username atau #ShortID" 
                        value={inviteSearch} 
                        onChange={e => setInviteSearch(e.target.value)} 
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                      />
                      <button 
                        onClick={handleAddMember} 
                        disabled={isUpdatingGroup || !inviteSearch.trim()}
                        style={{ background: 'var(--primary-blue)', color: 'white', border: 'none', padding: '0 20px', borderRadius: '12px', fontWeight: 'bold', opacity: (isUpdatingGroup || !inviteSearch.trim()) ? 0.7 : 1, cursor: 'pointer' }}
                      >
                        Tambah
                      </button>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--text-muted)' }}>Daftar Anggota ({groupMembers.length})</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {groupMembers.map((m: any) => (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '12px' }}>
                            <img src={m.profiles?.avatar_url || '/asets/png/profile.webp'} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="avatar"/>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{m.profiles?.username}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.user_id === currentUser?.id ? 'Kamu' : 'Member'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                      <div style={{ position: 'relative' }}>
                        <img src={headerInfo.avatar || '/asets/png/profile.webp'} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} alt="group avatar" />
                        <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary-blue)', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <span className="material-icons" style={{ fontSize: '16px' }}>edit</span>
                          <input type="file" hidden accept="image/*" onChange={handleGroupPhotoUpload} disabled={isUpdatingGroup} />
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        <input 
                          value={newGroupName} 
                          onChange={e => setNewGroupName(e.target.value)} 
                          style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', textAlign: 'center', fontWeight: 'bold', outline: 'none' }}
                        />
                        <button 
                          onClick={() => updateGroupInfo('name', newGroupName)} 
                          disabled={isUpdatingGroup || newGroupName === headerInfo.title || !newGroupName.trim()}
                          style={{ background: 'var(--primary-blue)', color: 'white', border: 'none', padding: '0 20px', borderRadius: '12px', fontWeight: 'bold', opacity: (isUpdatingGroup || newGroupName === headerInfo.title) ? 0.7 : 1, cursor: 'pointer' }}
                        >
                          Simpan
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--text-muted)' }}>Manajemen Anggota</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {groupMembers.map((m: any) => (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '12px' }}>
                            <img src={m.profiles?.avatar_url || '/asets/png/profile.webp'} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="avatar"/>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{m.profiles?.username}</div>
                            </div>
                            {isOwner && m.user_id !== currentUser?.id && (
                              <button 
                                onClick={() => kickMember(m.user_id, m.profiles?.username)}
                                style={{ background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Keluarkan
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
