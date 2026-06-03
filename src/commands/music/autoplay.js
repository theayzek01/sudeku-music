const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Otomatik çalma (autoplay) özelliğini açar/kapatır.'),
  aliases: ['otocal', 'otooynat', 'ap'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif bir oynatıcı bulunamadı!**`
        }],
        ephemeral: true
      });
    }

    queue.setAutoplay(!queue.autoplay);
    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Otomatik çalma (Autoplay) şu an: \`${queue.autoplay ? 'AÇIK' : 'KAPALI'}\`**`
      }]
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif bir oynatıcı bulunamadı!**`
        }]
      });
    }

    queue.setAutoplay(!queue.autoplay);
    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Otomatik çalma (Autoplay) şu an: \`${queue.autoplay ? 'AÇIK' : 'KAPALI'}\`**`
      }]
    });
  }
};
