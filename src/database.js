const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../sudeku.db');
const db = new Database(dbPath);

// Enable WAL mode & performance optimizations
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('temp_store = MEMORY');
db.pragma('cache_size = -10000'); // limit cache to ~10MB to optimize RAM usage

// Ensure tables exist
function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      guildId TEXT,
      userId TEXT,
      voiceTime INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      tracksPlayed INTEGER DEFAULT 0,
      username TEXT,
      avatar TEXT,
      lastActive INTEGER DEFAULT 0,
      coins INTEGER DEFAULT 100,
      bank INTEGER DEFAULT 0,
      dailyLastClaim INTEGER DEFAULT 0,
      workLastClaim INTEGER DEFAULT 0,
      robLastClaim INTEGER DEFAULT 0,
      inventory TEXT DEFAULT '[]',
      badges TEXT DEFAULT '[]',
      customBg TEXT DEFAULT NULL,
      PRIMARY KEY (guildId, userId)
    );

    CREATE TABLE IF NOT EXISTS guild_config (
      guildId TEXT PRIMARY KEY,
      prefix TEXT DEFAULT 'a.',
      logChannelId TEXT DEFAULT NULL,
      welcomeChannelId TEXT DEFAULT NULL,
      welcomeRoleId TEXT DEFAULT NULL,
      muteRoleId TEXT DEFAULT NULL,
      ticketCategoryId TEXT DEFAULT NULL,
      ticketChannelId TEXT DEFAULT NULL,
      ticketPanelMsgId TEXT DEFAULT NULL,
      djRoleId TEXT DEFAULT NULL,
      volumeDefault INTEGER DEFAULT 50,
      swearFilter INTEGER DEFAULT 0,
      linkFilter INTEGER DEFAULT 0,
      spamFilter INTEGER DEFAULT 0,
      inviteFilter INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS warns (
      id TEXT PRIMARY KEY,
      guildId TEXT,
      userId TEXT,
      moderatorId TEXT,
      reason TEXT,
      date INTEGER
    );

    CREATE TABLE IF NOT EXISTS tickets (
      guildId TEXT,
      channelId TEXT PRIMARY KEY,
      userId TEXT,
      status TEXT DEFAULT 'open',
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS afk (
      guildId TEXT,
      userId TEXT,
      reason TEXT,
      t INTEGER,
      PRIMARY KEY (guildId, userId)
    );

    CREATE TABLE IF NOT EXISTS sticky (
      channelId TEXT PRIMARY KEY,
      messageId TEXT,
      content TEXT
    );
  `);

  // Migrate old database.json data to SQLite if it exists
  const jsonDbPath = path.join(__dirname, '../database.json');
  if (fs.existsSync(jsonDbPath)) {
    try {
      const raw = fs.readFileSync(jsonDbPath, 'utf-8');
      const data = JSON.parse(raw);
      if (data && data.users) {
        console.log('[Database] JSON verileri SQLite\'a taşınıyor...');
        const stmt = db.prepare(`
          INSERT INTO users (guildId, userId, voiceTime, xp, level, tracksPlayed, username, avatar, lastActive)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(guildId, userId) DO UPDATE SET
            voiceTime = excluded.voiceTime,
            xp = excluded.xp,
            level = excluded.level,
            tracksPlayed = excluded.tracksPlayed,
            username = excluded.username,
            avatar = excluded.avatar,
            lastActive = excluded.lastActive
        `);

        db.transaction((usersObj) => {
          for (const [key, val] of Object.entries(usersObj)) {
            const parts = key.split('-');
            const guildId = parts[0] || val.guildId || 'unknown';
            const userId = parts[1] || val.userId || 'unknown';
            stmt.run(
              guildId,
              userId,
              val.voiceTime || 0,
              val.xp || 0,
              val.level || 0,
              val.tracksPlayed || 0,
              val.username || 'Bilinmeyen Kullanıcı',
              val.avatar || '',
              val.lastActive || Date.now()
            );
          }
        })(data.users);
        console.log('[Database] JSON verileri başarıyla taşındı.');
      }
      // Rename old json file to back it up
      fs.renameSync(jsonDbPath, jsonDbPath + '.backup');
    } catch (err) {
      console.error('[Database] JSON verileri taşınırken hata oluştu:', err);
    }
  }
}

init();

const DatabaseHelper = {
  // --- USER LEVEL / VOICE TIME / TRACKS PLAYED ---
  getUser(guildId, userId, defaultUsername = 'Bilinmeyen Kullanıcı', defaultAvatar = '') {
    let row = db.prepare('SELECT * FROM users WHERE guildId = ? AND userId = ?').get(guildId, userId);
    if (!row) {
      db.prepare(`
        INSERT INTO users (guildId, userId, username, avatar, lastActive)
        VALUES (?, ?, ?, ?, ?)
      `).run(guildId, userId, defaultUsername, defaultAvatar, Date.now());
      row = db.prepare('SELECT * FROM users WHERE guildId = ? AND userId = ?').get(guildId, userId);
    }
    // Parse JSON lists safely
    try { row.inventory = JSON.parse(row.inventory || '[]'); } catch (e) { row.inventory = []; }
    try { row.badges = JSON.parse(row.badges || '[]'); } catch (e) { row.badges = []; }
    return row;
  },

  updateUser(guildId, userId, fields = {}) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;

    // Serialize arrays
    const dataToSave = { ...fields };
    if (Array.isArray(dataToSave.inventory)) dataToSave.inventory = JSON.stringify(dataToSave.inventory);
    if (Array.isArray(dataToSave.badges)) dataToSave.badges = JSON.stringify(dataToSave.badges);

    const setClause = Object.keys(dataToSave).map(k => `${k} = ?`).join(', ');
    const params = Object.values(dataToSave);
    params.push(guildId, userId);

    db.prepare(`UPDATE users SET ${setClause} WHERE guildId = ? AND userId = ?`).run(...params);
  },

  addVoiceTime(guildId, userId, ms, username = 'Bilinmeyen Kullanıcı', avatar = '') {
    const user = this.getUser(guildId, userId, username, avatar);
    const newVoiceTime = user.voiceTime + ms;

    const minutes = ms / 60000;
    const xpToAdd = Math.floor(minutes * 10);
    let newXp = user.xp + xpToAdd;
    let newLevel = user.level;

    if (xpToAdd > 0) {
      newLevel = Math.floor(Math.sqrt(newXp / 100));
    }

    this.updateUser(guildId, userId, {
      voiceTime: newVoiceTime,
      xp: newXp,
      level: newLevel,
      username: username || user.username,
      avatar: avatar || user.avatar,
      lastActive: Date.now()
    });

    return this.getUser(guildId, userId);
  },

  addTrackPlayed(guildId, userId, username = 'Bilinmeyen Kullanıcı', avatar = '') {
    const user = this.getUser(guildId, userId, username, avatar);
    const newTracksPlayed = user.tracksPlayed + 1;
    const newXp = user.xp + 15;
    const newLevel = Math.floor(Math.sqrt(newXp / 100));

    this.updateUser(guildId, userId, {
      tracksPlayed: newTracksPlayed,
      xp: newXp,
      level: newLevel,
      username: username || user.username,
      avatar: avatar || user.avatar,
      lastActive: Date.now()
    });

    return this.getUser(guildId, userId);
  },

  getLeaderboard(guildId, type = 'voice') {
    const col = type === 'voice' ? 'voiceTime' : 'tracksPlayed';
    const rows = db.prepare(`SELECT * FROM users WHERE guildId = ? ORDER BY ${col} DESC LIMIT 50`).all(guildId);
    return rows.map(r => {
      try { r.inventory = JSON.parse(r.inventory || '[]'); } catch (e) { r.inventory = []; }
      try { r.badges = JSON.parse(r.badges || '[]'); } catch (e) { r.badges = []; }
      return r;
    });
  },

  getUserRank(guildId, userId) {
    const rows = db.prepare('SELECT userId FROM users WHERE guildId = ? ORDER BY voiceTime DESC').all(guildId);
    const index = rows.findIndex(r => r.userId === userId);
    return index !== -1 ? index + 1 : rows.length + 1;
  },

  // --- ECONOMY ---
  addCoins(guildId, userId, amount) {
    const user = this.getUser(guildId, userId);
    const newCoins = user.coins + amount;
    this.updateUser(guildId, userId, { coins: newCoins });
    return newCoins;
  },

  addBank(guildId, userId, amount) {
    const user = this.getUser(guildId, userId);
    const newBank = user.bank + amount;
    this.updateUser(guildId, userId, { bank: newBank });
    return newBank;
  },

  // --- GUILD CONFIGS ---
  getGuildConfig(guildId) {
    let row = db.prepare('SELECT * FROM guild_config WHERE guildId = ?').get(guildId);
    if (!row) {
      db.prepare('INSERT INTO guild_config (guildId) VALUES (?)').run(guildId);
      row = db.prepare('SELECT * FROM guild_config WHERE guildId = ?').get(guildId);
    }
    return row;
  },

  updateGuildConfig(guildId, fields = {}) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const params = Object.values(fields);
    params.push(guildId);
    db.prepare(`UPDATE guild_config SET ${setClause} WHERE guildId = ?`).run(...params);
  },

  // --- WARNS ---
  addWarn(guildId, userId, moderatorId, reason) {
    const id = Math.random().toString(36).substring(2, 9);
    db.prepare(`
      INSERT INTO warns (id, guildId, userId, moderatorId, reason, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, guildId, userId, moderatorId, reason || 'Sebep belirtilmedi.', Date.now());
    return id;
  },

  getWarns(guildId, userId) {
    return db.prepare('SELECT * FROM warns WHERE guildId = ? AND userId = ? ORDER BY date DESC').all(guildId, userId);
  },

  removeWarn(id) {
    return db.prepare('DELETE FROM warns WHERE id = ?').run(id).changes > 0;
  },

  clearWarns(guildId, userId) {
    return db.prepare('DELETE FROM warns WHERE guildId = ? AND userId = ?').run(guildId, userId).changes;
  },

  // --- AFK ---
  getAfk(guildId, userId) {
    return db.prepare('SELECT * FROM afk WHERE guildId = ? AND userId = ?').get(guildId, userId);
  },

  setAfk(guildId, userId, reason) {
    db.prepare(`
      INSERT INTO afk (guildId, userId, reason, t)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guildId, userId) DO UPDATE SET
        reason = excluded.reason,
        t = excluded.t
    `).run(guildId, userId, reason || 'AFK', Date.now());
  },

  removeAfk(guildId, userId) {
    return db.prepare('DELETE FROM afk WHERE guildId = ? AND userId = ?').run(guildId, userId).changes > 0;
  },

  // --- STICKY MESSAGES ---
  getSticky(channelId) {
    return db.prepare('SELECT * FROM sticky WHERE channelId = ?').get(channelId);
  },

  setSticky(channelId, messageId, content) {
    db.prepare(`
      INSERT INTO sticky (channelId, messageId, content)
      VALUES (?, ?, ?)
      ON CONFLICT(channelId) DO UPDATE SET
        messageId = excluded.messageId,
        content = excluded.content
    `).run(channelId, messageId, content);
  },

  removeSticky(channelId) {
    return db.prepare('DELETE FROM sticky WHERE channelId = ?').run(channelId).changes > 0;
  },

  // --- TICKETS ---
  getTicket(channelId) {
    return db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(channelId);
  },

  createTicket(guildId, channelId, userId) {
    db.prepare(`
      INSERT INTO tickets (guildId, channelId, userId, status, createdAt)
      VALUES (?, ?, ?, 'open', ?)
    `).run(guildId, channelId, userId, Date.now());
  },

  closeTicket(channelId) {
    db.prepare(`
      UPDATE tickets SET status = 'closed' WHERE channelId = ?
    `).run(channelId);
  }
};

module.exports = DatabaseHelper;
