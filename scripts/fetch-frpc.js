#!/usr/bin/env node
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const {spawnSync} = require('child_process');
const axios = require('axios');
const tar = require('tar');
const unzipper = require('unzipper');

const REPO = process.env.FRP_REPO || 'fatedier/frp';
const FORCE_VERSION = (process.env.FRP_VERSION || '').replace(/^v/, '');
const DEST_DIR = path.resolve(__dirname, '..', 'bin', 'native');
const UA = 'frp-cli-install';
const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const SKIP = process.env.FRPC_SKIP_POSTINSTALL === '1';
const USE_CURL = process.env.FRPC_USE_CURL === '1';

if (SKIP) {
    console.log('frp-cli: skip postinstall');
    process.exit(0);
}

const osMap = {linux: 'linux', darwin: 'darwin', win32: 'windows'};
const archMap = {x64: 'amd64', arm64: 'arm64', arm: 'arm'};
const extMap = {win32: 'zip', linux: 'tar.gz', darwin: 'tar.gz'};

function hasCurl() {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    return spawnSync(cmd, ['curl'], {stdio: 'ignore'}).status === 0;
}

function downloadViaCurl(url, outPath) {
    const args = ['-L', url, '-o', outPath, '--fail', '--show-error', '--connect-timeout', '20', '--max-time', '900'];
    const r = spawnSync('curl', args, {stdio: 'inherit'});
    if (r.status !== 0) throw new Error('curl failed');
}

const ax = axios.create({
    headers: {
        'User-Agent': UA,
        ...(GH_TOKEN ? {Authorization: `Bearer ${GH_TOKEN}`} : {})
    },
    maxRedirects: 10,
    timeout: 30_000,
    validateStatus: s => s >= 200 && s < 400
});

async function getReleaseMeta() {
    try {
        if (FORCE_VERSION) {
            const {data} = await ax.get(`https://api.github.com/repos/${REPO}/releases/tags/v${FORCE_VERSION}`);
            return data;
        }
        const {data} = await ax.get(`https://api.github.com/repos/${REPO}/releases/latest`);
        return data;
    } catch (e) {
        if (!FORCE_VERSION) {
            const {data: tags} = await ax.get(`https://api.github.com/repos/${REPO}/tags?per_page=1`);
            const v = (tags?.[0]?.name || '').replace(/^v/, '');
            if (!v) throw e;
            const {data} = await ax.get(`https://api.github.com/repos/${REPO}/releases/tags/v${v}`);
            return data;
        }
        throw e;
    }
}

async function downloadTo(url, outPath) {
    if (USE_CURL) return downloadViaCurl(url, outPath);
    try {
        const res = await ax.get(url, {responseType: 'stream'});
        await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(outPath);
            res.data.pipe(file);
            res.data.on('error', reject);
            file.on('finish', () => file.close(resolve));
            file.on('error', reject);
        });
    } catch (e) {
        if (hasCurl()) {
            console.warn('frp-cli: axios download failed, fallback to curl …');
            downloadViaCurl(url, outPath);
        } else {
            throw e;
        }
    }
}

async function extract(archivePath, ext, outDir) {
    await fsp.mkdir(outDir, {recursive: true});
    if (ext === 'tar.gz') {
        await tar.x({file: archivePath, cwd: outDir});
    } else {
        await fs.createReadStream(archivePath).pipe(unzipper.Extract({path: outDir})).promise();
    }
}

(async () => {
    const plat = process.platform;
    const nodeArch = process.arch;
    const frpOS = osMap[plat];
    const frpArch = archMap[nodeArch];
    const ext = extMap[plat];
    if (!frpOS || !frpArch || !ext) throw new Error(`unsupported target: ${plat}-${nodeArch}`);

    const rel = await getReleaseMeta();
    const ver = String((rel.tag_name || '').replace(/^v/, ''));
    if (!ver) throw new Error('cannot resolve frp version');

    const assetName = `frp_${ver}_${frpOS}_${frpArch}.${ext}`;
    const asset = (rel.assets || []).find(a => a.name === assetName);
    const dlUrl = asset?.browser_download_url || `https://github.com/${REPO}/releases/download/v${ver}/${assetName}`;

    // CLEAN DEST_DIR BEFORE DOWNLOAD
    try {
        if (fs.existsSync(DEST_DIR)) {
            for (const f of fs.readdirSync(DEST_DIR)) {
                try {
                    fs.unlinkSync(path.join(DEST_DIR, f));
                } catch {
                }
            }
        } else {
            fs.mkdirSync(DEST_DIR, {recursive: true});
        }
    } catch (e) {
        console.warn('frp-cli: failed to clean native dir:', e.message);
    }


    await fsp.mkdir(DEST_DIR, {recursive: true});
    const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'frp-'));
    const archive = path.join(tmp, assetName);

    console.log(`frp-cli: downloading ${assetName}`);
    await downloadTo(dlUrl, archive);

    const unpack = path.join(tmp, 'unpack');
    await extract(archive, ext, unpack);

    let inner = null;
    for (const n of fs.readdirSync(unpack)) {
        const p = path.join(unpack, n);
        if (fs.statSync(p).isDirectory()) {
            inner = p;
            break;
        }
    }
    if (!inner) throw new Error('inner dir not found in archive');

    const isWin = plat === 'win32';
    const src = path.join(inner, `frpc${isWin ? '.exe' : ''}`);
    const out = path.join(DEST_DIR, `frpc-${plat}-${nodeArch}${isWin ? '.exe' : ''}`);
    fs.copyFileSync(src, out);
    if (!isWin) {
        try {
            fs.chmodSync(out, 0o755);
        } catch {
        }
    }

    console.log(`frp-cli: installed ${path.relative(process.cwd(), out)}`);
})().catch(err => {
    console.error('frp-cli postinstall failed:');
    console.error(err && err.stack ? err.stack : String(err));
    console.error('Hints: set GITHUB_TOKEN; FRP_VERSION=...; FRPC_SKIP_POSTINSTALL=1; FRPC_USE_CURL=1');
    process.exit(1);
});
