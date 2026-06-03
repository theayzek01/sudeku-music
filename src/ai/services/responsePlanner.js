const crypto = require('crypto');
const { normalizeText } = require('./vectorMemory');

function hash01(seed) {
  return crypto.createHash('sha256').update(seed).digest()[0] / 255;
}

function intentOf(text) {
  const clean = normalizeText(text);
  if (/seviş|öp|ıslak|yatak|istiyorum|dokun|soyun|çıplak|sex|seks|am|göt|meme|yala|sürt|kucağıma|okşa|arzul|dudak|vücut|tenin|hot|nude|porno|erot/i.test(clean)) return 'erotic';
  if (/\?$|ne|nasıl|nasil|neden|kim|hangi|mi\b|mı\b|mu\b|mü\b/i.test(text)) return 'question';
  if (/üzgün|kotü|kötü|yoruldum|bıktım|yalnız|aglı|ağlı|kriz|olmuyor/i.test(clean)) return 'support';
  if (/komik|şaka|meme|random|gül/i.test(clean)) return 'playful';
  if (/unutma|hatırla|aklında tut/i.test(clean)) return 'memory';
  if (/seviyorum|aşk|hoslan|hoşlan|ilişki|iliski/i.test(clean)) return 'relationship';
  return 'chat';
}

function plan({ text, style, userId, channelId }) {
  const intent = intentOf(text);
  const seed = `${userId}:${channelId}:${text}:${Math.floor(Date.now() / 180000)}`;
  const r = hash01(seed);
  const envShort = style?.avgLen && style.avgLen < 35;
  const length = intent === 'erotic' ? (r < 0.55 ? 'short' : 'medium') : r < 0.85 ? 'short' : 'very_short';
  const formats = ['plain', 'dry_short', 'soft_take', 'tiny_story', 'teasing', 'quiet', 'chaotic', 'dirty_talk', 'hot_flirt'];
  let format = formats[Math.floor(hash01(seed + ':fmt') * formats.length)] || 'plain';
  if (intent === 'erotic') format = r < 0.5 ? 'dirty_talk' : 'hot_flirt';
  if (intent === 'support') format = r < 0.72 ? 'soft_take' : 'quiet';
  if (intent === 'question') format = r < 0.55 ? 'plain' : 'dry_short';
  const punctuation = r < 0.7 ? 'low' : 'normal';
  const emoji = style?.emoji && r > 0.55 ? style.emoji : '';
  return { intent, length, format, punctuation, emoji, mood: style?.mood || 'sakin' };
}

function promptForPlan(plan) {
  return [
    'cevap planı:',
    `- intent: ${plan.intent}`,
    `- uzunluk: ${plan.length}`,
    `- biçim: ${plan.format}`,
    `- noktalama: ${plan.punctuation}`,
    `- ruh hali: ${plan.mood}`,
    plan.emoji ? `- uygunsa şu ortam emojisini doğal kullan: ${plan.emoji}` : '- emoji zorunlu değil',
    '- bu plana uy ama mekanik görünme',
    '- ortam kelimelerini birebir doldurma; kanal havasını ritim ve kısalıkla yakala',
  ].join('\n');
}

module.exports = { plan, promptForPlan, intentOf };
