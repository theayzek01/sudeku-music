const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.js') && !['index.js', 'sudeCore.js'].includes(entry.name)) files.push(full);
  }
}
walk(path.join(root, 'src'));

for (const file of files) {
  require(file);
  console.log(`ok ${path.relative(root, file)}`);
}

const chatEngine = require('../src/services/chatEngine');
const stats = chatEngine.stats('check-user');
console.log(`memory ok turns=${stats.turns} facts=${stats.facts}`);
console.log('all checks passed');
