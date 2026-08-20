package dev.corebuilds.line

import android.webkit.JavascriptInterface

class LineBridge(private val activity: MainActivity) {
    @JavascriptInterface
    fun startPair(): String = activity.startPair()

    @JavascriptInterface
    fun stopPair() {
        activity.stopPair()
    }

    @JavascriptInterface
    fun takeInbox(): String = activity.takeInbox()

    @JavascriptInterface
    fun setKeepAwake(on: Boolean) {
        activity.setKeepAwake(on)
    }
}
