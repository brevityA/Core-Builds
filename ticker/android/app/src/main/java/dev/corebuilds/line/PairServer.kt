package dev.corebuilds.line

import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread
import kotlin.random.Random

data class IncomingFeed(val url: String, val label: String)

class PairServer {
    private var server: ServerSocket? = null
    private var worker: Thread? = null
    private val codeRef = AtomicReference("")
    private val inbox = AtomicReference<IncomingFeed?>(null)

    val port: Int = 8791

    fun start(): JSONObject {
        stop()
        inbox.set(null)
        val code = newCode()
        codeRef.set(code)
        val socket = ServerSocket()
        socket.reuseAddress = true
        socket.bind(InetSocketAddress(port))
        server = socket
        worker = thread(name = "coreline-pair", isDaemon = true) {
            while (!socket.isClosed) {
                val client = try {
                    socket.accept()
                } catch (_: Exception) {
                    break
                }
                thread(name = "coreline-pair-req", isDaemon = true) {
                    handle(client, code)
                }
            }
        }
        val ip = lanIpv4()
        val page = if (ip != null) "http://$ip:$port/" else ""
        return JSONObject()
            .put("ok", ip != null)
            .put("ip", ip ?: "")
            .put("port", port)
            .put("code", code)
            .put("url", page)
            .put("error", if (ip == null) "No Wi-Fi address yet" else "")
    }

    fun stop() {
        codeRef.set("")
        try {
            server?.close()
        } catch (_: Exception) { }
        server = null
        worker = null
    }

    fun takeInbox(): IncomingFeed? = inbox.getAndSet(null)

