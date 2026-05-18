'use client';
import React from 'react';

type Props = {
  bioForm: any;
  setBioForm: (data: any) => void;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
};

const BioModal: React.FC<Props> = ({ bioForm, setBioForm, isSaving, onSave, onClose }) => (
  <div className="tg-modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
    <div className="tg-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><h3>Edit Biodata</h3><button className="close-modal-btn" onClick={onClose}><span className="material-icons">close</span></button></div>
      <div className="form-grid">
        <div className="input-group"><input type="number" placeholder="Umur" value={bioForm.umur} onChange={e => setBioForm({ ...bioForm, umur: e.target.value })} /></div>
        <div className="input-group"><select value={bioForm.gender} onChange={e => setBioForm({ ...bioForm, gender: e.target.value })}><option value="Pria">Pria</option><option value="Wanita">Wanita</option></select></div>
        <input type="text" className="input-group" placeholder="Pekerjaan" value={bioForm.pekerjaan} onChange={e => setBioForm({ ...bioForm, pekerjaan: e.target.value })} />
        <input type="text" className="input-group" placeholder="Hobi" value={bioForm.hobi} onChange={e => setBioForm({ ...bioForm, hobi: e.target.value })} />
        <input type="text" className="input-group" placeholder="Zodiak" value={bioForm.zodiak} onChange={e => setBioForm({ ...bioForm, zodiak: e.target.value })} />
      </div>
      <button className="action-btn" onClick={onSave} disabled={isSaving}>Simpan</button>
    </div>
  </div>
);

export default React.memo(BioModal);