const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const https = require('https');
const http = require('http');

// ─── Custom Guild Emojis ──────────────────────────────────────────────────────
const E = {
  note: { id: '1445409966197313656', animated: true,  name: 'kansernote' },
  flame: { id: '1443393134296825948', animated: true,  name: 'kanserflamecpurp' },
  star: { id: '1443397111290007713', animated: true,  name: 'kanserstar' },
  crown: { id: '1443393509330649120', animated: true,  name: 'kansericecrown' },
  stars: { id: '1443393674623848488', animated: true,  name: 'kanserystars' },
};

// Discord emoji string helper
function guildEmoji(e) {
  return e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`;
}

// ─── Unicode / special text sanitization for canvas ──────────────────────────
function sanitizeText(text) {
  if (!text) return '';
  // Remove emojis, symbols, and problematic non-latin decorations that cause square/empty box rendering
  let cleaned = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F004}-\u{1F0CF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}\u{1F308}]/gu, '');
  cleaned = cleaned.trim();
  if (!cleaned) {
    return 'Özel Parça';
  }
  return cleaned;
}

function durationToMs(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return 0;
}

function formatMs(ms) {
  if (isNaN(ms) || ms < 0) return '0:00';
  const totalSecs = Math.floor(ms / 1000);
  const secs = totalSecs % 60;
  const mins = Math.floor(totalSecs / 60) % 60;
  const hrs = Math.floor(totalSecs / 3600);
  const pad = (n) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${mins}:${pad(secs)}`;
}

// ─── Image fetch helper ───────────────────────────────────────────────────────
function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 6000 }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

// ─── Rounded rectangle helper ────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Text ellipsis helper ─────────────────────────────────────────────────────
function ellipsis(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  while (text.length > 1 && ctx.measureText(text + '…').width > maxW) {
    text = text.slice(0, -1);
  }
  return text + '…';
}

