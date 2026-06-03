const path = require('path');

const rootDir = process.cwd();
const defaultName = ['su', 'de', 'ku'].join('');

module.exports = {
  botName: process.env.BOT_NAME || defaultName,
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    model: process.env.OLLAMA_MODEL || 'gemma4:31b-cloud',
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 120000),
    numPredict: Number(process.env.OLLAMA_NUM_PREDICT || 110),
    temperature: Number(process.env.OLLAMA_TEMPERATURE || 0.98), // Daha yaratıcı/serbest konuşma için arttırıldı
    topP: Number(process.env.OLLAMA_TOP_P || 0.95), // Daha çeşitli cevaplar için arttırıldı
    repeatPenalty: Number(process.env.OLLAMA_REPEAT_PENALTY || 1.30), // Tekrara düşmemesi için
    numCtx: Number(process.env.OLLAMA_NUM_CTX || 8192),
  },
  data: {
    datasetPath: process.env.DATASET_PATH || path.join(rootDir, 'data', 'dataset.json'),
    reportPath: process.env.PERSONA_REPORT_PATH || path.join(rootDir, 'data', 'persona-report.md'),
    memoryPath: process.env.MEMORY_PATH || path.join(rootDir, 'data', 'bot-memory.json'),
    profilePath: process.env.PROFILE_PATH || path.join(rootDir, 'data', 'bot-profile.json'),
  },
  chat: {
    maxUserMessageLength: Number(process.env.MAX_USER_MESSAGE_LENGTH || 1800),
    maxDiscordReplyLength: 1850,
    shortHistoryTurns: Number(process.env.SHORT_HISTORY_TURNS || 14),
    memorySearchLimit: Number(process.env.MEMORY_SEARCH_LIMIT || 8),
    minMemoryScore: Number(process.env.MIN_MEMORY_SCORE || 0.06),
    userMemoryLimit: Number(process.env.USER_MEMORY_LIMIT || 260),
    ambientObserveChance: Number(process.env.AMBIENT_OBSERVE_CHANCE || 1),
    proactiveReplyChance: Number(process.env.PROACTIVE_REPLY_CHANCE || 0.015),
  },
  safety: {
    crisisHint: 'eğer kendine zarar verme düşüncen varsa lütfen hemen 112yi ara ya da yanında güvendiğin birine yaz yalnız kalma',
  },
};
