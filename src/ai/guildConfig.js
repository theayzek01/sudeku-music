const path = require('path');
const aiConfig = require('./aiConfig');
const { readJson, writeJsonAtomic } = require('./store');

const FILE = process.env.GUILD_CONFIG_PATH || path.join(path.dirname(aiConfig.data.memoryPath), 'guild-config.json');

const DEFAULTS = {
  enabled: true,
  learn: true,
  proactive: false,
  react: true,
  gifs: true,
  ambientChance: 0.015,
  mentionOnly: false,
};

class GuildConfig {
  constructor(file = FILE) {
    this.file = file;
    this.data = readJson(file, { version: 1, guilds: {}, updatedAt: null });
    this.dirty = false;
  }
  get(guildId = 'dm') {
    return { ...DEFAULTS, ...(this.data.guilds[guildId] || {}) };
  }
  set(guildId = 'dm', patch = {}) {
    this.data.guilds[guildId] = { ...this.get(guildId), ...patch };
    this.dirty = true;
    this.save();
    return this.get(guildId);
  }
  save() {
    if (!this.dirty) return;
    this.data.updatedAt = new Date().toISOString();
    writeJsonAtomic(this.file, this.data);
    this.dirty = false;
  }
}

module.exports = new GuildConfig();
