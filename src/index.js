require('dotenv').config({ path: 'sudekuenv.env' }); // Load from their specific filename
require('dotenv').config(); // Also load standard .env if present

const { Client, GatewayIntentBits, REST, Routes, Events } = require('discord.js');
const PlayerManager = require('./player/PlayerManager');
const Database = require('./database');
const { commands } = require('./commands');
const EMOJIS = require('./utils/emojis');
const { ensureYtDlp, getFfmpegPath } = require('./player/ytDlp');
const chatEngine = require('./ai/chatEngine');

const TOKEN = process.env.Token || process.env.TOKEN;

function isPermissionError(error) {
  return [50001, 50013].includes(error?.code)
    || /missing permissions|missing access|forbidden/i.test(error?.message || '');
}

if (!TOKEN) {
  console.error("HATA: sudekuenv.env veya .env dosyasında 'Token' tanımlanmamış!");
  process.exit(1);
}

// Create client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
 GatewayIntentBits.MessageContent
  ]
});

// Create Player Manager
const playerManager = new PlayerManager(client);
client.playerManager = playerManager;

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`[Bot] ${readyClient.user.tag} olarak giriş yapıldı!`);
  await EMOJIS.init(readyClient);

  // Periyodik ses süresi takibi (her 30 saniyede bir)
  setInterval(() => {
    try {
      readyClient.guilds.cache.forEach(guild => {
        const queue = playerManager.getQueue(guild.id);
        if (queue && queue.voiceChannelId) {
          const channel = guild.channels.cache.get(queue.voiceChannelId);
          if (channel && channel.members) {
            const isPlaying = queue.currentTrack && !queue.paused;
            if (isPlaying) {
              channel.members.forEach(member => {
                if (member.user.bot) return;
                if (member.voice.selfDeaf || member.voice.serverDeaf) return;

                Database.addVoiceTime(
                  guild.id,
                  member.id,
                  30000,
                  member.user.username,
                  member.user.displayAvatarURL({ extension: 'png', size: 128 })
                );
              });
            }
          }
        }
      });
    } catch (err) {
      console.error('[Voice Tracker Error]', err);
      }
    }, 30000);

  // Set activity
  readyClient.user.setActivity({
    name: 'Sudeku Music | /play',
    type: 2 // Listening
  });

  try {
    const ytPath = await ensureYtDlp();
    console.log(`[Runtime] yt-dlp hazır: ${ytPath}`);
  } catch (err) {
    console.warn('[Runtime] yt-dlp otomatik hazırlanamadı:', err.message || err);
  }

  const ffmpegPath = getFfmpegPath();
  console.log(`[Runtime] ffmpeg: ${ffmpegPath || 'bulunamadı (ffmpeg-static/PATH kontrol edin)'}`);

  // Register slash commands
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    console.log('[Commands] Slash komutları kaydediliyor.');

    const commandData = commands.map(c => c.data.toJSON());

    // Register globally
    await rest.put(
      Routes.applicationCommands(readyClient.user.id),
      { body: commandData }
    );
    console.log('[Commands] Global slash komutları başarıyla kaydedildi.');

    // Clear legacy test-guild commands to avoid duplicates
    const legacyTestGuildId = '1442997310735913053';
    try {
      await rest.put(
        Routes.applicationGuildCommands(readyClient.user.id, legacyTestGuildId), { body: [] }
      );
      console.log(`[Commands] ${legacyTestGuildId} sunucusundaki eski yerel komutlar temizlendi.`);
    } catch (e) {
      console.log('[Commands] Eski test sunucusu temizliği atlandı veya hata verdi.');
    }
  } catch (error) {
    console.error('[Commands] Hata:', error);
  }
});

