const { SlashCommandBuilder } = require('discord.js');
const os = require('os');
const EMOJIS = require('../../utils/emojis');

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d > 0 ? `${d}g ` : ''}${h > 0 ? `${h}sa ` : ''}${m > 0 ? `${m}dk ` : ''}${s}sn`;
}

function buildStatsEmbed(client, playerManager) {
  const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
  const rss = process.memoryUsage().rss / 1024 / 1024;
  const queues = playerManager?.queues?.size || 0;
  const guilds = client.guilds.cache.size;
  const users = client.guilds.cache.reduce((sum, guild) => sum + (guild.memberCount || 0), 0);
  const cpu = os.cpus()[0]?.model?.replace(/\(R\)|\(TM\)/g, '').trim() || 'Bilinmeyen CPU';

  return {
    embeds: [{
      color: 0x8b5cf6,
      title: `${EMOJIS.star} Sudeku İstatistik`,
      description: 'Minimal sistem özeti.',
      fields: [
        {
          name: `${EMOJIS.gear} Bot`,
          value: [
            `• Ping: \`${Math.round(client.ws.ping || 0)} ms\``,
            `• Uptime: \`${formatUptime(process.uptime())}\``,
            `• Sunucu: \`${guilds}\``,
            `• Kullanıcı: \`${users.toLocaleString()}\``,
            `• Aktif Kuyruk: \`${queues}\``
          ].join('\n'),
          inline: true
        },
        {
          name: `${EMOJIS.status} Sistem`,
          value: [
            `• CPU: \`${cpu}\``,
            `• RAM: \`${heapUsed.toFixed(1)} MB\` / \`${rss.toFixed(1)} MB RSS\``,
            `• Node: \`${process.version}\``,
            `• OS: \`${os.type()} ${os.release()}\``
          ].join('\n'),
          inline: true
        }
      ],
      footer: { text: 'Sudeku Music' },
      timestamp: new Date().toISOString()
    }]
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Botun sistem bilgilerini gösterir.'),
  aliases: ['istatistik', 'botinfo', 'bot-bilgi'],
  category: 'utility',

  async execute(interaction, playerManager) {
    return interaction.reply(buildStatsEmbed(interaction.client, playerManager));
  },

  async run(message, args, client) {
    return message.reply(buildStatsEmbed(client, client.playerManager || null));
  }
};
