import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BADGES } from '../catalog.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(root, '../..');
const out = resolve(root, 'assets');
await mkdir(out, { recursive:true });

const xml = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Deterministic 5×7 pixel font. PNG output avoids depending on client SVG font support.
const FONT = {
  'A':['01110','10001','10001','11111','10001','10001','10001'],
  'B':['11110','10001','10001','11110','10001','10001','11110'],
  'C':['01111','10000','10000','10000','10000','10000','01111'],
  'D':['11110','10001','10001','10001','10001','10001','11110'],
  'E':['11111','10000','10000','11110','10000','10000','11111'],
  'F':['11111','10000','10000','11110','10000','10000','10000'],
  'G':['01111','10000','10000','10111','10001','10001','01111'],
  'H':['10001','10001','10001','11111','10001','10001','10001'],
  'I':['11111','00100','00100','00100','00100','00100','11111'],
  'J':['00111','00010','00010','00010','10010','10010','01100'],
  'K':['10001','10010','10100','11000','10100','10010','10001'],
  'L':['10000','10000','10000','10000','10000','10000','11111'],
  'M':['10001','11011','10101','10101','10001','10001','10001'],
  'N':['10001','11001','10101','10011','10001','10001','10001'],
  'O':['01110','10001','10001','10001','10001','10001','01110'],
  'P':['11110','10001','10001','11110','10000','10000','10000'],
  'Q':['01110','10001','10001','10001','10101','10010','01101'],
  'R':['11110','10001','10001','11110','10100','10010','10001'],
  'S':['01111','10000','10000','01110','00001','00001','11110'],
  'T':['11111','00100','00100','00100','00100','00100','00100'],
  'U':['10001','10001','10001','10001','10001','10001','01110'],
  'V':['10001','10001','10001','10001','10001','01010','00100'],
  'W':['10001','10001','10001','10101','10101','10101','01010'],
  'X':['10001','10001','01010','00100','01010','10001','10001'],
  'Y':['10001','10001','01010','00100','00100','00100','00100'],
  'Z':['11111','00001','00010','00100','01000','10000','11111'],
  '0':['01110','10001','10011','10101','11001','10001','01110'],
  '1':['00100','01100','00100','00100','00100','00100','01110'],
  '2':['01110','10001','00001','00010','00100','01000','11111'],
  '3':['11110','00001','00001','01110','00001','00001','11110'],
  '4':['00010','00110','01010','10010','11111','00010','00010'],
  '5':['11111','10000','10000','11110','00001','00001','11110'],
  '6':['01110','10000','10000','11110','10001','10001','01110'],
  '7':['11111','00001','00010','00100','01000','01000','01000'],
  '8':['01110','10001','10001','01110','10001','10001','01110'],
  '9':['01110','10001','10001','01111','00001','00001','01110'],
  '+':['00000','00100','00100','11111','00100','00100','00000'],
  '-':['00000','00000','00000','11111','00000','00000','00000'],
  '.':['00000','00000','00000','00000','00000','00110','00110'],
  ':':['00000','00110','00110','00000','00110','00110','00000'],
  '&':['01100','10010','10100','01000','10101','10010','01101'],
  ' ':['00000','00000','00000','00000','00000','00000','00000'],
};

const CRC_TABLE = Array.from({ length:256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  return c >>> 0;
});
function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data = Buffer.alloc(0)) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name,data])));
  return Buffer.concat([length,name,data,crc]);
}
function makePng(label) {
  const scale = 2;
  const text = label.toUpperCase();
  const glyphWidth = 5 * scale;
  const gap = scale;
  const diamondWidth = 12 * scale;
  const width = diamondWidth + text.length * (glyphWidth + gap) + 2 * scale;
  const height = 10 * scale;
  const rgba = Buffer.alloc(width * height * 4);
  const pixel = (x,y,r=255,g=255,b=255,a=255) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    rgba[i]=r; rgba[i+1]=g; rgba[i+2]=b; rgba[i+3]=a;
  };
  // Core diamond mark: white outer diamond with a dark inner cut.
  const cx = 6 * scale, cy = 5 * scale;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < diamondWidth; x += 1) {
    const d = Math.abs(x-cx)/(5*scale) + Math.abs(y-cy)/(4*scale);
    if (d <= 1) pixel(x,y);
    if (d <= .48) pixel(x,y,13,17,23,220);
  }
  let ox = diamondWidth;
  const oy = Math.floor((height - 7*scale)/2);
  for (const char of text) {
    const glyph = FONT[char] || FONT[' '];
    glyph.forEach((row, gy) => [...row].forEach((on, gx) => {
      if (on !== '1') return;
      for (let sy=0; sy<scale; sy+=1) for (let sx=0; sx<scale; sx+=1) pixel(ox+gx*scale+sx,oy+gy*scale+sy);
    }));
    ox += glyphWidth + gap;
  }
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y=0; y<height; y+=1) {
    const row = y * (width*4+1); raw[row]=0;
    rgba.copy(raw,row+1,y*width*4,(y+1)*width*4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr), chunk('IDAT',deflateSync(raw,{ level:9 })), chunk('IEND'),
  ]);
}

