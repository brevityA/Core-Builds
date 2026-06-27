#!/usr/bin/env node
// Build script: obfuscates configurator/index.src.html → configurator/index.html
// Run: node configurator/build.js

const fs   = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const srcPath = path.join(__dirname, 'index.src.html');
const outPath = path.join(__dirname, 'index.html');

const html  = fs.readFileSync(srcPath, 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) { console.error('No <script> block found'); process.exit(1); }

const rawScript = match[1];

const result = JavaScriptObfuscator.obfuscate(rawScript, {
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
  /<script>([\s\S]*?)<\/script>/,
  `<script>${result.getObfuscatedCode()}</script>`
);

fs.writeFileSync(outPath, obfuscated, 'utf8');
console.log(`Built: ${outPath} (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
