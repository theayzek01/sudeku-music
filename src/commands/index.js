const commands = [];

function loadCommand(relativePath) {
  const filePath = require.resolve(`./${relativePath}`);

  try {
    delete require.cache[filePath];
    const cmd = require(filePath);
    if (cmd && cmd.data && typeof cmd.data.name === 'string') {
      commands.push(cmd);
    }
  } catch (err) {
    console.error(`[Loader] Hata (${relativePath}):`, err);
  }
}

[
  'music/play.js',
  'music/pause.js',
  'music/resume.js',
  'music/skip.js',
  'music/stop.js',
  'music/queue.js',
  'music/nowplaying.js',
  'music/volume.js',
  'music/loop.js',
  'music/clear.js',
  'music/shuffle.js',
  'music/autoplay.js',
  'music/seek.js',
  'music/filter.js',
  'music/lyrics.js',
  'music/join.js',
  'music/leave.js',
  'music/search.js',
  'utility/help.js',
  'utility/avatar.js',
  'utility/serverinfo.js',
  'utility/stats.js',
  'utility/rank.js',
  'utility/love.js'
].forEach(loadCommand);

function formatMs(ms) {
  if (!ms || ms < 0) return '00:00';
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  const secStr = seconds < 10 ? `0${seconds}` : seconds;
  const minStr = minutes < 10 ? `0${minutes}` : minutes;
  const hrStr = hours > 0 ? `${hours}:` : '';

  return `${hrStr}${minStr}:${secStr}`;
}

exports.commands = commands;
exports.formatMs = formatMs;
