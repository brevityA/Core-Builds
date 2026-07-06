#!/usr/bin/env node
// Build script: obfuscates configurator/index.src.html → configurator/index.html
// Targets only the main application <script> block (the largest one).
// Leaves the theme initializer and third-party QR library untouched.
// Run: node configurator/build.js

const fs   = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const srcPath = path.join(__dirname, 'index.src.html');
const outPath = path.join(__dirname, 'index.html');

const html = fs.readFileSync(srcPath, 'utf8');

const scriptBlocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\b[^>]*>/gi)];
if (!scriptBlocks.length) { console.error('No <script> blocks found'); process.exit(1); }

let largest = scriptBlocks[0];
for (const m of scriptBlocks) {
  if (m[1].length > largest[1].length) largest = m;
}

console.log(`Found ${scriptBlocks.length} <script> blocks, obfuscating the largest (${largest[1].length} chars)...`);

const result = JavaScriptObfuscator.obfuscate(largest[1], {
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
  largest[0],
  `<script>${result.getObfuscatedCode()}</script>`
);

fs.writeFileSync(outPath, obfuscated, 'utf8');

const srcKB = Math.round(fs.statSync(srcPath).size / 1024);
const outKB = Math.round(fs.statSync(outPath).size / 1024);
console.log(`Built: ${outPath} (${srcKB} KB → ${outKB} KB)`);
