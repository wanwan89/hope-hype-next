package com.hopecreative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.net.URL

class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        if (data.isNotEmpty()) {
            showNotification(data)
        }
    }

    private fun showNotification(data: Map<String, String>) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "high_importance_channel"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Urgent", NotificationManager.IMPORTANCE_HIGH)
            manager.createNotificationChannel(channel)
        }

        // 🔥 FUNGSI SAKTI: Download Foto Profil biar muncul di Notif 🔥
        var avatarBitmap: Bitmap? = null
        try {
            val imageUrl = data["image"]
            if (!imageUrl.isNullOrEmpty()) {
                val url = URL(imageUrl)
                avatarBitmap = BitmapFactory.decodeStream(url.openConnection().getInputStream())
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Action: Balas Chat (Inline Reply)
        val replyIntent = Intent(this, NotificationActionReceiver::class.java).apply {
            action = "ACTION_REPLY"
            putExtra("room_id", data["roomId"])
        }
        
        // FLAG_MUTABLE wajib buat Android 12+ kalau pake RemoteInput
        val replyPendingIntent = PendingIntent.getBroadcast(
            this, 
            System.currentTimeMillis().toInt(), 
            replyIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        
        val remoteInput = RemoteInput.Builder("key_text_reply").setLabel("Tulis pesan...").build()
        val replyAction = NotificationCompat.Action.Builder(0, "Balas", replyPendingIntent).addRemoteInput(remoteInput).build()

        // Bikin Fondasi Notif
        val builder = NotificationCompat.Builder(this, channelId)
            .setContentTitle(data["title"])
            .setContentText(data["body"])
            .setSmallIcon(android.R.drawable.stat_notify_chat) // Icon default
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        // Pasang Foto Profil Gede kalau dapet
        if (avatarBitmap != null) {
            builder.setLargeIcon(avatarBitmap)
        }

        // Logika Tombol: Chat vs Telpon
        if (data["type"] == "call") {
            // Kalau telpon, kasih tombol Angkat & Tolak
            val acceptIntent = Intent(this, NotificationActionReceiver::class.java).apply {
                action = "ACTION_ACCEPT"
                putExtra("room_id", data["roomId"])
                putExtra("caller_id", data["callerId"])
            }
            val acceptPending = PendingIntent.getBroadcast(this, 1, acceptIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            
            val rejectIntent = Intent(this, NotificationActionReceiver::class.java).apply {
                action = "ACTION_REJECT"
                putExtra("room_id", data["roomId"])
            }
            val rejectPending = PendingIntent.getBroadcast(this, 2, rejectIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

            builder.addAction(0, "📞 Angkat", acceptPending)
            builder.addAction(0, "❌ Tolak", rejectPending)
            
        } else {
            // Kalau chat/like/komen biasa, kasih tombol Balas
            builder.addAction(replyAction)
        }

        // Munculin Notifnya!
        manager.notify(System.currentTimeMillis().toInt(), builder.build())
    }
}
