"""Generate core-builds-expression-layer.pdf — Core Builds SEL Expression Layer reference."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import textwrap

# ── Palette ───────────────────────────────────────────────────────────────────
BG         = colors.HexColor("#0d1117")
CARD       = colors.HexColor("#161b22")
BORDER     = colors.HexColor("#30363d")
ACCENT     = colors.HexColor("#58a6ff")
GREEN      = colors.HexColor("#3fb950")
AMBER      = colors.HexColor("#d29922")
RED        = colors.HexColor("#f85149")
PURPLE     = colors.HexColor("#bc8cff")
CYAN       = colors.HexColor("#39d353")
MUTED      = colors.HexColor("#8b949e")
WHITE      = colors.HexColor("#e6edf3")
CODE_BG    = colors.HexColor("#0d1117")
CODE_FG    = colors.HexColor("#79c0ff")

W, H = A4
MARGIN = 18 * mm

# ── Styles ────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, **kw)

TITLE   = S("title",   fontName="Helvetica-Bold",   fontSize=22, textColor=WHITE,  alignment=TA_CENTER, spaceAfter=4)
SUBTITLE= S("sub",     fontName="Helvetica",         fontSize=11, textColor=MUTED,  alignment=TA_CENTER, spaceAfter=2)
H1      = S("h1",      fontName="Helvetica-Bold",   fontSize=15, textColor=ACCENT, spaceBefore=10, spaceAfter=4)
H2      = S("h2",      fontName="Helvetica-Bold",   fontSize=11, textColor=WHITE,  spaceBefore=6,  spaceAfter=3)
BODY    = S("body",    fontName="Helvetica",         fontSize=9,  textColor=WHITE,  spaceAfter=3,   leading=14)
MUTED_S = S("muted",   fontName="Helvetica",         fontSize=8,  textColor=MUTED,  spaceAfter=2,   leading=12)
CODE    = S("code",    fontName="Courier",           fontSize=7.5,textColor=CODE_FG,spaceAfter=2,   leading=11,
            backColor=CODE_BG, leftIndent=4, rightIndent=4)
BADGE_E = S("badge_e", fontName="Helvetica-Bold",   fontSize=8,  textColor=RED,    alignment=TA_CENTER)
BADGE_I = S("badge_i", fontName="Helvetica-Bold",   fontSize=8,  textColor=GREEN,  alignment=TA_CENTER)
BADGE_P = S("badge_p", fontName="Helvetica-Bold",   fontSize=8,  textColor=PURPLE, alignment=TA_CENTER)
LABEL   = S("label",   fontName="Helvetica-Bold",   fontSize=8,  textColor=AMBER)
NEW_TAG = S("new",     fontName="Helvetica-Bold",   fontSize=7,  textColor=CYAN,   alignment=TA_CENTER)

# ── Data ──────────────────────────────────────────────────────────────────────

EXPRESSIONS = [
    {
        "id": 1,
        "name": "REPACK / PROPER Passthrough",
        "type": "ISE",
        "status": "trial",
        "summary": (
            "Pins REPACK and PROPER releases to the head of the result queue, bypassing the excluded and "
            "limit pipeline stages. Ensures patched releases always surface even when downstream ESEs would "
            "otherwise suppress them. Only activates when at least one REPACK/PROPER exists in the non-library, "
            "non-SeaDex pool."
        ),
        "expression": (
            "/*REPACK/PROPER Passthrough*/\n"
            "count(\n"
            "  keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper')\n"
            ")>0\n"
            "? passthrough(\n"
            "    keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'),\n"
            "    'excluded','limit'\n"
            "  )\n"
            ": []"
        ),
        "use_cases": [
            ("All templates", "Universal", "REPACKs fix broken encodes and corrupt audio — relevant across every template type."),
            ("Anime · all variants", "Critical", "Fansub REPACKs are extremely common; a v2 or REPACK may be the only watchable version of an episode."),
            ("Hybrid · 4K Hybrid", "High", "Scene/Usenet REPACK cycles happen frequently on new releases; catching them early matters on Usenet-heavy builds."),
            ("Stream · Essential", "High", "1080p WEB-DL REPACKs from streaming services (Netflix/AMZN fix runs) are common in the first 24h after release."),
        ],
    },
    {
        "id": 2,
        "name": "Per-Addon Flood Guard",
        "type": "ESE",
        "status": "trial",
        "summary": (
            "Caps the number of results contributed by each scraper addon on cached non-library streams. "
            "Prevents high-volume addons (Meteor, Comet) from flooding the result list and burying "
            "quality results from lower-volume sources. Caps: Meteor ≤5, Comet RD ≤5, MediaFusion ≤4, "
            "Torrent Galaxy / EZTV / Knaben / HdHub ≤3."
        ),
        "expression": (
            "/*Per-Addon Flood Guard*/\n"
            "merge(\n"
            "  slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Meteor'),5),\n"
            "  slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Comet RD'),5),\n"
            "  slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'MediaFusion'),4),\n"
            "  slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Torrent Galaxy'),3),\n"
            "  slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'EZTV'),3),\n"
            "  slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Knaben'),3),\n"
            "  slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'HdHub'),3)\n"
            ")"
        ),
        "use_cases": [
            ("Stream · Essential · FireStick", "Critical", "Meteor returns 15–20+ 1080p results; without caps the top 15 slots are all Meteor, drowning out Comet and TorBox-native results."),
            ("Apex · 4K Apex · 4K Essential", "High", "4K results from Meteor can outnumber curated Comet/MediaFusion results 5:1 on popular titles."),
            ("Anime · all variants", "High", "AnimeTosho and HdHub can flood with low-quality upscales; per-addon caps keep quality releases visible."),
            ("Hybrid · 4K Hybrid", "High", "Usenet + debrid stacks generate more total results; flood guard prevents any single source type dominating."),
            ("Speed · Flash", "Moderate", "These templates already bias toward cached instant results; guard prevents cache-flooding from Meteor on speed-focused configs."),
        ],
    },
    {
        "id": 3,
        "name": "Usenet Propagation Guard",
        "type": "ESE",
        "status": "trial",
        "summary": (
            "Holds back Usenet NZBs younger than 2 hours (0.083 days) when fully propagated NZBs already "
            "exist. Eliminates incomplete or corrupt early-propagation grabs that appear immediately after "
            "a scene release hits indexers. Only activates when there are propagated alternatives — "
            "if all Usenet results are <2h old the guard does not fire, preserving availability on fresh content."
        ),
        "expression": (
            "/*Usenet Propagation Guard*/\n"
            "count(\n"
            "  negate(\n"
            "    age(type(streams,'usenet','stremio-usenet'),0,'0.083'),\n"
            "    type(streams,'usenet','stremio-usenet')\n"
            "  )\n"
            ")>0\n"
            "? age(type(streams,'usenet','stremio-usenet'),0,'0.083')\n"
            ": []"
        ),
        "use_cases": [
            ("Apex · 4K Hybrid · 4K Essential", "Critical", "4K Usenet releases on NZBGeek/TorBox Usenet are grabbed within minutes of scene drop; corrupt early NZBs are a top complaint for 4K Usenet builds."),
            ("Hybrid · 1080p variants", "Critical", "Hybrid stacks Usenet + debrid; young NZBs arrive before binary propagation is complete and can stall playback."),
            ("Stream · Essential", "High", "TorBox's native Usenet scraper surfaces new NZBs fast; propagation guard prevents the first-grabbed-but-incomplete result appearing at the top."),
            ("Speed EasyNews · Speed Plus", "High", "EasyNews returns results immediately; propagation guard catches the window between indexer post and full server propagation."),
            ("Flash · Flash 4K", "Not applicable", "Flash templates use only cached debrid content; no Usenet scraper active."),
        ],
    },
    {
        "id": 4,
        "name": "Codec Efficiency Booster",
        "type": "PSE",
        "status": "trial",
        "summary": (
            "Surfaces HEVC (H.265) and AV1 encodes of Bluray REMUX and WEB-DL/WEBRip content ahead of "
            "AVC (H.264) equivalents at 1080p and 720p. Delivers 30–50% lower bandwidth at identical "
            "perceptual quality. Applied only to the non-library, non-SeaDex cached pool — library and "
            "SeaDex results are never reordered."
        ),
        "expression": (
            "/*Codec Efficiency Booster*/\n"
            "merge(\n"
            "  encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'Bluray REMUX'),'1080p'),'HEVC','AV1'),\n"
            "  encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'WEB-DL','WEBRip'),'1080p'),'HEVC','AV1'),\n"
            "  encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'Bluray REMUX'),'720p'),'HEVC','AV1'),\n"
            "  encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'WEB-DL','WEBRip'),'720p'),'HEVC','AV1')\n"
            ")"
        ),
        "use_cases": [
            ("Stream · Stream Lite · FireStick variants", "Critical", "Primary 1080p WEB-DL template; HEVC WEB-DL is up to 40% smaller than AVC at the same quality — directly impacts FireStick and bandwidth-constrained users."),
            ("Essential · Essential Lite", "Critical", "Essential users often run cheaper hardware or mobile connections; HEVC/AV1 efficiency is the main benefit for this audience."),
            ("Anime · Anime Lite · Anime Dub", "High", "HEVC is effectively the standard codec in fansub releases; booster ensures fansub HEVC results surface above any AVC encode alternatives."),
            ("Speed · Speed Lite variants", "Moderate", "Speed templates already bias toward cached results; booster adds codec preference on top of that without disrupting cache-first ordering."),
            ("Apex · 4K Apex · 4K Hybrid", "Low", "4K REMUX content is almost exclusively HEVC already; minimal effect. DV/HDR encodes at 4K are nearly always HEVC by definition."),
            ("Flash · Flash 4K", "Not applicable", "Flash prioritises instant-play speed over codec; codec reordering would conflict with the Flash philosophy."),
        ],
    },
    {
        "id": 5,
        "name": "Audio Pinnacle",
        "type": "PSE",
        "status": "planned",
        "summary": (
            "Promotes lossless and object-based audio tracks to the top of the ranked pool. Ordered by "
            "priority: Atmos / TrueHD (highest) → DTS-HD MA / DTS-X → EAC3 / DD+. Applied only to "
            "non-library, non-SeaDex cached streams — library and SeaDex results remain untouched. "
            "No existing audio preference expressions covered this gap."
        ),
        "expression": (
            "/*Audio Pinnacle*/\n"
            "merge(\n"
            "  audioTag(negate(merge(library(streams),seadex(streams)),cached(streams)),'Atmos','TrueHD'),\n"
            "  audioTag(negate(merge(library(streams),seadex(streams)),cached(streams)),'DTS-HD MA','DTS-X'),\n"
            "  audioTag(negate(merge(library(streams),seadex(streams)),cached(streams)),'EAC3','DD+')\n"
            ")"
        ),
        "use_cases": [
            ("Apex · 4K Apex (TorBox)", "Critical", "Flagship 4K template — users running home theatre setups with receivers and soundbars. Atmos / TrueHD is a primary reason to choose REMUX. Without this, an SDR WEB-DL with Atmos can rank below a DV REMUX with AAC."),
            ("4K Hybrid · 4K Essential", "Critical", "Same audience as Apex; Usenet and debrid 4K results frequently differ in audio track — guard surfaces the better audio option automatically."),
            ("Hybrid (1080p)", "High", "1080p Bluray REMUX with TrueHD is meaningfully better than AVC/AAC for users with audio equipment; Hybrid is the template most likely to have these options."),
            ("Stream · Stream FireStick", "Moderate", "Atmos EAC3 exists on 1080p WEB-DL (Disney+, Apple TV+, Netflix). Relevant for Dolby-capable soundbars even on streaming devices."),
            ("Essential · Essential Lite", "Moderate", "Usenet + TorBox Essential stack often includes lossless audio on 1080p REMUX results; surfacing them correctly improves the experience for Essential subscribers with audio hardware."),
            ("Speed variants", "Low", "Speed-focused build; audio preference is secondary to cache speed. Safe to include but limited practical impact."),
            ("Anime · all variants", "Low", "Anime fansubs use FLAC or AAC almost exclusively; Atmos/TrueHD are rare. SeaDex results (already pinned) have the best audio; this expression has minimal effect on anime queries."),
            ("Flash · Flash 4K", "Not applicable", "Instant-play philosophy; audio selection is irrelevant to the Flash use case."),
        ],
    },
    {
        "id": 6,
        "name": "HDR / DV Priority",
        "type": "PSE",
        "status": "planned",
        "summary": (
            "Within 4K results, surfaces Dolby Vision and HDR variants ahead of SDR equivalents. "
            "Ordered by priority: DV / HDR10+ / HDR10+DV (highest) → HDR10 / HDR → SDR (falls through to standard ranking). "
            "Standard cache tier PSEs treat all visual tags equally; this adds the missing HDR layer on top. "
            "On 1080p-only templates the expression evaluates to an empty 2160p pool and has zero effect — "
            "safe to deploy universally."
        ),
        "expression": (
            "/*HDR/DV Priority*/\n"
            "merge(\n"
            "  visualTag(\n"
            "    resolution(cached(negate(merge(library(streams),seadex(streams)),streams)),'2160p'),\n"
            "    'DV','HDR10+','HDR10+/DV'\n"
            "  ),\n"
            "  visualTag(\n"
            "    resolution(cached(negate(merge(library(streams),seadex(streams)),streams)),'2160p'),\n"
            "    'HDR10','HDR'\n"
            "  )\n"
            ")"
        ),
        "use_cases": [
            ("Apex · 4K Apex (TorBox)", "Critical", "Core use case — DV REMUX and HDR10+ should always rank above SDR 4K Bluray. Without this a SDR WEB-DL can outscore a DV REMUX if the standard tier ranking happens to favour it."),
            ("4K Essential", "Critical", "Essential 4K users target the best available quality within their debrid tier; HDR/DV ordering is a key part of that."),
            ("4K Hybrid", "Critical", "Hybrid pulls from both Usenet and debrid; HDR/DV results from different sources need consistent ordering regardless of origin."),
            ("Flash 4K", "High", "4K Flash is cached-only; among cached 4K results DV should surface above SDR for devices that support it."),
            ("Speed 4K · Speed 4K Plus (EasyNews)", "High", "Speed 4K targets fast 4K cached results; among those results HDR/DV ordering matters."),
            ("Anime 4K", "Moderate", "Native 4K anime is rare; most 4K anime results are AI upscales or BD sources. HDR ordering still helps where real 4K HDR anime exists (e.g. recent theatrical releases)."),
            ("Stream · Essential · FireStick · Anime (1080p)", "No effect", "These templates block 2160p resolution at the filter stage; the 2160p pool is empty so this expression returns [] — zero impact, zero risk."),
            ("Flash (1080p)", "No effect", "Standard Flash blocks 4K; expression has no effect."),
        ],
    },
    {
        "id": 7,
        "name": "AI Upscale Exclusion",
        "type": "ESE",
        "status": "planned",
        "summary": (
            "Excludes streams whose filename or metadata contains AI upscaling keywords. Uses the "
            "`keyword()` function added in AIOStreams v2.29.6 (May 2026) — the first Core Builds "
            "expression to use this function. Targets: topaz, ai-upscale, aiupscale, upscaled, neural, "
            "enhancedai. Catches AI-processed releases that appear as native 4K but are soft and "
            "artefact-heavy. Inline (not synced) — works on every AIOStreams instance regardless of "
            "SEL_SYNC_ACCESS configuration."
        ),
        "expression": (
            "/*AI Upscale Exclusion*/\n"
            "keyword(\n"
            "  negate(merge(library(streams),seadex(streams)),streams),\n"
            "  'all',\n"
            "  'topaz','ai-upscale','aiupscale','upscaled','neural','enhancedai'\n"
            ")"
        ),
        "use_cases": [
            ("Apex · 4K Apex (TorBox)", "Critical", "4K is the primary domain of AI upscaling; Topaz-processed 'UHD' releases appear legitimate until viewed. Critical for users paying for true 4K quality."),
            ("4K Essential · 4K Hybrid", "Critical", "Same reasoning — AI upscales pollute the 4K result pool and rank highly due to file size and resolution metadata matching genuine 4K."),
            ("Anime 4K", "Critical", "AI upscaling is endemic in anime; a huge proportion of indexer '4K' anime releases are Topaz upscales of 1080p BD sources. SeaDex helps but doesn't cover every title."),
            ("Anime · Anime Lite · Anime Dub", "High", "AI upscaled 1080p anime releases exist (upscaled from 720p BD). Fansub HEVC is almost never AI upscaled so this primarily catches encode releases."),
            ("Flash 4K", "High", "Cached 4K pool on Flash includes AI upscales; excluding them improves instant-play quality."),
            ("Speed 4K · Speed 4K Plus", "High", "Same cached 4K pool concern as Flash 4K."),
            ("Stream · Essential · FireStick", "Moderate", "AI upscaled 1080p is less common but growing; worth including as a precaution — false positives are near-zero since legitimate releases don't use these terms."),
            ("Flash (1080p)", "Low", "Cached 1080p pool; AI upscaling less prevalent at this resolution. Include for completeness."),
        ],
    },
]

TYPE_STYLE = {"ESE": BADGE_E, "ISE": BADGE_I, "PSE": BADGE_P}
TYPE_COLOR = {"ESE": RED, "ISE": GREEN, "PSE": PURPLE}
IMPACT_COLOR = {
    "Critical": colors.HexColor("#f85149"),
    "High":     colors.HexColor("#d29922"),
    "Moderate": colors.HexColor("#58a6ff"),
    "Low":      colors.HexColor("#8b949e"),
    "Not applicable": colors.HexColor("#30363d"),
    "No effect": colors.HexColor("#30363d"),
}

# ── Builder ───────────────────────────────────────────────────────────────────

def build():
    out = "/home/user/Core-Builds/Expressions/core-builds-expression-layer.pdf"
    doc = SimpleDocTemplate(
        out, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
        title="Core Builds — SEL Expression Layer",
    )

    def bg_canvas(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(BG)
        canvas.rect(0, 0, W, H, fill=1, stroke=0)
        canvas.restoreState()

    story = []

    # ── Cover ─────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 12 * mm))
    story.append(Paragraph("Core Builds", TITLE))
    story.append(Paragraph("SEL Expression Layer", S("st2", fontName="Helvetica-Bold", fontSize=16,
                                                       textColor=ACCENT, alignment=TA_CENTER, spaceAfter=3)))
    story.append(Paragraph("Custom AIOStreams expressions for the Core Builds SEL layer",
                            SUBTITLE))
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    story.append(Spacer(1, 4 * mm))

    # summary table
    trial_n  = sum(1 for e in EXPRESSIONS if e["status"] == "trial")
    planned_n = sum(1 for e in EXPRESSIONS if e["status"] == "planned")
    summary_data = [
        [Paragraph("<b>Expressions</b>", S("sc", fontName="Helvetica-Bold", fontSize=9, textColor=MUTED, alignment=TA_CENTER)),
         Paragraph("<b>In Trial</b>",    S("sc", fontName="Helvetica-Bold", fontSize=9, textColor=MUTED, alignment=TA_CENTER)),
         Paragraph("<b>Planned</b>",     S("sc", fontName="Helvetica-Bold", fontSize=9, textColor=MUTED, alignment=TA_CENTER)),
         Paragraph("<b>Gap Filled</b>",S("sc", fontName="Helvetica-Bold", fontSize=9, textColor=MUTED, alignment=TA_CENTER))],
        [Paragraph(f"<b>{len(EXPRESSIONS)}</b>", S("sv", fontName="Helvetica-Bold", fontSize=18, textColor=WHITE, alignment=TA_CENTER)),
         Paragraph(f"<b>{trial_n}</b>",           S("sv", fontName="Helvetica-Bold", fontSize=18, textColor=AMBER, alignment=TA_CENTER)),
         Paragraph(f"<b>{planned_n}</b>",          S("sv", fontName="Helvetica-Bold", fontSize=18, textColor=GREEN, alignment=TA_CENTER)),
         Paragraph("<b>100%</b>",                  S("sv", fontName="Helvetica-Bold", fontSize=18, textColor=ACCENT, alignment=TA_CENTER))],
    ]
    st = TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), CARD),
        ("BOX",        (0,0), (-1,-1), 1, BORDER),
        ("INNERGRID",  (0,0), (-1,-1), 0.5, BORDER),
        ("ROWPADDING", (0,0), (-1,-1), 8),
        ("VALIGN",     (0,0), (-1,-1), "MIDDLE"),
    ])
    t = Table(summary_data, colWidths=[(W - 2*MARGIN)/4]*4)
    t.setStyle(st)
    story.append(t)
    story.append(Spacer(1, 3 * mm))

    # legend
    legend_data = [[
        Paragraph("■ <b>ESE</b> — Excluded Stream Expression", S("leg", fontName="Helvetica", fontSize=8, textColor=RED)),
        Paragraph("■ <b>ISE</b> — Included Stream Expression",  S("leg", fontName="Helvetica", fontSize=8, textColor=GREEN)),
        Paragraph("■ <b>PSE</b> — Preferred Stream Expression", S("leg", fontName="Helvetica", fontSize=8, textColor=PURPLE)),
        Paragraph("● <b>Trial</b>   ○ <b>Planned</b>",          S("leg", fontName="Helvetica", fontSize=8, textColor=MUTED)),
    ]]
    lt = Table(legend_data, colWidths=[(W - 2*MARGIN)/4]*4)
    lt.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("ROWPADDING", (0,0), (-1,-1), 4)]))
    story.append(lt)
    story.append(Spacer(1, 5 * mm))

    # ── Expressions ───────────────────────────────────────────────────────────
    for expr in EXPRESSIONS:
        tc = TYPE_COLOR[expr["type"]]
        is_new = expr["status"] == "planned"

        header_data = [[
            Paragraph(f"<b>{expr['id']}</b>",
                      S("num", fontName="Helvetica-Bold", fontSize=13, textColor=ACCENT, alignment=TA_CENTER)),
            Paragraph(f"<b>{expr['name']}</b>",
                      S("ename", fontName="Helvetica-Bold", fontSize=12, textColor=WHITE)),
            Paragraph(f"<b>{expr['type']}</b>",
                      S("etype", fontName="Helvetica-Bold", fontSize=10, textColor=tc, alignment=TA_CENTER)),
            Paragraph("● TRIAL" if not is_new else "○ PLANNED",
                      S("estat", fontName="Helvetica-Bold", fontSize=8,
                        textColor=AMBER if not is_new else GREEN, alignment=TA_CENTER)),
        ]]
        ht = Table(header_data, colWidths=[10*mm, (W - 2*MARGIN) - 10*mm - 20*mm - 22*mm, 20*mm, 22*mm])
        ht.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), CARD),
            ("BOX",        (0,0), (-1,-1), 1, tc),
            ("LINEAFTER",  (0,0), (0,0),   1, BORDER),
            ("LINEAFTER",  (1,0), (1,0),   1, BORDER),
            ("LINEAFTER",  (2,0), (2,0),   1, BORDER),
            ("ROWPADDING", (0,0), (-1,-1), 7),
            ("VALIGN",     (0,0), (-1,-1), "MIDDLE"),
        ]))

        body_parts = [
            ht,
            Spacer(1, 2),
            Paragraph(expr["summary"], BODY),
            Spacer(1, 2),
            Paragraph("<b>Expression</b>", LABEL),
            Spacer(1, 1),
        ]

        # expression code block
        for line in expr["expression"].split("\n"):
            body_parts.append(Paragraph(line if line.strip() else " ", CODE))

        # use cases table
        body_parts.append(Spacer(1, 3))
        body_parts.append(Paragraph("<b>Template Use Cases</b>", LABEL))
        body_parts.append(Spacer(1, 1))

        uc_data = [[
            Paragraph("<b>Template</b>",  S("uch", fontName="Helvetica-Bold", fontSize=8, textColor=MUTED)),
            Paragraph("<b>Impact</b>",    S("uch", fontName="Helvetica-Bold", fontSize=8, textColor=MUTED)),
            Paragraph("<b>Notes</b>",     S("uch", fontName="Helvetica-Bold", fontSize=8, textColor=MUTED)),
        ]]
        for tmpl, impact, note in expr["use_cases"]:
            ic = IMPACT_COLOR.get(impact, MUTED)
            uc_data.append([
                Paragraph(tmpl,   S("uct", fontName="Helvetica",      fontSize=8, textColor=WHITE)),
                Paragraph(f"<b>{impact}</b>", S("uci", fontName="Helvetica-Bold", fontSize=8, textColor=ic, alignment=TA_CENTER)),
                Paragraph(note,   S("ucn", fontName="Helvetica",      fontSize=8, textColor=MUTED, leading=11)),
            ])
        col_w = W - 2*MARGIN
        uct = Table(uc_data, colWidths=[col_w*0.24, col_w*0.13, col_w*0.63])
        uct.setStyle(TableStyle([
            ("BACKGROUND",  (0,0), (-1, 0),  colors.HexColor("#1c2128")),
            ("BACKGROUND",  (0,1), (-1,-1),  CARD),
            ("BOX",         (0,0), (-1,-1),  1, BORDER),
            ("INNERGRID",   (0,0), (-1,-1),  0.3, BORDER),
            ("ROWPADDING",  (0,0), (-1,-1),  5),
            ("VALIGN",      (0,0), (-1,-1),  "TOP"),
        ]))
        body_parts.append(uct)
        body_parts.append(Spacer(1, 6 * mm))

        story.append(KeepTogether(body_parts[:6]))
        for part in body_parts[6:]:
            story.append(part)

    # footer note
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        "All expressions are inline (not synced) — they work on every AIOStreams instance regardless of "
        "SEL_SYNC_ACCESS configuration. Expressions 1–4 are in active trial on Core Nexus Stream v2.7.10. "
        "Expressions 5–7 are planned additions pending trial completion.",
        MUTED_S
    ))
    story.append(Paragraph(
        "Core Builds by Brevity · github.com/brevityA/Core-Builds · June 2026",
        S("foot", fontName="Helvetica", fontSize=7, textColor=MUTED, alignment=TA_CENTER, spaceBefore=2)
    ))

    doc.build(story, onFirstPage=bg_canvas, onLaterPages=bg_canvas)
    print(f"Written: {out}")


if __name__ == "__main__":
    build()
