const fs = require('fs');
const path = require('path');

const commands = [];

function loadCommands(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      loadCommands(filePath);
    } else if (file.endsWith('.js') && file !== 'index.js') {
      try {
        // Clear require cache to reload cleanly
        delete require.cache[require.resolve(filePath)];
        const cmd = require(filePath);
        if (cmd && cmd.data && typeof cmd.data.name === 'string') {
          // Category based on folder name
          cmd.category = path.basename(dir);
          commands.push(cmd);
        }
      } catch (err) {
        console.error(`[Loader] Hata (${file}):`, err);
      }
    }
  }
}

loadCommands(__dirname);

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

module.exports = {
  commands,
  formatMs
};
