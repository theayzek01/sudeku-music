require('dotenv').config({ path: 'sudekuenv.env' }); // Load from their specific filename
require('dotenv').config(); // Also load standard .env if present

const { Client, GatewayIntentBits, REST, Routes, Events, AttachmentBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const path = require('path');
const PlayerManager = require('./player/PlayerManager');
const DashboardServer = require('./dashboard/server');
const { commands } = require('./commands');

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

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`[Bot] ${readyClient.user.tag} olarak giriş yapıldı!`);

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

// Emojis mapping for message commands
const EMOJIS = {
  spotify: "<:kanserspotify:1473947599256944751>",
  youtube: "<a:kanseryoutube:1473947604432977941>",
  loading: "<a:kanserload:1473947555283865765>",
  verify: "<a:kanserVerify:1473947440553136178>",
  tick: "<:kansertik:1500939716961505372>",
  cross: "<:kanserred:1473947453471457483>",
  note: "<a:kansernote:1445409966197313656>",
  voice: "<:kanservcb:1473947473197269084>",
  mute: "<:kanservmute:1500941934858866858>",
  moon: "<a:kansermoon:1459736359437598741>",
  status: "<:kanserstatus:1500946084749381663>",
  star: "<a:kanserystar:1459461708039852187>",
  stars: "<a:kanserystar:1459461708039852187>",
  crown: "<a:kansergscrown:1445409864049229996>",
  gear: "<a:kanserayar:1473947629443612672>"
};

function parseEmoji(emojiStr) {
  if (!emojiStr) return null;
  const match = emojiStr.match(/<(a?):([^:]+):(\d+)>/);
  if (match) {
    return {
      animated: match[1] === 'a',
      name: match[2],
      id: match[3]
    };
  }
  return null;
}

