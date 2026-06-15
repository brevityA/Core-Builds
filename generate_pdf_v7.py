#!/usr/bin/env python3
"""Core Builds Master Reference Guide v7 — PDF Generator"""

from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.pagesizes import A4
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.platypus.flowables import Flowable
import os

OUTPUT_PATH = "/home/user/Core-Builds/Core_Builds_Master_Reference_v7.pdf"

# Colors
BG = HexColor('#0D1117')
CYAN = HexColor('#00BFFF')
PURPLE = HexColor('#7C3AED')
TEXT = HexColor('#E6EDF3')
ROW1 = HexColor('#161B22')
ROW2 = HexColor('#21262D')
GOLD = HexColor('#F59E0B')
GREEN = HexColor('#22C55E')
ORANGE = HexColor('#F97316')
GRAY = HexColor('#8B949E')
DARK_CARD = HexColor('#161B22')
BORDER_GRAY = HexColor('#30363D')

W, H = A4

TEMPLATES = [
    # name, version, path, description, plan, resolution, category
    ("Core Nexus 4K Apex", "v0.4.3", "Single/core-nexus-4k-apex.json",
     "Flagship 4K, IQR Tukey fence PSEs, DV/HDR priority, TrueHD/Atmos, pow() age-decay",
     "Pro", "4K+1080p", "TorBox Pro - Single"),
    ("Core Nexus 4K Apex (TorBox)", "v2.8.2", "Single/core-nexus-4k-apex-torbox.json",
     "TorBox-only Apex, no third-party indexers",
     "Pro", "4K+1080p", "TorBox Pro - Single"),
    ("Core Nexus Stream", "v2.8.2", "Single/core-nexus-stream.json",
     "1080p SDR, WEB-DL focus, hard 4K kill ESE",
     "Pro", "1080p", "TorBox Pro - Single"),
    ("Core Nexus Stream Lite", "v2.8.2", "Single/core-nexus-stream-lite.json",
     "Relaxed filtering variant",
     "Pro", "1080p", "TorBox Pro - Single"),
    ("Core Nexus Stream Firestick", "v2.8.2", "Single/core-nexus-stream-firestick.json",
     "SDR-only, AV1/lossless excluded",
     "Pro", "1080p", "TorBox Pro - Single"),
    ("Core Nexus Stream Firestick Lite", "v2.8.2", "Single/core-nexus-stream-firestick-lite.json",
     "Lite variant",
     "Pro", "1080p", "TorBox Pro - Single"),
    ("Core Nexus 4K Hybrid", "v2.8.2", "Hybrid/core-nexus-4k-hybrid.json",
     "4K dual-source: TorBox + Usenet, IQR PSEs, TorBox-priority PSEs",
     "Pro+NZBGeek", "4K+1080p", "Hybrid"),
    ("Core Nexus Hybrid", "v2.8.2", "Hybrid/core-nexus-hybrid.json",
     "1080p dual-source",
     "Pro+NZBGeek", "1080p", "Hybrid"),
    ("Core Nexus Hybrid Lite", "v2.8.2", "Hybrid/core-nexus-hybrid-lite.json",
     "Relaxed filtering",
     "Pro+NZBGeek", "1080p", "Hybrid"),
    ("Core Nexus 4K Essential", "v2.8.2", "Essential/core-nexus-4k-essential.json",
     "Full 4K IQR stack, no Usenet",
     "Essential", "4K+1080p", "TorBox Essential"),
    ("Core Nexus 4K Essential Lite", "v2.8.2", "Essential/core-nexus-4k-essential-lite.json",
     "CB-style PSEs",
     "Essential", "4K+1080p", "TorBox Essential"),
    ("Core Nexus Essential", "v2.8.2", "Essential/core-nexus-essential.json",
     "1080p standard",
     "Essential", "1080p", "TorBox Essential"),
    ("Core Nexus Essential Lite", "v2.8.2", "Essential/core-nexus-essential-lite.json",
     "Relaxed filtering",
     "Essential", "1080p", "TorBox Essential"),
    ("Core Nexus Flash", "v2.8.2", "Flash/core-nexus-flash.json",
     "Instant play, cached-only, 2-stream stop",
     "Essential", "1080p", "Flash"),
    ("Core Nexus Flash 4K", "v2.8.2", "Flash/core-nexus-flash-4k.json",
     "Flash at 4K",
     "Essential", "4K+1080p", "Flash"),
    ("Core Nexus Speed 4K+", "v2.8.2", "Speed/EasyNews/core-nexus-speed-4k-plus.json",
     "Fast 4K, EasyNews+TorBox",
     "Essential+EasyNews", "4K", "Speed - EasyNews"),
    ("Core Nexus Speed EasyNews", "v2.8.2", "Speed/EasyNews/core-nexus-speed-easynews.json",
     "EasyNews-only, no TorBox",
     "EasyNews only", "1080p", "Speed - EasyNews"),
    ("Core Nexus 4K AllDebrid", "v0.1.2", "AllDebrid/core-nexus-4k-alldebrid.json",
     "4K IQR PSEs, no TorBox",
     "AllDebrid", "4K+1080p", "AllDebrid"),
    ("Core Nexus 4K AllDebrid Lite", "v0.1.0", "AllDebrid/core-nexus-4k-alldebrid-lite.json",
     "CB-style PSEs",
     "AllDebrid", "4K+1080p", "AllDebrid"),
    ("Core Nexus AllDebrid", "v0.1.0", "AllDebrid/core-nexus-alldebrid.json",
     "1080p AllDebrid",
     "AllDebrid", "1080p", "AllDebrid"),
    ("Core Nexus AllDebrid Lite", "v0.1.0", "AllDebrid/core-nexus-alldebrid-lite.json",
     "Lite variant",
     "AllDebrid", "1080p", "AllDebrid"),
    ("Core Nexus Samsung TV 4K", "v0.2.2", "Device/Samsung/core-nexus-samsung-tv-4k.json",
     "DV excluded, HDR10+/HDR10/HLG, AV1+VC-1 excluded, no lossless via HDMI",
     "Pro", "4K+1080p", "Samsung TV"),
    ("Core Nexus Samsung TV", "v0.2.2", "Device/Samsung/core-nexus-samsung-tv.json",
     "Same but 1080p focus, DV excluded",
     "Pro", "1080p", "Samsung TV"),
    ("Core Nexus Anime", "v2.8.3", "Anime/core-nexus-anime.json",
     "SeaDex best releases, 1080p",
     "Essential", "1080p", "Anime"),
    ("Core Nexus Anime Lite", "v2.8.3", "Anime/core-nexus-anime-lite.json",
     "Relaxed",
     "Essential", "1080p", "Anime"),
    ("Core Nexus Anime 4K", "v2.8.3", "Anime/core-nexus-anime-4k.json",
     "4K HDR anime",
     "Essential", "4K+1080p", "Anime"),
    ("Core Nexus Anime 4K Lite", "v2.8.3", "Anime/core-nexus-anime-4k-lite.json",
     "Relaxed",
     "Essential", "4K+1080p", "Anime"),
    ("Core Nexus Anime Dub", "v2.8.3", "Anime/core-nexus-anime-dub.json",
     "English dub priority",
     "Essential", "1080p", "Anime"),
    ("Core Nexus Anime Dub Lite", "v2.8.3", "Anime/core-nexus-anime-dub-lite.json",
     "Relaxed",
     "Essential", "1080p", "Anime"),
    ("Core Nexus Apple TV 4K", "v0.1.0", "Nightly/AppleTV/core-nexus-apple-tv-4k.json",
     "DV Profile 5/8, AV1 excluded, DD+ Atmos",
     "Pro", "4K+1080p", "Nightly"),
    ("Core Nexus 4K Apex Labs", "v0.1.0", "Nightly/Single/core-nexus-4k-apex-labs.json",
     "Experimental: pin(), audioChannels()",
     "Pro", "4K", "Nightly"),
]

