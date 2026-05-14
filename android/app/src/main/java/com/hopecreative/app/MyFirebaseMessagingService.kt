package com.hopecreative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        if (data.isNotEmpty()) {
            showNotification(data)
        }
    }

    private fun showNotification(data: Map<String, String>) {
        try {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channelId = "high_importance_channel"

            // 1. Setup Channel buat Android 8+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(channelId, "Urgent", NotificationManager.IMPORTANCE_HIGH)
                manager.createNotificationChannel(channel)
            }

            // 2. SETUP FLAG ANTI-CRASH UNTUK SEMUA VERSI ANDROID
            val baseFlag = PendingIntent.FLAG_UPDATE_CURRENT
            val immutableFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) baseFlag or PendingIntent.FLAG_IMMUTABLE else baseFlag
            val mutableFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) baseFlag or PendingIntent.FLAG_MUTABLE else baseFlag

            // 3. Intent untuk Buka Aplikasi
            val openAppIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val openAppPendingIntent = PendingIntent.getActivity(this, 0, openAppIntent, immutableFlag)

            // 4. Bangun Notifikasi dengan Ikon Sistem Paling Aman (Pasti tembus)
            val builder = NotificationCompat.Builder(this, channelId)
                .setContentTitle(data["title"] ?: "Pesan Baru")
                .setContentText(data["body"] ?: "Buka aplikasi untuk melihat")
                .setSmallIcon(android.R.drawable.ic_dialog_info) // 🔥 PAKE IKON SISTEM INI DIJAMIN GAK CRASH 🔥
                .setPriority(NotificationCompat.PRIORITY_MAX) // Paksa muncul
                .setAutoCancel(true)
                .setContentIntent(openAppPendingIntent)

            // 5. Rakit Tombol (Call vs Chat)
            if (data["type"] == "call") {
                val acceptIntent = Intent(this, NotificationActionReceiver::class.java).apply {
                    action = "ACTION_ACCEPT"
                    putExtra("room_id", data["roomId"])
                }
                val acceptPending = PendingIntent.getBroadcast(this, 1, acceptIntent, immutableFlag)
                
                val rejectIntent = Intent(this, NotificationActionReceiver::class.java).apply {
                    action = "ACTION_REJECT"
                    putExtra("room_id", data["roomId"])
                }
                val rejectPending = PendingIntent.getBroadcast(this, 2, rejectIntent, immutableFlag)

                builder.addAction(0, "📞 Angkat", acceptPending)
                builder.addAction(0, "❌ Tolak", rejectPending)
                
            } else {
                val replyIntent = Intent(this, NotificationActionReceiver::class.java).apply {
                    action = "ACTION_REPLY"
                    putExtra("room_id", data["roomId"])
                }
                // Tombol balas WAJIB MUTABLE di Android 12+
                val replyPendingIntent = PendingIntent.getBroadcast(this, 3, replyIntent, mutableFlag)
                val remoteInput = RemoteInput.Builder("key_text_reply").setLabel("Tulis balasan...").build()
                val replyAction = NotificationCompat.Action.Builder(0, "Balas", replyPendingIntent).addRemoteInput(remoteInput).build()

                builder.addAction(replyAction)
            }

            // 6. Eksekusi Notif
            manager.notify(System.currentTimeMillis().toInt(), builder.build())
            Log.d("HopeTalk", "✅ Notif sukses tembus tanpa crash!")

        } catch (t: Throwable) {
            Log.e("HopeTalk", "❌ CRASH DICEGAH SECARA FATAL: ${t.stackTraceToString()}")
        }
    }
}
