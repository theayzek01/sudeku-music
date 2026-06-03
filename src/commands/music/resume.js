const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Duraklatılan müziği devam ettirir.'),
  aliases: ['devam'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif bir çalma oturumu yok!**`
        }],
        ephemeral: true
      });
    }

    if (!queue.paused) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Müzik zaten çalıyor!**`
        }],
        ephemeral: true
      });
    }

    queue.resume();
    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Müzik devam ettiriliyor.**`
      }]
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif bir çalma oturumu yok!**`
        }]
      });
    }

    if (!queue.paused) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Müzik zaten çalıyor!**`
        }]
      });
    }

    queue.resume();
    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Müzik devam ettiriliyor.**`
      }]
    });
  }
};
