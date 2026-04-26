package de.elterngeldrechner.app;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Capacitor speichert bei Live-Reload ({@code cap run} / Livereload) einen Dateisystem-Pfad unter
 * {@code CapWebViewSettings}/{@code serverBasePath}. Solange sich versionCode/versionName nicht ändern,
 * lädt die App weiter diesen alten Pfad statt der Web-Assets aus dem APK – wirkt wie eine „alte Version“.
 * <p>
 * Wenn {@code capacitor.config.json} keine {@code server.url} hat (normale Builds), wird dieser Pfad
 * vor dem Bridge-Start entfernt. Zusätzlich: kein HTTP-Cache, einmalige Chromium-History-Leerung,
 * Cookies für {@code localhost} löschen. In debuggablen Builds ein einmaliger Reload kurz nach Start,
 * damit kein restaurierter WebView-Snapshot aus früheren Installationen sichtbar bleibt.
 */
public class MainActivity extends BridgeActivity {

    private static boolean sDidInitialWebViewSanitize;
    private static boolean sPostedDebugReload;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
        clearPersistedLiveReloadServerPathIfEmbedded();
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        getWindow().getDecorView().post(this::applyEmbeddedWebViewPolicies);
    }

    private void applyEmbeddedWebViewPolicies() {
        if (getBridge() == null) {
            return;
        }
        WebView wv = getBridge().getWebView();
        if (wv == null) {
            return;
        }

        wv.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);

        if (!sDidInitialWebViewSanitize) {
            sDidInitialWebViewSanitize = true;
            wv.clearCache(true);
            wv.clearHistory();
            wv.clearFormData();
            try {
                CookieManager cm = CookieManager.getInstance();
                cm.removeAllCookies(null);
                cm.flush();
            } catch (Exception ignored) {
                // noop
            }
        }

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0 && !sPostedDebugReload) {
            sPostedDebugReload = true;
            wv.postDelayed(() -> {
                try {
                    wv.reload();
                } catch (Exception ignored) {
                    // noop
                }
            }, 300);
        }
    }

    private void clearPersistedLiveReloadServerPathIfEmbedded() {
        try (InputStream is = getAssets().open("capacitor.config.json")) {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = is.read(buf)) != -1) {
                baos.write(buf, 0, n);
            }
            String json = baos.toString(StandardCharsets.UTF_8.name());
            JSONObject root = new JSONObject(json);
            JSONObject server = root.optJSONObject("server");
            String url = "";
            if (server != null && server.has("url") && !server.isNull("url")) {
                url = server.optString("url", "");
            }
            if (url == null || url.isEmpty()) {
                getSharedPreferences(com.getcapacitor.plugin.WebView.WEBVIEW_PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .remove(com.getcapacitor.plugin.WebView.CAP_SERVER_PATH)
                    .apply();
            }
        } catch (Exception e) {
            getSharedPreferences(com.getcapacitor.plugin.WebView.WEBVIEW_PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(com.getcapacitor.plugin.WebView.CAP_SERVER_PATH)
                .apply();
        }
    }
}