// Handle Interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commands.find(c => c.data.name === interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, playerManager);
    } catch (error) {
      console.error(`[Interaction Error] Command: ${interaction.commandName}`, error);
      const replyOptions = {
        content: isPermissionError(error)
          ? 'Buna iznim yok. Yetkim olmadığı için bunu yapamadım.'
          : 'Komut çalıştırılırken bir hata oluştu!',
        flags: 64
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(replyOptions).catch(() => {});
      } else {
        await interaction.reply(replyOptions).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton()) {
    try {
      if (!String(interaction.customId || '').startsWith('music_')) {
        return;
      }

      // Music Buttons
      const queue = playerManager.getQueue(interaction.guildId);
      if (!queue) {
        return interaction.reply({ content: 'Aktif bir müzik oynatıcısı bulunamadı.', flags: 64 });
      }

      const memberVoice = interaction.member.voice.channel;
      if (!memberVoice || memberVoice.id !== queue.voiceChannelId) {
        return interaction.reply({ content: 'Bu butonları kullanabilmek için bot ile aynı ses kanalında olmalısınız!', flags: 64 });
      }

      try {
        await interaction.deferUpdate();
      } catch (e) {
        return;
      }

      switch (interaction.customId) {
        case 'music_prev': {
          const success = await queue.playPrevious();
          if (!success) {
            await interaction.followUp({ content: 'Geri alınabilecek geçmişte bir şarkı bulunamadı!', flags: 64 }).catch(() => {});
          }
          break;
        }
        case 'music_play_pause': {
          if (queue.paused) {
            queue.resume();
          } else {
            queue.pause();
          }
          break;
        }
        case 'music_skip': {
          queue.skip();
          break;
        }
        case 'music_stop': {
          queue.stop();
          break;
        }
        case 'music_loop': {
          const nextMode = (queue.loopMode + 1) % 3;
          queue.setLoopMode(nextMode);
          break;
        }
        case 'music_autoplay': {
          queue.setAutoplay(!queue.autoplay);
          break;
        }
      }
    } catch (error) {
      console.error('[Button Error]', interaction.customId, error);
      const message = isPermissionError(error)
        ? 'Buna iznim yok. Yetkim olmadığı için bunu yapamadım.'
        : 'Buton işlenirken bir hata oluştu.';

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, flags: 64 }).catch(() => {});
      } else {
        await interaction.reply({ content: message, flags: 64 }).catch(() => {});
      }
    }
  }
});


const xpCooldowns = new Set();

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const isDM = !message.guild;
  const isMentioned = !isDM && (message.mentions?.users?.has?.(client.user.id) || new RegExp(`^<@!?${client.user.id}>`).test(message.content));

  if (isDM || isMentioned) {
    try {
      const cleanContent = message.content
        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
        .trim();
      const result = await chatEngine.replyRich({
        userId: message.author.id,
        userName: message.author.username,
        channelId: message.channelId,
        guildId: message.guildId || 'dm',
        guild: message.guild || null,
        content: cleanContent || message.content,
      });

      const reply = await message.reply({ content: result.content, allowedMentions: { repliedUser: false } });
      if (Array.isArray(result.actions?.react)) {
        for (const emoji of result.actions.react.slice(0, 3)) {
          await reply.react(emoji).catch(() => {});
        }
      } else if (result.actions?.useEmoji) {
        await reply.react(result.actions.useEmoji).catch(() => {});
      }
    } catch (error) {
      console.error('[AI Reply Error]', error);
    }
    return;
  }

  if (!message.guild) return;

  // XP / LEVELING SYSTEM (15s cooldown per user)
  if (!xpCooldowns.has(message.author.id)) {
    xpCooldowns.add(message.author.id);
    setTimeout(() => xpCooldowns.delete(message.author.id), 15000);

    const xpToAdd = Math.floor(Math.random() * 4) + 2;
    const dbUser = Database.getUser(message.guildId, message.author.id, message.author.username, message.author.displayAvatarURL({ extension: 'png', size: 128 }));
    const newXp = dbUser.xp + xpToAdd;
    const newLevel = Math.floor(Math.sqrt(newXp / 100));

    Database.updateUser(message.guildId, message.author.id, {
      xp: newXp,
      level: newLevel,
      lastActive: Date.now()
    });

    if (newLevel > dbUser.level) {
      message.channel.send({
        content: `${EMOJIS.star} Tebrikler ${message.author}! Seviye atladın! Yeni seviyen: **${newLevel}**`
      }).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      }).catch(() => {});
    }
  }

  // PREFIX COMMAND HANDLER
  const prefixes = ['a.', 'a!'];
  let prefix = null;
  for (const p of prefixes) {
    if (message.content.startsWith(p)) {
      prefix = p;
      break;
    }
  }

  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = commands.find(c => c.data.name === commandName || (c.aliases && c.aliases.includes(commandName)));
  if (!command) return;

  try {
    if (typeof command.run === 'function') {
      await command.run(message, args, client, prefix);
    } else {
      message.reply(`${EMOJIS.cross} Bu komut şu an prefix ile çalıştırılamıyor.`);
    }
  } catch (error) {
    console.error(`[Command Error] Command: ${commandName}`, error);
    message.reply(`${EMOJIS.cross} Komut çalıştırılırken bir hata oluştu! Hata: \`${error.message}\``).catch(() => {});
  }
});

// Handle clean shutdown
process.on('SIGINT', () => {
  console.log('[Shutdown] Bot kapatılıyor.');
  for (const queue of playerManager.queues.values()) {
    queue.destroy();
  }
  client.destroy();
  process.exit(0);
});

// Login
client.login(TOKEN).catch(err => {
  console.error("Bot giriş yaparken hata verdi:", err);
  process.exit(1);
});

module.exports = client;