    private fun handle(client: Socket, expectedCode: String) {
        client.soTimeout = 8_000
        client.use { socket ->
            val input = BufferedReader(InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8))
            val request = input.readLine() ?: return
            val parts = request.split(" ")
            if (parts.size < 2) return reply(socket, 400, "text/plain", "bad request")
            val method = parts[0]
            val headers = readHeaders(input)
            when {
                method == "GET" -> reply(socket, 200, "text/html; charset=utf-8", formPage())
                method == "POST" -> {
                    val length = headers["content-length"]?.toIntOrNull() ?: 0
                    val body = readBody(input, length)
                    val fields = parseForm(body)
                    val url = fields["url"]?.trim().orEmpty()
                    val label = fields["label"]?.trim().ifNullOrBlank("RSS")
                    val code = fields["code"]?.trim().orEmpty()
                    if (code.isEmpty() || !code.equals(expectedCode, ignoreCase = true)) {
                        return reply(socket, 403, "text/html; charset=utf-8", resultPage(false, "Wrong code. Check the TV."))
                    }
                    val safety = SafeUrl.check(url)
                    if (!safety.ok) {
                        return reply(socket, 400, "text/html; charset=utf-8", resultPage(false, escHtml(safety.reason)))
                    }
                    inbox.set(IncomingFeed(safety.url, label))
                    reply(socket, 200, "text/html; charset=utf-8", resultPage(true, "Sent. Look at the TV — ${escHtml(label)} is on the crawl."))
                }
                else -> reply(socket, 405, "text/plain", "method not allowed")
            }
        }
    }

    private fun readHeaders(input: BufferedReader): Map<String, String> {
        val headers = mutableMapOf<String, String>()
        while (true) {
            val line = input.readLine() ?: break
            if (line.isEmpty()) break
            val idx = line.indexOf(':')
            if (idx < 0) continue
            val key = line.substring(0, idx).trim().lowercase()
            val value = line.substring(idx + 1).trim()
            headers[key] = value
        }
        return headers
    }

    private fun readBody(input: BufferedReader, length: Int): String {
        if (length <= 0) return ""
        val want = minOf(length, 8_000)
        val buf = CharArray(want)
        var read = 0
        while (read < want) {
            val n = input.read(buf, read, want - read)
            if (n < 0) break
            read += n
        }
        return String(buf, 0, read)
    }

    private fun parseForm(body: String): Map<String, String> {
        if (body.isBlank()) return emptyMap()
        return body.split("&").mapNotNull { pair ->
            val idx = pair.indexOf('=')
            if (idx < 0) return@mapNotNull null
            val key = urlDecode(pair.substring(0, idx))
            val value = urlDecode(pair.substring(idx + 1))
            key to value
        }.toMap()
    }

    private fun urlDecode(value: String): String =
        URLDecoder.decode(value.replace("+", " "), StandardCharsets.UTF_8.name())

    private fun reply(socket: Socket, code: Int, mime: String, body: String) {
        val bytes = body.toByteArray(StandardCharsets.UTF_8)
        val header = buildString {
            append("HTTP/1.1 $code OK\r\n")
            append("Content-Type: $mime\r\n")
            append("Content-Length: ${bytes.size}\r\n")
            append("Connection: close\r\n")
            append("Cache-Control: no-store\r\n")
            append("\r\n")
        }.toByteArray(StandardCharsets.UTF_8)
        socket.getOutputStream().use { out ->
            out.write(header)
            out.write(bytes)
            out.flush()
        }
    }

    private fun newCode(): String {
        val alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return (1..6).map { alphabet[Random.nextInt(alphabet.length)] }.joinToString("")
    }

    private fun lanIpv4(): String? {
        val interfaces = NetworkInterface.getNetworkInterfaces() ?: return null
        for (nif in interfaces) {
            if (!nif.isUp || nif.isLoopback) continue
            for (addr in nif.inetAddresses) {
                if (addr is Inet4Address && !addr.isLoopbackAddress && !addr.isLinkLocalAddress) {
                    val host = addr.hostAddress ?: continue
                    if (host.startsWith("10.") || host.startsWith("192.168.") ||
                        Regex("""^172\.(1[6-9]|2[0-9]|3[01])\.""").containsMatchIn(host)
                    ) {
                        return host
                    }
                }
            }
        }
        return null
    }

    private fun String?.ifNullOrBlank(fallback: String): String =
        if (this.isNullOrBlank()) fallback else this

    private fun escHtml(value: String): String =
        value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    private fun formPage(): String = """
        <!doctype html><html lang="en"><head>
        <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Add a feed — Core Line</title>
        <style>
          body{margin:0;font-family:system-ui,sans-serif;background:#07090d;color:#f2f5f8;padding:28px 20px}
          h1{font-size:1.4rem;margin:0 0 6px} .sub{color:#8b949e;margin:0 0 22px;line-height:1.5}
          label{display:block;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:#8b949e;margin:14px 0 6px}
          input{width:100%;box-sizing:border-box;background:#121821;border:1px solid rgba(255,255,255,.1);color:#fff;border-radius:12px;padding:14px;font-size:1rem}
          button{width:100%;margin-top:22px;background:#00d4ff;color:#041018;border:0;border-radius:12px;padding:16px;font-weight:800;font-size:1rem}
        </style></head><body>
        <h1>Send a feed to the TV</h1>
        <p class="sub">Paste the RSS / Atom / JSON URL. Same Wi-Fi as the Stick. Core Line never plays video.</p>
        <form method="post" action="/">
          <label>Feed URL</label>
          <input name="url" type="url" required placeholder="https://example.com/sports.xml" autocomplete="off">
          <label>Label</label>
          <input name="label" type="text" maxlength="24" placeholder="My slate">
          <label>Code on the TV</label>
          <input name="code" type="text" required maxlength="6" autocapitalize="characters" placeholder="ABC123">
          <button type="submit">Send to TV</button>
        </form>
        </body></html>
    """.trimIndent()

    private fun resultPage(ok: Boolean, message: String): String = """
        <!doctype html><html lang="en"><head>
        <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Core Line</title>
        <style>body{margin:0;font-family:system-ui,sans-serif;background:#07090d;color:#f2f5f8;padding:48px 22px;text-align:center}
        h1{color:${if (ok) "#00d4ff" else "#ff2d55"};font-size:1.5rem}</style></head>
        <body><h1>${if (ok) "Sent" else "Not sent"}</h1><p>$message</p></body></html>
    """.trimIndent()
}