function getHelpEmbed(category, client, guildId) {
  const avatarUrl = client.user.displayAvatarURL();
  const baseEmbed = {
    color: 0x8b5cf6,
    thumbnail: { url: avatarUrl },
    image: { url: 'attachment://sudekubanner.png' },
    footer: { text: `Sudeku Music • Kategori: ${category.toUpperCase().replace('HELP_', '')} • Sunucu ID: ${guildId}` }
  };

  switch (category) {
    case 'help_music':
      return {
        ...baseEmbed,
        title: `${EMOJIS.crown} Müzik Çalma Komutları`,
        description: `Müzik çalmak ve temel oynatıcıyı kontrol etmek için kullanabileceğiniz komutlar:\n\n` +
          `• \`/play\` | \`a.play <sorgu>\` : YouTube/Spotify araması yapar veya direkt link çalar.\n` +
          `• \`/skip\` | \`a.skip\` : Çalan şarkıyı atlayarak sıradaki şarkıya geçer.\n` +
          `• \`/pause\` | \`a.pause\` : Oynatılan müziği geçici olarak duraklatır.\n` +
          `• \`/resume\` | \`a.resume\` : Duraklatılan müziği kaldığı yerden devam ettirir.\n` +
          `• \`/stop\` | \`a.stop\` : Müzik çalmayı durdurur, sırayı temizler ve kanaldan ayrılır.`
      };
    case 'help_queue':
      return {
        ...baseEmbed,
        title: `${EMOJIS.status} Sıralama & Döngü Komutları`,
        description: `Şarkı sırasını ve döngü ayarlarını kontrol etmek için kullanabileceğiniz komutlar:\n\n` +
          `• \`/queue\` | \`a.queue\` : Sıradaki şarkıları, çalan şarkıyı ve toplam süreyi listeler.\n` +
          `• \`/nowplaying\` | \`a.nowplaying\` : Detaylı ilerleme çubuğu ve şarkı kartını gösterir.\n` +
          `• \`/loop\` | \`a.loop <mod>\` : Döngüyü ayarlar (0: Kapat, 1: Şarkı, 2: Tüm Sıra).\n` +
          `• \`/shuffle\` | \`a.shuffle\` : Sıradaki tüm parçaları rastgele sırayla karıştırır.\n` +
          `• \`/clear\` | \`a.clear\` : Sıradaki tüm şarkıları anında temizler.`
      };
    case 'help_settings':
      return {
        ...baseEmbed,
        title: `${EMOJIS.gear} İnce Ayarlar & Sistem`,
        description: `Ses kalitesi ayarlamak ve bot durumunu gözlemlemek için kullanabileceğiniz komutlar:\n\n` +
          `• \`/volume\` | \`a.volume <0-100>\` : Ses düzeyini pürüzsüzce ayarlar.\n` +
          `• \`/stats\` | \`a.stats\` : Botun canlı gecikme, RAM, CPU ve sistem durumunu görüntüler.`
      };
    case 'help_home':
    default:
      return {
        ...baseEmbed,
        title: `${EMOJIS.moon} Sudeku Music - Yardım Kılavuzu`,
        description: `Sudeku, üstün ses kalitesi, dinamik görsel oynatıcı kartları ve gelişmiş platform entegrasyonuyla donatılmış yeni nesil bir müzik botudur.\n\n` +
          `Aşağıdaki açılır menüyü kullanarak öğrenmek istediğiniz komut kategorisini seçebilirsiniz.\n\n` +
          `${EMOJIS.star} **Kullanım Prefiksleri:** \`/\` (Slash), \`a.\` veya \`a!\` (Mesaj Prefiksi)\n` +
          `${EMOJIS.voice} **Ses Altyapısı:** En yüksek bit hızına sahip \`Opus\` akışlarıyla kesintisiz çalma sunar.`
      };
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

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

  // PLAY COMMAND
  if (commandName === 'play' || commandName === 'p') {
    const query = args.join(' ');
    if (!query) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Lütfen bir şarkı ismi veya YouTube/Spotify linki girin!**`
        }]
      });
    }

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Önce bir ses kanalına katılmalısınız!**`
        }]
      });
    }

    const loadingMsg = await message.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.loading} **Şarkı aranıyor...**`
      }]
    });

    try {
      const { search } = require('./player/search');
      const tracks = await search(query, message.author);
      if (tracks.length === 0) {
        return loadingMsg.edit({
          embeds: [{
            color: 0xff3333,
            description: `${EMOJIS.cross} **Sonuç bulunamadı!**`
          }]
        });
      }

      const queue = playerManager.getOrCreateQueue(message.guildId, voiceChannel.id, message.channel);
      queue.addTrack(tracks);

      if (tracks.length > 1) {
        return loadingMsg.edit({
          embeds: [{
            color: 0x5a189a,
            description: `${EMOJIS.tick} **${tracks.length} şarkı** başarıyla sıraya eklendi.`
          }]
        });
      } else {
        return loadingMsg.edit({
          embeds: [{
            color: 0x5a189a,
            description: `${EMOJIS.tick} [**${tracks[0].title}**](${tracks[0].url || tracks[0].spotifyUrl}) sıraya eklendi.`
          }]
        });
      }
    } catch (err) {
      console.error(err);
      return loadingMsg.edit({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} Şarkı eklenirken hata oluştu: \`${err.message}\``
        }]
      });
    }
  }

  // SKIP COMMAND
  if (commandName === 'skip' || commandName === 's') {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Şu an çalan bir şarkı bulunmuyor!**`
        }]
      });
    }
    queue.skip();
    return message.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.tick} **Şarkı başarıyla geçildi.**`
      }]
    });
  }

  // PAUSE COMMAND
  if (commandName === 'pause') {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue) return message.reply(`${EMOJIS.cross} Aktif bir çalma oturumu yok!`);
    if (queue.paused) return message.reply(`Şarkı zaten duraklatılmış!`);

    queue.pause();
    return message.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.tick} **Müzik duraklatıldı.**`
      }]
    });
  }

  // RESUME COMMAND
  if (commandName === 'resume') {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue) return message.reply(`${EMOJIS.cross} Aktif bir çalma oturumu yok!`);
    if (!queue.paused) return message.reply(`Şarkı zaten oynatılıyor!`);

    queue.resume();
    return message.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.tick} **Müzik devam ettiriliyor.**`
      }]
    });
  }

  // STOP COMMAND
  if (commandName === 'stop' || commandName === 'leave' || commandName === 'dc') {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue) return message.reply(`${EMOJIS.cross} Aktif bir çalma oturumu yok!`);

    queue.destroy();
    return message.reply({
      embeds: [{
        color: 0x121214,
        description: `${EMOJIS.moon} **Müzik durduruldu, sıradan çıkıldı.**`
      }]
    });
  }

  // QUEUE COMMAND
  if (commandName === 'queue' || commandName === 'q') {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue) {
      return message.reply(`Sırada şarkı bulunmuyor.`);
    }

    const list = queue.tracks.slice(0, 10).map((t, idx) => {
      return `\`${idx + 1}.\` [**${t.title}**](${t.url || t.spotifyUrl}) | \`${t.duration}\``;
    }).join('\n');

    const desc = `**Şu An Çalıyor:**\n[**${queue.currentTrack?.title || 'Hiçbiri'}**](${queue.currentTrack?.url || queue.currentTrack?.spotifyUrl})\n\n**Sıra:**\n${list || '*Kuyruk boş.*'}`;

    return message.reply({
      embeds: [{
        title: `${EMOJIS.note} Çalma Sırası`,
        description: desc,
        color: 0x5a189a,
        footer: { text: `Toplam ${queue.tracks.length} şarkı var.` }
      }]
    });
  }

  // NOW PLAYING COMMAND
  if (commandName === 'nowplaying' || commandName === 'np') {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || !queue.currentTrack) {
      return message.reply(`Şu an hiçbir şey çalmıyor.`);
    }

    const pb = queue.getProgressBar(15);
    const ct = queue.playbackTimeMs;
    const { formatMs } = require('./commands/index');

    return message.reply({
      embeds: [{
        title: `Şu An Oynatılıyor`,
        description: `${EMOJIS.note} [**${queue.currentTrack.title}**](${queue.currentTrack.url || queue.currentTrack.spotifyUrl})\n\n${pb} \`[${formatMs(ct)} / ${queue.currentTrack.duration}]\`\n\n**İsteyen:** <@${queue.currentTrack.requester.id}>`,
        thumbnail: { url: queue.currentTrack.thumbnail },
        color: 0x5a189a
      }]
    });
  }

  // VOLUME COMMAND
  if (commandName === 'volume' || commandName === 'vol') {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue) return message.reply(`${EMOJIS.cross} Aktif bir çalma oturumu yok!`);

    const vol = parseInt(args[0], 10);
    if (isNaN(vol) || vol < 0 || vol > 100) {
      return message.reply(`${EMOJIS.cross} Lütfen 0 ile 100 arasında geçerli bir ses seviyesi belirtin!`);
    }

    queue.setVolume(vol);
    return message.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.tick} **Ses düzeyi %${vol} olarak ayarlandı.**`
      }]
    });
  }

  // LOOP COMMAND
  if (commandName === 'loop') {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue) return message.reply(`${EMOJIS.cross} Aktif bir çalma oturumu yok!`);

    let mode = parseInt(args[0], 10);
    if (isNaN(mode) || mode < 0 || mode > 2) {
      mode = (queue.loopMode + 1) % 3;
    }

    queue.setLoopMode(mode);
    const modes = ['Kapatıldı', 'Şarkı döngüye alındı', 'Tüm sıra döngüye alındı'];
    return message.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.tick} **Döngü modu: ${modes[mode]}**`
      }]
    });
  }

  // SHUFFLE COMMAND
  if (commandName === 'shuffle') {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || queue.tracks.length === 0) {
      return message.reply(`${EMOJIS.cross} Sıra boş olduğu için karıştırılamadı!`);
    }

    queue.shuffle();
    return message.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.tick} **Çalma sırası karıştırıldı.**`
      }]
    });
  }

  // CLEAR COMMAND
  if (commandName === 'clear') {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue) return message.reply(`${EMOJIS.cross} Aktif bir çalma oturumu yok!`);

    queue.clear();
    return message.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.tick} **Çalma sırası temizlendi.**`
      }]
    });
  }

  // STATS COMMAND
  if (commandName === 'stats' || commandName === 'stat' || commandName === 'ping') {
    const os = require('os');
    const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
    const rss = process.memoryUsage().rss / 1024 / 1024;
    const totalMem = os.totalmem() / 1024 / 1024 / 1024;
    const freeMem = os.freemem() / 1024 / 1024 / 1024;
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model.replace(/\(R\)|\(TM\)/g, "").trim() : "Bilinmiyor";

    const loadAvg = os.loadavg();
    const cpuUsagePct = ((loadAvg[0] / Math.max(1, os.cpus().length)) * 100).toFixed(1);

    const ping = Math.round(message.client.ws.ping || 0);
    const { formatMs } = require('./commands/index');
    const uptime = formatMs(message.client.uptime);
    const guildsCount = message.client.guilds.cache.size;
    const activePlayersCount = playerManager ? playerManager.queues.size : 0;

    return message.reply({
      embeds: [{
        title: `${EMOJIS.status} Sudeku Music - Canli Sistem Durumu`,
        color: 0x8b5cf6,
        fields: [
          {
            name: "📊 Genel Performans",
            value:
              `• **Gecikme (Ping):** \`${ping} ms\`\n` +
              `• **Calisma Suresi:** \`${uptime}\`\n` +
              `• **Aktif Ses Odalari:** \`${activePlayersCount} aktif oturum\`\n` +
              `• **Toplam Sunucular:** \`${guildsCount} sunucu\``,
            inline: true
          },
          {
            name: "⚙️ Sistem Kaynaklari",
            value:
              `• **Bellek (Heap):** \`${heapUsed.toFixed(1)} MB\`\n` +
              `• **Bellek (RSS):** \`${rss.toFixed(1)} MB\`\n` +
              `• **Sunucu RAM:** \`${usedMem.toFixed(1)} GB / ${totalMem.toFixed(1)} GB\`\n` +
              `• **CPU Yuku:** \`${Math.min(100, Math.max(0, parseFloat(cpuUsagePct))).toFixed(1)}%\``,
            inline: true
          },
          {
            name: "💻 Sunucu Detaylari",
            value:
              `• **Islemci Modeli:** \`${cpuModel} (${cpus.length} Cekirdek)\`\n` +
              `• **Node.js Surumu:** \`${process.version}\`\n` +
              `• **Platform:** \`${os.platform()} (${os.arch()})\``
          }
        ],
        thumbnail: { url: message.client.user.displayAvatarURL() },
        timestamp: new Date().toISOString(),
        footer: { text: "Sudeku Muzik Performans Izleyicisi" }
      }]
    });
  }

  // HELP COMMAND
  if (commandName === 'help' || commandName === 'h') {
    const bannerPath = path.join(__dirname, '../assets/sudekubanner.png');
    const bannerAttachment = new AttachmentBuilder(bannerPath, { name: 'sudekubanner.png' });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_select')
      .setPlaceholder('Lütfen incelemek istediğiniz kategoriyi seçin...')
      .addOptions([
        {
          label: 'Ana Menü',
          description: 'Sudeku Music genel bilgileri ve kılavuz.',
          value: 'help_home',
          emoji: parseEmoji(EMOJIS.moon)
        },
        {
          label: 'Müzik Çalma Komutları',
          description: 'Şarkı arama, çalma, durdurma, atlama komutları.',
          value: 'help_music',
          emoji: parseEmoji(EMOJIS.crown)
        },
        {
          label: 'Sıra & Döngü Komutları',
          description: 'Oynatma listesi, döngü, karıştırma ve sırayı temizleme.',
          value: 'help_queue',
          emoji: parseEmoji(EMOJIS.status)
        },
        {
          label: 'İnce Ayarlar & Sistem',
          description: 'Ses seviyesi ayarı ve canlı bot istatistikleri.',
          value: 'help_settings',
          emoji: parseEmoji(EMOJIS.gear)
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const homeEmbed = getHelpEmbed('help_home', message.client, message.guildId);

    const response = await message.reply({
      files: [bannerAttachment],
      embeds: [homeEmbed],
      components: [row]
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000 // 2 minutes
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: 'Bu menüyü sadece komutu kullanan kişi yönetebilir.', ephemeral: true });
      }

      const selectedValue = i.values[0];
      const updatedEmbed = getHelpEmbed(selectedValue, message.client, message.guildId);

      await i.update({
        embeds: [updatedEmbed]
      });
    });

    collector.on('end', async () => {
      const disabledSelectMenu = StringSelectMenuBuilder.from(selectMenu).setDisabled(true);
      const disabledRow = new ActionRowBuilder().addComponents(disabledSelectMenu);
      await response.edit({
        components: [disabledRow]
      }).catch(() => {});
    });
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
