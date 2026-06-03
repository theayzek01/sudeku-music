const crypto = require('crypto');
const aiConfig = require('../config/ai');
const { readJson, writeJsonAtomic } = require('./store');

const DIM = 384;
const MAX_TEXT = 900;

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' link ')
    .replace(/<@!?\d+>/g, ' mention ')
    .replace(/[^a-z0-9çğıöşü\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashIndex(token) {
  const hash = crypto.createHash('sha1').update(token).digest();
  return ((hash[0] << 8) + hash[1]) % DIM;
}

function embed(text) {
  const clean = normalizeText(text);
  const vec = new Float32Array(DIM);
  if (!clean) return Array.from(vec);

  const words = clean.split(' ').filter(Boolean);
  for (const word of words) {
    vec[hashIndex(`w:${word}`)] += 1.3;
    for (let n = 3; n <= 5; n++) {
      if (word.length < n) continue;
      for (let i = 0; i <= word.length - n; i++) vec[hashIndex(`g:${word.slice(i, i + n)}`)] += 0.35;
    }
  }

  for (let i = 0; i < words.length - 1; i++) vec[hashIndex(`b:${words[i]}_${words[i + 1]}`)] += 0.9;

  let norm = 0;
  for (const value of vec) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < vec.length; i++) vec[i] = Number((vec[i] / norm).toFixed(6));
  return Array.from(vec);
}

function cosine(a, b) {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) sum += a[i] * b[i];
  return sum;
}

class VectorMemory {
  constructor(filePath = aiConfig.data.memoryPath) {
    this.filePath = filePath;
    this.data = readJson(filePath, { version: 1, users: {}, global: [], updatedAt: null });
    this.dirty = false;
  }

  save() {
    if (!this.dirty) return;
    this.data.updatedAt = new Date().toISOString();
    writeJsonAtomic(this.filePath, this.data);
    this.dirty = false;
  }

  userBucket(userId) {
    if (!this.data.users[userId]) this.data.users[userId] = { facts: [], turns: [], profile: {} };
    return this.data.users[userId];
  }

  rememberTurn(userId, userName, userText, botText) {
    const bucket = this.userBucket(userId);
    const now = new Date().toISOString();
    const compact = `kullanıcı ${userName}: ${userText}\nbot: ${botText}`.slice(0, MAX_TEXT);
    bucket.turns.push({ id: crypto.randomUUID(), t: now, userName, userText: userText.slice(0, MAX_TEXT), botText: botText.slice(0, MAX_TEXT), vector: embed(compact) });
    if (bucket.turns.length > aiConfig.chat.userMemoryLimit) bucket.turns.splice(0, bucket.turns.length - aiConfig.chat.userMemoryLimit);
    this.extractFacts(bucket, userText, now);
    this.dirty = true;
  }

  extractFacts(bucket, text, now) {
    const clean = String(text || '').trim();
    if (!clean || clean.length > 700) return;
    const factPatterns = [
      /(?:benim adım|adım|ismim)\s+([^,.!?]{2,40})/i,
      /(?:ben|benim)\s+([^,.!?]{2,80})\s+(?:seviyorum|severim|hoşuma gider)/i,
      /(?:sevmiyorum|nefret ederim|hoşlanmam)\s+([^,.!?]{2,80})/i,
      /(?:yaşım|yasım)\s+(\d{1,2})/i,
      /(?:burcum|burcuyum)\s+([^,.!?]{2,30})/i,
      /(?:boyum|kilom)\s+([^,.!?]{2,40})/i,
      /(?:sevgilim|eşim|ilişkim)\s+([^,.!?]{2,60})/i,
      /(?:seks|sevişme|fantezi|hoşlandığım)\s+([^,.!?]{2,120})/i,
    ];
    const facts = [];
    for (const re of factPatterns) {
      const match = clean.match(re);
      if (match) facts.push(match[0].slice(0, 160));
    }
    if (/\bunutma\b|\baklında tut\b|\bhatırla\b/i.test(clean)) facts.push(clean.slice(0, 220));

    // Ekstra flörtöz/erotik fantezi veya isteklerin yakalanması
    if (/sevişmeyi severim|öpüşmeyi severim|hoşlanıyorum|arzuluyorum|fantezim|hoşuma gidiyor/i.test(clean)) {
      facts.push(clean.slice(0, 220));
    }

    for (const fact of facts) {
      const vector = embed(fact);
      const duplicate = bucket.facts.find(x => cosine(x.vector, vector) > 0.92);
      if (duplicate) {
        duplicate.text = fact;
        duplicate.updatedAt = now;
      } else {
        bucket.facts.push({ id: crypto.randomUUID(), text: fact, createdAt: now, updatedAt: now, vector });
      }
    }
    if (bucket.facts.length > 120) bucket.facts.splice(0, bucket.facts.length - 120);
  }

  search(userId, query, limit = aiConfig.chat.memorySearchLimit) {
    const bucket = this.userBucket(userId);
    const qv = embed(query);
    const rows = [];
    for (const item of [...bucket.facts, ...bucket.turns]) {
      if (!item.vector) continue;
      const score = cosine(qv, item.vector);
      if (score >= aiConfig.chat.minMemoryScore) rows.push({ score, item });
    }
    return rows.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  clearUser(userId) {
    delete this.data.users[userId];
    this.dirty = true;
    this.save();
  }

  stats(userId) {
    const bucket = this.userBucket(userId);
    return { facts: bucket.facts.length, turns: bucket.turns.length, updatedAt: this.data.updatedAt };
  }
}

module.exports = { VectorMemory, embed, cosine, normalizeText };
