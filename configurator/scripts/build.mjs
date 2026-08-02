import { build, transform } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile, cp } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(root, '..');
const src = resolve(root, 'src');
const dist = resolve(root, 'dist');
const web = resolve(dist, 'web');
const assets = resolve(web, 'assets');
await mkdir(assets, { recursive: true });

const jsOut = resolve(assets, 'app.js');
await build({
  entryPoints: [resolve(src, 'js/app.js')],
  outfile: jsOut,
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  legalComments: 'none',
  charset: 'utf8',
});

const cssFiles = ['01-core.css','02-brand-theme.css','03-enhancements.css','04-landing.css','05-unified-ui.css','06-features.css','07-menu-parity.css'];
const rawCss = (await Promise.all(cssFiles.map(file => readFile(resolve(src, 'styles', file), 'utf8')))).join('\n');
const { code: css } = await transform(rawCss, { loader: 'css', minify: true, target: 'es2020' });
await writeFile(resolve(assets, 'app.css'), css);
await copyFile(resolve(src, 'vendor/qrcode.min.js'), resolve(assets, 'qrcode.min.js'));

const shell = await readFile(resolve(src, 'index.html'), 'utf8');
const js = await readFile(jsOut, 'utf8');
const qr = await readFile(resolve(src, 'vendor/qrcode.min.js'), 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex').slice(0, 12);
const assetVersions = { css: digest(css), js: digest(js), qr: digest(qr) };

const sourceStyleLinks = cssFiles.map(file => `<link rel="stylesheet" href="./styles/${file}">`).join('\n');
const webHtml = shell
  .replace(sourceStyleLinks, `<link rel="stylesheet" href="./assets/app.css?v=${assetVersions.css}">`)
  .replace('<script src="./vendor/qrcode.min.js"></script>', `<script src="./assets/qrcode.min.js?v=${assetVersions.qr}"></script>`)
  .replace('<script type="module" src="./js/app.js"></script>', `<script defer src="./assets/app.js?v=${assetVersions.js}"></script>`);
if (!webHtml.includes(`app.js?v=${assetVersions.js}`) || !webHtml.includes(`app.css?v=${assetVersions.css}`)) {
  throw new Error('Web build is missing content-versioned asset URLs');
}
await writeFile(resolve(web, 'index.html'), webHtml);

// Publish the independent static utilities beside the Configurator.
const skipBuild = (src) => { const s = src.replace(/\\/g, '/'); return s.includes('/node_modules/') || s.includes('/.git/'); };
await cp(resolve(repoRoot, 'account-tools'), resolve(web, 'account-tools'), { recursive: true, filter: (s) => !skipBuild(s) });
await cp(resolve(repoRoot, 'tools'), resolve(web, 'tools'), { recursive: true, filter: (s) => !skipBuild(s) });

const standalone = shell
  .replace(sourceStyleLinks, () => `<style>${css}</style>`)
  .replace('<script src="./vendor/qrcode.min.js"></script>', () => `<script>${qr}</script>`)
  .replace('<script type="module" src="./js/app.js"></script>', () => `<script>${js}</script>`);
if (standalone.includes('<script type="module" src="./js/app.js"></script>')) throw new Error('Standalone build still contains the source module tag');
if (standalone.includes("import { ICO }")) throw new Error('Standalone build contains unresolved module imports');
await writeFile(resolve(dist, 'index.html'), standalone);
await writeFile(resolve(root, 'index.html'), standalone);

console.log(`Built standalone: ${standalone.length} bytes`);
console.log(`Built web assets: ${js.length} JS bytes, ${css.length} CSS bytes`);
