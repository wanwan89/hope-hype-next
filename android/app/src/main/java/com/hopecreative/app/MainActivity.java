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
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // 2. 🔥 SOLUSI NAVBAR BAWAH:
        // Biarkan warna navigation bar TRANSPARAN!
        // Kuncinya di sini: Java tidak usah ngatur warna, biarkan plugin TSX yang mengatur.
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        
        // 3. Biarkan Android menentukan warna icon tombol berdasarkan kontras
        getWindow().setNavigationBarContrastEnforced(false);
    }
}