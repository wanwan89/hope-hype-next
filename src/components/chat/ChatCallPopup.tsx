'use client';

import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatCallPopup({
  callStatus, callData, refs, connectLiveKit, endCall, currentUser
}: any) {
  // Kita bungkus seluruh popup di dalam AnimatePresence 
  // agar animasi exit (slide up) bisa berjalan ketika status kembali 'idle'
  return (
    <AnimatePresence>
      {callStatus !== 'idle' && (
        <motion.div 
          className="call-floating-popup"
          // Animasi dari luar layar atas (-150px) turun ke posisi normal (0)
          initial={{ y: -150, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: -150, x: "-50%", opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={{
            position: 'fixed',
            top: '20px',          // Jarak dari atas layar
            left: '50%',          // Setup centering horisontal
            zIndex: 99999,        // Pastikan selalu di paling atas
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            background: 'rgba(30, 30, 30, 0.95)', // Background gelap dengan efek tembus pandang
            backdropFilter: 'blur(10px)',
            borderRadius: '50px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            width: '90%',
            maxWidth: '350px'
          }}
        >
          <img 
            src={callData.partnerAvatar || '/asets/png/profile.webp'} 
            className="global-call-avatar" 
            alt="partner" 
            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
          
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {callData.partnerName}
            </div>
            <div style={{ color: callStatus === 'connected' ? '#94a3b8' : '#2ecc71', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {callStatus === 'connected' ? (
                <span>{Math.floor(callData.seconds / 60)}:{String(callData.seconds % 60).padStart(2, '0')}</span>
              ) : (
                <>
                  <span className="material-icons" style={{ fontSize: '14px' }}>ring_volume</span> 
                  {callStatus === 'calling' ? 'Memanggil...' : 'Menghubungi...'}
                </>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {callStatus === 'incoming' && (
              <button 
                className="global-call-btn" 
                style={{ 
                  background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '50%', 
                  width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: 'pointer', boxShadow: '0 4px 10px rgba(46, 204, 113, 0.4)' 
                }} 
                onClick={() => { refs.current.audio.current?.ring.pause(); connectLiveKit(callData.room); }}
              >
                <span className="material-icons" style={{ fontSize: '20px' }}>call</span>
              </button>
            )}
            <button 
              className="global-call-btn" 
              style={{ 
                background: '#ff4757', color: '#fff', border: 'none', borderRadius: '50%', 
                width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: 'pointer', boxShadow: '0 4px 10px rgba(255, 71, 87, 0.4)' 
              }} 
              onClick={async () => {
                const currentRoom = callData.room;
                const isIncoming = callStatus === 'incoming';
                const isConnected = callStatus === 'connected';
                
                endCall(true); // Panggil fungsi end call
                
                // Catat ke log pesan
                if (isIncoming) {
                  await supabase.from('messages').insert([{ room_id: currentRoom, user_id: currentUser.id, message: `Panggilan Ditolak`, is_system: true }]);
                } else if (isConnected) {
                  await supabase.from('messages').insert([{ room_id: currentRoom, user_id: currentUser.id, message: `Panggilan berakhir (${Math.floor(callData.seconds / 60)}:{String(callData.seconds % 60).padStart(2, '0')})`, is_system: true }]);
                } else {
                  await supabase.from('messages').insert([{ room_id: currentRoom, user_id: currentUser.id, message: `Panggilan dibatalkan`, is_system: true }]);
                }
              }}
            >
              <span className="material-icons" style={{ fontSize: '20px' }}>call_end</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
