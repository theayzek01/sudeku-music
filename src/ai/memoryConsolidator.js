const { normalizeText } = require('./vectorMemory');
const aiConfig = require('./aiConfig');
const { OllamaClient } = require('./ollama');

const ollama = new OllamaClient();

function keywordSummary(turns = []) {
  const freq = {};
  for (const t of turns.slice(-80)) {
    for (const w of normalizeText(`${t.userText || ''} ${t.botText || ''}`).split(' ')) {
      if (w.length < 4) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([w]) => w);
}

function consolidate(memory, userId) {
  const bucket = memory.userBucket(userId);
  const keys = keywordSummary(bucket.turns);
  bucket.profile = bucket.profile || {};
  bucket.profile.keywords = keys;
  bucket.profile.lastConsolidatedAt = new Date().toISOString();
  memory.dirty = true;
  return bucket.profile;
}

/**
 * Gece Rüya Döngüsü & AI Bellek Sentezi (Dream Cycle / Offline Consolidation)
 * Son konuşmalardan yola çıkarak kullanıcı hakkında derin, duygu yüklü çekirdek inanç sentezleri üretir.
 */
async function runDreamCycle(memory, userId, userName) {
  const bucket = memory.userBucket(userId);
  if (!bucket.turns || bucket.turns.length < 5) return null;
  
  const recentTurns = bucket.turns.slice(-25);
  const conversationLog = recentTurns.map(t => `${t.userName || 'Kullanıcı'}: ${t.userText}\nSude: ${t.botText}`).join('\n---\n');
  
  const relationship = bucket.profile || {};
  const currentLevel = relationship.level || 'Yabancı';
  const currentAffinity = relationship.affinity ?? 30;

  const systemPrompt = [
    `sen profesyonel bir ai bellek sentezi motorusun. adın sude (sudeku) zihin çekirdeği.`,
    `bu kullanıcının adı: ${userName}. aranızdaki ilişki seviyesi: ${currentLevel} (yakınlık derecesi: ${currentAffinity}/100).`,
    `amacın, aranızdaki son konuşmaları rüya döngüsünde analiz ederek bu kullanıcı hakkında samimi, derin, içten ve hislerine dayalı bir 'Çekirdek İnanç' (Core Belief) cümlesi sentezlemek.`,
    `bu inanç cümlesi sude'nin ağzından yazılmalı, tamamen doğal, edebi türkçe yerine discord mesajı gibi samimi, küçük harflerle, noktalama işaretleri az olmalıdır.`,
    `kullanıcının paylaştığı sırları, fiziksel/cinsel arzularını, fantezilerini veya onunla arandaki bağı yansıtmalı.`,
    `asla yapay zeka jargonu kullanma, 'bu analizde gördüğümüz üzere...' gibi robotik yazma.`,
    `maksimum 2-3 cümle olsun.`,
  ].join('\n');

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `işte son sohbet geçmişimiz:\n\n${conversationLog}\n\nbunu analiz edip benim hakkımdaki en son derin çekirdek inancını/duygularını rüya sentezi olarak yaz:` }
  ];

  try {
    const beliefText = await ollama.chat(messages, { temperature: 0.88 });
    if (beliefText && beliefText.length > 5) {
      if (!relationship.coreBeliefs) relationship.coreBeliefs = [];
      relationship.coreBeliefs.unshift({
        id: require('crypto').randomUUID(),
        text: beliefText.trim().toLowerCase(),
        synthesizedAt: new Date().toISOString(),
        basedOnTurns: recentTurns.length
      });
      // Sadece en son 8 çekirdek inancı saklayalım ki şişmesin
      relationship.coreBeliefs = relationship.coreBeliefs.slice(0, 8);
      bucket.profile = relationship;
      memory.dirty = true;
      memory.save();
      console.log(`[DREAM CYCLE] Successfully synthesized belief for ${userName} (${userId})`);
      return beliefText;
    }
  } catch (error) {
    console.error(`[DREAM CYCLE ERROR] Failed for user ${userId}:`, error);
  }
  return null;
}

module.exports = { consolidate, keywordSummary, runDreamCycle };
