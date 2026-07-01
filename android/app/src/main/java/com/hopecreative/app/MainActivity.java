package com.hopecreative.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import android.graphics.Color;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // 🔥 DEFAULT HITAM PEKAT. Nanti plugin TSX akan mengubahnya jadi putih saat light mode!
        getWindow().setNavigationBarColor(Color.parseColor("#0a0a0a"));
        getWindow().setNavigationBarContrastEnforced(false);
    }
}