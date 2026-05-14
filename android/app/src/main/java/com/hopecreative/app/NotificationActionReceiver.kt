package com.hopecreative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.RemoteInput
import android.util.Log

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            "ACTION_REPLY" -> {
                val remoteInput = RemoteInput.getResultsFromIntent(intent)
                if (remoteInput != null) {
                    val replyText = remoteInput.getCharSequence("key_text_reply").toString()
                    val roomId = intent.getStringExtra("room_id")
                    
                    Log.d("HopeTalk", "User ngebalas dari notif: $replyText ke room: $roomId")
                    
                    // TODO (Tahap 2): Nanti kita tambahin HTTP Request (Fetch) buat nembak Supabase dari sini
                }
            }
            "ACTION_ACCEPT" -> {
                Log.d("HopeTalk", "User klik Angkat Panggilan")
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                launchIntent?.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                context.startActivity(launchIntent)
            }
            "ACTION_REJECT" -> {
                Log.d("HopeTalk", "User klik Tolak Panggilan")
                // TODO (Tahap 2): Nanti kita tembak "Panggilan ditolak" ke Supabase
            }
        }
    }
}