/* ── SVG → PNG rasteriser ───────────────────────────────────────────────────
 * The hand-rolled 5×7 bitmap font below produced 20 px-tall PNGs that render
 * visibly blocky wherever a client shows a badge larger than its native size
 * (reported against AIOStreams on elfhosted). The SVG sources are real vector
 * paths, so rasterising *those* at RASTER_SCALE gives smooth glyphs and edges.
 *
 * This keeps the original reason the PNGs exist at all: the font is resolved
 * once here, at generation time, so no client ever has to resolve SVG text.
 * Determinism caveat — glyph shapes come from the fonts available to the
 * rendering browser, so regenerating on a differently-provisioned machine can
 * shift antialiasing. The published pack JSON is unaffected (it references
 * URLs, not bytes) and still reproduces byte-identically.
 *
 * Chromium comes from the configurator's Playwright install. When it is not
 * available the script falls back to the bitmap font and says so, so asset
 * generation never hard-fails.
 */
const RASTER_SCALE = 3;

async function openRasterizer() {
  try {
    const require = createRequire(resolve(repoRoot, 'configurator/package.json'));
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage({ deviceScaleFactor: RASTER_SCALE });
    return {
      async render(svg, width, height) {
        await page.setViewportSize({ width: Math.ceil(width), height: Math.ceil(height) });
        await page.setContent(
          `<style>html,body{margin:0;padding:0;background:transparent}</style>${svg}`,
          { waitUntil: 'load' },
        );
        return page.screenshot({ omitBackground: true });
      },
      close: () => browser.close(),
    };
  } catch (err) {
    console.warn(`  ! Chromium rasterizer unavailable (${err.message.split('\n')[0]})`);
    console.warn('  ! Falling back to the 5x7 bitmap font — badges will look blocky.');
    console.warn('  ! Fix: npm install --prefix configurator');
    return null;
  }
}

const rasterizer = await openRasterizer();

for (const badge of BADGES) {
  const label = badge.assetLabel;
  const width = Math.max(58, Math.min(156, 26 + [...label].length * 7.1));
  const fontSize = [...label].length > 13 ? 9 : [...label].length > 9 ? 10 : 11;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(0)}" height="32" viewBox="0 0 ${width.toFixed(0)} 32" role="img" aria-label="${xml(badge.name)}">
  <title>${xml(badge.name)}</title>
  <path d="M8 4 14 10 8 16 2 10Z" fill="#fff" opacity=".96" transform="translate(1 6)"/>
  <path d="M8 7 11 10 8 13 5 10Z" fill="#0d1117" opacity=".72" transform="translate(1 6)"/>
  <text x="21" y="16.5" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="800" letter-spacing=".35" dominant-baseline="middle">${xml(label)}</text>
</svg>\n`;
  const png = rasterizer
    ? await rasterizer.render(svg, Number(width.toFixed(0)), 32)
    : makePng(label);
  await Promise.all([
    writeFile(resolve(out, `${badge.id}.svg`), svg),
    writeFile(resolve(out, `${badge.id}.png`), png),
  ]);
}

if (rasterizer) await rasterizer.close();

await copyFile(resolve(repoRoot, 'Assets/core_icon.svg'), resolve(out, 'core-icon.svg'));
console.log(`Generated ${BADGES.length} original Core badge assets (SVG source + PNG runtime) in ${out}`);
console.log(rasterizer
  ? `PNG runtime rendered from the SVG sources at ${RASTER_SCALE}x.`
  : 'PNG runtime rendered from the bitmap font (blocky) — Chromium was unavailable.');
