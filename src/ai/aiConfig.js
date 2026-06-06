const path = require('path');

const rootDir = process.cwd();
const defaultName = ['su', 'de', 'ku'].join('');

module.exports = {
  botName: process.env.BOT_NAME || defaultName,
  provider: process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY ? 'openai' : 'ollama'),
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    model: process.env.OLLAMA_MODEL || process.env.OPENAI_MODEL || 'openai/gpt-oss-20b:free',
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 120000),
    numPredict: Number(process.env.OLLAMA_NUM_PREDICT || 88),
    temperature: Number(process.env.OLLAMA_TEMPERATURE || 0.7),
    topP: Number(process.env.OLLAMA_TOP_P || 0.9),
    repeatPenalty: Number(process.env.OLLAMA_REPEAT_PENALTY || 1.12),
    numCtx: Number(process.env.OLLAMA_NUM_CTX || 4096),
  },
  openai: {
    baseUrl: process.env.OPENAI_BASE_URL || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || '',
    model: process.env.OPENAI_MODEL || process.env.OPENROUTER_MODEL || process.env.OLLAMA_MODEL || 'openai/gpt-oss-20b:free',
    timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 120000),
    temperature: Number(process.env.OPENAI_TEMPERATURE || process.env.OLLAMA_TEMPERATURE || 0.7),
    topP: Number(process.env.OPENAI_TOP_P || process.env.OLLAMA_TOP_P || 0.9),
    repeatPenalty: Number(process.env.OPENAI_REPEAT_PENALTY || process.env.OLLAMA_REPEAT_PENALTY || 1.12),
    numCtx: Number(process.env.OPENAI_NUM_CTX || process.env.OLLAMA_NUM_CTX || 4096),
    numPredict: Number(process.env.OPENAI_NUM_PREDICT || process.env.OLLAMA_NUM_PREDICT || 88),
  },
  data: {
    datasetPath: process.env.DATASET_PATH || path.join(rootDir, 'data', 'dataset.json'),
    reportPath: process.env.PERSONA_REPORT_PATH || path.join(rootDir, 'data', 'persona-report.md'),
    memoryPath: process.env.MEMORY_PATH || path.join(rootDir, 'data', 'bot-memory.json'),
    profilePath: process.env.PROFILE_PATH || path.join(rootDir, 'data', 'bot-profile.json'),
  },
  chat: {
    maxUserMessageLength: Number(process.env.MAX_USER_MESSAGE_LENGTH || 1200),
    maxDiscordReplyLength: 1850,
    shortHistoryTurns: Number(process.env.SHORT_HISTORY_TURNS || 10),
    memorySearchLimit: Number(process.env.MEMORY_SEARCH_LIMIT || 5),
    minMemoryScore: Number(process.env.MIN_MEMORY_SCORE || 0.06),
    userMemoryLimit: Number(process.env.USER_MEMORY_LIMIT || 220),
    ambientObserveChance: Number(process.env.AMBIENT_OBSERVE_CHANCE || 1),
    proactiveReplyChance: Number(process.env.PROACTIVE_REPLY_CHANCE || 0.015),
  },
  safety: {
    crisisHint: 'eğer kendine zarar verme düşüncen varsa lütfen hemen 112yi ara ya da yanında güvendiğin birine yaz yalnız kalma',
  },
};
