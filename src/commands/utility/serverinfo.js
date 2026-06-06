const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

function buildServerEmbed(guild) {
  return {
    embeds: [{
      color: 0x8b5cf6,
      title: `${EMOJIS.note} Sunucu Bilgisi`,
      thumbnail: guild.iconURL({ extension: 'png', size: 256 }) ? { url: guild.iconURL({ extension: 'png', size: 256 }) } : undefined,
      fields: [
        { name: 'Ad', value: guild.name || 'Bilinmiyor', inline: true },
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Sahip', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Üye', value: `${guild.memberCount || 0}`, inline: true },
        { name: 'Kanal', value: `${guild.channels.cache.size}`, inline: true },
        { name: 'Rol', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Boost', value: `${guild.premiumSubscriptionCount || 0} / seviye ${guild.premiumTier || 0}`, inline: true },
        { name: 'Kuruluş', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false }
      ],
      footer: { text: 'Sudeku Music' }
    }]
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Sunucu bilgilerini gösterir.'),
  aliases: ['sunucu-bilgi', 'guildinfo', 'sunucubilgi'],
  category: 'utility',

  async execute(interaction) {
    return interaction.reply(buildServerEmbed(interaction.guild));
  },

  async run(message) {
    return message.reply(buildServerEmbed(message.guild));
  }
};
