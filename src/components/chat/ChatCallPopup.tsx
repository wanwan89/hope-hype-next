import { supabase } from '@/lib/supabase';

export default function ChatCallPopup({
  callStatus, callData, refs, connectLiveKit, endCall, currentUser
}: any) {
  if (callStatus === 'idle') return null;

  return (
    <div className="call-floating-popup">
      <img src={callData.partnerAvatar || '/asets/png/profile.webp'} className="global-call-avatar" alt="partner" />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {callData.partnerName}
        </div>
        <div style={{ color: callStatus === 'connected' ? '#888' : '#2ecc71', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {callStatus === 'connected' ? (
            <span>{Math.floor(callData.seconds / 60)}:{String(callData.seconds % 60).padStart(2, '0')}</span>
          ) : (
            <>
              <span className="material-icons" style={{ fontSize: '12px' }}>ring_volume</span> 
              {callStatus === 'calling' ? 'Memanggil...' : 'Menghubungi...'}
            </>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        {callStatus === 'incoming' && (
          <button className="global-call-btn" style={{ background: '#2ecc71', boxShadow: '0 4px 10px rgba(46, 204, 113, 0.4)' }} onClick={() => { refs.current.audio.current?.ring.pause(); connectLiveKit(callData.room); }}>
            <span className="material-icons" style={{ fontSize: '20px' }}>call</span>
          </button>
        )}
        <button className="global-call-btn" style={{ background: '#ff4757', boxShadow: '0 4px 10px rgba(255, 71, 87, 0.4)' }} onClick={async () => {
            const currentRoom = callData.room;
            const isIncoming = callStatus === 'incoming';
            const isConnected = callStatus === 'connected';
            endCall(true);
            if (isIncoming) await supabase.from('messages').insert([{ room_id: currentRoom, user_id: currentUser.id, message: `Panggilan Ditolak`, is_system: true }]);
            else if (isConnected) await supabase.from('messages').insert([{ room_id: currentRoom, user_id: currentUser.id, message: `Panggilan berakhir (${Math.floor(callData.seconds / 60)}:{String(callData.seconds % 60).padStart(2, '0')})`, is_system: true }]);
            else await supabase.from('messages').insert([{ room_id: currentRoom, user_id: currentUser.id, message: `Panggilan dibatalkan`, is_system: true }]);
          }}>
          <span className="material-icons" style={{ fontSize: '20px' }}>call_end</span>
        </button>
      </div>
    </div>
  );
}
