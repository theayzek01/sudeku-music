const path = require('path');

const rootDir = process.cwd();
const defaultName = ['su', 'de', 'ku'].join('');
const requestedProvider = String(process.env.AI_PROVIDER || 'openrouter').toLowerCase();

function splitEnvList(value) {
  return String(value || '')
    .split(/[\s,]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

function numberedEnv(prefix) {
  const keys = [];
  for (let i = 2; i <= 10; i++) keys.push(...splitEnvList(process.env[`${prefix}_${i}`]));
  return keys;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const openRouterApiKeys = unique([
  ...splitEnvList(process.env.OPENROUTER_API_KEY),
  ...splitEnvList(process.env.OPENROUTER_API_KEYS),
  ...numberedEnv('OPENROUTER_API_KEY'),
  ...splitEnvList(process.env.AI_API_KEY),
  ...splitEnvList(process.env.AI_API_KEYS),
]);

const openAiApiKeys = unique([
  ...splitEnvList(process.env.OPENAI_API_KEY),
  ...splitEnvList(process.env.OPENAI_API_KEYS),
  ...numberedEnv('OPENAI_API_KEY'),
  ...splitEnvList(process.env.AI_API_KEY),
  ...splitEnvList(process.env.AI_API_KEYS),
]);

const apiKeys = requestedProvider === 'openai'
  ? unique([...openAiApiKeys, ...openRouterApiKeys])
  : unique([...openRouterApiKeys, ...openAiApiKeys]);

module.exports = {
  botName: process.env.BOT_NAME || defaultName,
  provider: requestedProvider === 'openai' ? 'openai' : 'openrouter',
  openai: {
    baseUrl: process.env.OPENAI_BASE_URL || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    apiKey: apiKeys[0] || '',
    apiKeys,
    model: process.env.OPENAI_MODEL || process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free',
    timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 120000),
    temperature: Number(process.env.OPENAI_TEMPERATURE || 0.7),
    topP: Number(process.env.OPENAI_TOP_P || 0.9),
    numPredict: Number(process.env.OPENAI_NUM_PREDICT || 180),
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
