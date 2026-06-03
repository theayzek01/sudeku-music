require('../src/utils/envLoader').loadEnv();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { normalizeText } = require('../src/services/vectorMemory');
const { writeJsonAtomic } = require('../src/services/store');

const channelId = process.argv[2] || process.env.ANALYZE_CHANNEL_ID;
const maxArg = process.argv[3] || process.env.ANALYZE_MAX_MESSAGES || '5000';
const maxMessages = maxArg === 'all' ? Infinity : Math.max(1, Number(maxArg) || 5000);
const outDir = path.join(__dirname, '..', 'data', 'channel-analysis');

if (!process.env.TOKEN) throw new Error('TOKEN missing');
if (!channelId) throw new Error('Usage: node scripts/analyzeChannel.js <channelId> [maxMessages|all]');

function hashId(id) {
  return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 12);
}
function inc(obj, key, by = 1) {
  if (!key) return;
  obj[key] = (obj[key] || 0) + by;
}
function top(obj, n = 40) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));
}
function sentiment(text) {
  const clean = normalizeText(text);
  let score = 0;
  for (const w of ['iyi','güzel','komik','haha','ahaha','sev','ask','aşk','efsane','mükemmel','lol','xd']) if (clean.includes(w)) score += 1;
  for (const w of ['kötü','mal','salak','nefret','üzgün','yoruldum','sıkıcı','öl','intihar','kriz']) if (clean.includes(w)) score -= 1;
  return Math.max(-4, Math.min(4, score));
}
function emptyUser(id, name) {
  return { idHash: hashId(id), sampleName: name, messages: 0, repliesGiven: 0, repliesGot: 0, avgLen: 0, words: {}, emojis: {}, mentions: {}, hours: {}, sentiment: 0, examples: [] };
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel, Partials.Message],
});

