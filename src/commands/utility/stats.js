const { SlashCommandBuilder } = require('discord.js');
const os = require('os');
const EMOJIS = require('../../utils/emojis');

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
    .setDescription('Botun sistem ve çalışma istatistiklerini gösterir.'),
  aliases: ['istatistik', 'botinfo', 'bot-bilgi'],
  category: 'utility',

  async execute(interaction, playerManager) {
    await interaction.deferReply();
    const payload = getStatsPayload(interaction.client, playerManager);
    return interaction.editReply(payload);
  },

  async run(message, args, client, prefix) {
    // Check if playerManager is passed as the third parameter or fourth parameter.
    // In our loaders, typically client is 3rd, prefix is 4th. Let's obtain playerManager from client or just pass it in command invocation.
    // Wait, let's look at client object. Let's see if playerManager is attached to client in index.js, or we can get it from somewhere.
    // In index.js: "const playerManager = new PlayerManager(client);"
    // Let's attach playerManager to client inside index.js to make it globally available!
    // In index.js: client.playerManager = playerManager;
    // We can also get it from client.playerManager.
    const pm = client.playerManager || null;
    const payload = getStatsPayload(client, pm);
    return message.reply(payload);
  }
};

function getStatsPayload(client, playerManager) {
  const uptime = formatUptime(process.uptime());
  const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);

  const guildsCount = client.guilds.cache.size;
  const usersCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
  const channelsCount = client.channels.cache.size;

  let activeQueues = 0;
  if (playerManager && typeof playerManager.getQueues === 'function') {
    activeQueues = playerManager.getQueues().length;
  } else if (playerManager && playerManager.queues) {
    activeQueues = playerManager.queues.size;
  }

  const ping = client.ws.ping;

  return {
    embeds: [{
      title: `${EMOJIS.star || '⭐'} Sudeku Bot İstatistikleri`,
      color: 0x8b5cf6,
      thumbnail: { url: client.user.displayAvatarURL() },
      fields: [
        {
          name: '🤖 Bot Bilgileri',
          value: [
            `• **Gecikme (Ping):** \`${ping} ms\``,
            `• **Çalışma Süresi:** \`${uptime}\``,
            `• **Sunucu Sayısı:** \`${guildsCount}\``,
            `• **Kullanıcı Sayısı:** \`${usersCount.toLocaleString()}\``,
            `• **Aktif Ses Yayını:** \`${activeQueues}\``,
          ].join('\n'),
          inline: true
        },
        {
          name: '💻 Sistem Bilgileri',
          value: [
            `• **İşlemci (CPU):** \`${os.cpus()[0]?.model.trim() || 'Bilinmiyor'}\``,
            `• **RAM Kullanımı:** \`${ramUsage} MB\` / \`${totalRam} GB\``,
            `• **İşletim Sistemi:** \`${os.type()} ${os.release()} (${os.arch()})\``,
            `• **Node.js Sürümü:** \`${process.version}\``,
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
