const { execFile, execFileSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

const DEFAULT_YT_DLP_PATHS = [
  process.env.YT_DLP_PATH,
  process.env.YTDLP_PATH,
  'C:\\Users\\ozenc\\AppData\\Local\\Python\\pythoncore-3.14-64\\Scripts\\yt-dlp.exe'
].filter(Boolean);

const RUNTIME_DIR = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Sudeku-Music');
const BIN_DIR = path.join(RUNTIME_DIR, 'bin');
const YTDLP_EXE = path.join(BIN_DIR, 'yt-dlp.exe');

let ytDlpEnsurePromise = null;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function findOnPath(binaryName) {
  try {
    const output = execFileSync('where', [binaryName], { encoding: 'utf8' }).trim();
    const first = output.split(/\r?\n/).find(Boolean);
    return first || null;
  } catch {
    return null;
  }
}

function getYtDlpPath() {
  for (const candidate of DEFAULT_YT_DLP_PATHS) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  if (fs.existsSync(YTDLP_EXE)) {
    return YTDLP_EXE;
  }

  const pathBinary = findOnPath('yt-dlp.exe') || findOnPath('yt-dlp');
  if (pathBinary) {
    return pathBinary;
  }

  return YTDLP_EXE;
}

function getFfmpegPath() {
  try {
    const staticPath = require('ffmpeg-static');
    if (staticPath && fs.existsSync(staticPath)) {
      return staticPath;
    }
  } catch {
    // ignore package lookup failures
  }

  const envPath = process.env.FFMPEG_PATH || process.env.FFMPEG_BIN;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  return findOnPath('ffmpeg.exe') || findOnPath('ffmpeg') || null;
}

function downloadFile(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirects <= 0) {
          reject(new Error('Too many redirects while downloading yt-dlp'));
          return;
        }
        const nextUrl = new URL(res.headers.location, url).toString();
        resolve(downloadFile(nextUrl, dest, redirects - 1));
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        return;
      }

      ensureDir(path.dirname(dest));
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
      file.on('error', (err) => {
        try { fs.unlinkSync(dest); } catch {}
        reject(err);
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('Download timeout')));
  });
}

async function ensureYtDlp() {
  const existing = getYtDlpPath();
  if (fs.existsSync(existing)) {
    return existing;
  }

  if (!ytDlpEnsurePromise) {
    ytDlpEnsurePromise = (async () => {
      const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
      await downloadFile(url, YTDLP_EXE);
      return YTDLP_EXE;
    })().catch((err) => {
      ytDlpEnsurePromise = null;
      throw err;
    });
  }

  return ytDlpEnsurePromise;
}

function execYtDlp(args, timeoutMs = 60000) {
  const binary = getYtDlpPath();
  return new Promise((resolve, reject) => {
    const run = () => execFile(binary, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const detail = (stderr || err.message || '').trim();
        reject(new Error(detail || 'yt-dlp failed'));
        return;
      }
      resolve(stdout.trim());
    });

    if (fs.existsSync(binary)) {
      run();
      return;
    }

    ensureYtDlp().then(() => run()).catch(reject);
  });
}

async function getDirectAudioUrl(youtubeUrl) {
  const output = await execYtDlp(['-f', 'bestaudio', '-g', '--no-playlist', '--no-warnings', youtubeUrl]);
  const url = output.split('\n').find(Boolean);
  if (!url) {
    throw new Error('yt-dlp returned no stream URL');
  }
  return url;
}

async function searchYoutube(query, limit = 1) {
  const output = await execYtDlp([
    '--flat-playlist',
    '--dump-single-json',
    '--no-warnings',
    `ytsearch${limit}:${query}`
  ]);
  const data = JSON.parse(output);
  return (data.entries || []).filter(entry => entry && entry.id && entry.title);
}

async function getVideoInfo(youtubeUrl) {
  const output = await execYtDlp(['--dump-single-json', '--no-playlist', '--no-warnings', youtubeUrl]);
  return JSON.parse(output);
}

function spawnAudioStream(youtubeUrl) {
  const binary = getYtDlpPath();
  const child = spawn(binary, [
    '-f', 'bestaudio',
    '--no-playlist',
    '--buffer-size', '16K',
    '-o', '-',
    youtubeUrl
  ], { stdio: ['ignore', 'pipe', 'ignore'] });

  child.stdout.childProcess = child;
  return child.stdout;
}

module.exports = {
  getYtDlpPath,
  ensureYtDlp,
  getFfmpegPath,
  execYtDlp,
  getDirectAudioUrl,
  searchYoutube,
  getVideoInfo,
  spawnAudioStream
};
