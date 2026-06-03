const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnv() {
  const root = path.resolve(__dirname, '..', '..');
  const candidates = [
    path.join(root, '.env'),
    path.resolve(root, '..', 'env.env.txt'),
  ];

  for (const file of candidates) {
    if (fs.existsSync(file)) dotenv.config({ path: file, quiet: true });
  }

  if (!process.env.TOKEN && process.env.BOTTOKEN) process.env.TOKEN = process.env.BOTTOKEN;
  if (!process.env.CLIENTID && process.env.CLIENT_ID) process.env.CLIENTID = process.env.CLIENT_ID;
  if (!process.env.CLIENTID && process.env.TOKEN && process.env.TOKEN.includes('.')) {
    try { process.env.CLIENTID = Buffer.from(process.env.TOKEN.split('.')[0], 'base64').toString('utf8'); } catch {}
  }
  if (!process.env.BOT_NAME) process.env.BOT_NAME = ['su', 'de', 'ku'].join('');
}

module.exports = { loadEnv };
