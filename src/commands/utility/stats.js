const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const os = require('os');
const EMOJIS = require('../../utils/emojis');
const { generateStatsCard } = require('../../player/canvasGenerator');

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d > 0 ? d + 'g ' : ''}${h > 0 ? h + 's ' : ''}${m > 0 ? m + 'd ' : ''}${s}sn`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Botun sistem ve çalışma istatistiklerini görsel kart ile gösterir.'),
  aliases: ['istatistik', 'botinfo', 'bot-bilgi'],
  category: 'utility',

  async execute(interaction, playerManager) {
    await interaction.deferReply();
    try {
      const statsData = getStatsData(interaction.client, playerManager);
      const canvasBuffer = await generateStatsCard(statsData);
      const attachment = new AttachmentBuilder(canvasBuffer, { name: 'stats.png' });
      return interaction.editReply({ files: [attachment] });
    } catch (err) {
      console.error('[Stats Slash Error]', err);
      // Fallback
      const payload = getStatsPayload(interaction.client, playerManager);
      return interaction.editReply(payload);
    }
  },

  async run(message, args, client, prefix) {
    const pm = client.playerManager || null;
    const loadingMsg = await message.reply(`${EMOJIS.loading} **Kart hazırlanıyor.**`);
    try {
      const statsData = getStatsData(client, pm);
      const canvasBuffer = await generateStatsCard(statsData);
      const attachment = new AttachmentBuilder(canvasBuffer, { name: 'stats.png' });
      await loadingMsg.delete().catch(() => {});
      return message.reply({ files: [attachment] });
    } catch (err) {
      console.error('[Stats Msg Error]', err);
      const payload = getStatsPayload(client, pm);
      await loadingMsg.delete().catch(() => {});
      return message.reply(payload);
    }
  }
};

function getStatsData(client, playerManager) {
  const uptime = formatUptime(process.uptime());
  const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);

  const guildsCount = client.guilds.cache.size;
  const usersCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

  let activeQueues = 0;
  if (playerManager && typeof playerManager.getQueues === 'function') {
    activeQueues = playerManager.getQueues().length;
  } else if (playerManager && playerManager.queues) {
    activeQueues = playerManager.queues.size;
  }

  const ping = client.ws.ping;

  return {
    ping,
    uptime,
    guildsCount,
    usersCount,
    activeQueues,
    ramUsage,
    totalRam,
    cpuModel: os.cpus()[0]?.model.trim() || 'Bilinmeyen CPU',
    nodeVersion: process.version,
    avatarUrl: client.user.displayAvatarURL({ extension: 'png', size: 256 }),
    username: client.user.username
  };
}

function getStatsPayload(client, playerManager) {
  const data = getStatsData(client, playerManager);
  return {
    embeds: [{
      title: `${EMOJIS.star} Sudeku Bot İstatistikleri`,
      color: 0x8b5cf6,
      thumbnail: { url: data.avatarUrl },
      fields: [
        {
          name: `${EMOJIS.gear} Bot Bilgileri`,
          value: [
            `• **Gecikme (Ping):** \`${data.ping} ms\``,
            `• **Çalışma Süresi:** \`${data.uptime}\``,
            `• **Sunucu Sayısı:** \`${data.guildsCount}\``,
            `• **Kullanıcı Sayısı:** \`${data.usersCount.toLocaleString()}\``,
            `• **Aktif Ses Yayını:** \`${data.activeQueues}\``,
          ].join('\n'),
          inline: true
        },
        {
          name: `${EMOJIS.status} Sistem Bilgileri`,
          value: [
            `• **İşlemci (CPU):** \`${data.cpuModel}\``,
            `• **RAM Kullanımı:** \`${data.ramUsage} MB\` / \`${data.totalRam} GB\``,
            `• **İşletim Sistemi:** \`${os.type()} ${os.release()} (${os.arch()})\``,
            `• **Node.js Sürümü:** \`${data.nodeVersion}\``,
            `• **Discord.js Sürümü:** \`v14\``,
          ].join('\n'),
          inline: true
        }
      ],
      footer: { text: 'Sudeku Bot • Gelişmiş All-in-One Çözümü' },
      timestamp: new Date().toISOString()
    }]
  };
}