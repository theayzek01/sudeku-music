const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Müziği duraklatır.'),
  aliases: ['durdur'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif bir çalma oturumu yok!**`
        }],
        flags: 64
      });
    }

    if (queue.paused) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Müzik zaten duraklatılmış!**`
        }],
        flags: 64
      });
    }

    queue.pause();
    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Müzik duraklatıldı.**`
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

    if (queue.paused) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Müzik zaten duraklatılmış!**`
        }]
      });
    }

    queue.pause();
    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Müzik duraklatıldı.**`
      }]
    });
  }
};
