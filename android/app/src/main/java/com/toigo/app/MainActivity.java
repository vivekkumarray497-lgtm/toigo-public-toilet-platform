package com.toigo.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
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

    // Backend Web App URL (Configured per build type in build.gradle)
    private static final String APP_URL = BuildConfig.BACKEND_URL;

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

        // Load the TOIGO Web Application
        webView.loadUrl(APP_URL);
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
        public String getShaFingerprint() {
            return "SHA-1: B5:E9:67:87:BB:3C:9D:E8:8D:14:66:DE:A9:F0:26:D4:3B:81:F4:0A | SHA-256: 9F:6E:09:68:3B:45:DB:08:E7:F6:76:43:74:19:88:D1:19:0F:AA:03:D1:93:B4:8D:AD:8C:FF:24:91:26:4C:CF";
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
    }

    private class CustomWebViewClient extends WebViewClient {
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
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                swipeRefreshLayout.setRefreshing(false);
                progressBar.setVisibility(View.GONE);
                showOfflineErrorPage();
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
        String html = "<html><body style='background-color:#0f172a;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;padding:20px;text-align:center;'>"
                + "<h2 style='color:#10b981;font-size:24px;margin-bottom:8px;'>TOIGO Connection Error</h2>"
                + "<p style='color:#94a3b8;font-size:14px;margin-bottom:24px;'>Unable to connect to the TOIGO backend server. Please verify your backend server is running on port 5000 and try again.</p>"
                + "<button onclick='window.location.reload()' style='background:#059669;color:#ffffff;border:none;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:bold;'>Retry Connection</button>"
                + "</body></html>";
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
