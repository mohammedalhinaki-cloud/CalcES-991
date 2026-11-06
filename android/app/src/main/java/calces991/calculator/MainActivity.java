package calces991.calculator;

import android.os.Bundle;
import android.os.Build;
import android.graphics.Color;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import androidx.core.view.ViewCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppConfigurationPlugin.class);
        super.onCreate(savedInstanceState);

        // SDK 36 makes non-floating activities edge-to-edge on Android 15+.
        // Older Android versions need the AndroidX compatibility implementation.
        // Keep light system-bar icons, matching Capacitor SystemBars.style=DARK.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            EdgeToEdge.enable(
                this,
                SystemBarStyle.dark(Color.TRANSPARENT),
                SystemBarStyle.dark(Color.TRANSPARENT)
            );
        }

        // Capacitor owns the decor-view inset listener and the WebView/CSS safe
        // areas. Request dispatch after enabling edge-to-edge; do not add a
        // second listener, consume insets, or apply another layer of padding.
        ViewCompat.requestApplyInsets(getWindow().getDecorView());
    }
}