IMPORT_BASE = "https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Templates/Torbox/"

CATEGORIES_ORDER = [
    "TorBox Pro - Single",
    "Hybrid",
    "TorBox Essential",
    "Flash",
    "Speed - EasyNews",
    "AllDebrid",
    "Samsung TV",
    "Anime",
    "Nightly",
]


def plan_color(plan):
    p = plan.lower()
    if 'alldebrid' in p:
        return PURPLE
    if 'easynews' in p:
        return ORANGE
    if 'essential' in p:
        return GREEN
    if 'pro' in p:
        return CYAN
    return TEXT


def draw_page_background(c, doc):
    c.saveState()
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.restoreState()


def draw_header_bar(c, doc):
    bar_h = 22
    c.saveState()
    c.setFillColor(HexColor('#0A0E14'))
    c.rect(0, H - bar_h, W, bar_h, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.rect(0, H - bar_h, W, 2, fill=1, stroke=0)
    c.setFillColor(GRAY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(2*cm, H - bar_h + 7, "CORE BUILDS  v2.8.2")
    page_num = doc.page
    c.setFont("Helvetica", 8)
    txt = "Page {}".format(page_num)
    c.drawRightString(W - 2*cm, H - bar_h + 7, txt)
    c.restoreState()


def draw_footer(c, doc):
    c.saveState()
    c.setFillColor(BORDER_GRAY)
    c.rect(0, 0, W, 18, fill=1, stroke=0)
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7)
    c.drawString(2*cm, 5, "Core Builds by Brevity  |  AIOStreams Template Collection  |  brevityA/Core-Builds")
    c.drawRightString(W - 2*cm, 5, "Page {}".format(doc.page))
    c.restoreState()


def on_page(c, doc):
    draw_page_background(c, doc)
    if doc.page > 1:
        draw_header_bar(c, doc)
        draw_footer(c, doc)


def draw_cover(c, doc):
    draw_page_background(c, doc)

    # Purple bottom strip
    c.setFillColor(PURPLE)
    c.rect(0, 0, W, 60, fill=1, stroke=0)

    # Cyan top accent line
    c.setFillColor(CYAN)
    c.rect(0, H - 4, W, 4, fill=1, stroke=0)

    # Geometric diamond
    cx, cy = W / 2, H * 0.62
    size = 80
    c.saveState()
    c.setStrokeColor(CYAN)
    c.setLineWidth(2)
    # Outer diamond
    p = c.beginPath()
    p.moveTo(cx, cy + size)
    p.lineTo(cx + size * 0.7, cy)
    p.lineTo(cx, cy - size)
    p.lineTo(cx - size * 0.7, cy)
    p.close()
    c.drawPath(p, stroke=1, fill=0)
    # Inner diamond
    c.setStrokeColor(HexColor('#0044AA'))
    c.setLineWidth(1)
    s2 = size * 0.55
    p2 = c.beginPath()
    p2.moveTo(cx, cy + s2)
    p2.lineTo(cx + s2 * 0.7, cy)
    p2.lineTo(cx, cy - s2)
    p2.lineTo(cx - s2 * 0.7, cy)
    p2.close()
    c.drawPath(p2, stroke=1, fill=0)
    # Cross lines
    c.setStrokeColor(HexColor('#003366'))
    c.setLineWidth(0.5)
    c.line(cx - size * 0.7, cy, cx + size * 0.7, cy)
    c.line(cx, cy - size, cx, cy + size)
    c.restoreState()

    # Title
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 52)
    c.drawCentredString(W / 2, H * 0.46, "CORE BUILDS")

    # Subtitle
    c.setFillColor(TEXT)
    c.setFont("Helvetica", 26)
    c.drawCentredString(W / 2, H * 0.40, "Master Reference Guide")

    # Version/date
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(W / 2, H * 0.35, "v2.8.2  |  June 2026")

    # Divider
    c.setStrokeColor(CYAN)
    c.setLineWidth(0.5)
    c.line(W * 0.25, H * 0.33, W * 0.75, H * 0.33)

    # Collection label
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 12)
    c.drawCentredString(W / 2, H * 0.29, "AIOStreams Template Collection by Brevity")

    # Template count
    c.setFillColor(TEXT)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, H * 0.25, "34 Templates  |  9 Categories  |  14 Formatters")

    # Bottom strip text
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(W / 2, 22, "brevityA/Core-Builds  |  github.com")


