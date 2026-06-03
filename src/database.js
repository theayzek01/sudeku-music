const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database.json');

// Default database structure
let db = {
  users: {} // { "guildId-userId": { voiceTime: 0, xp: 0, level: 0, tracksPlayed: 0, username: "", avatar: "" } }
};

// Load database
if (fs.existsSync(DB_PATH)) {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    db = JSON.parse(raw);
    if (!db.users) db.users = {};
  } catch (err) {
    console.error('[Database] Yüklenirken hata oluştu, yeni veri tabanı oluşturuluyor:', err);
  }
}

// Save database safely
function save() {
  try {
    const tempPath = DB_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
  } catch (err) {
    console.error('[Database] Kaydedilirken hata oluştu:', err);
  }
}

function getUserKey(guildId, userId) {
  return `${guildId}-${userId}`;
}

const Database = {
  getUser(guildId, userId, defaultUsername = 'Bilinmeyen Kullanıcı', defaultAvatar = '') {
    const key = getUserKey(guildId, userId);
    if (!db.users[key]) {
      db.users[key] = {
        guildId,
        userId,
        voiceTime: 0,
        xp: 0,
        level: 0,
        tracksPlayed: 0,
        username: defaultUsername,
        avatar: defaultAvatar,
        lastActive: Date.now()
      };
      save();
    }
    return db.users[key];
  },

  addVoiceTime(guildId, userId, ms, username, avatar) {
    const user = this.getUser(guildId, userId, username, avatar);
    user.voiceTime += ms;
    
    // XP Calculation: 1 minute in voice = 10 XP
    const minutes = ms / 60000;
    const xpToAdd = Math.floor(minutes * 10);
    if (xpToAdd > 0) {
      user.xp += xpToAdd;
      
      // Level up calculation: Level = floor(sqrt(xp / 100))
      // e.g. Level 1 = 100 XP, Level 2 = 400 XP, Level 3 = 900 XP, etc.
      const newLevel = Math.floor(Math.sqrt(user.xp / 100));
      if (newLevel > user.level) {
        user.level = newLevel;
      }
    }
    
    if (username) user.username = username;
    if (avatar) user.avatar = avatar;
    user.lastActive = Date.now();
    save();
    return user;
  },

  addTrackPlayed(guildId, userId, username, avatar) {
    const user = this.getUser(guildId, userId, username, avatar);
    user.tracksPlayed += 1;
    // XP reward for listening to a track: 15 XP
    user.xp += 15;
    const newLevel = Math.floor(Math.sqrt(user.xp / 100));
    if (newLevel > user.level) {
      user.level = newLevel;
    }
    
    if (username) user.username = username;
    if (avatar) user.avatar = avatar;
    user.lastActive = Date.now();
    save();
    return user;
  },

  getLeaderboard(guildId, type = 'voice') {
    // type: 'voice' (voiceTime) or 'tracks' (tracksPlayed)
    const list = Object.values(db.users)
      .filter(u => u.guildId === guildId)
      .map(u => ({ ...u }));

    if (type === 'voice') {
      list.sort((a, b) => b.voiceTime - a.voiceTime);
    } else {
      list.sort((a, b) => b.tracksPlayed - a.tracksPlayed);
    }
    return list;
  },

  getUserRank(guildId, userId) {
    const list = this.getLeaderboard(guildId, 'voice');
    const index = list.findIndex(u => u.userId === userId);
    return index !== -1 ? index + 1 : list.length + 1;
  }
};

module.exports = Database;
