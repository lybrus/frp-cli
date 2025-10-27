#!/usr/bin/env node
const { spawn } = require('child_process');
const { join } = require('path');

const script = join(__dirname, '..', 'scripts', 'fetch-frpc.js');

// Поддержка простых флагов:
//   --version 0.65.0   → FRP_VERSION=0.65.0
//   --use-curl         → FRPC_USE_CURL=1
//   --repo owner/repo  → FRP_REPO=owner/repo
const args = process.argv.slice(2);
const env = { ...process.env };

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--version' && args[i + 1]) { env.FRP_VERSION = String(args[++i]).replace(/^v/, ''); continue; }
  if (a === '--use-curl') { env.FRPC_USE_CURL = '1'; continue; }
  if (a === '--repo' && args[i + 1]) { env.FRP_REPO = String(args[++i]); continue; }
}

console.log('frpc-update: downloading binary...');
const child = spawn(process.execPath, [script], {
  stdio: 'inherit',
  env
});

child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (err) => { console.error(err.message); process.exit(1); });
``
