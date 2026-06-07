const path = require('path');
const { readJson, writeJsonAtomic } = require('./store');
const aiConfig = require('./aiConfig');
const { OpenRouterClient } = require('./openRouter');
const { PersonaEngine } = require('./persona');
const { VectorMemory } = require('./vectorMemory');
const adaptiveState = require('./adaptiveState');
const rateLimiter = require('./rateLimiter');
const guildConfig = require('./guildConfig');
const { plan, promptForPlan } = require('./responsePlanner');
const { consolidate, runDreamCycle } = require('./memoryConsolidator');
const { stylePostprocess } = require('./stylePostprocessor');
const channelCulture = require('./channelCulture');
const mindCore = require('./mindCore');
const metrics = require('./metrics');
const relationshipEngine = require('./relationshipEngine');

function clampDiscord(text) {
  const clean = String(text || '').trim() || 'bilmiyorum ya bi an cevap üretemedim';
  if (clean.length <= aiConfig.chat.maxDiscordReplyLength) return clean;
  return `${clean.slice(0, aiConfig.chat.maxDiscordReplyLength - 20).trim()}.`;
}

function hasCrisis(text) {
  return /intihar|kendimi öldür|ölmek ist|yaşamak istem|yasamak istem|kendime zarar|bilek|kriz|dayanamıyorum|dayanamiyorum/i.test(text || '');
}

function formatBelief(belief) {
  if (typeof belief === 'string') return belief.trim();
  if (belief && typeof belief === 'object') return String(belief.text || belief.summary || '').trim();
  return '';
}

/**
 * Helper to decide how many memory items to fetch based on message length & intent.
 */
function analyzeIntent(content) {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const isShort = wordCount <= 5;
  const isDeep = /neden|nasıl|kimsin|nedir|anlatsana|felsefe|hisset|düşünce/i.test(content);
  return { isShort, isDeep, wordCount };
}

/**
 * Build a compact context string respecting token budget.
 */
function compactContext({ memoryItems, styleExamples, rel, adaptive, culture, responsePlan, style }) {
  const beliefRows = (rel.coreBeliefs || []).map(formatBelief).filter(Boolean);
  const beliefs = beliefRows.length
    ? beliefRows.slice(0, 5).map(b => `- ${b}`).join('\n')
    : 'belirgin inanç yok';

  const memBlock = memoryItems.length
    ? memoryItems.map(({ score, item }) => {
        if (item.text) return `- [${score.toFixed(2)}] bilgi: ${item.text}`;
        return `- [${score.toFixed(2)}] eski: u:${item.userText} / b:${item.botText}`;
      }).join('\n')
    : 'henüz anı yok';

  const styleBlock = styleExamples.length ? styleExamples.map(ex => `Q: ${ex.ex.q}\nA: ${ex.ex.a}`).join('\n---\n') : '';

  const sections = [
    `KULLANICI: ${rel.userName} (${rel.userId}) | İLİŞKİ: ${rel.level} (${rel.affinity}/100)`,
    `İnançlar:\n${beliefs}`,
    `Hafıza:\n${memBlock}`,
    style?.candidateEmojis?.length ? `Emoji havuzu: ${style.candidateEmojis.slice(0, 6).join(' ')}` : null,
    styleBlock && `Stil örnekleri:\n${styleBlock}`,
    `\n${mindCore.prompt()}`,
    `\nKültür: ${culture}`,
    `\nSinyaller: Mood ${adaptive.mood}, Saat ${adaptive.hour}, Sentiment ${adaptive.sentiment}`,
    `\n${promptForPlan(responsePlan)}`
  ].filter(Boolean).join('\n');

  return sections;
}

class ChatEngine {
  constructor() {
    this.ai = new OpenRouterClient();
    this.persona = new PersonaEngine();
    this.memory = new VectorMemory();
    relationshipEngine.setMemory(this.memory);
    this.shortHistoryFile = path.join(path.dirname(aiConfig.data.memoryPath), 'short-history.json');
    this.shortHistory = new Map(Object.entries(readJson(this.shortHistoryFile, {})));
    this.inFlight = new Set();
  }

