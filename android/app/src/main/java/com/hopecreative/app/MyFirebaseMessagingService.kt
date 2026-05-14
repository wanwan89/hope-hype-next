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
        // 🔥 FIX: Pake "Throwable" biar Error level sistem (OOM) tetep ketangkep & aplikasi gak mati! 🔥
        try {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channelId = "high_importance_channel"

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(channelId, "Urgent", NotificationManager.IMPORTANCE_HIGH)
                manager.createNotificationChannel(channel)
            }

            // 1. BIKIN NOTIF BISA DIKLIK BUAT BUKA APLIKASI
            val openAppIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val openAppPendingIntent = PendingIntent.getActivity(
                this, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // 2. AMBIL ICON BAWAAN APLIKASI (Biar gak di-block sama HP)
            val iconResId = applicationInfo.icon

            // 3. RAKIT NOTIFIKASI DASAR (Tanpa download gambar berat)
            val builder = NotificationCompat.Builder(this, channelId)
                .setContentTitle(data["title"] ?: "Pesan Baru")
                .setContentText(data["body"] ?: "Buka aplikasi untuk melihat")
                .setSmallIcon(iconResId)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(openAppPendingIntent) // Biar pas diklik aplikasinya kebuka

            // 4. RAKIT TOMBOL BALAS / ANGKAT
            if (data["type"] == "call") {
                val acceptIntent = Intent(this, NotificationActionReceiver::class.java).apply {
                    action = "ACTION_ACCEPT"
                    putExtra("room_id", data["roomId"])
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
                val replyIntent = Intent(this, NotificationActionReceiver::class.java).apply {
                    action = "ACTION_REPLY"
                    putExtra("room_id", data["roomId"])
                }
                val replyPendingIntent = PendingIntent.getBroadcast(
                    this, 3, replyIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                )
                val remoteInput = RemoteInput.Builder("key_text_reply").setLabel("Tulis balasan...").build()
                val replyAction = NotificationCompat.Action.Builder(0, "Balas", replyPendingIntent).addRemoteInput(remoteInput).build()

                builder.addAction(replyAction)
            }

            // MUNCULIN NOTIFNYA
            manager.notify(System.currentTimeMillis().toInt(), builder.build())
            Log.d("HopeTalk", "✅ Notif berhasil muncul dari Native!")

        } catch (t: Throwable) {
            // Kalau tetep ada error, dia cuma masuk logcat dan NGGAK BIKIN APLIKASI LU RUSAK
            Log.e("HopeTalk", "❌ CRASH DICEGAH: ${t.message}")
        }
    }
}
