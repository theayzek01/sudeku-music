const os = require('os');
const path = require('path');
const { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, ButtonBuilder, ButtonStyle } = require('discord.js');
const { search } = require('../player/search');
const Database = require('../database');
const { generateRankCard } = require('../player/canvasGenerator');

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

const commands = [
  // PLAY
  {
    data: new SlashCommandBuilder()
      .setName('play')
      .setDescription('Müzik çalar veya sıraya ekler.')
      .addStringOption(option =>
        option.setName('sorgu')
          .setDescription('Şarkı adı veya YouTube / Spotify bağlantısı.')
          .setRequired(true)),
    async execute(interaction, playerManager) {
      await interaction.deferReply();
      const query = interaction.options.getString('sorgu');
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply({
          embeds: [{
            color: 0xff3333,
            description: `${EMOJIS.cross} **Bir ses kanalında olmalısınız!**`
          }]
        });
      }

      try {
        const tracks = await search(query, interaction.user);
        if (tracks.length === 0) {
          return interaction.editReply({
            embeds: [{
              color: 0xff3333,
              description: `${EMOJIS.cross} **Sonuç bulunamadı!**`
            }]
          });
        }

        const queue = playerManager.getOrCreateQueue(interaction.guildId, voiceChannel.id, interaction.channel);
        queue.addTrack(tracks);

        if (tracks.length > 1) {
          return interaction.editReply({
            embeds: [{
              color: 0x5a189a,
              description: `${EMOJIS.tick} **${tracks.length} şarkı** başarıyla sıraya eklendi.`
            }]
          });
        } else {
          return interaction.editReply({
            embeds: [{
              color: 0x5a189a,
              description: `${EMOJIS.tick} [**${tracks[0].title}**](${tracks[0].url || tracks[0].spotifyUrl}) sıraya eklendi.`
            }]
          });
        }
      } catch (err) {
        console.error(err);
        return interaction.editReply({
          embeds: [{
            color: 0xff3333,
            description: `${EMOJIS.cross} Şarkı eklenirken hata oluştu: \`${err.message}\``
          }]
        });
      }
    }
  },

  // SKIP
  {
    data: new SlashCommandBuilder()
      .setName('skip')
      .setDescription('Mevcut şarkıyı geçer.'),
    async execute(interaction, playerManager) {
      const queue = playerManager.getQueue(interaction.guildId);
      if (!queue || !queue.currentTrack) {
        return interaction.reply({ content: `${EMOJIS.cross} Şu an çalan bir şarkı yok!`, flags: 64 });
      }
      queue.skip();
      return interaction.reply({
        embeds: [{
          color: 0x5a189a,
          description: `${EMOJIS.tick} **Şarkı geçildi.**`
        }]
      });
    }
  },

  // PAUSE
  {
    data: new SlashCommandBuilder()
      .setName('pause')
      .setDescription('Çalmayı duraklatır.'),
    async execute(interaction, playerManager) {
      const queue = playerManager.getQueue(interaction.guildId);
      if (!queue) return interaction.reply({ content: `${EMOJIS.cross} Aktif bir çalma oturumu yok!`, flags: 64 });
      if (queue.paused) return interaction.reply({ content: `Şarkı zaten duraklatılmış!`, flags: 64 });

      queue.pause();
      return interaction.reply({
        embeds: [{
          color: 0x5a189a,
          description: `${EMOJIS.tick} **Müzik duraklatıldı.**`
        }]
      });
    }
  },

  // RESUME
  {
    data: new SlashCommandBuilder()
      .setName('resume')
      .setDescription('Çalmayı devam ettirir.'),
    async execute(interaction, playerManager) {
      const queue = playerManager.getQueue(interaction.guildId);
      if (!queue) return interaction.reply({ content: `${EMOJIS.cross} Aktif bir çalma oturumu yok!`, flags: 64 });
      if (!queue.paused) return interaction.reply({ content: `Şarkı zaten oynatılıyor!`, flags: 64 });

      queue.resume();
      return interaction.reply({
        embeds: [{
          color: 0x5a189a,
          description: `${EMOJIS.tick} **Müzik devam ettiriliyor.**`
        }]
      });
    }
  },

  // STOP
  {
    data: new SlashCommandBuilder()
      .setName('stop')
      .setDescription('Çalmayı durdurur, sırayı temizler ve kanaldan ayrılır.'),
    async execute(interaction, playerManager) {
      const queue = playerManager.getQueue(interaction.guildId);
      if (!queue) return interaction.reply({ content: `${EMOJIS.cross} Aktif bir çalma oturumu yok!`, flags: 64 });

      queue.destroy();
      return interaction.reply({
        embeds: [{
          color: 0x121214,
          description: `${EMOJIS.moon} **Müzik durduruldu, sıradan çıkıldı.**`
        }]
      });
    }
  },

  // QUEUE
  {
    data: new SlashCommandBuilder()
      .setName('queue')
      .setDescription('Sıradaki şarkıları gösterir.'),
    async execute(interaction, playerManager) {
      const queue = playerManager.getQueue(interaction.guildId);
      if (!queue) {
        return interaction.reply({ content: `Sırada şarkı bulunmuyor.`, flags: 64 });
      }

      const list = queue.tracks.slice(0, 10).map((t, idx) => {
        return `\`${idx + 1}.\` [**${t.title}**](${t.url || t.spotifyUrl}) | \`${t.duration}\``;
      }).join('\n');

      const desc = `**Şu An Çalıyor:**\n[**${queue.currentTrack?.title || 'Hiçbiri'}**](${queue.currentTrack?.url || queue.currentTrack?.spotifyUrl})\n\n**Sıra:**\n${list || '*Kuyruk boş.*'}`;

      return interaction.reply({
        embeds: [{
          title: `${EMOJIS.note} Çalma Sırası`,
          description: desc,
          color: 0x5a189a,
          footer: { text: `Toplam ${queue.tracks.length} şarkı var.` }
        }]
      });
    }
  },

  // NOW PLAYING
  {
    data: new SlashCommandBuilder()
      .setName('nowplaying')
      .setDescription('Çalan şarkıyı gösterir.'),
    async execute(interaction, playerManager) {
      const queue = playerManager.getQueue(interaction.guildId);
      if (!queue || !queue.currentTrack) {
        return interaction.reply({ content: `Şu an hiçbir şey çalmıyor.`, flags: 64 });
      }

      const pb = queue.getProgressBar(15);
      const ct = queue.playbackTimeMs;
      const tt = queue.currentTrack.durationMs;
      const durationStr = `${typeof queue.getProgressBar === 'function' ? formatMs(ct) : '00:00'} / ${queue.currentTrack.duration}`;

      return interaction.reply({
        embeds: [{
          title: `Şu An Oynatılıyor`,
          description: `${EMOJIS.note} [**${queue.currentTrack.title}**](${queue.currentTrack.url || queue.currentTrack.spotifyUrl})\n\n${pb} \`[${formatMs(ct)} / ${queue.currentTrack.duration}]\`\n\n**İsteyen:** <@${queue.currentTrack.requester.id}>`,
          thumbnail: { url: queue.currentTrack.thumbnail },
          color: 0x5a189a
        }]
      });
    }
  },

  // VOLUME
  {
    data: new SlashCommandBuilder()
      .setName('volume')
      .setDescription('Ses seviyesini ayarlar.')
      .addIntegerOption(option =>
        option.setName('seviye')
          .setDescription('Ses düzeyi (0 - 100)')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(100)),
    async execute(interaction, playerManager) {
      const queue = playerManager.getQueue(interaction.guildId);
      if (!queue) return interaction.reply({ content: `${EMOJIS.cross} Aktif bir çalma oturumu yok!`, flags: 64 });

      const vol = interaction.options.getInteger('seviye');
      queue.setVolume(vol);
      return interaction.reply({
        embeds: [{
          color: 0x5a189a,
          description: `${EMOJIS.tick} **Ses düzeyi %${vol} olarak ayarlandı.**`
        }]
      });
    }
  },

  // LOOP
  {
    data: new SlashCommandBuilder()
      .setName('loop')
      .setDescription('Döngü modunu değiştirir.')
      .addIntegerOption(option =>
        option.setName('mod')
          .setDescription('Döngü türü')
          .setRequired(true)
          .addChoices(
            { name: 'Kapat', value: 0 },
            { name: 'Şarkı', value: 1 },
            { name: 'Tüm Sıra', value: 2 }
          )),
    async execute(interaction, playerManager) {
      const queue = playerManager.getQueue(interaction.guildId);
      if (!queue) return interaction.reply({ content: `${EMOJIS.cross} Aktif bir çalma oturumu yok!`, flags: 64 });

      const mode = interaction.options.getInteger('mod');
      queue.setLoopMode(mode);

      const modes = ['Kapatıldı', 'Şarkı döngüye alındı', 'Tüm sıra döngüye alındı'];
      return interaction.reply({
        embeds: [{
          color: 0x5a189a,
          description: `${EMOJIS.tick} **Döngü modu: ${modes[mode]}**`
        }]
      });
    }
  },

  // SHUFFLE
  {
    data: new SlashCommandBuilder()
      .setName('shuffle')
      .setDescription('Çalma sırasını karıştırır.'),
    async execute(interaction, playerManager) {
      const queue = playerManager.getQueue(interaction.guildId);
      if (!queue || queue.tracks.length === 0) {
        return interaction.reply({ content: `${EMOJIS.cross} Sıra boş olduğu için karıştırılamadı!`, flags: 64 });
      }

      queue.shuffle();
      return interaction.reply({
        embeds: [{
          color: 0x5a189a,
          description: `${EMOJIS.tick} **Çalma sırası karıştırıldı.**`
        }]
      });
    }
  },

  // CLEAR
  {
    data: new SlashCommandBuilder()
      .setName('clear')
      .setDescription('Çalma sırasını temizler.'),
    async execute(interaction, playerManager) {
      const queue = playerManager.getQueue(interaction.guildId);
      if (!queue) return interaction.reply({ content: `${EMOJIS.cross} Aktif bir çalma oturumu yok!`, flags: 64 });

      queue.clear();
      return interaction.reply({
        embeds: [{
          color: 0x5a189a,
          description: `${EMOJIS.tick} **Çalma sırası temizlendi.**`
        }]
      });
    }
  },

    // HELP
  {
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('Tüm müzik komutlarını ve gelişmiş bot özelliklerini listeler.'),
    async execute(interaction) {
      const bannerPath = path.join(__dirname, '../../assets/sudekubanner.png');
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

      const homeEmbed = getHelpEmbed('help_home', interaction.client, interaction.guildId);

      const response = await interaction.reply({
        files: [bannerAttachment],
        embeds: [homeEmbed],
        components: [row],
        fetchReply: true
      });

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120000 // 2 minutes
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: 'Bu menüyü sadece komutu kullanan kişi yönetebilir.', ephemeral: true });
        }

        const selectedValue = i.values[0];
        const updatedEmbed = getHelpEmbed(selectedValue, interaction.client, interaction.guildId);

        await i.update({
          embeds: [updatedEmbed]
        });
      });

      collector.on('end', async () => {
        const disabledSelectMenu = StringSelectMenuBuilder.from(selectMenu).setDisabled(true);
        const disabledRow = new ActionRowBuilder().addComponents(disabledSelectMenu);
        await interaction.editReply({
          components: [disabledRow]
        }).catch(() => {});
      });
    }
  },
	// STATS
	{
		data: new SlashCommandBuilder()
			.setName('stats')
			.setDescription('Botun gecikme, RAM, CPU ve calisma suresi istatistiklerini goruntuler.'),
		async execute(interaction, playerManager) {
			const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
			const rss = process.memoryUsage().rss / 1024 / 1024;
			const totalMem = os.totalmem() / 1024 / 1024 / 1024;
			const freeMem = os.freemem() / 1024 / 1024 / 1024;
			const usedMem = totalMem - freeMem;
			const cpus = os.cpus();
			const cpuModel = cpus.length > 0 ? cpus[0].model.replace(/\(R\)|\(TM\)/g, "").trim() : "Bilinmiyor";

			const loadAvg = os.loadavg();
			const cpuUsagePct = ((loadAvg[0] / Math.max(1, os.cpus().length)) * 100).toFixed(1);

			const ping = Math.round(interaction.client.ws.ping || 0);
			const uptime = formatMs(interaction.client.uptime);
			const guildsCount = interaction.client.guilds.cache.size;
			const activePlayersCount = playerManager ? playerManager.queues.size : 0;

			return interaction.reply({
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
					thumbnail: { url: interaction.client.user.displayAvatarURL() },
					timestamp: new Date().toISOString(),
					footer: { text: "Sudeku Muzik Performans Izleyicisi" }
				}]
			});
		}
	},
  // RANK COMMAND
  {
    data: new SlashCommandBuilder()
      .setName('rank')
      .setDescription('Seviye, XP ve dinleme istatistiklerinizi mükemmel bir kart ile görüntüler.')
      .addUserOption(option => 
        option.setName('kullanici')
          .setDescription('İstatistiklerine bakmak istediğiniz kullanıcı')
          .setRequired(false)),
    async execute(interaction) {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('kullanici') || interaction.user;
      
      if (targetUser.bot) {
        return interaction.editReply({ content: `${EMOJIS.cross} Botların seviye ve istatistik kartları bulunmaz!` });
      }

      const guildId = interaction.guildId;
      const dbUser = Database.getUser(
        guildId, 
        targetUser.id, 
        targetUser.username, 
        targetUser.displayAvatarURL({ extension: 'png', size: 128 })
      );

      const leaderboard = Database.getLeaderboard(guildId, 'voice');
      const rankIndex = leaderboard.findIndex(u => u.userId === targetUser.id);
      const rank = rankIndex !== -1 ? rankIndex + 1 : leaderboard.length + 1;
      const totalCount = leaderboard.length || 1;

      try {
        const canvasBuf = await generateRankCard(dbUser, rank, totalCount);
        const attachment = new AttachmentBuilder(canvasBuf, { name: 'rank.png' });
        return interaction.editReply({ files: [attachment] });
      } catch (err) {
        console.error('[Rank Command Error]', err);
        return interaction.editReply({ content: `${EMOJIS.cross} Kart oluşturulurken bir hata oluştu: \`${err.message}\`` });
      }
    }
  },
  // LEADERBOARD COMMAND
  {
    data: new SlashCommandBuilder()
      .setName('leaderboard')
      .setDescription('Sunucudaki en aktif müzik dinleyicilerini listeler.'),
    async execute(interaction) {
      const guildId = interaction.guildId;
      let currentTab = 'voice';
      let page = 1;

      const serverArrow = interaction.guild.emojis.cache.find(e => 
        e.name.toLowerCase().includes('arrow') || 
        e.name.toLowerCase().includes('ok') || 
        e.name.toLowerCase().includes('right') || 
        e.name.toLowerCase().includes('yon') ||
        e.name.toLowerCase().includes('sag')
      );
      const arrowEmoji = serverArrow ? `<:${serverArrow.name}:${serverArrow.id}>` : '▶️';

      function generateEmbed() {
        const leaderboard = Database.getLeaderboard(guildId, currentTab);
        const itemsPerPage = 10;
        const totalPages = Math.max(1, Math.ceil(leaderboard.length / itemsPerPage));
        if (page > totalPages) page = totalPages;
        if (page < 1) page = 1;

        const currentPageItems = leaderboard.slice((page - 1) * itemsPerPage, page * itemsPerPage);

        let desc = '';
        if (currentPageItems.length === 0) {
          desc = '*Bu sunucuda henüz veri toplanmamış.*';
        } else {
          desc = currentPageItems.map((u, idx) => {
            const globalIdx = (page - 1) * itemsPerPage + idx + 1;
            let rankEmoji = arrowEmoji;
            if (globalIdx === 1) rankEmoji = EMOJIS.crown;
            else if (globalIdx === 2) rankEmoji = '🥈';
            else if (globalIdx === 3) rankEmoji = '🥉';

            const valText = currentTab === 'voice' 
              ? `\`${formatDurationText(u.voiceTime)}\`` 
              : `\`${u.tracksPlayed} şarkı\``;

            return `${rankEmoji} **#${globalIdx}** | <@${u.userId}> • Level \`${u.level}\` (${valText})`;
          }).join('\n');
        }

        const title = currentTab === 'voice' 
          ? `🔊 En Çok Ses Kanalında Kalanlar` 
          : `🎵 En Çok Şarkı Dinleyenler`;

        return {
          embeds: [{
            title: `${EMOJIS.star} Sudeku Music - Sunucu Sıralaması`,
            description: `**${title}**\n\n${desc}`,
            color: 0x8b5cf6,
            footer: { text: `Sayfa ${page} / ${totalPages} • Toplam Kayıt: ${leaderboard.length}` },
            timestamp: new Date().toISOString()
          }]
        };
      }

      function generateButtons() {
        const leaderboard = Database.getLeaderboard(guildId, currentTab);
        const itemsPerPage = 10;
        const totalPages = Math.max(1, Math.ceil(leaderboard.length / itemsPerPage));

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('lb_tab_voice')
            .setLabel('Ses Süresi')
            .setEmoji('🔊')
            .setStyle(currentTab === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('lb_tab_tracks')
            .setLabel('Şarkı Dinleme')
            .setEmoji('🎵')
            .setStyle(currentTab === 'tracks' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('lb_prev')
            .setLabel('Geri')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId('lb_next')
            .setLabel('İleri')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages)
        );

        return [row1, row2];
      }

      const response = await interaction.reply({
        ...generateEmbed(),
        components: generateButtons(),
        fetchReply: true
      });

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 180000
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: 'Bu sıralama menüsünü sadece komutu kullanan kişi yönetebilir.', ephemeral: true });
        }

        if (i.customId === 'lb_tab_voice') {
          currentTab = 'voice';
          page = 1;
        } else if (i.customId === 'lb_tab_tracks') {
          currentTab = 'tracks';
          page = 1;
        } else if (i.customId === 'lb_prev') {
          page = Math.max(1, page - 1);
        } else if (i.customId === 'lb_next') {
          page = page + 1;
        }

        await i.update({
          ...generateEmbed(),
          components: generateButtons()
        });
      });

      collector.on('end', async () => {
        const disabledRows = generateButtons().map(row => {
          const updatedRow = new ActionRowBuilder();
          row.components.forEach(btn => {
            updatedRow.addComponents(ButtonBuilder.from(btn).setDisabled(true));
          });
          return updatedRow;
        });
        await interaction.editReply({
          components: disabledRows
        }).catch(() => {});
      });
    }
  },
  // SERVERINFO COMMAND
  {
    data: new SlashCommandBuilder()
      .setName('serverinfo')
      .setDescription('Mevcut Discord sunucusu hakkında detaylı istatistik ve bilgiler sunar.'),
    async execute(interaction) {
      const guild = interaction.guild;
      if (!guild) return interaction.reply({ content: 'Bu komut yalnızca sunucularda kullanılabilir!', flags: 64 });

      await guild.members.fetch();

      const totalMembers = guild.memberCount;
      const botMembers = guild.members.cache.filter(m => m.user.bot).size;
      const humanMembers = totalMembers - botMembers;
      
      const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
      const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
      const categoryChannels = guild.channels.cache.filter(c => c.type === 4).size;
      
      const owner = await guild.fetchOwner();
      const creationDate = `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`;
      const joinDate = `<t:${Math.floor(interaction.member.joinedTimestamp / 1000)}:R>`;
      
      const boostCount = guild.premiumSubscriptionCount || 0;
      const boostTier = guild.premiumTier;
      const rolesCount = guild.roles.cache.size;
      const emojisCount = guild.emojis.cache.size;

      return interaction.reply({
        embeds: [{
          title: `${EMOJIS.star} Sunucu Bilgileri - ${guild.name}`,
          color: 0x8b5cf6,
          thumbnail: { url: guild.iconURL({ extension: 'png', size: 256 }) || '' },
          fields: [
            {
              name: "📌 Genel Bilgiler",
              value: 
                `• **Sunucu Sahibi:** ${owner} (\`${owner.id}\`)\n` +
                `• **Kuruluş Tarihi:** ${creationDate}\n` +
                `• **Katılım Tarihiniz:** ${joinDate}\n` +
                `• **Sunucu ID:** \`${guild.id}\``,
              inline: false
            },
            {
              name: "👥 Üyeler",
              value: 
                `• **Toplam Üye:** \`${totalMembers}\`\n` +
                `• **İnsanlar:** \`${humanMembers}\`\n` +
                `• **Botlar:** \`${botMembers}\``,
              inline: true
            },
            {
              name: "💬 Kanallar",
              value: 
                `• **Yazı Kanalları:** \`${textChannels}\`\n` +
                `• **Ses Kanalları:** \`${voiceChannels}\`\n` +
                `• **Kategoriler:** \`${categoryChannels}\``,
              inline: true
            },
            {
              name: "🛡️ Sunucu Durumu",
              value: 
                `• **Rol Sayısı:** \`${rolesCount}\`\n` +
                `• **Emoji Sayısı:** \`${emojisCount}\`\n` +
                `• **Takviye Sayısı:** \`${boostCount} Takviye\` (Seviye ${boostTier})`,
              inline: false
            }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: `İsteyen: ${interaction.user.username}` }
        }]
      });
    }
  }
];

function formatDurationText(ms) {
  if (!ms || ms <= 0) return '0 dk';
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);

  if (hr > 0) {
    return `${hr} sa ${min % 60} dk`;
  }
  if (min > 0) {
    return `${min} dk`;
  }
  return `${sec} sn`;
}

function formatMs(ms) {
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
