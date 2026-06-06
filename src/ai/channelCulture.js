const path = require('path');
const aiConfig = require('./aiConfig');
const { readJson } = require('./store');

function load(channelId) {
  if (!channelId) return null;
  return readJson(path.join(path.dirname(aiConfig.data.memoryPath), 'channel-analysis', `${channelId}.json`), null);
}

function context(channelId) {
  const data = load(channelId);
  if (!data) return 'bu kanal için önceden çıkarılmış kültür analizi yok';
  const s = data.summary || {};
  const lines = [
    `kanal kültürü: ${data.channelName || data.channelId}`,
    `analizlenen insan mesajı: ${data.analyzedHumanMessages}`,
    ...(data.styleGuide || []),
    `top kelimeler: ${(s.topWords || []).slice(0, 30).map(x => x.key).join(', ')}`,
    `top emojiler: ${(s.topEmojis || []).slice(0, 12).map(x => x.key).join(' ') || 'yok'}`,
    `top reaksiyonlar: ${(s.topReactions || []).slice(0, 12).map(x => x.key).join(' ') || 'yok'}`,
  ];
  return lines.filter(Boolean).join('\n');
}

module.exports = { load, context };
