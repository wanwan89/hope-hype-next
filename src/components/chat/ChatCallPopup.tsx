'use client';

import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatCallPopup({
  callStatus, callData, refs, connectLiveKit, endCall, currentUser
}: any) {
  
  // 1. Ekstrak logika angkat telepon
  const handleAnswer = () => {
    try {
      // Gunakan optional chaining untuk mencegah error jika refs belum siap
      if (refs?.current?.audio?.current?.ring) {
        refs.current.audio.current.ring.pause();
      }
    } catch (err) {
      console.error("Gagal menghentikan nada dering", err);
    }
    connectLiveKit(callData?.room);
  };

  // 2. Ekstrak logika tolak/akhiri telepon
  const handleEndCall = () => {
    const currentRoom = callData?.room;
    const isIncoming = callStatus === 'incoming';
    const isConnected = callStatus === 'connected';
    
    // Panggil endCall DULUAN secara sinkron.
    // Ini memastikan state di parent berubah ke 'idle' seketika, dan popup langsung menghilang.
    endCall(true); 
    
    // Jalankan operasi Supabase di background agar tidak nge-lag/nyangkut
    (async () => {
      try {
        if (isIncoming) {
          await supabase.from('messages').insert([{ room_id: currentRoom, user_id: currentUser?.id, message: `Panggilan Ditolak`, is_system: true }]);
        } else if (isConnected) {
          await supabase.from('messages').insert([{ room_id: currentRoom, user_id: currentUser?.id, message: `Panggilan berakhir (${Math.floor(callData.seconds / 60)}:${String(callData.seconds % 60).padStart(2, '0')})`, is_system: true }]);
        } else {
          await supabase.from('messages').insert([{ room_id: currentRoom, user_id: currentUser?.id, message: `Panggilan dibatalkan`, is_system: true }]);
        }
      } catch (error) {
        console.error("Gagal mencatat log panggilan:", error);
      }
    })();
  };

  // 3. Logika deteksi Swipe / Drag
  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 60; // Jarak piksel minimal agar dihitung sebagai swipe
    
    if (info.offset.y < -swipeThreshold) {
      // Swipe ke ATAS (nilai Y negatif) -> Tolak / Matikan
      handleEndCall();
    } else if (info.offset.y > swipeThreshold && callStatus === 'incoming') {
      // Swipe ke BAWAH (nilai Y positif) -> Jawab
      handleAnswer();
    }
  };

  return (
    <AnimatePresence>
      {callStatus !== 'idle' && (
        <motion.div 
          key="call-popup-key" // PENTING: Wajib ada agar exit animation Framer Motion berjalan
          className="call-floating-popup"
          initial={{ y: -150, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: -150, x: "-50%", opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          
          // --- Konfigurasi Framer Motion Drag ---
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }} // Memaksa elemen kembali membal ke tengah jika tidak di-swipe penuh
          dragElastic={0.6} // Efek kelenturan saat ditarik
          onDragEnd={handleDragEnd}
          
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            background: 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '50px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            width: '90%',
            maxWidth: '350px',
            cursor: 'grab', // Memberi petunjuk visual bahwa ini bisa ditarik
            touchAction: 'none' // Mencegah halaman ikut ter-scroll saat user mencoba menggeser popup di HP
          }}
        >
          <img 
            src={callData?.partnerAvatar || '/asets/png/profile.webp'} 
            className="global-call-avatar" 
            alt="partner" 
            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, pointerEvents: 'none' }}
          />
          
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '2px', pointerEvents: 'none' }}>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {callData?.partnerName}
            </div>
            <div style={{ color: callStatus === 'connected' ? '#94a3b8' : '#2ecc71', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {callStatus === 'connected' ? (
                <span>{Math.floor(callData?.seconds / 60)}:{String(callData?.seconds % 60).padStart(2, '0')}</span>
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
                onClick={handleAnswer}
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
              onClick={handleEndCall}
            >
              <span className="material-icons" style={{ fontSize: '20px' }}>call_end</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