// ─── Main card generator ──────────────────────────────────────────────────────
async function generateNowPlayingCard(track, requesterName, currentMs = 0) {
  const W = 900, H = 300;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Sanitize track properties
  const safeTitle = sanitizeText(track.title || 'Bilinmeyen Şarkı');
  const safeArtist = sanitizeText(track.artist || track.uploader || 'Bilinmeyen Sanatçı');
  const safeRequester = sanitizeText(requesterName || 'Bilinmeyen Kullanıcı');

  // Font setup with fallback
  const fontTitle = 'bold 26px "Montserrat", "Segoe UI", "Arial", "Microsoft YaHei", "Noto Sans", sans-serif';
  const fontSub = '15px "Montserrat", "Segoe UI", "Arial", "Microsoft YaHei", sans-serif';
  const fontReq = '13px "Montserrat", "Segoe UI", "Arial", "Microsoft YaHei", sans-serif';
  const fontBadge = 'bold 11px "Montserrat", "Segoe UI", "Arial", sans-serif';
  const fontTimer = '12px "Montserrat", "Segoe UI", "Arial", sans-serif';

  // ── 1. Background: dark aesthetic ──────────────────────────────────────────
  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, W, H);

  // ── 2. Try loading thumbnail ──────────────────────────────────────────────
  let thumb = null;
  if (track.thumbnail) {
    try {
      const buf = await fetchBuffer(track.thumbnail);
      thumb = await loadImage(buf);
    } catch (_) {}
  }

  // ── 3. Blurred backdrop from thumbnail ───────────────────────────────────
  if (thumb) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.filter = 'blur(28px)';
    ctx.drawImage(thumb, -50, -50, W + 100, H + 100);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── 4. Neon vignette and overlays ─────────────────────────────────────────
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, W * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Dynamic Neon ambient glow (violet/purple)
  const leftGlow = ctx.createRadialGradient(80, H / 2, 0, 80, H / 2, 360);
  leftGlow.addColorStop(0, 'rgba(124,58,237,0.35)');
  leftGlow.addColorStop(0.5, 'rgba(109,40,217,0.12)');
  leftGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, W, H);

  // Decorative border/frame lines (sleek glowing accent)
  ctx.strokeStyle = 'rgba(139,92,246,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, W - 16, H - 16);

  // ── 5. Thumbnail box ──────────────────────────────────────────────────────
  const TX = 36, TY = 36, TS = H - 72, TR = 20;
  ctx.save();
  roundRect(ctx, TX, TY, TS, TS, TR);
  ctx.clip();

  if (thumb) {
    const aspect = thumb.width / thumb.height;
    let sx = 0, sy = 0, sw = thumb.width, sh = thumb.height;
    if (aspect > 1) {
      sx = (thumb.width - thumb.height) / 2;
      sw = thumb.height;
    } else if (aspect < 1) {
      sy = (thumb.height - thumb.width) / 2;
      sh = thumb.width;
    }
    ctx.drawImage(thumb, sx, sy, sw, sh, TX, TY, TS, TS);
  } else {
    // Elegant fallback music icon gradient
    const grad = ctx.createLinearGradient(TX, TY, TX + TS, TY + TS);
    grad.addColorStop(0, '#4c1d95');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(TX, TY, TS, TS);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎵', TX + TS / 2, TY + TS / 2);
  }
  ctx.restore();

  // Glowing Thumbnail Border
  ctx.save();
  roundRect(ctx, TX, TY, TS, TS, TR);
  ctx.strokeStyle = 'rgba(139,92,246,0.6)';
  ctx.shadowColor = '#8b5cf6';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // ── 6. Text area ──────────────────────────────────────────────────────────
  const textX = TX + TS + 36;
  const maxTW  = W - textX - 36;

  // Source badge
  const isSpotify = track.source === 'spotify';
  const badgeColor  = isSpotify ? '#1db954' : '#ff3333';
  const badgeBg = isSpotify ? 'rgba(29,185,84,0.14)' : 'rgba(255,51,51,0.14)';
  const badgeBorder = isSpotify ? 'rgba(29,185,84,0.45)' : 'rgba(255,51,51,0.45)';
  const badgeLabel  = isSpotify ? 'SPOTIFY' : 'YOUTUBE';

  ctx.font = fontBadge;
  const badgeW = ctx.measureText(badgeLabel).width + 20;
  roundRect(ctx, textX, 38, badgeW, 20, 6);
  ctx.fillStyle = badgeBg;
  ctx.fill();
  ctx.strokeStyle = badgeBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = badgeColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeLabel, textX + 10, 48);

  // Title with fallback fonts
  ctx.font = fontTitle;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  const title = ellipsis(ctx, safeTitle, maxTW);
  ctx.fillText(title, textX, 70);

  // Artist / uploader
  ctx.font = fontSub;
  ctx.fillStyle = '#a1a1aa';
  const artist = ellipsis(ctx, safeArtist, maxTW);
  ctx.fillText(artist, textX, 107);

  // Requester
  ctx.font = fontReq;
  ctx.fillStyle = '#71717a';
  ctx.fillText('İsteyen:', textX, 137);
  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 13px "Montserrat", "Segoe UI", sans-serif';
  const reqLabel = ctx.measureText('İsteyen: ').width;
  ctx.fillText(safeRequester, textX + reqLabel + 2, 137);

  // ── 7. Decorative Waveform Bars ───────────────────────────────────────────
  const waveX = textX;
  const waveY = 168;
  const barCount = 42;
  const barW = 4;
  const barGap = 3;
  const maxBarH = 26;
  const seed = (safeTitle + 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  for (let i = 0; i < barCount; i++) {
    const pseudo = Math.abs(Math.sin((seed + i * 37) * 0.3)) * 0.75 + 0.15;
    const bh = Math.max(4, pseudo * maxBarH);
    const bx = waveX + i * (barW + barGap);
    const by = waveY + (maxBarH - bh) / 2;

    if (bx + barW > W - 36) break;

    // Color gradient for active/inactive bars
    const active = i < Math.floor(barCount * 0.3);
    const barGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
    if (active) {
      barGrad.addColorStop(0, '#c4b5fd');
      barGrad.addColorStop(1, '#7c3aed');
    } else {
      barGrad.addColorStop(0, 'rgba(113,113,122,0.4)');
      barGrad.addColorStop(1, 'rgba(63,63,70,0.2)');
    }
    roundRect(ctx, bx, by, barW, bh, 2);
    ctx.fillStyle = barGrad;
    ctx.fill();
  }

  // ── 8. Progress bar ───────────────────────────────────────────────────────
  const pbX = textX, pbY = 215, pbW = maxTW, pbH = 6;
  roundRect(ctx, pbX, pbY, pbW, pbH, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();

  // Calculate ratio dynamically
  const totalMs = durationToMs(track.duration);
  const ratio = totalMs > 0 ? Math.min(1, currentMs / totalMs) : 0.0;

  // Filled portion
  const filled = pbW * ratio;
  if (filled > 0) {
    roundRect(ctx, pbX, pbY, filled, pbH, 3);
    const pg = ctx.createLinearGradient(pbX, 0, pbX + filled, 0);
    pg.addColorStop(0, '#6d28d9');
    pg.addColorStop(0.5, '#8b5cf6');
    pg.addColorStop(1, '#a78bfa');
    ctx.fillStyle = pg;
    ctx.fill();
  }

  // Scrubber dot
  ctx.beginPath();
  ctx.arc(pbX + Math.max(0, filled), pbY + pbH / 2, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Time labels
  ctx.font = fontTimer;
  ctx.fillStyle = '#71717a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(formatMs(currentMs), pbX, pbY + 12);
  ctx.textAlign = 'right';
  ctx.fillText(track.duration || '0:00', pbX + pbW, pbY + 12);

  // ── 9. Watermark ──────────────────────────────────────────────────────────
  ctx.font = 'italic 11px "Montserrat", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Sudeku Music', W - 24, H - 16);

  // ── 10. Left edge accent bar (violet/pink neon) ───────────────────────────
  const accentGrad = ctx.createLinearGradient(0, TY, 0, TY + TS);
  accentGrad.addColorStop(0, '#c084fc');
  accentGrad.addColorStop(0.5, '#8b5cf6');
  accentGrad.addColorStop(1, '#6366f1');
  ctx.fillStyle = accentGrad;
  roundRect(ctx, 16, TY, 5, TS, 2.5);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

// Format duration in ms to text (e.g. 2sa 15dk or 45dk or 12sn)
function formatDurationText(ms) {
  if (!ms || ms <= 0) return '0 dk';
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);

  if (hr > 0) {
    return `${hr} sa ${min % 60} dk`;
  }
  if (min > 0) {
    return `${min} dk`;
  }
  return `${sec} sn`;
}

// ─── Rank Card Generator ─────────────────────────────────────────────────────
async function generateRankCard(userData, rank, totalCount) {
  const W = 900, H = 280;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const { username, avatar, voiceTime, xp, level, tracksPlayed } = userData;

  // Font setup with fallback
  const fontMain = '"Montserrat", "Segoe UI", "Arial", "Microsoft YaHei", "Noto Sans", sans-serif';

  // 1. Background: dark SaaS canvas
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, W, H);

  // 2. Try loading avatar
  let avatarImg = null;
  if (avatar) {
    try {
      const buf = await fetchBuffer(avatar);
      avatarImg = await loadImage(buf);
    } catch (_) {}
  }

  // 3. Ambient glow from avatar (if available)
  if (avatarImg) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.filter = 'blur(40px)';
    ctx.drawImage(avatarImg, -50, -50, 300, 300);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Accent gradient on the right (violet/indigo ambient glow)
  const rightGlow = ctx.createRadialGradient(W - 100, H / 2, 0, W - 100, H / 2, 350);
  rightGlow.addColorStop(0, 'rgba(99,102,241,0.18)');
  rightGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rightGlow;
  ctx.fillRect(0, 0, W, H);

  // Decorative grid/lines (SaaS style)
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, H);
    ctx.stroke();
  }
  for (let j = 0; j < H; j += 60) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(W, j);
    ctx.stroke();
  }

  // 4. Draw Avatar with rounded rectangle clip
  const AX = 40, AY = 40, AS = 200, AR = 24;
  ctx.save();
  roundRect(ctx, AX, AY, AS, AS, AR);
  ctx.clip();

  if (avatarImg) {
    ctx.drawImage(avatarImg, AX, AY, AS, AS);
  } else {
    // Fallback: draw a colored circle with user initial
    ctx.fillStyle = '#6d28d9';
    ctx.fillRect(AX, AY, AS, AS);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 80px ${fontMain}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((username || '?').substring(0, 1).toUpperCase(), AX + AS / 2, AY + AS / 2);
  }
  ctx.restore();

  // Draw border around avatar
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 3;
  roundRect(ctx, AX, AY, AS, AS, AR);
  ctx.stroke();

  // 5. User metadata & labels
  const textX = AX + AS + 30;
  const maxTW = W - textX - 40;

  // Level Badge (Large Circle/Ring on the top-right)
  const LX = W - 100, LY = 80, LR = 45;
  ctx.save();
  ctx.beginPath();
  ctx.arc(LX, LY, LR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(109, 40, 217, 0.12)';
  ctx.fill();
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c4b5fd';
  ctx.font = `bold 12px ${fontMain}`;
  ctx.fillText('LEVEL', LX, LY - 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 32px ${fontMain}`;
  ctx.fillText(String(level), LX, LY + 12);
  ctx.restore();

  // Username
  ctx.font = `bold 32px ${fontMain}`;
  ctx.fillStyle = '#f4f4f5';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const cleanName = ellipsis(ctx, sanitizeText(username || 'Unknown'), maxTW - 120);
  ctx.fillText(cleanName, textX, 40);

  // Rank Info
  ctx.font = `bold 15px ${fontMain}`;
  ctx.fillStyle = '#a78bfa';
  const rankLabel = `Rank #${rank} / ${totalCount}`;
  ctx.fillText(rankLabel, textX, 80);

  // Statistics Panels
  // Panel 1: Ses Süresi (Voice Time)
  const P1X = textX;
  const PY = 110;
  const PW = 190;
  const PH = 70;
  const PR = 12;

  // Panel 1 background
  roundRect(ctx, P1X, PY, PW, PH, PR);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Panel 1 Content
  ctx.font = `bold 10px ${fontMain}`;
  ctx.fillStyle = '#71717a';
  ctx.fillText('SES SÜRESİ', P1X + 15, PY + 15);
  ctx.font = `bold 18px ${fontMain}`;
  ctx.fillStyle = '#f4f4f5';
  ctx.fillText(formatDurationText(voiceTime), P1X + 15, PY + 38);

  // Panel 2: Şarkı Sayısı (Tracks Played)
  const P2X = textX + PW + 20;
  roundRect(ctx, P2X, PY, PW, PH, PR);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fill();
  ctx.stroke();

  // Panel 2 Content
  ctx.font = `bold 10px ${fontMain}`;
  ctx.fillStyle = '#71717a';
  ctx.fillText('DİNLENEN ŞARKI', P2X + 15, PY + 15);
  ctx.font = `bold 18px ${fontMain}`;
  ctx.fillStyle = '#f4f4f5';
  ctx.fillText(`${tracksPlayed} adet`, P2X + 15, PY + 38);

  // 6. XP Progress Bar
  const pbX = textX;
  const pbY = 205;
  const pbW = W - textX - 40;
  const pbH = 14;
  const pbR = 7;

  // XP calculations
  const currentLevelXP = Math.pow(level, 2) * 100;
  const nextLevelXP = Math.pow(level + 1, 2) * 100;
  const neededXPInLevel = nextLevelXP - currentLevelXP;
  const xpInCurrentLevel = Math.max(0, xp - currentLevelXP);
  const ratio = Math.min(1, Math.max(0, xpInCurrentLevel / neededXPInLevel));

  // XP Text labels
  ctx.font = `12px ${fontMain}`;
  ctx.fillStyle = '#71717a';
  ctx.textAlign = 'left';
  ctx.fillText(`XP: ${xpInCurrentLevel} / ${neededXPInLevel}`, pbX, pbY - 18);
  ctx.textAlign = 'right';
  ctx.fillText(`Toplam: ${xp} XP`, pbX + pbW, pbY - 18);

  // Draw background bar
  roundRect(ctx, pbX, pbY, pbW, pbH, pbR);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();

  // Draw progress filled bar
  const filledW = pbW * ratio;
  if (filledW > 0) {
    roundRect(ctx, pbX, pbY, filledW, pbH, pbR);
    const pbGrad = ctx.createLinearGradient(pbX, 0, pbX + pbW, 0);
    pbGrad.addColorStop(0, '#7c3aed');
    pbGrad.addColorStop(0.5, '#a78bfa');
    pbGrad.addColorStop(1, '#6366f1');
    ctx.fillStyle = pbGrad;
    ctx.fill();
  }

  // 7. Watermark
  ctx.font = `italic 11px ${fontMain}`;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Sudeku Music', W - 40, H - 20);

  return canvas.toBuffer('image/png');
}

// ─── Stats Card Generator ────────────────────────────────────────────────────
async function generateStatsCard(statsData) {
  const W = 900, H = 400;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const {
    ping, uptime, guildsCount, usersCount, activeQueues,
    ramUsage, totalRam, cpuModel, nodeVersion, avatarUrl, username
  } = statsData;

  const fontMain = '"Montserrat", "Segoe UI", "Arial", "Microsoft YaHei", "Noto Sans", sans-serif';

  // Background
  ctx.fillStyle = '#060609';
  ctx.fillRect(0, 0, W, H);

  // Load avatar if available
  let botAvatar = null;
  if (avatarUrl) {
    try {
      const buf = await fetchBuffer(avatarUrl);
      botAvatar = await loadImage(buf);
    } catch (_) {}
  }

  // Glow behind avatar
  if (botAvatar) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.filter = 'blur(45px)';
    ctx.drawImage(botAvatar, 30, 30, 240, 240);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // SaaS Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, H);
    ctx.stroke();
  }
  for (let j = 0; j < H; j += 50) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(W, j);
    ctx.stroke();
  }

  // Draw bot profile info (left side)
  const AX = 40, AY = 40, AS = 120, AR = 18;
  ctx.save();
  roundRect(ctx, AX, AY, AS, AS, AR);
  ctx.clip();
  if (botAvatar) {
    ctx.drawImage(botAvatar, AX, AY, AS, AS);
  } else {
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(AX, AY, AS, AS);
  }
  ctx.restore();

  // Avatar border
  ctx.strokeStyle = 'rgba(139,92,246,0.3)';
  ctx.lineWidth = 2;
  roundRect(ctx, AX, AY, AS, AS, AR);
  ctx.stroke();

  // Bot Title / Name
  ctx.font = `bold 28px ${fontMain}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(username || 'Sudeku Bot', AX + AS + 24, AY + 10);

  ctx.font = `14px ${fontMain}`;
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('Sistem İstatistikleri & Sunucu Bilgileri', AX + AS + 24, AY + 48);

  // Status indicator
  const onlineX = AX + AS + 24;
  const onlineY = AY + 80;
  ctx.beginPath();
  ctx.arc(onlineX + 6, onlineY + 8, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.fill();
  ctx.fillStyle = '#a1a1aa';
  ctx.font = `bold 12px ${fontMain}`;
  ctx.fillText('ÇALIŞIYOR', onlineX + 20, onlineY + 1);

  // Draw 6 grids of stats
  const gridItems = [
    { label: 'PING (GECİKME)', val: `${ping} ms`, color: '#3b82f6' },
    { label: 'SUNUCU SAYISI', val: `${guildsCount} sunucu`, color: '#8b5cf6' },
    { label: 'KULLANICI', val: `${usersCount.toLocaleString()}`, color: '#ec4899' },
    { label: 'ÇALIŞMA SÜRESİ', val: uptime, color: '#f59e0b' },
    { label: 'RAM KULLANIMI', val: `${ramUsage}MB / ${Math.floor(totalRam)}GB`, color: '#06b6d4' },
    { label: 'AKTİF YAYIN', val: `${activeQueues} kanal`, color: '#10b981' }
  ];

  const startX = 40;
  const startY = 190;
  const itemW = 260;
  const itemH = 75;
  const gapX = 20;
  const gapY = 18;

  for (let i = 0; i < gridItems.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);

    const x = startX + col * (itemW + gapX);
    const y = startY + row * (itemH + gapY);

    // Box background
    roundRect(ctx, x, y, itemW, itemH, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Accent line on the left of each stats box
    ctx.fillStyle = gridItems[i].color;
    roundRect(ctx, x, y + 10, 4, itemH - 20, 2);
    ctx.fill();

    // Box texts
    ctx.font = `bold 10px ${fontMain}`;
    ctx.fillStyle = '#71717a';
    ctx.fillText(gridItems[i].label, x + 18, y + 16);

    ctx.font = `bold 16px ${fontMain}`;
    ctx.fillStyle = '#f4f4f5';
    ctx.fillText(gridItems[i].val, x + 18, y + 42);
  }

  // Footer/Hardware info
  ctx.font = `italic 12px ${fontMain}`;
  ctx.fillStyle = '#52525b';
  ctx.fillText(`İşlemci: ${cpuModel} | Node: ${nodeVersion}`, 40, H - 24);

  ctx.font = `italic 11px ${fontMain}`;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.textAlign = 'right';
  ctx.fillText('Sudeku Music', W - 40, H - 24);

  return canvas.toBuffer('image/png');
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = { generateNowPlayingCard, generateRankCard, generateStatsCard, guildEmoji, E, sanitizeText };