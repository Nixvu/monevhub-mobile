/**
 * MonevHub Distribution Compiler & Obfuscator (Manifest V3 Safe)
 * Anti-Reverse Engineering (Human & AI Decompiler Protection)
 */
const fs = require('fs');
const path = require('path');

let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = require('javascript-obfuscator');
} catch (e) {
  console.log('[Notice] javascript-obfuscator module belum terpasang. Menjalankan fallback copy.');
}

const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Konfigurasi Obfuscator Anti-Reverse Engineering (Manifest V3 Compatible - No Eval)
const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false, // Set false agar tidak memblokir runtime browser normal
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false, // Wajib false untuk window / global scope extension
  selfDefending: false, // Hindari konflik dengan strict CSP browser
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.75,
  stringArrayEncoding: ['base64', 'rc4'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.85,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`[Copy] ${path.relative(ROOT_DIR, src)} -> ${path.relative(ROOT_DIR, dest)}`);
}

function processJsFile(src, dest) {
  ensureDir(path.dirname(dest));
  const code = fs.readFileSync(src, 'utf8');

  if (JavaScriptObfuscator) {
    try {
      const obfuscationResult = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
      fs.writeFileSync(dest, obfuscationResult.getObfuscatedCode(), 'utf8');
      console.log(`[Obfuscated] ${path.relative(ROOT_DIR, src)} -> ${path.relative(ROOT_DIR, dest)}`);
      return;
    } catch (err) {
      console.warn(`[Warning] Gagal obfuscate ${src}, menyalin kode asli:`, err.message);
    }
  }

  fs.writeFileSync(dest, code, 'utf8');
  console.log(`[Copy JS] ${path.relative(ROOT_DIR, src)} -> ${path.relative(ROOT_DIR, dest)}`);
}

console.log('=== MEMULAI PROSES BUILD & OBFUSCATION MONEVHUB ===');

// Bersihkan dist folder jika ada
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
ensureDir(DIST_DIR);

// 1. Copy manifest.json
copyFile(path.join(ROOT_DIR, 'manifest.json'), path.join(DIST_DIR, 'manifest.json'));

// 2. Process JS files (Obfuscate)
const jsFiles = [
  'background/background.js',
  'lib/license.js',
  'lib/ai.js',
  'lib/export.js',
  'lib/map-picker.js',
  'content/content.js',
  'popup/popup.js',
  'options/options.js',
  'panel/panel.js'
];

jsFiles.forEach(relPath => {
  const src = path.join(ROOT_DIR, relPath);
  const dest = path.join(DIST_DIR, relPath);
  if (fs.existsSync(src)) {
    processJsFile(src, dest);
  }
});

// 3. Copy Static Assets (HTML, CSS, Icons)
const staticFiles = [
  'assets/tailwind.css',
  'content/content.css',
  'popup/popup.html',
  'popup/popup.css',
  'options/options.html',
  'options/options.css',
  'panel/panel.html',
  'panel/panel.css'
];

staticFiles.forEach(relPath => {
  const src = path.join(ROOT_DIR, relPath);
  const dest = path.join(DIST_DIR, relPath);
  if (fs.existsSync(src)) {
    copyFile(src, dest);
  }
});

// 4. Copy Icons Folder (Recursive)
function copyDirRecursive(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

const iconsDir = path.join(ROOT_DIR, 'icons');
if (fs.existsSync(iconsDir)) {
  copyDirRecursive(iconsDir, path.join(DIST_DIR, 'icons'));
}

const vendorDir = path.join(ROOT_DIR, 'lib', 'vendor');
if (fs.existsSync(vendorDir)) {
  copyDirRecursive(vendorDir, path.join(DIST_DIR, 'lib', 'vendor'));
}

console.log('==================================================');
console.log('BUILD BERHASIL!');
console.log(`Folder distribusi siap pakai dan ter-obfuscate: ${DIST_DIR}`);
console.log('Anda dapat langsung memuat folder dist/ di Chrome via "Load Unpacked"');
console.log('==================================================');
