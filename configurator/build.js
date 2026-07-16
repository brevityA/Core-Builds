#!/usr/bin/env node
// Build script: obfuscates configurator/index_src.html → configurator/index.html
// Targets only the main application <script> block (the largest one).
// Inlines the external qrcode.min.js back into the output for standalone use.
// Run: node configurator/build.js

const fs   = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const fallbackSrc = path.join(__dirname, 'index_src.html');
const srcPath = fs.existsSync(path.join(__dirname, 'index.src.html'))
  ? path.join(__dirname, 'index.src.html')
  : fallbackSrc;
const outPath = path.join(__dirname, 'index.html');

let html = fs.readFileSync(srcPath, 'utf8');

// Inline external <script src="..."> references so the output is a standalone file.
// Uses string search instead of regex to avoid CodeQL's bad-tag-filter rule.
{
  const OPEN = '<script src="';
  const CLOSE_TAG = '</script>';
  let pos = 0;
  while (true) {
    const i = html.toLowerCase().indexOf(OPEN.toLowerCase(), pos);
    if (i === -1) break;
    const srcStart = i + OPEN.length;
    const srcEnd = html.indexOf('"', srcStart);
    if (srcEnd === -1) break;
    const closeBracket = html.indexOf('>', srcEnd);
    if (closeBracket === -1) break;
    const closeIdx = html.toLowerCase().indexOf(CLOSE_TAG.toLowerCase(), closeBracket + 1);
    if (closeIdx === -1) break;
    const tagEnd = closeIdx + CLOSE_TAG.length;
    const src = html.slice(srcStart, srcEnd);
    const fullTag = html.slice(i, tagEnd);
    const filePath = path.join(__dirname, src);
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: referenced script not found: ${filePath} — leaving tag as-is`);
      pos = tagEnd;
      continue;
    }
    const js = fs.readFileSync(filePath, 'utf8');
    console.log(`Inlined ${src} (${Math.round(js.length / 1024)} KB)`);
    html = html.slice(0, i) + '<script>' + js + CLOSE_TAG + html.slice(tagEnd);
    pos = i + '<script>'.length + js.length + CLOSE_TAG.length;
  }
}

// Find all <script>...</script> blocks using string search.
const scriptBlocks = [];
{
  const lower = html.toLowerCase();
  let pos = 0;
  while (true) {
    const tagStart = lower.indexOf('<script', pos);
    if (tagStart === -1) break;
    const gtPos = lower.indexOf('>', tagStart);
    if (gtPos === -1) break;
    const contentStart = gtPos + 1;
    const closeIdx = lower.indexOf('</script>', contentStart);
    if (closeIdx === -1) break;
    const fullEnd = closeIdx + '</script>'.length;
    scriptBlocks.push({
      full: html.slice(tagStart, fullEnd),
      body: html.slice(contentStart, closeIdx),
    });
    pos = fullEnd;
  }
}
if (!scriptBlocks.length) { console.error('No <script> blocks found'); process.exit(1); }

let largest = scriptBlocks[0];
for (const m of scriptBlocks) {
  if (m.body.length > largest.body.length) largest = m;
}

console.log(`Found ${scriptBlocks.length} <script> blocks, obfuscating the largest (${largest.body.length} chars)...`);

const result = JavaScriptObfuscator.obfuscate(largest.body, {
  compact:                    true,
  controlFlowFlattening:      false,
  deadCodeInjection:          false,
  debugProtection:            false,
  disableConsoleOutput:       false,
  identifierNamesGenerator:   'hexadecimal',
  log:                        false,
  numbersToExpressions:       true,
  renameGlobals:              false,
  selfDefending:              false,
  simplify:                   true,
  splitStrings:               false,
  stringArray:                true,
  stringArrayCallsTransform:  true,
  stringArrayEncoding:        ['base64'],
  stringArrayIndexShift:      true,
  stringArrayRotate:          true,
  stringArrayShuffle:         true,
  stringArrayThreshold:       0.75,
  unicodeEscapeSequence:      false,
});

const obfuscated = html.replace(
  largest.full,
  `<script>${result.getObfuscatedCode()}</script>`
);

fs.writeFileSync(outPath, obfuscated, 'utf8');

const srcKB = Math.round(fs.statSync(srcPath).size / 1024);
const outKB = Math.round(fs.statSync(outPath).size / 1024);
console.log(`Built: ${outPath} (${srcKB} KB → ${outKB} KB)`);
