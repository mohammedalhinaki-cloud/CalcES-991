package calces991.calculator;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppConfigurationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
