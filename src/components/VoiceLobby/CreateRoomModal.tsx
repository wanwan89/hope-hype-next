'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

// Map Kategori dengan ID yang cocok dengan Database, tapi label bahasa baku
const CATEGORIES = [
  { id: 'Nyanyi', label: 'Bernyanyi' },
  { id: 'Ngobrol', label: 'Mengobrol' },
  { id: 'Mabar', label: 'Bermain Gim' }
];

export default function CreateRoomModal({ isOpen, onClose, currentUser }: CreateRoomModalProps) {
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    name: '',
    desc: '',
    category: 'Nyanyi' // Default id
  });

  if (!isOpen) return null;

  const confirmCreateRoom = async () => {
    const { name, desc, category } = newRoomForm;
    if (!name.trim()) return showNotif('Nama ruangan tidak boleh kosong.', "warning");
    if (!currentUser) return showNotif('Sesi telah berakhir. Harap masuk kembali.', "error");
    
    setIsCreating(true);
    try {
      const { data: oldRooms } = await supabase.from('rooms').select('id').eq('owner_id', currentUser.id);
      
      if (oldRooms && oldRooms.length > 0) {
        const oldRoomIds = oldRooms.map(r => r.id);
        await supabase.from('room_slots').delete().in('room_id', oldRoomIds);
        await supabase.from('rooms').delete().in('id', oldRoomIds);
      }
      
      const { data: newRoom, error: roomError } = await supabase.from('rooms').insert([{
        name: name.trim(),
        description: desc.trim() || 'Mari berinteraksi dan bersenang-senang!',
        category: category,
        owner_id: currentUser.id,
        is_active: true
      }]).select().single();
      
      if (roomError) throw roomError;
      
      const slots = Array.from({ length: 6 }, (_, i) => ({ room_id: newRoom.id, slot_index: i, profile_id: null }));
      await supabase.from('room_slots').insert(slots);
      
      showNotif('Ruang suara berhasil dibuat.', "success");
      onClose();
      router.push(`/voice?id=${newRoom.id}&name=${encodeURIComponent(newRoom.name)}`);
    } catch (e) { 
      showNotif('Terjadi kesalahan saat membuat ruangan.', "error"); 
    } finally { 
      setIsCreating(false); 
    }
  };

  return (
    <div 
      className="voice-modal-overlay active" 
      onClick={onClose}
      // Mematikan efek blur bawaan dari CSS class dan menggantinya dengan warna hitam transparan solid
      style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none', backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
    >
      <div className="voice-modal-content" onClick={e => e.stopPropagation()}>
        <div className="voice-modal-header">
           <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Buat Ruang Suara</h3>
           <button className="voice-close-modal-btn" onClick={onClose}>
             <span className="material-icons">close</span>
           </button>
        </div>
        <div className="voice-modal-body">
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Nama Ruangan</label>
          <input
            type="text" 
            placeholder="Masukkan nama ruangan..."
            maxLength={25} 
            value={newRoomForm.name}
            onChange={e => setNewRoomForm({...newRoomForm, name: e.target.value})}
            style={{ 
              width: '100%', padding: '14px', borderRadius: '12px', 
              border: '1px solid var(--border-card)', background: 'var(--bg-main)', 
              color: 'var(--text-main)', marginBottom: '20px' 
            }}
          />
          
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Kategori</label>
          
          {/* Opsi Kustom tanpa tag <select> agar tidak memunculkan dialog sistem bawaan HP */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {CATEGORIES.map(cat => {
              const isActive = newRoomForm.category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setNewRoomForm({...newRoomForm, category: cat.id})}
                  style={{
                    flex: 1,
                    padding: '12px 4px',
                    borderRadius: '12px',
                    border: isActive ? '2px solid #ef4444' : '1px solid var(--border-card)',
                    background: isActive ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-main)',
                    color: isActive ? '#ef4444' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: 'none'
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="voice-modal-actions">
          <button className="voice-btn-cancel" onClick={onClose}>Batal</button>
          <button className="voice-btn-confirm" onClick={confirmCreateRoom} disabled={isCreating}>
            {isCreating ? 'Membangun...' : 'Buat Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}
