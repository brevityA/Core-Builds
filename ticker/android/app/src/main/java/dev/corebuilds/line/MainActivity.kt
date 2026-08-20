package dev.corebuilds.line

import android.annotation.SuppressLint
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import org.json.JSONObject

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private val pairServer = PairServer()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        hideSystemUi()

        webView = WebView(this).apply {
            overScrollMode = View.OVER_SCROLL_NEVER
            isFocusable = true
            isFocusableInTouchMode = true
            webViewClient = LineWebClient(this@MainActivity)
            webChromeClient = WebChromeClient()
        }
        configure(webView.settings)
        webView.addJavascriptInterface(LineBridge(this), "CoreLineNative")
        setContentView(webView)
        webView.requestFocus()
        setKeepAwake(true)

        val tv = isTelevision()
        val query = buildString {
            append("native=1")
            if (tv) append("&tv=1")
        }
        webView.loadUrl("https://${LineWebClient.HOST}/index.html?$query")
    }

    fun startPair(): String = synchronized(pairServer) {
        return try {
            pairServer.start().toString()
        } catch (err: Exception) {
            JSONObject()
                .put("ok", false)
                .put("error", err.message ?: "could not start pair server")
                .toString()
        }
    }

    fun stopPair() {
        synchronized(pairServer) { pairServer.stop() }
    }

    fun takeInbox(): String {
        val feed = synchronized(pairServer) { pairServer.takeInbox() } ?: return ""
        return JSONObject()
            .put("url", feed.url)
            .put("label", feed.label)
            .toString()
    }

    fun setKeepAwake(on: Boolean) {
        runOnUiThread {
            if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        webView.evaluateJavascript(
            """
            (function(){
              var d = document.getElementById('drawer');
              if (d && !d.hidden) { d.hidden = true; return 'closed'; }
              return 'exit';
            })()
            """.trimIndent(),
        ) { result ->
            if (result.contains("exit")) {
                moveTaskToBack(true)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        hideSystemUi()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        stopPair()
        webView.removeJavascriptInterface("CoreLineNative")
        webView.destroy()
        super.onDestroy()
    }

    private fun configure(settings: WebSettings) {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            settings.safeBrowsingEnabled = false
        }
    }

    private fun isTelevision(): Boolean {
        val pm = packageManager
        return pm.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
            || pm.hasSystemFeature(PackageManager.FEATURE_TELEVISION)
            || pm.hasSystemFeature("amazon.hardware.fire_tv")
    }

    @Suppress("DEPRECATION")
    private fun hideSystemUi() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            )
    }
}
