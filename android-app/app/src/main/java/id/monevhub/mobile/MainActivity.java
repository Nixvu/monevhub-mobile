package id.monevhub.mobile;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.ContentValues;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private static final int REQ_PERMISSIONS = 1001;
    private static final String TARGET_URL = "https://monev.maganghub.kemnaker.go.id/";

    private WebView webView;
    private String injectScriptCache = null;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasLocationPermission()) {
                    callback.invoke(origin, true, false);
                } else {
                    requestNeededPermissions();
                    callback.invoke(origin, false, false);
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String reqUrl = request.getUrl().toString();
                if (reqUrl.startsWith("http://account.kemnaker.go.id")) {
                    view.loadUrl(reqUrl.replaceFirst("^http://", "https://"));
                    return true;
                }
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.contains("monev.maganghub.kemnaker.go.id")) {
                    injectMonevScript();
                }
            }
        });

        String initialUrl = getIntent() != null && getIntent().getBooleanExtra("open_riwayat", false)
                ? "https://monev.maganghub.kemnaker.go.id/riwayat"
                : TARGET_URL;
        webView.loadUrl(initialUrl);
        ReminderReceiver.scheduleNext(this);
    }

    private void injectMonevScript() {
        String polyfill = "(function(){if(!window.chrome)window.chrome={};if(!window.chrome.storage){window.chrome.storage={local:{get:function(keys){return new Promise(function(res){var out={};var arr=Array.isArray(keys)?keys:(typeof keys==='string'?[keys]:Object.keys(keys||{}));for(var i=0;i<arr.length;i++){var k=arr[i];var raw=window.AndroidBridge?window.AndroidBridge.getStorageItem(k):localStorage.getItem(k);if(raw){try{out[k]=JSON.parse(raw);}catch(e){out[k]=raw;}}}res(out);});},set:function(obj){return new Promise(function(res){var ks=Object.keys(obj||{});for(var i=0;i<ks.length;i++){var k=ks[i];var v=JSON.stringify(obj[k]);if(window.AndroidBridge)window.AndroidBridge.setStorageItem(k,v);else localStorage.setItem(k,v);}res();});}}};}})();";
        webView.evaluateJavascript(polyfill, null);

        String[] assets = {
            "lib/license.js",
            "lib/humanizer.js",
            "lib/ai.js",
            "lib/vendor/jspdf.umd.min.js",
            "lib/vendor/jspdf.plugin.autotable.min.js",
            "lib/vendor/docx.iife.js",
            "lib/export.js",
            "lib/map-picker.js",
            "monevhub-mobile-inject.js"
        };
        for (String asset : assets) {
            String js = loadAssetScript(asset);
            if (js != null && !js.isEmpty()) {
                webView.evaluateJavascript(js, null);
            }
        }
    }

    private String loadAssetScript(String filename) {
        try {
            InputStream is = getAssets().open(filename);
            BufferedReader br = new BufferedReader(new InputStreamReader(is, "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line).append('\n');
            }
            br.close();
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true;
        return ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestNeededPermissions() {
        List<String> needed = new ArrayList<>();
        if (!hasLocationPermission()) {
            needed.add(Manifest.permission.ACCESS_FINE_LOCATION);
            needed.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (!hasNotificationPermission() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            needed.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
            }
        }
        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), REQ_PERMISSIONS);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_PERMISSIONS && webView != null) {
            webView.evaluateJavascript("window.dispatchEvent(new Event('mh-perms-updated'));", null);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    public class AndroidBridge {
        @JavascriptInterface
        public String getDeviceLabel() {
            String m = Build.MANUFACTURER != null ? Build.MANUFACTURER : "";
            String mod = Build.MODEL != null ? Build.MODEL : "Android";
            return ("HP - " + m + " " + mod).trim();
        }

        @JavascriptInterface
        public String getStorageItem(String key) {
            SharedPreferences prefs = getSharedPreferences("monevhub_prefs", MODE_PRIVATE);
            return prefs.getString(key, "");
        }

        @JavascriptInterface
        public void setStorageItem(String key, String jsonVal) {
            SharedPreferences prefs = getSharedPreferences("monevhub_prefs", MODE_PRIVATE);
            prefs.edit().putString(key, jsonVal).apply();
        }

        @JavascriptInterface
        public void saveFileBase64(String filename, String mimeType, String base64Data) {
            try {
                byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                    values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                            if (os != null) os.write(bytes);
                        }
                    }
                } else {
                    File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    if (!dir.exists()) dir.mkdirs();
                    File out = new File(dir, filename);
                    try (FileOutputStream fos = new FileOutputStream(out)) {
                        fos.write(bytes);
                    }
                }
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Tersimpan di Downloads: " + filename, Toast.LENGTH_LONG).show());
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Gagal simpan file: " + e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }

        @JavascriptInterface
        public void setParticipantName(String name) {
            if (name == null || name.trim().isEmpty()) return;
            SharedPreferences prefs = getSharedPreferences("monevhub_prefs", MODE_PRIVATE);
            prefs.edit().putString("participant_name", name.trim()).apply();
        }

        @JavascriptInterface
        public void setTodayReportStatus(String dateStr, boolean isFilled) {
            SharedPreferences prefs = getSharedPreferences("monevhub_prefs", MODE_PRIVATE);
            if (isFilled && dateStr != null && !dateStr.isEmpty()) {
                prefs.edit().putString("last_reported_date", dateStr).apply();
            }
        }

        @JavascriptInterface
        public void configureReminder(boolean enabled, int hour, int minute) {
            SharedPreferences prefs = getSharedPreferences("monevhub_prefs", MODE_PRIVATE);
            prefs.edit()
                .putBoolean("reminder_enabled", enabled)
                .putInt("reminder_hour", hour)
                .putInt("reminder_minute", minute)
                .apply();
            ReminderReceiver.scheduleDailyReminder(MainActivity.this, enabled, hour, minute);
        }

        @JavascriptInterface
        public void triggerTestNotification() {
            SharedPreferences prefs = getSharedPreferences("monevhub_prefs", MODE_PRIVATE);
            String name = prefs.getString("participant_name", "Peserta MagangHub");
            ReminderReceiver.showReminderNotification(MainActivity.this, name);
        }

        @JavascriptInterface
        public String checkPermissions() {
            boolean gps = hasLocationPermission();
            boolean notif = hasNotificationPermission();
            boolean storage = Build.VERSION.SDK_INT > Build.VERSION_CODES.P ||
                    ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
            return "{\"gps\":" + gps + ",\"notification\":" + notif + ",\"storage\":" + storage + "}";
        }

        @JavascriptInterface
        public void requestAllPermissions() {
            runOnUiThread(() -> requestNeededPermissions());
        }

        @JavascriptInterface
        public void showToast(String msg) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show());
        }
    }
}
