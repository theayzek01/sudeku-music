const crypto = require('crypto');
const aiConfig = require('../config/ai');
const { readJson, writeJsonAtomic } = require('./store');
const { normalizeText } = require('./vectorMemory');

const STATE_PATH = process.env.ADAPTIVE_STATE_PATH || aiConfig.data.memoryPath.replace('bot-memory.json', 'adaptive-state.json');
const MAX_SAMPLES = 220;
const MAX_EMOJIS = 80;
const MAX_REACTIONS = 80;

function nowHour() { return new Date().getHours(); }
function pickWeighted(items, fallback = null) {
  const rows = Object.entries(items || {}).filter(([, v]) => v > 0);
  if (!rows.length) return fallback;
  const total = rows.reduce((a, [, v]) => a + v, 0);
  let r = Math.random() * total;
  for (const [k, v] of rows) { r -= v; if (r <= 0) return k; }
  return rows[0][0];
}
function inc(obj, key, by = 1, maxKeys = 200) {
  if (!key) return;
  obj[key] = (obj[key] || 0) + by;
  const keys = Object.keys(obj);
  if (keys.length > maxKeys) {
    keys.sort((a, b) => obj[a] - obj[b]).slice(0, keys.length - maxKeys).forEach(k => delete obj[k]);
  }
}
function sentiment(text) {
  const clean = normalizeText(text);
  let score = 0;
  for (const w of ['iyi','güzel','sevindim','mutlu','komik','aşırı','efsane','harika','ask','seviyorum']) if (clean.includes(w)) score += 1;
  for (const w of ['kötü','yoruldum','bıktım','üzgün','yalnız','nefret','ölmek','intihar','sıkıldım','aglıyorum','ağlıyorum']) if (clean.includes(w)) score -= 1;
  return Math.max(-3, Math.min(3, score));
}

function getGlobalEmojis(guild) {
  const targetGuildId = '1342984750347845652';
  let targetGuild = null;

  if (guild?.client) {
    targetGuild = guild.client.guilds.cache.get(targetGuildId);
  }
  
  if (!targetGuild) {
    try {
      const client = require('../index');
      if (client && client.guilds) {
        targetGuild = client.guilds.cache.get(targetGuildId);
      }
    } catch (e) {
      // Ignore
    }
  }

  if (targetGuild) {
    return targetGuild.emojis.cache.map(e => e.toString());
  }

  return guild?.emojis?.cache ? guild.emojis.cache.map(e => e.toString()) : [];
}

function getGlobalReactionEmojis(guild) {
  const targetGuildId = '1342984750347845652';
  let targetGuild = null;

  if (guild?.client) {
    targetGuild = guild.client.guilds.cache.get(targetGuildId);
  }
  
  if (!targetGuild) {
    try {
      const client = require('../index');
      if (client && client.guilds) {
        targetGuild = client.guilds.cache.get(targetGuildId);
      }
    } catch (e) {
      // Ignore
    }
  }

  if (targetGuild) {
    return targetGuild.emojis.cache.filter(e => !e.animated);
  }

  return guild?.emojis?.cache ? guild.emojis.cache.filter(e => !e.animated) : null;
}