  key(channelId, userId) { return `${channelId}:${userId}`; }

  saveShortHistory() {
    try {
      const obj = Object.fromEntries(this.shortHistory);
      writeJsonAtomic(this.shortHistoryFile, obj);
    } catch (e) {
      console.error('[CHAT ENGINE] Failed to save short history:', e);
    }
  }

  pushHistory(channelId, userId, role, content) {
    const key = this.key(channelId, userId);
    const arr = this.shortHistory.get(key) || [];
    arr.push({ role, content: String(content).slice(0, 1000), t: Date.now() });
    while (arr.length > aiConfig.chat.shortHistoryTurns) arr.shift();
    this.shortHistory.set(key, arr);
    this.saveShortHistory();
  }

  getMergedHistory(channelId, userId) {
    const currentKey = this.key(channelId, userId);
    const currentHist = this.shortHistory.get(currentKey) || [];
    let bestOtherHist = [];
    let bestTime = 0;
    for (const [k, arr] of this.shortHistory.entries()) {
      if (k !== currentKey && k.endsWith(`:${userId}`) && arr.length > 0) {
        const lastTurn = arr[arr.length - 1];
        if (lastTurn.t && lastTurn.t > bestTime) { bestTime = lastTurn.t; bestOtherHist = arr; }
      }
    }
    const fiveMinutes = 300000;
    if (Date.now() - bestTime < fiveMinutes && bestOtherHist.length > 0) {
      const currentContents = new Set(currentHist.map(h => h.content));
      const filteredOther = bestOtherHist.filter(h => !currentContents.has(h.content));
      return [
        ...filteredOther.slice(-3).map(turn => ({ role: turn.role, content: turn.content })),
        ...currentHist.map(turn => ({ role: turn.role, content: turn.content }))
      ];
    }
    return currentHist.map(turn => ({ role: turn.role, content: turn.content }));
  }

  /**
   * Build the full message list for the OpenRouter request.
   */
  buildMessages({ userId, userName, channelId, guildId, guild, content }) {
    // 1️⃣ Intent analysis for budgeting
    const { isShort, isDeep } = analyzeIntent(content);
    // 2️⃣ Adjust memory search limit
    let memLimit = aiConfig.chat.memorySearchLimit;
    if (isShort && !isDeep) memLimit = Math.max(2, Math.floor(memLimit / 2));
    // 3️⃣ Retrieve memory and style examples
    const memoryItems = this.memory.search(userId, content, memLimit);
    const styleExamples = this.persona.searchExamples(content, isShort ? 3 : 7);
    // 4️⃣ Gather auxiliary data
    const rel = relationshipEngine.getRelationship(userId, userName);
    const adaptive = adaptiveState.styleContext({ guildId, channelId, userId, guild });
    const style = adaptive;
    const culture = channelCulture.context(channelId);
    const responsePlan = plan({ text: content, style, userId, channelId });
    const staticSystemPrompt = this.persona.systemPrompt();
    // 5️⃣ Build compact dynamic content
    const dynamicContent = compactContext({ memoryItems, styleExamples, rel, adaptive, culture, responsePlan, style });
    // 6️⃣ Assemble final message list
    const messages = [
      { role: 'system', content: staticSystemPrompt },
      ...this.getMergedHistory(channelId, userId),
      { role: 'system', content: dynamicContent },
      { role: 'user', content },
    ];
    // 7️⃣ Crisis handling
    if (hasCrisis(content)) {
      messages.splice(messages.length - 1, 0, { role: 'system', content: `KRİZ: Romantize etme. Net destek ver. ${aiConfig.safety.crisisHint}` });
    }
    return messages;
  }

  observe(message) {
    adaptiveState.observe(message);
    mindCore.observe({ text: message.content, author: message.author?.username, guildId: message.guildId || 'dm' });
    adaptiveState.save();
    mindCore.save();
  }

