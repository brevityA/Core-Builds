package dev.corebuilds.line

import java.net.IDN
import java.net.URI

data class UrlCheck(val ok: Boolean, val url: String = "", val reason: String = "")

object SafeUrl {
    private val blockedHosts = setOf(
        "localhost",
        "localhost.localdomain",
        "0.0.0.0",
        "127.0.0.1",
        "::1",
        "::",
        "metadata.google.internal",
        "coreline.local",
    )

    fun check(raw: String?): UrlCheck {
        val text = raw?.trim().orEmpty()
        val uri = try {
            URI(text)
        } catch (_: Exception) {
            return UrlCheck(false, reason = "invalid url")
        }
        val scheme = uri.scheme?.lowercase()
        if (scheme != "http" && scheme != "https") {
            return UrlCheck(false, reason = "only http/https feeds are allowed")
        }
        val host = try {
            IDN.toASCII(uri.host ?: "").lowercase().trim('[', ']')
        } catch (_: Exception) {
            return UrlCheck(false, reason = "invalid host")
        }
        if (host.isEmpty() || blockedHosts.contains(host)) {
            return UrlCheck(false, reason = "private hosts are blocked")
        }
        if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
            return UrlCheck(false, reason = "private hosts are blocked")
        }
        if (isPrivateIp(host)) {
            return UrlCheck(false, reason = "private addresses are blocked")
        }
        return UrlCheck(true, url = uri.toString())
    }

    private fun isPrivateIp(host: String): Boolean {
        if (host.startsWith("127.")) return true
        if (host.startsWith("10.")) return true
        if (host.startsWith("192.168.")) return true
        if (host.startsWith("169.254.")) return true
        if (host.startsWith("0.")) return true
        val m = Regex("""^172\.(\d+)\.""").find(host)
        if (m != null) {
            val second = m.groupValues[1].toInt()
            if (second in 16..31) return true
        }
        if (host == "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return true
        return false
    }
}
