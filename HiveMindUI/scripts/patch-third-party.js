#!/usr/bin/env node
/**
 * Runtime compatibility patches for third-party packages.
 * Keep these patches idempotent and safe to re-run.
 */

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

function patchUnicornMagic() {
  const pkgPath = path.join(rootDir, 'node_modules', 'unicorn-magic', 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return;
  }

  const raw = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);
  if (!pkg.exports || typeof pkg.exports !== 'object') {
    return;
  }

  const nodeExport = pkg.exports.node;
  const defaultExport = pkg.exports.default;
  if (!nodeExport || typeof nodeExport !== 'object' || !defaultExport || typeof defaultExport !== 'object') {
    return;
  }

  let changed = false;
  if (!nodeExport.require) {
    nodeExport.require = './node.js';
    changed = true;
  }
  if (!nodeExport.default) {
    nodeExport.default = './node.js';
    changed = true;
  }
  if (!defaultExport.require) {
    defaultExport.require = './default.js';
    changed = true;
  }
  if (!defaultExport.default) {
    defaultExport.default = './default.js';
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, '\t')}\n`, 'utf8');
    console.log('[patch:deps] Patched unicorn-magic exports');
  }
}

function patchAionCliCore() {
  const filePath = path.join(rootDir, 'node_modules', '@office-ai', 'aioncli-core', 'dist', 'src', 'services', 'shellExecutionService.js');
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const target = "import pkg from '@xterm/headless';";
  const replacement = "import * as pkg from '@xterm/headless';";
  if (!raw.includes(target)) {
    return;
  }

  fs.writeFileSync(filePath, raw.replace(target, replacement), 'utf8');
  console.log('[patch:deps] Patched @office-ai/aioncli-core xterm headless import');
}

function main() {
  patchUnicornMagic();
  patchAionCliCore();
}

main();
