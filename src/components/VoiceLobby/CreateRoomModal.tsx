'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export default function CreateRoomModal({ isOpen, onClose, currentUser }: CreateRoomModalProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const [isCreating, setIsCreating] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    name: '',
    desc: '',
    category: 'Nyanyi'
  });

  if (!isOpen) return null;

  const confirmCreateRoom = async () => {
    const { name, desc, category } = newRoomForm;
    if (!name.trim()) return showNotif(t('modal_room_placeholder'), "warning");
    if (!currentUser) return showNotif(t('session_expired'), "error");
    
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
        description: desc.trim() || 'Ayo nyanyi bareng!',
        category: category,
        owner_id: currentUser.id,
        is_active: true
      }]).select().single();
      
      if (roomError) throw roomError;
      
      const slots = Array.from({ length: 6 }, (_, i) => ({ room_id: newRoom.id, slot_index: i, profile_id: null }));
      await supabase.from('room_slots').insert(slots);
      
      showNotif(t('profile_updated'), "success");
      onClose();
      router.push(`/voice?id=${newRoom.id}&name=${encodeURIComponent(newRoom.name)}`);
    } catch (e) { 
      showNotif(t('create_room_error'), "error"); 
    } finally { 
      setIsCreating(false); 
    }
  };

  return (
    <div className="voice-modal-overlay active" onClick={onClose}>
      <div className="voice-modal-content" onClick={e => e.stopPropagation()}>
        <div className="voice-modal-header">
           <h3>{t('modal_room_title')}</h3>
           <button className="voice-close-modal-btn" onClick={onClose}>
             <span className="material-icons">close</span>
           </button>
        </div>
        <div className="voice-modal-body">
          <label>{t('modal_room_name_label')}</label>
          <input
            type="text" 
            placeholder={t('modal_room_placeholder')}
            maxLength={25} 
            value={newRoomForm.name}
            onChange={e => setNewRoomForm({...newRoomForm, name: e.target.value})}
          />
          <label>{t('modal_room_cat_label')}</label>
          <select
            className="voice-select-custom"
            value={newRoomForm.category}
            onChange={e => setNewRoomForm({...newRoomForm, category: e.target.value})}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', 
              background: 'var(--bg-main)', color: 'var(--text-main)', 
              border: '1px solid var(--border-card)', marginBottom: '20px'
            }}
          >
            <option value="Nyanyi">{t('category_singing')}</option>
            <option value="Ngobrol">{t('category_chatting')}</option>
            <option value="Mabar">{t('category_gaming')}</option>
          </select>
        </div>
        <div className="voice-modal-actions">
          <button className="voice-btn-cancel" onClick={onClose}>{t('btn_cancel')}</button>
          <button className="voice-btn-confirm" onClick={confirmCreateRoom} disabled={isCreating}>
            {isCreating ? t('btn_building') : t('btn_create')}
          </button>
        </div>
      </div>
    </div>
  );
}
