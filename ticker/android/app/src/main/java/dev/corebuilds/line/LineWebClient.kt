package dev.corebuilds.line

import android.content.Context
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

class LineWebClient(private val context: Context) : WebViewClient() {
    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        return request.url.host != HOST
    }

    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
        val uri = request.url
        if (uri.host != HOST) return null
        if (uri.path == "/api/proxy") return proxy(uri)
        if (uri.path?.startsWith("/api/") == true) {
            return text(404, "text/plain", "not found")
        }
        return asset(uri.path ?: "/")
    }

    private fun asset(path: String): WebResourceResponse {
        val clean = path.substringBefore('?').ifBlank { "/" }
        val rel = when {
            clean == "/" -> "www/index.html"
            clean.startsWith("/") -> "www$clean"
            else -> "www/$clean"
        }
        return try {
            val stream = context.assets.open(rel)
            WebResourceResponse(mime(rel), "utf-8", 200, "OK", CACHE_HEADERS, stream)
        } catch (_: Exception) {
            text(404, "text/plain", "not found")
        }
    }

    private fun proxy(uri: Uri): WebResourceResponse {
        val target = uri.getQueryParameter("url")
        val safety = SafeUrl.check(target)
        if (!safety.ok) return text(400, "text/plain", safety.reason)
        return try {
            fetch(safety.url, hops = 0)
        } catch (err: Exception) {
            text(502, "text/plain", err.message ?: "proxy failed")
        }
    }

    private fun fetch(url: String, hops: Int): WebResourceResponse {
        if (hops > 5) return text(508, "text/plain", "too many redirects")
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            instanceFollowRedirects = false
            connectTimeout = 10_000
            readTimeout = 10_000
            setRequestProperty("User-Agent", USER_AGENT)
            setRequestProperty("Accept", "application/json, application/rss+xml, application/xml, text/xml, */*;q=0.8")
        }
        val code = conn.responseCode
        if (code in 300..399) {
            val next = conn.getHeaderField("Location") ?: return text(502, "text/plain", "redirect without location")
            val resolved = URL(URL(url), next).toString()
            val safety = SafeUrl.check(resolved)
            if (!safety.ok) return text(400, "text/plain", safety.reason)
            conn.disconnect()
            return fetch(safety.url, hops + 1)
        }
        val stream: InputStream = if (code in 200..299) {
            LimitedStream(conn.inputStream, MAX_BYTES)
        } else {
            (conn.errorStream ?: ByteArrayInputStream(ByteArray(0)))
        }
        val mime = conn.contentType?.substringBefore(';')?.trim()?.ifBlank { null } ?: "application/octet-stream"
        val message = conn.responseMessage ?: "OK"
        return WebResourceResponse(mime, "utf-8", code, message, CORS_HEADERS, stream)
    }

    private fun text(code: Int, mime: String, body: String): WebResourceResponse {
        val bytes = body.toByteArray(Charsets.UTF_8)
        return WebResourceResponse(
            mime,
            "utf-8",
            code,
            if (code in 200..299) "OK" else "Error",
            CORS_HEADERS,
            ByteArrayInputStream(bytes),
        )
    }

    private fun mime(path: String): String {
        val ext = path.substringAfterLast('.', "").lowercase(Locale.US)
        return when (ext) {
            "html" -> "text/html"
            "css" -> "text/css"
            "js", "mjs" -> "text/javascript"
            "json", "webmanifest" -> "application/json"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "webp" -> "image/webp"
            "xml" -> "application/rss+xml"
            "woff2" -> "font/woff2"
            else -> "application/octet-stream"
        }
    }

    private class LimitedStream(private val inner: InputStream, private val limit: Int) : InputStream() {
        private var seen = 0
        override fun read(): Int {
            if (seen >= limit) return -1
            val value = inner.read()
            if (value >= 0) seen += 1
            return value
        }

        override fun read(b: ByteArray, off: Int, len: Int): Int {
            if (seen >= limit) return -1
            val allowed = minOf(len, limit - seen)
            val n = inner.read(b, off, allowed)
            if (n > 0) seen += n
            return n
        }

        override fun close() = inner.close()
    }

    companion object {
        const val HOST = "coreline.local"
        private const val USER_AGENT = "CoreLine/1.0 (+https://github.com/brevityA/Core-Builds)"
        private const val MAX_BYTES = 1_500_000
        private val CORS_HEADERS = mapOf(
            "Access-Control-Allow-Origin" to "*",
            "Cache-Control" to "no-store",
        )
        private val CACHE_HEADERS = mapOf(
            "Cache-Control" to "public, max-age=300",
        )
    }
}
