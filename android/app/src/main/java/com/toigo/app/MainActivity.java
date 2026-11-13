package com.toigo.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebViewAssetLoader;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseException;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.PhoneAuthCredential;
import com.google.firebase.auth.PhoneAuthOptions;
import com.google.firebase.auth.PhoneAuthProvider;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class MainActivity extends AppCompatActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final int FILE_CHOOSER_REQUEST_CODE = 2001;

    private WebView webView;
    private ProgressBar progressBar;
    private SwipeRefreshLayout swipeRefreshLayout;
    private ValueCallback<Uri[]> filePathCallback;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;
    private PermissionRequest cameraPermissionRequest;

    // Firebase Phone Authentication
    private FirebaseAuth mAuth;
    private String mVerificationId;
    private PhoneAuthProvider.ForceResendingToken mResendToken;

    public static final String LOCAL_APP_URL = "https://appassets.androidplatform.net/assets/www/index.html";

    private SharedPreferences getPrefs() {
        return getSharedPreferences("toigo_prefs", MODE_PRIVATE);
    }

    private String getBackendUrl() {
        String saved = getPrefs().getString("server_url", null);
        if (saved != null && !saved.trim().isEmpty()) {
            String clean = saved.trim();
            if (!clean.contains("localhost") && !clean.contains("10.0.2.2")) {
                return clean;
            } else {
                getPrefs().edit().remove("server_url").apply();
            }
        }
        return BuildConfig.BACKEND_URL;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initialize Firebase
        try {
            FirebaseApp.initializeApp(this);
            mAuth = FirebaseAuth.getInstance();
        } catch (Exception e) {
            Log.e("TOIGO_FIREBASE", "Firebase initialization notice: " + e.getMessage());
        }

        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout);

        checkAndRequestPermissions();
        setupWebView();

        swipeRefreshLayout.setOnRefreshListener(() -> webView.reload());

        // Always load TOIGO directly from local bundled assets
        // This ensures zero 404/Not Found screens and instant app launch
        webView.loadUrl(LOCAL_APP_URL);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // Native Firebase & Android Bridge for Javascript
        webView.addJavascriptInterface(new ToigoNativeBridge(), "ToigoNativeBridge");

        webView.setWebViewClient(new CustomWebViewClient());
        webView.setWebChromeClient(new CustomWebChromeClient());
    }

    /**
     * Native JavaScript Interface Bridge
     * Enables direct hardware & Firebase Phone Auth operations from the web app
     */
    public class ToigoNativeBridge {
        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public String getServerUrl() {
            return getBackendUrl();
        }

        @JavascriptInterface
        public void setServerUrl(String newUrl) {
            if (newUrl != null && !newUrl.trim().isEmpty()) {
                String cleanUrl = newUrl.trim();
                if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
                    cleanUrl = "https://" + cleanUrl;
                }
                final String target = cleanUrl;
                getPrefs().edit().putString("server_url", target).apply();
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "Backend API set to: " + target, Toast.LENGTH_SHORT).show();
                    String js = "(function() { " +
                            "var base = '" + target.replaceAll("/$", "") + "/api'; " +
                            "if (window.api) window.api.baseUrl = base; " +
                            "if (window.apiClient) window.apiClient.baseUrl = base; " +
                            "window.__TOIGO_NATIVE_BACKEND__ = '" + target.replaceAll("/$", "") + "'; " +
                            "})();";
                    webView.evaluateJavascript(js, null);
                });
            }
        }

        @JavascriptInterface
        public String getShaFingerprint() {
            return "Debug SHA-1: B5:E9:67:87:BB:3C:9D:E8:8D:14:66:DE:A9:F0:26:D4:3B:81:F4:0A\n" +
                   "Release SHA-1: E0:B9:BD:C6:B7:06:18:FB:11:86:B1:53:49:EF:21:F0:BE:2A:D5:D8\n" +
                   "Release SHA-256: AE:B5:4A:EE:66:BE:62:B1:BA:0E:0C:F3:B0:3E:DC:72:CE:28:95:3B:FD:AD:AE:29:49:F1:4E:AC:6F:48:DF:F0";
        }

        @JavascriptInterface
        public void showToast(String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void sendPhoneOtp(String phoneNumber) {
            runOnUiThread(() -> {
                try {
                    if (mAuth == null) {
                        mAuth = FirebaseAuth.getInstance();
                    }
                    PhoneAuthOptions.Builder builder = PhoneAuthOptions.newBuilder(mAuth)
                            .setPhoneNumber(phoneNumber)
                            .setTimeout(60L, TimeUnit.SECONDS)
                            .setActivity(MainActivity.this)
                            .setCallbacks(new PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                                @Override
                                public void onVerificationCompleted(@NonNull PhoneAuthCredential credential) {
                                    String code = credential.getSmsCode();
                                    runOnUiThread(() -> {
                                        if (code != null) {
                                            webView.evaluateJavascript("if (window.onNativeOtpAutoVerified) window.onNativeOtpAutoVerified('" + code + "');", null);
                                        }
                                    });
                                }

                                @Override
                                public void onVerificationFailed(@NonNull FirebaseException e) {
                                    final String msg = e.getMessage() != null ? e.getMessage().replace("'", "\\'") : "Verification failed";
                                    runOnUiThread(() -> {
                                        webView.evaluateJavascript("if (window.onNativeOtpFailed) window.onNativeOtpFailed('" + msg + "');", null);
                                    });
                                }

                                @Override
                                public void onCodeSent(@NonNull String verificationId, @NonNull PhoneAuthProvider.ForceResendingToken token) {
                                    mVerificationId = verificationId;
                                    mResendToken = token;
                                    runOnUiThread(() -> {
                                        webView.evaluateJavascript("if (window.onNativeOtpSent) window.onNativeOtpSent('" + verificationId + "');", null);
                                    });
                                }
                            });

                    if (mResendToken != null) {
                        builder.setForceResendingToken(mResendToken);
                    }

                    PhoneAuthProvider.verifyPhoneNumber(builder.build());
                } catch (Exception e) {
                    final String err = e.getMessage() != null ? e.getMessage().replace("'", "\\'") : "Error sending OTP";
                    webView.evaluateJavascript("if (window.onNativeOtpFailed) window.onNativeOtpFailed('" + err + "');", null);
                }
            });
        }

        @JavascriptInterface
        public void verifyPhoneOtp(String verificationId, String code) {
            runOnUiThread(() -> {
                try {
                    String vId = (verificationId != null && !verificationId.isEmpty()) ? verificationId : mVerificationId;
                    if (vId == null || vId.isEmpty()) {
                        webView.evaluateJavascript("if (window.onNativeOtpVerifyFailed) window.onNativeOtpVerifyFailed('Missing verification ID. Please request a new OTP.');", null);
                        return;
                    }
                    if (mAuth == null) {
                        mAuth = FirebaseAuth.getInstance();
                    }
                    PhoneAuthCredential credential = PhoneAuthProvider.getCredential(vId, code);
                    mAuth.signInWithCredential(credential).addOnCompleteListener(MainActivity.this, task -> {
                        if (task.isSuccessful()) {
                            FirebaseUser user = mAuth.getCurrentUser();
                            String uid = user != null ? user.getUid() : "verified";
                            webView.evaluateJavascript("if (window.onNativeOtpSuccess) window.onNativeOtpSuccess('" + uid + "');", null);
                        } else {
                            Exception ex = task.getException();
                            String err = ex != null ? ex.getMessage() : "Invalid or expired OTP code.";
                            String cleanErr = err.replace("'", "\\'");
                            webView.evaluateJavascript("if (window.onNativeOtpVerifyFailed) window.onNativeOtpVerifyFailed('" + cleanErr + "');", null);
                        }
                    });
                } catch (Exception e) {
                    String err = e.getMessage() != null ? e.getMessage().replace("'", "\\'") : "Error verifying OTP";
                    webView.evaluateJavascript("if (window.onNativeOtpVerifyFailed) window.onNativeOtpVerifyFailed('" + err.replace("'", "\\'") + "');", null);
                }
            });
        }

        @JavascriptInterface
        public void saveAuthSession(String token, String userJson) {
            try {
                getPrefs().edit()
                        .putString("toigo_auth_token", token)
                        .putString("toigo_auth_user", userJson)
                        .apply();
                Log.d("TOIGO_AUTH", "Auth session securely saved in Android SharedPreferences.");
            } catch (Exception e) {
                Log.e("TOIGO_AUTH", "Error saving auth session: " + e.getMessage());
            }
        }

        @JavascriptInterface
        public void clearAuthSession() {
            try {
                getPrefs().edit()
                        .remove("toigo_auth_token")
                        .remove("toigo_auth_user")
                        .apply();
                Log.d("TOIGO_AUTH", "Auth session cleared from Android SharedPreferences.");
            } catch (Exception e) {
                Log.e("TOIGO_AUTH", "Error clearing auth session: " + e.getMessage());
            }
        }

        @JavascriptInterface
        public String getSavedAuthToken() {
            return getPrefs().getString("toigo_auth_token", null);
        }

        @JavascriptInterface
        public String getSavedAuthUser() {
            return getPrefs().getString("toigo_auth_user", null);
        }
    }

    private class CustomWebViewClient extends WebViewClient {
        private final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(MainActivity.this))
                .build();

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return assetLoader.shouldInterceptRequest(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();

            // Handle Telephone Links (112 SOS helpline, etc.)
            if (url.startsWith("tel:")) {
                Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse(url));
                startActivity(intent);
                return true;
            }

            // Handle Google Maps or External Geo links
            if (url.startsWith("geo:") || url.contains("maps.google.com") || url.contains("google.com/maps")) {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
                return true;
            }

            // Handle UPI Intent links (GPay, PhonePe, Paytm)
            if (url.startsWith("upi:")) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "No UPI app found on device.", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            return false;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            swipeRefreshLayout.setRefreshing(false);
            progressBar.setVisibility(View.GONE);
            // Expose native backend URL to web client
            String backend = getBackendUrl().replaceAll("/$", "");
            view.evaluateJavascript("window.__TOIGO_NATIVE_BACKEND__ = '" + backend + "';", null);

            // Synchronize saved persistent session into webview localStorage if empty
            String savedToken = getPrefs().getString("toigo_auth_token", null);
            String savedUser = getPrefs().getString("toigo_auth_user", null);
            if (savedToken != null && !savedToken.isEmpty()) {
                String safeToken = savedToken.replace("'", "\\'");
                String safeUser = (savedUser != null) ? savedUser.replace("\\", "\\\\").replace("'", "\\'") : "";
                String jsSync = "(function() { " +
                        "try { " +
                        "  var currentToken = localStorage.getItem('TOIGO_JWT_TOKEN'); " +
                        "  if (!currentToken || currentToken === 'null' || currentToken === 'undefined') { " +
                        "    localStorage.setItem('TOIGO_JWT_TOKEN', '" + safeToken + "'); " +
                        (savedUser != null ? "    localStorage.setItem('TOIGO_CURRENT_USER', '" + safeUser + "'); " : "") +
                        "    if (window.auth && window.auth.syncCurrentUser) { window.auth.syncCurrentUser(); } " +
                        "  } " +
                        "} catch(e) {} " +
                        "})();";
                view.evaluateJavascript(jsSync, null);
            }
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
            if (request.isForMainFrame()) {
                int status = errorResponse.getStatusCode();
                Log.w("TOIGO_HTTP_ERROR", "Remote HTTP Error " + status + " on " + request.getUrl());
                if (status == 404 || status >= 500) {
                    runOnUiThread(() -> {
                        Toast.makeText(MainActivity.this, "Remote server returned HTTP " + status + ". Loading TOIGO app locally.", Toast.LENGTH_SHORT).show();
                        webView.loadUrl(LOCAL_APP_URL);
                    });
                }
            }
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                swipeRefreshLayout.setRefreshing(false);
                progressBar.setVisibility(View.GONE);
                runOnUiThread(() -> {
                    webView.loadUrl(LOCAL_APP_URL);
                });
            }
        }
    }

    private class CustomWebChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            if (newProgress < 100) {
                progressBar.setVisibility(View.VISIBLE);
                progressBar.setProgress(newProgress);
            } else {
                progressBar.setVisibility(View.GONE);
            }
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                callback.invoke(origin, true, false);
            } else {
                geoOrigin = origin;
                geoCallback = callback;
                ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, PERMISSION_REQUEST_CODE);
            }
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            cameraPermissionRequest = request;
            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                request.grant(request.getResources());
            } else {
                ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.CAMERA}, PERMISSION_REQUEST_CODE);
            }
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            if (MainActivity.this.filePathCallback != null) {
                MainActivity.this.filePathCallback.onReceiveValue(null);
            }
            MainActivity.this.filePathCallback = filePathCallback;

            Intent intent = fileChooserParams.createIntent();
            try {
                startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
            } catch (Exception e) {
                MainActivity.this.filePathCallback = null;
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback != null) {
                Uri[] results = null;
                if (resultCode == RESULT_OK && data != null) {
                    if (data.getData() != null) {
                        results = new Uri[]{data.getData()};
                    } else if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    }
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        }
    }

    private void checkAndRequestPermissions() {
        List<String> neededPermissions = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            neededPermissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            neededPermissions.add(Manifest.permission.CAMERA);
        }
        if (neededPermissions.size() > 0) {
            ActivityCompat.requestPermissions(this, neededPermissions.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            for (int i = 0; i < permissions.length; i++) {
                if (permissions[i].equals(Manifest.permission.ACCESS_FINE_LOCATION) && grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    if (geoCallback != null && geoOrigin != null) {
                        geoCallback.invoke(geoOrigin, true, false);
                        geoCallback = null;
                        geoOrigin = null;
                    }
                }
                if (permissions[i].equals(Manifest.permission.CAMERA) && grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    if (cameraPermissionRequest != null) {
                        cameraPermissionRequest.grant(cameraPermissionRequest.getResources());
                        cameraPermissionRequest = null;
                    }
                }
            }
        }
    }

    private void showOfflineErrorPage() {
        String currentUrl = getBackendUrl();
        String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'>"
                + "<style>"
                + "body{background:#0f172a;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;text-align:center;}"
                + ".card{background:#1e293b;border:1px solid #334155;border-radius:20px;padding:24px;max-width:380px;width:100%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);}"
                + ".badge{display:inline-block;background:rgba(16,185,129,0.15);color:#10b981;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;margin-bottom:12px;letter-spacing:0.5px;}"
                + "h2{color:#f8fafc;margin:0 0 8px 0;font-size:20px;font-weight:800;}"
                + "p{color:#94a3b8;font-size:13px;line-height:1.5;margin:0 0 16px 0;}"
                + ".url-display{background:#0f172a;border:1px dashed #475569;border-radius:10px;padding:10px;font-family:monospace;font-size:12px;color:#38bdf8;word-break:break-all;margin-bottom:16px;}"
                + ".btn-primary{width:100%;background:#10b981;color:#ffffff;border:none;padding:14px;border-radius:12px;font-size:14px;font-weight:700;margin-bottom:16px;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.3);}"
                + ".divider{display:flex;align-items:center;margin:16px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;}"
                + ".divider::before,.divider::after{content:'';flex:1;border-bottom:1px solid #334155;}"
                + ".divider::before{margin-right:8px;}.divider::after{margin-left:8px;}"
                + "input{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#ffffff;font-size:13px;margin-bottom:10px;outline:none;}"
                + "input:focus{border-color:#10b981;}"
                + ".btn-secondary{width:100%;background:#334155;color:#e2e8f0;border:none;padding:12px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;}"
                + "</style></head><body><div class='card'>"
                + "<div class='badge'>SANISAFE NETWORK</div>"
                + "<h2>Connection Notice</h2>"
                + "<p>Unable to connect to the TOIGO cloud backend server:</p>"
                + "<div class='url-display'>" + currentUrl + "</div>"
                + "<button class='btn-primary' onclick='window.location.reload()'>🔄 Retry Connection</button>"
                + "<div class='divider'>Change Server URL</div>"
                + "<input id='urlInput' placeholder='https://your-service.onrender.com' value='" + currentUrl + "'>"
                + "<button class='btn-secondary' onclick='updateUrl()'>⚙️ Save & Switch Server</button>"
                + "</div><script>"
                + "function updateUrl(){"
                + "  var val = document.getElementById('urlInput').value;"
                + "  if(val && window.ToigoNativeBridge){ window.ToigoNativeBridge.setServerUrl(val); }"
                + "  else if(val){ window.location.href = val; }"
                + "}"
                + "</script></body></html>";
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
