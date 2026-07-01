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

        // 2. 🔥 FIX NAVBAR BAWAH: Set warna default HITAM PEKAT
        // Ini agar saat startup atau mode gelap, warnanya hitam pekat, BUKAN abu-abu.
        getWindow().setNavigationBarColor(Color.parseColor("#0a0a0a"));
        
        // 3. Biarkan Android menentukan warna icon tombol navigasi (agar kontras)
        getWindow().setNavigationBarContrastEnforced(false);
    }
}