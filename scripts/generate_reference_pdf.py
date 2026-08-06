#!/usr/bin/env python3
"""Generate Core Builds Reference PDF using reportlab."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import datetime

OUT = "/home/user/Core-Builds/Core-Builds-Reference.pdf"

# ── Colours ──────────────────────────────────────────────────────────────────
BRAND     = colors.HexColor("#1a1a2e")
ACCENT    = colors.HexColor("#4a90d9")
LIGHT_BG  = colors.HexColor("#f0f4f8")
CODE_BG   = colors.HexColor("#1e1e2e")
CODE_FG   = colors.HexColor("#cdd6f4")
GRID_COL  = colors.HexColor("#d0d7de")
H2_COLOR  = colors.HexColor("#0969da")
H3_COLOR  = colors.HexColor("#1a7f37")
WARN_BG   = colors.HexColor("#fff8c5")
WARN_FG   = colors.HexColor("#9a6700")

# ── Styles ────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def sty(name, parent="Normal", **kw):
    return ParagraphStyle(name, parent=base[parent], **kw)

H1  = sty("H1", "Title",    fontSize=22, textColor=BRAND,    spaceAfter=6, spaceBefore=0, leading=26)
H2  = sty("H2", "Heading2", fontSize=14, textColor=H2_COLOR,  spaceAfter=4, spaceBefore=14, leading=18)
H3  = sty("H3", "Heading3", fontSize=11, textColor=H3_COLOR,  spaceAfter=3, spaceBefore=10, leading=14)
H4  = sty("H4", "Heading3", fontSize=10, textColor=BRAND,    spaceAfter=2, spaceBefore=8,  leading=13)
BODY = sty("BODY", fontSize=9,  leading=13, spaceAfter=3)
SMALL = sty("SMALL", fontSize=8, leading=11, textColor=colors.HexColor("#444444"))
CODE = sty("CODE", fontName="Courier", fontSize=8, leading=11,
           backColor=CODE_BG, textColor=CODE_FG,
           leftIndent=6, rightIndent=6, spaceBefore=2, spaceAfter=2)
MONO = sty("MONO", fontName="Courier", fontSize=8, leading=11)
BULLET = sty("BULLET", fontSize=9, leading=13, leftIndent=12, spaceAfter=2,
             bulletIndent=4, bulletFontName="Helvetica")
SUBTITLE = sty("SUBTITLE", fontSize=10, textColor=colors.HexColor("#555555"),
               spaceAfter=2, leading=13)
NOTE = sty("NOTE", fontSize=8, leading=11, textColor=WARN_FG,
           backColor=WARN_BG, leftIndent=6, rightIndent=6, spaceBefore=2, spaceAfter=4)

def hr(): return HRFlowable(width="100%", thickness=0.5, color=GRID_COL, spaceAfter=4, spaceBefore=2)
def sp(h=4): return Spacer(1, h)
def p(text, style=BODY): return Paragraph(text, style)
def h2(text): return [sp(6), Paragraph(text, H2), hr()]
def h3(text): return [Paragraph(text, H3)]
def h4(text): return [Paragraph(text, H4)]
def code(text): return Paragraph(text.replace(" ", "&nbsp;").replace("<", "&lt;").replace(">", "&gt;"), CODE)
def note(text): return Paragraph(f"⚠ {text}", NOTE)
def bullet(text): return Paragraph(f"• {text}", BULLET)

def mono(text):
    t = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f'<font name="Courier">{t}</font>'

def table(data, col_widths=None, header=True):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    style = [
        ("FONTNAME",    (0, 0), (-1, 0 if header else -1), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8),
        ("LEADING",     (0, 0), (-1, -1), 11),
        ("BACKGROUND",  (0, 0), (-1, 0),  LIGHT_BG),
        ("TEXTCOLOR",   (0, 0), (-1, 0),  BRAND),
        ("GRID",        (0, 0), (-1, -1), 0.4, GRID_COL),
        ("VALIGN",      (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",(0, 0), (-1, -1), 5),
        ("TOPPADDING",  (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0,0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]
    t.setStyle(TableStyle(style))
    return t

def mono_cell(text):
    return Paragraph(mono(text), SMALL)

# ─────────────────────────────────────────────────────────────────────────────
# Document assembly
# ─────────────────────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm,
    topMargin=18*mm, bottomMargin=18*mm,
    title="Core Builds — Complete Reference",
    author="Brevity",
)

W = A4[0] - 40*mm  # usable width

story = []

# ── Cover ────────────────────────────────────────────────────────────────────
story += [
    sp(30),
    Paragraph("Core Builds", H1),
    Paragraph("Complete Reference — AIOStreams Templates", SUBTITLE),
    Paragraph(f"Generated {datetime.date.today().strftime('%B %d, %Y')}", SMALL),
    sp(6),
    hr(),
    p("Authoritative reference for all fields, functions, patterns, and conventions used "
      "in the Core Builds template collection for AIOStreams. Pull from <b>brevityA/Core-Builds</b>."),
    PageBreak(),
]

# ─────────────────────────────────────────────────────────────────────────────
# 1. TEMPLATE SCHEMA
# ─────────────────────────────────────────────────────────────────────────────
story += h2("1  Template Schema")
story += [
    p("All templates are JSON files with two top-level objects: <b>metadata</b> and <b>config</b>."),
    sp(4),
]

story += h3("1.1  metadata")
story += [
    table([
        ["Field", "Type", "Notes"],
        [mono_cell("id"),                    p("string", SMALL), p("Unique ID — use brevity.core-nexus-* prefix for stable templates", SMALL)],
        [mono_cell("name"),                  p("string", SMALL), p("Display name shown in AIOStreams UI", SMALL)],
        [mono_cell("description"),           p("string", SMALL), p("Short summary of the template's purpose", SMALL)],
        [mono_cell("source"),                p("string", SMALL), p('"external" for all user-imported templates', SMALL)],
        [mono_cell("author"),                p("string", SMALL), p('"Branding-Brevity"', SMALL)],
        [mono_cell("version"),               p("string", SMALL), p("SemVer — MAJOR.MINOR.PATCH", SMALL)],
        [mono_cell("category"),              p("string", SMALL), p('"Debrid" | "Anime" | "Device" | "Nightly"', SMALL)],
        [mono_cell("serviceRequired"),       p("boolean", SMALL), p("false for most templates", SMALL)],
        [mono_cell("setToSaveInstallMenu"),  p("boolean", SMALL), p("true — saves to install menu on import", SMALL)],
        [mono_cell("sourceUrl"),             p("string", SMALL), p("raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/…", SMALL)],
        [mono_cell("changelogUrl"),          p("string", SMALL), p("Points to CHANGELOG.md raw URL", SMALL)],
        [mono_cell("changelog"),             p("array", SMALL),  p('[{version, date?, changes:[…]}] — shown in update dialog', SMALL)],
    ], col_widths=[50*mm, 22*mm, W - 72*mm]),
    sp(4),
]

story += h3("1.2  config — top-level fields")
story += [
    table([
        ["Field", "Notes"],
        [mono_cell("addonName"),        p("Display name of the addon stack", SMALL)],
        [mono_cell("addonLogo"),        p("Must use /refs/heads/main/ (not /main/) — stale CDN breakage otherwise", SMALL)],
        [mono_cell("sourceUrl"),        p("Same as metadata.sourceUrl — used for in-app update check", SMALL)],
        [mono_cell("parentConfig"),     p("Optional — uuid + password + mergeStrategies for parent/child linking", SMALL)],
        [mono_cell("presets"),          p("Array of addon/service presets", SMALL)],
        [mono_cell("sortCriteria"),     p("{global:[{key,direction}]} — direction must be 'asc'|'desc', never 'order'", SMALL)],
        [mono_cell("maxResults"),       p("Max streams returned (default 20)", SMALL)],
        [mono_cell("maxResultsPerResolution"), p("Cap per resolution bucket (default 8)", SMALL)],
        [mono_cell("excludedEncodes"),  p("Array of codec strings to hard-exclude", SMALL)],
        [mono_cell("excludedAudioTags"),p("Array of audio format strings to hard-exclude", SMALL)],
        [mono_cell("preferredEncodes"), p("Ranked preferred codecs", SMALL)],
        [mono_cell("preferredVisualTags"),p("Ranked HDR/visual tags", SMALL)],
        [mono_cell("preferredAudioChannels"), p("e.g. ['7.1','5.1','2.0']", SMALL)],
        [mono_cell("preferredResolutions"), p("Ordered list — first = most preferred", SMALL)],
        [mono_cell("preferredRegexPatterns"),  p("Template-specific named regex patterns with score (70–100)", SMALL)],
        [mono_cell("rankedRegexPatterns"),     p("|score|≥50 subset from shared file (48 × 4K, 45 × 1080p, 0 × Anime)", SMALL)],
        [mono_cell("streamExpressions"),       p("PSEs — preferred stream expressions (ranking)", SMALL)],
        [mono_cell("excludedStreamExpressions"), p("ESEs — kill/block expressions", SMALL)],
        [mono_cell("includedStreamExpressions"), p("ISEs — passthrough / include expressions", SMALL)],
        [mono_cell("formatter"),        p("Formatter config — references a formatter definition by id", SMALL)],
    ], col_widths=[55*mm, W - 55*mm]),
    sp(4),
]

story += h3("1.3  Preset structure")
story += [
    table([
        ["Field", "Notes"],
        [mono_cell("id"),       p("UUID for the preset instance", SMALL)],
        [mono_cell("type"),     p("Preset type string — see Known Preset Types", SMALL)],
        [mono_cell("enabled"),  p("boolean — false to disable without removing", SMALL)],
        [mono_cell("options"),  p("Type-specific config object (URLs, API keys, timeouts)", SMALL)],
    ], col_widths=[30*mm, W - 30*mm]),
    sp(4),
]

story += h3("1.4  Template Directives (Nightly Labs only)")
story += [
    table([
        ["Directive", "Effect"],
        [mono_cell("__if"),     p("Conditional block — evaluates inputs.x, services.x; supports and/or/xor", SMALL)],
        [mono_cell("__value"),  p("Replaced with a dynamic value at load time", SMALL)],
        [mono_cell("__switch"), p("Multi-branch conditional", SMALL)],
        [mono_cell("__remove"), p("Removes the containing key/element from the output", SMALL)],
    ], col_widths=[35*mm, W - 35*mm]),
    sp(4),
]

# ─────────────────────────────────────────────────────────────────────────────
# 2. KNOWN VALIDATOR RULES
# ─────────────────────────────────────────────────────────────────────────────
story += h2("2  Known Validator Rules")
for item in [
    "<b>sortCriteria direction</b> — must be <font name='Courier'>\"direction\"</font>, not <font name='Courier'>\"order\"</font> — AIOStreams rejects <font name='Courier'>order</font> on import.",
    "<b>addonLogo URL</b> — must use <font name='Courier'>/refs/heads/main/</font> not <font name='Courier'>/main/</font> — short form breaks on stale CDN caches.",
    "<b>stremthruTorz</b> — TorBox-specific; <font name='Courier'>stremthruStore</font> is for other debrid services (AllDebrid, RD).",
    "<b>torbox-search</b> — legacy v2.31.1 built-in preset; removed in v2.32. The separate Newznab option labelled TorBox Search requires its own endpoint/key migration.",
    "<b>syncedRankedRegexUrls</b> — blocked on public instances (elfhosted, fortheweak.cloud). Triggers \"Forbidden URL\" error. Embed patterns inline in rankedRegexPatterns instead.",
    "<b>Regex access</b> — <font name='Courier'>REGEX_FILTER_ACCESS=trusted</font> is the AIOStreams default. Inline rankedRegexPatterns are ALSO blocked for non-trusted users. Self-hosted: set <font name='Courier'>REGEX_FILTER_ACCESS=all</font>.",
    "<b>SEL hard limits</b> — Max 3,000 chars per expression (MAX_SEL_LENGTH); 50,000 chars total (MAX_STREAM_EXPRESSIONS_TOTAL_CHARACTERS); 200 total expressions max. Current peak: 2,953 chars — do not grow the Final Limit ESE.",
]:
    story.append(bullet(item))
story.append(sp(4))

# ─────────────────────────────────────────────────────────────────────────────
# 3. KNOWN PRESET TYPES
# ─────────────────────────────────────────────────────────────────────────────
story += h2("3  Known Preset Types")
story += [
    table([
        ["Category", "type values"],
        ["Debrid / service", mono_cell("stremthruTorz  stremthruStore  torrent-io  torbox")],
        ["Scrapers",         mono_cell("comet  mediafusion  mediafusion-public  jackettio  prowlarr  orionoid  annatar  knaben  torrentio  debridio  meteor  torrent-galaxy  zilean  hdhub  eztv")],
        ["Usenet",           mono_cell("newznab  easynews  easynews-plus")],
        ["Anime-specific",   mono_cell("seadex  animetosho  neko-bt")],
        ["Subtitles",        mono_cell("opensubtitles-v3-plus  aiosubtitle")],
        ["System",          mono_cell("library  custom")],
    ], col_widths=[35*mm, W - 35*mm]),
    sp(4),
]

# ─────────────────────────────────────────────────────────────────────────────
# 4. SEL FUNCTION REFERENCE
# ─────────────────────────────────────────────────────────────────────────────
story += [PageBreak()]
story += h2("4  SEL Function Reference")
story += [p("All functions available in AIOStreams Stream Expression Language "
            "(<font name='Courier'>packages/core/src/parser/streamExpression.ts</font>)."), sp(3)]

story += h3("4.1  Statistics functions")
story += [
    table([
        ["Function", "Description"],
        [mono_cell("max(arr)"),          p("Maximum value", SMALL)],
        [mono_cell("min(arr)"),          p("Minimum value", SMALL)],
        [mono_cell("avg(arr) / mean(arr)"), p("Arithmetic mean", SMALL)],
        [mono_cell("sum(arr)"),          p("Sum of values", SMALL)],
        [mono_cell("percentile(arr,n)"), p("nth percentile", SMALL)],
        [mono_cell("q1(arr)"),           p("25th percentile", SMALL)],
        [mono_cell("q2(arr) / median(arr)"), p("50th percentile", SMALL)],
        [mono_cell("q3(arr)"),           p("75th percentile", SMALL)],
        [mono_cell("iqr(arr)"),          p("Interquartile range (q3 − q1)", SMALL)],
        [mono_cell("variance(arr)"),     p("Population variance", SMALL)],
        [mono_cell("stddev(arr)"),       p("Standard deviation", SMALL)],
        [mono_cell("range(arr)"),        p("max − min", SMALL)],
        [mono_cell("mode(arr)"),         p("Most frequent value", SMALL)],
        [mono_cell("skewness(arr)"),     p("Pearson skewness", SMALL)],
        [mono_cell("kurtosis(arr)"),     p("Excess kurtosis", SMALL)],
        [mono_cell("values(streams, field)"), p("Extract field values from a stream array as a numeric array. Common: 'bitrate', 'size', 'seeders'", SMALL)],
    ], col_widths=[55*mm, W - 55*mm]),
    sp(4),
]

story += h3("4.2  Stream filter functions")
story += [
    table([
        ["Function", "Description"],
        [mono_cell("resolution(streams, ...res)"),    p("Filter by resolution string: '2160p','1080p','720p',…", SMALL)],
        [mono_cell("quality(streams, ...q)"),         p("Filter by quality: 'Bluray REMUX','WEB-DL','WEBRip',…", SMALL)],
        [mono_cell("encode(streams, ...enc)"),        p("Filter by codec: 'H.265/HEVC','H.264/AVC','AV1','VC-1',…", SMALL)],
        [mono_cell("type(streams, ...t)"),            p("Filter by content type: 'movie','series',…", SMALL)],
        [mono_cell("visualTag(streams, ...t)"),       p("Filter by HDR tag: 'DV','HDR10+','HDR10','HLG','SDR',…", SMALL)],
        [mono_cell("audioTag(streams, ...t)"),        p("Filter by audio format: 'TrueHD','DTS-HD MA','Atmos',…", SMALL)],
        [mono_cell("audioChannels(streams, ...ch)"),  p("Filter by channel count: '7.1','5.1','2.0',…", SMALL)],
        [mono_cell("language(streams, ...l)"),        p("Filter by language code", SMALL)],
        [mono_cell("subtitle(streams, ...s)"),        p("Filter by subtitle language", SMALL)],
        [mono_cell("seeders(streams, min, max?)"),    p("Filter by seeder count range", SMALL)],
        [mono_cell("age(streams, maxDays)"),          p("Filter streams older than maxDays", SMALL)],
        [mono_cell("size(streams, min, max?)"),       p("Filter by file size — accepts '15GB','1TB', etc.", SMALL)],
        [mono_cell("bitrate(streams, min, max?)"),    p("Filter by bitrate — accepts '5Mbps','50Mbps', etc.", SMALL)],
        [mono_cell("service(streams, ...svc)"),       p("Filter by debrid service: 'torbox','realdebrid',…", SMALL)],
        [mono_cell("cached(streams)"),               p("Keep only cached streams", SMALL)],
        [mono_cell("uncached(streams)"),             p("Keep only uncached streams", SMALL)],
        [mono_cell("releaseGroup(streams, ...g)"),   p("Filter by release group name", SMALL)],
        [mono_cell("seasonPack(streams, mode)"),     p("mode: 'onlySeasons' | 'onlyEpisodes' | 'both'", SMALL)],
        [mono_cell("multiEpisode(streams)"),         p("Keep only multi-episode files", SMALL)],
        [mono_cell("addon(streams, ...names)"),      p("Filter by addon name", SMALL)],
        [mono_cell("library(streams)"),              p("Keep only library/watchlist streams", SMALL)],
        [mono_cell("seadex(streams)"),               p("Keep only SeaDex-matched streams", SMALL)],
        [mono_cell("message(streams, msg)"),         p("Attach a custom message to streams", SMALL)],
        [mono_cell("passthrough(streams)"),          p("Return streams unchanged (identity)", SMALL)],
        [mono_cell("indexer(streams, ...names)"),    p("Filter by indexer/scraper name", SMALL)],
        [mono_cell("keyword(streams, attr, ...kw)"), p("Match by keyword in attr ('filename','releaseGroup','all')", SMALL)],
    ], col_widths=[65*mm, W - 65*mm]),
    sp(4),
]

story += h3("4.3  Score / match functions")
story += [
    table([
        ["Function", "Description"],
        [mono_cell("seScore(streams)"),                    p("Score by stream expression match tier", SMALL)],
        [mono_cell("streamExpressionScore(streams)"),      p("Alias for seScore", SMALL)],
        [mono_cell("regexScore(streams)"),                 p("Score by regex pattern match", SMALL)],
        [mono_cell("regexMatched(streams, ...names)"),     p("Keep streams matched by named regex pattern(s)", SMALL)],
        [mono_cell("regexMatchedInRange(streams,min,max)"),p("Keep streams whose regex match index is in range", SMALL)],
        [mono_cell("seMatched(streams, ...names)"),        p("Keep streams whose SE name matches. No args → all SE-matched", SMALL)],
        [mono_cell("seMatchedInRange(streams, min, max)"), p("Keep streams matched by SE at index in min..max", SMALL)],
        [mono_cell("rseMatched(streams, ...tiers)"),       p("Keep streams matched by named RSE tier", SMALL)],
    ], col_widths=[65*mm, W - 65*mm]),
    sp(4),
]

story += h3("4.4  Array / control functions")
story += [
    table([
        ["Function", "Signature", "Description"],
        [mono_cell("count"),      mono_cell("count(streams)"),                  p("Number of streams in array", SMALL)],
        [mono_cell("negate"),     mono_cell("negate(streams)"),                 p("Invert — exclude these streams from the result set", SMALL)],
        [mono_cell("merge"),      mono_cell("merge(...arrays)"),                p("Concatenate multiple stream arrays", SMALL)],
        [mono_cell("slice"),      mono_cell("slice(streams, start, end?)"),     p("Take a sub-slice of a stream array", SMALL)],
        [mono_cell("perGroup"),   mono_cell("perGroup(streams, key, max)"),     p("Limit to max streams per group key", SMALL)],
        [mono_cell("pin"),        mono_cell("pin(streams, pos?, returnMatched?)"),
         p("Register streams for top/bottom pinning. Returns [] (ESE) or matched streams (RSE). pos: 'top'|'bottom'", SMALL)],
    ], col_widths=[25*mm, 55*mm, W - 80*mm]),
    sp(4),
]

story += h3("4.5  Math (expr-eval)")
for item in [
    mono("pow(base, exp)") + " — exponentiation. Used in IQR pow()-decay: " + mono("pow(0.95, daysSinceRelease)"),
    mono("sqrt(x)") + " — square root",
    mono("random()") + " — random float [0,1)",
    "All standard arithmetic operators: + − * / % ( )",
]:
    story.append(bullet(item))
story.append(sp(4))

# ─────────────────────────────────────────────────────────────────────────────
# 5. SEL VARIABLES
# ─────────────────────────────────────────────────────────────────────────────
story += h2("5  SEL Variables")
story += [p("Available as bare names in any PSE / ESE / ISE expression."), sp(3)]

story += h3("5.1  Content metadata")
story += [
    table([
        ["Variable", "Type", "Values / Notes"],
        [mono_cell("queryType"),       p("string",SMALL), p("'movie' | 'series' | 'anime.movie' | 'anime.series'", SMALL)],
        [mono_cell("isAnime"),         p("boolean",SMALL), p("true when queryType is anime.*", SMALL)],
        [mono_cell("title"),           p("string",SMALL), p("Content title", SMALL)],
        [mono_cell("year"),            p("number",SMALL), p("Release year (start year for series)", SMALL)],
        [mono_cell("yearEnd"),         p("number",SMALL), p("End year for ended series", SMALL)],
        [mono_cell("season"),          p("number",SMALL), p("Requested season number", SMALL)],
        [mono_cell("episode"),         p("number",SMALL), p("Requested episode number", SMALL)],
        [mono_cell("absoluteEpisode"), p("number",SMALL), p("Absolute episode count (anime)", SMALL)],
        [mono_cell("genres"),          p("string[]",SMALL),p("Genre list e.g. ['Action','Drama']", SMALL)],
        [mono_cell("runtime"),         p("number",SMALL), p("Runtime in minutes", SMALL)],
        [mono_cell("originalLanguage"),p("string",SMALL), p("ISO language code e.g. 'en','ja'", SMALL)],
        [mono_cell("hasSeaDex"),       p("boolean",SMALL), p("true when SeaDex entry exists for this title", SMALL)],
    ], col_widths=[45*mm, 22*mm, W - 67*mm]),
    sp(4),
]

story += h3("5.2  Release timing")
story += [
    table([
        ["Variable", "Type", "Notes"],
        [mono_cell("daysSinceRelease"),    p("number",SMALL), p("Days since theatrical/streaming release date", SMALL)],
        [mono_cell("daysSinceFirstAired"), p("number",SMALL), p("Days since series first aired", SMALL)],
        [mono_cell("daysSinceLastAired"),  p("number",SMALL), p("Days since most recent episode aired", SMALL)],
        [mono_cell("daysUntilNextEpisode"),p("number",SMALL), p("Days until next episode (negative if in future)", SMALL)],
        [mono_cell("hasNextEpisode"),      p("boolean",SMALL), p("true if there is a scheduled next episode", SMALL)],
        [mono_cell("latestSeason"),        p("number",SMALL), p("Highest available season number", SMALL)],
        [mono_cell("ongoingSeason"),       p("boolean",SMALL), p("true if the requested season is currently airing", SMALL)],
    ], col_widths=[50*mm, 22*mm, W - 72*mm]),
    sp(4),
]

story += h3("5.3  Dynamic addon fetching (exit condition only)")
story += [
    table([
        ["Variable", "Notes"],
        [mono_cell("totalStreams"),       p("Total streams collected so far across all queried addons", SMALL)],
        [mono_cell("totalTimeTaken"),     p("Elapsed ms since the query started", SMALL)],
        [mono_cell("queriedAddons"),      p("Number of addons already queried", SMALL)],
        [mono_cell("allAddons"),          p("Total number of addons in the stack", SMALL)],
    ], col_widths=[45*mm, W - 45*mm]),
    sp(4),
]

story += h3("5.4  Groups (group condition only)")
story += [
    table([
        ["Variable", "Notes"],
        [mono_cell("previousStreams"),          p("Streams returned by previous group expressions", SMALL)],
        [mono_cell("previousGroupTimeTaken"),   p("Time taken by previous group (ms)", SMALL)],
    ], col_widths=[55*mm, W - 55*mm]),
    sp(4),
]

story += [note("hasChapters, editions, regraded, date, dubbed, subbed — formatter DSL only. "
               "These are stream.X fields in formatter strings, NOT SEL variables.")]
story.append(sp(4))

# ─────────────────────────────────────────────────────────────────────────────
# 6. PSE ARCHITECTURE
# ─────────────────────────────────────────────────────────────────────────────
story += [PageBreak()]
story += h2("6  PSE Architecture")

story += h3("6.1  IQR Tukey Fence (4K full templates)")
story += [
    p("Three-tier adaptive bitrate selection pattern used in 4K Apex, 4K Hybrid, 4K Essential, 4K AllDebrid:"),
    sp(2),
    code("/*LABEL*/\n"
         "count(PEER_EXPR) >= 4\n"
         "  ? size(bitrate(STREAMS,\n"
         "      q1(values(bitrate(STREAMS,'5Mbps'),'bitrate')) - 1.5*iqr(values(...)),\n"
         "      q3(...) + 1.5*iqr(...)), '15GB')\n"
         "  : count(PEER_EXPR) > 0\n"
         "    ? size(bitrate(STREAMS, min(values(...))*0.80, max(values(...))*1.20), '15GB')\n"
         "    : (count(bitrate(STREAMS, MEDIAN*(1-0.4*pow(0.95,daysSinceRelease)),\n"
         "                            MEDIAN*(1+0.4*pow(0.95,daysSinceRelease)))) >= 1\n"
         "        ? bitrate(STREAMS, MEDIAN*(1-0.4*pow(0.95,daysSinceRelease)))\n"
         "        : [])"),
    sp(3),
    table([
        ["Condition", "Strategy"],
        ["≥ 4 peers",  p("IQR Tukey fence: q1 − 1.5×IQR … q3 + 1.5×IQR. Statistically sound; outliers clipped.", SMALL)],
        ["1–3 peers",  p("min × 0.80 … max × 1.20. Thin pool: ±20% tolerance around observed range.", SMALL)],
        ["0 peers",    p("pow(0.95, daysSinceRelease) exponential decay around median bitrate. "
                         "±40% day 0 → ±9% day 30 → ±2% day 60 → ~0% day 90+. Replaces hard 60-day cliff.", SMALL)],
    ], col_widths=[25*mm, W - 25*mm]),
    sp(4),
]

story += h3("6.2  Hybrid TorBox-priority pattern")
story += [
    p("Each IQR tier is preceded by a TorBox-only twin PSE. Returns [] if no TorBox streams match → falls through:"),
    code("service(size(bitrate(STREAMS, IQR_LO, IQR_HI), '15GB'), 'torbox')"),
    sp(4),
]

story += h3("6.3  ongoingSeason PSE (all active templates)")
story += [
    code("/*ongoingSeasonPack*/\n"
         "((queryType=='series' or queryType=='anime.series') and ongoingSeason\n"
         "  and (daysSinceLastAired < -1 or daysUntilNextEpisode >= 0))\n"
         "? seasonPack(streams, 'onlySeasons') : []"),
    p("Returns season packs only when the queried season is currently airing and "
      "the latest episode has aired. Prevents partial-pack results for completed seasons."),
    sp(4),
]

story += h3("6.4  PSE label convention")
story += [
    code("/* TEMPLATE_LABEL Tier Description */"),
    p("Examples: <font name='Courier'>/* APEX S-Tier 4K Remux — IQR Tukey fence */</font>, "
      "<font name='Courier'>/* STREAM A-Tier WEB-DL */</font>"),
    sp(4),
]

# ─────────────────────────────────────────────────────────────────────────────
# 7. REGEX SCORING ARCHITECTURE
# ─────────────────────────────────────────────────────────────────────────────
story += h2("7  Regex Scoring Architecture")
story += [
    p("Two independent regex systems apply simultaneously. Pattern names must not overlap between them — "
      "duplicates cause double-scoring."),
    sp(3),
]

story += h3("7.1  preferredRegexPatterns  (template-specific)")
story += [
    table([
        ["Template type", "Count", "Score", "Example patterns"],
        ["4K templates",   "7",   "70–100", p("Radarr Remux T1, Sonarr Remux T1, Radarr UHD Bluray T1, FraMeSToR, Anime BD T1", SMALL)],
        ["1080p templates","8",   "70–100", p("Radarr Web T1, Sonarr Web T1, FLUX, hallowed, BHDStudio, SiC, 126811, Web T1", SMALL)],
        ["Anime templates","0",   "—",      p("None — SeaDex ISE handles quality selection", SMALL)],
    ], col_widths=[30*mm, 18*mm, 18*mm, W - 66*mm]),
    sp(4),
]

story += h3("7.2  rankedRegexPatterns  (shared high-impact subset)")
story += [
    p("Source of truth: <font name='Courier'>Filtering/ranked-regex-patterns.json</font> — 149 patterns, 10 score tiers."),
    p("Embed only patterns with <b>|score| ≥ 50</b>, minus any names already in preferredRegexPatterns "
      "(prevents double-scoring). Patterns with |score| &lt; 50 (streaming service tags, edition names, "
      "low-tier group labels) add file bulk with no meaningful ranking signal."),
    sp(3),
    table([
        ["Template type", "Count", "Score tiers kept"],
        ["4K templates",   "48", p("S(+100)  A(+80)  B(+60)  Penalised(−50)  Bad(−75)  Blacklist(−200)", SMALL)],
        ["1080p templates","45", p("Same tiers — 8 more preferredRegexPatterns overlaps removed", SMALL)],
        ["Anime templates","0",  p("Cleared — live-action group names don't match anime naming", SMALL)],
    ], col_widths=[35*mm, 20*mm, W - 55*mm]),
    sp(3),
    table([
        ["Score", "Tier", "Meaning"],
        ["+100", "S",          p("Elite remux groups (FraMeSToR, FLUX, BHDStudio, hallowed, SiC, etc.)", SMALL)],
        ["+80",  "A",          p("High-quality encode groups", SMALL)],
        ["+60",  "B",          p("Solid scene groups", SMALL)],
        ["+40",  "C",          p("Acceptable — included in preferredRegexPatterns only", SMALL)],
        ["+20",  "D",          p("Marginal — excluded from inline set", SMALL)],
        ["0",    "Neutral",    p("No signal — excluded", SMALL)],
        ["−25",  "Meh",        p("Slightly penalised — excluded", SMALL)],
        ["−50",  "Penalised",  p("Known low-quality encode groups", SMALL)],
        ["−75",  "Bad",        p("Low-effort or scene-nuked groups", SMALL)],
        ["−200", "Blacklist",  p("Worst offenders — CAM, TS, scene leaks", SMALL)],
    ], col_widths=[15*mm, 22*mm, W - 37*mm]),
    sp(4),
]

story += h3("7.3  syncedRankedRegexUrls — do not use")
story += [
    note("Public AIOStreams instances (elfhosted, fortheweak.cloud) block raw.githubusercontent.com URLs, "
         "throwing \"Forbidden URL(s) in regex configuration\". Always embed patterns inline. "
         "The key should be absent or set to []."),
    sp(4),
]

# ─────────────────────────────────────────────────────────────────────────────
# 8. FORMATTER FIELD REFERENCE
# ─────────────────────────────────────────────────────────────────────────────
story += [PageBreak()]
story += h2("8  Formatter Field Reference")
story += [p("Used in formatter " + mono("name") + "/" + mono("description") + " strings "
            "as " + mono("{stream.fieldName::operator[…]}") + "."), sp(3)]

story += [
    table([
        ["Field", "Type", "Notes / Example"],
        [mono_cell("hasChapters"),     p("boolean",SMALL), p('{stream.hasChapters::istrue["📖 "||""]} — REMUX chapter badge', SMALL)],
        [mono_cell("editions"),        p("string[]",SMALL),p('{stream.editions::join(" · ")} — Director\'s Cut, Extended, IMAX', SMALL)],
        [mono_cell("edition"),         p("string",SMALL),  p("First edition only", SMALL)],
        [mono_cell("regraded"),        p("boolean",SMALL), p('{stream.regraded::istrue["🔄 "||""]} — colour regrade flag', SMALL)],
        [mono_cell("repack"),          p("boolean",SMALL), p('{stream.repack::istrue["🔁 REPACK"||""]} — REPACK/PROPER flag', SMALL)],
        [mono_cell("date"),            p("string",SMALL),  p("Release date parsed from filename", SMALL)],
        [mono_cell("dubbed"),          p("boolean",SMALL), p("Audio is dubbed", SMALL)],
        [mono_cell("subbed"),          p("boolean",SMALL), p("Has subtitles", SMALL)],
        [mono_cell("uSubtitleEmojis"), p("string[]",SMALL),p("Per-language flag emojis (🇬🇧 🇫🇷 🇩🇪 etc.)", SMALL)],
        [mono_cell("seMatched"),       p("string",SMALL),  p("Name of the stream expression that matched", SMALL)],
        [mono_cell("rseMatched"),      p("string[]",SMALL),p("Regex set expression tier(s) matched", SMALL)],
        [mono_cell("nSeScore"),        p("number",SMALL),  p("Normalised stream expression score (0–1)", SMALL)],
        [mono_cell("nRegexScore"),     p("number",SMALL),  p("Normalised regex score (0–1)", SMALL)],
        [mono_cell("folderSeasons"),   p("string[]",SMALL),p("Season folders in multi-season packs", SMALL)],
        [mono_cell("folderEpisodes"),  p("string[]",SMALL),p("Episode entries in folder-based releases", SMALL)],
    ], col_widths=[42*mm, 22*mm, W - 64*mm]),
    sp(4),
]

story += h3("8.1  Formatter String Modifiers")
story += [
    p("Appended after " + mono("::") + " in " + mono("{stream.field::modifier}") + " expressions:"),
    sp(2),
    table([
        ["Modifier", "Effect"],
        [mono_cell("smallcaps"),        p("Renders text in small capitals", SMALL)],
        [mono_cell("rsort"),            p("Reverse-sort array before joining", SMALL)],
        [mono_cell("lsort"),            p("Logical (natural) sort of array", SMALL)],
        [mono_cell("slice(start,end)"), p("Trim array to index range", SMALL)],
        [mono_cell("remove(val)"),      p("Remove a value from array / string", SMALL)],
        [mono_cell("star"),             p("Star rating display (filled stars)", SMALL)],
        [mono_cell("pstar"),            p("Partial-star rating display", SMALL)],
        [mono_cell("istrue[a||b]"),     p("If truthy return a else b — used for boolean fields", SMALL)],
        [mono_cell("join('sep')"),      p("Join array with separator string", SMALL)],
    ], col_widths=[50*mm, W - 50*mm]),
    sp(4),
]

story += h3("8.2  Formatter structure")
story += [
    table([
        ["Field", "Notes"],
        [mono_cell("id"),           p("All Core Builds formatters use id: \"tamtaro\"", SMALL)],
        [mono_cell("definitions.overrides['tamtaro']"), p("Override block — name and description template strings", SMALL)],
    ], col_widths=[60*mm, W - 60*mm]),
    sp(4),
]

# ─────────────────────────────────────────────────────────────────────────────
# 9. PARENT / CHILD CONFIG LINKING
# ─────────────────────────────────────────────────────────────────────────────
story += h2("9  Parent / Child Config Linking  (v2.28.0+)")
story += [
    code('{\n'
         '  "parentConfig": {\n'
         '    "uuid": "parent-config-uuid",\n'
         '    "password": "parent-config-password",\n'
         '    "mergeStrategies": {\n'
         '      "presets":   "inherit" | "extend" | "override",\n'
         '      "services":  "inherit" | "extend" | "override",\n'
         '      "filters":   "inherit" | "override",\n'
         '      "sorting":   "inherit" | "override",\n'
         '      "formatter": "inherit" | "override",\n'
         '      "branding":  "inherit" | "override",\n'
         '      "fieldOverrides": { "addonName": "override" }\n'
         '    }\n'
         '  }\n'
         '}'),
    sp(3),
    table([
        ["Strategy", "Available on", "Effect"],
        ["inherit",  p("all sections",SMALL),               p("Child uses parent's value entirely", SMALL)],
        ["extend",   p("presets, services",SMALL),          p("Merge parent + child lists", SMALL)],
        ["override", p("all sections",SMALL),               p("Child's value takes priority", SMALL)],
        ["fieldOverrides", p("individual fields",SMALL),    p("Override one field while inheriting the rest of the section", SMALL)],
    ], col_widths=[28*mm, 32*mm, W - 60*mm]),
    sp(3),
    bullet("Runtime resolution — parent fetched and merged on every getUser() call; only child stored."),
    bullet("Minimum child: just { parentConfig: { uuid, password } } — all sections inherit."),
    bullet("Graceful fallback: if parent unreachable, child loads unmerged."),
    sp(4),
]

# ─────────────────────────────────────────────────────────────────────────────
# 10. TEMPLATE CONVENTIONS
# ─────────────────────────────────────────────────────────────────────────────
story += h2("10  Conventions")
story += [
    table([
        ["Rule", "Detail"],
        ["Version scheme", p("MAJOR.MINOR.PATCH — minor bump for new features/PSE logic, patch for fixes", SMALL)],
        ["PSE labels",     p("/* TEMPLATE_LABEL Tier Description */ e.g. /* APEX S-Tier 4K Remux — IQR Tukey fence */", SMALL)],
        ["ESE labels",     p("/* Plain English description */", SMALL)],
        ["1080p resolution guard", p("MUST have a hard resolution exclusion ESE: resolution(streams,'2160p','1440p') — PSEs rank but do not exclude", SMALL)],
        ["Samsung templates", p("DV-Only Kill ESE enabled; excludedAudioTags: [TrueHD, DTS-HD MA, DTS:X, FLAC]", SMALL)],
        ["AllDebrid templates", p("stremthruStore replaces stremthruTorz; no legacy torbox-search dependency", SMALL)],
        ["Nightly commit", p("Files are gitignored — use git add -f to stage", SMALL)],
        ["Import URLs",    p("All URLs use brevityA/Core-Builds (not Branding-Brevity)", SMALL)],
        ["API keys",       p("NEVER commit real keys. Personal templates: Templates/Personal/ — do not document", SMALL)],
        ["PR workflow",    p("Create a new PR for every task — even small changes", SMALL)],
    ], col_widths=[40*mm, W - 40*mm]),
    sp(4),
]

# ─────────────────────────────────────────────────────────────────────────────
# 11. TEMPLATE INVENTORY
# ─────────────────────────────────────────────────────────────────────────────
story += [PageBreak()]
story += h2("11  Active Template Inventory  (v2.8.2)")

sections = [
    ("Single (TorBox Pro)", [
        ("core-nexus-4k-apex.json",              "v0.4.4", "Flagship 4K — DV/HDR REMUX · IQR Tukey fence PSEs · pow() decay"),
        ("core-nexus-4k-apex-torbox.json",       "v2.8.2", "TorBox-cached-only 4K Apex variant"),
        ("core-nexus-stream.json",               "v2.8.2", "1080p streaming quality · strict res guard"),
        ("core-nexus-stream-lite.json",          "v2.8.2", "Lite variant of Stream"),
        ("core-nexus-stream-firestick.json",      "v2.8.2", "Fire Stick optimised — SDR-first, SDR audio"),
        ("core-nexus-stream-firestick-lite.json", "v2.8.2", "Lite Fire Stick variant"),
    ]),
    ("Essential (TorBox Essential)", [
        ("core-nexus-4k-essential.json",         "v2.8.2", "4K Essential with IQR PSEs and pow() decay"),
        ("core-nexus-4k-essential-lite.json",    "v2.8.2", "4K Essential — CB-style PSEs (simpler)"),
        ("core-nexus-essential.json",            "v2.8.2", "1080p Essential"),
        ("core-nexus-essential-lite.json",       "v2.8.2", "1080p Essential lite"),
    ]),
    ("Flash (cached-only)", [
        ("core-nexus-flash-4k.json",             "v2.8.2", "Instant play — cached 4K only"),
        ("core-nexus-flash.json",                "v2.8.2", "Instant play — cached 1080p only"),
    ]),
    ("Speed — TorBox", [
        ("core-nexus-speed-4k.json",             "v2.8.2", "Fast cached 4K — library + Zilean, Dynamic exit at 3 cached or 4s"),
        ("core-nexus-speed-4k-lite.json",        "v2.8.2", "Speed 4K lite"),
        ("core-nexus-speed.json",                "v2.8.2", "Fast cached 1080p — same stack"),
        ("core-nexus-speed-lite.json",           "v2.8.2", "Speed 1080p lite"),
    ]),
    ("Speed — EasyNews", [
        ("core-nexus-speed-4k-plus.json",        "v2.8.2", "EasyNews + TorBox 4K"),
        ("core-nexus-speed-easynews.json",       "v2.8.2", "EasyNews 1080p"),
    ]),
    ("AllDebrid", [
        ("core-nexus-4k-alldebrid.json",         "v0.1.2", "4K AllDebrid with IQR PSEs — stremthruStore"),
        ("core-nexus-4k-alldebrid-lite.json",    "v0.1.0", "4K AllDebrid — CB-style PSEs"),
        ("core-nexus-alldebrid.json",            "v0.1.0", "1080p AllDebrid"),
        ("core-nexus-alldebrid-lite.json",       "v0.1.0", "1080p AllDebrid lite"),
    ]),
    ("Hybrid (TorBox Pro + NZBGeek)", [
        ("core-nexus-4k-hybrid.json",            "v2.8.2", "4K hybrid — TorBox priority PSEs + IQR"),
        ("core-nexus-hybrid.json",               "v2.8.2", "1080p hybrid"),
        ("core-nexus-hybrid-lite.json",          "v2.8.2", "1080p hybrid lite"),
    ]),
    ("Device — Samsung TV", [
        ("core-nexus-samsung-tv.json",           "v0.2.2", "1080p · DV-Only Kill · AV1/VC-1 excluded"),
        ("core-nexus-samsung-tv-4k.json",        "v0.2.2", "4K · HDR10+/HDR10/HLG priority · DV-Only Kill · AV1/VC-1 excluded"),
    ]),
    ("Anime", [
        ("core-nexus-anime-4k.json",             "v2.8.3", "4K anime — SeaDex + AnimeTosho"),
        ("core-nexus-anime-4k-lite.json",        "v2.8.3", "4K anime lite"),
        ("core-nexus-anime.json",                "v2.8.3", "1080p anime"),
        ("core-nexus-anime-lite.json",           "v2.8.3", "1080p anime lite"),
        ("core-nexus-anime-dub.json",            "v2.8.3", "Dubbed anime variant"),
        ("core-nexus-anime-dub-lite.json",       "v2.8.3", "Dubbed lite"),
    ]),
    ("Nightly  ⚠ gitignored — git add -f to stage", [
        ("Nightly/AppleTV/core-nexus-apple-tv-4k.json",  "v0.1.0", "Apple TV 4K — DV Profile 5/8 · AV1 excluded · Atmos preferred"),
        ("Nightly/Single/core-nexus-4k-apex-labs.json",  "v0.6.0", "Labs — dynamicAddonFetching · template directives · scraper toggles"),
        ("Nightly/Single/core-nexus-stream-labs.json",   "v0.4.0", "Labs 1080p variant"),
        ("Nightly/Essential/core-nexus-essential-labs.json",   "v0.1.0", "Labs Essential 1080p — debrid-only · legacy torbox-search compatibility"),
        ("Nightly/Essential/core-nexus-4k-essential-labs.json","v0.1.0", "Labs Essential 4K — debrid-only"),
        ("Nightly/Samsung/core-nexus-samsung-tv-4k.json","v0.2.4", "Samsung RU7100 (2019) 4K — FLAC/AAC native · APEX IQR PSEs"),
    ]),
]

for section_title, templates in sections:
    story += h3(section_title)
    rows = [["File", "Ver", "Description"]]
    for fname, ver, desc in templates:
        rows.append([mono_cell(fname.split("/")[-1]), p(ver, SMALL), p(desc, SMALL)])
    story.append(table(rows, col_widths=[58*mm, 14*mm, W - 72*mm]))
    story.append(sp(4))

# ─────────────────────────────────────────────────────────────────────────────
# 12. SORT CRITERIA KEYS
# ─────────────────────────────────────────────────────────────────────────────
story += h2("12  Sort Criteria Keys")
story += [
    p("Used in " + mono("config.sortCriteria.global") + " as " + mono('{"key":"…","direction":"asc"|"desc"}') + "."),
    sp(3),
    table([
        ["Key", "Sorts by"],
        [mono_cell("resolution"),      p("Stream resolution (2160p > 1080p > …)", SMALL)],
        [mono_cell("quality"),         p("Stream quality tier (Bluray REMUX > WEB-DL > …)", SMALL)],
        [mono_cell("visualTag"),       p("HDR format (DV > HDR10+ > HDR10 > HLG > SDR)", SMALL)],
        [mono_cell("audioTag"),        p("Audio format (TrueHD Atmos > TrueHD > DTS:X > …)", SMALL)],
        [mono_cell("audioChannels"),   p("Channel count (7.1 > 5.1 > 2.0 > …)", SMALL)],
        [mono_cell("encode"),          p("Video codec (AV1 > H.265 > H.264 > …)", SMALL)],
        [mono_cell("size"),            p("File size", SMALL)],
        [mono_cell("bitrate"),         p("Bitrate", SMALL)],
        [mono_cell("seeders"),         p("Seeder count (torrent)", SMALL)],
        [mono_cell("cached"),          p("Cached status (cached first when asc)", SMALL)],
        [mono_cell("service"),         p("Debrid service priority", SMALL)],
        [mono_cell("seScore"),         p("Stream expression match score (use when streamExpressions present)", SMALL)],
        [mono_cell("regexScore"),      p("Regex pattern match score (use when rankedRegexPatterns/preferredRegexPatterns present)", SMALL)],
        [mono_cell("age"),             p("Stream/release age", SMALL)],
        [mono_cell("languagePreference"), p("Language match preference", SMALL)],
    ], col_widths=[45*mm, W - 45*mm]),
    sp(3),
    note("Both seScore and regexScore must appear in sortCriteria when using both stream expressions "
         "and regex patterns. Omitting one causes the other's scores to be ignored."),
    sp(4),
]

# ─────────────────────────────────────────────────────────────────────────────
# 13. REPO STRUCTURE
# ─────────────────────────────────────────────────────────────────────────────
story += h2("13  Repo Structure")
story += [
    table([
        ["Path", "Contents"],
        [mono_cell("Templates/Torbox/Single/"),       p("TorBox Pro templates (4K Apex, Stream + Lite variants)", SMALL)],
        [mono_cell("Templates/Torbox/Essential/"),    p("TorBox Essential templates", SMALL)],
        [mono_cell("Templates/Torbox/Flash/"),        p("Cached-only instant play", SMALL)],
        [mono_cell("Templates/Torbox/Speed/TorBox/"),p("TorBox-only fast cached play", SMALL)],
        [mono_cell("Templates/Torbox/Speed/EasyNews/"),p("EasyNews dual-source variants", SMALL)],
        [mono_cell("Templates/Torbox/Anime/"),        p("Anime-optimised templates", SMALL)],
        [mono_cell("Templates/Torbox/Hybrid/"),       p("TorBox + RD hybrid templates", SMALL)],
        [mono_cell("Templates/Torbox/AllDebrid/"),    p("AllDebrid variants", SMALL)],
        [mono_cell("Templates/Torbox/Device/Samsung/"),p("Samsung TV device templates", SMALL)],
        [mono_cell("Templates/Torbox/Nightly/"),      p("Pre-release / nightly builds (gitignored)", SMALL)],
        [mono_cell("Templates/Torbox/Deprecated/"),   p("Retired templates kept for reference", SMALL)],
        [mono_cell("Templates/Personal/"),            p("Personal/experimental — do not document or expose", SMALL)],
        [mono_cell("Community-Templates/"),           p("Community-contributed templates (MightyIcyy, RB3)", SMALL)],
        [mono_cell("Formatters/"),                    p("14 custom stream layout formatters", SMALL)],
        [mono_cell("Filtering/"),                     p("Shared filter expression files (ESEs, ISEs, PSEs) + ranked-regex-patterns.json", SMALL)],
        [mono_cell("Regex/"),                         p("Excluded regex pattern lists", SMALL)],
        [mono_cell("Assets/"),                        p("Banners, icons, formatter preview images", SMALL)],
        [mono_cell("Guides/"),                        p("Import guide, troubleshooting, device profiles, FAQ", SMALL)],
        [mono_cell("tests/"),                         p("pytest test suite (template validation, integration)", SMALL)],
        [mono_cell("scripts/"),                       p("One-off maintenance scripts — not imported by templates", SMALL)],
    ], col_widths=[58*mm, W - 58*mm]),
    sp(4),
]

# ─────────────────────────────────────────────────────────────────────────────
# 14. LINKS
# ─────────────────────────────────────────────────────────────────────────────
story += h2("14  Links")
story += [
    table([
        ["Resource", "URL"],
        ["This repo (mirror)",   p("github.com/brevityA/Core-Builds", SMALL)],
        ["Main repo",            p("github.com/Branding-Brevity/Core-Builds-By-Brevity", SMALL)],
        ["AIOStreams",           p("github.com/Viren070/AIOStreams", SMALL)],
        ["AIOStreams docs",      p("docs.aiostreams.viren070.me", SMALL)],
        ["Offline archive",      p("mega.nz/folder/DvQGwYYJ#eAnBsID9nc4Nkr8eQfZ2Lg", SMALL)],
    ], col_widths=[40*mm, W - 40*mm]),
]

# ─────────────────────────────────────────────────────────────────────────────
doc.build(story)
print(f"PDF written to: {OUT}")
