package com.hopecreative.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.RemoteInput
import android.util.Log

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        try {
            when (intent.action) {
                "ACTION_REPLY" -> {
                    val remoteInput = RemoteInput.getResultsFromIntent(intent)
                    if (remoteInput != null) {
                        val replyText = remoteInput.getCharSequence("key_text_reply").toString()
                        val roomId = intent.getStringExtra("room_id")
                        Log.d("HopeTalk", "User ngebalas: $replyText ke room: $roomId")
                        // TODO: Supabase Fetch
                    }
                }
                "ACTION_ACCEPT" -> {
                    Log.d("HopeTalk", "Angkat ditekan, buka app...")
                    // 🔥 FIX: Tembak MainActivity langsung! 🔥
val launchIntent = Intent(context, Class.forName("com.hopecreative.app.MainActivity")).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    context.startActivity(launchIntent)
                }
                "ACTION_REJECT" -> {
                    Log.d("HopeTalk", "Panggilan ditolak")
                    // TODO: Tolak Supabase
                }
            }
        } catch (e: Exception) {
            Log.e("HopeTalk", "Error di Receiver: ${e.message}")
        }
    }
}
