package com.hopecreative.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import android.graphics.Color;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. FIX UTAMA: Memberi jarak agar konten UI (Header) tidak tertutup Status Bar (Bagian Atas)
        // Method ini sudah benar dan kompatibel.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // 2. 🔥 SOLUSI NAVBAR BAWAH (BEBAS ERROR BUILD):
        // Ganti "WindowCompat.setNavigationBarColor" dengan "getWindow().setNavigationBarColor"
        // Method ini adalah method asli Android (bukan library) jadi tidak akan pernah error.
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        
        // 3. Biarkan Android menentukan warna icon tombol (hitam/putih) 
        // otomatis mengikuti Mode Sistem Android di HP kamu
        getWindow().setNavigationBarContrastEnforced(false);
    }
}