client.once('ready', async () => {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased?.() || !channel.messages?.fetch) throw new Error('Channel is not text based or not fetchable');

    const users = {};
    const replyEdges = {};
    const global = { words: {}, emojis: {}, customEmojis: {}, reactions: {}, hours: {}, messageTypes: {}, lengths: [], sentimentTotal: 0 };
    const chronology = [];

    let before;
    let fetchedTotal = 0;
    while (fetchedTotal < maxMessages) {
      const batch = await channel.messages.fetch({ limit: Math.min(100, maxMessages - fetchedTotal), before }).catch(e => { throw new Error(`Fetch failed: ${e.message}`); });
      if (!batch.size) break;
      const sorted = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      for (const msg of sorted) {
        if (msg.author?.bot) continue;
        const text = String(msg.content || '').slice(0, 2000);
        const clean = normalizeText(text);
        const display = msg.member?.displayName || msg.author?.globalName || msg.author?.username || 'unknown';
        const uid = msg.author.id;
        if (!users[uid]) users[uid] = emptyUser(uid, display);
        const u = users[uid];
        u.messages += 1;
        u.avgLen = Math.round(((u.avgLen * (u.messages - 1)) + text.length) / u.messages);
        const s = sentiment(text);
        u.sentiment = Number(((u.sentiment * 0.94) + (s * 0.06)).toFixed(3));
        global.sentimentTotal += s;
        global.lengths.push(text.length);
        const hour = new Date(msg.createdTimestamp).getHours();
        inc(u.hours, String(hour)); inc(global.hours, String(hour));
        inc(global.messageTypes, msg.type || 'Default');

        for (const w of clean.split(' ').filter(w => w.length > 2).slice(0, 80)) { inc(u.words, w); inc(global.words, w); }
        for (const e of text.match(/[\u{1F300}-\u{1FAFF}]/gu) || []) { inc(u.emojis, e); inc(global.emojis, e); }
        for (const e of text.match(/<a?:\w{2,32}:\d{17,22}>/g) || []) { inc(u.emojis, e); inc(global.customEmojis, e); }
        for (const r of msg.reactions.cache.values()) inc(global.reactions, r.emoji.toString(), r.count || 1);

        if (msg.reference?.messageId) {
          const ref = await channel.messages.fetch(msg.reference.messageId).catch(() => null);
          if (ref?.author && !ref.author.bot) {
            const targetId = ref.author.id;
            if (!users[targetId]) users[targetId] = emptyUser(targetId, ref.member?.displayName || ref.author?.username || 'unknown');
            u.repliesGiven += 1; users[targetId].repliesGot += 1;
            inc(replyEdges, `${hashId(uid)}->${hashId(targetId)}`);
          }
        }

        if (u.examples.length < 8 && text.length >= 3 && text.length <= 180) u.examples.push(text);
        chronology.push({ t: msg.createdTimestamp, user: hashId(uid), len: text.length, reply: Boolean(msg.reference?.messageId), s });
      }
      fetchedTotal += batch.size;
      before = batch.last().id;
      process.stdout.write(`\rFetched ${fetchedTotal}${maxMessages === Infinity ? '' : '/' + maxMessages}`);
      if (batch.size < 100) break;
    }
    console.log('\nAnalyzing...');

    const userRows = Object.values(users).map(u => ({
      idHash: u.idHash,
      sampleName: u.sampleName,
      messages: u.messages,
      repliesGiven: u.repliesGiven,
      repliesGot: u.repliesGot,
      avgLen: u.avgLen,
      sentiment: u.sentiment,
      topWords: top(u.words, 25),
      topEmojis: top(u.emojis, 20),
      activeHours: top(u.hours, 8),
      examples: u.examples,
    })).sort((a, b) => b.messages - a.messages);

    const avgLen = global.lengths.length ? Math.round(global.lengths.reduce((a, b) => a + b, 0) / global.lengths.length) : 0;
    const report = {
      channelId,
      channelName: channel.name || null,
      guildId: channel.guildId || null,
      analyzedAt: new Date().toISOString(),
      fetchedMessages: fetchedTotal,
      analyzedHumanMessages: chronology.length,
      summary: {
        avgLen,
        sentimentAvg: chronology.length ? Number((global.sentimentTotal / chronology.length).toFixed(3)) : 0,
        topWords: top(global.words, 80),
        topEmojis: top(global.emojis, 40),
        topCustomEmojis: top(global.customEmojis, 40),
        topReactions: top(global.reactions, 40),
        activeHours: top(global.hours, 24),
        messageTypes: top(global.messageTypes, 20),
        replyEdges: top(replyEdges, 80),
      },
      users: userRows.slice(0, 120),
      styleGuide: buildStyleGuide(userRows, global),
    };

    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `${channelId}.json`);
    writeJsonAtomic(outFile, report);
    console.log(`Wrote ${outFile}`);
    console.log(JSON.stringify({ messages: report.analyzedHumanMessages, topWords: report.summary.topWords.slice(0, 12), style: report.styleGuide.slice(0, 6) }, null, 2));
  } finally {
    client.destroy();
  }
});

function buildStyleGuide(users, global) {
  const guides = [];
  const avg = global.lengths.length ? global.lengths.reduce((a, b) => a + b, 0) / global.lengths.length : 0;
  guides.push(`kanal ortalama mesaj uzunluğu yaklaşık ${Math.round(avg)} karakter; cevap uzunluğunu buna yakın tut`);
  const words = top(global.words, 25).map(x => x.key).join(', ');
  if (words) guides.push(`ortamda sık geçen kelimeler: ${words}`);
  const emojis = top(global.emojis, 10).map(x => x.key).join(' ');
  if (emojis) guides.push(`unicode emoji dili: ${emojis}`);
  const custom = top(global.customEmojis, 10).map(x => x.key).join(' ');
  if (custom) guides.push(`sunucu özel emojileri: ${custom}`);
  const reactions = top(global.reactions, 10).map(x => x.key).join(' ');
  if (reactions) guides.push(`reaksiyon kültürü: ${reactions}`);
  const active = top(global.hours, 5).map(x => `${x.key}:00`).join(', ');
  if (active) guides.push(`aktif saatler: ${active}`);
  const talkers = users.slice(0, 8).map(u => `${u.sampleName}(${u.messages})`).join(', ');
  if (talkers) guides.push(`ana konuşmacılar: ${talkers}`);
  return guides;
}

client.login(process.env.TOKEN);
