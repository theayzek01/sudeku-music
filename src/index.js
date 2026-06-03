require('dotenv').config({ path: 'sudekuenv.env' }); // Load from their specific filename
require('dotenv').config(); // Also load standard .env if present

const { Client, GatewayIntentBits, REST, Routes, Events, AttachmentBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const path = require('path');
const PlayerManager = require('./player/PlayerManager');
const DashboardServer = require('./dashboard/server');
const Database = require('./database');
const { commands } = require('./commands');
const EMOJIS = require('./utils/emojis');
const chatEngine = require('./ai/services/chatEngine');

const TOKEN = process.env.Token || process.env.TOKEN;
const PORT = process.env.PORT || 3000;

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

  // Periyodik Ses Kanalı Stats Takibi (Her 30 saniyede bir)
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
    name: 'Sudeku Music | /play & /dashboard',
    type: 2 // Listening
  });

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

    // Also register on their primary server instantly for instant testing
    const testGuildId = "1442997310735913053";
    try {
      await rest.put(
        Routes.applicationGuildCommands(readyClient.user.id, testGuildId), { body: commandData }
      );
      console.log(`[Commands] ${testGuildId} sunucusunda yerel komutlar başarıyla güncellendi (anında aktif olması için).`);
    } catch (e) {
      console.log(`[Commands] Test sunucusuna özel kaydetme atlandı veya hata verdi.`);
    }
  } catch (error) {
    console.error('[Commands] Hata:', error);
  }

  // Start the Dashboard
  const dashboard = new DashboardServer(readyClient, playerManager, PORT);
  dashboard.start();
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
      const replyOptions = { content: 'Komut çalıştırılırken bir hata oluştu!', flags: 64 };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(replyOptions).catch(() => {});
      } else {
        await interaction.reply(replyOptions).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton()) {
    // Ticket buttons handling
    if (interaction.customId === 'ticket_create') {
      const config = Database.getGuildConfig(interaction.guildId);
      if (!config || !config.ticketCategoryId) {
        return interaction.reply({ content: `${EMOJIS.cross} Sunucuda bilet kategorisi henüz ayarlanmamış!`, flags: 64 });
      }
      try {
        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: config.ticketCategoryId,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            }
          ]
        });

        Database.createTicket(interaction.guildId, channel.id, interaction.user.id);

        const embed = {
          title: `Sudeku Bilet Sistemi`,
          description: `Merhaba <@${interaction.user.id}>, destek talebiniz oluşturuldu! Yetkililerimiz en kısa sürede yardımcı olacaktır. Sorununuzu buraya yazabilirsiniz.`,
          color: 0x8b5cf6,
          timestamp: new Date().toISOString()
        };

        const btnClose = new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('Bileti Kapat')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(btnClose);

        await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
        return interaction.reply({ content: `${EMOJIS.tick} Biletiniz oluşturuldu: <#${channel.id}>`, flags: 64 });
      } catch (err) {
        console.error('[Ticket Create Error]', err);
        return interaction.reply({ content: `${EMOJIS.cross} Bilet kanalı oluşturulurken hata oluştu!`, flags: 64 });
      }
    }

    if (interaction.customId === 'ticket_close') {
      const ticketInfo = Database.getTicket(interaction.channelId);
      if (!ticketInfo) {
        return interaction.reply({ content: `${EMOJIS.cross} Bu kanal aktif bir bilet kanalı değil!`, flags: 64 });
      }

      await interaction.reply({ content: `${EMOJIS.loading} Bilet kapatılıyor ve kanal 5 saniye içinde siliniyor...` });
      Database.closeTicket(interaction.channelId);

      setTimeout(async () => {
        await interaction.channel.delete().catch(() => {});
      }, 5000);
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
  }
});


