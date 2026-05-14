package com.hopecreative.app

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
        try {
            val data = remoteMessage.data
            if (data.isNotEmpty()) {
                showNotification(data)
            }
        } catch (t: Throwable) {   // Tangkap semua error termasuk NoClassDefFoundError
            Log.e("HopeTalk", "Gagal proses pesan: ${t.message}", t)
        }
    }

    private fun showNotification(data: Map<String, String>) {
        try {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channelId = "high_importance_channel"

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "Urgent",
                    NotificationManager.IMPORTANCE_HIGH
                )
                manager.createNotificationChannel(channel)
            }

            val baseFlag = PendingIntent.FLAG_UPDATE_CURRENT
            val immutableFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                baseFlag or PendingIntent.FLAG_IMMUTABLE
            } else baseFlag
            val mutableFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                baseFlag or PendingIntent.FLAG_MUTABLE
            } else baseFlag

            // 🔥 AMAN: Gunakan launcher intent dari PackageManager
            val openAppIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            } ?: run {
                // fallback kalau gagal (seharusnya tidak terjadi)
                Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
            }
            val openAppPendingIntent = PendingIntent.getActivity(
                this, 0, openAppIntent, immutableFlag
            )

            // Icon notifikasi: coba dari resource, fallback ke icon sistem
            var iconResId = resources.getIdentifier("ic_launcher", "mipmap", packageName)
            if (iconResId == 0) iconResId = android.R.drawable.ic_dialog_info

            val builder = NotificationCompat.Builder(this, channelId)
                .setContentTitle(data["title"] ?: "HypeTalk")
                .setContentText(data["body"] ?: "Pesan baru")
                .setSmallIcon(iconResId)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setAutoCancel(true)
                .setContentIntent(openAppPendingIntent)

            when (data["type"]) {
                "call" -> {
                    val acceptIntent = Intent(this, NotificationActionReceiver::class.java).apply {
                        action = "ACTION_ACCEPT"
                        putExtra("room_id", data["roomId"])
                    }
                    val acceptPending = PendingIntent.getBroadcast(
                        this, 1, acceptIntent, immutableFlag
                    )

                    val rejectIntent = Intent(this, NotificationActionReceiver::class.java).apply {
                        action = "ACTION_REJECT"
                        putExtra("room_id", data["roomId"])
                    }
                    val rejectPending = PendingIntent.getBroadcast(
                        this, 2, rejectIntent, immutableFlag
                    )

                    builder.addAction(0, "📞 Angkat", acceptPending)
                    builder.addAction(0, "❌ Tolak", rejectPending)
                }
                else -> {
                    val replyIntent = Intent(this, NotificationActionReceiver::class.java).apply {
                        action = "ACTION_REPLY"
                        putExtra("room_id", data["roomId"])
                    }
                    val replyPendingIntent = PendingIntent.getBroadcast(
                        this, 3, replyIntent, mutableFlag
                    )
                    val remoteInput = RemoteInput.Builder("key_text_reply")
                        .setLabel("Balas...")
                        .build()
                    val replyAction = NotificationCompat.Action.Builder(
                        0, "Balas", replyPendingIntent
                    ).addRemoteInput(remoteInput).build()

                    builder.addAction(replyAction)
                }
            }

            manager.notify(System.currentTimeMillis().toInt(), builder.build())

        } catch (t: Throwable) {   // Tangkap semua error
            Log.e("HopeTalk", "CRASH PARAH DICEGAH: ${t.message}", t)
        }
    }
}