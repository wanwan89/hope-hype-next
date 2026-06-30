package com.hopecreative.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import android.graphics.Color;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. FIX UTAMA: Memberi jarak agar konten UI (Header) tidak tertutup Status Bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // 2. 🔥 SOLUSI NAVBAR BAWAH: Ubah menjadi TRANSPARAN!
        WindowCompat.setNavigationBarColor(getWindow(), Color.TRANSPARENT);
        
        // 3. Biarkan Android menentukan warna icon tombol (hitam/putih) 
        // otomatis mengikuti Mode Sistem Android di HP kamu
        getWindow().setNavigationBarContrastEnforced(false);
    }
}