const spamCache = new Map();
const xpCooldowns = new Set();

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  // AI Direct Mention / Reply Trigger
  const botMentioned = message.mentions.has(client.user.id) && !message.mentions.everyone;
  const isReplyToBot = message.reference && await message.channel.messages.fetch(message.reference.messageId)
    .then(m => m.author.id === client.user.id)
    .catch(() => false);

  if (botMentioned || isReplyToBot) {
    const rawContent = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();

    await message.channel.sendTyping().catch(() => null);

    const result = await chatEngine.replyRich({
      userId: message.author.id,
      userName: message.author.username,
      channelId: message.channelId,
      guildId: message.guildId,
      guild: message.guild,
      content: rawContent || "merhaba",
    });

    const typingDelay = Math.min(1600, Math.max(450, (result.content || '').length * 12));
    await new Promise(resolve => setTimeout(resolve, typingDelay));

    const sent = await message.reply({
      content: result.content,
      allowedMentions: { repliedUser: false }
    }).catch(() => null);

    if (sent && result.actions?.react) {
      const reacts = Array.isArray(result.actions.react) ? result.actions.react : [result.actions.react];
      for (const r of reacts) {
        await sent.react(r).catch(() => null);
      }
    }
    return;
  }

  // 1. AFK CHECK (Welcoming back the AFK user)
  const userAfk = Database.getAfk(message.guildId, message.author.id);
  if (userAfk) {
    Database.removeAfk(message.guildId, message.author.id);
    const duration = Date.now() - userAfk.t;
    const durSec = Math.floor(duration / 1000);
    const durMin = Math.floor(durSec / 60);
    const durText = durMin > 0 ? `${durMin} dakika` : `${durSec} saniye`;
    
    const welcomeBackMsg = await message.reply({
      content: `${EMOJIS.tick} Hoş geldin **${message.author.username}**! AFK durumun kaldırıldı. (${durText} boyunca uzaktaydın)`
    }).catch(() => null);
    
    if (welcomeBackMsg) {
      setTimeout(() => welcomeBackMsg.delete().catch(() => {}), 5000);
    }
  }

  // 2. AFK CHECK (Mentions check)
  if (message.mentions.users.size > 0) {
    for (const [userId, user] of message.mentions.users) {
      if (userId === message.author.id) continue;
      const targetAfk = Database.getAfk(message.guildId, userId);
      if (targetAfk) {
        const duration = Date.now() - targetAfk.t;
        const durSec = Math.floor(duration / 1000);
        const durMin = Math.floor(durSec / 60);
        const durText = durMin > 0 ? `${durMin} dakika` : `${durSec} saniye`;

        message.reply({
          embeds: [{
            description: `${EMOJIS.moon} **${user.username}** şu an AFK!\n\n**Sebep:** \`${targetAfk.reason}\`\n**Süre:** \`${durText} önce\``,
            color: 0x8b5cf6
          }]
        }).catch(() => {});
      }
    }
  }

  // 3. AUTOMOD FILTERS (Skip for Administrators)
  const isAdm = message.member?.permissions.has(PermissionFlagsBits.Administrator);
  if (!isAdm) {
    const config = Database.getGuildConfig(message.guildId);

    // Swear Filter
    if (config.swearFilter === 1) {
      const swearRegex = /amına|amk|sik|göt|piç|yarrak|pezevenk|oç|orospu|siktir/i;
      if (swearRegex.test(message.content)) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send(`${message.author}, bu sunucuda küfür etmek yasaktır! ${EMOJIS.cross}`);
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return;
      }
    }

    // Invite Filter
    if (config.inviteFilter === 1) {
      const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/i;
      if (inviteRegex.test(message.content)) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send(`${message.author}, bu sunucuda davet linki paylaşmak yasaktır! ${EMOJIS.cross}`);
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return;
      }
    }

    // Link Filter
    if (config.linkFilter === 1) {
      const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&\/\/=]*)/i;
      const isPlayCmd = message.content.startsWith('a.play') || message.content.startsWith('a.p') || message.content.startsWith('a!play') || message.content.startsWith('a!p');
      if (linkRegex.test(message.content) && !isPlayCmd) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send(`${message.author}, bu sunucuda link paylaşmak yasaktır! ${EMOJIS.cross}`);
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return;
      }
    }

    // Spam Filter
    if (config.spamFilter === 1) {
      const now = Date.now();
      const userSpam = spamCache.get(message.author.id) || [];
      const recent = userSpam.filter(t => now - t < 4000);
      recent.push(now);
      spamCache.set(message.author.id, recent);

      if (recent.length > 5) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send(`${message.author}, lütfen çok hızlı mesaj göndermeyin (Spam Koruması)! ${EMOJIS.cross}`);
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return;
      }
    }
  }

  // 4. XP / LEVELING SYSTEM (15s cooldown per user)
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
        content: `${EMOJIS.giveaway} Tebrikler ${message.author}! Seviye atladın! Yeni seviyen: **${newLevel}** ${EMOJIS.star}`
      }).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      }).catch(() => {});
    }
  }

  // 5. PREFIX COMMAND HANDLER
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
