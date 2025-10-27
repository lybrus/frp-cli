#!/usr/bin/env node
/* frpc launcher that selects a bundled native binary by platform/arch */
const { spawn } = require('child_process');
const { join } = require('path');
const { existsSync, chmodSync } = require('fs');

const platform = process.env.FRPC_FORCE_PLATFORM || process.platform; // linux|darwin|win32
const arch     = process.env.FRPC_FORCE_ARCH     || process.arch;     // x64|arm64|arm

const nodeToFileArch = { x64: 'x64', arm64: 'arm64', arm: 'arm' };

const isWin = platform === 'win32';
const fileArch = nodeToFileArch[arch];
if (!fileArch) {
  console.error(`frpc: unsupported arch: ${arch}`);
  process.exit(1);
}

const binaryName = `frpc-${platform}-${fileArch}${isWin ? '.exe' : ''}`;
const binaryPath = join(__dirname, 'native', binaryName);

if (!existsSync(binaryPath)) {
  console.error(
    `frpc: binary not found: ${binaryName}\n` +
    `Expected at: ${binaryPath}\n` +
    `Supported names: frpc-{linux|darwin|win32}-{x64|arm64|arm}[.exe]\n` +
    `Current: ${platform}-${arch}`
  );
  process.exit(1);
}

if (!isWin) {
  try { chmodSync(binaryPath, 0o755); } catch {}
}

const args = process.argv.slice(2);
const child = spawn(binaryPath, args, {
  stdio: 'inherit',
  windowsHide: false
});

['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(sig => {
  try { process.on(sig, () => child.kill(sig)); } catch {}
});

child.on('exit', (code, signal) => {
  if (signal) try { process.kill(process.pid, signal); } catch {}
  process.exit(code ?? 1);
});

child.on('error', (err) => {
  console.error(`frpc: failed to start: ${err.message}`);
  process.exit(1);
});
