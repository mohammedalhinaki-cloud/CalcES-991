package calces991.calculator;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Public publisher settings only. No passwords, API tokens or signing keys cross the bridge. */
@CapacitorPlugin(name = "AppConfiguration")
public class AppConfigurationPlugin extends Plugin {
    @PluginMethod
    public void getConfiguration(PluginCall call) {
        JSObject value = new JSObject();
        // Use a small initial reservation; the Ads plugin reports the actual adaptive size when enabled.
        value.put("bannerHeight", BuildConfig.ADS_ENABLED ? 50 : 0);
        value.put("debug", BuildConfig.DEBUG);
        value.put("adsEnabled", BuildConfig.ADS_ENABLED);
        value.put("bannerId", BuildConfig.ADMOB_BANNER_ID);
        value.put("audience", BuildConfig.APP_AUDIENCE);
        value.put("privacyPolicyUrl", BuildConfig.PRIVACY_POLICY_URL);
        value.put("supportEmail", BuildConfig.SUPPORT_EMAIL);
        value.put("storeListingUrl", BuildConfig.STORE_LISTING_URL);
        value.put("versionName", BuildConfig.VERSION_NAME);
        call.resolve(value);
    }
    @PluginMethod
    public void openStore(PluginCall call) {
        // Fixed publisher-provided HTTPS destination: never accept an arbitrary intent from web content.
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.STORE_LISTING_URL)));
                call.resolve();
            } catch (Exception failure) {
                call.reject("Unable to open the configured app-store listing", failure);
            }
        });
    }
}