class AdaptiveState {
  constructor(filePath = STATE_PATH) {
    this.filePath = filePath;
    this.data = readJson(filePath, { version: 1, guilds: {}, users: {}, channels: {}, updatedAt: null });
    this.dirty = false;
  }
  save() {
    if (!this.dirty) return;
    this.data.updatedAt = new Date().toISOString();
    writeJsonAtomic(this.filePath, this.data);
    this.dirty = false;
  }
  bucket(map, id, seed = {}) {
    if (!id) id = 'dm';
    if (!map[id]) map[id] = { samples: [], words: {}, emojis: {}, reactions: {}, avgLen: 0, messages: 0, sentiment: 0, hourly: {}, ...seed };
    return map[id];
  }
  observe(message) {
    if (!message || message.author?.bot || !message.content) return;
    const text = String(message.content).slice(0, 1000);
    const guildId = message.guildId || 'dm';
    const channelId = message.channelId || 'dm';
    const userId = message.author.id;
    const buckets = [
      this.bucket(this.data.guilds, guildId),
      this.bucket(this.data.channels, channelId),
      this.bucket(this.data.users, userId),
    ];
    const words = normalizeText(text).split(' ').filter(w => w.length > 2).slice(0, 60);
    const customEmojis = text.match(/<a?:\w{2,32}:\d{17,22}>/g) || [];
    const unicodeEmojis = text.match(/[\u{1F300}-\u{1FAFF}]/gu) || [];
    const s = sentiment(text);
    for (const b of buckets) {
      b.messages += 1;
      b.avgLen = Math.round(((b.avgLen * (b.messages - 1)) + text.length) / b.messages);
      b.sentiment = Number(((b.sentiment * 0.94) + (s * 0.06)).toFixed(3));
      inc(b.hourly, String(nowHour()), 1, 24);
      for (const w of words) inc(b.words, w, 1, 180);
      for (const e of [...customEmojis, ...unicodeEmojis]) inc(b.emojis, e, 1, MAX_EMOJIS);
      b.samples.push(text);
      if (b.samples.length > MAX_SAMPLES) b.samples.splice(0, b.samples.length - MAX_SAMPLES);
    }
    this.dirty = true;
  }
  observeReaction(message, emoji) {
    const guildId = message.guildId || 'dm';
    const channelId = message.channelId || 'dm';
    for (const b of [this.bucket(this.data.guilds, guildId), this.bucket(this.data.channels, channelId)]) inc(b.reactions, emoji, 1, MAX_REACTIONS);
    this.dirty = true;
  }
  styleContext({ guildId, channelId, userId, guild }) {
    const g = this.bucket(this.data.guilds, guildId || 'dm');
    const c = this.bucket(this.data.channels, channelId || 'dm');
    const u = this.bucket(this.data.users, userId || 'anon');
    const mixWords = { ...g.words, ...c.words, ...u.words };
    const topWords = Object.entries(mixWords).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([w]) => w);
    