  async replyRich({ userId, userName, channelId, guildId, guild, content }) {
    const clean = String(content || '').trim().slice(0, aiConfig.chat.maxUserMessageLength);
    if (!clean) return { content: 'ne diyim bilemedim ya boş geldi mesaj', actions: {}, mood: null };
    const cfg = guildConfig.get(guildId || 'dm');
    if (!cfg.enabled) return { content: 'şu an bu sunucuda kapalıyım ya', actions: {}, mood: null };
    const limited = rateLimiter.check(`${guildId || 'dm'}:${userId}`, { limit: 10, windowMs: 60000 });
    if (!limited.ok) return { content: `biraz yavaş ya çok hızlı aktı ${Math.ceil(limited.retryAfterMs / 1000)} sn sonra yaz`, actions: {}, mood: null };
    const lockKey = this.key(channelId, userId);
    if (this.inFlight.has(lockKey)) return { content: 'bi sn ya önceki mesaja cevap yazıyorum', actions: {}, mood: null };
    this.inFlight.add(lockKey);
    try {
      relationshipEngine.processMessageForRelationship(userId, userName, clean);
      mindCore.observe({ text: clean, author: userName, guildId: guildId || 'dm' });
      const messages = this.buildMessages({ userId, userName, channelId, guildId, guild, content: clean });
      const style = adaptiveState.styleContext({ guildId, channelId, userId, guild });
      this.pushHistory(channelId, userId, 'user', clean);
      const rel = relationshipEngine.getRelationship(userId, userName);
      const userWords = clean.split(/\s+/).filter(Boolean).length;
      let dynamicPredict = 180;
      if (clean.includes('*') || /(ahh|ohh|seviş|istiyorum|yala|sürt|kucağıma|şehvet|inle|tahrik|soyun|çıplak)/i.test(clean)) {
        dynamicPredict = 240;
      } else if (userWords <= 4) {
        dynamicPredict = 96;
      } else if (userWords <= 10) {
        dynamicPredict = 140;
      }
      let answer = await this.ai.chat(messages, { numPredict: dynamicPredict });
      const styleBefore = style;
      answer = stylePostprocess(clampDiscord(answer), {
        userText: clean,
        avgLen: styleBefore.avgLen,
        emoji: styleBefore.emoji,
        candidateEmojis: styleBefore.candidateEmojis,
        mood: styleBefore.mood,
        affinity: rel.affinity
      });
      this.pushHistory(channelId, userId, 'assistant', answer);
      this.memory.rememberTurn(userId, userName, clean, answer);
      if ((this.memory.userBucket(userId).turns.length % 12) === 0) consolidate(this.memory, userId);
      if ((this.memory.userBucket(userId).turns.length % 15) === 0) {
        runDreamCycle(this.memory, userId, userName).catch(() => null);
      }
      this.memory.save();
      mindCore.save();
      adaptiveState.save();
      const actions = adaptiveState.decideActions({ text: `${clean}\n${answer}`, guild, style });
      if (!cfg.react) {
        actions.react = null;
        actions.useEmoji = null;
      }
      if (!cfg.gifs) actions.gifQuery = null;
      if (actions.useEmoji && answer.length < aiConfig.chat.maxDiscordReplyLength - actions.useEmoji.length - 2 && !answer.includes(actions.useEmoji)) {
        answer = stylePostprocess(answer, {
          userText: clean,
          avgLen: style.avgLen,
          emoji: actions.useEmoji,
          candidateEmojis: style.candidateEmojis,
          mood: style.mood,
          affinity: rel.affinity
        });
      }
      return { content: answer, actions, mood: style.mood };
    } catch (error) {
      console.error('[AI CHAT ERROR]', error);
      metrics.error('ai-chat', error);
      const fallback = 'bi an kaçırdım ya tekrar yazsana';
      this.pushHistory(channelId, userId, 'assistant', fallback);
      return { content: fallback, actions: {}, mood: null };
    } finally {
      this.inFlight.delete(lockKey);
    }
  }

  async reply(payload) {
    const result = await this.replyRich(payload);
    return result.content;
  }

  reset(userId) {
    this.memory.clearUser(userId);
    for (const key of this.shortHistory.keys()) {
      if (key.endsWith(`:${userId}`)) this.shortHistory.delete(key);
    }
    this.saveShortHistory();
  }

  stats(userId) { return this.memory.stats(userId); }
  health() { return this.ai.health(); }
}

module.exports = new ChatEngine();
