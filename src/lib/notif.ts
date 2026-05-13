// 📄 File: src/lib/notif.ts
import { supabase } from '@/lib/supabase';

interface NotifParams {
  senderId: string;
  receiverId: string;
  type: 'like' | 'comment' | 'reply' | 'follow' | 'mention' | 'chat' | 'call';
  content?: string;
  postId?: string;
  roomId?: string;
}

export const sendPushAndAppNotif = async ({
  senderId,
  receiverId,
  type,
  content = '',
  postId,
  roomId
}: NotifParams) => {
  // 🛡️ Jangan ngirim notif ke diri sendiri
  if (senderId === receiverId) return;

  try {
    // ==========================================
    // 1. MASUKIN KE TABEL NOTIF (UNTUK UI LONCENG)
    // ==========================================
    // Catatan: Chat & Call gak usah masuk ke menu Lonceng
    if (type !== 'chat' && type !== 'call') {
      let msg = content;
      if (type === 'like') msg = 'Menyukai postingan Anda.';
      if (type === 'follow') msg = 'Mulai mengikuti Anda.';

      await supabase.from('notifications').insert({
        user_id: receiverId,
        type: type,
        message: msg,
        post_id: postId,
        is_read: false
      });
    }

    // ==========================================
    // 2. TEMBAK EDGE FUNCTION (UNTUK PUSH HP)
    // ==========================================
    await supabase.functions.invoke('send-chat-notif', {
      body: {
        record: {
          sender_id: senderId,
          receiver_id: receiverId,
          content: content,
          type: type,
          room_id: roomId,
          post_id: postId
        }
      }
    });

  } catch (err) {
    console.error(`❌ Gagal mengirim notif ${type}:`, err);
  }
};