def make_style(name, **kwargs):
    """Create a ParagraphStyle with defaults for the dark theme."""
    defaults = dict(fontName='Helvetica', fontSize=9, textColor=TEXT, leading=14, spaceAfter=4)
    defaults.update(kwargs)
    return ParagraphStyle(name, **defaults)


def build_styles():
    s = {}
    s['h2'] = make_style('CB_h2', fontName='Helvetica-Bold', fontSize=13, textColor=TEXT, spaceAfter=8)
    s['body'] = make_style('CB_body')
    s['small'] = make_style('CB_small', fontSize=8, textColor=GRAY, leading=12, spaceAfter=2)
    s['mono'] = make_style('CB_mono', fontName='Courier', fontSize=8, textColor=HexColor('#7EE787'), leading=12, spaceAfter=3)
    s['gold'] = make_style('CB_gold', fontName='Helvetica-Bold', fontSize=9, textColor=GOLD, spaceAfter=2)
    s['toc_title'] = make_style('CB_toc_title', fontName='Helvetica-Bold', fontSize=20,
                                textColor=CYAN, spaceAfter=20, alignment=TA_CENTER, leading=24)
    s['pse_code'] = make_style('CB_pse_code', fontName='Courier', fontSize=8,
                               textColor=HexColor('#7EE787'), leading=13, leftIndent=10, spaceAfter=6)
    return s


