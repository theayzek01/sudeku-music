const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const https = require('https');
const http = require('http');

// ─── Custom Guild Emojis ──────────────────────────────────────────────────────
const E = {
  note:      { id: '1445409966197313656', animated: true,  name: 'kansernote'      },
  flame:     { id: '1443393134296825948', animated: true,  name: 'kanserflamecpurp' },
  star:      { id: '1443397111290007713', animated: true,  name: 'kanserstar'       },
  crown:     { id: '1443393509330649120', animated: true,  name: 'kansericecrown'   },
  stars:     { id: '1443393674623848488', animated: true,  name: 'kanserystars'     },
};

// Discord emoji string helper
function guildEmoji(e) {
  return e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`;
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
async function generateNowPlayingCard(track, requesterName) {
  const W = 900, H = 300;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── 1. Background: near-black ─────────────────────────────────────────────
  ctx.fillStyle = '#0a0a0f';
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
    ctx.globalAlpha = 0.18;
    ctx.filter = 'blur(32px)';
    ctx.drawImage(thumb, -60, -60, W + 120, H + 120);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── 4. Dark vignette overlay ──────────────────────────────────────────────
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Left accent glow (violet)
  const leftGlow = ctx.createRadialGradient(0, H / 2, 0, 0, H / 2, 320);
  leftGlow.addColorStop(0, 'rgba(109,40,217,0.28)');
  leftGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, W, H);

  // ── 5. Thumbnail box ──────────────────────────────────────────────────────
  const TX = 36, TY = 36, TS = H - 72, TR = 18;
  ctx.save();
  roundRect(ctx, TX, TY, TS, TS, TR);
  ctx.clip();

  if (thumb) {
    // Draw thumbnail cropped as square
    const aspect = thumb.width / thumb.height;
    let sx = 0, sy = 0, sw = thumb.width, sh = thumb.height;
    if (aspect > 1) { sx = (thumb.width - thumb.height) / 2; sw = thumb.height; }
    else            { sy = (thumb.height - thumb.width) / 2; sh = thumb.width; }
    ctx.drawImage(thumb, sx, sy, sw, sh, TX, TY, TS, TS);
  } else {
    // Fallback gradient
    const fg = ctx.createLinearGradient(TX, TY, TX + TS, TY + TS);
    fg.addColorStop(0, '#4c1d95');
    fg.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = fg;
    ctx.fillRect(TX, TY, TS, TS);
    // music note symbol
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = `bold ${Math.floor(TS * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', TX + TS / 2, TY + TS / 2);
  }
  ctx.restore();

  // Thumbnail border
  ctx.save();
  roundRect(ctx, TX, TY, TS, TS, TR);
  ctx.strokeStyle = 'rgba(139,92,246,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // ── 6. Text area ──────────────────────────────────────────────────────────
  const textX = TX + TS + 36;
  const maxTW  = W - textX - 36;

  // Source badge
  const isSpotify = track.source === 'spotify';
  const badgeColor  = isSpotify ? '#1db954' : '#ff4444';
  const badgeBg     = isSpotify ? 'rgba(29,185,84,0.14)' : 'rgba(255,68,68,0.14)';
  const badgeBorder = isSpotify ? 'rgba(29,185,84,0.45)' : 'rgba(255,68,68,0.45)';
  const badgeLabel  = isSpotify ? 'SPOTIFY' : 'YOUTUBE';

  ctx.font = 'bold 11px sans-serif';
  const badgeW = ctx.measureText(badgeLabel).width + 20;
  roundRect(ctx, textX, 38, badgeW, 20, 5);
  ctx.fillStyle = badgeBg;
  ctx.fill();
  ctx.strokeStyle = badgeBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = badgeColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeLabel, textX + 10, 48);

  // Title
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#f4f4f5';
  ctx.textBaseline = 'top';
  const title = ellipsis(ctx, track.title || 'Unknown Track', maxTW);
  ctx.fillText(title, textX, 70);

  // Artist / uploader
  if (track.artist || track.uploader) {
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#a1a1aa';
    const artist = ellipsis(ctx, track.artist || track.uploader || '', maxTW);
    ctx.fillText(artist, textX, 105);
  }

  // Requester
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#71717a';
  ctx.fillText('İsteyen:', textX, 135);
  ctx.fillStyle = '#c4b5fd';
  ctx.font = 'bold 13px sans-serif';
  const reqLabel = ctx.measureText('İsteyen: ').width;
  ctx.fillText(requesterName, textX + reqLabel + 2, 135);

  // ── 7. Waveform bars (decorative) ────────────────────────────────────────
  const waveX = textX;
  const waveY = 168;
  const barCount = 40;
  const barW = 4;
  const barGap = 3;
  const maxBarH = 28;
  const seed = (track.title || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  for (let i = 0; i < barCount; i++) {
    const pseudo = Math.abs(Math.sin((seed + i * 37) * 0.3)) * 0.7 + 0.15;
    const bh = Math.max(4, pseudo * maxBarH);
    const bx = waveX + i * (barW + barGap);
    const by = waveY + (maxBarH - bh) / 2;

    if (bx + barW > W - 36) break;

    // Color: first ~20% glowing violet, rest muted
    const active = i < Math.floor(barCount * 0.22);
    const barGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
    if (active) {
      barGrad.addColorStop(0, '#a78bfa');
      barGrad.addColorStop(1, '#6d28d9');
    } else {
      barGrad.addColorStop(0, 'rgba(113,113,122,0.5)');
      barGrad.addColorStop(1, 'rgba(63,63,70,0.3)');
    }
    roundRect(ctx, bx, by, barW, bh, 2);
    ctx.fillStyle = barGrad;
    ctx.fill();
  }

  // ── 8. Progress bar ───────────────────────────────────────────────────────
  const pbX = textX, pbY = 215, pbW = maxTW, pbH = 5;
  roundRect(ctx, pbX, pbY, pbW, pbH, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();

  // Filled portion (~18% as static placeholder)
  const filled = pbW * 0.18;
  roundRect(ctx, pbX, pbY, filled, pbH, 3);
  const pg = ctx.createLinearGradient(pbX, 0, pbX + filled, 0);
  pg.addColorStop(0, '#7c3aed');
  pg.addColorStop(1, '#a78bfa');
  ctx.fillStyle = pg;
  ctx.fill();

  // Scrubber dot
  ctx.beginPath();
  ctx.arc(pbX + filled, pbY + pbH / 2, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#c4b5fd';
  ctx.fill();

  // Time labels
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#52525b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('0:00', pbX, pbY + 12);
  ctx.textAlign = 'right';
  ctx.fillText(track.duration || '0:00', pbX + pbW, pbY + 12);

  // ── 9. Watermark ──────────────────────────────────────────────────────────
  ctx.font = 'italic 11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Sudeku Music', W - 20, H - 14);

  // ── 10. Left edge accent bar ──────────────────────────────────────────────
  const accentGrad = ctx.createLinearGradient(0, TY, 0, TY + TS);
  accentGrad.addColorStop(0, '#7c3aed');
  accentGrad.addColorStop(0.5, '#a78bfa');
  accentGrad.addColorStop(1, '#6d28d9');
  ctx.fillStyle = accentGrad;
  roundRect(ctx, 18, TY, 4, TS, 2);
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
    ctx.font = 'bold 80px sans-serif';
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
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('LEVEL', LX, LY - 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(String(level), LX, LY + 12);
  ctx.restore();

  // Username
  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#f4f4f5';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const cleanName = ellipsis(ctx, username || 'Unknown', maxTW - 120);
  ctx.fillText(cleanName, textX, 40);

  // Rank Info
  ctx.font = 'bold 15px sans-serif';
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
  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = '#71717a';
  ctx.fillText('SES SÜRESİ', P1X + 15, PY + 15);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#f4f4f5';
  ctx.fillText(formatDurationText(voiceTime), P1X + 15, PY + 38);

  // Panel 2: Şarkı Sayısı (Tracks Played)
  const P2X = textX + PW + 20;
  roundRect(ctx, P2X, PY, PW, PH, PR);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fill();
  ctx.stroke();

  // Panel 2 Content
  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = '#71717a';
  ctx.fillText('DİNLENEN ŞARKI', P2X + 15, PY + 15);
  ctx.font = 'bold 18px sans-serif';
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
  ctx.font = '12px sans-serif';
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
  ctx.font = 'italic 11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Sudeku Music', W - 40, H - 20);

  return canvas.toBuffer('image/png');
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = { generateNowPlayingCard, generateRankCard, guildEmoji, E };