    // Filter emojis to ONLY contain custom emojis from the target global guild
    const serverEmojis = getGlobalEmojis(guild);
    let emoji = '';
    let candidateEmojis = [];
    if (serverEmojis.length > 0) {
      const accumulated = { ...g.emojis, ...c.emojis, ...u.emojis };
      const filtered = {};
      for (const [k, v] of Object.entries(accumulated)) {
        if (serverEmojis.includes(k)) {
          filtered[k] = v;
        }
      }
      // High emoji variety: 45% of the time pick a completely random server emoji to avoid repetition
      if (Math.random() < 0.45) {
        emoji = serverEmojis[Math.floor(Math.random() * serverEmojis.length)];
      } else {
        emoji = pickWeighted(filtered, serverEmojis[Math.floor(Math.random() * serverEmojis.length)]);
      }

      // Generate a pool of 6 candidate emojis for high variety
      const sorted = Object.entries(filtered)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k);
      const pool = [...sorted.slice(0, 3)];
      while (pool.length < 6 && serverEmojis.length > 0) {
        const randEmoji = serverEmojis[Math.floor(Math.random() * serverEmojis.length)];
        if (!pool.includes(randEmoji)) pool.push(randEmoji);
        if (pool.length >= serverEmojis.length) break;
      }
      candidateEmojis = pool;
    }

    const mood = this.moodFor({ guildId, channelId, userId });
    return {
      mood,
      topWords,
      avgLen: Math.round((g.avgLen + c.avgLen + u.avgLen) / 3) || 60,
      sentiment: Number(((g.sentiment + c.sentiment + u.sentiment) / 3).toFixed(2)),
      emoji,
      candidateEmojis,
      hour: nowHour(),
      samples: [...u.samples.slice(-3), ...c.samples.slice(-3)].slice(-5),
    };
  }
  moodFor({ guildId, channelId, userId }) {
    const h = nowHour();
    const g = this.bucket(this.data.guilds, guildId || 'dm');
    const u = this.bucket(this.data.users, userId || 'anon');
    const base = (g.sentiment + u.sentiment) / 2;
    const night = h >= 0 && h <= 5;
    
    // Erotik ve flört kelimeleri kontrolüyle ruh halini şekillendirme
    let hasEroticSignal = false;
    const allSamples = [...(u.samples || []), ...(g.samples || [])];
    for (const text of allSamples) {
      if (/seviş|öp|ıslak|yatak|istiyorum|dokun|soyun|çıplak|sex|seks|am|göt|meme|yala|sürt|kucağıma|okşa|arzul|dudak|vücut|tenin|hot|nude/i.test(text)) {
        hasEroticSignal = true;
        break;
      }
    }

    const pool = night
      ? ['uykulu', 'dalgın', 'kuru', 'garip sakin', 'azıcık melankolik', 'boşvermiş']
      : ['meraklı', 'tatlı kaotik', 'sakin', 'alaycı', 'enerjik', 'düşünceli', 'umursamaz gibi', 'oyuncu', 'düz', 'hafif sinirli'];
    
    if (hasEroticSignal) {
      pool.push('baştan çıkarıcı', 'arzulu', 'şehvetli', 'dominant & hot', 'aşırı flörtöz', 'ıslak ve istekli', 'heyecanlı', 'oyuncu & cilveli');
    }

    if (base < -0.8) pool.push('şefkatli', 'ciddi ama yumuşak', 'suskun');
    if (base > 0.8) pool.push('oyuncu', 'şakacı', 'parlak', 'random');
    const key = `${guildId || 'dm'}:${channelId || 'dm'}:${userId || 'anon'}:${new Date().toDateString()}:${Math.floor(h / 3)}`;
    const idx = crypto.createHash('md5').update(key).digest()[0] % pool.length;
    return pool[idx];
  }
  decideActions({ text, guild, style }) {
    const actions = { react: null, gifQuery: null, useEmoji: null };
    const clean = normalizeText(text);
    if (style?.emoji && Math.random() < 0.28) actions.useEmoji = style.emoji;
    
    // React ONLY with custom server emojis from the target global guild, matching their name to the mood!
    const serverEmojis = getGlobalReactionEmojis(guild);
    if (serverEmojis && serverEmojis.size > 0 && Math.random() < 0.25) {
      const textLower = text.toLowerCase();
      
      const loveKeywords = /seviş|öp|ıslak|yatak|istiyorum|dokun|soyun|çıplak|sex|seks|am|göt|meme|yala|sürt|kucağıma|okşa|arzul|dudak|vücut|tenin|hot|nude|porno|erot|love|kalp|sevgi|aş|bebeğim|tatlım|canım/i;
      const funnyKeywords = /haha|ahaha|xd|komik|sj|qwe|😂|💀|gül/i;
      const sadKeywords = /üzgün|kotü|kötü|yoruldum|bıktım|yalnız|aglı|ağlı|kriz|olmuyor|ağla/i;
      
      let matched = [];
      
      if (loveKeywords.test(textLower)) {
        matched = serverEmojis.filter(e => /love|heart|kalp|kiss|öp|blush|hot|flirt|smirk|arzu|lust|erotic/i.test(e.name)).map(e => e.id);
      } else if (funnyKeywords.test(textLower)) {
        matched = serverEmojis.filter(e => /lol|haha|laugh|gül|fun|xd|komik|joy|crylaugh/i.test(e.name)).map(e => e.id);
      } else if (sadKeywords.test(textLower)) {
        matched = serverEmojis.filter(e => /sad|cry|ağla|sob|depressed|yorgun|melankoly/i.test(e.name)).map(e => e.id);
      }
      
      if (matched.length > 0) {
        // 35% chance to react with multiple (up to 3) distinct matched custom emojis, otherwise 1
        const count = Math.random() < 0.35 ? Math.min(3, matched.length) : 1;
        const shuffled = [...matched].sort(() => 0.5 - Math.random());
        actions.react = shuffled.slice(0, count);
      } else {
        const allIds = serverEmojis.map(e => e.id);
        // 35% chance to react with multiple (up to 3) distinct random custom emojis, otherwise 1
        const count = Math.random() < 0.35 ? Math.min(3, allIds.length) : 1;
        const shuffled = [...allIds].sort(() => 0.5 - Math.random());
        actions.react = shuffled.slice(0, count);
      }
    }
    
    if (/komik|gül|şaka|meme|gif|dans|ağlıyorum|agliyorum|mood/i.test(clean) && Math.random() < 0.22) actions.gifQuery = clean.includes('komik') ? 'funny reaction' : 'anime reaction mood';
    return actions;
  }
}

module.exports = new AdaptiveState();