class SectionHeader(Flowable):
    def __init__(self, text, width=400):
        super().__init__()
        self.text = text
        self._width = width
        self._height = 30

    def draw(self):
        c = self.canv
        c.setFillColor(PURPLE)
        c.rect(0, 0, self._width, self._height, fill=1, stroke=0)
        c.setFillColor(CYAN)
        c.rect(0, self._height - 2, self._width, 2, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(10, 9, self.text)

    def wrap(self, availWidth, availHeight):
        self._width = availWidth
        return availWidth, self._height


class TemplateCard(Flowable):
    def __init__(self, name, version, path, desc, plan, res, width=400):
        super().__init__()
        self._name = name
        self._version = version
        self._path = path
        self._desc = desc
        self._plan = plan
        self._res = res
        self._width = width
        self._height = 70

    def draw(self):
        c = self.canv
        c.setFillColor(DARK_CARD)
        c.roundRect(0, 0, self._width, self._height, 4, fill=1, stroke=0)
        c.setFillColor(CYAN)
        c.rect(0, 0, 3, self._height, fill=1, stroke=0)
        c.setFillColor(CYAN)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(10, self._height - 16, self._name)
        c.setFillColor(GRAY)
        c.setFont("Helvetica-Oblique", 8)
        meta = "{}  |  {}".format(self._version, self._path)
        if len(meta) > 75:
            meta = meta[:72] + "..."
        c.drawString(10, self._height - 28, meta)
        c.setFillColor(TEXT)
        c.setFont("Helvetica", 8.5)
        desc = self._desc
        if len(desc) > 90:
            desc = desc[:87] + "..."
        c.drawString(10, self._height - 42, desc)
        c.setFillColor(ROW2)
        c.rect(10, 6, self._width - 20, 18, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 8)
        specs = "Resolution: {}  |  Plan: {}".format(self._res, self._plan)
        c.drawString(16, 11, specs)

    def wrap(self, availWidth, availHeight):
        self._width = availWidth
        return availWidth, self._height


def _hdr_para(text, color=CYAN, suffix=''):
    """Helper: bold header paragraph for table headers."""
    return Paragraph('<b>{}{}</b>'.format(text, suffix),
                     make_style('_hdr_' + text[:6], fontName='Helvetica-Bold', fontSize=9, textColor=color))


def build_story(styles):
    story = []
    content_width = W - 4 * cm

    # Cover page placeholder (cover drawn in first_page callback)
    story.append(PageBreak())

    # ------------------------------------------------------------------ TOC --
    story.append(Paragraph("Table of Contents", styles['toc_title']))
    story.append(Spacer(1, 10))

    toc_entries = [
        ("1.", "Quick Reference Table", "3"),
        ("2.", "TorBox Pro - Single Templates", "4"),
        ("3.", "Hybrid Templates", "5"),
        ("4.", "TorBox Essential Templates", "6"),
        ("5.", "Flash Templates", "7"),
        ("6.", "Speed / EasyNews Templates", "7"),
        ("7.", "AllDebrid Templates", "8"),
        ("8.", "Samsung TV Templates", "9"),
        ("9.", "Anime Templates", "9"),
        ("10.", "Nightly Templates", "10"),
        ("11.", "Import URLs", "11"),
        ("12.", "PSE Architecture Reference", "12"),
    ]

    toc_data = []
    for num, entry, pg in toc_entries:
        toc_data.append([
            Paragraph('<font color="#F59E0B">{}</font>'.format(num), styles['body']),
            Paragraph(entry, styles['body']),
            Paragraph('<font color="#8B949E">{}</font>'.format(pg), styles['body']),
        ])

    toc_table = Table(toc_data, colWidths=[1.2 * cm, content_width - 2.5 * cm, 1.3 * cm])
    toc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 0), (-1, -1), 0.3, BORDER_GRAY),
    ]))
    story.append(toc_table)
    story.append(PageBreak())

    # -------------------------------------------------------- QUICK REF TABLE --
    story.append(SectionHeader("Quick Reference  -  All 34 Templates", content_width))
    story.append(Spacer(1, 8))

    def _ch(t):
        return Paragraph('<b>{}</b>'.format(t),
                         make_style('qh_' + t[:4].replace(' ', '_'),
                                    fontName='Helvetica-Bold', fontSize=8, textColor=CYAN))

    qr_header = [_ch('#'), _ch('Template Name'), _ch('Plan'), _ch('Res'), _ch('Version'), _ch('Category')]

    qr_rows = [qr_header]
    for i, t in enumerate(TEMPLATES):
        name, ver, path, desc, plan, res, cat = t
        pc = plan_color(plan)
        row = [
            Paragraph(str(i + 1), make_style('qr_n_{}'.format(i), fontSize=8, textColor=GRAY)),
            Paragraph(name, make_style('qr_nm_{}'.format(i), fontSize=8, textColor=TEXT)),
            Paragraph(plan, make_style('qr_pl_{}'.format(i), fontName='Helvetica-Bold', fontSize=8, textColor=pc)),
            Paragraph(res, make_style('qr_rs_{}'.format(i), fontSize=8, textColor=TEXT)),
            Paragraph(ver, make_style('qr_vr_{}'.format(i), fontSize=8, textColor=GOLD)),
            Paragraph(cat, make_style('qr_ct_{}'.format(i), fontSize=8, textColor=GRAY)),
        ]
        qr_rows.append(row)

    col_widths = [0.7 * cm, 5.5 * cm, 3.0 * cm, 2.0 * cm, 1.5 * cm, content_width - 12.7 * cm]
    qr_table = Table(qr_rows, colWidths=col_widths, repeatRows=1)

    ts_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#0A0E14')),
        ('LINEBELOW', (0, 0), (-1, 0), 1, CYAN),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 1), (-1, -1), 0.3, BORDER_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    for i in range(len(TEMPLATES)):
        bg = ROW1 if i % 2 == 0 else ROW2
        ts_cmds.append(('BACKGROUND', (0, i + 1), (-1, i + 1), bg))
    qr_table.setStyle(TableStyle(ts_cmds))
    story.append(qr_table)
    story.append(PageBreak())

    # ---------------------------------------------------- CATEGORY SECTIONS --
    for cat_name in CATEGORIES_ORDER:
        cat_templates = [t for t in TEMPLATES if t[6] == cat_name]
        if not cat_templates:
            continue
        story.append(SectionHeader(cat_name, content_width))
        story.append(Spacer(1, 6))
        for t in cat_templates:
            name, ver, path, desc, plan, res, _cat = t
            story.append(TemplateCard(name, ver, path, desc, plan, res, content_width))
            story.append(Spacer(1, 5))
        story.append(Spacer(1, 10))

    story.append(PageBreak())

    # ------------------------------------------------------ IMPORT URLS PAGE --
    story.append(SectionHeader("Import URLs  -  All Templates", content_width))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Base URL: <font color="#7EE787">{}</font>'.format(IMPORT_BASE),
        styles['body']
    ))
    story.append(Spacer(1, 8))

    current_cat = None
    for t in TEMPLATES:
        name, ver, path, desc, plan, res, cat = t
        if cat != current_cat:
            current_cat = cat
            story.append(Spacer(1, 6))
            story.append(Paragraph(
                '- {} -'.format(cat),
                make_style('cat_hdr_' + cat[:8].replace(' ', '_'),
                           fontName='Helvetica-Bold', fontSize=9, textColor=PURPLE)
            ))
            story.append(Spacer(1, 3))
        full_url = IMPORT_BASE + path
        story.append(Paragraph(name, styles['gold']))
        story.append(Paragraph(full_url, styles['mono']))
        story.append(Spacer(1, 3))

    story.append(PageBreak())

    # ------------------------------------------------- PSE ARCHITECTURE PAGE --
    story.append(SectionHeader("PSE Architecture Reference", content_width))
    story.append(Spacer(1, 10))

    # IQR Tukey Fence
    story.append(Paragraph("IQR Tukey Fence - Adaptive 3-Tier Logic", styles['h2']))
    story.append(Paragraph(
        "Used in: 4K Apex, 4K Essential, 4K AllDebrid, 4K Hybrid. "
        "Selects streams based on peer-group bitrate statistics.",
        styles['body']
    ))
    story.append(Spacer(1, 4))

    tier_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#0A0E14')),
        ('LINEBELOW', (0, 0), (-1, 0), 1, CYAN),
        ('BACKGROUND', (0, 1), (-1, 1), ROW1),
        ('BACKGROUND', (0, 2), (-1, 2), ROW2),
        ('BACKGROUND', (0, 3), (-1, 3), ROW1),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.3, BORDER_GRAY),
    ]
    tier_data = [
        [_ch('Tier'), _ch('Condition'), _ch('Method')],
        [Paragraph('Tier 1', styles['body']),
         Paragraph('4 or more peers', styles['body']),
         Paragraph('IQR Tukey fence: Q1 - 1.5xIQR to Q3 + 1.5xIQR (statistically sound)', styles['body'])],
        [Paragraph('Tier 2', styles['body']),
         Paragraph('1-3 peers', styles['body']),
         Paragraph('min/max +/-20% window (thin pool fallback)', styles['body'])],
        [Paragraph('Tier 3', styles['body']),
         Paragraph('0 peers (fresh release)', styles['body']),
         Paragraph('pow() exponential decay window centred on MEDIAN bitrate', styles['body'])],
    ]
    tier_table = Table(tier_data, colWidths=[2 * cm, 4.5 * cm, content_width - 6.5 * cm])
    tier_table.setStyle(TableStyle(tier_cmds))
    story.append(tier_table)
    story.append(Spacer(1, 12))

    # pow() decay
    story.append(Paragraph("pow() Exponential Decay Formula", styles['h2']))
    story.append(Paragraph(
        'Formula: pow(0.95, daysSinceRelease)  |  +/-40% day 0, +/-9% day 30, ~0% day 90',
        styles['body']
    ))
    story.append(Spacer(1, 6))

    pow_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#0A0E14')),
        ('LINEBELOW', (0, 0), (-1, 0), 1, CYAN),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.3, BORDER_GRAY),
        ('BACKGROUND', (0, 1), (-1, 1), ROW1),
        ('BACKGROUND', (0, 2), (-1, 2), ROW2),
        ('BACKGROUND', (0, 3), (-1, 3), ROW1),
        ('BACKGROUND', (0, 4), (-1, 4), ROW2),
    ]
    pow_data = [
        [_ch('Day'), _ch('Window Width'), _ch('Behaviour')],
        [Paragraph('Day 0', styles['body']), Paragraph('+/-40%', styles['body']), Paragraph('Wide acceptance - very few peers', styles['body'])],
        [Paragraph('Day 30', styles['body']), Paragraph('+/-9%', styles['body']), Paragraph('Tightening as peer data accumulates', styles['body'])],
        [Paragraph('Day 60', styles['body']), Paragraph('+/-2%', styles['body']), Paragraph('Narrow window - likely IQR takes over', styles['body'])],
        [Paragraph('Day 90+', styles['body']), Paragraph('~0%', styles['body']), Paragraph('Effectively dormant', styles['body'])],
    ]
    pow_table = Table(pow_data, colWidths=[2.5 * cm, 3 * cm, content_width - 5.5 * cm])
    pow_table.setStyle(TableStyle(pow_cmds))
    story.append(pow_table)
    story.append(Spacer(1, 12))

    # Regex scoring tiers
    story.append(Paragraph("Regex Scoring Tiers", styles['h2']))
    story.append(Paragraph("53 high-impact regex patterns scored inline across all templates.", styles['body']))
    story.append(Spacer(1, 4))

    regex_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#0A0E14')),
        ('LINEBELOW', (0, 0), (-1, 0), 1, CYAN),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.3, BORDER_GRAY),
    ]
    for i in range(1, 7):
        bg = ROW1 if i % 2 == 1 else ROW2
        regex_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

    regex_data = [
        [_ch('Tier'), _ch('Score'), _ch('Example Groups')],
        [Paragraph('S-Tier', styles['body']),
         Paragraph('<font color="#F59E0B">+100</font>', styles['body']),
         Paragraph('FraMeSToR, BHDStudio (UHD BluRay REMUX)', styles['body'])],
        [Paragraph('A-Tier', styles['body']),
         Paragraph('<font color="#22C55E">+80</font>', styles['body']),
         Paragraph('DON, EbP, SiNNERS (1080p BluRay Encode)', styles['body'])],
        [Paragraph('B-Tier', styles['body']),
         Paragraph('<font color="#00BFFF">+60</font>', styles['body']),
         Paragraph('NTb, FLUX, TEPES (WEB-DL)', styles['body'])],
        [Paragraph('Penalised', styles['body']),
         Paragraph('<font color="#EF4444">-50</font>', styles['body']),
         Paragraph('CAM, HDCAM', styles['body'])],
        [Paragraph('Penalised', styles['body']),
         Paragraph('<font color="#EF4444">-75</font>', styles['body']),
         Paragraph('TS, HDTS, TELESYNC', styles['body'])],
        [Paragraph('Penalised', styles['body']),
         Paragraph('<font color="#EF4444">-200</font>', styles['body']),
         Paragraph('R5, SCR, SCREENER', styles['body'])],
    ]
    regex_table = Table(regex_data, colWidths=[2.5 * cm, 2 * cm, content_width - 4.5 * cm])
    regex_table.setStyle(TableStyle(regex_cmds))
    story.append(regex_table)
    story.append(Spacer(1, 12))

    # ongoingSeason ESE
    story.append(Paragraph("ongoingSeason ESE - Present in All 34 Templates", styles['h2']))
    story.append(Paragraph(
        "Prevents season pack downloads during active airing. Activates when ongoingSeason=true and "
        "the show is currently between episodes (daysSinceLastAired less than -1 or daysUntilNextEpisode >= 0).",
        styles['body']
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "((queryType=='series' or queryType=='anime.series') and ongoingSeason\n"
        "  and (daysSinceLastAired &lt; -1 or daysUntilNextEpisode &gt;= 0))\n"
        "? seasonPack(streams, 'onlySeasons') : []",
        styles['pse_code']
    ))

    return story


def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2.5 * cm,
        bottomMargin=1.5 * cm,
        title="Core Builds Master Reference Guide v2.8.2",
        author="Brevity",
        subject="AIOStreams Template Collection",
    )

    styles = build_styles()
    story = build_story(styles)

    def first_page(c, doc):
        draw_cover(c, doc)

    def later_pages(c, doc):
        on_page(c, doc)

    doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)
    print("PDF generated successfully")


if __name__ == '__main__':
    build_pdf()
