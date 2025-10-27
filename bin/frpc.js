#!/usr/bin/env node
const { spawn } = require('child_process');
const { join } = require('path');
const { existsSync, chmodSync } = require('fs');

const platform = process.env.FRPC_FORCE_PLATFORM || process.platform;
const arch = process.env.FRPC_FORCE_ARCH || process.arch;
const mapArch = { x64: 'x64', arm64: 'arm64', arm: 'arm' };
const fileArch = mapArch[arch];

if (!fileArch) {
  console.error(`frpc: unsupported arch: ${arch}`);
  process.exit(1);
}

const isWin = platform === 'win32';
const binaryName = `frpc-${platform}-${fileArch}${isWin ? '.exe' : ''}`;
const binaryPath = join(__dirname, 'native', binaryName);

if (!existsSync(binaryPath)) {
  console.error(`frpc binary not found: ${binaryPath}`);
  console.error(`Run: frpc-update`);
  process.exit(1);
}

if (!isWin) {
  try { chmodSync(binaryPath, 0o755); } catch {}
}

const args = process.argv.slice(2);

const hasServerArg =
  args.includes('-s') ||
  args.includes('--server') ||
  args.some(a => a.startsWith('--server='));

const server = process.env.FRP_SERVER;

if (server && !hasServerArg) {
  args.push('-s', server);
}

const hasTokenArg =
  args.includes('-t') ||
  args.includes('--token') ||
  args.some(a => a.startsWith('--token='));

const token = process.env.FRP_TOKEN;

if (token && !hasTokenArg) {
  args.push('-t', token);
}

const child = spawn(binaryPath, args, {
  stdio: 'inherit',
  windowsHide: false
});

['SIGINT','SIGTERM','SIGHUP'].forEach(sig => {
  try { process.on(sig, () => child.kill(sig)); } catch {}
});

child.on('exit', (code, signal) => {
  if (signal) try { process.kill(process.pid, signal); } catch {}
  process.exit(code ?? 1);
});

child.on('error', (err) => {
  console.error(`frpc failed to start: ${err.message}`);
  process.exit(1);
});
