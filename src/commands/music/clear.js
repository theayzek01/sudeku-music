const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Sıradaki tüm şarkıları temizler.'),
  aliases: ['temizle'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue || queue.tracks.length === 0) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Sırada temizlenecek şarkı bulunmuyor.**`
        }],
        ephemeral: true
      });
    }

    queue.tracks = [];
    queue.broadcastState();
    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Çalma sırası başarıyla temizlendi.**`
      }]
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || queue.tracks.length === 0) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Sırada temizlenecek şarkı bulunmuyor.**`
        }]
      });
    }

    queue.tracks = [];
    queue.broadcastState();
    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Çalma sırası başarıyla temizlendi.**`
      }]
    });
  }
};
